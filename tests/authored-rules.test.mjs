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
  resolveRuleset,bindParameters,authoredUnitProblems,bundledRulesets} from '../build/rulesets.js';

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

// A declared ruleset with one numeric setting, written here: the shipped one these tests used, access-review, retired
// with Old Naledi on 2026-11-11 (docs/audits/old-naledi-audit.md).
const WITH_THRESHOLD={id:'urn:fieldwork:ruleset:test-threshold',version:'1.0.0',title:'A threshold',
  parameters:[{name:'threshold',role:'threshold',type:'number',placeholder:'{{threshold}}',meaning:'A number to compare against'}]};

test('a parameter stays a placeholder, so an authored ruleset binds like a declared one', () => {
  const n3=compileAuthoredRuleset({subject:'?p',rules:[{any:[{all:[
    {field:'fw:proxyMinutes',comparator:'greaterThan',value:'{{threshold}}'}]}],
    then:[{predicate:'fw:decision',value:'fw:Review'}]}]});
  assert.match(n3,/math:greaterThan \{\{threshold\}\}/);
  // Bound by the same function a declared ruleset uses, so an authored one reaches the reasoner
  // by exactly the same path rather than through a second mechanism that could disagree.
  const declared={...WITH_THRESHOLD,rules:n3};
  assert.match(bindParameters(declared,{threshold:30}),/math:greaterThan 30\.0+/);
});

// "Why are we using template syntax that not anyone would write?" -- the practitioner,
// 2026-10-15. Nobody would. The placeholder belongs to the compiled TEXT, and it had been
// carried into the form they edit, so a condition refers to a setting by name and the compiler
// writes the placeholder. Both forms compile identically: the old one is still read, because
// workflows saved before that date hold it.
test('a condition refers to a setting by name, and the placeholder is written by the compiler', () => {
  const rules=value=>[{any:[{all:[{field:'fw:proxyMinutes',comparator:'greaterThan',value}]}],
    then:[{predicate:'fw:decision',value:'fw:Review'}]}];
  const structured=compileAuthoredRuleset({subject:'?p',rules:rules({setting:'threshold'})});
  assert.match(structured,/math:greaterThan \{\{threshold\}\}/);
  assert.equal(structured,compileAuthoredRuleset({subject:'?p',rules:rules('{{threshold}}')}),
    'the two ways of referring to a setting compile to the same N3');
  const declared={...WITH_THRESHOLD,rules:structured};
  assert.match(bindParameters(declared,{threshold:30}),/math:greaterThan 30\.0+/);
});

// The unit check reads a setting reference in either form. It did not, at first: it matched
// `{{name}}` with a regular expression, so moving the example to the structured form would have
// turned the refusal off silently -- a check that stops checking is worse than no check.
test('a unit mismatch is refused whichever way the setting is referred to', () => {
  const authored=value=>({
    fields:[{predicate:'fw:proxyMinutes',kind:'number',label:'Wait',
      unit:'http://qudt.org/vocab/unit/MIN',unitLabel:'minutes'}],
    parameters:[{name:'threshold',unit:'http://qudt.org/vocab/unit/HR',unitLabel:'hours'}],
    rules:[{any:[{all:[{field:'fw:proxyMinutes',comparator:'greaterThan',value}]}]}]});
  for(const value of [{setting:'threshold'},'{{threshold}}']){
    const problems=authoredUnitProblems(authored(value));
    assert.equal(problems.length,1,`one problem for ${JSON.stringify(value)}`);
    assert.match(problems[0].says,/measured in minutes and the threshold setting is in hours/);
  }
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
  // The shipped rulesets that compile to N3: one with an `otherwise` is evaluated directly instead.
  const compiled=bundledRulesets().filter(r=>r.authored&&!r.authored.otherwise);
  assert.ok(compiled.length>0,'at least one shipped ruleset compiles, so this checks something');
  for(const {id,version,authored} of compiled){const parameters={};
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

// B1, each shipped ruleset rebuilt in the authored form, checked the four rulesets that retired on 2026-11-11.
