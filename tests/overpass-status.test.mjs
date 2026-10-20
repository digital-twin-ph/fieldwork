import test from 'node:test';
import assert from 'node:assert/strict';
import {readOverpassStatus,overpassStatuses,STATUS_MS} from '../build/street-network.js';

// The real thing, copied from overpass-api.de on 2026-10-19 while Fieldwork was reporting the
// service dead because a 6-second probe had timed out against it.
const HEALTHY=`Connected as: 2178874368
Current time: 2026-10-20T01:59:28Z
Announced endpoint: lambert.openstreetmap.de/
Rate limit: 2
2 slots available now.
Currently running queries (pid, space limit, time limit, start time):
`;
const BUSY=`Connected as: 1799129067
Current time: 2026-10-20T02:03:11Z
Rate limit: 2
Slot available after: 2026-10-20T02:03:53Z, in 42 seconds.
Slot available after: 2026-10-20T02:04:30Z, in 79 seconds.
Currently running queries (pid, space limit, time limit, start time):
31234	536870912	180	2026-10-20T02:02:57Z
31240	536870912	180	2026-10-20T02:03:02Z
`;

test('a healthy instance reports its free slots and its limit',()=>{
  const got=readOverpassStatus(HEALTHY);
  assert.equal(got.rateLimit,2);
  assert.equal(got.slotsAvailable,2);
  assert.equal(got.waitSeconds,undefined,'nothing to wait for when a slot is free');
  assert.equal(got.runningQueries,0);
  assert.equal(got.announcedEndpoint,'lambert.openstreetmap.de/');
});

test('a busy instance reports the SOONEST slot, not the first line',()=>{
  const got=readOverpassStatus(BUSY);
  assert.equal(got.rateLimit,2);
  assert.equal(got.slotsAvailable,0,'queued slots mean none free now');
  assert.equal(got.waitSeconds,42,'42 and 79 are offered; 42 is when to come back');
  assert.equal(got.runningQueries,2);
});

// The format is plain text with no version guarantee. Not knowing and being down are different,
// and only one of them is a reason not to try.
test('an unreadable status is unknown rather than unavailable',()=>{
  for(const text of ['','<html>maintenance</html>','Connected as: 1\n']){
    const got=readOverpassStatus(text);
    assert.equal(got.rateLimit,undefined);
    assert.equal(got.slotsAvailable,undefined);
    assert.equal(got.waitSeconds,undefined);
  }
  assert.equal(readOverpassStatus('Slot available after: x, in -3 seconds.').waitSeconds,0,
    'a slot already past is no wait at all');
});

test('every instance is asked, and one that fails is reported rather than omitted',async()=>{
  const asked=[];
  const fetcher=async url=>{
    asked.push(url);
    if(url.includes('kumi'))return new Response('',{status:504});
    if(url.includes('private.coffee'))throw new Error('boom');
    return new Response(HEALTHY,{status:200});
  };
  const got=await overpassStatuses(fetcher);
  assert.equal(got.length,3,'all three, whatever each said');
  assert.ok(asked.every(url=>url.endsWith('/status')),'the status endpoint, not the interpreter');
  const ok=got.find(s=>s.url.includes('overpass-api.de'));
  assert.equal(ok.reachable,true);
  assert.equal(ok.slotsAvailable,2);
  assert.equal(ok.operator,'FOSSGIS','the operator travels with it, for the receipt');
  assert.equal(got.find(s=>s.url.includes('kumi')).error,'HTTP 504');
  assert.equal(got.find(s=>s.url.includes('private.coffee')).reachable,false);
});

test('the status budget is the measured one, not a healthy service\'s',()=>{
  assert.ok(STATUS_MS>=12000,`a one-line read measured 14.2 to 27.3 s under load; got ${STATUS_MS}`);
});

import {cachedOSM,keepOSM,requestOSM} from '../build/street-network.js';

// A tiny stand-in for the Cache API, which Node does not have. The real one is used in the
// browser; this exercises the contract.
const fakeCache=()=>{const held=new Map();return {
  held,
  async match(k){const v=held.get(k);return v===undefined?undefined:new Response(v.text,{headers:v.headers});},
  async put(k,r){held.set(k,{text:await r.text(),headers:Object.fromEntries(r.headers)});},
};};

test('a response is kept against its QUERY, so the same question is not asked twice',async()=>{
  const cache=fakeCache();
  assert.equal(await cachedOSM('q1',cache),null,'nothing cached to begin with');
  await keepOSM('q1','{"elements":[]}','2026-10-19T12:00:00.000Z',cache);
  const hit=await cachedOSM('q1',cache);
  assert.equal(hit.text,'{"elements":[]}');
  assert.equal(hit.retrievedAt,'2026-10-19T12:00:00.000Z','when it was FIRST retrieved, not now');
  assert.equal(await cachedOSM('q2',cache),null,'a different question is a different key');
  assert.equal(cache.held.size,1);
});

test('no cache available is not an error, only a request that has to be made',async()=>{
  assert.equal(await cachedOSM('q',null),null);
  await keepOSM('q','{}','2026-10-19T12:00:00.000Z',null); // must not throw
});

const boundary={type:'Polygon',coordinates:[[[0,0],[0.01,0],[0.01,0.01],[0,0.01],[0,0]]]};
const osm={version:0.6,elements:[
  {type:'node',id:1,lat:0.001,lon:0.001},{type:'node',id:2,lat:0.002,lon:0.002},
  {type:'way',id:10,nodes:[1,2],tags:{highway:'residential'}}]};

test('a cache hit reaches no service at all, and says the bytes came from this device',async()=>{
  const cache=fakeCache();
  let requests=0;
  const fetcher=async url=>{
    requests++;
    if(String(url).endsWith('/status'))return new Response('Rate limit: 2\n2 slots available now.\n',{status:200});
    return new Response(JSON.stringify(osm),{status:200});
  };
  const first=await requestOSM(boundary,0,fetcher,undefined,undefined,undefined,undefined,cache);
  assert.ok(first.nodes.length>0);
  assert.equal(first.provenance.fromCache,undefined,'the first one was fetched');
  const afterFetch=requests;
  assert.ok(afterFetch>0);

  const second=await requestOSM(boundary,0,fetcher,undefined,undefined,undefined,undefined,cache);
  assert.equal(requests,afterFetch,'the second asked nobody -- not even /api/status');
  assert.deepEqual(second.nodes,first.nodes,'and returned the same graph');
  assert.equal(second.provenance.fromCache,true);
  assert.equal(second.provenance.retrievedAt,first.provenance.retrievedAt,
    'a receipt that reported the moment of READING as the moment of acquisition would be wrong about the one thing it records');
  assert.ok(!second.provenance.attribution.includes('via '),'and it does not credit an instance it never asked');
});

// The cache spares a request nobody needs; it must not answer a practitioner who pressed Download
// BECAUSE what they have is wrong. An explicit re-download refreshes.
test('a forced refresh goes to the service even when the answer is cached',async()=>{
  const cache=fakeCache();
  let downloads=0;
  const fetcher=async url=>{
    if(String(url).endsWith('/status'))return new Response('Rate limit: 2\n2 slots available now.\n',{status:200});
    downloads++;return new Response(JSON.stringify(osm),{status:200});
  };
  await requestOSM(boundary,0,fetcher,undefined,undefined,undefined,undefined,cache);
  assert.equal(downloads,1);
  await requestOSM(boundary,0,fetcher,undefined,undefined,undefined,undefined,cache);
  assert.equal(downloads,1,'an ordinary repeat is served from cache');
  const forced=await requestOSM(boundary,0,fetcher,undefined,undefined,undefined,undefined,cache,true);
  assert.equal(downloads,2,'a refresh asks again');
  assert.equal(forced.provenance.fromCache,undefined,'and says it was fetched, not recalled');
});

// The pause is the SERVICE'S, not this client's. A version of this capped the status read at three
// seconds so downloads would start sooner, which meant a loaded service's requested pause was
// never learned and the request went anyway. Following an API means waiting for what it says.
test('the requested pause is honoured, and what is being waited on is said',async()=>{
  const phases=[],waited=[];
  let asked=0,downloaded=0;
  const fetcher=async url=>{
    if(String(url).endsWith('/status')){
      asked++;
      // No free slot, and the service names the wait itself.
      return new Response('Rate limit: 2\nSlot available after: 2026-10-20T02:03:53Z, in 0 seconds.\n',{status:200});
    }
    downloaded++;return new Response(JSON.stringify(osm),{status:200});
  };
  const got=await requestOSM(boundary,0,fetcher,undefined,undefined,undefined,
    w=>waited.push(w),null,false,p=>phases.push(p));
  assert.ok(got.nodes.length>0,'it waits and then downloads');
  assert.equal(asked,3,'every instance is asked how busy it is, and the answer is waited for');
  assert.equal(downloaded,1);
  assert.equal(waited.length,1,'the wait the service named was taken');
  assert.match(phases[0],/how busy/i,'and the practitioner is told what is being waited on');
  assert.ok(phases.some(p=>/asked for/.test(p)),`the pause is attributed to the service: ${phases.join(' | ')}`);
});
