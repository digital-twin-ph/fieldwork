import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeMeanCenter,meanCenterReceipt} from '../build/mean-center.js';

const params=(extra={})=>({label:'Mean center',zone:30,hemisphere:'north',...extra});
const fc=features=>({type:'FeatureCollection',features});
const point=(lon,lat,properties={})=>({id:`p${lon}${lat}`,type:'Feature',properties,geometry:{type:'Point',coordinates:[lon,lat]}});

test('a weight field moves the centre toward the heavier points',()=>{
  const points=fc([point(-0.14,51.51,{DEATHS:1}),point(-0.13,51.51,{DEATHS:9})]);
  const plain=computeMeanCenter(points,params());
  const weighted=computeMeanCenter(points,params({weightField:'DEATHS'}));
  assert.equal(plain.weight,undefined,'an unweighted run reports no weight');
  assert.deepEqual(weighted.weight,{field:'DEATHS',total:10});
  assert.equal(weighted.count,2,'count stays the number of points, not the weight sum');
  assert.ok(weighted.coordinates[0]>plain.coordinates[0],'the weighted centre sits nearer the heavier point');
  assert.match(plain.method,/^Unweighted arithmetic mean/);
  assert.match(weighted.method,/weighted by "DEATHS" \(10 over 2 points\)/);
});

test('equal weights give the unweighted answer',()=>{
  const points=fc([point(-0.14,51.51,{n:2}),point(-0.13,51.512,{n:2}),point(-0.135,51.509,{n:2})]);
  const plain=computeMeanCenter(points,params());
  const weighted=computeMeanCenter(points,params({weightField:'n'}));
  for(const axis of [0,1])assert.ok(Math.abs(plain.coordinates[axis]-weighted.coordinates[axis])<1e-12);
  assert.equal(weighted.weight.total,6);
});

// A zero weight is a real contribution of nothing; a missing one is not knowable and is refused.
test('zero weights are admitted and unusable ones are refused with a count',()=>{
  const withZeros=fc([point(-0.14,51.51,{DEATHS:0}),point(-0.13,51.51,{DEATHS:4})]);
  const centre=computeMeanCenter(withZeros,params({weightField:'DEATHS'}));
  assert.equal(centre.weight.total,4);
  assert.ok(Math.abs(centre.coordinates[0]-(-0.13))<1e-9,'a house where nobody died contributes no deaths');

  assert.throws(()=>computeMeanCenter(fc([point(-0.14,51.51,{DEATHS:1}),point(-0.13,51.51,{})]),params({weightField:'DEATHS'})),
    /1 of 2 records hold no usable number/);
  assert.throws(()=>computeMeanCenter(fc([point(-0.14,51.51,{DEATHS:-3})]),params({weightField:'DEATHS'})),
    /no usable number/,'a negative weight is not a weight');
  assert.throws(()=>computeMeanCenter(fc([point(-0.14,51.51,{DEATHS:'many'})]),params({weightField:'DEATHS'})),/no usable number/);
  assert.throws(()=>computeMeanCenter(fc([point(-0.14,51.51,{DEATHS:0}),point(-0.13,51.51,{DEATHS:0})]),params({weightField:'DEATHS'})),
    /weights sum to zero/);
  // A blank field name was asserted here as a refusal, which encoded a defect: see the empty-field
  // test below. The Inspector writes '' to turn weighting off, so blank means unweighted.
});

test('a numeric string weight is read, because an imported CSV column is a string',()=>{
  const centre=computeMeanCenter(fc([point(-0.14,51.51,{DEATHS:'3'}),point(-0.13,51.51,{DEATHS:'1'})]),params({weightField:'DEATHS'}));
  assert.equal(centre.weight.total,4);
});

test('the receipt asserts the weight field and total beside the point count, never instead of it',()=>{
  const points=fc([point(-0.14,51.51,{DEATHS:1}),point(-0.13,51.51,{DEATHS:9})]);
  const weighted=meanCenterReceipt({id:'c',type:'mean_center',x:0,y:0,params:params({weightField:'DEATHS'})},
    computeMeanCenter(points,params({weightField:'DEATHS'})),'run1','src');
  assert.match(weighted.facts,/fw:inputCount 2/,'the point count is still asserted');
  assert.match(weighted.facts,/fw:weightField "DEATHS"/);
  assert.match(weighted.facts,/fw:weightTotal 10/);
  assert.match(weighted.method,/weighted by "DEATHS"/);

  const plain=meanCenterReceipt({id:'c',type:'mean_center',x:0,y:0,params:params()},
    computeMeanCenter(points,params()),'run1','src');
  assert.match(plain.facts,/fw:inputCount 2\./,'an unweighted receipt is unchanged');
  assert.ok(!plain.facts.includes('weightField'));
});

// The measurement that prompted this, against the real data, 2026-10-19.
test("on the 1854 cholera deaths the weighted centre differs from the unweighted by about two metres",()=>{
  const data=JSON.parse(readFileSync(new URL('../examples/john-snow/points.json',import.meta.url),'utf8'));
  const points=fc(data.deaths.filter(f=>f.geometry));
  const plain=computeMeanCenter(points,params());
  const weighted=computeMeanCenter(points,params({weightField:'DEATHS'}));
  assert.equal(plain.count,250);
  assert.equal(weighted.count,250,'250 addresses');
  assert.equal(weighted.weight.total,489,'carrying 489 deaths');
  const metres=Math.hypot(weighted.projected[0]-plain.projected[0],weighted.projected[1]-plain.projected[1]);
  assert.ok(metres>1&&metres<4,`expected roughly 2 m, measured ${metres.toFixed(2)} m`);
});

// Emptying the Inspector's weight box must turn weighting OFF. Its generic parameter handler
// writes a trimmed string and never `undefined`, so `''` is the value that arrives, and refusing
// it made the control one-way: settable and not unsettable. Found by the browser test, 2026-10-19.
test('an empty weight field is unweighted rather than an unfinished name',()=>{
  const points=fc([point(-0.14,51.51,{DEATHS:1}),point(-0.13,51.51,{DEATHS:9})]);
  for(const blank of ['','   ',undefined]){
    const centre=computeMeanCenter(points,params({weightField:blank}));
    assert.equal(centre.weight,undefined,`${JSON.stringify(blank)} is unweighted`);
    assert.match(centre.method,/^Unweighted arithmetic mean/);
  }
  // A name that is merely too long is still refused.
  assert.throws(()=>computeMeanCenter(points,params({weightField:'x'.repeat(61)})),/at most 60 characters/);
});
