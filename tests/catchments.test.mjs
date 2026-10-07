import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {voronoi,clipPolygons,summarizePolygons,isochrone,metric,validateNetwork} from '../build/catchments.js';
import {johnSnowExample} from '../build/john-snow.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {syncProjectManifest} from '../build/project-manifest.js';
import {osmQuery,networkFromOSM,requestOSM} from '../build/street-network.js';
import {bufferedBoundary,bufferArea,dimensionedBox} from '../build/area-buffer.js';
import {geometryBounds} from '../build/study-area.js';
const m=metric(30,'north'),origin=m.forward([-.136,51.513]),coord=(x,y)=>m.inverse([origin[0]+x,origin[1]+y]);
const point=(id,x,y,DEATHS=1)=>({type:'Feature',id,properties:{name:id,DEATHS},geometry:x===null?null:{type:'Point',coordinates:coord(x,y)}});
const collection=(...features)=>({type:'FeatureCollection',features});
const boundary={type:'Polygon',coordinates:[[coord(-100,-100),coord(100,-100),coord(100,100),coord(-100,100),coord(-100,-100)]]};
const ready=async()=>[{subject:'urn:fieldwork:area:study',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];
test('Voronoi handles one/two/collinear sites, rejects duplicates and preserves source identity',()=>{
  for(const pts of [collection(point('a',0,0)),collection(point('a',-50,0),point('b',50,0)),collection(point('a',-50,0),point('b',0,0),point('c',50,0))]){
    const p=clipPolygons(voronoi(pts,boundary,30,'north'),boundary);assert.equal(p.features.length,pts.features.length);
    const summarized=summarizePolygons(p,pts,{boundary:'include',valueField:''});assert.equal(summarized.summary.matched,pts.features.length);assert.equal(summarized.summary.multiple,0);assert.deepEqual(p.features.map(f=>f.siteId),pts.features.map(f=>f.id));
  }
  assert.throws(()=>voronoi(collection(point('a',0,0),point('b',0,0)),boundary,30,'north'),/Coincident/);
  assert.throws(()=>voronoi(collection(point('a',null,0)),boundary,30,'north'),/known locations/);
  assert.throws(()=>voronoi(collection(point('a',0,0)),boundary,35,'north'),/zone/);
});
test('polygon clipping retains holes and count/sum policies report missing and overlapping membership',()=>{
  const square={type:'Polygon',coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[1,2],[2,2],[2,1],[1,1]]]};
  const p={features:[{id:'a',siteId:'a',name:'A',geometry:square}],sites:[],notes:[],method:'fixture',crs:'CRS84'};
  const clipped=clipPolygons(p,square);assert.equal(clipped.features[0].geometry.coordinates[0].length,2);
  const at=(id,c,value)=>({type:'Feature',id,properties:{name:id,n:value},geometry:c?{type:'Point',coordinates:c}:null});
  const points=collection(at('inside',[3,3],4),at('hole',[1.5,1.5],10),at('boundary',[0,2],2),at('unknown',null,5),at('bad-value',[3,2],'4'));
  const summary=summarizePolygons(p,points,{boundary:'include',valueField:'n'});assert.deepEqual(summary.summary,{records:5,matched:3,unmatched:1,missingLocation:1,multiple:0,valueField:'n'});assert.equal(summary.features[0].total,6);assert.equal(summary.features[0].missingValues,1);
  assert.equal(summarizePolygons(p,points,{boundary:'exclude',valueField:'n'}).summary.matched,2);
  const overlap=summarizePolygons({...p,features:[...p.features,{...p.features[0],id:'b'}]},points,{boundary:'include',valueField:''});assert.equal(overlap.summary.multiple,3);
});
const params={label:'test',zone:30,hemisphere:'north',minutes:1,speedMPerMin:50,bufferM:1,maxSnapM:2,direction:'outbound'};
test('isochrone follows curved partial edges and directed inbound/outbound costs',()=>{
  const network={source:'synthetic directed graph',nodes:[{id:'a',coordinates:coord(0,0)},{id:'b',coordinates:coord(50,50)}],edges:[{from:'a',to:'b',lengthM:100,geometry:[coord(0,0),coord(50,0),coord(50,50)]}]};
  const p=isochrone(collection(point('a',0,0)),network,params);
  const r=summarizePolygons(p,collection(point('on',25,0),point('wrong',25,25),point('too-far',50,30)),{boundary:'include',valueField:''});assert.equal(r.features[0].count,1);
  const to=isochrone(collection(point('b',50,50)),network,{...params,direction:'inbound'});assert.equal(summarizePolygons(to,collection(point('on',50,25)),{boundary:'include',valueField:''}).summary.matched,1);
  const from=isochrone(collection(point('b',50,50)),network,params);assert.equal(summarizePolygons(from,collection(point('on',50,25)),{boundary:'include',valueField:''}).summary.matched,0);
  assert.throws(()=>isochrone(collection(point('away',500,500)),network,params),/snap limit/);
  assert.throws(()=>validateNetwork({...network,edges:[{from:'a',to:'unknown',lengthM:1}]}),/endpoints/);
});

test('cumulative thresholds retain identity, reject ambiguous budgets and leave legacy results unchanged',()=>{
  const network={source:'threshold fixture',nodes:[{id:'a',coordinates:coord(0,0)},{id:'b',coordinates:coord(100,0)}],edges:[{from:'a',to:'b',lengthM:100}]};
  const pts=collection(point('a',0,0)),single=isochrone(pts,network,params),multi=isochrone(pts,network,{...params,thresholds:[1,2]});
  assert.deepEqual(multi.features.map(f=>[f.id,f.siteId,f.minutes]),[['a-t1','a',1],['a-t2','a',2]]);
  assert.deepEqual(multi.features[0].geometry,single.features[0].geometry);assert.deepEqual(isochrone(pts,network,{...params,thresholds:[]}),single);
  for(const thresholds of [[2,1],[1,1],[NaN],[0],[61],[1,2,3,4,5,6,7]])assert.throws(()=>isochrone(pts,network,{...params,thresholds}),/threshold/);
  const filled=isochrone(pts,network,{...params,fillHoles:true});assert.ok(filled.features.every(f=>f.geometry.type==='MultiPolygon'&&f.geometry.coordinates.every(p=>p.length===1)));assert.match(filled.notes.join(' '),/unreachable/);
});
test('pinned John Snow examples execute, conserve counts and emit parseable GeoSPARQL and PROV receipts',async()=>{
  for(const kind of ['snow-voronoi','snow-isochrone']){
    const workflow=johnSnowExample(kind);syncProjectManifest(workflow);const result=await executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),ready);
    assert.equal(result.outputs.length,kind==='snow-isochrone'?4:3);const p=result.outputs[0].polygons;
    assert.equal(p.summary.records,250);assert.equal(p.summary.matched+p.summary.unmatched+p.summary.missingLocation,250);
    if(kind==='snow-voronoi'){assert.equal(p.summary.multiple,0);assert.equal(p.features.reduce((s,f)=>s+f.count,0),250);assert.equal(p.features.reduce((s,f)=>s+f.total,0),489);}else{assert.deepEqual(p.features.map(f=>[f.minutes,f.count,f.total]),[[1,48,110],[5,216,433],[10,250,489],[15,250,489]]);assert.equal(p.summary.multiple,250);assert.equal(result.outputs[0].contextPoints.features.length,8);assert.equal(result.outputs.at(-1).polygonPresentation,'interactive');assert.deepEqual(result.outputs[0].polygons,result.outputs.at(-1).polygons);assert.match(result.receipts.find(r=>r.nodeId==='map').facts,/output:context-pumps/);}
    for(const r of result.receipts)new Parser().parse(r.facts);
    assert.ok(result.receipts.some(r=>r.facts.includes('geo:asWKT')));assert.equal(result.receipts.filter(r=>r.kind==='presentation').length,kind==='snow-isochrone'?4:3);
    assert.ok(result.evidence.length>=3);
  }
});
const raw={elements:[{type:'node',id:1,lon:0,lat:1},{type:'node',id:2,lon:.001,lat:1},{type:'node',id:3,lon:.002,lat:1},{type:'way',id:10,nodes:[1,2],tags:{highway:'footway','oneway:foot':'yes'}},{type:'way',id:11,nodes:[2,3],tags:{highway:'residential',oneway:'yes'}}]};
test('OSM walking graph respects explicit foot direction and restrictions, retains shared OSM identity',()=>{
  const n=networkFromOSM(raw);assert.equal(n.nodes.length,3);assert.equal(n.edges.length,3);assert.ok(n.edges.every(e=>e.lengthM>100));
  assert.equal(networkFromOSM({...raw,elements:[...raw.elements,{type:'way',id:12,nodes:[1,3],tags:{highway:'footway',access:'private'}}]}).edges.length,3);
  assert.throws(()=>networkFromOSM({...raw,remark:'runtime error'}),/incomplete/);
  assert.throws(()=>networkFromOSM({elements:[{type:'way',nodes:[1,2],tags:{highway:'path'}}]}),/missing nodes/);
});
test('OSM query scopes acquisition with margin and rejects oversized bounds',()=>{
  const q=osmQuery(boundary,250);assert.match(q.query,/\[timeout:25\]/);assert.ok(q.bounds[0]<boundary.coordinates[0][0][0]);assert.throws(()=>osmQuery(boundary,2001),/margin/);
  assert.throws(()=>osmQuery({type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]},0),/6 km/);
});
test('OSM download retains request provenance and fails on HTTP or byte limits',async()=>{
  const fetcher=async(url,init)=>{assert.equal(init.credentials,'omit');assert.match(String(init.body),/data=/);return new Response(JSON.stringify(raw));};
  const n=await requestOSM(boundary,250,fetcher);assert.equal(n.edges.length,3);assert.equal(n.provenance.sha256.length,64);assert.deepEqual(n.provenance.boundary,boundary);
  await assert.rejects(requestOSM(boundary,0,async()=>new Response('',{status:429})),/HTTP 429/);
  await assert.rejects(requestOSM(boundary,0,async()=>new Response(' '.repeat(2000001))),/exceeds 2 MB/);
});
test('buffer creates a distinct area and expands acquisition without carrying old area measurements',()=>{
  const snapshot=structuredClone(boundary),source={boundary,label:'Reporting area',areaId:'urn:test:source',geometryId:'urn:test:shape',measurement:{squareMetres:100,value:100,unit:'m2',method:'fixture'}};
  const node={id:'buffer',type:'buffer_area',params:{label:'Acquisition',distanceM:500},x:0,y:0};const result=bufferArea(node,source,'test');assert.deepEqual(boundary,snapshot);assert.notEqual(result.value.areaId,source.areaId);assert.equal(result.value.measurement,undefined);const before=geometryBounds(boundary),after=geometryBounds(result.value.boundary);assert.ok(after[0]<before[0]&&after[1]<before[1]&&after[2]>before[2]&&after[3]>before[3]);new Parser().parse(result.receipt.facts);
  assert.deepEqual(bufferedBoundary(boundary,0),boundary);assert.throws(()=>bufferedBoundary(boundary,-1),/0–5,000/);
  const box=geometryBounds(dimensionedBox([-.136,51.513],1000,1000)),width=(box[2]-box[0])*111195*Math.cos(51.513*Math.PI/180),height=(box[3]-box[1])*111195;assert.ok(Math.abs(width-height)<.001);assert.ok(Math.abs(width-1000)<.001);assert.throws(()=>dimensionedBox([0,89],1000,1000),/80/);
});
