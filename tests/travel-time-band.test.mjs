import test from 'node:test';
import assert from 'node:assert/strict';
import {travelTimeBand,validateBandNode} from '../build/travel-time-band.js';
import {reachableNodes} from '../build/reachable-nodes.js';
import {reachableCorridor} from '../build/reachable-corridor.js';
import {snapToNetwork} from '../build/network-snap.js';
import {isochrone} from '../build/catchments.js';
import {area as turfArea} from '@turf/area';

const band=p=>({id:'b',type:'travel_time_band',x:0,y:0,params:{label:'Band',minutes:5,...p}});
const at=i=>[-0.14+i*0.00144,51.51];
const junction=(nodeId,travelMetres,remainingM,speedMPerMin=75)=>({type:'Feature',id:nodeId,
  properties:{name:nodeId,networkNodeId:nodeId,originSiteId:'o',travelDirection:'outbound',
    travelMetres,remainingM,travelMinutes:Number((travelMetres/speedMPerMin).toFixed(2)),
    speedMPerMin,travelMode:'walking'},
  geometry:{type:'Point',coordinates:at(0)}});
const points=(...features)=>({type:'FeatureCollection',features});

test('a shorter band keeps the near junctions and drops the far ones',()=>{
  // A 15 minute traversal at 75 m/min is 1125 m. A 5 minute band is 375 m.
  const got=travelTimeBand(points(junction('a',0,1125),junction('b',300,825),
    junction('c',900,225)),band(),'r','src');
  assert.deepEqual(got.value.features.map(f=>f.properties.networkNodeId),['a','b']);
  assert.match(got.receipt.facts,/fw:junctionsOffered 3; fw:junctionsInBand 2/);
  assert.match(got.receipt.facts,/fw:bandBudgetMetres 375\.00/);
  assert.match(got.receipt.facts,/fw:traversalBudgetMetres 1125\.00/);
});

test('the budget left at each junction is recomputed against the band, not inherited',()=>{
  // This is the whole reason the band is a primitive rather than an attribute filter.
  const got=travelTimeBand(points(junction('a',0,1125),junction('b',300,825)),band(),'r','src');
  const [a,b]=got.value.features;
  assert.equal(a.properties.remainingM,375,'the origin has the whole band left, not the traversal');
  assert.equal(b.properties.remainingM,75,'375 less the 300 m travelled');
  assert.equal(b.properties.travelMetres,300,'what was travelled does not change');
  assert.match(got.value.sourceInfo.notes.join(' '),
    /Filtering without that would leave the longer traversal’s leftovers in place/);
});

test('a band wider than its traversal is refused, naming both',()=>{
  assert.throws(()=>travelTimeBand(points(junction('a',0,375)),band({minutes:10}),'r','src'),
    /A 10 minute band is longer than the 5\.0 minute traversal it narrows\. Widening is not narrowing/);
});

test('junctions from different traversals are refused rather than mixed',()=>{
  assert.throws(()=>travelTimeBand(points(junction('a',0,1125),junction('b',0,375)),band(),'r','src'),
    /do not share one travel budget/);
  assert.throws(()=>travelTimeBand(points(junction('a',0,1125,75),junction('b',0,1125,100)),band(),'r','src'),
    /carry more than one speed/);
});

test('points that are not reachable junctions are refused',()=>{
  const plain=points({type:'Feature',id:'p',properties:{name:'Clinic'},
    geometry:{type:'Point',coordinates:at(0)}});
  assert.throws(()=>travelTimeBand(plain,band(),'r','src'),
    /Clinic: this point is not a reachable junction/);
  assert.throws(()=>travelTimeBand(points(),band(),'r','src'),
    /Add a Reachable junctions step before this one/);
});

test('a band nothing reaches says how far the nearest junction is',()=>{
  assert.throws(()=>travelTimeBand(points(junction('a',600,525)),band({minutes:1}),'r','src'),
    /No junction is within 1 minutes\. The nearest is 8\.0 minutes away\./);
});

test('an impossible band is refused',()=>{
  assert.throws(()=>validateBandNode(band({minutes:0})),/band from 0\.1 to 60 minutes/);
  assert.throws(()=>validateBandNode(band({label:' '})),/Name the band/);
});

test('one traversal banded four ways reproduces the monolith four thresholds',async()=>{
  // The Soho example draws 1, 5, 10 and 15 minute rings. isochrone recomputes the whole
  // Dijkstra per threshold; this runs one traversal at 15 minutes and bands it four times,
  // each band feeding its own corridor, which is what makes each one a polygon.
  const {johnSnowExample}=await import('../build/john-snow.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
  const thresholds=[1,5,10,15];
  const shared={label:'x',zone:30,hemisphere:'north',speedMPerMin:75,bufferM:25,
    maxSnapM:100,direction:'outbound',fillHoles:false};
  const monolith=isochrone(pumps,network,{...shared,minutes:15,thresholds});

  const snapped=snapToNetwork(pumps,network,{id:'s',type:'snap_to_network',x:0,y:0,
    params:{label:'Snap',zone:30,hemisphere:'north',maxSnapM:100}},'run','pumps');
  const traversal=reachableNodes(snapped.value,network,{id:'r',type:'reachable_nodes',x:0,y:0,
    params:{label:'Reach',minutes:15,speedMPerMin:75,direction:'outbound',travelMode:'walking'}},
    'run','snap');

  console.log(`one traversal: ${traversal.value.features.length} junctions at 15 min`);
  for(const minutes of thresholds){
    const banded=travelTimeBand(traversal.value,band({minutes}),'run','reach');
    const corridor=reachableCorridor(banded.value,network,{id:'c',type:'reachable_corridor',x:0,y:0,
      params:{label:'Corridor',bufferM:25,zone:30,hemisphere:'north'}},'run','band');
    const mine=turfArea(corridor.value.features[0].geometry);
    const theirs=turfArea(monolith.features.find(f=>f.minutes===minutes).geometry);
    const drift=Math.abs(mine-theirs)/theirs;
    console.log(`  ${String(minutes).padStart(2)} min: ${banded.value.features.length
      .toString().padStart(3)} junctions, composed ${mine.toFixed(0)} m2 vs monolith ${
      theirs.toFixed(0)} m2 — ${(drift*1e6).toFixed(1)} ppm`);
    assert.ok(drift<1e-4,`${minutes} min band agrees within 0.01%: ${mine} vs ${theirs}`);
  }
});
