import test from 'node:test';
import assert from 'node:assert/strict';
import {bindParameters,declarationGaps} from '../build/rulesets.js';

// Citations are NOT parameters. "The input table should carry those citations and those can be
// checked as required in the ruleset widget." -- the practitioner, 2026-10-17. A parameter tunes
// the rules and validate-rulesets.mjs refuses one whose placeholder appears in no rule; a
// citation documents the data and changes no computed value.
const AR6=[
  {name:'chapter',label:'IPCC AR6 chapter',kind:'doi',obligation:'licence',expectType:'book-chapter',
   meaning:'The IPCC AR6 WG1 chapter these projections are assessed in.'},
  {name:'facts',label:'FACTS paper',kind:'doi',obligation:'licence',expectType:'journal-article',
   meaning:'The paper describing the framework that produced these values.'},
  {name:'datasetVersion',label:'Dataset version',kind:'version',obligation:'licence',
   meaning:'The published version of the projection dataset.'},
];

test('an unstated declaration becomes a gap that names its obligation',()=>{
  const gaps=declarationGaps({requiredDeclarations:AR6},{chapter:'10.1017/9781009157896.011'});
  assert.deepEqual(gaps.map(g=>g.field),['FACTS paper','Dataset version']);
  assert.match(gaps[0].says,/licence/);
  assert.match(gaps[0].says,/term of use and not a preference/);
});

test('whitespace is not a statement',()=>{
  const gaps=declarationGaps({requiredDeclarations:AR6},{chapter:'   ',facts:'',datasetVersion:'20210809'});
  assert.deepEqual(gaps.map(g=>g.field),['IPCC AR6 chapter','FACTS paper']);
});

test('all stated means no gaps, and a ruleset declaring none has none',()=>{
  assert.deepEqual(declarationGaps({requiredDeclarations:AR6},
    {chapter:'a',facts:'b',datasetVersion:'c'}),[]);
  assert.deepEqual(declarationGaps({},{}),[]);
  assert.deepEqual(declarationGaps({requiredDeclarations:AR6},undefined).length,3);
});

test('an interpretation obligation reads differently from a licence one',()=>{
  const [gap]=declarationGaps({requiredDeclarations:[
    {...AR6[0],obligation:'interpretation'}]},{});
  assert.match(gap.says,/a reader cannot tell what these numbers mean/);
  assert.doesNotMatch(gap.says,/licence/);
});

// Text parameters: a rule can compare a field against a word, not only against a number.
const ruleset=(parameters,rules)=>({title:'T',rules,parameters});
const textParam={name:'family',role:'family',type:'text',placeholder:'{{family}}',
  meaning:'the family value that includes vertical land motion.'};

test('a text parameter binds as an escaped N3 string literal',()=>{
  const out=bindParameters(ruleset([textParam],'{ ?r fw:family {{family}}. } => { ?r fw:ok true. }.'),
    {family:'with_vlm'});
  assert.match(out,/fw:family "with_vlm"\./);
});

test('a quote in a stated value cannot close the literal early',()=>{
  const out=bindParameters(ruleset([textParam],'{ ?r fw:family {{family}}. } => { ?r fw:ok true. }.'),
    {family:'with"vlm'});
  assert.match(out,/fw:family "with\\"vlm"\./,'the quote is escaped, not left to change the rule');
});

test('an empty text parameter is refused by name',()=>{
  assert.throws(()=>bindParameters(ruleset([textParam],'{{family}}'),{family:'  '}),
    /needs a value for family/);
});

test('a pattern checks shape and says so when it fails',()=>{
  const doi={...textParam,name:'doi',placeholder:'{{doi}}',pattern:'^10\\.\\d{4,}/.+',
    meaning:'a DOI.'};
  assert.doesNotThrow(()=>bindParameters(ruleset([doi],'{{doi}}'),{doi:'10.5281/zenodo.5914709'}));
  assert.throws(()=>bindParameters(ruleset([doi],'{{doi}}'),{doi:'TODO'}),/does not look like/);
});

test('a number parameter given text is refused, and text given a number',()=>{
  const n={name:'t',role:'r',type:'number',unit:'u',placeholder:'{{t}}',meaning:'m',min:0,max:10};
  assert.throws(()=>bindParameters(ruleset([n],'{{t}}'),{t:'five'}),/is a number and was given/);
  assert.throws(()=>bindParameters(ruleset([textParam],'{{family}}'),{family:5}),/needs a value for family/);
});

test('numeric binding is unchanged',()=>{
  const n={name:'t',role:'r',type:'number',unit:'u',placeholder:'{{t}}',meaning:'m',min:0,max:10,decimals:9};
  assert.match(bindParameters(ruleset([n],'?x math:greaterThan {{t}}.'),{t:5}),/greaterThan 5\.000000000/);
});
