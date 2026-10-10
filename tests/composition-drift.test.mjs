import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateWorkflow} from '../build/core.js';

// Forcing the version-drift question rather than designing for it.
//
// A saved workflow names widget *types*, never versions — node keys are id, params, type, x, y,
// and every release file says `versionPersistence: "not-yet-persisted"`. So Fieldwork already
// floats: a workflow opened after a widget changes gets the new widget, whatever it now does.
//
// This fixture was valid on 2026-10-08 and holds `healthsites_discovery`, removed on 2026-10-09.
// These tests record what actually happens today. They are not a specification of what should
// happen; if loud failure is introduced later, they will fail, and that is the point.
const saved=()=>JSON.parse(readFileSync(
  new URL('./fixtures/removed-widget-workflow-2026-10-08.json',import.meta.url),'utf8'));

test('a workflow records no widget version, so nothing can be compared',()=>{
  for(const node of saved().nodes)
    assert.deepEqual(Object.keys(node).sort(),['id','params','type','x','y'],
      'there is no field in which a version could be recorded');
});

test('a workflow holding a removed widget still opens, and is rewritten in silence',()=>{
  const opened=validateWorkflow(saved());
  const node=opened.nodes.find(n=>n.id==='hs');
  assert.equal(node.type,'find_health_facilities','the removed type is rewritten');
  assert.ok(!opened.nodes.some(n=>n.type==='healthsites_discovery'));
  // Nothing in the returned workflow says a migration happened.
  assert.equal(JSON.stringify(opened).includes('healthsites_discovery'),false,
    'no record of what it used to be survives in the workflow');
});

test('the facilities it held are gone, and the workflow does not say so',()=>{
  const before=saved().nodes.find(n=>n.id==='hs');
  assert.equal(before.params.data.features.length,1,'the saved workflow held a facility');
  const after=validateWorkflow(saved()).nodes.find(n=>n.id==='hs');
  // Dropping the data is deliberate: its provenance was a hand-back of a file this application
  // never saw, and relabelling it as an OpenStreetMap retrieval would be a false record. The
  // finding is not that it was dropped. It is that a practitioner reopening this workflow is
  // told nothing — no warning, no note on the node, nothing in the receipt.
  assert.equal(after.params.data,null,'the facility is gone');
  assert.equal(after.params.retrieved,null,'and so is its provenance');
});

test('the configuration that survived is not flagged as reinterpreted either',()=>{
  const after=validateWorkflow(saved()).nodes.find(n=>n.id==='hs');
  assert.deepEqual(after.params.kinds,['hospital','clinic'],'kinds carried across');
  // `country: "Philippines"` became `country: "PHL"` — a different vocabulary for the same
  // field name. A reader comparing the saved file with what opened would see a value they
  // never typed.
  assert.equal(after.params.country,'PHL');
  assert.equal(saved().nodes.find(n=>n.id==='hs').params.country,'Philippines');
});
