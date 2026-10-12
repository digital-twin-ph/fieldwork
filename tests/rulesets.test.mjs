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

test('a ruleset declares its basis, and one of three has a citation',()=>{
  const sets=bundledRulesets();
  assert.equal(sets.length,3);
  for(const set of sets){
    assert.ok(set.basis.status&&set.basis.statedBy,`${set.id} must say what its basis is and who says so`);
    assert.ok(set.mustNotBeReadAs?.trim(),`${set.id} must say what it is not`);
    assert.ok(/^urn:fieldwork:ruleset:[a-z0-9-]+$/.test(set.id));
    // The rules classify; they do not enumerate instances. This is the check that would have
    // caught the two facility names, and it passes because that match is in fact generation.
    assert.ok(!/urn:fieldwork:(place|facility):/.test(set.rules),`${set.id} must not name an instance`);
  }
  const cited=sets.filter(s=>s.basis.citations.length>0);
  assert.deepEqual(cited.map(s=>s.id),['urn:fieldwork:ruleset:nb06-evidence'],
    'Declaring rulesets as data is what made this countable: two of three carry a disclaimer where a citation would go.');
});

test('binding refuses what would silently conclude nothing',()=>{
  const set=resolveRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0');
  assert.throws(()=>bindParameters(set,{}),/needs a value for threshold/);
  assert.throws(()=>bindParameters(set,{threshold:5000}),/between 0 and 1000/);
  // An unbound placeholder reaches the reasoner as text and matches nothing, so the ruleset
  // concludes nothing and reads as a dataset full of unknowns.
  assert.throws(()=>bindParameters({...set,parameters:[]},{}),/left \{\{threshold\}\} unbound/);
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:outreach-criteria','9.9.9'),/carries .* at 1\.0\.0 and not 9\.9\.9/);
  assert.throws(()=>resolveRuleset('urn:fieldwork:ruleset:nope','1.0.0'),/carries no ruleset/);
});
