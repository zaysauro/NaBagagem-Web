import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRY_CODES, countryName } from '../lib/countries.ts';
import { countryPinsFor, numericCountryCode } from '../lib/country-pins.ts';
test('every supported country has a finite pin, including microstates and islands', () => {
 const pins=countryPinsFor(COUNTRY_CODES.map(code=>countryName(code)));
 assert.equal(pins.length,195);
 for (const pin of pins) {assert.ok(pin.coordinates.every(Number.isFinite));assert.ok(Math.abs(pin.coordinates[0])<=180);assert.ok(Math.abs(pin.coordinates[1])<=90);}
 assert.equal(numericCountryCode('76'),'BR');
});
test('nine countries, additions, removals and aliases produce exactly the expected pins', () => {
 const names=['Brasil','Japão','Portugal','Maldivas','Singapura','Vaticano','Mônaco','Andorra','São Marino'];
 assert.equal(countryPinsFor(names).length,9);
 assert.equal(countryPinsFor([...names,'Brazil','JP',' br ']).length,9);
 assert.equal(countryPinsFor([...names,'Fiji']).length,10);
 assert.equal(countryPinsFor(names.filter(x=>x!=='Brasil')).length,8);
 assert.deepEqual(countryPinsFor(JSON.parse(JSON.stringify(names))),countryPinsFor(names));
});
