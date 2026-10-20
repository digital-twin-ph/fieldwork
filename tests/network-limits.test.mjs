import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=async entry=>{
  const r=await build({absWorkingDir:process.cwd(),entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm'});
  return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
};
const cm=await bundle('src/catchments.ts');
const sn=await bundle('src/street-network.ts');

const graph=(n)=>({
  nodes:Array.from({length:n},(_,i)=>({id:'n'+i,coordinates:[-0.14+i*1e-5,51.51]})),
  edges:Array.from({length:n-1},(_,i)=>({from:'n'+i,to:'n'+(i+1),lengthM:10})),
  source:'test graph'});

test('the default graph limit admits a real street network', ()=>{
  // 2,000 until 2026-10-20, which refused every real area: Buvuma Island normalizes to 11,359
  // network nodes and Bunia to 42,796. It was protecting ISOCHRONE construction, which protects
  // itself -- a worker, a boot check and a timeout that names memory, so an oversized graph fails
  // that step rather than the tab. The measured isochrone number keeps its own name.
  assert.equal(cm.NETWORK_NODE_LIMIT,50000);
  assert.equal(cm.ISOCHRONE_MEASURED_NODES,2000,'the measurement is unchanged; only its scope was');
  assert.ok(cm.graphLimits().maxNodes>42796,'Bunia must fit without touching the knob');
  assert.deepEqual(cm.graphLimits(),{maxNodes:50000,maxEdges:125000});
});

test('one knob governs both numbers, at the ratio real street data shows', ()=>{
  // Measured 2026-10-13: 11,497 segments over 5,249 junctions is 2.19, so 2.5 leaves headroom.
  assert.deepEqual(cm.graphLimits(4000),{maxNodes:4000,maxEdges:10000});
  assert.ok(cm.SEGMENTS_PER_NODE>2.19,'the ratio must exceed what real data produces');
});

test('a graph over the limit is refused, and the message names the knob', ()=>{
  assert.throws(()=>cm.validateNetwork(graph(60000)),/60000 junctions/);
  assert.throws(()=>cm.validateNetwork(graph(60000)),/knob on the Street network widget/);
  assert.doesNotThrow(()=>cm.validateNetwork(graph(42796)),'a town-sized network is not refused');
  // ...and the same graph is accepted once the knob is raised.
  assert.doesNotThrow(()=>cm.validateNetwork(graph(2500),4000));
});

test('the accepted limit travels on the network, so a later step does not refuse it', ()=>{
  // This is the failure the recorded limit prevents: raise the knob, accept a graph, then have
  // isochrone re-validate it against the default and refuse what was just allowed.
  const big={...graph(60000),limits:cm.graphLimits(70000)};
  assert.doesNotThrow(()=>cm.validateNetwork(big),
    'a network carrying its own ceiling must validate without the argument being repeated');
  const unmarked=graph(60000);
  assert.throws(()=>cm.validateNetwork(unmarked),/limit is 50000/);
});

test('an explicit argument still wins over the recorded ceiling', ()=>{
  const marked={...graph(2500),limits:cm.graphLimits(4000)};
  assert.throws(()=>cm.validateNetwork(marked,1000),/limit is 1000/);
});

test('the knob range is validated on the node', ()=>{
  const node=(maxNodes)=>({id:'n',type:'network_input',x:0,y:0,
    params:{label:'Street network',data:{nodes:[],edges:[]},maxNodes}});
  assert.throws(()=>cm.validateCatchmentNode(node(100)),/between 500 and 50000/);
  assert.throws(()=>cm.validateCatchmentNode(node(50001)),/between 500 and 50000/);
  assert.throws(()=>cm.validateCatchmentNode(node(2000.5)),/between 500 and 50000/);
  assert.doesNotThrow(()=>cm.validateCatchmentNode(node(2000)));
  assert.doesNotThrow(()=>cm.validateCatchmentNode(node(undefined)));
});

test('the walking filter is one list, used for the request and the response', ()=>{
  // Two lists that must agree will not: the request used to ask for every highway value and the
  // response filter discarded all but fifteen.
  const q=sn.osmQuery({type:'Polygon',coordinates:[[[-0.142,51.509],[-0.128,51.509],[-0.128,51.517],[-0.142,51.517],[-0.142,51.509]]]},0).query;
  for(const value of sn.WALKABLE_HIGHWAYS)assert.ok(q.includes(value),`${value} must be requested`);
  assert.ok(q.includes('out skel qt'),'plain nodes are fetched as skeletons');
  assert.ok(q.includes('node._["barrier"]'),'barrier tags are still fetched, because the filter reads them');
  // No maxsize at all. It was set to this client's byte cap on 2026-10-13 and withdrawn the same
  // day: Overpass's maxsize is the memory budget for EXECUTING the query on the server, not the size
  // of the response, and 2 MB made the Soho isochrone example fail with "would need at least 3 MB of
  // RAM to continue" for an answer that fits well inside 2 MB.
  assert.ok(!q.includes('maxsize'),'the service decides its own memory budget');
});

test('a node carrying tags and no coordinates does not become a hole in the geometry', ()=>{
  // The tighter query returns barrier nodes twice: once as a skeleton, once as tags alone.
  const raw={elements:[
    {type:'node',id:1,lat:51.5100,lon:-0.1400},
    {type:'node',id:2,lat:51.5101,lon:-0.1401},
    {type:'node',id:2,tags:{barrier:'gate',foot:'yes'}},
    {type:'way',id:9,nodes:[1,2],tags:{highway:'footway'}}]};
  const net=sn.networkFromOSM(raw);
  assert.equal(net.nodes.length,2);
  for(const n of net.nodes)assert.ok(n.coordinates.every(Number.isFinite),'every node keeps real coordinates');
  for(const e of net.edges)assert.ok(Number.isFinite(e.lengthM)&&e.lengthM>0,'no NaN lengths');
});

test('a barrier that blocks on foot still excludes its node', ()=>{
  const raw={elements:[
    {type:'node',id:1,lat:51.5100,lon:-0.1400},
    {type:'node',id:2,lat:51.5101,lon:-0.1401},
    {type:'node',id:2,tags:{barrier:'wall'}},
    {type:'way',id:9,nodes:[1,2],tags:{highway:'footway'}}]};
  assert.throws(()=>sn.networkFromOSM(raw),/at least one junction|A street network needs/);
});

test('an OSM download records the ceiling it was accepted under', ()=>{
  const raw={elements:[
    {type:'node',id:1,lat:51.5100,lon:-0.1400},
    {type:'node',id:2,lat:51.5101,lon:-0.1401},
    {type:'way',id:9,nodes:[1,2],tags:{highway:'residential'}}]};
  assert.deepEqual(sn.networkFromOSM(raw).limits,{maxNodes:50000,maxEdges:125000});
  assert.deepEqual(sn.networkFromOSM(raw,4000).limits,{maxNodes:4000,maxEdges:10000});
});

test('isochrone reports progress per site, which is the only liveness a sync computation can give', ()=>{
  const net={nodes:[{id:'a',coordinates:[-0.14,51.51]},{id:'b',coordinates:[-0.1399,51.51]}],
    edges:[{from:'a',to:'b',lengthM:10},{from:'b',to:'a',lengthM:10}],source:'test'};
  const sites={type:'FeatureCollection',features:[1,2].map(i=>({type:'Feature',id:'s'+i,
    properties:{name:'site '+i},geometry:{type:'Point',coordinates:[-0.14,51.51]}}))};
  const seen=[];
  cm.isochrone(sites,net,{label:'t',zone:30,hemisphere:'north',minutes:5,speedMPerMin:80,
    bufferM:20,maxSnapM:100,direction:'outbound'},(done,total)=>seen.push([done,total]));
  assert.deepEqual(seen,[[0,2],[1,2]],'one report per site, before that site is searched');
});

// --- the corridor buffer, which was the whole of the scaling problem ---

const turfArea=(await import('@turf/area')).area;
const grid=(n)=>Array.from({length:n},(_,i)=>{
  const x=-0.14+(i%20)*0.0004,y=51.51+Math.floor(i/20)*0.0004;
  return [[x,y],[x+0.00035,y]];
});

// The corridor is now built from chunks carrying the budget left where each ends, so these
// pass a budget far above the radius: every chunk takes the full width and the shape is the
// one the constant-radius buffer produced. The taper itself is tested in catchments.test.mjs.
const identity=p=>p;
const whole=lines=>lines.map(line=>({line,remainingM:1e6}));
const corridor=(lines,radius=25)=>cm.taperedCorridor(whole(lines),radius,identity,
  {point:[-0.14,51.51],radiusM:radius});

test('batching does not change the corridor, which is why the batch size is free to choose', ()=>{
  // A buffer distributes over a union, so the strip around a set of streets is the union of the
  // strips around each. The whole optimisation rests on that, so it is asserted rather than
  // assumed: 120 streets buffered in batches of 25 against the same streets in one call.
  const lines=grid(120);
  const batched=corridor(lines);
  const single=corridor(lines.slice(0,cm.BUFFER_BATCH));
  assert.ok(turfArea(batched)>turfArea(single),'more streets must cover more ground');
  const same=corridor(lines);
  assert.equal(Math.round(turfArea(batched)),Math.round(turfArea(same)));
});

test('a corridor of one piece is a Polygon, and of several a MultiPolygon', ()=>{
  const near=corridor([[[-0.14,51.51],[-0.1395,51.51]]]);
  assert.equal(near.type,'Polygon','one street buffers to one polygon');
  // Two streets a kilometre apart cannot merge at a 25 m buffer.
  const apart=corridor([[[-0.14,51.51],[-0.1395,51.51]],[[-0.12,51.52],[-0.1195,51.52]]]);
  assert.equal(apart.type,'MultiPolygon');
  assert.equal(apart.coordinates.length,2);
});

test('no streets at all buffers the site, so a site still gets a shape', ()=>{
  const out=cm.taperedCorridor([],25,identity,{point:[-0.14,51.51],radiusM:25});
  assert.equal(out.type,'Polygon');
  assert.ok(turfArea(out)>0);
});

test('a chunk with nothing left of its budget is not drawn', ()=>{
  // The taper reaching zero is the budget boundary: there is no leg to walk off the street.
  const spent=cm.taperedCorridor([{line:[[-0.14,51.51],[-0.1395,51.51]],remainingM:0}],25,identity,
    {point:[-0.14,51.51],radiusM:3});
  assert.ok(turfArea(spent)<turfArea(corridor([[[-0.14,51.51],[-0.1395,51.51]]])),
    'it falls back to the site, not to a full-width strip');
});

test('the batch size is the measured one, and batching is actually used', ()=>{
  // Measured 2026-10-13 on 3,925 real streets: 25 was the floor on both time and memory, at
  // 2,532 ms and +21 MB against 17,175 ms and +4,599 MB for a single call.
  assert.equal(cm.BUFFER_BATCH,25);
  assert.ok(cm.BUFFER_BATCH>1,'batches of one pay the engine per-call overhead 3,925 times');
});

// --- the throttle: a floor that can only be raised ---

const th=await bundle('src/network-throttle.ts');

test('the pause has a floor nothing can go under', ()=>{
  assert.equal(th.OSM_PAUSE_MS,60_000);
  for(const [bytes,chosen] of [[0,0],[1,0],[1e6,0],[0,1],[1e5,1_000],[NaN,NaN],[-5,-5]])
    assert.ok(th.earnedPause(bytes,chosen)>=th.OSM_PAUSE_MS,
      `${bytes} bytes and a ${chosen} ms request must not go under the floor`);
});

test('a request pays for what it took', ()=>{
  // 30 seconds a megabyte: the 1.4 MB ordinary case stays at the floor, the 7.4 MB extent earns
  // about 3.7 minutes.
  assert.equal(th.earnedPause(1.42e6),60_000,'1.42 MB is inside the floor');
  assert.equal(Math.round(th.earnedPause(7.39e6)/1000),222);
  assert.ok(th.earnedPause(4e6)>th.earnedPause(2e6),'more bytes must cost more');
});

test('a practitioner can be more respectful but not less', ()=>{
  assert.equal(th.earnedPause(0,300_000),300_000,'a longer chosen pause is honoured');
  assert.equal(th.earnedPause(0,10_000),60_000,'a shorter one falls back to the floor');
  // The volume charge still applies when it exceeds what was chosen.
  assert.equal(Math.round(th.earnedPause(7.39e6,90_000)/1000),222);
});

test('no single response can lock the button indefinitely', ()=>{
  assert.equal(th.earnedPause(1e9),th.OSM_PAUSE_MAX_MS);
  assert.equal(th.earnedPause(0,9e9),th.OSM_PAUSE_MAX_MS);
});

test('charging a download only ever pushes the deadline later', ()=>{
  th.resetNetworkPacing();
  const now=1_000_000;
  th.chargeNetworkDownload(7.39e6,0,now);
  const after=th.networkDownloadStatus(now).waitSeconds;
  assert.equal(after,222);
  // A later small download must not shorten a pause already earned.
  th.chargeNetworkDownload(1000,0,now);
  assert.equal(th.networkDownloadStatus(now).waitSeconds,222);
  th.resetNetworkPacing();
});

test('the pause knob is validated, and 60 is the lowest it accepts', ()=>{
  const node=(pauseSeconds)=>({id:'n',type:'network_input',x:0,y:0,
    params:{label:'Street network',data:{nodes:[],edges:[]},pauseSeconds}});
  assert.throws(()=>cm.validateCatchmentNode(node(30)),/60–900 second/);
  assert.throws(()=>cm.validateCatchmentNode(node(901)),/60–900 second/);
  assert.doesNotThrow(()=>cm.validateCatchmentNode(node(60)));
  assert.doesNotThrow(()=>cm.validateCatchmentNode(node(900)));
  assert.doesNotThrow(()=>cm.validateCatchmentNode(node(undefined)));
});

// --- the download caps now follow the graph knob ---

test('the download floor is what a DOWNLOAD costs, not what an isochrone can hold', ()=>{
  // The floor was 2,000,000 bytes and a real download arrived at 2,014,475 -- received in full
  // from a free public service, then discarded for being 0.7% over. The graph knob exists because
  // isochrone construction exhausted a 4 GB heap at 5,249 nodes; a network that is drawn, snapped
  // to or routed over never meets that, so the two no longer share a number.
  assert.equal(cm.downloadLimits().maxBytes,Math.max(cm.DOWNLOAD_FLOOR_BYTES,cm.NETWORK_NODE_LIMIT*cm.BYTES_PER_NODE));
  assert.deepEqual(cm.downloadLimits(500),{maxBytes:cm.DOWNLOAD_FLOOR_BYTES,maxFeatures:cm.DOWNLOAD_FLOOR_FEATURES},
    'lowering the graph knob must not tighten the download');
  assert.ok(cm.DOWNLOAD_FLOOR_BYTES>7.39e6,
    'a floor below this project\'s own measured isochrone extent would refuse an example it ships');
  assert.ok(cm.downloadLimits().maxBytes>2_014_475,'and the download that prompted this now fits');
});

test('raising the graph knob widens the download enough for the measured cost', ()=>{
  // Measured 2026-10-13: 272 bytes and 1.87 features per junction on both extents. The shipped
  // isochrone extent is 7.39 MB and 50,791 features at 27,181 junctions.
  const {maxBytes,maxFeatures}=cm.downloadLimits(27181);
  assert.ok(maxBytes>7.39e6,`${maxBytes} must admit the 7.39 MB that extent really costs`);
  assert.ok(maxFeatures>50791,`${maxFeatures} must admit the 50,791 features it really has`);
  assert.ok(cm.BYTES_PER_NODE>272*2,'the multiplier carries about double the measured cost');
  assert.ok(cm.FEATURES_PER_NODE>1.87*2);
});

test('the request does not dictate the service\'s memory budget', ()=>{
  // The byte cap is enforced on arrival, where it is a limit on a real quantity. Telling the server
  // its execution budget was a category error, and it broke a shipped example.
  const area={type:'Polygon',coordinates:[[[-0.142,51.509],[-0.128,51.509],[-0.128,51.517],[-0.142,51.517],[-0.142,51.509]]]};
  for(const maxNodes of [undefined,2000,27181,50000])
    assert.ok(!sn.osmQuery(area,0,maxNodes).query.includes('maxsize'),
      'no graph limit may put a maxsize back into the query');
  assert.ok(sn.osmQuery(area,0).query.includes('[timeout:25]'),'the time budget is still stated');
});

test('a pause is recommended for a given response size, never shorter than the charge', ()=>{
  // The point of the recommendation is to be settable in advance; it must not under-advise.
  for(const bytes of [0,1e6,2e6,4e6,8e6,16e6,30e6,1e9])
    assert.ok(th.recommendedPauseSeconds(bytes)*1000>=th.earnedPause(bytes),
      `${bytes} bytes: advice must cover the charge`);
  assert.equal(th.recommendedPauseSeconds(2e6),60);
  assert.equal(th.recommendedPauseSeconds(4e6),120);
  assert.equal(th.recommendedPauseSeconds(8e6),240);
  assert.equal(th.recommendedPauseSeconds(16e6),480);
  assert.equal(th.recommendedPauseSeconds(30e6),900,'the ceiling caps the advice too');
});

test('the recommendation matches the download the graph knob allows', ()=>{
  // The two knobs are tied: raising the graph limit widens the download, which earns a longer
  // pause, and the interface recommends that pause rather than leaving it to be discovered.
  for(const maxNodes of [2000,10000,27181,50000]){
    const {maxBytes}=cm.downloadLimits(maxNodes);
    assert.ok(th.recommendedPauseSeconds(maxBytes)>=60);
    assert.ok(th.recommendedPauseSeconds(maxBytes)*1000>=th.earnedPause(maxBytes));
  }
  assert.ok(th.recommendedPauseSeconds(cm.downloadLimits(50000).maxBytes)
    >th.recommendedPauseSeconds(cm.downloadLimits(2000).maxBytes),
    'a bigger allowance must earn a longer recommended pause');
});
