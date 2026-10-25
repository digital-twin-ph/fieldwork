import test from 'node:test';
import assert from 'node:assert/strict';
import {snapToNetwork,validateSnapNode} from '../build/network-snap.js';
import {metric} from '../build/catchments.js';

const node=p=>({id:'s',type:'snap_to_network',x:0,y:0,
  params:{label:'Snap sites',zone:30,hemisphere:'north',maxSnapM:150,...p}});
const m=metric(30,'north');
const origin=m.forward([-0.14,51.51]);
// A longitude/latitude pair the given metre offset from the origin.
const at=(eastM,northM)=>m.inverse([origin[0]+eastM,origin[1]+northM]);
const site=(id,eastM,northM)=>({type:'Feature',id,properties:{name:id},
  geometry:{type:'Point',coordinates:at(eastM,northM)}});
const net=(...nodes)=>({
  nodes:nodes.map(([id,e,n])=>({id,coordinates:at(e,n)})),
  edges:nodes.slice(1).map(([id],i)=>({from:nodes[i][0],to:id,lengthM:50})),
  source:'Test network'});
const points=(...features)=>({type:'FeatureCollection',features});

test('each site takes the nearest node, and how far it moved travels with it',()=>{
  const network=net(['n-1',0,0],['n-2',500,0]);
  const got=snapToNetwork(points(site('a',40,30)),network,node(),'r','src');
  assert.equal(got.value.features.length,1);
  const f=got.value.features[0];
  assert.equal(f.properties.networkNodeId,'n-1');
  assert.equal(Math.round(f.properties.snapDistanceM),50,'40 m east and 30 m north is 50 m away');
  assert.deepEqual(f.geometry.coordinates,network.nodes[0].coordinates,'the point sits on the node');
  assert.match(got.receipt.facts,/fw:greatestSnapDistanceMetres 50\.0/);
  assert.match(got.receipt.facts,/fw:siteCount 1; fw:snappedNodeCount 1/);
});

test('nearest is measured in metres, which picks a different node than degrees would',()=>{
  // At 51.5 degrees north a degree of longitude is 69.3 km and a degree of latitude 111.2 km.
  // The east node is 100 m away and the north node 120 m, so metres pick east. In raw degrees
  // east is 0.00144 and north 0.00108, so degrees would pick north -- the wrong node.
  const network=net(['east',100,0],['north',0,120]);
  const got=snapToNetwork(points(site('a',0,0)),network,node(),'r','src');
  assert.equal(got.value.features[0].properties.networkNodeId,'east');
  assert.equal(Math.round(got.value.features[0].properties.snapDistanceM),100);
});

test('a site beyond the snap limit snaps anyway and carries the leg it crossed',()=>{
  const network=net(['n-1',0,0]);
  const got=snapToNetwork(points(site('near',40,30),site('clinic',300,0)),network,node({maxSnapM:150}),'r','src');
  assert.deepEqual(got.value.features.map(f=>f.id),['near','clinic'],'nothing is dropped');
  assert.equal(got.value.features[0].properties.offNetworkMetres,undefined,'a site inside the limit assumed no leg');
  assert.equal(got.value.features[1].properties.offNetworkMetres,300,'the far site says its first leg crossed no street');
  assert.equal(got.value.features[1].properties.snapDistanceM,300,'and the distance is charged like any other');
  assert.deepEqual(got.value.offNetwork,[{siteId:'clinic',name:'clinic',distanceM:300,limitM:150}]);
  assert.match(got.value.sourceInfo.notes[0],/^1 of 2 sites is further than the 150 m snap limit from any node and reached the network across ground no street covers: clinic \(300 m\)/);
  // Mode-neutral wording, 2026-10-25: *"any reference to walking or driving (or cycling) when
  // using street networks must never be hard coded in the interface"*. A straight leg is charged
  // the same way whatever mode was declared, and a message that calls it a walk is wrong on a
  // driving network while looking perfectly reasonable.
  assert.match(got.value.sourceInfo.notes[0],/assumes ground that can be crossed/);
  assert.match(got.receipt.facts,/fw:offNetworkSiteCount 1/);
  assert.match(got.receipt.facts,/fw:offNetworkSites "\[\{\\"siteId\\":\\"clinic/);
});

test('a layer entirely off the network still snaps, and says every site is off-network',()=>{
  // No refusal: refusing here would discard exactly the layer whose streets are unmapped.
  const network=net(['n-1',0,0]);
  const got=snapToNetwork(points(site('clinic',300,0)),network,node({maxSnapM:150}),'r','src');
  assert.equal(got.value.features.length,1);
  assert.equal(got.value.offNetwork.length,1);
  assert.match(got.value.sourceInfo.notes[0],/^1 of 1 site is further than the 150 m snap limit/);
});

test('two sites on one node is reported, not refused',()=>{
  const network=net(['n-1',0,0],['n-2',600,0]);
  const got=snapToNetwork(points(site('a',10,0),site('b',-10,0)),network,node(),'r','src');
  assert.equal(got.value.features.length,2,'both sites are kept');
  assert.match(got.receipt.facts,/fw:siteCount 2; fw:snappedNodeCount 1/);
  const said=got.value.sourceInfo.notes.join(' ');
  assert.match(said,/shares? a node with another, so they are indistinguishable/);
});

test('records without coordinates are left out and counted',()=>{
  const network=net(['n-1',0,0]);
  const got=snapToNetwork(points(site('a',10,0),
    {type:'Feature',id:'b',properties:{name:'b'},geometry:null}),network,node(),'r','src');
  assert.equal(got.value.features.length,1);
  assert.match(got.value.sourceInfo.notes.join(' '),/1 record without coordinates was not snapped/);
});

test('the walk to the road travels in the notes and the method, and says who charges it',()=>{
  const network=net(['n-1',0,0]);
  const got=snapToNetwork(points(site('a',100,0)),network,node(),'r','src');
  const said=got.value.sourceInfo.notes.join(' ');
  assert.match(said,/charge that distance against their budget/);
  assert.match(said,/without reading snapDistanceM treats a site 200 m from the road as if it were on it/);
  assert.match(said,/straight-line, not along the network/);
  assert.match(got.receipt.method,/charge that distance against their budget/);
});

test('a bad zone or snap limit is refused before anything is measured',()=>{
  assert.throws(()=>validateSnapNode(node({zone:0})),/UTM zone from 1 to 60/);
  assert.throws(()=>validateSnapNode(node({maxSnapM:-1})),/snap limit from 0 to 1,000 metres/);
  assert.throws(()=>validateSnapNode(node({label:'  '})),/Name the step/);
});
