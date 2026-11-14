import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPolygonLayers,isPolygonPort,polygonPort} from '../build/polygon-layers.js';
import {validateWorkflow,nodeInputs} from '../build/core.js';

/** A MAP'S POLYGON LAYERS (2026-11-13), since Collect polygon layers retired into Map: one input per layer, collected
 *  as that widget collected them. docs/audits/collect-polygon-layers-retired.md. */
const sq=(id,size)=>({id,siteId:'o',name:id,
  geometry:{type:'Polygon',coordinates:[[[0,0],[size,0],[size,size],[0,size],[0,0]].map(([x,y])=>[-0.14+x*0.001,51.51+y*0.001])]}});
const layer=(...features)=>({features,sites:[],method:'t',crs:'EPSG:4326',notes:['layer note']});

test('layers are collected without merging, larger first, each feature keeping its layer’s name',()=>{
  const got=collectPolygonLayers([layer(sq('small',1)),layer(sq('big',3))],['Sub-districts','The river']);
  assert.deepEqual(got.features.map(f=>f.id),['big','small']);
  assert.deepEqual(got.features.map(f=>f.layerName),['The river','Sub-districts']);
  assert.match(got.notes.join(' '),/nothing is merged/);
});

test('a shared identifier is made distinct, not refused; incomparable coordinate systems are refused',()=>{
  const got=collectPolygonLayers([layer(sq('feature-1',1)),layer(sq('feature-1',2))]);
  assert.equal(new Set(got.features.map(f=>f.id)).size,2);
  assert.throws(()=>collectPolygonLayers([layer(sq('a',1)),{...layer(sq('b',1)),crs:'EPSG:32630'}]),/different coordinate systems/);
});

test('the numbered ports follow the point-layer convention, and a map declares as many as it holds',()=>{
  assert.equal(polygonPort(0),'polygons');assert.equal(polygonPort(1),'polygons_2');
  assert.ok(isPolygonPort('polygons_6')&&!isPolygonPort('polygons_7'));
  const map={id:'m',type:'map_output',x:0,y:0,params:{label:'Map',polygonInputCount:3}};
  assert.deepEqual(nodeInputs(map).filter(([,t])=>t==='polygons').map(([p])=>p),['polygons','polygons_2','polygons_3']);
});

const poly=id=>({id,type:'polygon_input',x:0,y:0,params:{label:id,data:{features:[]}}});
const saved=(edges,extra=[])=>({schema:'fieldwork/workflow/1',name:'old',nodes:[poly('a'),poly('b'),
  {id:'k',type:'stack_polygons',x:0,y:0,params:{label:'Collected'}},{id:'m',type:'map_output',x:0,y:0,params:{label:'Map'}},...extra],edges});

test('a saved collector feeding a map is rewritten: each layer on the map’s own input, in order',()=>{
  const w=validateWorkflow(saved([{id:'1',from:'a',to:'k',port:'polygons'},{id:'2',from:'b',to:'k',port:'polygons_2'},{id:'3',from:'k',to:'m',port:'polygons'}]));
  assert.ok(!w.nodes.some(n=>n.type==='stack_polygons'));
  assert.deepEqual(w.edges.filter(e=>e.to==='m').map(e=>[e.from,e.port]),[['a','polygons'],['b','polygons_2']]);
  const map=w.nodes.find(n=>n.id==='m');
  assert.equal(map.params.polygonInputCount,2);
  assert.equal(map.sourceMigration.fromType,'stack_polygons');
});

test('a saved collector feeding anything but a map is refused, and named',()=>{
  assert.throws(()=>validateWorkflow(saved([{id:'1',from:'a',to:'k',port:'polygons'},{id:'2',from:'k',to:'s',port:'polygons'}],
    [{id:'s',type:'summarize_polygons',x:0,y:0,params:{label:'Deaths per band',boundary:'include'}}])),
    /"Collected" is a retired Collect polygon layers step feeding "Deaths per band"/);
});
