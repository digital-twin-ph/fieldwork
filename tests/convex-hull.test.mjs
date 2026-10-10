import test from 'node:test';
import assert from 'node:assert/strict';
import {hullOf,convexHull,validateHullNode,MIN_HULL_POINTS} from '../build/convex-hull.js';

const node=p=>({id:'hull',type:'summarize_hull',x:0,y:0,
  params:{label:'Area the cases cover',zone:30,hemisphere:'north',...p}});
const layer=(...coords)=>({type:'FeatureCollection',
  features:coords.map((c,i)=>({type:'Feature',id:`p-${i+1}`,properties:{name:`P${i+1}`},
    geometry:c?{type:'Point',coordinates:c}:null}))});

test('the hull keeps corners and drops everything inside',()=>{
  // A square with a point in the middle and one on an edge: the hull is the square.
  const ring=hullOf([[0,0],[10,0],[10,10],[0,10],[5,5],[5,0]]);
  assert.equal(ring.length,5,'four corners, closed');
  assert.deepEqual(ring[0],ring[4],'the ring closes');
  const corners=ring.slice(0,4).map(p=>p.join(','));
  for(const c of ['0,0','10,0','10,10','0,10'])assert.ok(corners.includes(c),`${c} is a corner`);
  assert.ok(!corners.includes('5,5'),'an interior point is not on the hull');
  assert.ok(!corners.includes('5,0'),'a point on an edge is not a corner');
});

test('collinear points enclose no area',()=>{
  assert.equal(hullOf([[0,0],[1,1],[2,2],[3,3]]),null,'a line is not a hull');
  assert.equal(hullOf([[0,0],[1,1]]),null,'two points are not a hull');
  assert.equal(hullOf([[0,0],[0,0],[0,0]]),null,'duplicates are one point');
});

test('it refuses a layer that cannot enclose anything, and says which',()=>{
  assert.throws(()=>convexHull(layer([0.1,51.5],[0.2,51.5]),node(),'r','src'),
    new RegExp(`at least ${MIN_HULL_POINTS} located points; this layer has 2`));
  // Points on one meridian are collinear in degrees and not in metres. Measured: three
  // of them 2.2 km apart enclose 3.6 m². The hull is correct and trivially misread, so the
  // area is reported rather than thresholded — a cutoff would also refuse cases along a road.
  const sliver=convexHull(layer([0.1,51.50],[0.1,51.51],[0.1,51.52]),node(),'r','src');
  const said=sliver.value.notes.join(' ');
  assert.match(said,/Encloses [\d.]+ m² across \d+ m at its widest/);
  assert.match(said,/should be read as one/);
  assert.match(sliver.receipt.facts,/fw:hullAreaSquareMetres \d/);
});

test('points without coordinates take no part, and are reported',()=>{
  const got=convexHull(layer([0.10,51.50],[0.12,51.50],[0.11,51.52],null),node(),'r','src');
  assert.match(got.value.notes.join(' '),/1 record without coordinates took no part/);
  assert.match(got.receipt.facts,/fw:recordCount 3/);
});

// The hull is computed in metres. A hull taken on degrees would be a different
// polygon, and both case studies this is derived from project first.
test('the hull is computed in a metric CRS and says which',()=>{
  const got=convexHull(layer([0.10,51.50],[0.14,51.50],[0.12,51.54]),node(),'r','src');
  assert.match(got.value.crs,/^EPSG:326\d\d$/,'a projected CRS, not CRS84');
  assert.match(got.value.method,/monotone chain/);
  assert.match(got.receipt.facts,/fw:metricCRS "EPSG:/);
  const ring=got.value.features[0].geometry.coordinates[0];
  assert.equal(ring.length,4,'three corners, closed');
  for(const [x,y] of ring){
    assert.ok(Math.abs(x)<=180&&Math.abs(y)<=90,'returned as longitude and latitude');
  }
});

// A hull asserts area where nothing was observed. Nothing can enforce how a shape
// is read, so the result carries the limitation.
test('the result states that a hull fills in what is not convex',()=>{
  const got=convexHull(layer([0.10,51.50],[0.14,51.50],[0.12,51.54]),node(),'r','src');
  const said=got.value.notes.join(' ')+got.receipt.method;
  assert.match(said,/convex/i);
  assert.match(said,/asserts area where nothing was observed/);
  assert.match(said,/not a service area, a catchment or a boundary anyone agreed to/);
});

test('a zone is required, as for every other metric widget',()=>{
  assert.throws(()=>validateHullNode(node({zone:0})),/UTM zone from 1 to 60/);
  assert.throws(()=>validateHullNode(node({hemisphere:'up'})),/hemisphere/);
  assert.throws(()=>validateHullNode(node({label:''})),/Name the hull/);
});
