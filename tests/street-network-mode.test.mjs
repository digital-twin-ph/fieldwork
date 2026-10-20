import test from 'node:test';
import assert from 'node:assert/strict';
import {osmQuery,networkFromOSM,WALKABLE_HIGHWAYS,DRIVABLE_HIGHWAYS,MODE_FILTERS} from '../build/street-network.js';
import {refuseModeMismatch} from '../build/reachable-nodes.js';

// The practitioner, 2026-10-20, before downloading Bunia a second time: "I want to be able to set
// driving mode on the street network." Until that day there was one filter and it was a walking
// one, so a driving question was asked of a graph that excluded motorways and trunk roads and
// included steps.
const AREA={type:'Polygon',coordinates:[[[29.63,1.55],[29.65,1.55],[29.65,1.57],[29.63,1.57],[29.63,1.55]]]};

test('the query asks for the mode it was given, and the mode is part of the cache key',()=>{
  const walk=osmQuery(AREA,250,2000,'walking'),drive=osmQuery(AREA,250,2000,'driving');
  assert.equal(walk.mode,'walking');
  assert.equal(drive.mode,'driving');
  assert.match(walk.query,/footway/);
  assert.doesNotMatch(walk.query,/motorway/);
  assert.match(drive.query,/motorway\|motorway_link\|trunk/);
  assert.doesNotMatch(drive.query,/footway|steps|pedestrian/);
  // Same bounds, different text: a driving download can never be served a cached walking graph.
  assert.notEqual(walk.query,drive.query);
  assert.deepEqual(walk.bounds,drive.bounds);
});

test('walking remains the default, so a saved workflow downloads what it always did',()=>{
  assert.equal(osmQuery(AREA,250,2000).query,osmQuery(AREA,250,2000,'walking').query);
});

test('an unknown mode is refused by name rather than filtered as something else',()=>{
  assert.throws(()=>osmQuery(AREA,250,2000,'flying'),/not a street network travel mode/);
});

// One motorway (cars only), one footway (feet only), one residential street tagged one-way for
// vehicles, and a roundabout with no `oneway` tag at all.
const RAW={elements:[
  {type:'node',id:1,lon:29.640,lat:1.560},{type:'node',id:2,lon:29.641,lat:1.560},
  {type:'node',id:3,lon:29.642,lat:1.560},{type:'node',id:4,lon:29.643,lat:1.560},
  {type:'node',id:5,lon:29.644,lat:1.560},{type:'node',id:6,lon:29.645,lat:1.560},
  {type:'way',id:100,nodes:[1,2],tags:{highway:'motorway'}},
  {type:'way',id:101,nodes:[2,3],tags:{highway:'footway'}},
  {type:'way',id:102,nodes:[3,4],tags:{highway:'residential',oneway:'yes'}},
  {type:'way',id:103,nodes:[4,5],tags:{highway:'residential',junction:'roundabout'}},
  {type:'way',id:104,nodes:[5,6],tags:{highway:'residential','oneway:foot':'yes'}},
]};
const pair=(network,from,to)=>network.edges.filter(e=>e.from==='osm-'+from&&e.to==='osm-'+to).length;

test('a driving graph keeps the motorway, drops the footway, and honours vehicle one-ways',()=>{
  const network=networkFromOSM(RAW,2000,'driving');
  assert.equal(pair(network,1,2),1,'the motorway is in a driving graph');
  assert.equal(pair(network,2,1),1,'and is traversable both ways');
  assert.equal(pair(network,2,3),0,'the footway is not');
  assert.equal(pair(network,3,4),1);
  assert.equal(pair(network,4,3),0,'oneway=yes binds a vehicle');
  assert.equal(pair(network,4,5),1);
  assert.equal(pair(network,5,4),0,'a roundabout is one-way with no oneway tag');
  assert.equal(pair(network,6,5),1,'oneway:foot does not bind a vehicle');
  assert.match(network.source,/driving filter v1/);
  assert.match(network.source,/no posted speed limits/);
});

test('a walking graph is unchanged by any of it',()=>{
  const network=networkFromOSM(RAW,2000,'walking');
  assert.equal(pair(network,1,2),0,'a motorway is not walkable by this filter');
  assert.equal(pair(network,2,3),1,'the footway is');
  assert.equal(pair(network,4,3),1,'a vehicle oneway does not bind a walker');
  assert.equal(pair(network,5,4),1,'and neither does a roundabout');
  assert.equal(pair(network,5,6),1);
  assert.equal(pair(network,6,5),0,'oneway:foot does');
  assert.match(network.source,/walking filter v1/);
});

test('a barrier is consulted with the tag that belongs to the mode',()=>{
  const bollard={elements:[...RAW.elements,{type:'node',id:4,lon:29.643,lat:1.560,tags:{barrier:'bollard',foot:'yes'}}]};
  assert.equal(pair(networkFromOSM(bollard,2000,'walking'),3,4),1,'foot=yes lets a walker through');
  assert.equal(pair(networkFromOSM(bollard,2000,'driving'),3,4),0,'and says nothing about a car');
});

test('motor_vehicle=no removes a road from a driving graph and not from a walking one',()=>{
  const closed={elements:[...RAW.elements.filter(e=>e.id!==102),
    {type:'way',id:102,nodes:[3,4],tags:{highway:'residential',motor_vehicle:'no'}}]};
  assert.equal(pair(networkFromOSM(closed,2000,'driving'),3,4),0);
  assert.equal(pair(networkFromOSM(closed,2000,'walking'),3,4),1);
});

test('the two filters share the ordinary streets and part company at both ends',()=>{
  const walk=new Set(WALKABLE_HIGHWAYS),drive=new Set(DRIVABLE_HIGHWAYS);
  const shared=[...walk].filter(h=>drive.has(h));
  // Most of the LIST is shared -- nine of fifteen values, the ordinary road classes. The lists are
  // not where the two graphs diverge; the data is. Measured 2026-10-20 on the Soho walk graph this
  // repository ships, the six walking-only values carry 56.7% of its edges and 48.1% of its length.
  assert.equal(shared.length,9);
  assert.equal([...walk].filter(h=>!drive.has(h)).length,6);
  assert.equal([...drive].filter(h=>!walk.has(h)).length,5);
  for(const only of ['footway','steps','path','pedestrian'])assert.ok(walk.has(only)&&!drive.has(only));
  for(const only of ['motorway','trunk','motorway_link'])assert.ok(drive.has(only)&&!walk.has(only));
  assert.equal(MODE_FILTERS.walking.onewayTag,'oneway:foot');
  assert.equal(MODE_FILTERS.driving.onewayTag,'oneway');
});

test('a declared travel mode the graph cannot carry is refused, naming both and the way out',()=>{
  const walkGraph={nodes:[],edges:[],source:'x',provenance:{travelMode:'walking'}};
  assert.throws(()=>refuseModeMismatch(walkGraph,'driving'),/downloaded for walking/);
  assert.throws(()=>refuseModeMismatch(walkGraph,'driving'),/Download and save OSM network/);
  const driveGraph={nodes:[],edges:[],source:'x',provenance:{travelMode:'driving'}};
  assert.throws(()=>refuseModeMismatch(driveGraph,'walking'),/downloaded for driving/);
  assert.throws(()=>refuseModeMismatch(driveGraph,'cycling'),/downloaded for driving/);
});

test('a graph with no recorded mode contradicts nothing, so an imported file still runs',()=>{
  for(const mode of ['walking','driving','cycling','other'])
    refuseModeMismatch({nodes:[],edges:[],source:'prepared elsewhere'},mode);
  refuseModeMismatch({nodes:[],edges:[],source:'x',provenance:{provider:'OpenStreetMap'}},'driving');
  // Nor does a mode with no download of its own disagree with a walking graph.
  refuseModeMismatch({nodes:[],edges:[],source:'x',provenance:{travelMode:'walking'}},'cycling');
  refuseModeMismatch({nodes:[],edges:[],source:'x',provenance:{travelMode:'walking'}},'other');
});
