import test from 'node:test';
import assert from 'node:assert/strict';
import {countQuery,readOverpassCount,countWays,osmQuery} from '../build/street-network.js';

// The practitioner drew a study area across the DRC-Uganda border and got, after four requests to
// three donated services, "the last reporting HTTP 504". A 504 is the service saying it gave up
// computing the answer. Overpass will answer `out count;` instead -- the service's own answer to
// "how much is there" -- which is one request rather than six, and a measurement rather than the
// client-side span cap this project removed on purpose.
const BORDER={type:'Polygon',coordinates:[[[29.0,-1.5],[32.5,-1.5],[32.5,2.5],[29.0,2.5],[29.0,-1.5]]]};

test('the count asks for the same ways as the download, and asks only for their number',()=>{
  const counting=countQuery(BORDER,250,50000,'walking'),downloading=osmQuery(BORDER,250,50000,'walking');
  assert.match(counting.query,/out count;$/);
  assert.doesNotMatch(counting.query,/out body/);
  // Same filter, same bounds: a count that asked a different question would measure nothing.
  const filter=/way\["highway"~"\^\(([^)]*)\)\$"\]/;
  assert.equal(counting.query.match(filter)[1],downloading.query.match(filter)[1]);
  assert.deepEqual(counting.bounds,downloading.bounds);
  // And it follows the mode, because a driving count is a different number.
  assert.notEqual(countQuery(BORDER,250,50000,'driving').query,counting.query);
});

test('a count answer is read, and anything else is not mistaken for one',()=>{
  assert.equal(readOverpassCount({elements:[{type:'count',id:0,tags:{nodes:'0',ways:'184230',relations:'0',total:'184230'}}]}),184230);
  assert.equal(readOverpassCount({elements:[{type:'count',id:0,tags:{total:'12'}}]}),12);
  for(const notACount of [null,{},{elements:[]},{elements:[{type:'way',id:1}]},{elements:[{type:'count',tags:{ways:'many'}}]}])
    assert.equal(readOverpassCount(notACount),null);
});

const respond=(body,{ok=true,status=200}={})=>async()=>({ok,status,json:async()=>body});

test('three answers, and only two of them decide anything',async()=>{
  assert.deepEqual(await countWays('https://x.invalid','q',respond({elements:[{type:'count',id:0,tags:{ways:'184230'}}]})),
    {kind:'counted',ways:184230});
  // The server gave up: that IS evidence about the area.
  assert.deepEqual(await countWays('https://x.invalid','q',respond(null,{ok:false,status:504})),{kind:'refused',status:504});
  // These are not: a probe that could not be taken says nothing about how much is there.
  assert.deepEqual(await countWays('https://x.invalid','q',respond(null,{ok:false,status:429})),{kind:'unknown'});
  assert.deepEqual(await countWays('https://x.invalid','q',respond({elements:[{type:'way'}]})),{kind:'unknown'});
  assert.deepEqual(await countWays('https://x.invalid','q',async()=>{throw new Error('offline');}),{kind:'unknown'});
});
