import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCoordinates,parseWeatherDays,fetchWeatherForecast} from '../lib/weather.ts';
import {dictionaries,localeFromCookie,formatDate} from '../lib/i18n/dictionaries.ts';
const fixture={daily:{time:['2026-10-18'],temperature_2m_min:[12],temperature_2m_max:[23],weather_code:[1]}};
test('weather requires finite coordinates in range and preserves missing measurements',()=>{
 for(const query of ['', 'latitude=&longitude=', 'latitude=91&longitude=0','latitude=0&longitude=181','latitude=NaN&longitude=0'])assert.equal(parseCoordinates(new URLSearchParams(query)),null);
 assert.deepEqual(parseCoordinates(new URLSearchParams('latitude=0&longitude=0')),{latitude:0,longitude:0});
 assert.equal(parseWeatherDays(fixture)[0].rain,null);
 assert.throws(()=>parseWeatherDays({daily:{...fixture.daily,temperature_2m_min:[null]}}));
 assert.throws(()=>parseWeatherDays({daily:{...fixture.daily,time:['2026-02-31']}}));
});
test('weather provider failures never become a fabricated successful forecast',async()=>{
 await assert.rejects(fetchWeatherForecast({latitude:0,longitude:0},{fetcher:async()=>new Response('{}',{status:503})}));
 await assert.rejects(fetchWeatherForecast({latitude:0,longitude:0},{fetcher:async()=>Response.json({daily:{}})}));
 const result=await fetchWeatherForecast({latitude:0,longitude:0},{fetcher:async(url,options)=>{assert.equal(options.signal.aborted,false);return Response.json(fixture);}});
 assert.equal(result.days[0].max,23);
});
test('supported languages have matching keys and calendar dates never shift timezone',()=>{
 for(const value of Object.values(dictionaries))assert.deepEqual(Object.keys(value).sort(),Object.keys(dictionaries['pt-BR']).sort());
 assert.equal(localeFromCookie('foo=x; nabagagem-locale=ja'),'ja');
 assert.equal(localeFromCookie('nabagagem-locale=%invalid'),'pt-BR');
 assert.match(formatDate('2026-10-17','en'),/17/);
});
