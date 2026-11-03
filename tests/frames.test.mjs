import test from 'node:test';
import assert from 'node:assert/strict';
import {dataTable} from '../build/data-table.js';
import {joinTableToAreas} from '../build/area-join.js';
import {polygonShading,shadedValues} from '../build/presentation.js';

/** A JOIN THAT KEEPS EVERY FRAME, and one set of classes across them. Experiment 168. */
const table=dataTable({headers:['ID','measure','v'],rows:[
  ['A','dtp1_2005','0.2'],['A','dtp1_2024','0.9'],['B','dtp1_2005','0.4'],['B','dtp1_2024','0.6'],['C','dtp1_2005','0.1']]},
  {keys:['ID','measure'],valueField:'v'});
const units=[{id:'1',name:'A'},{id:'2',name:'B'},{id:'3',name:'C'}];

test('each part carries one value per frame, the last frame is its value, and a missing frame is null',()=>{
  const joined=joinTableToAreas(units,table,{keyField:'ID',normalisation:'exact',frameField:'measure'});
  assert.deepEqual(joined.frames,['dtp1_2005','dtp1_2024']);
  assert.deepEqual(joined.parts[0].frames,{dtp1_2005:0.2,dtp1_2024:0.9});
  assert.equal(joined.parts[0].value,0.9);
  assert.deepEqual(joined.parts[2].frames,{dtp1_2005:0.1,dtp1_2024:null});
  assert.equal(joined.parts[2].value,null);
  assert.ok(!joined.diagnostics.some(d=>d.code==='multiple-data-rows'),'a key repeated across frames is not a repeat');
});

test('without frames, the same table is a repeat, as before',()=>{
  const joined=joinTableToAreas(units,table,{keyField:'ID',normalisation:'exact'});
  assert.ok(joined.diagnostics.some(d=>d.code==='multiple-data-rows'));
});

test('a framed layer is classed over every frame, so every frame shares one key',()=>{
  const features=[{value:0.9,frames:{a:0.2,b:0.9}},{value:0.6,frames:{a:0.4,b:0.6}},{value:null,frames:{a:0.1,b:null}}];
  assert.deepEqual(shadedValues(features),[0.2,0.9,0.4,0.6,0.1]);
  const {classed}=polygonShading(features);
  assert.ok(classed);
  assert.equal(classed.classOf(0.1),0,'the lowest value in any frame is in the first class');
  assert.equal(classed.classOf(0.9),classed.classes-1);
});
