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

test('the points inside come out, and the four outcomes are counted apart',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('on',2,1),point('out',5,5),point('nowhere')),SQUARE,true);
  assert.deepEqual(got.collection.features.map(f=>f.id),['in','on']);
  assert.equal(got.inside,1);
  assert.equal(got.boundary,1,'a point ON the outline is its own relation, not a rounding of the other two');
  assert.equal(got.outside,1,'strictly outside');
  assert.equal(got.missing,1,'unplaceable, which is a different failure and a different fix');
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
  assert.match(receipt.method,/the same one the map uses/);
});

// "clip_points_to_area can have a knob that shows which points are outside but still exclude them
// in the output." A count says how many were set aside; the points say whether setting them aside
// was right -- a cluster across one border reads differently from a scatter in all directions.
test('the excluded points come back for drawing, separately from what is passed on',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('out',9,9),point('far',-4,-4)),SQUARE,true);
  assert.deepEqual(got.collection.features.map(f=>f.id),['in'],'what is passed on is what is in the area');
  assert.deepEqual(got.excluded.map(f=>f.id),['out','far'],'and what was set aside is available to draw');
});

test('a record with no coordinates is counted apart, and still travels',()=>{
  const got=clipPointsToArea(layer(point('in',1,1),point('nowhere')),SQUARE,true);
  // Not outside: unplaceable. A record nobody could locate and a record outside the area are
  // different failures and call for different work, and the receipt says both numbers.
  assert.equal(got.outside,0);
  assert.equal(got.missing,1);
  // Carried, so a map can LIST it as a record it could not plot. It used to be dropped here, and
  // the only trace left downstream was a number -- which is the silent loss a clip exists to
  // prevent, not to commit.
  assert.deepEqual(got.excluded.map(f=>f.id),['nowhere']);
});

test('a boundary point refused by the strict setting is still shown',()=>{
  const got=clipPointsToArea(layer(point('on',2,1)),SQUARE,false);
  assert.deepEqual(got.collection.features,[]);
  assert.deepEqual(got.excluded.map(f=>f.id),['on']);
});

test('a coordinate that is not a number is no location, and does not stop the run',()=>{
  // Reported 2026-10-21 on a map of three facility sources: "Workflow stopped: Invalid LatLng
  // object: (NaN, NaN)". A source whose coordinate column would not parse produced [NaN,NaN];
  // booleanPointInPolygon answers false for it as it answers false for anything it cannot place,
  // so the record was called OUTSIDE, carried as an excluded point, and handed to Leaflet, which
  // refused it and took the whole run with it. Outside is a finding about a place; a coordinate
  // that is not a number is a finding about the data.
  const broken={type:'Feature',id:'broken',properties:{name:'Unparsed'},
    geometry:{type:'Point',coordinates:[Number.NaN,Number.NaN]}};
  const got=clipPointsToArea({type:'FeatureCollection',features:[point('in',1,1),broken]},SQUARE,true);
  assert.equal(got.inside,1);
  assert.equal(got.outside,0,'not outside: nobody could place it');
  assert.equal(got.missing,1);
  assert.deepEqual(got.collection.features.map(f=>f.id),['in'],'and it is not kept');
  assert.deepEqual(got.excluded.map(f=>f.id),['broken'],'but it still travels, to be listed');
});
