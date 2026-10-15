import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {voronoi,clipPolygons,summarizePolygons,isochrone,metric,validateNetwork} from '../build/catchments.js';
import {johnSnowExample} from '../build/john-snow.js';
import {calculateArea} from '../build/area-computation.js';
const area=g=>calculateArea(g,'m2').value;
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
  assert.throws(()=>validateNetwork({...network,edges:[{from:'a',to:'unknown',lengthM:1}]}),/endpoints/);
});

test('a site beyond the snap limit is routed anyway, across a leg it marks as off-network',()=>{
  const network={source:'synthetic directed graph',nodes:[{id:'a',coordinates:coord(0,0)},{id:'b',coordinates:coord(50,50)}],edges:[{from:'a',to:'b',lengthM:100,geometry:[coord(0,0),coord(50,0),coord(50,50)]}]};
  // One site on the graph and one 500 m away, with a 2 m snap limit. The far site is 636 m from
  // the nearest junction, inside a 1,500 m budget: it gets an answer, marked. Before 2026-10-14
  // it threw and took the near site's catchment with it.
  const wide={...params,minutes:20,speedMPerMin:75};
  const p=isochrone(collection(point('near',0,0),point('away',500,500)),network,wide);
  assert.deepEqual(p.features.map(f=>f.siteId),['near','away'],'both sites are answered');
  assert.equal(p.features[0].offNetworkMetres,undefined,'a site on the network assumed no leg');
  assert.ok(p.features[1].offNetworkMetres>600,'the far site carries the leg it was charged');
  assert.deepEqual(p.unconnected,[],'nothing was dropped');
  assert.deepEqual(p.offNetwork.map(u=>[u.siteId,u.limitM]),[['away',2]]);
  assert.match(p.notes[0],/^1 of 2 sites started further than the 2 m snap limit/);
  assert.match(p.notes[0],/lower bound on the walk and reach too far rather than too little/);
  // The route is drawn whole, so the catchment reaches back to the site itself across the leg it
  // was charged for -- the straight line it assumed was walkable.
  const ring=p.features[1].geometry.type==='Polygon'?p.features[1].geometry.coordinates.flat()
    :p.features[1].geometry.coordinates.flat(2);
  const site=collection(point('away',500,500)).features[0].geometry.coordinates;
  const nearest=Math.min(...ring.map(([x,y])=>Math.hypot((x-site[0])*69000,(y-site[1])*111000)));
  assert.ok(nearest<40,`the catchment comes within ${nearest.toFixed(0)} m of the site it belongs to`);
});

test('a site whose walk to the network spends the whole budget gets no catchment, and says so',()=>{
  const network={source:'synthetic directed graph',nodes:[{id:'a',coordinates:coord(0,0)},{id:'b',coordinates:coord(50,50)}],edges:[{from:'a',to:'b',lengthM:100,geometry:[coord(0,0),coord(50,0),coord(50,50)]}]};
  // 636 m to the nearest junction on a 50 m budget. There is nothing to draw: the only available
  // shape is a buffer disc around the junction, which is not where the site is nor where it can
  // reach, and that is what this widget drew before 2026-10-14 whenever the snap limit was wider
  // than the budget.
  const p=isochrone(collection(point('near',0,0),point('away',500,500)),network,{...params,minutes:1,speedMPerMin:50,maxSnapM:1000});
  assert.deepEqual(p.features.map(f=>f.siteId),['near']);
  assert.deepEqual(p.offNetwork,[],'it is inside the snap limit; the budget is what defeated it');
  assert.equal(p.unconnected.length,1);
  assert.equal(p.unconnected[0].budgetM,50);
  assert.ok(p.unconnected[0].distanceM>600);
  assert.match(p.notes[0],/the walk to the nearest street alone spends the whole 50 m budget/);
  assert.match(p.notes[0],/over the origins|over the sites that reached something/);
  // A summary over an incomplete set carries the omission forward, so the tab that counts says so.
  const summary=summarizePolygons(p,collection(point('on',25,0)),{boundary:'include',valueField:''});
  assert.deepEqual(summary.unconnected,p.unconnected);
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
    // Counts rose by one on 2026-10-14: both examples gained a `reproject` node and a table
    // showing the pump coordinates in EPSG:32630, the frame the catchments are measured in
    // (experiment 111). The map's polygons used to be outputs[0] and are now selected by node id,
    // because the index was an unstated assumption about plan order -- the new table executes
    // first and silently became outputs[0], which would have left `p` undefined and failed the
    // conservation assertions below for a reason that has nothing to do with conservation.
    assert.equal(result.outputs.length,kind==='snow-isochrone'?6:5);
    const map=result.outputs.find(o=>o.nodeId==='map'),p=map.polygons;
    assert.ok(p,'the map output must carry the catchment polygons');
    // The projected table is the same eight pumps (one, for the isochrone) in metres.
    const projected=result.outputs.find(o=>o.nodeId==='projected-table');
    assert.ok(projected,'the example must instantiate reproject');
    assert.equal(result.outputs.filter(o=>o.nodeId==='epidemic')[0].chart.bins.length,43);
    assert.equal(p.summary.records,250);assert.equal(p.summary.matched+p.summary.unmatched+p.summary.missingLocation,250);
    if(kind==='snow-voronoi'){assert.equal(p.summary.multiple,0);assert.equal(p.features.reduce((s,f)=>s+f.count,0),250);assert.equal(p.features.reduce((s,f)=>s+f.total,0),489);}else{
      // [minutes, located deaths, total deaths] per band, re-measured 2026-10-14 when D1 began to
      // be charged. The budget now pays for the 10.91 m walk from the pump to its junction before
      // any street is walked, and the effect falls almost entirely on the shortest band:
      //
      //   1 min   48 locations / 110 deaths  ->  35 / 89
      //   5 min  216 / 433                   -> 212 / 425
      //  10 min  250 / 489                   -> unchanged, the band already reaches everything
      //
      // Then re-measured again the same day, when D3 was modelled: the corridor is no longer a
      // constant 25 m strip around every reached street, but the walk off the street that the
      // budget still allows, so it narrows to nothing where the time runs out instead of claiming
      // 25 m beyond it all the way round.
      //
      //   1 min   35 / 89   ->  21 / 65
      //   5 min  212 / 425  -> 204 / 409
      //  10 min  250 / 489  -> unchanged
      //
      // So of the 110 deaths the one-minute catchment originally claimed, 45 were inside only
      // because two of the three segments of the walk were free. That is the result of experiment
      // 114, not a regression, and "within a minute's walk of the pump" is exactly the question
      // this example exists to ask.
      assert.deepEqual(p.features.map(f=>[f.minutes,f.count,f.total]),[[1,21,65],[5,204,409],[10,250,489],[15,250,489]]);assert.equal(p.summary.multiple,250);assert.equal(map.contextPoints.features.length,8);assert.equal(result.outputs.at(-1).polygonPresentation,'interactive');assert.deepEqual(map.polygons,result.outputs.at(-1).polygons);assert.match(result.receipts.find(r=>r.nodeId==='map').facts,/output:context-pumps/);}
    for(const r of result.receipts)new Parser().parse(r.facts);
    assert.ok(result.receipts.some(r=>r.facts.includes('geo:asWKT')));assert.equal(result.receipts.filter(r=>r.kind==='presentation').length,kind==='snow-isochrone'?6:5);
    assert.ok(result.evidence.length>=3);
  }
});
const raw={elements:[{type:'node',id:1,lon:0,lat:1},{type:'node',id:2,lon:.001,lat:1},{type:'node',id:3,lon:.002,lat:1},{type:'way',id:10,nodes:[1,2],tags:{highway:'footway','oneway:foot':'yes'}},{type:'way',id:11,nodes:[2,3],tags:{highway:'residential',oneway:'yes'}}]};
test('OSM walking graph respects explicit foot direction and restrictions, retains shared OSM identity',()=>{
  const n=networkFromOSM(raw);assert.equal(n.nodes.length,3);assert.equal(n.edges.length,3);assert.ok(n.edges.every(e=>e.lengthM>100));
  assert.equal(networkFromOSM({...raw,elements:[...raw.elements,{type:'way',id:12,nodes:[1,3],tags:{highway:'footway',access:'private'}}]}).edges.length,3);
  assert.throws(()=>networkFromOSM({...raw,remark:'runtime error'}),/partial answer/);
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

  // Overpass fails on its own account. Measured on 2026-10-15 after a report that the download
  // was broken: three identical requests to overpass-api.de returned 502, 200, 502. A single
  // attempt meets that two times in three and reports it as if the practitioner had done
  // something wrong.
  let attempts=0;
  const flaky=async(...args)=>{attempts++;return attempts<3?new Response('',{status:502}):fetcher(...args);};
  const recovered=await requestOSM(boundary,250,flaky);
  assert.equal(attempts,3,'two server errors are retried, the third attempt succeeds');
  assert.equal(recovered.edges.length,3,'and the network that arrives is the network');

  // A server error that never clears still fails, after a bounded number of tries rather than
  // forever: every instance, twice. Measured 2026-10-15, all four public endpoints were
  // unhealthy at the same moment, so this is the case that actually happens.
  let kept=0;
  await assert.rejects(requestOSM(boundary,0,async()=>{kept++;return new Response('',{status:503});}),
    /No Overpass instance answered/);
  assert.equal(kept,8,'four instances, two rounds, then it stops');

  // A 200 carrying HTML is an error page, not a network. overpass.osm.ch returned exactly that.
  // It moves to the next instance rather than being parsed.
  let served=0;
  const htmlThenReal=async(...args)=>{served++;
    return served===1?new Response('<html>down</html>',{status:200,headers:{'content-type':'text/html'}}):fetcher(...args);};
  const past=await requestOSM(boundary,250,htmlThenReal);
  assert.equal(past.edges.length,3,'an HTML page is skipped and the next instance answers');

  // The instance that answered is recorded, because WHICH one served a network is part of where
  // the data came from. The receipt named the reference instance whatever had answered, until
  // this was built.
  assert.ok(past.provenance.url.includes('overpass'),'the endpoint that answered is in the provenance');
  assert.match(past.provenance.attribution,/OpenStreetMap contributors, via /);

  // 429 means this client is asking too often, so it is NOT retried: waiting is the answer.
  let throttled=0;
  await assert.rejects(requestOSM(boundary,0,async()=>{throttled++;return new Response('',{status:429});}),/HTTP 429/);
  assert.equal(throttled,1,'rate limiting is deferred to, not retried against');
  await assert.rejects(requestOSM(boundary,0,async()=>new Response(' '.repeat(2000001))),/over the [\d,]+ bytes this download accepts/);
});
test('buffer creates a distinct area and expands acquisition without carrying old area measurements',()=>{
  const snapshot=structuredClone(boundary),source={boundary,label:'Reporting area',areaId:'urn:test:source',geometryId:'urn:test:shape',measurement:{squareMetres:100,value:100,unit:'m2',method:'fixture'}};
  const node={id:'buffer',type:'buffer_area',params:{label:'Acquisition',distanceM:500},x:0,y:0};const result=bufferArea(node,source,'test');assert.deepEqual(boundary,snapshot);assert.notEqual(result.value.areaId,source.areaId);assert.equal(result.value.measurement,undefined);const before=geometryBounds(boundary),after=geometryBounds(result.value.boundary);assert.ok(after[0]<before[0]&&after[1]<before[1]&&after[2]>before[2]&&after[3]>before[3]);new Parser().parse(result.receipt.facts);
  assert.deepEqual(bufferedBoundary(boundary,0),boundary);assert.throws(()=>bufferedBoundary(boundary,-1),/0–50,000/);
  const box=geometryBounds(dimensionedBox([-.136,51.513],1000,1000)),width=(box[2]-box[0])*111195*Math.cos(51.513*Math.PI/180),height=(box[3]-box[1])*111195;assert.ok(Math.abs(width-height)<.001);assert.ok(Math.abs(width-1000)<.001);assert.throws(()=>dimensionedBox([0,89],1000,1000),/80/);
});
