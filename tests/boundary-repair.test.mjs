import test from 'node:test';
import assert from 'node:assert/strict';
import {repairBoundary,REPAIR_RULE} from '../build/boundary-repair.js';
import {validateDrawnGeometry} from '../build/study-area.js';

/** THE BOUNDARY REPAIR (2026-11-09). OCHA's COD-AB districts of Sierra Leone repeat 84 vertices and carry one spike in
 *  Bonthe, and the study area refused all sixteen. The rule removes only what changes no outline, and lists it. */
const square=[[0,0],[1,0],[1,1],[0,1],[0,0]];
const area=ring=>Math.abs(ring.slice(0,-1).reduce((s,p,i)=>s+p[0]*ring[i+1][1]-ring[i+1][0]*p[1],0))/2;

test('a point repeated straight after itself is removed, listed, and the outline is unchanged',()=>{
  const {geometry,repairs}=repairBoundary({type:'Polygon',coordinates:[[[0,0],[1,0],[1,0],[1,1],[0,1],[0,1],[0,0]]]});
  assert.deepEqual(geometry.coordinates,[square]);
  assert.deepEqual(repairs,[{kind:'repeated',at:[1,0]},{kind:'repeated',at:[0,1]}]);
  assert.doesNotThrow(()=>validateDrawnGeometry(geometry));
});

test('the tip of a zero-width spike is removed, as on Bonthe, and the area is the same',()=>{
  // Bonthe's three vertices as COD-AB publishes them, rounded: a metre east and straight back along 7.59311 N.
  const a=[-13.00146,7.59311],tip=[-13.00145,7.59311],c=[-13.00184,7.59311];
  const ring=[a,tip,c,[-13.00184,7.5925],[-13.00146,7.5925],a];
  assert.throws(()=>validateDrawnGeometry({type:'Polygon',coordinates:[ring]}),/collinear/);
  const {geometry,repairs}=repairBoundary({type:'Polygon',coordinates:[ring]});
  assert.deepEqual(repairs,[{kind:'spike',at:tip}]);
  assert.equal(geometry.coordinates[0].length,ring.length-1);
  assert.ok(Math.abs(area(geometry.coordinates[0])-area(ring))<1e-15,'no area changes');
  assert.doesNotThrow(()=>validateDrawnGeometry(geometry));
});

test('a ring touching itself elsewhere is not repaired, and is still refused',()=>{
  const bow=[[0,0],[2,0],[1,1],[2,2],[0,2],[1,1],[0,0]];
  const {repairs,geometry}=repairBoundary({type:'Polygon',coordinates:[bow]});
  assert.deepEqual(repairs,[]);
  assert.throws(()=>validateDrawnGeometry(geometry),/distinct/);
});

test('a MultiPolygon is repaired part by part, and a clean boundary is left as it is',()=>{
  const {geometry,repairs}=repairBoundary({type:'MultiPolygon',coordinates:[[square],[[[5,5],[6,5],[6,5],[6,6],[5,5]]]]});
  assert.equal(repairs.length,1);
  assert.deepEqual(geometry.coordinates[0],[square]);
  assert.deepEqual(repairBoundary({type:'Polygon',coordinates:[square]}).repairs,[]);
  assert.match(REPAIR_RULE,/same point as the vertex before it/);
});
