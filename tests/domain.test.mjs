import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRY_CODES,COUNTRY_BASE,countryCode} from '../lib/countries.ts';
import {validateFile} from '../lib/neon/file-validation.ts';
test('passport uses exactly 195 unique country codes and localized aliases',()=>{assert.equal(COUNTRY_CODES.length,COUNTRY_BASE);assert.equal(new Set(COUNTRY_CODES).size,195);assert.equal(countryCode('Japão'),'JP');assert.equal(countryCode('日本'),'JP');assert.equal(countryCode('Japan'),'JP');assert.equal(countryCode('Guam'),undefined);assert.equal(countryCode('Holanda'),'NL');});
test('upload rejects mismatched MIME, SVG and oversize files',async()=>{await assert.rejects(validateFile(new File(['<svg/>'],'a.svg',{type:'image/svg+xml'})));await assert.rejects(validateFile(new File(['<html/>'],'a.png',{type:'image/png'})));await assert.rejects(validateFile(new File([new Uint8Array(8388609)],'a.jpg',{type:'image/jpeg'})));assert.equal(await validateFile(new File(['%PDF-1.7\n'],'ticket.pdf',{type:'application/pdf'}),true),'application/pdf');await assert.rejects(validateFile(new File(['%PDF-1.7\n'],'ticket.pdf',{type:'application/pdf'})));});
