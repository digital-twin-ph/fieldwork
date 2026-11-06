import test from 'node:test';
import assert from 'node:assert/strict';
import {sinusoidal,projectBoundary,cellsIn,modisPasses,sumWindow,addSums,emptySums,bitsSet,MODIS_SPHERE}
  from '../build/satellite-areas.js';

/** SATELLITE FILES OVER AREAS (experiment 180): the projection, which cells count, the MODIS quality rules, clear days
 *  as bits, and sums that add across tiles. Expected values are worked by hand, not taken from the code. */

test('the MODIS sinusoidal projection: x scales with the cosine of latitude, y does not',()=>{
  const [x,y]=sinusoidal(-43,-22.9);
  assert.ok(Math.abs(x-MODIS_SPHERE*(-43*Math.PI/180)*Math.cos(-22.9*Math.PI/180))<1e-6);
  assert.ok(Math.abs(y-MODIS_SPHERE*(-22.9*Math.PI/180))<1e-6);
  assert.deepEqual(sinusoidal(0,0),[0,0]);
});

test('a cell counts when its centre is inside the area, not when the area merely touches it',()=>{
  // A 4 x 4 grid of unit cells from (0,4) down to (4,0), and an area covering cells (0,0), (1,0) and half of (2,0).
  const grid={origin:[0,4],resolution:[1,-1],width:4,height:4};
  const area={type:'Polygon',coordinates:[[[0,3],[2.4,3],[2.4,4],[0,4],[0,3]]]};
  const got=cellsIn(area,grid);
  assert.deepEqual(got.window,[0,0,3,1]);
  // The third cell's centre (2.5, 3.5) is outside: half a cell touched is not a cell.
  assert.deepEqual([...got.mask],[1,1,0]);
  // An area off the grid has no window at all, which the caller reports as a gap.
  assert.equal(cellsIn({type:'Polygon',coordinates:[[[9,9],[10,9],[10,10],[9,10],[9,9]]]},grid),null);
});

test('projecting densifies, so a long edge in degrees follows the projection',()=>{
  const b=projectBoundary({type:'Polygon',coordinates:[[[-44,-23],[-43,-23],[-43,-22],[-44,-22],[-44,-23]]]},
    (x,y)=>sinusoidal(x,y),0.25);
  assert.equal(b.coordinates[0].length,17);
});

test('the three quality rules read the bits the practitioner chose them by',()=>{
  // bits 0-1 mandatory QA, bits 6-7 average LST error.
  const qc=(mandatory,error)=>mandatory|(error<<6);
  assert.equal(modisPasses(qc(0,0),'good'),true);
  assert.equal(modisPasses(qc(1,0),'good'),false);
  assert.equal(modisPasses(qc(1,1),'produced-2k'),true);
  assert.equal(modisPasses(qc(1,2),'produced-2k'),false);
  assert.equal(modisPasses(qc(1,3),'produced'),true);
  // Not produced, for cloud or otherwise, never passes.
  for(const rule of ['good','produced-2k','produced'])for(const m of [2,3])assert.equal(modisPasses(qc(m,0),rule),false);
});

test('clear days are bits: 121 is five days, not 121',()=>{
  assert.equal(bitsSet(121),5);
  assert.equal(bitsSet(0),0);
  assert.equal(bitsSet(255),8);
});

test('sums keep every count, and two tiles add before anything is divided',()=>{
  const mask=Uint8Array.from([1,1,1,0]);
  // Cell 0 passes; cell 1 has the fill; cell 2 has a value its QC fails; cell 3 is outside.
  const a=sumWindow(mask,[15000,0,15500,99],[0,0,2,0],[3,0,7,0],0,q=>modisPasses(q,'produced'));
  assert.deepEqual(a,{cells:3,withValue:2,passing:1,sum:15000,min:15000,max:15000,clearSum:2,clearCells:1});
  const b=sumWindow(Uint8Array.from([1]),[16000],[0],[255],0,()=>true);
  const both=addSums(a,b);
  assert.deepEqual([both.cells,both.passing,both.sum,both.min,both.max,both.clearSum],[4,2,31000,15000,16000,10]);
  assert.deepEqual(addSums(emptySums(),emptySums()).min,null);
});
