import test from 'node:test';
import assert from 'node:assert/strict';
import {drawnDensity,pooledBreaks,classOfDensity,rasterPort,isRasterPort} from '../build/raster-panels.js';

/** GRID CELLS IN PANELS (experiment 212): people per km² of each cell's own area, drawn at most so many cells a side,
 *  and one set of classes over every panel. */
const grid=(values,width,height,res=0.001,origin=[30,-2])=>({metadata:{crs:'EPSG:4326',origin,resolution:[res,-res],width,height,noData:-99999},values:Float32Array.from(values)});

test('a cell’s density is its people over its area on the sphere, near 1 km² for a 0.009° cell at the equator',()=>{
  const d=drawnDensity(grid([100],1,1,0.009,[30,0.0045]),'one');
  assert.ok(Math.abs(d.density[0]-100/(1.0008**2))<1,`about 100 per km², got ${d.density[0]}`);
});

test('drawn cells aggregate people over area, and no data adds nothing',()=>{
  const d=drawnDensity(grid([10,30,NaN,-99999],2,2),'agg',1);
  assert.equal(d.width,1);assert.equal(d.factor,2);
  const one=drawnDensity(grid([10,30],2,1),'two',1).density[0];
  // The two cells with a value, over their area: the NaN and no-data cells neither add people nor area.
  assert.ok(Math.abs(d.density[0]-one)<1e-3);
});

test('one set of classes over every panel: a value is in the same class whichever panel it is in',()=>{
  const a=drawnDensity(grid([0,1,2,3,4,5],6,1),'A'),b=drawnDensity(grid([6,7,8,9,10,11],6,1),'B');
  const breaks=pooledBreaks([a,b]);
  assert.equal(breaks.length,5);
  assert.equal(classOfDensity(a.density[1],breaks),0,'the smallest above zero is in the lowest class');
  assert.equal(classOfDensity(b.density[5],breaks),5,'the largest in the highest');
  assert.equal(classOfDensity(a.density[0],breaks),-1,'zero is no one modelled, drawn clear');
});

test('the raster ports follow the polygon convention, four at most',()=>{
  assert.equal(rasterPort(0),'raster');assert.equal(rasterPort(3),'raster_4');
  assert.ok(isRasterPort('raster_4')&&!isRasterPort('raster_5'));
});

test('only the study area\u2019s cells are counted: a cell whose centre is outside adds nothing',()=>{
  // Two cells; the area covers the western one's centre only.
  const g=grid([100,900],2,1);
  const area={type:'Polygon',coordinates:[[[30,-2.001],[30.0012,-2.001],[30.0012,-2],[30,-2],[30,-2.001]]]};
  const all=drawnDensity(g,'all',1),inArea=drawnDensity({...g,boundary:area},'in',1);
  assert.ok(inArea.density[0]<all.density[0],'the eastern cell is left out');
  assert.ok(inArea.outline?.length===1,'the outline travels with the panel');
});
