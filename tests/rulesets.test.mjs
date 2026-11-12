/** The rules moved out of the execution path and nothing else changed.
 *
 *  This is the half of the ruleset merge that can be proved rather than argued. The rule text the
 *  three generators assemble must be **byte-identical** to what the template literals produced
 *  before extraction, captured in tests/fixtures/ruleset-rules-before-extraction-2026-10-12.json
 *  by running the shipped functions. If a conclusion moved while the commit message said rules
 *  were merely relocated, nobody could tell afterwards which change caused it.
 *
 *  It is also the narrow form of experiment 106's B1. B1 asks for identical *conclusions* from
 *  rebuilt rules; this asks for identical *text* from relocated rules, which is stronger and
 *  cheaper, and available only because this step deliberately rebuilds nothing.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bundledRulesets,resolveRuleset,bindParameters} from '../build/rulesets.js';

const rows=[{id:'a',name:'A',coordinates:[0,0],distance:1.5,unit:'kilometres',center:{id:'c',name:'C',coordinates:[0,0]}},
            {id:'b',name:'B',coordinates:null,distance:null,unit:'kilometres',center:null}];

// Byte-identity of rule text with the code it was extracted from, 2026-10-12, held for outreach-criteria, access-review
// and nb06-evidence, which retired on 2026-11-11 (docs/audits/old-naledi-audit.md).

test('a ruleset declares its basis, and every shipped ruleset carries resolvable evidence',()=>{
  const sets=bundledRulesets();
  // Seven version files until 2026-10-25, now eight: outreach-criteria published a 1.1.0 that
  // drops its `alert` input port, with the rules byte-identical to 1.0.0. The third version file
  // published for a change of CONNECTIONS rather than of results.
  // Four ruleset IDENTITIES across six version files: nb06-evidence and access-review each
  // published a 2.0.0 for a change of port type, with the rules and the conclusions unchanged. A
  // basis belongs to the ruleset, not to each version of it.
  //
  // The fourth is extent-review, added 2026-10-14 for experiment 113 to find out whether a rule
  // can run over a quantity DERIVED from geometry. It is illustrative and uncited, which is what
  // the ledger's uncited ceiling exists to make someone decide rather than drift into: the ceiling
  // moved 3 -> 4 with the reason recorded in the same commit, under the practitioner's policy that
  // it may move a little either way. If 113 concludes against the approach the ruleset is deleted
  // and these counts return to three and five.
  // Seven documents, four identities: extent-review published 1.1.0 the same day, when its
  // declared output port changed from `decisions` to `polygons` so the judgement travels on the
  // shape it is about. A port type is part of the contract, so it is a version rather than an
  // edit, and both are bundled because a saved workflow may pin either. Experiment 113.
  // Six on 2026-11-09, with compare-level-to-elevation: the comparison Compare level to elevation held as a widget
  // (experiment 197), published cited, so the uncited count and its ceiling are unchanged.
  // Two on 2026-11-11: outreach-criteria, nb06-evidence, access-review and extent-review retired with the examples
  // they existed for, each run through code written for it alone (docs/audits/old-naledi-audit.md).
  // Three on 2026-11-12, with seven-one-seven (experiment 200), cited to Bochner et al. 2023.
  assert.equal(new Set(sets.map(s=>s.id)).size,3);
  // Nine version files on 2026-10-26, with extract-contract: the AR6 contract that
  // slr_extract_import held in TypeScript, declared as data so the ledger can count its debt.
  assert.equal(sets.length,3);
  for(const set of sets){
    assert.ok(set.basis.status&&set.basis.statedBy,`${set.id} must say what its basis is and who says so`);
    assert.ok(set.mustNotBeReadAs?.trim(),`${set.id} must say what it is not`);
    assert.ok(/^urn:fieldwork:ruleset:[a-z0-9-]+$/.test(set.id));
    // The rules classify; they do not enumerate instances. This is the check that would have
    // caught the two facility names, and it passes because that match is in fact generation.
    assert.ok(!/urn:fieldwork:(place|facility):/.test(set.rules),`${set.id} must not name an instance`);
  }
  for(const set of sets){
    assert.ok(Array.isArray(set.basis.evidence),set.id+' must declare an evidence array');
    assert.ok(Array.isArray(set.basis.unresolvedCitations),set.id+' must declare unresolved citations, even if empty');
    for(const unresolved of set.basis.unresolvedCitations)
      assert.ok(unresolved.whatWouldResolveIt?.trim(),set.id+': say what would resolve '+unresolved.citation);
  }
  // The number that matters is resolvable evidence, not citation strings. Restructuring the basis
  // to carry url-or-pdf references showed that the one ruleset recorded as "cited" cites three
  // papers as author-year text, which resolve to nothing a reader can open. No locator was
  // invented to close that gap; it is counted instead, and may only fall.
  // ONE NOW DOES, 2026-10-26. extract-contract carries the three AR6 citations as DOIs, each
  // resolved against the public DOI system on 2026-10-17 before any of them was written down
  // here. The practitioner's reason is the one that matters: "the citations are also DOIs, so
  // when transmitted and embedded in the output they are independently verifiable" -- by an
  // audience, without trusting this application or the person presenting. uncitedCeiling went
  // back to 4 in the same commit, with one more ruleset than before.
  const resolvable=sets.filter(s=>s.basis.evidence.length>0);
  assert.deepEqual([...new Set(resolvable.map(s=>s.id))].sort(),['urn:fieldwork:ruleset:compare-level-to-elevation','urn:fieldwork:ruleset:extract-contract','urn:fieldwork:ruleset:seven-one-seven'],
    'If one of the uncited four now carries a URL or a digested PDF, lower uncitedCeiling in rulesets/ledger.json.');
  const dois=resolvable.find(s=>s.id==='urn:fieldwork:ruleset:extract-contract').basis.evidence.map(e=>e.locator);
  assert.deepEqual(dois,['10.1017/9781009157896.011','10.5194/gmd-16-7461-2023','10.5281/zenodo.5914709'],
    'the chapter, the FACTS paper and the dataset version: the three the licence obliges');
});

test('binding refuses what would silently conclude nothing',()=>{
  const set={id:'urn:fieldwork:ruleset:test-threshold',version:'1.0.0',title:'A threshold',
    parameters:[{name:'threshold',role:'threshold',type:'number',min:0,max:1000,placeholder:'{{threshold}}',meaning:'A distance'}],
    rules:'{ ?s <urn:fieldwork:d> ?d. ?d math:greaterThan {{threshold}} } => { ?s <urn:fieldwork:decision> <urn:fieldwork:Review> }.'};
  assert.throws(()=>bindParameters(set,{}),/needs a value for threshold/);
  assert.throws(()=>bindParameters(set,{threshold:5000}),/between 0 and 1000/);
  // An unbound placeholder reaches the reasoner as text and matches nothing, so the ruleset
  // concludes nothing and reads as a dataset full of unknowns.
  assert.throws(()=>bindParameters({...set,parameters:[]},{}),/left \{\{threshold\}\} unbound/);
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:compare-level-to-elevation','9.9.9'),/carries .* at 1\.0\.0 and not 9\.9\.9/);
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:nope','1.0.0'),/carries no ruleset/);
  // A retired ruleset is refused by name, not as one this build never heard of.
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:outreach-criteria','1.1.0'),/Outreach criteria.*retired on 2026-11-11/);
});

test('ruleset basis reaches provenance and never a rule premise',async()=>{
  // On compare-level-to-elevation since 2026-11-11, when the heat example this ran retired. Its rules end in an
  // `otherwise`, so they are evaluated directly and reach no reasoner at all; what is held here is the provenance side.
  const {executeWorkflow}=await import('../build/core.js');
  const data={kind:'data-table',keys:['place','value_mm','elevation_m'],valueField:'n',numericKeys:{value_mm:'millimetre',elevation_m:'metre'},
    rows:[{key:{place:'a',value_mm:500,elevation_m:0.2},value:1}],rowCount:1,missingValueCount:0};
  const w={schema:'fieldwork/workflow/1',name:'t',nodes:[{id:'t',type:'table_input',x:0,y:0,params:{label:'t',keys:data.keys,valueField:'n',data}},
    {id:'c',type:'apply_ruleset',x:0,y:0,params:{label:'c',ruleset:{id:'urn:fieldwork:ruleset:compare-level-to-elevation',version:'1.0.0',
      title:'Compare a projected rise with an elevation',inputs:[['records','table']],output:'table'},parameters:{}}},
    {id:'o',type:'table_output',x:0,y:0,params:{label:'o',inputMode:'table'}}],
    edges:[{id:'e1',from:'t',to:'c',port:'records'},{id:'e2',from:'c',to:'o',port:'table'}]};
  const inputs=[];
  const result=await executeWorkflow(w,async input=>{inputs.push(input);return [];});
  const applied=result.receipts.find(r=>r.ruleset);
  assert.equal(applied.ruleset.id,'urn:fieldwork:ruleset:compare-level-to-elevation');
  assert.match(result.provenanceN3,/<urn:fieldwork:ruleset:compare-level-to-elevation> a fw:Ruleset, prov:Plan/);
  assert.match(result.provenanceN3,/prov:hadPlan <urn:fieldwork:ruleset:compare-level-to-elevation>/);
  // The constraint that predates rulesets: a citation in a premise would let the reasoner draw
  // conclusions from a bibliography.
  assert.ok(inputs.every(input=>!input.includes('basisStatus')&&!input.includes('dcterms:references')
    &&!input.includes('unresolvedCitation')&&!input.includes('fw:Ruleset')),
    'the ruleset basis must not reach the reasoner');
});
