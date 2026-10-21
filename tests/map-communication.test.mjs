import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store,DataFactory} from 'n3';
import {mapPresentation,standaloneMapSvg,mapSpecificationFacts} from '../build/map-communication.js';
import {mapOutput} from '../build/map-output.js';
import {coverageExercise} from '../build/spatial-coverage.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';

test('Map presentation is independent of geometry and emits a validated, source-linked plan',async()=>{
  const workflow=coverageExercise();workflow.nodes=workflow.nodes.slice(0,2);
  const node={id:'map',type:'map_output',x:0,y:0,params:{label:'Result tab',mapTitle:'Old Naledi & observations',mapSubtitle:'Synthetic teaching records',mapSourceNote:'Synthetic data <local>; method: point-in-polygon',showLegend:true}};
  workflow.nodes.push(node);workflow.edges=[{id:'a',from:'scope',to:'map',port:'area'},{id:'b',from:'observations',to:'map',port:'points'}];
  const boundary=workflow.nodes[0].params.geometry,points=workflow.nodes[1].params.data;
  const mapped=mapOutput(node,{area:{boundary,areaId:'urn:fieldwork:area:scope',geometryId:'urn:fieldwork:geometry:scope',label:'Old Naledi'},points:{sourceNodeId:'observations',label:'Synthetic coverage records',features:points.features}},'run');
  const output={...mapped.value,nodeId:'map',label:'Result tab',view:'map'},before=structuredClone(output);
  const spec=mapPresentation(node,output,workflow);
  assert.equal(spec.title,'Old Naledi & observations');
  // The legend is the LAYERS first, each in its own mark and hue, then the relations in the fill
  // channel. It used to open with 'Outside boundary' in a hue of its own, which was the encoding
  // hue carried before one overlay per source arrived.
  assert.equal(spec.items[0].label,'Synthetic coverage records (4)');
  assert.equal(spec.items[0].shape,'circle');
  assert.deepEqual(spec.items.slice(1).map(i=>i.label),
    ['Inside / on the boundary (filled)','Outside the boundary (hollow)','Missing location (not plotted)']);
  assert.equal(spec.items.find(i=>i.hollow)?.label,'Outside the boundary (hollow)');
  const svg=standaloneMapSvg('<rect width="850" height="295"/>','0 0 850 295',spec);
  assert.match(svg,/<title>Old Naledi &amp; observations<\/title>/);assert.match(svg,/Synthetic data &lt;local&gt;/);
  assert.match(svg,/Inside \/ on the boundary/);
  // The export draws the marks, not a rectangle-or-circle choice: one path per legend entry.
  assert.equal([...svg.matchAll(/<path d="M/g)].length>=spec.items.length,true);
  assert.deepEqual(output,before);
  mapSpecificationFacts(node,output,workflow,'run',mapped.receipt);
  const graph=new Store(new Parser().parse(mapped.receipt.facts));
  assert.equal((await validateGraph(graph)).conforms,true);
  assert.equal([...graph.match(null,DataFactory.namedNode('urn:fieldwork:mapSpecification'),null)].length,1);
  assert.equal([...graph.match(null,DataFactory.namedNode('urn:fieldwork:mapBasemap'),null)][0].object.value,'none');
  const subject=DataFactory.namedNode('urn:fieldwork:run:run:map-specification:map'),predicate=DataFactory.namedNode('urn:fieldwork:mapSourceNote');
  graph.removeMatches(subject,predicate,null);assert.equal((await validateGraph(graph)).conforms,false);
  const bad=structuredClone(workflow);bad.nodes.at(-1).params.showLegend='sometimes';
  const {validateWorkflow}=await import('../build/core.js');assert.throws(()=>validateWorkflow(bad),/Invalid map presentation/);
  bad.nodes.at(-1).params.showLegend=true;bad.nodes.at(-1).params.basemap='unsafe-url';assert.throws(()=>validateWorkflow(bad),/Invalid map presentation/);
});

// "Our map_output layers do not even have a basemap!" -- the practitioner, 2026-10-14. True of
// the shipped examples (1 of 10 can be given one, and it is off), and true of the receipt, which
// recorded a basemap only as fw:mapBasemap: the layer carrying every bit of geographic context
// was a property of the specification and absent from fw:layerCount. A basemap is displayed, so
// it is a layer, and it is the ground one.
test('A basemap in use is layer 0, named by the service it is fetched from',async()=>{
  const workflow=coverageExercise();workflow.nodes=workflow.nodes.slice(0,2);
  const node={id:'map',type:'map_output',x:0,y:0,params:{label:'Catchments',mapTitle:'Walking catchments',
    mapSubtitle:'',mapSourceNote:'Synthetic; method: network distance',showLegend:true,
    inputMode:'polygons',presentation:'interactive',basemap:'topo'}};
  workflow.nodes.push(node);workflow.edges=[{id:'a',from:'scope',to:'map',port:'polygons'}];
  const polygons={kind:'catchment',features:[{type:'Feature',properties:{},
    geometry:{type:'Polygon',coordinates:[[[0,0],[0,1],[1,1],[0,0]]]}}]};
  const output={nodeId:'map',label:'Catchments',view:'map',polygons,polygonPresentation:'interactive'};
  const spec=mapPresentation(node,output,workflow);
  assert.equal(spec.basemap,'topo');
  // OpenTopoMap's style is CC-BY-SA and is not OpenStreetMap's. Both providers were credited as
  // OpenStreetMap alone until 2026-10-14, which under-credited the style.
  assert.match(spec.attribution,/OpenTopoMap, CC-BY-SA/);
  const receipt={facts:'',input:''};
  mapSpecificationFacts(node,output,workflow,'run',receipt);
  const graph=new Store(new Parser().parse(receipt.facts));
  assert.equal((await validateGraph(graph)).conforms,true);
  const fw=s=>DataFactory.namedNode('urn:fieldwork:'+s);
  // The basemap is counted: ground plus the polygons it sits under.
  assert.equal([...graph.match(null,fw('layerCount'),null)][0].object.value,'2');
  const ground=[...graph.match(null,fw('layerKind'),fw('BasemapLayer'))][0].subject;
  assert.equal([...graph.match(ground,fw('layerIndex'),null)][0].object.value,'0');
  assert.equal([...graph.match(ground,fw('layerTileProvider'),null)][0].object.value,'topo');
  // Neither a port nor another layer's value: it comes from a service, and says so instead of
  // claiming an origin in the workflow.
  assert.equal([...graph.match(ground,fw('layerPort'),null)].length,0);
  assert.equal([...graph.match(ground,fw('layerWithin'),null)].length,0);
  // With no basemap the stack is just the data, and nothing claims a ground layer.
  const offNode={...node,params:{...node.params,basemap:'none'}},offReceipt={facts:'',input:''};
  mapSpecificationFacts(offNode,output,workflow,'run',offReceipt);
  const off=new Store(new Parser().parse(offReceipt.facts));
  assert.equal([...off.match(null,fw('layerCount'),null)][0].object.value,'1');
  assert.equal([...off.match(null,fw('layerKind'),fw('BasemapLayer'))].length,0);
});
