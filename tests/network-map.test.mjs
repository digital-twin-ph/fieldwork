import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {nodeInputs,executeWorkflow,validateWorkflow,TYPES} from '../build/core.js';
import {networkCoverage,networkPreviewSvg,networkPreviewCaption,PREVIEW_WIDTH,PREVIEW_HEIGHT} from '../build/network-preview.js';

// A grid of streets over a small square, each street present in both directions as a walkable
// network is.
const grid=(size=4,step=0.002,origin=[-0.14,51.51])=>{
  const nodes=[],edges=[];
  for(let i=0;i<size;i++)for(let j=0;j<size;j++)
    nodes.push({id:`n${i}-${j}`,coordinates:[origin[0]+i*step,origin[1]+j*step]});
  const link=(a,b)=>{edges.push({from:a,to:b,lengthM:100},{from:b,to:a,lengthM:100});};
  for(let i=0;i<size;i++)for(let j=0;j<size;j++){
    if(i+1<size)link(`n${i}-${j}`,`n${i+1}-${j}`);
    if(j+1<size)link(`n${i}-${j}`,`n${i}-${j+1}`);
  }
  return {nodes,edges,source:'test grid'};
};
const square=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});

// Rewritten 2026-10-15. This used to assert the opposite -- that a network port exists only in
// network mode -- which was the behaviour the practitioner ruled against: "there is no such thing
// as mode, only layers", and then "I thought we got rid of mode!" on finding the selector still
// there. A map now declares every layer it can draw and the practitioner wires what they have.
test('the Map declares every layer port it can draw, whatever it was last set to', ()=>{
  const ports=mode=>nodeInputs({type:'map_output',params:{inputMode:mode,pointInputCount:1}})
    .map(([,type])=>type);
  for(const mode of ['network','raster','polygons','decisions','spatial',undefined]){
    const types=ports(mode);
    for(const needed of ['area','points','polygons','decisions','raster','network'])
      assert.ok(types.includes(needed),`${mode}: a map must offer a ${needed} port`);
  }
  // The static contract says the same thing the node does. It used to list four ports while a
  // node could have eight, which is how a declared contract and a live node disagreed about what
  // a map is; the only thing still node-dependent is how MANY point layers, which pointInputCount
  // creates and a type table cannot know.
  for(const needed of ['area','points','polygons','decisions','raster','network'])
    assert.ok(TYPES.map_output.inputs.some(([,t])=>t===needed),`the static contract declares ${needed}`);
});

test('a street network reaches the Map and is drawn as itself', async()=>{
  const workflow={schema:'fieldwork/workflow/1',name:'t',nodes:[
    {id:'net',type:'network_input',x:0,y:0,params:{label:'Streets',data:grid(),inputMethod:'file'}},
    {id:'map',type:'map_output',x:200,y:0,params:{label:'Street map',inputMode:'network'}}],
    edges:[{id:'e',from:'net',to:'map',port:'network'}]};
  const result=await executeWorkflow(validateWorkflow(workflow),async()=>[]);
  const output=result.outputs.find(o=>o.nodeId==='map');
  assert.equal(output.kind,'network-map');
  assert.equal(output.network.nodes.length,16,'the graph arrives whole');
  // And the receipt states what was drawn, without claiming anything was computed from it.
  const facts=result.receipts.find(r=>r.nodeId==='map').facts;
  const quads=new Parser().parse(facts);
  const value=p=>quads.find(q=>q.predicate.value===`urn:fieldwork:${p}`)?.object.value;
  assert.equal(value('networkJunctionCount'),'16');
  assert.equal(value('networkSegmentCount'),'48');
  assert.ok(!/Dijkstra|isochrone|reachab/i.test(facts),'a view routes nothing');
});

// The refusal names the canvas, not a setting. It used to say "needs its network input
// connected", which is a sentence about the mode the practitioner had chosen rather than about
// what is missing -- and after 2026-10-15 there is no mode to have chosen.
test('a Map with nothing connected says so, in terms of layers', async()=>{
  const workflow={schema:'fieldwork/workflow/1',name:'t',nodes:[
    {id:'map',type:'map_output',x:0,y:0,params:{label:'Street map',inputMode:'network'}}],edges:[]};
  await assert.rejects(executeWorkflow(validateWorkflow(workflow),async()=>[]),
    /Connect a layer to "Street map"/);
});

test('the measurement is of streets, not of directed segments', ()=>{
  // A walkable street is present twice, once each way. Reporting the sum would double every street.
  const coverage=networkCoverage(grid());
  assert.equal(coverage.junctions,16);
  assert.equal(coverage.segments,48);
  const spans=24; // 2 directions x 24 undirected links
  assert.ok(coverage.totalMetres>0);
  assert.ok(coverage.totalMetres<spans*2*250,'the total is halved, not summed over both directions');
});

test('coverage is measured against the study area, and absence is not completeness', ()=>{
  const network=grid(); // spans 6 thousandths of a degree from -0.140, 51.510
  assert.equal(networkCoverage(network).boundaryCovered,null,
    'no boundary means unknown, which is not the same as full');
  const inside=networkCoverage(network,square(-0.139,51.511,-0.137,51.513));
  assert.equal(Math.round(inside.boundaryCovered*100),100,'an area inside the streets is covered');
  const halfOut=networkCoverage(network,square(-0.140,51.510,-0.128,51.516));
  assert.ok(halfOut.boundaryCovered<0.6,`a wider area is not: ${halfOut.boundaryCovered}`);
});

test('the caption states junctions, segments and length, and names a shortfall', ()=>{
  const covered=networkPreviewCaption(networkCoverage(grid(),square(-0.139,51.511,-0.137,51.513)));
  assert.match(covered,/16 junctions/);
  assert.match(covered,/48 directed segments/);
  assert.match(covered,/of street/);
  assert.match(covered,/covering the study area/);
  const short=networkPreviewCaption(networkCoverage(grid(),square(-0.140,51.510,-0.120,51.516)));
  assert.match(short,/covering about \d+% of the study area/,'a shortfall is stated as a number');
  assert.match(networkPreviewCaption(networkCoverage(grid())),/coverage is unknown/);
});

test('the preview draws the streets once and the boundary over them', ()=>{
  const svg=networkPreviewSvg(grid(),square(-0.139,51.511,-0.137,51.513));
  // One path for every segment: 11,497 DOM nodes in an Inspector panel is not a preview.
  assert.equal((svg.match(/<path /g)||[]).length,2,'one path of streets, one of boundary');
  assert.match(svg,/stroke-dasharray/,'the study area is dashed so it reads as an overlay');
  assert.ok(!/<line|<circle/.test(svg),'no element per segment');
  // Each undirected street is drawn once, not twice.
  const moves=(svg.match(/M/g)||[]).length;
  assert.ok(moves<=30,`24 streets plus a boundary, not 48: ${moves}`);
  assert.match(svg,new RegExp(`viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}"`));
  assert.equal(networkPreviewSvg({nodes:[],edges:[],source:''}),'','nothing to draw draws nothing');
});

test('the frame holds both, so a network that misses the area shows a gap', ()=>{
  // Fitting the streets alone would move the boundary off the picture, which is the one case the
  // preview exists to show.
  const away=square(-0.10,51.60,-0.09,51.61);
  const svg=networkPreviewSvg(grid(),away);
  const xs=[...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>Number(m[1]));
  const ys=[...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>Number(m[2]));
  assert.ok(Math.min(...xs)>=-1&&Math.max(...xs)<=PREVIEW_WIDTH+1,'everything fits the frame');
  assert.ok(Math.min(...ys)>=-1&&Math.max(...ys)<=PREVIEW_HEIGHT+1);
});
