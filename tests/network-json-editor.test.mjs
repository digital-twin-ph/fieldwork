import test from 'node:test';
import assert from 'node:assert/strict';
import {offersJsonEditor,JSON_EDITOR_ELEMENT_LIMIT} from '../build/catchments.js';

// The practitioner, 2026-10-22: *"Chrome has become unstable"*, then *"viewing the street network
// widget with drc.osm.pbf loaded"*, then *"if I change workflows no crash"*. The Inspector held a
// textarea of `JSON.stringify(network,null,2)` inside a COLLAPSED <details>, rebuilt on every
// render. Measured at the province on their screen -- 113,485 nodes, 289,080 directed edges --
// that was 41.8 MB built, 59.7 MB again after escaping, about 203 MB of UTF-16 per render, for a
// control showing nothing until opened. The graph itself is untouched by this: it is a limit on
// a text box, which is why it is an artefact cap and not a discovery one.
const graph=(nodes,edges)=>({nodes:Array(nodes).fill(0),edges:Array(edges).fill(0)});

test('a hand-editable graph is offered the editor, and the province is not',()=>{
  assert.equal(offersJsonEditor(graph(60,120)),true,'the Soho network is what this control is for');
  assert.equal(offersJsonEditor(graph(113_485,289_080)),false,'the Ituri extract is not');
});

test('the threshold counts nodes and edges together, and is the declared cap',()=>{
  const half=JSON_EDITOR_ELEMENT_LIMIT/2;
  assert.equal(offersJsonEditor(graph(half,half)),true,'exactly the limit is still offered');
  assert.equal(offersJsonEditor(graph(half,half+1)),false,'one element past it is not');
  // Edges alone can carry it past: a sparse graph is not a small one.
  assert.equal(offersJsonEditor(graph(1,JSON_EDITOR_ELEMENT_LIMIT)),false);
});

test('the limit is about the two megabytes this control already states for upload',()=>{
  // Measured shape: {id,coordinates:[lon,lat]} and {from,to,lengthM}, pretty-printed at indent 2.
  const nodes=Array.from({length:JSON_EDITOR_ELEMENT_LIMIT/2},(_,i)=>
    ({id:'osm-'+(1000000000+i),coordinates:[29.1234567,1.5678901]}));
  const edges=Array.from({length:JSON_EDITOR_ELEMENT_LIMIT/2},(_,i)=>
    ({from:nodes[i].id,to:nodes[(i+1)%nodes.length].id,lengthM:12.345}));
  const bytes=JSON.stringify({nodes,edges,source:'x'},null,2).length;
  assert.ok(bytes<2.5e6,`a graph at the limit serialises to ${(bytes/1e6).toFixed(1)} MB`);
});
