import test from 'node:test';
import assert from 'node:assert/strict';
import {bindableRoles,declaredFields,isDerivedRole,bundledRulesets} from '../build/rulesets.js';

// "rules as a spec" -- the practitioner, 2026-10-17, choosing how an AR6 contract should live.
// Experiment 65 designed this before the code: the ruleset declares ROLES, not field names, and
// fact generation becomes general the moment it does. Every bundled ruleset already carries both
// halves; what was missing was the binding.
const outreach=bundledRulesets().find(r=>r.id.endsWith('outreach-criteria'));

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
  // Recorded rather than fixed: their predicate naming predates the convention, and a published
  // ruleset is immutable. They keep their bespoke generators and are untouched by the spec path.
  assert.equal(bindableRoles(outreach).length,4);
});

test('a real shipped ruleset binds through the same path',()=>{
  const fields=declaredFields(outreach,[
    {predicate:'fw:distanceKm',attribute:'km_to_centre'},
    {predicate:'fw:heatAlert',attribute:'alert'},
    {predicate:'fw:distanceKnown',attribute:'km_to_centre'},
    {predicate:'fw:alertKnown',attribute:'alert'}]);
  const km=fields.find(f=>f.predicate==='fw:distanceKm');
  assert.equal(km.attribute,'km_to_centre');
  assert.equal(km.kind,'number');
  assert.match(km.unit,/KM$/,'the unit comes from the ruleset, not from the column');
  assert.equal(fields.find(f=>f.predicate==='fw:heatAlert').kind,'boolean');
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
