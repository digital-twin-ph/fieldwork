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

test('the default graph limit is the measured 2,000 junctions', ()=>{
  assert.equal(cm.NETWORK_NODE_LIMIT,2000);
  assert.deepEqual(cm.graphLimits(),{maxNodes:2000,maxEdges:5000},
    'the shipped 2,000/5,000 pair must be what the default derives');
});

test('one knob governs both numbers, at the ratio real street data shows', ()=>{
  // Measured 2026-10-13: 11,497 segments over 5,249 junctions is 2.19, so 2.5 leaves headroom.
  assert.deepEqual(cm.graphLimits(4000),{maxNodes:4000,maxEdges:10000});
  assert.ok(cm.SEGMENTS_PER_NODE>2.19,'the ratio must exceed what real data produces');
});

test('a graph over the limit is refused, and the message names the knob', ()=>{
  assert.throws(()=>cm.validateNetwork(graph(2500)),/2500 junctions/);
  assert.throws(()=>cm.validateNetwork(graph(2500)),/knob on the Street network widget/);
  // ...and the same graph is accepted once the knob is raised.
  assert.doesNotThrow(()=>cm.validateNetwork(graph(2500),4000));
});

test('the accepted limit travels on the network, so a later step does not refuse it', ()=>{
  // This is the failure the recorded limit prevents: raise the knob, accept a graph, then have
  // isochrone re-validate it against the default and refuse what was just allowed.
  const big={...graph(2500),limits:cm.graphLimits(4000)};
  assert.doesNotThrow(()=>cm.validateNetwork(big),
    'a network carrying its own ceiling must validate without the argument being repeated');
  const unmarked=graph(2500);
  assert.throws(()=>cm.validateNetwork(unmarked),/limit is 2000/);
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
  assert.ok(q.includes('maxsize:2097152'),'the request must not ask for more than the client accepts');
  assert.ok(!q.includes('maxsize:16777216'));
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
  assert.deepEqual(sn.networkFromOSM(raw).limits,{maxNodes:2000,maxEdges:5000});
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
