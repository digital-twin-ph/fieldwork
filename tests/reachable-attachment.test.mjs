import test from 'node:test';
import assert from 'node:assert/strict';
import {johnSnowExample} from '../build/john-snow.js';
import {snapToNetwork} from '../build/network-snap.js';
import {reachableNodes,validateReachNode} from '../build/reachable-nodes.js';

const example=johnSnowExample('snow-isochrone');
const network=example.nodes.find(n=>n.type==='network_input').params.data;
const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
const reach=params=>({id:'r',type:'reachable_nodes',x:0,y:0,
  params:{label:'R',minutes:15,speedMPerMin:75,direction:'outbound',travelMode:'walking',...params}});
const snap=params=>snapToNetwork(pumps,network,{id:'s',type:'snap_to_network',x:0,y:0,
  params:{label:'S',zone:30,hemisphere:'north',maxSnapM:100,...params}},'r','p');

// The whole point of step 1 of the snap_to_network retirement: the widget attaches its own
// origins, so the separate widget is no longer a prerequisite. "The snap to network is actually
// not needed if we follow the D1 + D2 + D3" -- the practitioner.
test('the two attachment paths agree, junction for junction and metre for metre',()=>{
  const viaWidget=reachableNodes(snap().value,network,reach(),'r','s').value;
  const here=reachableNodes(pumps,network,reach({zone:30,hemisphere:'north',maxSnapM:100}),'r','p').value;
  assert.equal(here.features.length,viaWidget.features.length);
  const key=f=>`${f.properties.originSiteId}|${f.properties.networkNodeId}|${f.properties.travelMetres}|${f.properties.remainingM}`;
  assert.deepEqual(here.features.map(key),viaWidget.features.map(key),
    'attaching here must reach the same junctions, at the same cost, as snapping first');
  // D1 is charged identically, which is what makes the budgets comparable at all.
  assert.deepEqual(here.features.map(f=>f.properties.originSnapDistanceM),
    viaWidget.features.map(f=>f.properties.originSnapDistanceM));
});

test('an unattached origin without a zone is refused, by name, and says what to do',()=>{
  assert.throws(()=>reachableNodes(pumps,network,reach(),'r','p'),
    e=>/not on the network yet/.test(e.message)
      &&/UTM zone/.test(e.message)
      &&/degree of longitude is not a degree of latitude/.test(e.message));
});

test('an origin arriving snapped needs no zone, and nothing is projected',()=>{
  const out=reachableNodes(snap().value,network,reach(),'r','s');
  assert.ok(out.value.features.length>0);
  assert.doesNotMatch(out.receipt.facts,/EPSG|fw:attachmentLimitMetres/,
    'a run that attaches nothing must assert no CRS: there is nothing to project');
  assert.ok(!out.value.sourceInfo.notes.some(n=>/attached to the network by this step/.test(n)));
});

test('attaching here is recorded: how many, in what frame, under what limit',()=>{
  const out=reachableNodes(pumps,network,reach({zone:30,hemisphere:'north',maxSnapM:100}),'r','p');
  assert.match(out.receipt.facts,/fw:attachmentLimitMetres 100/);
  assert.match(out.receipt.facts,/EPSG/,'the metric frame the nearest junction was found in');
  const note=out.value.sourceInfo.notes.find(n=>/attached to the network by this step/.test(n));
  assert.ok(note,'the notes must say the attachment happened here');
  assert.match(note,/snap limit 100 m/);
  assert.match(note,/not moved/,'this step does not overwrite the point, unlike snap_to_network');
});

test('with no snap limit nothing is marked off-network, and the notes say so',()=>{
  const out=reachableNodes(pumps,network,reach({zone:30,hemisphere:'north'}),'r','p');
  assert.deepEqual(out.value.offNetwork,[]);
  assert.doesNotMatch(out.receipt.facts,/fw:attachmentLimitMetres/);
  assert.match(out.value.sourceInfo.notes.join(' '),/no snap limit set/);
});

test('a mixed input says it is mixed',()=>{
  // One origin arrives snapped, one does not. The pumps layer holds a single feature, so the
  // second origin is that feature moved a little and stripped of its junction.
  const snappedOne=snap().value.features[0];
  const site=[snappedOne.properties.siteLongitude,snappedOne.properties.siteLatitude];
  const loose={type:'Feature',id:'loose',properties:{name:'Unattached site'},
    geometry:{type:'Point',coordinates:[site[0]+0.0012,site[1]+0.0008]}};
  const mixed={type:'FeatureCollection',features:[snappedOne,loose]};
  const out=reachableNodes(mixed,network,reach({zone:30,hemisphere:'north',maxSnapM:100}),'r','p');
  const notes=out.value.sourceInfo.notes.join(' ');
  assert.match(notes,/1 of 2 origins was attached to the network by this step/);
  assert.match(notes,/1 origin arrived already snapped/);
  assert.match(notes,/mixes two attachments made under different settings/,
    'two junctions chosen under different settings is a caveat, not a detail');
});

test('the optional parameters are validated only when declared',()=>{
  assert.doesNotThrow(()=>validateReachNode(reach()));
  assert.doesNotThrow(()=>validateReachNode(reach({zone:30,hemisphere:'north'})));
  assert.throws(()=>validateReachNode(reach({zone:0,hemisphere:'north'})),/UTM zone from 1 to 60/);
  // HALF a pair passes validation and fails at run time. The Inspector sets one field at a
  // time, so refusing a half-set pair at edit time made the pair unsettable: the first edit was
  // rolled back before the second could be made.
  assert.doesNotThrow(()=>validateReachNode(reach({zone:30})));
  assert.throws(()=>reachableNodes(pumps,network,reach({zone:30}),'r','p'),/not on the network yet/,
    'half a frame is not a frame, and the run is where that is said');
  assert.throws(()=>validateReachNode(reach({maxSnapM:5000})),/snap limit from 0 to 1,000/);
});

test('an origin snapped to a different network is still refused',()=>{
  const wrong={...pumps,features:pumps.features.map(f=>({...f,
    properties:{...f.properties,networkNodeId:'not-a-node-in-this-network'}}))};
  assert.throws(()=>reachableNodes(wrong,network,reach({zone:30,hemisphere:'north'}),'r','p'),
    /is not in this network/);
});
