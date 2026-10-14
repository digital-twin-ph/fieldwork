import test from 'node:test';
import assert from 'node:assert/strict';
import {fillInteriorGaps,validateFillNode,utmFromCRS} from '../build/fill-interior-gaps.js';
import {metric} from '../build/catchments.js';
import {area as turfArea} from '@turf/area';

const node=p=>({id:'f',type:'fill_interior_gaps',x:0,y:0,params:{label:'Filled',...p}});
const m=metric(30,'north'),o=m.forward([-0.14,51.51]);
const ring=(x0,y0,s)=>[[0,0],[s,0],[s,s],[0,s],[0,0]].map(([a,b])=>m.inverse([o[0]+x0+a,o[1]+y0+b]));
const layer=(features,crs='EPSG:32630')=>({features,sites:[],method:'test',crs,notes:['upstream note']});
const holed={id:'h',siteId:'s',name:'Corridor',minutes:5,
  geometry:{type:'Polygon',coordinates:[ring(0,0,200),ring(75,75,50).reverse()]}};

test('an enclosed gap becomes solid, and the area it adds is reported',()=>{
  const got=fillInteriorGaps(layer([holed]),node(),'r','src');
  assert.match(got.receipt.facts,/fw:gapsFilled 1/);
  assert.match(got.receipt.facts,/fw:areaBeforeSquareMetres 37500\.00/);
  assert.match(got.receipt.facts,/fw:areaAfterSquareMetres 40000\.00/);
  assert.match(got.receipt.facts,/fw:areaAddedSquareMetres 2500\.00/);
  // Turf measures on the ellipsoid and the widget measures in UTM metres, which differ by
  // about 0.4% at this longitude, so the growth is compared as a ratio rather than a total.
  const grew=turfArea(got.value.features[0].geometry)/turfArea(holed.geometry);
  assert.ok(Math.abs(grew-40000/37500)<1e-3,`area grew by a sixteenth, got ${grew.toFixed(4)}`);
  assert.match(got.value.notes.join(' '),
    /2500 m² is now claimed that was not claimed before/);
});

test('polygons with nothing enclosed are left alone, and say so',()=>{
  const solid={...holed,geometry:{type:'Polygon',coordinates:[ring(0,0,200)]}};
  const got=fillInteriorGaps(layer([solid]),node(),'r','src');
  assert.match(got.receipt.facts,/fw:gapsFilled 0/);
  assert.match(got.receipt.facts,/fw:areaAddedSquareMetres 0\.00/);
  assert.match(got.value.notes.join(' '),/No interior gaps to fill/);
});

test('gaps between separate polygons are not interior, so nothing joins up',()=>{
  const a={...holed,id:'a',geometry:{type:'Polygon',coordinates:[ring(0,0,100)]}};
  const b={...holed,id:'b',geometry:{type:'Polygon',coordinates:[ring(400,0,100)]}};
  const got=fillInteriorGaps(layer([a,b]),node(),'r','src');
  assert.equal(got.value.features.length,2,'still two polygons');
  assert.match(got.receipt.facts,/fw:gapsFilled 0/);
  assert.match(got.value.notes.join(' '),
    /this fills enclosed space, it does not join things up/);
});

test('what distinguished each polygon survives the fill',()=>{
  const got=fillInteriorGaps(layer([holed]),node(),'r','src');
  const f=got.value.features[0];
  assert.equal(f.minutes,5);assert.equal(f.siteId,'s');assert.equal(f.name,'Corridor');
  assert.equal(f.id,'h');
});

test('the metric basis is read from the input, not asked for again',()=>{
  assert.deepEqual(utmFromCRS('EPSG:32630'),{zone:30,hemisphere:'north'});
  assert.deepEqual(utmFromCRS('EPSG:32751'),{zone:51,hemisphere:'south'});
  assert.throws(()=>utmFromCRS('EPSG:4326'),
    /not a UTM zone, so there is no metric basis for measuring what filling would add/);
  assert.throws(()=>fillInteriorGaps(layer([holed],''),node(),'r','src'),/state their coordinate system as nothing/);
  assert.throws(()=>fillInteriorGaps(layer([]),node(),'r','src'),/no polygons to fill/);
  assert.throws(()=>validateFillNode(node({label:' '})),/Name the step/);
});

test('every result warns that later measurement counts the filled ground',()=>{
  const said=fillInteriorGaps(layer([holed]),node(),'r','src').value.notes.join(' ');
  assert.match(said,/That added ground was never computed as covered/);
  assert.match(said,/Anything measuring or summarising these polygons afterwards counts the filled ground too/);
  assert.match(said,/upstream note/,'the upstream notes are kept');
});

test('on the real corridors it matches the monolith and adds up to 5 per cent',async()=>{
  const {johnSnowExample}=await import('../build/john-snow.js');
  const {snapToNetwork}=await import('../build/network-snap.js');
  const {reachableNodes}=await import('../build/reachable-nodes.js');
  const {travelTimeBand}=await import('../build/travel-time-band.js');
  const {reachableCorridor}=await import('../build/reachable-corridor.js');
  const {isochrone}=await import('../build/catchments.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
  const snapped=snapToNetwork(pumps,network,{id:'s',type:'snap_to_network',x:0,y:0,
    params:{label:'S',zone:30,hemisphere:'north',maxSnapM:100}},'r','p');
  const traversal=reachableNodes(snapped.value,network,{id:'r',type:'reachable_nodes',x:0,y:0,
    params:{label:'R',minutes:15,speedMPerMin:75,direction:'outbound',travelMode:'walking'}},'r','s');
  // Expected gap counts, measured 2026-10-10 and re-measured twice on 2026-10-14: first when D1
  // began to be charged (the 5-minute corridor lost three holes, 11 -> 8, because it no longer
  // reaches as far), then when D3 was modelled and the corridor stopped claiming a constant 25 m
  // beyond the budget (5 min 8 -> 6, 10 min 58 -> 54). Recorded so a change in them is noticed,
  // which is what happened, twice. Experiment 114.
  for(const [minutes,gaps] of [[1,0],[5,6],[10,54],[15,81]]){
    const banded=travelTimeBand(traversal.value,
      {id:'b',type:'travel_time_band',x:0,y:0,params:{label:'B',minutes}},'r','r');
    const corridor=reachableCorridor(banded.value,network,{id:'c',type:'reachable_corridor',x:0,y:0,
      params:{label:'C',bufferM:25,zone:30,hemisphere:'north'}},'r','b').value;
    const filled=fillInteriorGaps(corridor,node(),'r','c');
    assert.match(filled.receipt.facts,new RegExp(`fw:gapsFilled ${gaps}\\b`),`${minutes} min gaps`);
    const before=turfArea(corridor.features[0].geometry);
    const after=turfArea(filled.value.features[0].geometry);
    assert.ok(after>=before,'filling never shrinks a polygon');
    assert.ok((after/before-1)<=0.06,`${minutes} min grew by at most 6%`);
    // isochrone's own fillHoles is this operation, so the two should agree.
    const monolith=isochrone(pumps,network,{label:'x',zone:30,hemisphere:'north',minutes,
      speedMPerMin:75,bufferM:25,maxSnapM:100,direction:'outbound',fillHoles:true});
    const theirs=turfArea(monolith.features[0].geometry);
    assert.ok(Math.abs(theirs-after)/theirs<1e-4,
      `${minutes} min agrees with isochrone fillHoles: ${after.toFixed(0)} vs ${theirs.toFixed(0)}`);
  }
});

test('filling changed no death count here, which is a fact about this data',async()=>{
  // The filled ground is the inside of blocks. The recorded deaths front the streets, so
  // they were already within the 25 m corridor and the counts do not move. That is a
  // property of these records, not a guarantee: points away from the street would move.
  const {johnSnowExample}=await import('../build/john-snow.js');
  const {snapToNetwork}=await import('../build/network-snap.js');
  const {reachableNodes}=await import('../build/reachable-nodes.js');
  const {travelTimeBand}=await import('../build/travel-time-band.js');
  const {reachableCorridor}=await import('../build/reachable-corridor.js');
  const {summarizePolygons}=await import('../build/catchments.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
  const deaths=example.nodes.find(n=>n.id==='locations').params.data;
  const snapped=snapToNetwork(pumps,network,{id:'s',type:'snap_to_network',x:0,y:0,
    params:{label:'S',zone:30,hemisphere:'north',maxSnapM:100}},'r','p');
  const traversal=reachableNodes(snapped.value,network,{id:'r',type:'reachable_nodes',x:0,y:0,
    params:{label:'R',minutes:15,speedMPerMin:75,direction:'outbound',travelMode:'walking'}},'r','s');
  // Deaths inside each band, re-measured 2026-10-14 when D1 began to be charged. The budget now
  // pays for the 10.91 m walk from the pump to its junction before any street is walked, so every
  // band is smaller and the shortest is far smaller: the one-minute catchment claimed 48 deaths
  // and holds 35. Thirteen were inside only because the walk onto the network was free.
  //
  // Re-measured again the same day, when D3 was modelled and the corridor stopped claiming a
  // constant 25 m beyond the budget: 1 min 35 -> 21, 5 min 211 -> 201. So 27 of the 48 deaths
  // the one-minute catchment originally claimed were inside only because two of the walk's three
  // segments were free.
  //
  // The third column is the count AFTER filling interior holes, and it is no longer always the
  // same number: at five minutes, filling adds three. This test was named for the fact that
  // filling changed no count on this data, and charging D1 ended that -- which is the thing it
  // was written to notice. Experiment 114.
  for(const [minutes,expected,filledExpected] of [[1,21,21],[5,201,204],[10,250,250],[15,250,250]]){
    const banded=travelTimeBand(traversal.value,
      {id:'b',type:'travel_time_band',x:0,y:0,params:{label:'B',minutes}},'r','r');
    const corridor=reachableCorridor(banded.value,network,{id:'c',type:'reachable_corridor',x:0,y:0,
      params:{label:'C',bufferM:25,zone:30,hemisphere:'north'}},'r','b').value;
    const filled=fillInteriorGaps(corridor,node(),'r','c').value;
    const plainCount=summarizePolygons(corridor,deaths,{label:'D',boundary:'include'}).features[0].count;
    const filledCount=summarizePolygons(filled,deaths,{label:'D',boundary:'include'}).features[0].count;
    assert.equal(plainCount,expected,`${minutes} min unfilled count`);
    assert.equal(filledCount,filledExpected,`${minutes} min filled count`);
  }
});
