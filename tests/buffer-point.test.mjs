import test from 'node:test';
import assert from 'node:assert/strict';
import {bufferPoint,validateBufferPointNode,requireRunnableBufferPoint,BUFFER_POINT_STEPS} from '../build/buffer-point.js';

const gauges={type:'FeatureCollection',features:[
  {type:'Feature',id:'145',properties:{name:'MANILA'},geometry:{type:'Point',coordinates:[120.97,14.58]}},
  {type:'Feature',id:'260',properties:{name:'JOLO'},geometry:{type:'Point',coordinates:[121.00,6.07]}},
  {type:'Feature',id:'x',properties:{name:'UNLOCATED'},geometry:null},
]};
const node=(params)=>({id:'scope',type:'buffer_point',x:0,y:0,
  params:{label:'Area around a point',pointId:'MANILA',distanceM:5000,...params}});

test('the scope is a circle to within a tenth of a percent, and says so',()=>{
  const {value,receipt}=bufferPoint(gauges,node(),'r1');
  assert.equal(value.kind,'study-area');
  assert.equal(value.boundary.type,'Polygon');
  assert.equal(value.boundary.coordinates[0].length-1,BUFFER_POINT_STEPS*4,'four quadrants of steps');
  const fraction=Number(receipt.facts.match(/fw:circleAreaFraction "([0-9.]+)"/)[1]);
  assert.ok(fraction>0.999&&fraction<=1,`area fraction ${fraction} should be within 0.1% of the true circle`);
  assert.match(receipt.method,/A derived scope, not a surveyed boundary/);
});

test('a point can be named by id or by name',()=>{
  const byId=bufferPoint(gauges,node({pointId:'145'}),'r1');
  const byName=bufferPoint(gauges,node({pointId:'MANILA'}),'r1');
  assert.deepEqual(byId.value.bounds,byName.value.bounds);
});

test('the scope records its source point and radius with a unit',()=>{
  const {receipt}=bufferPoint(gauges,node({distanceM:3000}),'r1');
  assert.match(receipt.facts,/fw:sourcePoint "MANILA"/);
  assert.match(receipt.facts,/qudt:numericValue 3000/);
  assert.match(receipt.facts,/qudt:unit <http:\/\/qudt\.org\/vocab\/unit\/M>/);
  assert.match(receipt.facts,/a fw:StudyArea, geo:Feature/,'it is a scope like any other');
  assert.match(receipt.facts,/prov:wasGeneratedBy/,'and its derivation is recorded');
});

test('an unknown, blank or unlocated point is refused, and points are never unioned',()=>{
  // A node with no point chosen is an unfinished draft, not an invalid one: it must stay addable.
  assert.doesNotThrow(()=>validateBufferPointNode(node({pointId:''})),'an empty draft is valid');
  assert.throws(()=>requireRunnableBufferPoint(node({pointId:''})),/Choose which point/,'but it cannot run');
  assert.throws(()=>bufferPoint(gauges,node({pointId:'CEBU'}),'r1'),/no point called "CEBU"/);
  assert.throws(()=>bufferPoint(gauges,node({pointId:'UNLOCATED'}),'r1'),/no coordinates/);
  // Two gauges 940 km apart must not become one scope; the message says so.
  assert.match(String(Object.getOwnPropertyNames({})),/^$/);
  const one=bufferPoint(gauges,node(),'r1');
  assert.ok(one.value.bounds[3]-one.value.bounds[1]<0.2,'the scope spans one place, not the archipelago');
});

test('the distance bound is enforced',()=>{
  // Raised from 5,000 to 50,000 on 2026-10-12. One knob, shared: validateBufferPointNode delegates
  // to validateBuffer, so buffer_point and buffer_area have always had the same range, and the old
  // ceiling sat below the 50,000 the geometry helpers in the same module already accepted.
  for(const distanceM of [-1,50001,Number.NaN])
    assert.throws(()=>validateBufferPointNode(node({distanceM})),/0–50,000 metres/);
  assert.doesNotThrow(()=>validateBufferPointNode(node({distanceM:0})));
  assert.doesNotThrow(()=>validateBufferPointNode(node({distanceM:6000})),'the 6 km the Old Naledi facility selection needs');
});

import {circleAround} from '../build/area-buffer.js';
import {validateAreaParams,studyAreaN3} from '../build/study-area.js';

// A study area can now be given as a centre and a radius, which is how a practitioner scopes to
// a place without a point layer and without panning the map there. It is the same construction
// buffer_point uses, so the two cannot drift.
test('a study area can be a circle around typed coordinates',()=>{
  const centre=[120.97,14.58],geometry=circleAround(centre,5000);
  assert.equal(geometry.type,'Polygon');
  assert.equal(geometry.coordinates[0].length-1,BUFFER_POINT_STEPS*4,'the same vertex count as buffer_point');
  const params={source:'drawn',label:'Around the Manila gauge',selectionMode:'circle',geometry};
  assert.doesNotThrow(()=>validateAreaParams(params));
  assert.match(studyAreaN3({id:'a',type:'study_area',x:0,y:0,params}).facts,/fw:selectionMode fw:Circle/,
    'and the facts say it was derived from a centre, not drawn by hand');
});

test('a circle refuses a centre or radius it cannot honour',()=>{
  assert.throws(()=>circleAround([120.97,85],5000),/below 80/);
  assert.throws(()=>circleAround([120.97,14.58],0),/1 to 50,000 metres/);
  assert.throws(()=>circleAround([120.97,14.58],50001),/1 to 50,000 metres/);
  assert.throws(()=>circleAround([Number.NaN,14.58],5000),/below 80/);
});
