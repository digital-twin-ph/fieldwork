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
import {makeN3} from '../build/core.js';
import {accessN3,facilityN3} from '../build/old-naledi.js';
import {bundledRulesets,resolveRuleset,bindParameters} from '../build/rulesets.js';

const golden=JSON.parse(readFileSync(new URL('./fixtures/ruleset-rules-before-extraction-2026-10-12.json',import.meta.url),'utf8'));
const rows=[{id:'a',name:'A',coordinates:[0,0],distance:1.5,unit:'kilometres',center:{id:'c',name:'C',coordinates:[0,0]}},
            {id:'b',name:'B',coordinates:null,distance:null,unit:'kilometres',center:null}];

test('declared rulesets assemble byte-identical rule text',()=>{
  assert.equal(makeN3(rows,{active:true,date:'2026-07-15'},5).rules,golden.policy_t5);
  assert.equal(makeN3(rows,{active:null,date:'2026-07-15'},0.25).rules,golden.policy_t0,
    'a second threshold, so the placeholder is proved rather than one value coincidentally matching');
  assert.equal(accessN3([{id:'s1',minutes:12.5},{id:'s2',minutes:null}],20).rules,golden.access_t20);
  assert.equal(facilityN3([{id:'f1',name:'X',serviceType:'Clinic',owner:'GOVERNMENT'}]).rules,golden.facility);
});

test('a ruleset declares its basis, and one of five carries resolvable evidence',()=>{
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
  assert.equal(new Set(sets.map(s=>s.id)).size,5);
  // Nine version files on 2026-10-26, with extract-contract: the AR6 contract that
  // slr_extract_import held in TypeScript, declared as data so the ledger can count its debt.
  assert.equal(sets.length,9);
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
  assert.deepEqual([...new Set(resolvable.map(s=>s.id))],['urn:fieldwork:ruleset:extract-contract'],
    'If another now carries a URL or a digested PDF, lower uncitedCeiling in rulesets/ledger.json.');
  const dois=resolvable[0].basis.evidence.map(e=>e.locator);
  assert.deepEqual(dois,['10.1017/9781009157896.011','10.5194/gmd-16-7461-2023','10.5281/zenodo.5914709'],
    'the chapter, the FACTS paper and the dataset version: the three the licence obliges');
  const nb06=sets.find(s=>s.id==='urn:fieldwork:ruleset:nb06-evidence');
  assert.equal(nb06.basis.status,'published');
  assert.equal(nb06.basis.unresolvedCitations.length,3,'a published basis with three unopenable citations');
});

test('binding refuses what would silently conclude nothing',()=>{
  const set=resolveRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0');
  assert.throws(()=>bindParameters(set,{}),/needs a value for threshold/);
  assert.throws(()=>bindParameters(set,{threshold:5000}),/between 0 and 1000/);
  // An unbound placeholder reaches the reasoner as text and matches nothing, so the ruleset
  // concludes nothing and reads as a dataset full of unknowns.
  assert.throws(()=>bindParameters({...set,parameters:[]},{}),/left \{\{threshold\}\} unbound/);
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:outreach-criteria','9.9.9'),/carries .* at 1\.0\.0, 1\.1\.0 and not 9\.9\.9/);
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:nope','1.0.0'),/carries no ruleset/);
});

test('ruleset basis reaches provenance and never a rule premise',async()=>{
  const {exampleWorkflow,executeWorkflow}=await import('../build/core.js');
  const w=exampleWorkflow();
  const inputs=[];
  const result=await executeWorkflow(w,async input=>{
    inputs.push(input);
    return w.nodes[0].params.data.features.map(f=>({subject:'urn:fieldwork:place:'+f.id,predicate:'urn:fieldwork:decision',object:'urn:fieldwork:Unknown'}));
  });
  const applied=result.receipts.find(r=>r.ruleset);
  assert.equal(applied.ruleset.id,'urn:fieldwork:ruleset:outreach-criteria');
  // The shipped example pins 1.1.0 since 2026-10-25, which drops the `alert` input port with its
  // rules byte-identical to 1.0.0. The conclusions this test reaches are the same ones.
  assert.equal(applied.ruleset.version,'1.1.0');
  assert.match(result.provenanceN3,/<urn:fieldwork:ruleset:outreach-criteria> a fw:Ruleset, prov:Plan/);
  assert.match(result.provenanceN3,/fw:basisStatus fw:Illustrative/);
  assert.match(result.provenanceN3,/prov:hadPlan <urn:fieldwork:ruleset:outreach-criteria>/);
  // The constraint that predates rulesets: a citation in a premise would let the reasoner draw
  // conclusions from a bibliography.
  assert.ok(inputs.every(input=>!input.includes('basisStatus')&&!input.includes('dcterms:references')
    &&!input.includes('unresolvedCitation')&&!input.includes('fw:Ruleset')),
    'the ruleset basis must not reach the reasoner');
});
