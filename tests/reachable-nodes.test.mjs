import test from 'node:test';
import assert from 'node:assert/strict';
import {reachableNodes,validateReachNode,costsWithin,MODE_SPEED_BANDS} from '../build/reachable-nodes.js';

const node=p=>({id:'r',type:'reachable_nodes',x:0,y:0,
  params:{label:'Reachable junctions',minutes:2,speedMPerMin:100,direction:'outbound',travelMode:'cycling',...p}});
// Junction coordinates are never used for costs, only carried through to the output.
const at=i=>[-0.14+i*0.001,51.51];
const net=(ids,edges)=>({nodes:ids.map((id,i)=>({id,coordinates:at(i)})),
  edges:edges.map(([from,to,lengthM])=>({from,to,lengthM})),source:'Test network'});
const origin=(id,nodeId)=>({type:'Feature',id,properties:{name:id,networkNodeId:nodeId},
  geometry:{type:'Point',coordinates:at(0)}});
const points=(...features)=>({type:'FeatureCollection',features});
const byNode=got=>Object.fromEntries(got.value.features.map(f=>[f.properties.networkNodeId,f.properties]));

test('junctions within the budget are returned and the rest are not',()=>{
  // 2 minutes at 100 m/min is a 200 m budget along a chain of 100 m streets.
  const network=net(['a','b','c','d'],[['a','b',100],['b','c',100],['c','d',100]]);
  const got=reachableNodes(points(origin('clinic','a')),network,node(),'run','src');
  assert.deepEqual(Object.keys(byNode(got)).sort(),['a','b','c'],'d is 300 m away and out of reach');
  assert.match(got.receipt.facts,/fw:travelBudgetMetres 200\.00/);
  assert.match(got.receipt.facts,/fw:reachedNodeCount 3/);
});

test('each junction carries the budget left on arrival, which is what the corridor step consumes',()=>{
  const network=net(['a','b','c'],[['a','b',100],['b','c',100]]);
  const p=byNode(reachableNodes(points(origin('clinic','a')),network,node(),'run','src'));
  assert.equal(p.a.remainingM,200);assert.equal(p.a.travelMetres,0);
  assert.equal(p.b.remainingM,100);assert.equal(p.b.travelMetres,100);
  assert.equal(p.c.remainingM,0,'reached exactly on the budget, with nothing left');
  assert.equal(p.b.travelMinutes,1,'100 m at 100 m per minute');
});

test('the cheapest route decides the cost, not the first one found',()=>{
  // a to c directly is 400 m, or 100 + 100 through b. Dijkstra must find 200.
  const network=net(['a','b','c'],[['a','c',400],['a','b',100],['b','c',100]]);
  const p=byNode(reachableNodes(points(origin('clinic','a')),network,node(),'run','src'));
  assert.equal(p.c.travelMetres,200,'through b, not the 400 m direct street');
  assert.equal(p.c.remainingM,0);
});

test('inbound answers a different question than outbound on a one-way street',()=>{
  const network=net(['a','b'],[['a','b',100]]);
  const out=byNode(reachableNodes(points(origin('s','a')),network,node(),'run','src'));
  assert.deepEqual(Object.keys(out).sort(),['a','b'],'outbound travels a to b');
  const into=byNode(reachableNodes(points(origin('s','a')),network,node({direction:'inbound'}),'run','src'));
  assert.deepEqual(Object.keys(into),['a'],'nothing reaches a, because the street runs away from it');
  const toB=byNode(reachableNodes(points(origin('s','b')),network,node({direction:'inbound'}),'run','src'));
  assert.deepEqual(Object.keys(toB).sort(),['a','b'],'a can reach b, so inbound from b finds a');
});

test('an origin that is not on the network names the step to add',()=>{
  const network=net(['a'],[]);
  const loose={type:'Feature',id:'x',properties:{name:'Health post'},geometry:{type:'Point',coordinates:at(0)}};
  assert.throws(()=>reachableNodes(points(loose),network,node(),'run','src'),
    /Health post: this origin is not on the network\. Add a Snap to street network step before this one\./);
});

test('an origin snapped to a different network is refused, not silently dropped',()=>{
  const network=net(['a','b'],[['a','b',100]]);
  assert.throws(()=>reachableNodes(points(origin('clinic','z')),network,node(),'run','src'),
    /network node z is not in this network\. The sites were snapped to a different network\./);
});

test('each origin gets its own reachable set, tagged with which origin it came from',()=>{
  const network=net(['a','b','c','d'],[['a','b',100],['c','d',100]]);
  const got=reachableNodes(points(origin('north','a'),origin('south','c')),network,node(),'run','src');
  assert.equal(got.value.features.length,4,'two junctions reachable from each of two origins');
  assert.deepEqual([...new Set(got.value.features.map(f=>f.properties.originSiteId))].sort(),['north','south']);
  assert.deepEqual(got.value.features.map(f=>f.id).sort(),['north-a','north-b','south-c','south-d']);
  assert.match(got.receipt.facts,/fw:originCount 2/);
});

test('the constant speed and the trusted street lengths are both stated',()=>{
  const network=net(['a','b'],[['a','b',100]]);
  const said=reachableNodes(points(origin('s','a')),network,node(),'run','src').value.sourceInfo.notes.join(' ');
  assert.match(said,/no gradient, no crossing, no waiting/);
  assert.match(said,/Street lengths come from the network as supplied \(Test network\) and are not re-measured here/);
  assert.match(said,/unreached because it is too far or because the downloaded network stops short/);
});

test('costsWithin never settles a node beyond the budget',()=>{
  const adjacency=new Map([['a',[{to:'b',lengthM:60}]],['b',[{to:'c',lengthM:60}]]]);
  assert.deepEqual([...costsWithin(adjacency,'a',100).keys()],['a','b'],'c at 120 m is discovered but not reached');
  assert.deepEqual([...costsWithin(adjacency,'a',120).keys()].sort(),['a','b','c']);
});

test('an impossible budget, speed or direction is refused',()=>{
  assert.throws(()=>validateReachNode(node({minutes:0})),/travel time from 0\.1 to 60 minutes/);
  assert.throws(()=>validateReachNode(node({speedMPerMin:NaN})),/speed in metres per minute/);
  assert.throws(()=>validateReachNode(node({direction:'sideways'})),/outbound travel from the site or inbound/);
  assert.throws(()=>validateReachNode(node({label:' '})),/Name the step/);
});

test('snapping then reachability runs on the real Soho network',async()=>{
  // The two primitives in sequence, on the 738-node network the John Snow example
  // already ships, at the parameters its own isochrone uses: 5 min at 75 m/min.
  const {johnSnowExample}=await import('../build/john-snow.js');
  const {snapToNetwork}=await import('../build/network-snap.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pump=example.nodes.find(n=>n.id==='pumps').params.data;
  const snapped=snapToNetwork(pump,network,{id:'s',type:'snap_to_network',x:0,y:0,
    params:{label:'Snap',zone:30,hemisphere:'north',maxSnapM:100}},'run','pumps');
  assert.equal(snapped.value.features.length,1);
  assert.ok(typeof snapped.value.features[0].properties.networkNodeId==='string');
  const got=reachableNodes(snapped.value,network,node({minutes:5,speedMPerMin:75,travelMode:'walking'}),'run','snap');
  const reached=got.value.features.length;
  assert.ok(reached>1&&reached<network.nodes.length,
    `some but not all of 738 junctions are within 375 m of the Broad Street pump, got ${reached}`);
  const costs=got.value.features.map(f=>f.properties.travelMetres);
  // The origin junction costs D1: the walk from where the pump stood to the junction it snapped
  // to. This asserted 0 until 2026-10-14, which was the defect experiment 114 reports -- the
  // displacement was measured, attached as snapDistanceM and published, and then nothing spent
  // it, so every isochrone reached further than its minutes allowed.
  const d1=snapped.value.features[0].properties.snapDistanceM;
  assert.ok(d1>0,`the pump moved to reach a junction, got ${d1}`);
  assert.equal(Math.min(...costs),d1,'reaching the origin junction costs the walk to it');
  assert.ok(Math.max(...costs)<=375,`no junction exceeds the 375 m budget, got ${Math.max(...costs)}`);
  for(const f of got.value.features)
    assert.equal(Number((f.properties.travelMetres+f.properties.remainingM).toFixed(2)),375,
      'travelled plus remaining is the budget, for every junction');
  console.log(`Soho: ${reached} of ${network.nodes.length} junctions within 5 min of the Broad Street pump`);
});

test('a speed only a car could hold is refused when the mode says walking',()=>{
  // 400 m/min is 24 km/h. Labelling that "walking" would put a receipt into the record
  // asserting a pedestrian assumption beside a number no pedestrian holds.
  assert.throws(()=>validateReachNode(node({travelMode:'walking',speedMPerMin:400})),
    /400 m\/min is 24\.0 km\/h, which is outside the plausible range for walking: 30 to 110 m\/min, or 1\.8 to 6\.6 km\/h\. Change the speed, or change the mode to match it\./);
  assert.throws(()=>validateReachNode(node({travelMode:'driving',speedMPerMin:75})),
    /outside the plausible range for driving/);
});

test('the 1854 Soho walking speed is inside the walking band, since that is where it came from',()=>{
  // 75 m/min is 4.5 km/h, Advanced-1 NB03 cell 10.
  assert.doesNotThrow(()=>validateReachNode(node({travelMode:'walking',speedMPerMin:75})));
  assert.ok(75>=MODE_SPEED_BANDS.walking.minMPerMin&&75<=MODE_SPEED_BANDS.walking.maxMPerMin);
});

test('public transport is refused as a mode, with the reason',()=>{
  assert.throws(()=>validateReachNode(node({travelMode:'public-transport'})),
    /Public transport is not a mode here, because it does not follow the street network/);
});

test('the mode and the speed in km per hour travel in the notes and the receipt',()=>{
  const network=net(['a','b'],[['a','b',100]]);
  const got=reachableNodes(points(origin('s','a')),network,node({travelMode:'walking',speedMPerMin:75,minutes:5}),'run','src');
  assert.match(got.receipt.facts,/fw:travelMode "walking"/);
  assert.match(got.receipt.facts,/fw:assumedSpeedMetresPerMinute 75/);
  const said=got.value.sourceInfo.notes.join(' ');
  assert.match(said,/\(4\.5 km\/h, walking\)/,'the km per hour is stated, because that is how speeds are read');
  assert.match(said,/A speed is an assumption about a particular place in a particular period/);
  assert.match(got.receipt.method,/\(walking\)/);
});
