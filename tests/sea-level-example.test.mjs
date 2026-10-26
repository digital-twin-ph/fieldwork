import test from 'node:test';
import {resolveRuleset} from '../build/rulesets.js';
import assert from 'node:assert/strict';
import {seaLevelExample} from '../build/sea-level-example.js';
import {executeWorkflow,executionPlan,validateGeoJSON,validateWorkflow} from '../build/core.js';

const ready=async()=>[{subject:'urn:fieldwork:area:area',
  predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];

test('the example validates and plans',()=>{
  const w=seaLevelExample();
  assert.doesNotThrow(()=>validateWorkflow(structuredClone(w)));
  const plan=executionPlan(structuredClone(w)).map(n=>n.id);
  assert.ok(plan.indexOf('extract')<plan.indexOf('assignment'),
    'the extract must be declared before anything is assigned against it');
  assert.ok(plan.includes('table'));
});

// Building this example is what found the defect: the facilities widget stores points in its own
// parameters and never meets the shared point validator, so an identifier containing a slash
// passed everywhere until the same points were put into an Input data node.
test('every bundled point identifier satisfies the shared point rule',()=>{
  const w=seaLevelExample();
  for(const id of ['facilities','sites']){
    const node=w.nodes.find(n=>n.id===id);
    assert.doesNotThrow(()=>validateGeoJSON(structuredClone(node.params.data),{attributes:true}),
      `${id} must be loadable as ordinary point input`);
    for(const f of node.params.data.features)
      assert.match(String(f.id),/^[a-zA-Z0-9_-]{1,80}$/,`${f.id} is not a usable feature id`);
  }
});

test('the bundled extract is real AR6 data, in millimetres, over eight gauges',()=>{
  const projections=seaLevelExample().nodes.find(n=>n.id==='projections').params;
  assert.equal(projections.unit,'millimetre','AR6 publishes millimetres; assuming metres was the bug');
  assert.deepEqual(projections.keys,['site_id','scenario','basis','family','year','quantile']);
  assert.equal(projections.data.rowCount,288);
  assert.equal(new Set(projections.data.rows.map(r=>r.key.site_id)).size,8);
  // basis is a confidence level here, not a workflow, and the declaration must say so.
  assert.deepEqual([...new Set(projections.data.rows.map(r=>r.key.basis))],['medium']);
  // THE DECLARATIONS MOVED TO THE RULESET, 2026-10-26. They were parameters a practitioner
  // typed into `slr_extract_import`, a widget named for one dataset; they are now declared data
  // on extract-contract, pinned by id AND version on the node that applies it -- which is what
  // makes "values are not comparable across dataset versions" true by construction rather than
  // by somebody remembering to retype a field. Experiment 115's P1.
  const extract=seaLevelExample().nodes.find(n=>n.id==='extract').params;
  assert.equal(extract.ruleset.id,'urn:fieldwork:ruleset:extract-contract');
  assert.equal(extract.ruleset.version,'1.0.0');
  const contract=resolveRuleset(extract.ruleset.id,extract.ruleset.version);
  const declared=Object.fromEntries(
    contract.inputContract.tableContract.declares.map(d=>[d.name,d.value]));
  assert.equal(declared.basisKind,'confidence-pbox');
  assert.equal(declared.baselinePeriod,'1995-2014');
  assert.equal(contract.basis.evidence.length,3,'CC BY 4.0 obliges three citations');
  // And they resolve, which is the point of carrying them rather than naming them.
  assert.deepEqual(contract.basis.evidence.map(e=>e.locator),
    ['10.1017/9781009157896.011','10.5194/gmd-16-7461-2023','10.5281/zenodo.5914709']);
});

test('the site layer carries no gauge the extract cannot answer for',()=>{
  const w=seaLevelExample();
  const covered=new Set(w.nodes.find(n=>n.id==='projections').params.data.rows.map(r=>r.key.site_id));
  const sites=w.nodes.find(n=>n.id==='sites').params.data.features;
  for(const site of sites)
    assert.ok(covered.has(String(site.properties.site_id)),
      `${site.properties.name} has no projection, so it must not be offered for assignment`);
  assert.equal(sites.length,covered.size);
});

// The retrieval widget appears in the example carrying what it retrieved, which is the state a
// workflow is in after one online retrieval. A bundled example can hold a network-dependent widget;
// what it cannot do is reach the network when it runs.
test('the facilities come from the retrieval widget, with its own provenance',()=>{
  const node=seaLevelExample().nodes.find(n=>n.id==='facilities');
  assert.equal(node.type,'find_health_facilities');
  assert.equal(node.params.retrieved.source,'hdx-hot-export');
  assert.equal(node.params.retrieved.licence,'ODbL-1.0');
  assert.equal(node.params.retrieved.kept,node.params.data.features.length);
  assert.match(node.params.retrieved.scope,/clipped to the study area/);
});

test('it runs, and assigns every facility a gauge with a distance',async()=>{
  const run=await executeWorkflow(seaLevelExample(),ready);
  const table=run.outputs.find(o=>o.nodeId==='table');
  assert.equal(table.rows.length,194);
  // Every facility is in the Manila box, so every one should land on the Manila gauge.
  assert.deepEqual([...new Set(table.rows.map(r=>r.key.projection_site))],['145']);
  for(const row of table.rows)
    assert.ok(Number.isFinite(row.value)&&row.value>0,'a distance is part of the result, not a detail');
});

test('the receipts carry both licences, because the two sources differ',async()=>{
  const run=await executeWorkflow(seaLevelExample(),ready);
  const facts=run.receipts.map(r=>r.facts).join('\n')+run.provenanceN3;
  assert.match(facts,/zenodo\.5914709|AR6/i,'the projection dataset must be identifiable');
  const references=seaLevelExample().nodes.flatMap(n=>n.references||[]);
  const notes=references.map(r=>r.notes).join(' ');
  assert.match(notes,/Open Database License|ODbL/,'the facilities are share-alike and must say so');
  assert.match(notes,/p-boxes over several workflows/,'why basis is not a workflow is recorded');
});

// The example deliberately stops before comparing a level to an elevation.
test('nothing claims an inundation result',()=>{
  const w=seaLevelExample();
  assert.ok(!w.nodes.some(n=>n.type==='slr_threshold_comparison'),
    'no elevation is supplied, so no threshold comparison may appear');
  assert.ok(!w.nodes.some(n=>n.type==='map_output'&&n.params.inputMode==='raster'),
    'nothing here paints a surface that could be read as a flood extent');
});
