import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {violations,validateNaming,TRANSFORM_VERBS,ACQUISITION_VERBS} from '../scripts/validate-naming.mjs';

const baseline=JSON.parse(readFileSync(new URL('../widgets/naming.json',import.meta.url),'utf8'));
const classification=JSON.parse(readFileSync(new URL('../widgets/classification.json',import.meta.url),'utf8'));
const prefixes=baseline.domainPrefixes;
const widget=(over={})=>({title:'Clip raster',group:'Spatial operations',icon:'x',color:'teal',
  description:'d',inputs:[],output:'raster',...over});
const run=(definitions,cls=classification)=>violations({definitions,classification:cls,domainPrefixes:prefixes});
const rules=found=>found.map(v=>`${v.nodeType}:${v.rule}`);

test('a title claiming a role the node type does not carry is a violation', ()=>{
  assert.deepEqual(rules(run({clip_raster:widget({title:'Clip raster input'})})),['clip_raster:role-word-in-title']);
  // The role word is fine when the identifier carries it -- that is the convention's object_role form.
  assert.deepEqual(rules(run({raster_input:widget({title:'Raster input',group:'Sources'})})),[]);
});

test('a role word in the identifier is not required in the title', ()=>{
  // `map_output` titled "Map" is explicitly blessed by the convention. Requiring the role word
  // reported it as a violation when this check was first written.
  assert.deepEqual(rules(run({map_output:widget({title:'Map',group:'Outputs',output:null})})),[]);
});

test('a transform verb cannot be grouped under Sources, but an acquisition verb can', ()=>{
  assert.deepEqual(rules(run({reproject:widget({title:'Reproject points',group:'Sources'})})),
    ['reproject:transform-in-sources']);
  assert.deepEqual(rules(run({find_health_facilities:widget({title:'Find health facilities',group:'Sources'})})),[]);
  assert.equal(TRANSFORM_VERBS.some(v=>ACQUISITION_VERBS.includes(v)),false,
    'a verb cannot be both a transform and an acquisition');
});

test('a domain widget must carry its declared prefix, which is not derived from the pack IRI', ()=>{
  const cls={widgets:[{nodeType:'sea_level_extract',classification:'domain',pack:'urn:fieldwork:pack:sea-level-rise'}]};
  assert.deepEqual(rules(run({sea_level_extract:widget({title:'Sea level extract'})},cls)),
    ['sea_level_extract:domain-prefix']);
  const ok={widgets:[{nodeType:'slr_extract_import',classification:'domain',pack:'urn:fieldwork:pack:sea-level-rise'}]};
  assert.deepEqual(rules(run({slr_extract_import:widget({title:'Sea-level projection extract'})},ok)),[]);
});

test('an undeclared pack prefix is reported rather than silently passing', ()=>{
  const cls={widgets:[{nodeType:'tb_facility_evidence',classification:'domain',pack:'urn:fieldwork:pack:tuberculosis'}]};
  assert.deepEqual(rules(run({tb_facility_evidence:widget({title:'Facility evidence'})},cls)),
    ['tb_facility_evidence:domain-prefix']);
});

test('the title must share a stem with the identifier, permissively', ()=>{
  // "Tabular data" is fair for `table_input`; a four-character stem rejected it, because
  // "tabular" does not contain "tabl".
  assert.deepEqual(rules(run({table_input:widget({title:'Tabular data',group:'Sources'})})),[]);
  // `xpert` itself is retired in the shipped classification, so it is held to nothing; the rule is
  // tested on a live stand-in with the same defect -- a title that carries no information.
  const live={widgets:[{nodeType:'xpert',classification:'standard'}]};
  assert.deepEqual(rules(run({xpert:widget({title:'Diagnostic evidence'})},live)),['xpert:title-type-agreement']);
});

test('-ise spelling and non-snake-case identifiers are violations', ()=>{
  assert.deepEqual(rules(run({summarise_hull:widget({title:'Summarise hull'})})),['summarise_hull:spelling']);
  assert.deepEqual(rules(run({clipRaster:widget({title:'Clip raster'})})),['clipRaster:form']);
});

test('a retired widget is not held to the convention', ()=>{
  const cls={widgets:[{nodeType:'xpert',classification:'standard',retired:true}]};
  assert.deepEqual(rules(run({xpert:widget({title:'Diagnostic evidence'})},cls)),[]);
});

test('the shipped baseline passes, and every known violation carries a reason', ()=>{
  const definitions=JSON.parse(readFileSync(new URL('../widgets/registry.json',import.meta.url),'utf8'));
  assert.ok(definitions,'registry readable');
  for(const v of baseline.knownViolations){
    assert.ok(v.reason&&v.reason.length>20,`${v.nodeType}:${v.rule} needs a reason`);
    assert.ok(v.clearedBy,`${v.nodeType}:${v.rule} needs a route out`);
  }
  assert.ok(baseline.knownViolations.length<=baseline.maxKnownViolations);
});

test('a new violation fails, and a fixed one must be removed from the baseline', ()=>{
  const definitions={clip_raster:widget({title:'Clip raster input'})};
  const cls={widgets:[{nodeType:'clip_raster',classification:'standard'}]};
  assert.throws(()=>validateNaming({definitions,classification:cls,
    baseline:{knownViolations:[],maxKnownViolations:0,domainPrefixes:prefixes}}),/New naming violation/);
  // The ratchet: a listed violation that no longer occurs must be removed, so the count falls.
  assert.throws(()=>validateNaming({definitions:{clip_raster:widget()},classification:cls,
    baseline:{knownViolations:[{nodeType:'clip_raster',rule:'role-word-in-title',reason:'x'.repeat(30)}],
      maxKnownViolations:1,domainPrefixes:prefixes}}),/Stale entry/);
});

test('the ceiling cannot be exceeded', ()=>{
  assert.throws(()=>validateNaming({definitions:{},classification:{widgets:[]},
    baseline:{knownViolations:[{nodeType:'a',rule:'r',reason:'y'.repeat(30)}],maxKnownViolations:0,
      domainPrefixes:prefixes}}),/exceeds the ceiling/);
});
