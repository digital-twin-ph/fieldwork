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
