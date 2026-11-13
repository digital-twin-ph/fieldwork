import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateWorkflow,nodeInputs} from '../build/core.js';
import {PORT_NAMES} from '../build/port-names.js';

// CHART'S PORTS, STANDARDIZED (2026-11-12, the practitioner: "Chart ports need to be standardized"). Two ports, Table and
// Polygon summaries, named the same on the canvas and in the Inspector; the `series` port retired into Table.
test('Chart has two ports, named the same everywhere they are shown',()=>{
  assert.deepEqual(nodeInputs({id:'c',type:'chart_output',x:0,y:0,params:{label:'Chart'}}).map(([p])=>p),['records','polygons']);
  assert.deepEqual(PORT_NAMES.chart_output,{records:'Table',polygons:'Polygon summaries'});
});

test('a workflow saved with the series port opens with its case series on Table, and no mode',async()=>{
  const saved=JSON.parse(await readFile(new URL('./fixtures/snow-epidemic-curve-2026-10-09.json',import.meta.url),'utf8'));
  const charts=saved.nodes.filter(n=>n.type==='chart_output'&&n.params.inputMode==='series').map(n=>n.id);
  assert.ok(charts.length,'the fixture was saved with a series chart');
  const w=validateWorkflow(saved);
  for(const id of charts){
    assert.equal(w.nodes.find(n=>n.id===id).params.inputMode,undefined);
    assert.deepEqual(w.edges.filter(e=>e.to===id).map(e=>e.port),['records']);
  }
});
