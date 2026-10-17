import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeDayEventOrder } from '../lib/itinerary-optimization.ts';

test('optimizer uses UI location_id coordinates and returns each unscheduled event once', () => {
  const events = ['start','far','near'].map(id => ({ id,location_id:`location-${id}`,latitude:null,longitude:null }));
  const locations = [
    {id:'location-start',latitude:0,longitude:0},
    {id:'location-far',latitude:0,longitude:10},
    {id:'location-near',latitude:0,longitude:1},
  ];
  const before = structuredClone(events);
  assert.deepEqual(optimizeDayEventOrder(events,locations), ['start','near','far']);
  assert.deepEqual(events,before);
});

test('optimizer preserves one reserved start and chronological scheduled anchors without duplicates', () => {
  const flexible = [{id:'far',latitude:0,longitude:10},{id:'near',latitude:0,longitude:1}];
  assert.deepEqual(optimizeDayEventOrder([...flexible,{id:'reservation',latitude:0,longitude:0,confirmation_code:'TEST'}],[]), ['reservation','near','far']);
  const order = optimizeDayEventOrder([
    {id:'evening',latitude:0,longitude:5,start_time:'18:00:00'},
    {id:'flexible',latitude:0,longitude:1},
    {id:'morning',latitude:0,longitude:0,start_time:'09:00:00'},
  ],[]);
  assert.equal(order.length,3);
  assert.equal(new Set(order).size,3);
  assert.ok(order.indexOf('morning') < order.indexOf('evening'));
});

test('optimizer retains unlocated stops and uses complete coordinate pairs', () => {
  const order = optimizeDayEventOrder([
    {id:'start',latitude:0,longitude:0},
    {id:'unknown',location_id:'missing'},
    {id:'far',latitude:0,longitude:10},
    {id:'partial',latitude:80,longitude:null,location_id:'near'},
  ],[{id:'near',latitude:0,longitude:1}]);
  assert.deepEqual(order,['start','unknown','partial','far']);
  assert.throws(()=>optimizeDayEventOrder([
    {id:'one',latitude:0,longitude:0},
    {id:'invalid',latitude:91,longitude:0},
    {id:'missing',location_id:'absent'},
  ],[]),/pelo menos 2 atividades/);
});
