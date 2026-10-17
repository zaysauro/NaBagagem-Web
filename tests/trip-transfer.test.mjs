import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { parseTripImport, persistTripImport } from '../lib/trip-import.ts';
import { createTripExport } from '../lib/trip-export.ts';

const data={trip:{title:'Tokyo',start_date:'2026-11-01',end_date:'2026-11-03',budget_amount:'1234.56',budget_currency:'BRL'},
 locations:[{id:'old-place',name:'Temple & park',latitude:35.1,longitude:139.1,notes:'Line one\n"Quoted", line two'},{id:'second',name:'Museum',latitude:36,longitude:140}],
 events:[{id:'old-event',title:'Visit',location_id:'old-place',day_index:2,order_index:3,event_date:'2026-11-02',start_time:'09:00:00'}],
 expenses:[{title:'Hotel',amount:'10.23',currency:'BRL',category:'lodging'}],checklist:[{title:'Passport',completed:true}]};
test('GPX and KML round trips preserve destinations without duplicate route points',()=>{
 for(const format of ['gpx','kml']) {
  const output=createTripExport(format,data);
  const input=parseTripImport(output.body,output.filename);
  assert.equal(input.locations.length,2);
  assert.equal(input.locations[0].name,'Temple & park');
  assert.equal(input.locations[1].latitude,36);
 }
 assert.throws(()=>parseTripImport('<!DOCTYPE gpx [<!ENTITY x "test">]><gpx/>','bad.gpx'));
 assert.throws(()=>parseTripImport('<gpx><wpt lat="100" lon="1"/></gpx>','bad.gpx'));
 assert.throws(()=>parseTripImport('<gpx><wpt lat="1"/></gpx>','bad.gpx'));
});
test('CSV handles escaped fields; JSON preserves null coordinates, dates, money and ordering',()=>{
 const csv=createTripExport('csv',data);
 const parsed=parseTripImport(csv.body,csv.filename);
 assert.equal(parsed.locations[0].notes,data.locations[0].notes);
 assert.throws(()=>parseTripImport('name,latitude\n"unfinished,1','bad.csv'));
 const backup=createTripExport('json',{...data,locations:[...data.locations,{id:'unknown',name:'Unknown',latitude:null,longitude:null}]});
 const input=parseTripImport(backup.body,backup.filename);
 assert.equal(input.trip.budget_amount,'1234.56');assert.equal(input.trip.start_date,'2026-11-01');
 assert.equal(input.locations[2].latitude,null);assert.equal(input.events[0].order_index,3);
 assert.equal(input.expenses[0].amount,'10.23');assert.equal(input.checklist[0].completed,true);
});
test('backup import remaps relationships and rolls back the whole trip on a child failure',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create schema neon_auth;create table neon_auth."user"(id text primary key,name text,email text,"emailVerified" boolean);insert into neon_auth."user" values('importer','Importer','importer@example.invalid',true)`);
  for(const f of (await readdir('db/migrations')).sort())await db.exec(await readFile('db/migrations/'+f,'utf8'));
  const input=parseTripImport(createTripExport('json',data).body,'trip.json');
  async function run(value){await db.exec("begin;set local role nabagagem_app;select set_config('app.user_id','importer',true)");try{const saved=await persistTripImport(db,'importer',value);await db.exec('commit');return saved;}catch(e){await db.exec('rollback');throw e;}}
  const trip=await run(input);
  const events=(await db.query('select e.title,l.name from trip_events e join trip_locations l on l.id=e.location_id where e.trip_id=$1',[trip.id])).rows;
  assert.deepEqual(events,[{title:'Visit',name:'Temple & park'}]);
  await assert.rejects(run({...input,expenses:[{...input.expenses[0],amount:'-1'}]}));
  assert.equal((await db.query('select count(*)::int as n from trips')).rows[0].n,1);
 }finally{await db.close();}
});
