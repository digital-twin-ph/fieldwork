import test from 'node:test';
import assert from 'node:assert/strict';
import {stackPolygons,validateStackNode,isPolygonPort,polygonPort} from '../build/stack-polygons.js';
import {travelTimeBand} from '../build/travel-time-band.js';
import {reachableCorridor} from '../build/reachable-corridor.js';
import {reachableNodes} from '../build/reachable-nodes.js';
import {snapToNetwork} from '../build/network-snap.js';
import {summarizePolygons} from '../build/catchments.js';
import {area as turfArea} from '@turf/area';

const node=p=>({id:'k',type:'stack_polygons',x:0,y:0,params:{label:'Collected',...p}});
const sq=(id,size,minutes)=>({id,siteId:'o',name:id,
  ...(minutes===undefined?{}:{minutes}),
  geometry:{type:'Polygon',coordinates:[[[0,0],[size,0],[size,size],[0,size],[0,0]]
    .map(([x,y])=>[-0.14+x*0.001,51.51+y*0.001])]}});
const layer=(...features)=>({features,sites:[],method:'t',crs:'EPSG:32630',notes:['layer note']});

test('polygons are collected without merging, largest first',()=>{
  const got=stackPolygons([layer(sq('small',1)),layer(sq('big',3))],node(),'r',['a','b']);
  assert.deepEqual(got.value.features.map(f=>f.id),['big','small'],'largest draws first');
  assert.equal(got.value.features.length,2,'nothing merged');
  assert.match(got.receipt.facts,/fw:layerCount 2; fw:polygonCount 2/);
  assert.match(got.value.notes.join(' '),/Nothing is merged/);
});

test('bands are recognised and the cumulative warning is stated',()=>{
  const got=stackPolygons([layer(sq('t1',1,1)),layer(sq('t5',3,5))],node(),'r',['a','b']);
  assert.match(got.receipt.facts,/fw:bandedPolygonCount 2/);
  assert.match(got.value.notes.join(' '),
    /these are nested bands: each contains every shorter one\. A count per band is cumulative/);
});

test('incomparable layers and duplicate identifiers are refused',()=>{
  const other={...layer(sq('x',1)),crs:'EPSG:32651'};
  assert.throws(()=>stackPolygons([layer(sq('a',1)),other],node(),'r',['a','b']),
    /computed in different coordinate systems/);
  assert.throws(()=>stackPolygons([layer(sq('same',1)),layer(sq('same',2))],node(),'r',['a','b']),
    /share an identifier, so they cannot be told apart/);
  assert.throws(()=>stackPolygons([],node(),'r',[]),/at least one polygon layer/);
  assert.throws(()=>validateStackNode(node({label:' '})),/Name the collection/);
});

test('the numbered ports follow the point-layer convention',()=>{
  assert.equal(polygonPort(0),'polygons');
  assert.equal(polygonPort(1),'polygons_2');
  assert.ok(isPolygonPort('polygons')&&isPolygonPort('polygons_6'));
  assert.ok(!isPolygonPort('polygons_7')&&!isPolygonPort('points'));
});

test('four bands reach one map layer, and the deaths count per band as the notebook does',async()=>{
  // The whole output stage: one traversal, four bands, four corridors, collected into one
  // layer, with the 250 recorded death locations counted in each. NB04 counts the same way
  // and then subtracts neighbouring bands, which is what its bar chart shows.
  const {johnSnowExample}=await import('../build/john-snow.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
  const deaths=example.nodes.find(n=>n.id==='locations').params.data;

  const snapped=snapToNetwork(pumps,network,{id:'s',type:'snap_to_network',x:0,y:0,
    params:{label:'Snap',zone:30,hemisphere:'north',maxSnapM:100}},'run','pumps');
  const traversal=reachableNodes(snapped.value,network,{id:'r',type:'reachable_nodes',x:0,y:0,
    params:{label:'Reach',minutes:15,speedMPerMin:75,direction:'outbound',travelMode:'walking'}},
    'run','snap');

  const layers=[1,5,10,15].map(minutes=>{
    const banded=travelTimeBand(traversal.value,
      {id:'b',type:'travel_time_band',x:0,y:0,params:{label:`Band ${minutes}`,minutes}},'run','r');
    return reachableCorridor(banded.value,network,{id:`c${minutes}`,type:'reachable_corridor',x:0,y:0,
      params:{label:`Corridor ${minutes}`,bufferM:25,zone:30,hemisphere:'north'}},'run','b').value;
  });
  const stacked=stackPolygons(layers,node(),'run',['c1','c5','c10','c15']);
  assert.equal(stacked.value.features.length,4,'four bands in one layer');
  assert.deepEqual(stacked.value.features.map(f=>f.minutes),[15,10,5,1],'largest first');

  const summary=summarizePolygons(stacked.value,deaths,{label:'Deaths per band',boundary:'include'});
  const counts=new Map(summary.features.map(f=>[f.minutes,f.count]));
  const order=[1,5,10,15];
  console.log(`  ${deaths.features.length} death locations, counted in each band`);
  let previous=0;
  for(const minutes of order){
    const cumulative=counts.get(minutes);
    console.log(`   ${String(minutes).padStart(2)} min: ${String(cumulative).padStart(3)} cumulative`
      +`, ${String(cumulative-previous).padStart(3)} in this band alone`);
    assert.ok(cumulative>=previous,`band counts never decrease outward: ${minutes} min`);
    previous=cumulative;
  }
  assert.equal(counts.get(15),order.reduce((n,m)=>Math.max(n,counts.get(m)),0),
    'the widest band holds the most, because the bands are nested');
  // Nested geometry too, not just nested counts.
  const areas=order.map(m=>turfArea(stacked.value.features.find(f=>f.minutes===m).geometry));
  for(let i=1;i<areas.length;i++)
    assert.ok(areas[i]>areas[i-1],'each band encloses more ground than the one inside it');
});
