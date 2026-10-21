import test from 'node:test';
import assert from 'node:assert/strict';
import {clipPointsToArea,clipPointsReceipt} from '../build/clip-points.js';

// "We do not have a point in polygon process ... I mean widget."
//
// The predicate had existed since the coverage check and the OPERATION had not: eleven widgets
// emit a point layer and none of them answered "keep the ones inside this area", so the decision
// was made privately inside whichever widget needed it.
const SQUARE={type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]};
const point=(id,lon,lat)=>({type:'Feature',id,properties:{name:id},geometry:lon===undefined?null:{type:'Point',coordinates:[lon,lat]}});
const layer=(...features)=>({type:'FeatureCollection',features});

test('the points inside come out, and the three relations are counted apart',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('on',2,1),point('out',5,5),point('nowhere')),SQUARE,true);
  assert.deepEqual(got.collection.features.map(f=>f.id),['in','on']);
  assert.equal(got.inside,1);
  assert.equal(got.boundary,1,'a point ON the outline is its own relation, not a rounding of the other two');
  assert.equal(got.outside,2,'outside and unplaceable both fail the test, and the receipt says which');
});

test('strict containment is the other defensible answer, and it is a choice',()=>{
  const strict=clipPointsToArea(layer(point('in',1,1),point('on',2,1)),SQUARE,false);
  assert.deepEqual(strict.collection.features.map(f=>f.id),['in']);
  assert.equal(strict.boundary,1,'the boundary point is still counted; it is just not kept');
});

test('an enclave is a hole in the area, not part of it',()=>{
  const withHole={type:'Polygon',coordinates:[
    [[0,0],[6,0],[6,6],[0,6],[0,0]],
    [[2,2],[4,2],[4,4],[2,4],[2,2]]]};
  const got=clipPointsToArea(layer(point('area',1,1),point('enclave',3,3)),withHole,true);
  assert.deepEqual(got.collection.features.map(f=>f.id),['area']);
  assert.equal(got.outside,1);
});

test('the receipt names the predicate, the choice and the counts',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('on',2,1),point('out',9,9)),SQUARE,true);
  const node={id:'clip',type:'clip_points_to_area',x:0,y:0,params:{label:'Inside the area',keepBoundary:true}};
  const receipt=clipPointsReceipt(node,got,'run1','area','points');
  assert.match(receipt.facts,/fw:PointInPolygonClip/);
  assert.match(receipt.facts,/fw:spatialPredicate "sfWithin"/,'the OGC name, so a reader can audit the claim');
  assert.match(receipt.facts,/fw:boundaryPointsKept true/);
  assert.match(receipt.facts,/fw:insideCount 1; fw:boundaryCount 1; fw:outsideCount 1/);
  assert.match(receipt.facts,/fw:recordCount 2/);
  assert.match(receipt.facts,/prov:used <urn:fieldwork:run:run1:output:area>, <urn:fieldwork:run:run1:output:points>/);
  assert.match(receipt.method,/the same one the coverage check and the map use/);
});

// "clip_points_to_area can have a knob that shows which points are outside but still exclude them
// in the output." A count says how many were set aside; the points say whether setting them aside
// was right -- a cluster across one border reads differently from a scatter in all directions.
test('the excluded points come back for drawing, separately from what is passed on',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('out',9,9),point('far',-4,-4)),SQUARE,true);
  assert.deepEqual(got.collection.features.map(f=>f.id),['in'],'what is passed on is what is in the area');
  assert.deepEqual(got.excluded.map(f=>f.id),['out','far'],'and what was set aside is available to draw');
});

test('a record with no coordinates is counted, and is not offered for drawing',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('nowhere')),SQUARE,true);
  assert.equal(got.outside,1,'unplaceable fails the test like anything else');
  assert.deepEqual(got.excluded.map(f=>f.id),[],'but there is nowhere to draw it, so it is not pretended otherwise');
});

test('a boundary point refused by the strict setting is still shown',()=>{
  const got=clipPointsToArea(layer(point('on',2,1)),SQUARE,false);
  assert.deepEqual(got.collection.features,[]);
  assert.deepEqual(got.excluded.map(f=>f.id),['on']);
});
