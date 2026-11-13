import test from 'node:test';
import assert from 'node:assert/strict';
import {centreRuns,totalOver} from '../build/raster-areas.js';
import {rasterCellPredicate} from '../build/raster-mask.js';

// THE SCANLINE GIVES THE CELLS THE PREDICATE GIVES (2026-11-13). The predicate tested every cell of an area's box against
// every vertex and did not finish Botswana's districts over WorldPop; the scanline must not change which cells count.
const rand=(seed=>()=>((seed=Math.imul(seed^seed>>>15,2246822507)+0x6d2b79f5|0)>>>0)/2**32)(20261113);
const blob=(cx,cy,r,n)=>{const ring=[];for(let i=0;i<n;i++){const a=2*Math.PI*i/n,k=r*(0.5+0.5*rand());ring.push([cx+k*Math.cos(a),cy+k*Math.sin(a)]);}
  ring.push(ring[0]);return ring;};
const origin=[120,15],resolution=[0.01,-0.01];
const same=geometry=>{
  const inside=rasterCellPredicate(geometry,origin,resolution,{method:'cell-center',marginPixels:0});
  const r0=0,r1=120,runs=centreRuns(geometry,origin,resolution,r0,r1);
  const scan=new Set(),pred=new Set();
  for(let r=r0;r<r1;r++){for(const [a,b] of runs[r])for(let c=a;c<=b;c++)scan.add(`${c},${r}`);
    for(let c=-5;c<125;c++)if(inside(c,r))pred.add(`${c},${r}`);}
  return {scan,pred};
};
test('the same cells as the cell-centre predicate, for outlines with holes and parts',()=>{
  for(let k=0;k<25;k++){
    const outer=blob(120.6,14.4,0.4,30+Math.floor(rand()*60)),hole=blob(120.6,14.4,0.08,12).reverse();
    const geometry=k%3===0?{type:'MultiPolygon',coordinates:[[outer,hole],[blob(120.15,14.85,0.1,9)]]}:{type:'Polygon',coordinates:k%2?[outer,hole]:[outer]};
    const {scan,pred}=same(geometry);
    assert.deepEqual([...scan].filter(x=>!pred.has(x)),[],`outline ${k}: cells only the scanline counts`);
    assert.deepEqual([...pred].filter(x=>!scan.has(x)),[],`outline ${k}: cells only the predicate counts`);
    assert.ok(scan.size>100);
  }
});
test('a centre on the outline is decided as the predicate decides it, rounding and all',()=>{
  // A square whose west and east edges are meant to run through cell centres. In degrees they land a hair off the centre,
  // and both methods leave those cells out: the scanline keeps the predicate's answer, which the Lab holds against rasterio.
  const x=c=>origin[0]+c*resolution[0],y=r=>origin[1]+r*resolution[1];
  const sq={type:'Polygon',coordinates:[[[x(2.5),y(1)],[x(6.5),y(1)],[x(6.5),y(4)],[x(2.5),y(4)],[x(2.5),y(1)]]]};
  const {scan,pred}=same(sq);assert.deepEqual([...scan].sort(),[...pred].sort(),'and the predicate agrees');
  const grid={metadata:{origin,resolution,width:10,height:10,noData:null},values:Array(100).fill(1)};
  assert.equal(totalOver(sq,grid).cells,pred.size);
});

test('the totals name what their shade is, for the map\'s key',async()=>{
  const {areaTotals}=await import('../build/raster-areas.js');
  const grid={metadata:{origin,resolution,width:10,height:10,noData:null,crs:'EPSG:4326'},values:Array(100).fill(2)};
  const sq={type:'Polygon',coordinates:[[[120.0,15.0],[120.05,15.0],[120.05,14.95],[120.0,14.95],[120.0,15.0]]]};
  const t=areaTotals([{id:'a',name:'A',geometry:sq}],grid,{attribute:'population',valueUnit:'people per pixel',over:'areas'});
  assert.equal(t.value.valueName,'population, people per pixel');
  assert.equal(t.value.features[0].properties.population,50);
});
