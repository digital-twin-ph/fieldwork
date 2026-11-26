import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatedDirectly,authoredUnitProblems,compileAuthoredRuleset,containedWords} from '../build/authored-rules.js';
import {evaluateAuthored} from '../build/rule-evaluation.js';

/** WORDS IN TEXT (2026-11-21, syndromic surveillance): a chief complaint contains any of a syndrome's words, or none of
 *  another list, ignoring capitals; evaluated directly, never compiled to N3. */
const fields=[{attribute:'chief_complaint',predicate:'fwa:chief_complaint',kind:'term'},{attribute:'age',predicate:'fwa:age',kind:'number'}];
const rules=[
  {any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'vomit, diarrh, n/v'},
    {field:'fwa:chief_complaint',comparator:'notContains',value:'pregnan'}]}],then:[{predicate:'fwa:syndrome',value:'gastrointestinal'}]},
  {any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'fever, fevr'},{field:'fwa:chief_complaint',comparator:'contains',value:'cough'}]}],
    then:[{predicate:'fwa:syndrome',value:'influenza-like'}]}];
const records=['N/V/D','Vomitting x2','diarrhoea','vomiting, pregnant','Fevr and cough','fever only','ankle injury']
  .map((chief_complaint,i)=>({id:`v${i}`,label:`v${i}`,properties:{chief_complaint,age:30}}));
test('a complaint holding any of the words, and none of the others, takes the syndrome',()=>{
  const e=evaluateAuthored(records,fields,rules,{});
  assert.deepEqual(e.records.map(r=>r.values.syndrome??null),['gastrointestinal','gastrointestinal','gastrointestinal',null,'influenza-like',null,null]);
});
test('the words are split at commas, trimmed and lower-cased; such rules run directly, not through N3',()=>{
  assert.deepEqual(containedWords(' Vomit, ,N/V '),['vomit','n/v']);
  assert.equal(evaluatedDirectly({rules}),true);
  assert.throws(()=>compileAuthoredRuleset({subject:'?p',rules,fields}),/evaluated directly/);
});
test('words looked for in a number, or no words at all, are said while the rule is written',()=>{
  const bad=[{any:[{all:[{field:'fwa:age',comparator:'contains',value:'5'},{field:'fwa:chief_complaint',comparator:'contains',value:' , '}]}],
    then:[{predicate:'fwa:x',value:'y'}]}];
  const said=authoredUnitProblems({fields,rules:bad,parameters:[]}).map(p=>p.says).join(' | ');
  assert.match(said,/age is a number, so it holds no words/);
  assert.match(said,/write the words to look for/);
});

/** QUOTED WORDS AND CODES IN A LIST (2026-11-26, NSSP's definitions). ESSENCE's ^ flu ^ keeps its spaces, so it finds
 *  "stomach flu" and not "influenza"; ^[;/ ]J10^ finds J10 at the start of any code in a discharge diagnosis. */
import {textItems} from '../build/authored-rules.js';
const coded=[{attribute:'chief_complaint',predicate:'fwa:chief_complaint',kind:'term'},
  {attribute:'discharge_diagnosis',predicate:'fwa:discharge_diagnosis',kind:'term'}];
const visit=(i,chief_complaint,discharge_diagnosis)=>({id:`v${i}`,label:`v${i}`,properties:{chief_complaint,discharge_diagnosis}});
test('a word in double quotes keeps its spaces, so " flu " is not found in influenza',()=>{
  assert.deepEqual(containedWords('" flu ", stomach, "noro v"'),[' flu ','stomach','noro v']);
  const rules=[{any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'" flu "'}]}],then:[{predicate:'fwa:flagged',value:'yes'}]}];
  const e=evaluateAuthored([visit(0,'stomach flu today',''),visit(1,'influenza',''),visit(2,'flu',''),visit(3,'the flu ',''),],coded,rules,{});
  assert.deepEqual(e.records.map(r=>r.values.flagged??null),['yes',null,null,'yes']);
});
test('has an item starting with: any code in a list separated by ; / & or spaces, as ESSENCE reads [;/ ]J10',()=>{
  assert.deepEqual(textItems('J10.1;R50.9 / 1E30&XN297'),['j10.1','r50.9','1e30','xn297']);
  const rules=[{any:[{all:[{field:'fwa:discharge_diagnosis',comparator:'startsWith',value:'J10, 1E3'}]}],then:[{predicate:'fwa:flu',value:'yes'}]}];
  const e=evaluateAuthored([visit(0,'','R50.9;J10.1'),visit(1,'','XJ10'),visit(2,'','1E30&XN297'),visit(3,'','j101'),visit(4,'','')],coded,rules,{});
  // XJ10 holds J10 but does not START with it, as ^[;/ ]J10^ would not match it; capitals are ignored.
  assert.deepEqual(e.records.map(r=>r.values.flu??null),['yes',null,'yes','yes',null]);
});
test('has no item starting with: none of the codes begins with any of the words',()=>{
  const rules=[{any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'norov'},
    {field:'fwa:discharge_diagnosis',comparator:'notStartsWith',value:'J10, J11'}]}],then:[{predicate:'fwa:noro',value:'yes'}]}];
  const e=evaluateAuthored([visit(0,'norovirus','A08.1'),visit(1,'norovirus','A08.1;J11.1')],coded,rules,{});
  assert.deepEqual(e.records.map(r=>r.values.noro??null),['yes',null]);
});
test('starts-with rules run directly, like contains, and are not compiled to N3',()=>{
  const rules=[{any:[{all:[{field:'fwa:discharge_diagnosis',comparator:'startsWith',value:'B05'}]}],then:[{predicate:'fwa:m',value:'yes'}]}];
  assert.equal(evaluatedDirectly({rules}),true);
  assert.throws(()=>compileAuthoredRuleset({subject:'?p',rules,fields:coded}),/evaluated directly/);
});

/** A PUBLISHED RULESET OF WORDS, OPENED IN THE RULE EDITOR (2026-11-26). reviewAuthored took any comparator but "is" for
 *  a number, so a column read with "contains" or "has an item starting with" came back as a number. */
import {reviewAuthored} from '../build/ruleset-ui.js';
test('a column read with contains or starts-with is reviewed as text, a column compared as more than as a number',()=>{
  const ruleset={title:'Words',version:'1.0.0',mustNotBeReadAs:'a diagnosis',parameters:[],authored:{rules:[
    {any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'fever'},
      {field:'fwa:discharge_diagnosis',comparator:'startsWith',value:'J10'},{field:'fwa:age',comparator:'greaterThan',value:64}]}],
      then:[{predicate:'fwa:flagged',value:'yes'}]}]}};
  const kinds=Object.fromEntries(reviewAuthored(ruleset).fields.map(f=>[f.attribute,f.kind]));
  assert.deepEqual(kinds,{chief_complaint:'term',discharge_diagnosis:'term',age:'number'});
});
