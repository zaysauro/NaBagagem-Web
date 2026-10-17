import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { processStorageDeletionBatch } from '../lib/neon/storage-cleanup.ts';

test('overlapping cleanup runs cannot delete the same path twice while its durable lease is active', async () => {
  const db = new PGlite();
  let releaseDelete;
  let first;
  try {
    await db.exec('create schema neon_auth; create table neon_auth."user"(id text primary key,name text,email text,"emailVerified" boolean);');
    for (const file of (await readdir('db/migrations')).sort()) await db.exec(await readFile('db/migrations/' + file, 'utf8'));
    const path = 'worker-fixture/duplicate.jpg';
    for (let index=0; index<2; index++) await db.query('insert into app_private.storage_deletions(actor_id,storage_path) values($1,$2)', ['worker-fixture',path]);
    let notifyClaim;
    const claimed = new Promise(resolve => { notifyClaim = resolve; });
    const pausedDelete = new Promise(resolve => { releaseDelete = resolve; });
    let deleteCalls=0;
    first = processStorageDeletionBatch(db, async candidate => {
      assert.equal(candidate,path);
      deleteCalls++;
      notifyClaim();
      await pausedDelete;
    });
    await claimed;
    // The first SQL transaction has COMMITted, but the provider has not replied.
    const second = await processStorageDeletionBatch(db,async()=>assert.fail('duplicate worker reached storage'));
    assert.equal(second.deleted,0);
    assert.equal(second.skipped,1);
    releaseDelete();
    assert.equal((await first).deleted,1);
    assert.equal(deleteCalls,1);
    assert.equal((await db.query('select count(*)::integer as count from app_private.storage_deletions')).rows[0].count,0);
    assert.equal((await db.query('select count(*)::integer as count from app_private.storage_tombstones')).rows[0].count,1);

    // A duplicate, newer reservation must also protect an older due deletion.
    await db.query("insert into app_private.storage_deletions(actor_id,storage_path,not_before) values('worker-fixture','worker-fixture/pending.jpg',now()-interval '1 day'),('worker-fixture','worker-fixture/pending.jpg',now()+interval '1 day')");
    const deferred=await processStorageDeletionBatch(db,async()=>assert.fail('active upload reservation reached storage'));
    assert.equal(deferred.deleted,0);
    assert.equal(deferred.skipped,1);
    assert.equal((await db.query('select count(*)::integer as count from app_private.storage_deletions')).rows[0].count,2);
  } finally {
    releaseDelete?.();
    await first?.catch(()=>{});
    await db.close();
  }
});
