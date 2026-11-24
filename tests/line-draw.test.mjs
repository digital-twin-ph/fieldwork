import test from 'node:test';
import assert from 'node:assert/strict';
import {addVertex,finishLine,reverseLine,endsOf,drawnLayer,linesFromLayer,nextLineName,
  LINE_MINIMUM,DRAWN_LINE_LIMIT} from '../build/line-draw.js';

/** ROUTES AND FLOWS DRAWN ON A MAP (2026-11-24). The practitioner: "Pushpins are points, Routes and flows are
 *  lines." The symmetry settles the design; the one thing that is new is direction, and these check it. */

test('a line is the order it was clicked in, and a repeated click is one place',()=>{
  let v=[];
  for(const at of [[29,3],[30,4],[30,4],[31,5]])v=addVertex(v,at);
  assert.deepEqual(v,[[29,3],[30,4],[31,5]],'the same place twice is one position, not a zero-length segment');
});

test('a line of one position is refused, and says how to continue it',()=>{
  const out=finishLine([],[[29,3]]);
  assert.ok('refused' in out);
  assert.match(out.refused,new RegExp(`needs ${LINE_MINIMUM} positions`));
  assert.match(out.refused,/Click the map again/);
});

test('a finished line is named, and names never collide',()=>{
  let lines=[];
  for(let i=0;i<3;i++){const out=finishLine(lines,[[i,0],[i+1,1]]);assert.ok('lines' in out);lines=out.lines;}
  assert.deepEqual(lines.map(l=>l.name),['Route 1','Route 2','Route 3']);
  const named=finishLine(lines,[[9,9],[8,8]],'Team 1, day 1');
  assert.ok('lines' in named);
  assert.equal(named.lines[3].name,'Team 1, day 1','a name given is kept');
  // A stem already taken is skipped rather than repeated.
  assert.equal(nextLineName([{id:'a',name:'Route 1',vertices:[]}]),'Route 2');
});

test('DIRECTION IS THE ORDER, and reversing it is the whole of changing it',()=>{
  const line={id:'f1',name:'Referrals',vertices:[[29,3],[30,4],[31,5]]};
  assert.deepEqual(endsOf(line),{from:[29,3],to:[31,5]});
  const back=reverseLine(line);
  assert.deepEqual(endsOf(back),{from:[31,5],to:[29,3]},'a flow drawn the wrong way is turned, not drawn again');
  assert.deepEqual(line.vertices,[[29,3],[30,4],[31,5]],'and the original is untouched');
  // A flow A->B must not be the same thing as B->A: that is why the order is carried at all.
  assert.notDeepEqual(drawnLayer([line]).features[0].geometry.coordinates,
    drawnLayer([back]).features[0].geometry.coordinates);
});

test('the layer says the lines were drawn, not read',()=>{
  const layer=drawnLayer([{id:'f1',name:'Team route',vertices:[[29,3],[30,4]]}]);
  assert.equal(layer.kind,'lines');
  assert.equal(layer.source,'drawn','a reader must be able to tell an observation from a published file');
  assert.equal(layer.features[0].properties.name,'Team route');
  assert.equal(layer.features[0].geometry.type,'LineString');
});

test('a half-drawn line is not in the layer, and a drawn layer reopens for more',()=>{
  const layer=drawnLayer([{id:'a',name:'Done',vertices:[[1,1],[2,2]]},{id:'b',name:'Half',vertices:[[3,3]]}]);
  assert.equal(layer.features.length,1,'one position is not a line');
  const back=linesFromLayer(layer);
  assert.deepEqual(back.map(l=>l.name),['Done']);
  assert.deepEqual(back[0].vertices,[[1,1],[2,2]],'so a saved layer can be added to rather than started again');
});

test('drawing one by one stops where it stops being the right instrument',()=>{
  const many=Array.from({length:DRAWN_LINE_LIMIT},(_,i)=>({id:`l${i}`,name:`Route ${i+1}`,vertices:[[i,0],[i,1]]}));
  const out=finishLine(many,[[0,0],[1,1]]);
  assert.ok('refused' in out);
  assert.match(out.refused,new RegExp(String(DRAWN_LINE_LIMIT)));
  assert.match(out.refused,/Read the rest from a file/);
});
