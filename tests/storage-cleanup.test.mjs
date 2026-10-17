import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { cleanupDatabaseTarget, isStorageCronAuthorized, processStorageDeletionBatch } from '../lib/neon/storage-cleanup.ts';

test('cleanup requires a strong exact bearer and the configured Neon database', () => {
  const secret = 's'.repeat(40);
  assert.equal(isStorageCronAuthorized(`Bearer ${secret}`, secret), true);
  for (const header of [null, '', secret, `Bearer ${secret}x`]) assert.equal(isStorageCronAuthorized(header, secret), false);
  assert.equal(isStorageCronAuthorized('Bearer short', 'short'), false);
  const env = { POSTGRES_URL: 'postgresql://owner:password@ep-example-pooler.c-1.us-east-2.aws.neon.tech/neondb?sslmode=require', NEON_DATABASE_HOST: 'ep-example-pooler.c-1.us-east-2.aws.neon.tech' };
  assert.equal(cleanupDatabaseTarget(env), env.POSTGRES_URL);
  assert.equal(cleanupDatabaseTarget({ ...env, NEON_DATABASE_URL: env.POSTGRES_URL, POSTGRES_URL: 'postgresql://legacy.invalid/old' }), env.POSTGRES_URL);
  for (const url of [env.POSTGRES_URL + '&host=evil.test', env.POSTGRES_URL.replace('/neondb', '/other'), env.POSTGRES_URL.replace('ep-example-pooler', 'ep-other')]) {
    assert.throws(() => cleanupDatabaseTarget({ ...env, POSTGRES_URL: url }));
  }
});

test('durable cleanup preserves references, retries failures and rejects late attachments', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema neon_auth; create table neon_auth."user"(id text primary key,name text,email text,"emailVerified" boolean default true);
      insert into neon_auth."user"(id,name,email) values('cleanup-alice','Alice','alice@example.invalid'),('cleanup-bob','Bob','bob@example.invalid');`);
    for (const file of (await readdir('db/migrations')).sort()) await db.exec(await readFile('db/migrations/' + file, 'utf8'));
    const asAlice = async (sql, params=[]) => {
      await db.exec("begin; set local role nabagagem_app; select set_config('app.user_id','cleanup-alice',true)");
      try { const result = await db.query(sql, params); await db.exec('commit'); return result.rows; }
      catch (error) { await db.exec('rollback'); throw error; }
    };
    const [trip] = await asAlice("insert into trips(user_id,title) values('cleanup-alice','Cleanup test') returning id");
    const attach = path => asAlice("insert into trip_documents(trip_id,user_id,storage_path,name,mime_type,size_bytes) values($1,'cleanup-alice',$2,'Ticket','application/pdf',100)", [trip.id, path]);
    const enqueue = async (path, actor='cleanup-alice', due=true) => (await db.query(`insert into app_private.storage_deletions(actor_id,storage_path,not_before)
      values($1,$2,now()+$3::integer*interval '1 day') returning id`, [actor,path,due ? -1 : 1])).rows[0].id;
    await attach('cleanup-alice/retained.pdf');
    await enqueue('cleanup-alice/retained.pdf');
    await enqueue('cleanup-alice/pending.pdf', 'cleanup-alice', false);
    await enqueue('cleanup-bob/other.pdf', 'cleanup-bob');
    await enqueue('cleanup-alice/orphan.pdf');
    await enqueue('cleanup-alice/retry.pdf');
    const calls=[];
    const result=await processStorageDeletionBatch(db, async path => {
      calls.push(path);
      // The lease survives COMMIT while storage is unavailable or deleting.
      await assert.rejects(attach(path), /no longer available/);
      if (path.endsWith('retry.pdf')) throw new Error('provider timeout');
    }, { actorId: 'cleanup-alice' });
    assert.deepEqual(result, { deleted:1, referenced:1, failed:1, skipped:0 });
    assert.deepEqual(new Set(calls), new Set(['cleanup-alice/orphan.pdf','cleanup-alice/retry.pdf']));
    assert.equal((await db.query('select * from trip_documents')).rows.length,1);
    await assert.rejects(attach('cleanup-alice/orphan.pdf'), /no longer available/);
    await assert.rejects(asAlice("select app_private.reserve_upload('cleanup-alice/orphan.pdf')"), /no longer available/);
    const retry=(await db.query("select *,not_before>now() as deferred from app_private.storage_deletions where storage_path='cleanup-alice/retry.pdf'")).rows[0];
    assert.equal(retry.attempts,1); assert.equal(retry.deferred,true); assert.ok(retry.lease_token);
    await asAlice('select app_private.complete_storage_deletion($1)', [retry.id]);
    assert.equal((await db.query('select * from app_private.storage_deletions where id=$1',[retry.id])).rows.length,1);
    await db.query("update app_private.storage_deletions set not_before=now()-interval '1 second' where id=$1",[retry.id]);
    const recovered=await processStorageDeletionBatch(db, async path=>assert.equal(path,'cleanup-alice/retry.pdf'), {actorId:'cleanup-alice'});
    assert.equal(recovered.deleted,1);
    // An unexpired lease is owned by another worker; an expired one is recoverable.
    const lease=await enqueue('cleanup-alice/leased.pdf');
    await db.query("update app_private.storage_deletions set lease_token=gen_random_uuid(),lease_until=now()+interval '1 minute' where id=$1",[lease]);
    const busy=await processStorageDeletionBatch(db,async()=>assert.fail('active lease must not run'),{actorId:'cleanup-alice'});
    assert.equal(busy.deleted,0);
    await db.query("update app_private.storage_deletions set lease_until=now()-interval '1 second' where id=$1",[lease]);
    assert.equal((await processStorageDeletionBatch(db,async()=>{},{actorId:'cleanup-alice'})).deleted,1);
    assert.deepEqual((await db.query('select storage_path from app_private.storage_deletions order by storage_path')).rows.map(row=>row.storage_path),['cleanup-alice/pending.pdf','cleanup-bob/other.pdf']);
  } finally { await db.close(); }
});
