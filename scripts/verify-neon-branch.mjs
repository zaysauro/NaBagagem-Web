import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

// Run only against the independently verified, isolated branch:
// node --env-file=.env.validation scripts/verify-neon-branch.mjs --allow-branch-host <direct-host>
// No Auth records or object-storage files are created. Every test write is rolled back.
export function validationTarget(env, args) {
  if (!env.MIGRATION_DATABASE_URL || !env.MIGRATION_EXPECTED_HOST) {
    throw new Error('Configure the isolated migration URL and expected host.');
  }
  const target = new URL(env.MIGRATION_DATABASE_URL);
  const explicitHost = args.length === 2 && args[0] === '--allow-branch-host' ? args[1] : null;
  if (!['postgres:', 'postgresql:'].includes(target.protocol)
    || target.hostname !== env.MIGRATION_EXPECTED_HOST
    || target.hostname !== explicitHost
    || !target.hostname.endsWith('.neon.tech')
    || target.hostname.includes('-pooler')
    || target.pathname !== '/neondb'
    || (target.port && target.port !== '5432')
    || target.searchParams.has('host') || target.searchParams.has('hostaddr')
    || target.searchParams.has('port') || target.searchParams.has('dbname')) {
    throw new Error('Target mismatch: explicitly allow the verified direct branch host and neondb.');
  }
  return target;
}

export async function verifyNeonBranch(client) {
  const checks = [];
  const runId = randomUUID();
  const tripId = randomUUID();
  const countryId = randomUUID();
  const expenseIds = [randomUUID(), randomUUID()];
  const postId = randomUUID();
  const unknownId = randomUUID();
  let existingUserId;
  let reservationId;
  let rolledBack = false;
  const check = (label, condition) => {
    try { assert.ok(condition, label); }
    catch (error) { error.validationCheck = label; throw error; }
    checks.push(label);
  };
  const as = async (userId) => {
    await client.query('set local role nabagagem_app');
    await client.query("select set_config('app.user_id',$1,true), set_config('app.share_token','',true)", [userId]);
  };
  const rejects = async (label, sql, values, code) => {
    await client.query('savepoint validation_expected_failure');
    let rejected = false;
    try {
      await client.query(sql, values);
    } catch (error) {
      rejected = error.code === code;
    } finally {
      await client.query('rollback to savepoint validation_expected_failure');
      await client.query('release savepoint validation_expected_failure');
    }
    check(label, rejected);
  };

  await client.query('begin');
  try {
    await client.query("set local statement_timeout = '15s'");
    await client.query("set local lock_timeout = '3s'");
    await client.query("set local idle_in_transaction_session_timeout = '60s'");
    const role = (await client.query("select rolcanlogin,rolbypassrls,rolsuper from pg_roles where rolname='nabagagem_app'")).rows[0];
    check('Application role cannot log in or bypass RLS', role && !role.rolcanlogin && !role.rolbypassrls && !role.rolsuper);

    // Do not touch an existing rate-limit row: feed INSERT triggers create one.
    // Refuse to proceed if no existing Auth/profile pair can be tested this way.
    const users = await client.query(`select u.id::text as id
      from neon_auth."user" u join public.profiles p on p.id=u.id
      where not exists(select 1 from app_private.write_limits w where w.user_id=u.id::text)
      order by u.id limit 1`);
    check('An existing Auth/profile pair is available without existing rate-limit state', users.rows.length === 1);
    existingUserId = users.rows[0].id;
    // Claim a NEW limiter row without upsert before a concurrent request can create
    // one. A conflict aborts safely; subsequent triggers only update this test row.
    await client.query('insert into app_private.write_limits(user_id,window_start,hits) values($1,now(),0)', [existingUserId]);
    check('Unknown test identity does not exist', (await client.query('select 1 from neon_auth."user" where id::text=$1', [unknownId])).rows.length === 0);

    await as(existingUserId);
    check('Existing user can read their profile', (await client.query('select id from public.profiles where id::text=$1', [existingUserId])).rows.length === 1);
    const existingCountries = (await client.query('select country,country_code from public.profile_visited_countries where user_id::text=$1', [existingUserId])).rows;
    const geography = JSON.parse(await readFile(new URL('../lib/country-geography.json', import.meta.url), 'utf8'));
    const destination = Object.entries(geography).find(([code, data]) => !existingCountries.some(row => row.country_code === code || row.country === data.names[0]));
    check('An unused country is available without changing existing records', Boolean(destination));
    const [countryCode, country] = destination;
    await client.query(`insert into public.profile_visited_countries(id,user_id,country,country_code,notes)
      values($1,$2,$3,$4,$5)`, [countryId, existingUserId, country.names[0], countryCode, `Temporary rollback validation ${runId}`]);
    const storedCountry = (await client.query('select country_code from public.profile_visited_countries where id=$1', [countryId])).rows[0];
    check('Country insert can be read by its owner', storedCountry?.country_code === countryCode);
    await rejects('Duplicate country code is rejected', 'insert into public.profile_visited_countries(id,user_id,country,country_code) values($1,$2,$3,$4)',
      [randomUUID(), existingUserId, `Duplicate ${runId}`, countryCode], '23505');

    await client.query('insert into public.trips(id,user_id,title,is_public) values($1,$2,$3,false)', [tripId, existingUserId, `Validation ${runId}`]);
    for (const [index, amount] of ['123.45', '0.10'].entries()) {
      await client.query('insert into public.trip_expenses(id,trip_id,title,amount,currency) values($1,$2,$3,$4,$5)',
        [expenseIds[index], tripId, `Temporary expense ${index}`, amount, 'BRL']);
    }
    check('Expense decimals preserve exact cents', (await client.query('select sum(amount)::text as amount from public.trip_expenses where trip_id=$1', [tripId])).rows[0]?.amount === '123.55');
    await client.query('update public.trip_expenses set amount=$1 where id=$2', ['98.76', expenseIds[0]]);
    check('Expense editing preserves exact cents', (await client.query('select amount::text as amount from public.trip_expenses where id=$1', [expenseIds[0]])).rows[0]?.amount === '98.76');
    await rejects('Negative expense is rejected', 'insert into public.trip_expenses(id,trip_id,title,amount) values($1,$2,$3,-1)',
      [randomUUID(), tripId, 'Invalid temporary expense'], '23514');

    await client.query("insert into public.feed_posts(id,user_id,body,visibility) values($1,$2,$3,'private')", [postId, existingUserId, `Temporary validation ${runId}`]);
    check('Private feed post is readable by its owner', (await client.query('select id from public.feed_posts where id=$1', [postId])).rows.length === 1);
    for (let index = 0; index < 5; index++) {
      await client.query('insert into public.feed_post_media(id,post_id,user_id,storage_path) values($1,$2,$3,$4)',
        [randomUUID(), postId, existingUserId, `${existingUserId}/validation/${runId}/${index}.jpg`]);
    }
    await rejects('Sixth feed photo is rejected', 'insert into public.feed_post_media(id,post_id,user_id,storage_path) values($1,$2,$3,$4)',
      [randomUUID(), postId, existingUserId, `${existingUserId}/validation/${runId}/sixth.jpg`], '23514');
    check('Feed photo capacity remains five', (await client.query('select count(*)::integer as count from public.feed_post_media where post_id=$1', [postId])).rows[0]?.count === 5);

    const reservedPath = `${existingUserId}/validation/${runId}/reserved.jpg`;
    reservationId = (await client.query('select app_private.reserve_upload($1) as id', [reservedPath])).rows[0].id;
    check('Upload reservation is not prematurely due', (await client.query('select id from app_private.pending_storage_deletions() where id=$1', [reservationId])).rows.length === 0);

    for (const [label, identity] of [['Anonymous', ''], ['Unknown', unknownId]]) {
      await as(identity);
      for (const [name, sql, value] of [
        ['country', 'select id from public.profile_visited_countries where id=$1', countryId],
        ['trip', 'select id from public.trips where id=$1', tripId],
        ['expense', 'select id from public.trip_expenses where id=$1', expenseIds[0]],
        ['private post', 'select id from public.feed_posts where id=$1', postId],
        ['private media', 'select id from public.feed_post_media where post_id=$1', postId],
      ]) {
        check(`${label} identity cannot read the test ${name}`, (await client.query(sql, [value])).rows.length === 0);
      }
      check(`${label} identity cannot edit the test trip`, (await client.query('update public.trips set title=$1 where id=$2 returning id', ['Unauthorized edit', tripId])).rows.length === 0);
      await rejects(`${label} identity cannot insert a trip expense`, 'insert into public.trip_expenses(id,trip_id,title,amount) values($1,$2,$3,1)',
        [randomUUID(), tripId, 'Unauthorized expense'], '42501');
      await rejects(`${label} identity cannot reserve another user’s storage path`, 'select app_private.reserve_upload($1)', [reservedPath], '42501');
    }
    await as(existingUserId);
    check('Owner retains access after identity changes', (await client.query('select id from public.trips where id=$1', [tripId])).rows.length === 1);
  } finally {
    // No COMMIT exists in this script. Disconnection also rolls back on failure.
    await client.query('rollback');
    rolledBack = true;
  }

  check('Validation transaction rolled back', rolledBack);
  const remaining = (await client.query(`select
    (select count(*) from public.trips where id=$1)
    + (select count(*) from public.profile_visited_countries where id=$2)
    + (select count(*) from public.trip_expenses where id=any($3::uuid[]))
    + (select count(*) from public.feed_posts where id=$4)
    + (select count(*) from public.feed_post_media where post_id=$4)
    + (select count(*) from public.trip_activity where trip_id=$1)
    + (select count(*) from app_private.storage_deletions where id=$5) as count`,
  [tripId, countryId, expenseIds, postId, reservationId])).rows[0]?.count;
  check('No test records remain after rollback', Number(remaining) === 0);
  return checks;
}

async function main() {
  let client;
  try {
    const target = validationTarget(process.env, process.argv.slice(2));
    client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 8000 });
    await client.connect();
    const checks = await verifyNeonBranch(client);
    for (const label of checks) console.log(`PASS ${label}`);
    console.log(`PASS ${checks.length} database checks; all writes rolled back; no Auth or storage objects changed.`);
  } catch (error) {
    // Driver messages and assertion values can contain private IDs or credentials.
    console.error('Branch validation failed.', { code: error.code || 'validation_error', check: error.validationCheck });
    process.exitCode = 1;
  } finally {
    if (client) await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
