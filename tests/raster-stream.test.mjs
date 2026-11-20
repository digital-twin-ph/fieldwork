import test from 'node:test';
import assert from 'node:assert/strict';
import {streamedTotals} from '../build/raster-stream.js';
import {totalOver} from '../build/raster-areas.js';

// A raster of 57 by 43 cells read through a window from its fourth column and third row, with no data (-9999), many
// zeros, and a run of one value; four areas: plain, two parts with a hole, one reaching past the window, one flat.
const W=57,H=43,full={origin:[10,5],resolution:[0.1,-0.1],noData:-9999};
const win=[3,2,3+W,2+H];
const values=new Float64Array(W*H).map((_,i)=>i%11===0?0:i%37===0?-9999:((i*7919)%101)/4);
for(let r=30;r<40;r++)for(let c=40;c<50;c++)values[r*W+c]=7;
const grid={metadata:{origin:[10+3*0.1,5-2*0.1],resolution:[0.1,-0.1],width:W,height:H,noData:-9999},values};
const lon=c=>grid.metadata.origin[0]+c*0.1,lat=r=>grid.metadata.origin[1]-r*0.1;
const box=(c0,r0,c1,r1)=>[[lon(c0),lat(r0)],[lon(c1),lat(r0)],[lon(c1),lat(r1)],[lon(c0),lat(r1)],[lon(c0),lat(r0)]];
const areas=[
  {type:'Polygon',coordinates:[box(2.3,1.7,20.6,15.2)]},
  {type:'MultiPolygon',coordinates:[[box(25,3,50,25),box(30,8,36,14).reverse()],[[[lon(5),lat(20)],[lon(18),lat(24)],[lon(9),lat(38.5)],[lon(5),lat(20)]]]]},
  {type:'Polygon',coordinates:[[[lon(-6),lat(-4)],[lon(12),lat(5)],[lon(4),lat(50)],[lon(-3),lat(46)],[lon(-6),lat(-4)]]]},
  {type:'Polygon',coordinates:[box(40,30,50,40)]},
];
const read=async([x0,y0,x1,y1])=>{const out=new Float64Array((x1-x0)*(y1-y0));
  for(let r=y0;r<y1;r++)for(let c=x0;c<x1;c++)out[(r-y0)*(x1-x0)+(c-x0)]=values[(r-2)*W+(c-3)];return out;};
const median=v=>{const s=Float64Array.from(v).sort(),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):null;};

for(const [label,options] of [['strips of 5 rows',{stripBytes:5*W*8}],['one strip',{}],['a small histogram and collection, so the median takes several rounds',{stripBytes:7*W*8,bins:8,collect:12}]])
  test(`streamed totals equal the totals held in memory: ${label}`,async()=>{
    const got=await streamedTotals(areas,full,win,read,{median:true,...options});
    areas.forEach((geometry,a)=>{
      const want=totalOver(geometry,grid,true);
      for(const key of ['total','cells','noData','outside','min','max','populated'])assert.equal(got[a][key],want[key],`area ${a}: ${key}`);
      assert.ok(Math.abs(got[a].squares-want.squares)<=1e-9*Math.max(1,want.squares),`area ${a}: squares`);
      assert.equal(got[a].median,median(want.values),`area ${a}: median`);
    });
    assert.ok(got[2].outside>0,'the area past the window has cells outside');
    assert.equal(got[3].median,7);
  });

// THE STREAMED PATH ON A REAL GEOTIFF, read by terrio: the reduced copy, the area totals and the points.
import {writeGeoTiff,inspectRaster,reduceWindow,readRasterWindow} from '../build/raster.js';
import {sessionFiles} from '../build/raster-workflow.js';
import {areaTotals,streamedAreaTotals} from '../build/raster-areas.js';
import {streamedAtPoints} from '../build/core.js';
import {sampleRaster} from '../build/sample-raster.js';

const TW=63,TH=47,cells=new Float32Array(TW*TH).map((_,i)=>i%13===0?0:i%29===0?NaN:((i*31)%17)/2);
const tiff=new File([writeGeoTiff(cells,TW,TH,[20,-2],[0.01,-0.01],'test')],'stream-test.tif');
const tiffWindow=[2,3,61,44];

test('a window reduced in blocks: each block the sum or the mean of its cells with a value',async()=>{
  const m=await inspectRaster(tiff);
  for(const how of ['sum','mean']){
    const r=await reduceWindow(tiff,m,tiffWindow,4,how);
    const w=tiffWindow[2]-tiffWindow[0],h=tiffWindow[3]-tiffWindow[1];
    assert.equal(r.metadata.width,Math.ceil(w/4));assert.equal(r.metadata.height,Math.ceil(h/4));
    assert.deepEqual(r.metadata.resolution,[0.04,-0.04]);
    for(const [br,bc] of [[0,0],[3,5],[r.metadata.height-1,r.metadata.width-1]]){
      let s=0,n=0;
      for(let y=br*4;y<Math.min(h,br*4+4);y++)for(let x=bc*4;x<Math.min(w,bc*4+4);x++){
        const v=cells[(y+tiffWindow[1])*TW+(x+tiffWindow[0])];if(Number.isFinite(v)){s+=v;n++;}}
      const got=r.values[br*r.metadata.width+bc];
      if(!n)assert.ok(Number.isNaN(got));else assert.ok(Math.abs(got-(how==='sum'?s:s/n))<1e-4,`${how} block ${br},${bc}`);
    }
  }
});

test('a streamed raster totalled over areas and read at points gives what the whole window gives',async()=>{
  const m=await inspectRaster(tiff),sha='a'.repeat(64);sessionFiles.set(sha,tiff);
  const full=await readRasterWindow(tiff,m,tiffWindow);
  const reduced=await reduceWindow(tiff,m,tiffWindow,4,'sum');
  const asset={streamed:{factor:4,how:'sum'},window:tiffWindow,source:{filename:'stream-test.tif',bytes:tiff.size,lastModified:0,metadata:m,sha256:sha}};
  const streamed={metadata:reduced.metadata,values:reduced.values,asset};
  const at=(c,r)=>[full.metadata.origin[0]+c*0.01,full.metadata.origin[1]-r*0.01];
  const ring=(c0,r0,c1,r1)=>[at(c0,r0),at(c1,r0),at(c1,r1),at(c0,r1),at(c0,r0)];
  const features=[{id:'a',name:'A',geometry:{type:'Polygon',coordinates:[ring(1.5,2.2,30.7,20.1)]}},
    {id:'b',name:'B',geometry:{type:'Polygon',coordinates:[ring(-4,10,70,52)]}}];
  const params={label:'t',over:'areas',cellStatistics:true};
  const want=areaTotals(features,{...full,asset:{}},params),got=await streamedAreaTotals(features,streamed,params);
  assert.equal(got.sentence,want.sentence);
  got.value.features.forEach((f,i)=>{for(const [k,v] of Object.entries(want.value.features[i].properties)){
    if(typeof v==='number'&&!Number.isInteger(v))assert.ok(Math.abs(f.properties[k]-v)<=1e-9*Math.max(1,Math.abs(v)),`${f.id} ${k}`);
    else assert.equal(f.properties[k],v,`${f.id} ${k}`);}});
  const points={type:'FeatureCollection',features:[[3,4],[10.5,9.5],[40,30],[80,80]].map(([c,r],i)=>({type:'Feature',id:`p${i}`,properties:{name:`p${i}`},
    geometry:{type:'Point',coordinates:at(c,r)}}))};
  const pointParams={label:'s',attribute:'value'};
  const wantAt=sampleRaster(points,{...full,asset:{}},pointParams),gotAt=sampleRaster(points,await streamedAtPoints(points,streamed),pointParams);
  assert.deepEqual(gotAt.value.features.map(f=>f.properties.value),wantAt.value.features.map(f=>f.properties.value));
});
