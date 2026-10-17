import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('a shared private trip exposes its itinerary only with the current token', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create schema neon_auth; create table neon_auth."user"(id text primary key,name text,email text,"emailVerified" boolean); insert into neon_auth."user" values('owner','Owner','owner@example.test',true);`);
  for (const file of (await readdir('db/migrations')).sort()) await db.exec(await readFile('db/migrations/'+file,'utf8'));
  const token='11111111111111111111111111111111';
  const [{id}]= (await db.query("insert into trips(user_id,title,share_token) values('owner','Shared trip',$1) returning id",[token])).rows;
  await db.query("insert into trip_locations(trip_id,name) values($1,'Destination')",[id]);
  await db.query("insert into trip_events(trip_id,title) values($1,'Walk')",[id]);
  await db.query("insert into trip_expenses(trip_id,title,amount) values($1,'Hotel',100)",[id]);
  await db.query("insert into trip_documents(trip_id,user_id,name,storage_path,mime_type,size_bytes) values($1,'owner','Passport','owner/passport.pdf','application/pdf',100)",[id]);
  const read=async shareToken => db.transaction(async tx => {
   await tx.exec('set local role nabagagem_app');
   await tx.query("select set_config('app.user_id','',true),set_config('app.share_token',$1,true)",[shareToken]);
   const counts={};
   for (const table of ['trips','trip_locations','trip_events','trip_expenses','trip_documents']) counts[table]=(await tx.query('select * from '+table)).rows.length;
   return counts;
  });
  assert.deepEqual(await read(''),{trips:0,trip_locations:0,trip_events:0,trip_expenses:0,trip_documents:0});
  assert.deepEqual(await read('wrong'),await read(''));
  assert.deepEqual(await read(token),{trips:1,trip_locations:1,trip_events:1,trip_expenses:0,trip_documents:0});
  await db.query("select set_config('app.user_id','owner',false)");
  await db.query("update trips set share_token=null where id=$1",[id]);
  assert.deepEqual(await read(token),await read(''));
 } finally { await db.close(); }
});
