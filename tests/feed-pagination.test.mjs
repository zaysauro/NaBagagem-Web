import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { feedPageQuery, encodeFeedCursor, decodeFeedCursor } from '../lib/feed-pagination.ts';
test('feed traverses more than 100 rows, ties and microseconds without losing or duplicating posts',async()=>{
 const db=new PGlite();
 await db.exec(`create table feed_posts(id uuid primary key,user_id text,trip_id uuid,title text,body text,visibility text,created_at timestamptz);create table user_follows(follower_id text,following_id text);
 insert into feed_posts(id,user_id,created_at) select md5(i::text)::uuid,'alice','2026-10-15T00:00:00Z'::timestamptz+(i/3)*interval '1 microsecond' from generate_series(1,137) i;`);
 const seen=[];let cursor=null;
 do {
  const q=feedPageQuery('alice','all',20,cursor);const {rows}=await db.query(q.text,q.values);
  const page=rows.slice(0,20);seen.push(...page.map(p=>p.id));
  cursor=rows.length>20?decodeFeedCursor(encodeFeedCursor(page.at(-1))):null;
  if(seen.length===20)await db.exec("insert into feed_posts(id,user_id,created_at) values(md5('new')::uuid,'alice','2026-10-16')");
 } while(cursor);
 assert.equal(seen.length,137);assert.equal(new Set(seen).size,137);
 await db.exec("insert into user_follows values('bob','alice')");
 let q=feedPageQuery('bob','following',30,null);assert.equal((await db.query(q.text,q.values)).rows.length,31);
 q=feedPageQuery('bob','friends',30,null);assert.equal((await db.query(q.text,q.values)).rows.length,0);
 await db.exec("insert into user_follows values('alice','bob')");
 q=feedPageQuery('bob','friends',30,null);assert.equal((await db.query(q.text,q.values)).rows.length,31);
 q=feedPageQuery('bob','discover',30,null);assert.equal((await db.query(q.text,q.values)).rows.length,0);
 await db.close();
});
test('cursor rejects malformed and oversized input',()=>{for(const value of ['nope','x'.repeat(513),Buffer.from(JSON.stringify({id:"'; drop table feed_posts;",createdAt:'2026-10-15'})).toString('base64url')])assert.throws(()=>decodeFeedCursor(value));});
