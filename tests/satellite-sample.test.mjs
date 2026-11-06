import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {nearestInTile,inTileExtent,tileRowOrder,FILL} from '../build/satellite-pixels.js';
import {readAtPoints} from '../build/satellite-read.js';
import {classify,rawThreshold,days,sampleTable,sampleSentence,sampleFacts,readerFor} from '../build/satellite-sample.js';
import {defaultKept,overpassCount} from '../build/satellite-catalog.js';
import {productFor} from '../build/satellite-products.js';

/** SAMPLE SATELLITE FILES AT POINTS (experiment 179): the pixel containing a point, the three gaps, the quality rule on
 *  the stored integer, and one overpass never counted twice. */

const product=productFor('no2','pc-s5p-no2');
const reader=readerFor(product);

test('the NO2 product has a reader, read from the file; the other routes do not, and say nothing',()=>{
  assert.equal(reader.variable,'PRODUCT/nitrogendioxide_tropospheric_column');
  assert.equal(reader.quality.threshold,0.75);
  assert.deepEqual(reader.quality.operators,{readme:'>',manual:'>='});
  assert.equal(readerFor(productFor('ozone','pc-s5p-o3')),null);
});

test('the pixel whose centre is nearest, found tile by tile; a point far from every centre is off the swath',()=>{
  // Two tiles of a 2 x 4 swath of unit pixels, centres at half-integers, as a file's chunks would hold them.
  const tile=(c0)=>{const lats=[],lons=[];for(let r=0;r<2;r++)for(let c=c0;c<c0+2;c++){lats.push(r+0.5);lons.push(c+0.5);}
    return {r0:0,c0,rows:2,cols:2,lats,lons};};
  const left=tile(0),right=tile(2);
  const n=nearestInTile(1.9,0.4,left);
  assert.deepEqual([n.row,n.col],[0,1]);assert.ok(Math.abs(n.distance-Math.hypot(0.4*Math.cos(0.4*Math.PI/180),0.1))<1e-12);
  assert.equal(inTileExtent(3.2,1.2,left),false);
  assert.equal(inTileExtent(3.2,1.2,right),true);
  assert.deepEqual([nearestInTile(3.2,1.2,right).row,nearestInTile(3.2,1.2,right).col],[1,3]);
  // A fill-valued centre is never the nearest.
  left.lats[0]=FILL;left.lons[0]=FILL;
  assert.notDeepEqual([nearestInTile(0.4,0.4,left).row,nearestInTile(0.4,0.4,left).col],[0,0]);
  // Northern points look in the later scanlines first; every row of chunks is still in the order.
  assert.deepEqual(tileRowOrder(2,40.7),[1,0]);assert.deepEqual(tileRowOrder(3,-1),[0,1,2]);
});

test('a point near a chunk edge is read from the nearest centre across the edge, not the nearest in its own chunk',()=>{
  // A 2 x 4 swath of unit pixels in two column chunks, as an in-memory file. Found by the lab's check 35, 2026-11-05: a
  // point 0.52 of the way from column 1 to column 2 was placed on column 1, the nearest in the first chunk read.
  const rows=2,cols=4,chunks=[1,2,2];
  const grid=f=>Float32Array.from({length:rows*cols},(_,i)=>f(Math.floor(i/cols),i%cols));
  const dataset=(values,chunked=true)=>({shape:[1,rows,cols],metadata:{chunks:chunked?chunks:null},attrs:{},
    slice:([[,],[r0,r1],[c0,c1]])=>{const out=[];for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++)out.push(values[r*cols+c]);return out;}});
  const qa=dataset(grid(()=>100));qa.attrs.scale_factor={value:[0.01]};
  const files={lat:dataset(grid(r=>40+r)),lon:dataset(grid((r,c)=>c)),no2:dataset(grid((r,c)=>c+1)),qa,
    time:{shape:[1,rows],metadata:{},attrs:{},slice:([,[r0]])=>[`t${r0}`]}};
  const file={get:path=>files[path]??null};
  const paths={variable:'no2',latitude:'lat',longitude:'lon',time:'time',quality:{variable:'qa'}};
  const read=readAtPoints(file,paths,[{id:'edge',lon:1.52,lat:40},{id:'inside',lon:0.1,lat:41},{id:'off',lon:9,lat:40}]);
  assert.deepEqual(read.pixels.map(p=>[p.pointId,p.row,p.col]),[['edge',0,2],['inside',1,0],['off',null,null]]);
  // Both chunks were read: the edge point's first answer was provisional.
  assert.equal(read.tilesRead,2);
});

test('three gaps, kept apart; the quality rule compares the stored integer, so 75 passes at or above 0.75',()=>{
  assert.equal(rawThreshold(0.75,0.009999999776482582),75);
  // The trap the integer avoids: the scale factor is stored in 32 bits as 0.0099999998, so 75 times it is 0.74999998.
  assert.ok(75*0.009999999776482582<0.75);
  const at=(over)=>({pointId:'p',row:1,col:1,value:3e-5,qaRaw:75,time:null,...over});
  assert.deepEqual(classify(at({}),75,'>='),{gap:null,passes:true});
  assert.deepEqual(classify(at({}),75,'>'),{gap:'below quality threshold',passes:false});
  assert.deepEqual(classify(at({qaRaw:74}),75,'>='),{gap:'below quality threshold',passes:false});
  assert.deepEqual(classify(at({value:null}),75,'>='),{gap:'no retrieval',passes:null});
  assert.deepEqual(classify(at({qaRaw:255}),75,'>='),{gap:'no retrieval',passes:null});
  assert.deepEqual(classify(at({row:null}),75,'>='),{gap:'no overpass',passes:null});
});

const pts=[{id:'a',name:'Queens College',lon:-73.82,lat:40.73},{id:'b',name:'IS 52',lon:-73.90,lat:40.82}];
const reading=(over)=>({itemId:'i',href:'h',stream:'OFFL',orbit:29273,datetime:'2023-06-07T17:19:31Z',units:'mol m-2',qaScale:0.01,
  requests:8,bytes:6_580_000,pixels:[{pointId:'a',row:10,col:20,value:4e-5,qaRaw:100,time:'2023-06-07T17:26:31Z'},
    {pointId:'b',row:11,col:20,value:5e-5,qaRaw:74,time:'2023-06-07T17:26:32Z'}],...over});

test('the long table: a row per point per overpass, a row per point per day without one, a value only where it passed',()=>{
  const {table,counts}=sampleTable(pts,[reading({})],'2023-06-06','2023-06-07',reader,'>=');
  assert.equal(table.rows.length,4);
  assert.equal(counts.noOverpass,2);assert.equal(counts.passing,1);assert.equal(counts.belowQuality,1);
  const b=table.rows.find(r=>r.key.point_id==='b'&&r.key.date==='2023-06-07');
  assert.equal(b.value,null);assert.equal(b.key.value_as_read,'0.00005');assert.equal(b.key.qa_value,'0.74');
  assert.equal(b.key.gap,'below quality threshold');assert.equal(b.key.passes_quality,'no');
  assert.equal(table.valueField,'nitrogendioxide_tropospheric_column');assert.equal(table.unit,'mol m-2');
  assert.equal(table.findings,undefined);
  assert.equal(b.key.measure,'nitrogendioxide_tropospheric_column');
  assert.match(sampleSentence(counts,reader,'>=',product),/^Read 1 file of .* at 2 points over 2 days: 4 rows.*1 row hold a value passing qa_value >= 0\.75; 1 below it, 0 with no retrieval, 2 with no overpass\..*Nothing was filled\. 6\.6 MB in 8 requests\.$/);
  // The live run: the storage hides sizes from the page, so the browser reports 0 bytes. Said as not visible.
  const hidden=sampleTable(pts,[reading({bytes:null,requests:15})],'2023-06-07','2023-06-07',reader,'>=').counts;
  assert.match(sampleSentence(hidden,reader,'>=',product),/15 requests; the storage does not let the browser see their size\.$/);
});

test('one orbit in two streams is one overpass: not kept twice by default, and a finding if read twice',()=>{
  const items=[{id:'nrti',stream:'NRTI',orbit:29273},{id:'offl',stream:'OFFL',orbit:29273},{id:'x',stream:null,orbit:null}];
  assert.deepEqual(defaultKept(items),['offl','x']);
  assert.equal(overpassCount(items),2);
  const {table}=sampleTable(pts,[reading({}),reading({stream:'NRTI',itemId:'n'})],'2023-06-07','2023-06-07',reader,'>=');
  assert.equal(table.findings.length,2);
  assert.match(table.findings[0].text,/One orbit is one overpass/);
});

test('the receipt reads completeness, never fills, states the operator, and conforms',async()=>{
  const {counts}=sampleTable(pts,[reading({})],'2023-06-07','2023-06-07',reader,'>');
  const facts=sampleFacts('<urn:fieldwork:run:r:output:s>',counts,reader,'>',product,'mol m-2');
  const conforms=async f=>(await validateGraph(new Store(new Parser().parse(f)))).conforms;
  assert.equal(await conforms(facts),true);
  assert.equal(await conforms(facts.replace('fw:imputed false','fw:imputed true')),false);
  assert.equal(await conforms(facts.replace('fw:completenessRead true','fw:completenessRead false')),false);
  assert.equal(await conforms(facts.replace('fw:qualityOperator ">"','fw:qualityOperator "about"')),false);
});

test('days are UTC calendar days, inclusive',()=>{
  assert.deepEqual(days('2023-06-29','2023-07-01'),['2023-06-29','2023-06-30','2023-07-01']);
});

test('the id column takes the name the points\' source table gave it, so the result relates back on it',()=>{
  const {table}=sampleTable(pts,[reading({})],'2023-06-07','2023-06-07',reader,'>=',0,'site');
  assert.equal(table.keys[0],'site');assert.ok(!table.keys.includes('point_id'));
  assert.deepEqual(table.rows.map(r=>r.key.site),['a','b']);
  assert.deepEqual(table.primaryKey,['site','date','overpass_time','stream']);
  // A name that would collide with a column the sampler writes keeps point_id.
  assert.equal(sampleTable(pts,[reading({})],'2023-06-07','2023-06-07',reader,'>=',0,'date').table.keys[0],'point_id');
});
