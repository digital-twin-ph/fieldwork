import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJson,checkRulesetJson,rulesetText,autoBracket} from '../build/ruleset-json.js';

/** THE RULE EDITOR AS A JSON EDITOR (2026-11-21): errors placed on their line and said in words, the checks a run makes,
 *  and brackets that close themselves. */
const GOOD={title:'Syndromes',mustNotBeReadAs:'a diagnosis',
  fields:[{attribute:'chief_complaint',predicate:'fwa:chief_complaint',kind:'term'}],
  rules:[{any:[{all:[{field:'fwa:chief_complaint',comparator:'contains',value:'vomit, diarrh'}]}],then:[{predicate:'fwa:syndrome',value:'gastrointestinal'}]}]};
test('JSON that breaks is said where and how, in words',()=>{
  const cases=[['{\n  "title": "x"\n  "fields": []\n}',2,/comma is missing after the value of "title"/],
    ['{\n  "a": [1, 2,]\n}',2,/comma is left before "\]"/],
    ["{\n  'title': 1\n}",2,/double quotes/],
    ['{\n  "title": "open\n}',2,/runs on to the next line/],
    ['{"a": 1} x',1,/Nothing may follow/]];
  for(const [text,line,says] of cases){const {error}=parseJson(text);assert.equal(error.line,line,text);assert.match(error.says,says);}
});
test('every value is placed by its path, and a valid ruleset passes the checks a run makes',()=>{
  const text=rulesetText(GOOD),{positions}=parseJson(text);
  assert.equal(positions.get('rules.0.any.0.all.0.comparator').line,text.split('\n').findIndex(l=>l.includes('"comparator"'))+1);
  const {ruleset,problems}=checkRulesetJson(text);
  assert.deepEqual(problems,[]);assert.equal(ruleset.title,'Syndromes');
  assert.match(text,/^\{\n  "schema": "fieldwork\/authored-ruleset\/1",/);
});
test('what a ruleset means is checked and placed: an undeclared field, an unknown comparator, no words',()=>{
  const bad=structuredClone(GOOD);
  bad.rules[0].any[0].all.push({field:'fwa:age',comparator:'equals',value:5},{field:'fwa:chief_complaint',comparator:'resembles',value:'x'},
    {field:'fwa:chief_complaint',comparator:'contains',value:' , '});
  const text=JSON.stringify(bad,null,2),{problems}=checkRulesetJson(text),lines=text.split('\n');
  const said=problems.map(p=>p.says).join(' | ');
  assert.match(said,/fwa:age is not a declared field/);
  assert.match(said,/"comparator" is one of equals/);
  assert.match(said,/write the words to look for/);
  assert.ok(lines[problems.find(p=>/fwa:age/.test(p.says)).line-1].includes('fwa:age'));
});
test('brackets close themselves, are typed over, are removed in pairs, and open a line between them',()=>{
  assert.deepEqual(autoBracket('',0,0,'{'),{text:'{}',caret:1});
  assert.deepEqual(autoBracket('{}',1,1,'}'),{text:'{}',caret:2});
  assert.deepEqual(autoBracket('[]',1,1,'Backspace'),{text:'',caret:0});
  assert.deepEqual(autoBracket('  {}',3,3,'Enter'),{text:'  {\n    \n  }',caret:8});
  assert.deepEqual(autoBracket('a vomit b',2,7,'"'),{text:'a "vomit" b',caret:3,caretEnd:8});
  assert.deepEqual(autoBracket('"a"',2,2,'"'),{text:'"a"',caret:3});
  assert.equal(autoBracket('ab',2,2,'x'),undefined);
});
