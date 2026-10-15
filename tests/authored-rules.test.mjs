/** Experiment 106's B1, and the Group A cases that have to pass before it means anything.
 *
 *  106 specified the authored form on 2026-10-12 and nothing was built until 2026-10-15, when the
 *  practitioner looked at the shipped ruleset widget and said: "this is not the design we
 *  discussed, the rules are pinned not very flexible." A DE moment, not acted on -- their words.
 *
 *  **B1 is the test that matters and it needs no new oracle**: the rulesets that already ship,
 *  rebuilt in the authored form, compiled, and reasoned over the same facts must reach the same
 *  conclusions as the rule text they ship with. The compiled TEXT is deliberately not compared --
 *  variable names are chosen for a reader, not to match a hand-written file -- so this runs the
 *  real EYE reasoner over both and compares what each concludes, subject by subject.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {compileAuthoredRuleset,compiledRuleCount,AuthoredRulesetError,RULE_CEILING,
  resolveRuleset,bindParameters} from '../build/rulesets.js';

const root=new URL('../',import.meta.url);
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('vendor/eye-21.1.24.js',root),'utf8'),{filename:'eye.js'});
const PREFIX='@prefix fw: <urn:fieldwork:>.\n@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';
const conclusions=async(rules,facts)=>{
  const quads=await eyereasoner.n3reasoner(PREFIX+facts+'\n'+rules,undefined,{outputType:'quads'});
  return quads.map(q=>`${q.subject.value} ${q.predicate.value} ${q.object.value}`).sort();
};

test('a condition compiles to a term match, and a comparison binds once and chains', () => {
  const n3=compileAuthoredRuleset({subject:'?p',rules:[
    {any:[{all:[
      {field:'fw:heatAlert',comparator:'equals',value:true},
      {field:'fw:distanceKm',comparator:'greaterThan',value:5},
      {field:'fw:distanceKm',comparator:'notGreaterThan',value:15},
    ]}],then:[{predicate:'fw:decision',value:'fw:Review'}]},
  ]});
  // One binding for the field compared twice, its builtins chained, and the term match inline.
  assert.equal(n3.trim(),
    '{ ?p fw:heatAlert true; fw:distanceKm ?distanceKm. ?distanceKm math:greaterThan 5; math:notGreaterThan 15. }'
    +' => { ?p fw:decision fw:Review. }.');
});

test('OR expands to one rule per disjunct, because the subset is monotonic', () => {
  const ruleset={subject:'?f',rules:[{any:[
    {all:[{field:'fw:namedRule',comparator:'equals',value:'fw:Marina'}]},
    {all:[{field:'fw:namedRule',comparator:'equals',value:'fw:Broadhurst'}]},
  ],then:[{predicate:'fw:evidenceLevel',value:'fw:Direct'},{predicate:'fw:service',value:'fw:Onsite'}]}]};
  const lines=compileAuthoredRuleset(ruleset).trim().split('\n');
  assert.equal(lines.length,2,'one rule per disjunct');
  // The conclusion LIST survives on each, which the shipped rulesets require: 106's first draft
  // had a single conclusion and these are what refuted it.
  for(const line of lines)assert.match(line,/=> \{ \?f fw:evidenceLevel fw:Direct; fw:service fw:Onsite\. \}\.$/);
  // And the count is known from the form, before anything is compiled.
  assert.equal(compiledRuleCount(ruleset),2);
});

test('the form refuses what the subset cannot express, rather than emitting it', () => {
  const bad=rules=>()=>compileAuthoredRuleset({subject:'?p',rules});
  // A comparison against a term: the author means equals and the builtin would silently not match.
  assert.throws(bad([{any:[{all:[{field:'fw:kind',comparator:'greaterThan',value:'fw:Hospital'}]}],
    then:[{predicate:'fw:decision',value:'fw:Review'}]}]),AuthoredRulesetError);
  assert.throws(bad([{any:[],then:[{predicate:'fw:decision',value:'fw:Review'}]}]),AuthoredRulesetError);
  assert.throws(bad([{any:[{all:[{field:'fw:x',comparator:'equals',value:1}]}],then:[]}]),AuthoredRulesetError);
  assert.throws(bad([{any:[{all:[{field:'not a curie',comparator:'equals',value:1}]}],
    then:[{predicate:'fw:decision',value:'fw:Review'}]}]),AuthoredRulesetError);
  assert.throws(()=>compileAuthoredRuleset({subject:'p',rules:[]}),AuthoredRulesetError);
});

test('a parameter stays a placeholder, so an authored ruleset binds like a declared one', () => {
  const n3=compileAuthoredRuleset({subject:'?p',rules:[{any:[{all:[
    {field:'fw:proxyMinutes',comparator:'greaterThan',value:'{{threshold}}'}]}],
    then:[{predicate:'fw:decision',value:'fw:Review'}]}]});
  assert.match(n3,/math:greaterThan \{\{threshold\}\}/);
  // Bound by the same function a declared ruleset uses, so an authored one reaches the reasoner
  // by exactly the same path rather than through a second mechanism that could disagree.
  const declared={...resolveRuleset('urn:fieldwork:ruleset:access-review','2.0.0'),rules:n3};
  assert.match(bindParameters(declared,{threshold:30}),/math:greaterThan 30\.0+/);
});

test('A5 · a ruleset over the ceiling is refused before compiling, naming the product', () => {
  const group=n=>({all:[{field:'fw:x',comparator:'equals',value:`fw:V${n}`}]});
  const rule=groups=>({any:groups,then:[{predicate:'fw:decision',value:'fw:Review'}]});
  const under={subject:'?p',rules:[rule([...Array(RULE_CEILING).keys()].map(group))]};
  assert.equal(compiledRuleCount(under),RULE_CEILING);
  assert.ok(compileAuthoredRuleset(under).length>0,'at the ceiling it compiles');
  const over={subject:'?p',rules:[rule([...Array(RULE_CEILING+1).keys()].map(group))]};
  assert.throws(()=>compileAuthoredRuleset(over),err=>
    err instanceof AuthoredRulesetError&&/65 N3 rules, over the ceiling of 64/.test(err.message));
});

test('A8, A9 · nothing compiled names an instance, and all of it parses', async() => {
  // A8: the compiler can only emit predicates, declared terms and literals from the form, so an
  // instance IRI cannot reach the rules. 65 proposed a check for instance IRIs in rule text; for
  // AUTHORED rulesets it is unreachable by construction, and this is what says so.
  // A9: the vendored parser is the one the application reads receipts with, so a ruleset it
  // cannot parse would be one the project could not inspect.
  const {Parser}=await import('n3');
  for(const {id,version,authored,parameters} of B1){
    const n3=compileAuthoredRuleset(authored);
    assert.ok(!/<[a-z]+:[^>]*>/.test(n3),`${id}: no absolute IRI, so no instance IRI`);
    assert.ok(!/urn:fieldwork:(place|facility):/.test(n3));
    // Parsed after binding, through each ruleset's OWN declaration, because an unbound
    // placeholder is not N3 and binding is where it stops being one.
    const bound=bindParameters({...resolveRuleset(id,version),rules:n3},parameters);
    const parsed=new Parser({format:'text/n3'}).parse(PREFIX+bound);
    assert.ok(parsed.length>0,`${id}: the vendored parser reads it`);
  }
});

test('A10 · two authored forms that compile identically produce identical text', () => {
  const one={subject:'?p',rules:[{any:[{all:[
    {field:'fw:heatAlert',comparator:'equals',value:true}]}],then:[{predicate:'fw:decision',value:'fw:Review'}]}]};
  const two=JSON.parse(JSON.stringify(one));
  assert.equal(compileAuthoredRuleset(one),compileAuthoredRuleset(two));
});

// ---------------------------------------------------------------------------------------------
// B1. Each shipped ruleset rebuilt in the authored form, compiled, and reasoned against the rule
// text it ships with, over facts that exercise every branch including the unknown ones.

const B1=[
  {id:'urn:fieldwork:ruleset:outreach-criteria',version:'1.0.0',parameters:{threshold:5},
   authored:{subject:'?p',rules:[
     {any:[{all:[{field:'fw:distanceKnown',comparator:'equals',value:false}]}],
      then:[{predicate:'fw:decision',value:'fw:Unknown'}]},
     {any:[{all:[{field:'fw:alertKnown',comparator:'equals',value:false}]}],
      then:[{predicate:'fw:decision',value:'fw:Unknown'}]},
     {any:[{all:[{field:'fw:distanceKm',comparator:'greaterThan',value:'{{threshold}}'},
                 {field:'fw:heatAlert',comparator:'equals',value:true}]}],
      then:[{predicate:'fw:decision',value:'fw:Review'}]},
     {any:[{all:[{field:'fw:distanceKm',comparator:'notGreaterThan',value:'{{threshold}}'},
                 {field:'fw:heatAlert',comparator:'equals',value:true}]}],
      then:[{predicate:'fw:decision',value:'fw:NoFlag'}]},
     {any:[{all:[{field:'fw:distanceKnown',comparator:'equals',value:true},
                 {field:'fw:heatAlert',comparator:'equals',value:false}]}],
      then:[{predicate:'fw:decision',value:'fw:NoFlag'}]},
   ]},
   facts:[
     '<urn:fieldwork:place:far> fw:distanceKnown true; fw:alertKnown true; fw:distanceKm 9; fw:heatAlert true.',
     '<urn:fieldwork:place:near> fw:distanceKnown true; fw:alertKnown true; fw:distanceKm 2; fw:heatAlert true.',
     '<urn:fieldwork:place:edge> fw:distanceKnown true; fw:alertKnown true; fw:distanceKm 5; fw:heatAlert true.',
     '<urn:fieldwork:place:calm> fw:distanceKnown true; fw:alertKnown true; fw:distanceKm 9; fw:heatAlert false.',
     '<urn:fieldwork:place:nodistance> fw:distanceKnown false; fw:alertKnown true.',
     '<urn:fieldwork:place:noalert> fw:distanceKnown true; fw:alertKnown false; fw:distanceKm 9.',
   ].join('\n')},
  {id:'urn:fieldwork:ruleset:access-review',version:'2.0.0',parameters:{threshold:30},
   authored:{subject:'?p',rules:[
     {any:[{all:[{field:'fw:accessKnown',comparator:'equals',value:false}]}],
      then:[{predicate:'fw:decision',value:'fw:Unknown'},{predicate:'fw:zone',value:'fw:Unknown'}]},
     {any:[{all:[{field:'fw:proxyMinutes',comparator:'greaterThan',value:'{{threshold}}'}]}],
      then:[{predicate:'fw:decision',value:'fw:Review'}]},
     {any:[{all:[{field:'fw:proxyMinutes',comparator:'notGreaterThan',value:'{{threshold}}'}]}],
      then:[{predicate:'fw:decision',value:'fw:NoFlag'}]},
     {any:[{all:[{field:'fw:proxyMinutes',comparator:'notGreaterThan',value:5}]}],
      then:[{predicate:'fw:zone',value:'fw:Within5'}]},
     {any:[{all:[{field:'fw:proxyMinutes',comparator:'greaterThan',value:5},
                 {field:'fw:proxyMinutes',comparator:'notGreaterThan',value:15}]}],
      then:[{predicate:'fw:zone',value:'fw:Within15'}]},
     {any:[{all:[{field:'fw:proxyMinutes',comparator:'greaterThan',value:15},
                 {field:'fw:proxyMinutes',comparator:'notGreaterThan',value:30}]}],
      then:[{predicate:'fw:zone',value:'fw:Within30'}]},
     {any:[{all:[{field:'fw:proxyMinutes',comparator:'greaterThan',value:30}]}],
      then:[{predicate:'fw:zone',value:'fw:Over30'}]},
   ]},
   facts:[
     '<urn:fieldwork:place:a> fw:accessKnown true; fw:proxyMinutes 3.',
     '<urn:fieldwork:place:b> fw:accessKnown true; fw:proxyMinutes 5.',
     '<urn:fieldwork:place:c> fw:accessKnown true; fw:proxyMinutes 12.',
     '<urn:fieldwork:place:d> fw:accessKnown true; fw:proxyMinutes 15.',
     '<urn:fieldwork:place:e> fw:accessKnown true; fw:proxyMinutes 22.',
     '<urn:fieldwork:place:f> fw:accessKnown true; fw:proxyMinutes 30.',
     '<urn:fieldwork:place:g> fw:accessKnown true; fw:proxyMinutes 44.',
     '<urn:fieldwork:place:h> fw:accessKnown false.',
   ].join('\n')},
  {id:'urn:fieldwork:ruleset:nb06-evidence',version:'2.0.0',parameters:{},
   authored:{subject:'?f',rules:[
     {any:[{all:[{field:'fw:namedRule',comparator:'equals',value:'fw:Marina'}]}],
      then:[{predicate:'fw:evidenceLevel',value:'fw:Direct'},{predicate:'fw:service',value:'fw:Onsite'}]},
     {any:[{all:[{field:'fw:namedRule',comparator:'equals',value:'fw:Broadhurst'}]}],
      then:[{predicate:'fw:evidenceLevel',value:'fw:Contextual'},{predicate:'fw:service',value:'fw:OnsiteOrReferral'}]},
     {any:[{all:[{field:'fw:namedRule',comparator:'equals',value:'fw:None'},
                 {field:'fw:government',comparator:'equals',value:true},
                 {field:'fw:facilityKind',comparator:'equals',value:'fw:Hospital'}]}],
      then:[{predicate:'fw:evidenceLevel',value:'fw:Contextual'},{predicate:'fw:service',value:'fw:Onsite'}]},
     {any:[{all:[{field:'fw:namedRule',comparator:'equals',value:'fw:None'},
                 {field:'fw:government',comparator:'equals',value:true},
                 {field:'fw:facilityKind',comparator:'equals',value:'fw:Clinic'}]}],
      then:[{predicate:'fw:evidenceLevel',value:'fw:Inferential'},{predicate:'fw:service',value:'fw:OnsiteOrReferral'}]},
     {any:[{all:[{field:'fw:namedRule',comparator:'equals',value:'fw:None'},
                 {field:'fw:government',comparator:'equals',value:true},
                 {field:'fw:facilityKind',comparator:'equals',value:'fw:HealthPost'}]}],
      then:[{predicate:'fw:evidenceLevel',value:'fw:Inferential'},{predicate:'fw:service',value:'fw:ReferralOnly'}]},
     // One rule, two disjuncts: not government at all, or government and some other kind. The
     // shipped text writes these as two rules with the same conclusion, which is the same thing.
     {any:[{all:[{field:'fw:namedRule',comparator:'equals',value:'fw:None'},
                 {field:'fw:government',comparator:'equals',value:false}]},
           {all:[{field:'fw:namedRule',comparator:'equals',value:'fw:None'},
                 {field:'fw:government',comparator:'equals',value:true},
                 {field:'fw:facilityKind',comparator:'equals',value:'fw:Other'}]}],
      then:[{predicate:'fw:evidenceLevel',value:'fw:None'},{predicate:'fw:service',value:'fw:Unknown'}]},
   ]},
   facts:[
     '<urn:fieldwork:facility:1> fw:namedRule fw:Marina; fw:government true; fw:facilityKind fw:Hospital.',
     '<urn:fieldwork:facility:2> fw:namedRule fw:Broadhurst; fw:government false; fw:facilityKind fw:Clinic.',
     '<urn:fieldwork:facility:3> fw:namedRule fw:None; fw:government true; fw:facilityKind fw:Hospital.',
     '<urn:fieldwork:facility:4> fw:namedRule fw:None; fw:government true; fw:facilityKind fw:Clinic.',
     '<urn:fieldwork:facility:5> fw:namedRule fw:None; fw:government true; fw:facilityKind fw:HealthPost.',
     '<urn:fieldwork:facility:6> fw:namedRule fw:None; fw:government true; fw:facilityKind fw:Other.',
     '<urn:fieldwork:facility:7> fw:namedRule fw:None; fw:government false; fw:facilityKind fw:Clinic.',
   ].join('\n')},
];

for(const {id,version,parameters,authored,facts} of B1)
  test(`B1 · ${id.split(':').pop()} ${version} rebuilt in the authored form reaches the same conclusions`,async()=>{
    const declared=resolveRuleset(id,version);
    const shipped=bindParameters(declared,parameters);
    const rebuilt=bindParameters({...declared,rules:compileAuthoredRuleset(authored)},parameters);
    const [a,b]=await Promise.all([conclusions(shipped,facts),conclusions(rebuilt,facts)]);
    assert.ok(a.length>0,'the shipped rules concluded something, so the comparison means something');
    assert.deepEqual(b,a);
  });
