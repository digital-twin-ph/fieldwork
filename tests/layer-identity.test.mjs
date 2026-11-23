import test from 'node:test';
import assert from 'node:assert/strict';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {syncProjectManifest} from '../build/project-manifest.js';

const ready=async()=>[{subject:'urn:fieldwork:area:area',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];
const run=async workflow=>{syncProjectManifest(workflow);
  return executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),ready);};

// The practitioner, 2026-10-20, with an OSM search and an Overture search on one map, each
// clipped to the study area: *"Map still does not distinguish the two facility sources as layers."*
// Both layers were named "Points inside the area" -- the CLIP's default label -- because a layer's
// identity came from the node plugged into the map rather than from the data, which has carried
// its own sourceNodeId all along.
const area={
  id:'area',type:'study_area',x:0,y:0,
  params:{label:'My study area',source:'drawn',selectionMode:'polygon',geometry:{type:'Polygon',coordinates:[[[0,0],[0,2],[2,2],[2,0],[0,0]]]}},
};
const points=(id,label,coords)=>({
  id,type:'point_input',x:0,y:0,
  params:{label,fields:[],data:{type:'FeatureCollection',features:coords.map(([x,y],i)=>
    ({type:'Feature',id:`${id}-${i}`,properties:{name:`${label} ${i}`},geometry:{type:'Point',coordinates:[x,y]}}))}},
});
const clip=id=>({id,type:'clip_points_to_area',x:0,y:0,params:{label:'Points inside the area',keepBoundary:true}});

test('a layer is named for where its points came from, not for what is plugged in',async()=>{
  const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Layers',nodes:[
    area,
    points('osm','OSM Health Facilities',[[1,1],[3,3]]),
    points('overture','Overture Health Facilities',[[0.5,0.5]]),
    clip('clip-a'),clip('clip-b'),
    {id:'map',type:'map_output',x:0,y:0,params:{label:'Map of Health Facilities',pointInputCount:2}},
  ],edges:[
    {id:'e1',from:'area',to:'clip-a',port:'area'},{id:'e2',from:'osm',to:'clip-a',port:'points'},
    {id:'e3',from:'area',to:'clip-b',port:'area'},{id:'e4',from:'overture',to:'clip-b',port:'points'},
    {id:'e5',from:'area',to:'map',port:'area'},
    {id:'e6',from:'clip-a',to:'map',port:'points'},{id:'e7',from:'clip-b',to:'map',port:'points_2'},
  ]};
  const result=await run(workflow);
  const map=result.outputs.find(o=>o.nodeId==='map');
  const receipt=result.receipts.find(r=>r.nodeId==='map');
  assert.ok(map,'the map produced an output');

  // Named for the searches, not twice for the clip they both pass through.
  assert.deepEqual(map.pointLayers.map(l=>l.label).sort(),
    ['OSM Health Facilities','Overture Health Facilities']);
  assert.deepEqual(map.pointLayers.map(l=>l.sourceNodeId).sort(),['osm','overture']);

  // Two layers, so two symbols, and they differ in BOTH channels: a reader who cannot separate
  // the hues still has two marks.
  const symbols=Object.values(map.layerSymbols);
  assert.equal(symbols.length,2);
  assert.notEqual(symbols[0].colour,symbols[1].colour);
  assert.notEqual(symbols[0].shape,symbols[1].shape);

  // And the receipt attributes each record to the search it came from, not to the clip.
  assert.match(receipt.facts,/urn:fieldwork:source:osm/);
  assert.match(receipt.facts,/urn:fieldwork:source:overture/);
  assert.doesNotMatch(receipt.facts,/urn:fieldwork:source:clip-/);
});

test('a layer with no carried identity still falls back to what is connected',async()=>{
  const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Layers',nodes:[
    area,points('osm','OSM Health Facilities',[[1,1]]),
    {id:'map',type:'map_output',x:0,y:0,params:{label:'Map'}},
  ],edges:[
    {id:'e1',from:'area',to:'map',port:'area'},{id:'e2',from:'osm',to:'map',port:'points'},
  ]};
  const map=(await run(workflow)).outputs.find(o=>o.nodeId==='map');
  assert.deepEqual(map.pointLayers.map(l=>l.label),['OSM Health Facilities']);
});

// AND THE STACK IS KEYED BY THE SAME IDENTITY. Reported 2026-11-23, with one mine pin and 1,171
// bat records clipped to the DRC's provinces: *"This workflow keeps bat sites inside DRC ADM1
// polygons but loses the mines push pin... I tried layers, putting mines as top layer on map but
// did not work."* The pin was drawn and buried. `mapLayerList` keyed each layer by the edge's
// `from` while the marks were keyed by the identity the data carries, so for a clipped layer the
// two names disagreed -- and `layerRanks` lifts a layer it cannot find above every layer it can,
// which is exactly why reordering changed nothing.
test('the layer stack is keyed by the identity the data carries, so a clipped layer can be moved',async()=>{
  const many=Array.from({length:12},(_,i)=>[0.4+i*0.1,0.4]);
  const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Stack',nodes:[
    area,points('mine','Mines',[[1,1]]),points('bats','Bats',many),clip('clip'),
    {id:'map',type:'map_output',x:0,y:0,params:{label:'Map',pointInputCount:2}},
  ],edges:[
    {id:'e1',from:'area',to:'clip',port:'area'},{id:'e2',from:'bats',to:'clip',port:'points'},
    {id:'e3',from:'area',to:'map',port:'area'},
    {id:'e4',from:'mine',to:'map',port:'points'},{id:'e5',from:'clip',to:'map',port:'points_2'},
  ]};
  const map=(await run(workflow)).outputs.find(o=>o.nodeId==='map');
  const stack=map.mapLayers.filter(l=>l.kind==='PointsLayer');
  assert.deepEqual(stack.map(l=>l.sourceNodeId),['bats','mine'],
    'the clipped layer is listed as the input it came from, not as the clip');
  // THE SMALLER LAYER ON TOP by default: one pin under twelve marks is a map that answers nothing.
  assert.deepEqual(stack.map(l=>l.label),['Bats','Mines']);
  // Every drawn mark can now be found in the list, which is what makes Manage layers effective.
  const named=new Set(map.mapLayers.map(l=>l.sourceNodeId));
  for(const row of map.rows)assert.ok(named.has(row.sourceNodeId),`${row.sourceNodeId} is in the layer list`);
});
