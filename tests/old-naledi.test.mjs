import test from 'node:test';
import assert from 'node:assert/strict';
import {inBoundary,sampleLocations,oldNalediWorkflow,DATASET,NB06_NAMED_EVIDENCE,facilityN3} from '../build/old-naledi.js';
import {boundary,facilities} from '../examples/old-naledi/data.js';
import {validateWorkflow,executionPlan} from '../build/core.js';

test('sample grid is bounded by the real polygon and is reproducible',()=>{
  const points=sampleLocations(boundary,250);
  assert.equal(points.length,21);
  assert.ok(points.every(p=>inBoundary(p.coordinates)));
  assert.deepEqual(points,sampleLocations(boundary,250));
  assert.ok(sampleLocations(boundary,150).length>points.length);
  assert.ok(!inBoundary([0,0]));
  const polygon={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]};
  assert.ok(inBoundary([2,2],polygon));assert.ok(!inBoundary([5,5],polygon));
});

test('dataset retains source attributes without patient data or disease aggregates',()=>{
  assert.equal(facilities.length,214);
  assert.equal(new Set(facilities.map(f=>f.id)).size,214);
  const clinic=facilities.find(f=>f.name==='Old Naledi Clinic');
  assert.equal(clinic.owner,'GOVERNMENT');assert.equal(clinic.serviceType,'Clinic with Maternity');
  assert.deepEqual(Object.keys(clinic).sort(),['coordinates','id','name','owner','serviceType']);
});

test('workflow supports four outputs, shared inference, and pinned dataset validation',()=>{
  const w=oldNalediWorkflow(),plan=executionPlan(w);
  assert.equal(plan.filter(n=>['output','map_output','table_output','chart_output'].includes(n.type)).length,4);
  // `xpert` was retired into apply_ruleset on 2026-10-12. Asserting the pinned ruleset rather than
  // a node type name is the stronger claim: the type name was what the merge deliberately changed,
  // and the ruleset identity and version are what decide the result.
  const graded=plan.filter(n=>n.type==='apply_ruleset'
    &&n.params.ruleset.id==='urn:fieldwork:ruleset:nb06-evidence');
  assert.equal(graded.length,1);
  assert.equal(graded[0].params.ruleset.version,'1.0.0');
  assert.deepEqual(graded[0].params.ruleset.inputs,[['facilities','facilities']]);
  assert.equal(graded[0].params.ruleset.output,'gradedFacilities');
  assert.equal(w.nodes.find(n=>n.type==='area').params.dataset,DATASET);
  w.nodes.find(n=>n.type==='access').params.speedMPerMin=0;
  assert.throws(()=>validateWorkflow(w),/speedMPerMin/);
  w.nodes.find(n=>n.type==='access').params.speedMPerMin=70;
  w.nodes.find(n=>n.type==='area').params.dataset='unknown';assert.throws(()=>validateWorkflow(w),/dataset version/);
});

// The NB06 named-evidence claims are keyed on the registry's own identifiers. A regeneration
// that changes an identifier must fail here rather than silently demoting a named facility to
// the general branch, which is what a name-keyed match did before.
test('every NB06 named-evidence claim resolves to a facility in the bundled registry',()=>{
  const byId=new Map(facilities.map(f=>[f.id,f]));
  const expected={'facility-158':'Princess Marina Hospital','facility-25':'Broadhurst II Clinic'};
  for(const id of Object.keys(NB06_NAMED_EVIDENCE)){
    const facility=byId.get(id);
    assert.ok(facility,`NB06 claim names ${id}, which is not in the registry`);
    assert.equal(facility.name,expected[id],
      `${id} is now "${facility.name}"; the NB06 claim was recorded for "${expected[id]}"`);
  }
});

test('named evidence follows the identifier, not the facility name',()=>{
  const marina=facilities.find(f=>f.id==='facility-158');
  const renamed={...marina,name:'Marina Referral Hospital (renamed)'};
  assert.match(facilityN3([renamed]).facts,/fw:facility-158 fw:namedRule fw:Marina/,
    'a renamed facility keeps its named evidence');
  const impostor={...marina,id:'facility-999',name:'Princess Marina Hospital'};
  assert.match(facilityN3([impostor]).facts,/fw:facility-999 fw:namedRule fw:None/,
    'a different facility sharing the name does not inherit named evidence');
});
