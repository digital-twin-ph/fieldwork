import test from 'node:test';
import assert from 'node:assert/strict';
import {reachedStreets} from '../build/network-edges.js';

// A street network is directed, so a street between two reached junctions is offered
// from both ends. What is buffered should be the street, once.
const line=(...xs)=>xs.map(x=>[x,0]);
const sorted=streets=>streets.map(s=>JSON.stringify(s)).sort();

test('a street reached from only one end is returned truncated, unchanged',()=>{
  assert.deepEqual(reachedStreets([{line:line(0,100),fraction:0.4}]),[line(0,40)]);
});

test('a street reached from both ends is returned once',()=>{
  // The same street, offered as its two directed edges, each fully within budget.
  const streets=reachedStreets([
    {line:line(0,50,100),fraction:1},
    {line:[[100,0],[50,0],[0,0]],fraction:1},
  ]);
  assert.equal(streets.length,1);
  assert.deepEqual(streets[0],line(0,50,100));
});

test('two reaches that meet give the whole street, not two overlapping pieces',()=>{
  const streets=reachedStreets([
    {line:line(0,100),fraction:0.7},
    {line:[[100,0],[0,0]],fraction:0.6},
  ]);
  assert.deepEqual(streets,[line(0,100)]);
});

test('two reaches that fall short give the piece entered from each end',()=>{
  const streets=reachedStreets([
    {line:line(0,100),fraction:0.3},
    {line:[[100,0],[0,0]],fraction:0.2},
  ]);
  assert.deepEqual(sorted(streets),sorted([line(0,30),[[100,0],[80,0]]]));
});

test('a reach of nothing is not a street entered',()=>{
  assert.deepEqual(reachedStreets([{line:line(0,100),fraction:0}]),[]);
});

// Pooling by the two junctions rather than by the line would merge these, discarding
// ground a traveller can reach. Soho has six such reverse pairs and three junction
// pairs carrying more than one street.
test('two directions carrying different geometry are both kept',()=>{
  const out=reachedStreets([
    {line:[[0,0],[50,5],[100,0]],fraction:1},
    {line:[[100,0],[50,-5],[0,0]],fraction:1},
  ]);
  assert.equal(out.length,2);
});

test('two different streets between the same pair of junctions are both kept',()=>{
  const out=reachedStreets([
    {line:[[0,0],[50,20],[100,0]],fraction:1},
    {line:[[0,0],[50,-20],[100,0]],fraction:1},
  ]);
  assert.equal(out.length,2);
});

test('the further of two reaches along the same street wins',()=>{
  assert.deepEqual(reachedStreets([
    {line:line(0,100),fraction:0.2},
    {line:line(0,100),fraction:0.45},
  ]),[line(0,45)]);
});

// Both ends at the same point: neither way round is canonical, so it is left alone.
test('a closed loop is returned without being turned',()=>{
  const loop=[[0,0],[10,0],[10,10],[0,0]];
  assert.deepEqual(reachedStreets([{line:loop,fraction:1}]),[loop]);
});
