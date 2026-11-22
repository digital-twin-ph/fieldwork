import test from 'node:test';
import assert from 'node:assert/strict';
import {densityKernel,densityAgreement} from '../build/density.js';

/** THE KERNEL'S DENSITY SURFACE (experiment 225's spike): the reference the WebGPU path is held to. */
test('one point spreads its weight over the cells within the bandwidth, peaked at the point, and sums to its weight',()=>{
  const grid=densityKernel({width:200,height:200,bandwidth:20,points:new Float64Array([100,100,2])});
  const total=grid.reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(total-2)<0.01,`total ${total}`);
  assert.equal(grid[0],0,'beyond the bandwidth, nothing');
  assert.ok(grid[99*200+99]>grid[99*200+80]);
});
test('a point just outside the grid still adds to its edge cells; an unreadable one adds nothing',()=>{
  const grid=densityKernel({width:50,height:50,bandwidth:10,points:new Float64Array([-3,25,1,NaN,25,1])});
  assert.ok(grid[25*50]>0);
  assert.throws(()=>densityKernel({width:10,height:10,bandwidth:0,points:new Float64Array([5,5,1])}),/bandwidth must be above 0/);
});
test('agreement is measured against the largest cell',()=>{
  assert.deepEqual(densityAgreement(new Float64Array([0,2,4]),new Float32Array([0,2,4.5])),{maxRelative:0.125,peak:4});
});
