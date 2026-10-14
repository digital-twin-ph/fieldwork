import test from 'node:test';
import assert from 'node:assert/strict';
import {reachChunks,taperedCorridor,D3_BUCKETS} from '../build/catchments.js';
import {area as turfArea} from '@turf/area';

// The route is cut into pieces carrying the budget left where each ends, so the walk off the
// street at the end of a route -- D3 -- can be the leg the budget still allows rather than a
// constant halo. These replace the pooling tests of the corridor builder this took the place of
// (tests/network-edges.test.mjs, removed 2026-10-14): two-way reaches and duplicate streets are
// now pooled inside taperedCorridor, so they are checked there. Experiment 114.
const line=(...xs)=>xs.map(x=>[x,0]);
const spans=chunks=>chunks.map(c=>[c.line[0][0],c.line.at(-1)[0],Number(c.remainingM.toFixed(2))]);

test('a stretch with budget to spare is one chunk, however long it runs',()=>{
  // 100 m of street with 500 m left: nowhere on it is the leg anything but the full allowance,
  // so there is nothing to subdivide and one buffer call covers it.
  assert.deepEqual(spans(reachChunks(line(0,100),500,25,12.5)),[[0,100,400]]);
});

test('the cut falls exactly where the taper begins',()=>{
  // 40 m left on a 100 m street, tapering from 25: full width for 15 m, then every 12.5 m.
  assert.deepEqual(spans(reachChunks(line(0,100),40,25,12.5)),
    [[0,15,25],[15,27.5,12.5],[27.5,40,0]]);
});

test('walking stops when the budget does, not at the end of the street',()=>{
  const chunks=reachChunks(line(0,1000),40,25,12.5);
  assert.equal(chunks.at(-1).line.at(-1)[0],40,'the last chunk ends at the budget');
  assert.equal(chunks.at(-1).remainingM,0);
});

test('a reach of nothing is no chunk at all',()=>{
  assert.deepEqual(reachChunks(line(0,100),0,25,12.5),[]);
});

test('vertices are kept, so a curved street is not straightened',()=>{
  const bent=[[0,0],[10,0],[10,10]];
  const chunks=reachChunks(bent,500,25,12.5);
  assert.deepEqual(chunks.map(c=>c.line),[bent],'one chunk, every vertex retained');
});

test('a street reached from both ends is buffered once, at the better of the two',()=>{
  // The same stretch arrives twice, once from each direction. Pooling keeps the reach with more
  // budget left -- the wider leg -- and buffers the street once instead of twice.
  const there={line:line(0,100),remainingM:200},back={line:line(100,0),remainingM:40};
  const both=taperedCorridor([there,back],25,p=>p,{point:[0,0],radiusM:25});
  const alone=taperedCorridor([there],25,p=>p,{point:[0,0],radiusM:25});
  assert.equal(Math.round(turfArea(both)),Math.round(turfArea(alone)));
});

test('the radius is quantised downwards, so the catchment is never drawn too large',()=>{
  // A chunk with 24 m left falls into the bucket below 24, not above it.
  const step=25/D3_BUCKETS;
  const narrow=taperedCorridor([{line:line(0,100),remainingM:24}],25,p=>p,{point:[0,0],radiusM:25});
  const exact=taperedCorridor([{line:line(0,100),remainingM:Math.floor(24/step)*step}],25,p=>p,
    {point:[0,0],radiusM:25});
  assert.equal(Math.round(turfArea(narrow)),Math.round(turfArea(exact)));
  const full=taperedCorridor([{line:line(0,100),remainingM:1000}],25,p=>p,{point:[0,0],radiusM:25});
  assert.ok(turfArea(narrow)<turfArea(full),'and less ground than a full-width strip');
});
