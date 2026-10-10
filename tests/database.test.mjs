import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

for (const type of ['text','uuid']) test(`schema and authorization with ${type} Auth IDs`, async () => {
 const db = new PGlite();
 const ids=type==='text'?['alice','bob','eve']:['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'];
 await db.exec(`create schema neon_auth; create table neon_auth."user"(id ${type} primary key,name text,email text,"emailVerified" boolean default true);`);
 for(const id of ids)await db.query('insert into neon_auth."user"(id,name,email) values($1,$2,$3)',[id,id,id+"@example.test"]);
 for(const f of (await readdir('db/migrations')).sort())await db.exec(await readFile('db/migrations/'+f,'utf8'));
 const [alice,bob,eve]=ids;
 const as=async (id,sql,params=[])=>{
  await db.exec('begin; set local role nabagagem_app;');
  try {await db.query("select set_config('app.user_id',$1,true)",[id]); const r=await db.query(sql,params); await db.exec('commit');return r.rows;}
  catch(e){await db.exec('rollback');throw e;}
 };
 const [trip]=await as(alice,"insert into trips(user_id,title) values($1,'Tokyo') returning id",[alice]);
 assert.equal((await as(eve,'select * from trips')).length,0);
 assert.equal((await as(eve,'update trips set title=$1 where id=$2 returning id',['stolen',trip.id])).length,0);
 await assert.rejects(as(eve,'insert into trip_events(trip_id,title) values($1,$2)',[trip.id,'intrusion']));
 await as(alice,"insert into trip_members(trip_id,user_id,role) values($1,$2,'viewer')",[trip.id,bob]);
 assert.equal((await as(bob,'select * from trips')).length,1);
 await assert.rejects(as(bob,"insert into trip_locations(trip_id,name) values($1,'intrusion')",[trip.id]));
 assert.equal((await as(bob,"update trip_members set role='editor' where trip_id=$1 returning id",[trip.id])).length,0);
 await as(alice,"update trip_members set role='editor' where trip_id=$1",[trip.id]);
 await as(bob,"insert into trip_locations(trip_id,name) values($1,'Tokyo')",[trip.id]);
 await assert.rejects(as(bob,'update trips set user_id=$1 where id=$2',[bob,trip.id]));
 await assert.rejects(as(bob,'update trips set is_public=true where id=$1',[trip.id]));
 await as(alice,'update trips set is_public=true where id=$1',[trip.id]);
 assert.equal((await as('', 'select * from trips')).length,1);
 await as(alice,"insert into trip_expenses(trip_id,title,amount) values($1,'Hotel',10.23)",[trip.id]);
 assert.equal((await as(eve,'select * from trip_expenses')).length,0);
 const [post]=await as(alice,"insert into feed_posts(user_id,body) values($1,'Hello') returning id",[alice]);
 const [comment]=await as(bob,"insert into feed_comments(post_id,user_id,body,approved) values($1,$2,'Hi',true) returning id,approved",[post.id,bob]);
 assert.equal(comment.approved,false);
 assert.equal((await as(eve,'select * from feed_comments')).length,0);
 assert.equal((await as(bob,'update feed_comments set approved=true returning id')).length,0);
 await as(alice,'update feed_comments set approved=true where id=$1',[comment.id]);
 assert.equal((await as(eve,'select * from feed_comments')).length,1);
 await as(alice,'insert into user_blocks(blocker_id,blocked_id) values($1,$2)',[alice,eve]);
 assert.equal((await as(eve,'select * from feed_posts')).length,0);
 const [list]=await as(alice,"insert into packing_lists(trip_id,name) values($1,'Backpack') returning id",[trip.id]);
 await as(bob,"insert into packing_items(list_id,name,quantity) values($1,'Shirt',2)",[list.id]);
 assert.equal((await as(eve,'select * from packing_items')).length,0);
 const [template]=await as(alice,"insert into trip_templates(user_id,name,items) values($1,'Essentials',$2::jsonb) returning id",[alice,JSON.stringify([{name:'Shirt',quantity:2}])]);
 assert.equal((await as(bob,'select * from trip_templates')).length,0);
 assert.equal((await as(bob,'delete from trip_templates where id=$1 returning id',[template.id])).length,0);
 await assert.rejects(as(bob,"insert into trip_templates(user_id,name) values($1,'Forged')",[alice]));
 assert.equal((await as(alice,'select * from trip_templates')).length,1);
 await assert.rejects(as(bob,"insert into packing_items(list_id,name,quantity) values($1,'Shirt',0)",[list.id]));
 await as(alice,"insert into trip_documents(trip_id,user_id,storage_path,name,mime_type,size_bytes) values($1,$2,'private/path','Ticket','application/pdf',100)",[trip.id,alice]);
 assert.equal((await as(eve,'select * from trip_documents')).length,0);
 assert.equal((await as('', 'select * from trip_documents')).length,0);
 assert.equal((await as(bob,'delete from trip_documents returning id')).length,0);
 await as(alice,"update trips set is_public=false where id=$1",[trip.id]);
 assert.equal((await as('', 'select * from trips')).length,0);
 assert.equal((await as(alice,'select title from trips'))[0].title,'Tokyo');

 assert.equal((await as(alice, "select * from notifications where type='comment'")).length,1);
 const [privateTrip] = await as(eve,"insert into trips(user_id,title) values($1,'Private') returning id",[eve]);
 const [secretLocation] = await as(eve,"insert into trip_locations(trip_id,name) values($1,'Private address') returning id",[privateTrip.id]);
 await assert.rejects(as(alice,"insert into trip_events(trip_id,location_id,title) values($1,$2,'Invalid')",[trip.id,secretLocation.id]));
 await assert.rejects(as(alice,"insert into trip_expenses(trip_id,title,amount) values($1,'Invalid',-1)",[trip.id]));
 await as(alice,"insert into trip_invitations(trip_id,invited_by,email,token_hash,expires_at) values($1,$2,$3,'hash',now()+interval '1 day')",[trip.id,alice,eve+'@example.test']);
 await assert.rejects(as(bob,"select app_private.accept_invitation('hash')"));
 assert.equal((await as(eve,"select app_private.accept_invitation('hash') as trip"))[0].trip,trip.id);
 await assert.rejects(as(eve,"select app_private.accept_invitation('hash')"));

 await as(alice,"insert into trip_invitations(trip_id,invited_by,email,token_hash,expires_at) values($1,$2,$3,'expired',now()-interval '1 day')",[trip.id,alice,bob+'@example.test']);
 await assert.rejects(as(bob,"select app_private.accept_invitation('expired')"));
 await as(alice,"insert into trip_invitations(trip_id,invited_by,email,token_hash,expires_at) values($1,$2,$3,'unverified',now()+interval '1 day')",[trip.id,alice,bob+'@example.test']);
 await db.query('update neon_auth."user" set "emailVerified"=false where id=$1',[bob]);
 await assert.rejects(as(bob,"select app_private.accept_invitation('unverified')"));
 let allowed=0;for(let i=0;i<35;i++){try{await as(bob,"insert into feed_posts(user_id,body) values($1,'Rate limited')",[bob]);allowed++;}catch(e){assert.equal(e.code,'54000');}}
 assert.ok(allowed>0&&allowed<30);
 await as(alice,'delete from trips where id=$1',[trip.id]);
 const jobs=await as(alice,'select * from app_private.pending_storage_deletions()');assert.equal(jobs.length,1);assert.equal(jobs[0].storage_path,'private/path');
 assert.equal((await as(eve,'select * from app_private.pending_storage_deletions()')).length,0);
 assert.equal((await as(bob,'select * from packing_items')).length,0);
 await db.close();
});
