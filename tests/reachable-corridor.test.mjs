import test from 'node:test';
import assert from 'node:assert/strict';
import {reachableCorridor,validateCorridorNode} from '../build/reachable-corridor.js';
import {reachableNodes} from '../build/reachable-nodes.js';
import {snapToNetwork} from '../build/network-snap.js';
import {isochrone} from '../build/catchments.js';
import {area as turfArea} from '@turf/area';

const node=p=>({id:'c',type:'reachable_corridor',x:0,y:0,
  params:{label:'Corridor',bufferM:25,zone:30,hemisphere:'north',...p}});
const reachNode=p=>({id:'r',type:'reachable_nodes',x:0,y:0,
  params:{label:'Reach',minutes:5,speedMPerMin:75,direction:'outbound',travelMode:'walking',...p}});
// A straight chain of junctions 100 m apart along a line of latitude.
const at=i=>[-0.14+i*0.00144,51.51];
const net=(n,lengthM=100)=>({nodes:[...Array(n)].map((_,i)=>({id:`n${i}`,coordinates:at(i)})),
  edges:[...Array(n-1)].map((_,i)=>({from:`n${i}`,to:`n${i+1}`,lengthM})),source:'Test network'});
const reached=(...rows)=>({type:'FeatureCollection',
  features:rows.map(([nodeId,remainingM,originSiteId='o'],i)=>({type:'Feature',id:`f${i}`,
    properties:{name:nodeId,networkNodeId:nodeId,remainingM,originSiteId,travelDirection:'outbound'},
    geometry:{type:'Point',coordinates:at(Number(nodeId.slice(1)))}}))});

test('a street entered part-way stops where the budget ran out',()=>{
  // One junction with 40 m left, on a 100 m street: 40 m of street, 25 m either side.
  const got=reachableCorridor(reached(['n0',40]),net(2),node(),'run','src');
  assert.equal(got.value.features.length,1);
  assert.match(got.receipt.facts,/fw:partialSegmentCount 1/);
  assert.match(got.receipt.facts,/fw:enteredSegmentCount 1/);
  // Since 2026-10-14 the strip is not a constant 25 m: it is the walk off the street that the
  // budget still allows, so it is 25 m wide while more than 25 m is left and narrows to nothing
  // as the budget runs out. The furthest ground it claims along the street is therefore 40 m from
  // the junction -- the budget -- where a constant 25 m strip claimed 65 m. Experiment 114.
  const geometry=got.value.features[0].geometry;
  const ring=geometry.type==='Polygon'?geometry.coordinates.flat():geometry.coordinates.flat(2);
  const metresEast=(Math.max(...ring.map(p=>p[0]))-at(0)[0])/0.00144*100;
  assert.ok(metresEast<41,`reaches ${metresEast.toFixed(1)} m east, and the budget is 40 m`);
  assert.ok(metresEast>38,`reaches only ${metresEast.toFixed(1)} m east of 40 m of budget`);
  // Smaller than the constant strip it replaced: 40 m of 50 m-wide street plus the end caps.
  const constant=40*50+Math.PI*25*25;
  const measured=turfArea(geometry);
  assert.ok(measured<constant*0.8,`${measured.toFixed(0)} m2 against ${constant.toFixed(0)} m2 before`);
  assert.ok(measured>Math.PI*25*25,'and larger than the one disc a junction with no street gets');
});

test('a junction with nothing left enters no street',()=>{
  assert.throws(()=>reachableCorridor(reached(['n0',0]),net(2),node(),'run','src'),
    /No street could be entered from any reachable junction/);
});

test('each origin gets its own corridor',()=>{
  const got=reachableCorridor(reached(['n0',50,'north'],['n2',50,'south']),net(4),node(),'run','src');
  assert.equal(got.value.features.length,2);
  assert.deepEqual(got.value.features.map(f=>f.siteId).sort(),['north','south']);
  assert.match(got.receipt.facts,/fw:originCount 2; fw:corridorCount 2/);
});

test('points that are not reachable junctions are refused, naming the step to add',()=>{
  const plain={type:'FeatureCollection',features:[{type:'Feature',id:'p',
    properties:{name:'Clinic'},geometry:{type:'Point',coordinates:at(0)}}]};
  assert.throws(()=>reachableCorridor(plain,net(2),node(),'run','src'),
    /do not come from a single Reachable junctions step/);
  const empty={type:'FeatureCollection',features:[]};
  assert.throws(()=>reachableCorridor(empty,net(2),node(),'run','src'),
    /Add a Reachable junctions step before this one/);
});

test('junctions from two different traversals are refused rather than mixed',()=>{
  const mixed=reached(['n0',50],['n1',50]);
  mixed.features[1].properties.travelDirection='inbound';
  assert.throws(()=>reachableCorridor(mixed,net(3),node(),'run','src'),
    /Each must carry one travelDirection of outbound or inbound/);
});

test('the corridor width is reported as the claim it is, and holes are kept',()=>{
  const said=reachableCorridor(reached(['n0',50]),net(2),node({bufferM:30}),'run','src')
    .value.notes.join(' ');
  assert.match(said,/30 m either side is the final walk off the street, and it is charged/);
  assert.match(said,/narrows to nothing where the time runs out/);
  assert.match(said,/insides of buildings, locked yards and the far side of walls/);
  assert.match(said,/Holes are kept/);
  assert.match(said,/eight-sided approximation of a curve, not a curve/);
});

test('an impossible width or zone is refused',()=>{
  assert.throws(()=>validateCorridorNode(node({bufferM:0})),/half-width from 1 to 100 metres/);
  assert.throws(()=>validateCorridorNode(node({zone:61})),/UTM zone from 1 to 60/);
});

test('the four primitives together reproduce the isochrone monolith',async()=>{
  // snap -> reachable junctions -> corridor, against isochrone's own one-node answer,
  // at the parameters the John Snow example uses, on the network it ships.
  const {johnSnowExample}=await import('../build/john-snow.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
  const params={label:'x',zone:30,hemisphere:'north',minutes:5,speedMPerMin:75,
    bufferM:25,maxSnapM:100,direction:'outbound',fillHoles:false};
  const monolith=isochrone(pumps,network,params);
  const snapped=snapToNetwork(pumps,network,{id:'s',type:'snap_to_network',x:0,y:0,
    params:{label:'Snap',zone:30,hemisphere:'north',maxSnapM:100}},'run','pumps');
  const junctions=reachableNodes(snapped.value,network,reachNode(),'run','snap');
  const composed=reachableCorridor(junctions.value,network,node({bufferM:25}),'run','reach');
  assert.equal(composed.value.features.length,monolith.features.length,'one corridor each');
  const a=turfArea(monolith.features[0].geometry),b=turfArea(composed.value.features[0].geometry);
  const drift=Math.abs(a-b)/a;
  console.log(`monolith ${a.toFixed(0)} m2 vs composed ${b.toFixed(0)} m2 — ${(drift*1e6).toFixed(1)} parts per million`);
  assert.ok(drift<1e-4,`areas agree within 0.01%: monolith ${a.toFixed(1)}, composed ${b.toFixed(1)}`);
});
