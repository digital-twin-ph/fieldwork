/** A MAP DRAWS EVERY LAYER IT IS GIVEN, and a named layer is told apart by hue.
 *
 *  Reported 2026-10-28 against a map carrying a study area, four points and a polygon layer:
 *  *"Map only shows tidal and non-tidal waterway polygons; workflow shows much more connected but
 *  did not show up as layers."* The map's value was built from whichever mode won, and the
 *  Sources line beneath it was built from the edges -- so the caption named three sources over a
 *  figure drawing one. The same defect took the study area on 2026-10-20, the facilities on
 *  2026-10-22 and the raster on 2026-10-23. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkflow,executeWorkflow,requiredInputs,nodeInputs} from '../build/core.js';
import {categoricalSteps,FIGURE_PALETTE} from '../build/presentation.js';

import {blankWorkflow,newStudyArea,bboxPolygon} from '../build/study-area.js';

const ready=async()=>[{subject:'urn:fieldwork:area:extent',
  predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];
const ring=(x,y,d)=>[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]];
const layer=(id,name,x)=>({id,name,geometry:{type:'Polygon',coordinates:[ring(x,51.45,.01)]},
  properties:{reach:name}});

const workflow=()=>{
  const w=blankWorkflow();
  w.nodes=[
    {...newStudyArea(),id:'extent',x:20,y:20},
    {id:'points',type:'point_input',x:20,y:200,params:{label:'Intakes',data:{type:'FeatureCollection',
      features:[{type:'Feature',id:'p1',properties:{name:'Teddington Lock'},
        geometry:{type:'Point',coordinates:[-0.2,51.452]}}]}}},
    {id:'river',type:'polygon_input',x:20,y:380,params:{label:'The Thames',nameField:'reach',
      data:{features:[layer('tidal','tidal',-0.25),layer('non-tidal','non-tidal',-0.2)]}}},
    {id:'map',type:'map_output',x:400,y:100,params:{label:'Ground',presentation:'interactive'}},
  ];
  w.nodes[0].params={...w.nodes[0].params,label:'Extent',selectionMode:'bbox',
    geometry:bboxPolygon(-0.3,51.4,-0.1,51.5)};
  w.edges=[{id:'a',from:'extent',to:'map',port:'area'},
    {id:'b',from:'points',to:'map',port:'points'},
    {id:'c',from:'river',to:'map',port:'polygons'}];
  return w;
};

test('polygons do not evict the study area and the points wired beside them',async()=>{
  const run=await executeWorkflow(validateWorkflow(workflow()),ready);
  const out=run.outputs.find(o=>o.nodeId==='map');
  assert.equal(out.polygons.features.length,2,'the polygon layer is drawn');
  assert.ok(out.boundary,'and so is the study area it sits on');
  assert.equal(out.rows.length,1,'and so is every point wired beside it');
  assert.equal(out.rows[0].name,'Teddington Lock');
  assert.equal(out.pointLayers.length,1,'the layer control has a layer to list');
});

test('the receipt says the area and the points were drawn, not only the polygons',async()=>{
  const run=await executeWorkflow(validateWorkflow(workflow()),ready);
  const receipt=run.receipts.find(r=>r.nodeId==='map');
  assert.match(receipt.method,/Drawn over the connected study area/);
  assert.match(receipt.method,/1 point layer wired beside it/);
  // The polygon presentation's own facts survive: this is one receipt, not a replacement.
  assert.match(receipt.facts,/urn:fieldwork:run:/);
});

test('a map with polygons alone still draws them',async()=>{
  const w=workflow();
  w.edges=w.edges.filter(e=>e.port==='polygons');
  const run=await executeWorkflow(validateWorkflow(w),ready);
  const out=run.outputs.find(o=>o.nodeId==='map');
  assert.equal(out.polygons.features.length,2);
  // `rows` is one row per POLYGON on this path -- the table a polygon layer offers -- so the
  // thing to check is that no study area and no point layer were invented for a map that was
  // given neither.
  assert.equal(out.boundary,undefined);
  assert.equal(out.pointLayers,undefined);
});

/** Two reaches of a river have no order, and were drawn in one colour. */
test('named regions get categorical hues, and only while the hues stay distinct',()=>{
  assert.deepEqual(categoricalSteps(2),[FIGURE_PALETTE[0],FIGURE_PALETTE[1]]);
  assert.equal(new Set(categoricalSteps(FIGURE_PALETTE.length)).size,FIGURE_PALETTE.length,
    'every hue is distinct up to the palette');
  // PAST THE PALETTE THERE IS NO CATEGORICAL FIGURE. Cycling would hand four of South London's
  // 33 sub-districts the same hue, and a repeated colour reads as a grouping nobody asserted.
  assert.equal(categoricalSteps(FIGURE_PALETTE.length+1),null);
  assert.equal(categoricalSteps(0),null);
});

test('the key names the regions drawn, not a modelled catchment',async()=>{
  const run=await executeWorkflow(validateWorkflow(workflow()),ready);
  const out=run.outputs.find(o=>o.nodeId==='map');
  const w=validateWorkflow(workflow());
  const key=mapPresentation(w.nodes.find(n=>n.id==='map'),out,w);
  const labels=key.items.map(i=>i.label);
  assert.deepEqual(labels,['tidal','non-tidal']);
  // THE THIRD REPORT OF A STALE KEY on this widget. The fallback named three things the figure
  // does not draw, and was left in place twice while the case in front of it was fixed.
  for(const stale of ['Modeled catchment','Observations','Sites'])
    assert.ok(!labels.includes(stale),`"${stale}" is not on this map`);
  assert.equal(new Set(key.items.map(i=>i.color)).size,2,'and the two hues differ');
});

/** A collector that required every slot could never be used. */
test('collecting polygon layers needs one layer, not six',()=>{
  const node={type:'stack_polygons',params:{label:'Collected'}};
  assert.equal(nodeInputs(node).length,6,'six slots are offered');
  assert.deepEqual(requiredInputs(node),[['polygons','polygons']],'and one is required');
});

/** THE DESCRIPTION IS THE SOURCE, AND THE RECEIPT CAN BE ASKED ABOUT IT.
 *
 *  The practitioner, 2026-10-29: *"Let's begin with the ontology representation in mind so the
 *  exhaust becomes more logical and can be queried after render."* These ask of a finished run
 *  exactly what experiment 148 says must be answerable from the receipt alone: which layers, in
 *  what order, under what names, and in which groups. */
import {mapLayerList,validateLayerSettings,assertSomethingToDraw} from '../build/map-layer-list.js';
import {mapSpecificationFacts,mapPresentation} from '../build/map-communication.js';

const mapWith=(params={})=>{
  const w=blankWorkflow();
  w.nodes=[{...newStudyArea(),id:'extent',x:20,y:20},
    {id:'where',type:'map_output',x:400,y:100,params:{label:'Where',...params}}];
  w.nodes[0].params={...w.nodes[0].params,label:'South London',selectionMode:'bbox',
    geometry:bboxPolygon(-0.26,51.41,-0.03,51.51)};
  w.edges=[{id:'a',from:'extent',to:'where',port:'area'}];
  return w;
};

test('every drawable wired port becomes a layer, and a kind never refuses one', () => {
  const w=mapWith();
  const list=mapLayerList(w.nodes[1],w.edges,id=>w.nodes.find(n=>n.id===id)?.params.label);
  assert.equal(list.length,1);
  assert.equal(list[0].kind,'AreaLayer');
  // The node's own label, not the port name: the words the practitioner already chose.
  assert.equal(list[0].label,'South London');
  assert.equal(list[0].drawn,true);
  assert.equal(list[0].origin,'port');
});

test('a layer added to a group nobody declared is refused, and the message says to declare it', () => {
  const node={id:'where',type:'map_output',params:{label:'Where',layers:{area:{group:'g1'}}}};
  assert.throws(()=>validateLayerSettings(node),/not declared on this map/);
  node.params.layerGroups=[{id:'g1',label:'Water',index:0}];
  assert.doesNotThrow(()=>validateLayerSettings(node));
});

test('a declared group is one thing to rename, and moves as a block', () => {
  const w=mapWith({layerGroups:[{id:'g1',label:'Water',index:0}],
    layers:{area:{group:'g1',label:'The extent'}}});
  const node=w.nodes[1];
  const list=mapLayerList(node,w.edges,id=>w.nodes.find(n=>n.id===id)?.params.label);
  assert.equal(list[0].group.label,'Water');
  assert.equal(list[0].label,'The extent');
  // Renaming the group is one edit, not one per member: the layer carries a reference.
  node.params.layerGroups[0].label='Water features';
  const again=mapLayerList(node,w.edges,id=>w.nodes.find(n=>n.id===id)?.params.label);
  assert.equal(again[0].group.label,'Water features');
});

test('a map with every layer switched off refuses, and says where to switch one back on', () => {
  assert.throws(()=>assertSomethingToDraw([{id:'area',drawn:false}],'Where'),/Manage layers/);
  assert.doesNotThrow(()=>assertSomethingToDraw([{id:'area',drawn:true}],'Where'));
});

test('the receipt states the layers the renderer read, queryable by name, order and group', async () => {
  const w=mapWith({layerGroups:[{id:'g1',label:'Water',index:0}],
    layers:{area:{group:'g1',label:'The study extent'}}});
  const run=await executeWorkflow(validateWorkflow(w),ready);
  const output=run.outputs.find(o=>o.nodeId==='where');
  assert.ok(output.mapLayers?.length,'the run attaches the layer list to the value');
  const node=w.nodes.find(n=>n.id==='where');
  const n3=mapSpecificationFacts(node,output,w,'r1',
    {nodeId:'where',kind:'presentation',facts:'',input:'',rules:'',conclusions:[]});
  // What a reader of the receipt alone can now answer.
  assert.match(n3,/fw:layerLabel "The study extent"/);
  assert.match(n3,/fw:layerIndex 0/);
  assert.match(n3,/fw:layerDrawn true/);
  assert.match(n3,/a fw:LayerGroup; fw:groupLabel "Water"; fw:groupIndex 0/);
  assert.match(n3,/fw:layerGroup </);
  assert.match(n3,/fw:layerKind <urn:fieldwork:AreaLayer>/);
});
