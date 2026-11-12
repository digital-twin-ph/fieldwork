import test from 'node:test';
import assert from 'node:assert/strict';
import {bindableRoles,declaredFields,isDerivedRole,bundledRulesets} from '../build/rulesets.js';

// "rules as a spec" -- the practitioner, 2026-10-17, choosing how an AR6 contract should live.
// Experiment 65 designed this before the code: the ruleset declares ROLES, not field names, and
// fact generation becomes general the moment it does. Every bundled ruleset already carries both
// halves; what was missing was the binding.
// compare-level-to-elevation since 2026-11-11, when outreach-criteria, the ruleset these tests first used, retired.
const shipped=bundledRulesets().find(r=>r.id.endsWith('compare-level-to-elevation'));
const ALL_FOUR=[{predicate:'fw:projectedRise',attribute:'value_mm'},{predicate:'fw:elevation',attribute:'elevation_m'},
  {predicate:'fw:projectedRiseKnown',attribute:'value_mm'},{predicate:'fw:elevationKnown',attribute:'elevation_m'}];

// A spec declares which roles it computes for itself. Not inferred from the spelling: the
// shipped rulesets pair fw:distanceKnown with fw:distanceKm and fw:alertKnown with fw:heatAlert,
// which share no stem, and guessing a relationship from two predicate names is the mistake this
// application refuses everywhere else.
const spec={inputContract:{expects:[
  {predicate:'fw:levelMetres',type:'number',unit:'http://qudt.org/vocab/unit/M'},
  {predicate:'fw:levelKnown',type:'boolean',derived:true},
  {predicate:'fw:family',type:'term'}]}};

test('a presence role is derived only when it says so',()=>{
  assert.equal(isDerivedRole({predicate:'fw:levelKnown',derived:true}),true);
  assert.equal(isDerivedRole({predicate:'fw:levelMetres'}),false);
  // Spelling proves nothing: a Known suffix on a role nobody computes is still a real role.
  assert.equal(isDerivedRole({predicate:'fw:wellKnown'}),false);
});

test('a spec offers only the roles a practitioner can bind',()=>{
  const roles=bindableRoles(spec).map(r=>r.predicate);
  assert.deepEqual(roles,['fw:levelMetres','fw:family']);
});

test('a term role binds as a term, and a declared unit travels',()=>{
  const fields=declaredFields(spec,[
    {predicate:'fw:levelMetres',attribute:'slr_m'},{predicate:'fw:family',attribute:'family'}]);
  assert.equal(fields.find(f=>f.predicate==='fw:family').kind,'term');
  assert.match(fields.find(f=>f.predicate==='fw:levelMetres').unit,/\/M$/);
  assert.equal(fields.length,2,'the derived role is not a field');
});

test('the shipped rulesets declare no derived roles, so all four of their roles are bindable',()=>{
  assert.equal(bindableRoles(shipped).length,4);
});

test('a real shipped ruleset binds through the same path',()=>{
  const fields=declaredFields(shipped,ALL_FOUR);
  const rise=fields.find(f=>f.predicate==='fw:projectedRise');
  assert.equal(rise.attribute,'value_mm');
  assert.equal(rise.kind,'number');
  assert.match(rise.unit,/MilliM$/,'the unit comes from the ruleset, not from the column');
  assert.equal(fields.find(f=>f.predicate==='fw:elevationKnown').kind,'boolean');
});

test('an unbound role is refused by name, and says what would happen',()=>{
  assert.throws(()=>declaredFields(spec,[{predicate:'fw:levelMetres',attribute:'slr_m'}]),
    e=>/fw:family/.test(e.message)&&/report every record as unknown/.test(e.message));
});

test('a role bound to a column the records do not carry is refused, with what they do carry',()=>{
  assert.throws(()=>declaredFields(spec,[
    {predicate:'fw:levelMetres',attribute:'slr_m'},
    {predicate:'fw:family',attribute:'family'}],['slr_m','site_id']),
    e=>/bound to "family"/.test(e.message)&&/slr_m, site_id/.test(e.message));
});

test('blank is not a binding',()=>{
  assert.throws(()=>declaredFields(spec,[
    {predicate:'fw:levelMetres',attribute:'   '},
    {predicate:'fw:family',attribute:'family'}]),/fw:levelMetres/);
});

test('every bundled ruleset can state its bindable roles',()=>{
  for(const r of bundledRulesets()){
    const roles=bindableRoles(r);
    assert.ok(roles.length>0,`${r.id} declares no bindable role`);
    assert.ok(roles.every(x=>x.type),`${r.id} has a role with no type`);
  }
});

import {specFromPin} from '../build/rulesets.js';
import {compileAuthoredRuleset} from '../build/authored-rules.js';

// The proof that a pinned ruleset IS the authored form, once its roles are bound: the structured
// rules a published ruleset ships are the same ones the generic path compiles, so re-expressing
// the pin must give back rules that compile to the N3 the ruleset already ships.
// validate-ruleset-sources.mjs proves that identity in the build; this proves the re-expression
// does not disturb it.
test('a pinned ruleset re-expressed as a spec keeps its own rules',()=>{
  const spec=specFromPin(shipped,ALL_FOUR);
  assert.equal(spec.title,shipped.title);
  assert.deepEqual(spec.rules,shipped.authored.rules,'the rules are the ruleset’s, untouched');
  // Not compiled to N3 here: these rules compute and end in an `otherwise`, so they are evaluated directly.
});

test('a spec carries the ruleset’s own parameters, and none when it declares none',()=>{
  assert.deepEqual(specFromPin(shipped,ALL_FOUR).parameters,[]);
});

test('a ruleset with no structured form cannot be re-expressed, and says so by returning null',()=>{
  assert.equal(specFromPin({...shipped,authored:undefined},[]),null);
});

test('binding failures surface through the spec, not after it',()=>{
  assert.throws(()=>specFromPin(shipped,[{predicate:'fw:projectedRise',attribute:'value_mm'}]),
    /needs \d+ roles? bound/);
});
