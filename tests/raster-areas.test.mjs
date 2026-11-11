import test from 'node:test';
import assert from 'node:assert/strict';
import {totalOver,areaTotals} from '../build/raster-areas.js';
import {outputOf,requiredInputs,validateWorkflow} from '../build/core.js';

// SAMPLE A RASTER OVER AREAS (experiment 205): a 4 x 4 grid of 1-degree cells from (0, 4) to (4, 0), values 1 to 16 by
// row, one cell (row 1, column 1, value 6) marked no data with -9999.
const grid={metadata:{origin:[0,4],resolution:[1,-1],width:4,height:4,noData:-9999,crs:'EPSG:4326'},
  values:[1,2,3,4, 5,-9999,7,8, 9,10,11,12, 13,14,15,16]};
const box=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});

test('an area\'s total is the sum of the cells whose centre is inside it, by hand',()=>{
  // Cells with centres at x 0.5 and 1.5, y 3.5 and 2.5: values 1, 2, 5 and the no-data cell.
  assert.deepEqual(totalOver(box(0,2,2,4),grid),{total:8,cells:3,noData:1,outside:0});
  // The whole grid: 136 less the no-data cell's place, which adds nothing.
  assert.deepEqual(totalOver(box(0,0,4,4),grid),{total:136-6,cells:15,noData:1,outside:0});
});

test('cells of an area beyond the raster\'s window are counted as outside, never as a smaller total',()=>{
  // Half the area lies east of the grid: two cells inside (4 and 8), two beyond.
  assert.deepEqual(totalOver(box(3,2,5,4),grid),{total:12,cells:2,noData:0,outside:2});
});

test('areas come back as polygons carrying their total, cells, no data and outside, and one with no value has no total',()=>{
  const {value,counts}=areaTotals([{id:'a',name:'A',geometry:box(0,2,2,4)},{id:'b',name:'Beyond',geometry:box(10,10,11,11)}],
    grid,{label:'Population',attribute:'population',valueUnit:'people',over:'areas'});
  assert.equal(value.features[0].properties.population,8);
  assert.equal(value.features[0].value,8);
  assert.equal(value.features[1].properties.population,null);
  assert.equal(value.features[1].value,undefined);
  assert.deepEqual(counts,{areas:2,cells:3,noData:1,outside:1,empty:1});
  assert.match(value.method,/each counted whole, not area-weighted/);
  assert.match(value.method,/no data is not zero/);
});

test('one sampler: its output follows its source and places, and a saved satellite sampler opens as it',()=>{
  const n=params=>({id:'s',type:'sample_raster',x:0,y:0,params:{label:'S',attribute:'v',valueUnit:'',...params}});
  assert.equal(outputOf(n({})),'points');
  assert.equal(outputOf(n({over:'areas'})),'polygons');
  assert.equal(outputOf(n({source:'satellite-files'})),'table');
  assert.deepEqual(requiredInputs(n({source:'satellite-files'})).map(([p])=>p),['files']);
  assert.deepEqual(requiredInputs(n({})).map(([p])=>p),['raster']);
  const saved={schema:'fieldwork/workflow/1',name:'old',nodes:[{id:'old',type:'sample_satellite_files_at_points',x:0,y:0,
    params:{label:'Land surface temperature',layer:'day',qualityRule:'good'}}],edges:[]};
  const opened=validateWorkflow(saved);
  const node=opened.nodes[0];
  assert.equal(node.type,'sample_raster');
  assert.equal(node.params.source,'satellite-files');
  assert.equal(node.params.layer,'day');
  assert.equal(node.sourceMigration.fromType,'sample_satellite_files_at_points');
});
