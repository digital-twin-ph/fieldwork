import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {compileAuthoredRuleset,evaluatedDirectly,otherwiseProblems} from '../build/authored-rules.js';
import {authoredFacts,authoredConclusions} from '../build/authored-application.js';
import {evaluateAuthored,evaluationSentence} from '../build/rule-evaluation.js';

/** IS NOT AND OTHERWISE (experiment 192). Made-up records shaped like a measles line list: a laboratory result, a link
 *  to a confirmed case, and a rash. */
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('../vendor/eye-21.1.24.js',import.meta.url),'utf8'),{filename:'eye.js'});
const record=(properties,i)=>({id:`r${i}`,label:`Case ${i+1}`,properties});
const cases=[
  {lab:'Positive',contact:'No',rash:'Yes'},
  {lab:'Negative',contact:'Yes',rash:'Yes'},
  {lab:'',contact:'Yes',rash:'Yes'},
  {lab:'Pending',contact:'No',rash:'Yes'},
  {lab:'',contact:'',rash:'Yes'},
  {lab:'',contact:'Unknown',rash:'No'},
  {lab:'',contact:'',rash:''},
].map(record);
const fields=[{attribute:'lab',predicate:'fwa:lab',kind:'term'},{attribute:'contact',predicate:'fwa:contact',kind:'term'},
  {attribute:'rash',predicate:'fwa:rash',kind:'term'}];
const is=(field,value)=>({field,comparator:'equals',value});
const isNot=(field,value)=>({field,comparator:'notEquals',value});
const rule=(conditions,predicate,value)=>({any:[{all:conditions}],then:[{predicate,value}]});

test('is not matches a recorded value that differs, never one not recorded, the same in the reasoner and directly',async()=>{
  const rules=[rule([isNot('fwa:rash','fwa:No')],'fwa:rashNotNo','fwa:Yes')];
  const compiled=compileAuthoredRuleset({subject:'?s',rules});
  assert.match(compiled,/log:notEqualTo fwa:No/);
  const direct=evaluateAuthored(cases,fields,rules);
  const table={type:'FeatureCollection',features:cases.map(r=>({type:'Feature',id:r.id,properties:r.properties,geometry:null}))};
  const quads=await eyereasoner.n3reasoner(authoredFacts(table,fields)+'\n'+compiled,undefined,{outputType:'quads'});
  const reasoned=authoredConclusions(quads.map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value})));
  cases.forEach((r,i)=>assert.deepEqual(direct.records[i].values,reasoned.get(encodeURIComponent(r.id))??{},`${r.label}: the same both ways`));
  assert.deepEqual(direct.records.map(r=>r.values.rashNotNo??''),['Yes','Yes','Yes','Yes','Yes','','']);
});

// WHO'S ORDER, in columns read in stages: the laboratory result, the link, then the class, each with its otherwise.
const who=[
  rule([is('fwa:lab','fwa:Positive')],'fwa:labResult','fwa:positive'),
  rule([is('fwa:lab','fwa:Negative')],'fwa:labResult','fwa:negative'),
  {any:[{all:[is('fwa:lab','fwa:Pending')]},{all:[is('fwa:lab','fwa:Indeterminate')]}],then:[{predicate:'fwa:labResult',value:'fwa:awaiting'}]},
  rule([is('fwa:contact','fwa:Yes')],'fwa:link','fwa:linked'),
  rule([is('fwa:labResult','fwa:positive')],'fwa:class','fwa:LaboratoryConfirmed'),
  rule([is('fwa:labResult','fwa:negative')],'fwa:class','fwa:Discarded'),
  rule([isNot('fwa:labResult','fwa:positive'),isNot('fwa:labResult','fwa:negative'),is('fwa:link','fwa:linked')],'fwa:class','fwa:EpiLinked'),
  rule([is('fwa:labResult','fwa:awaiting'),is('fwa:link','fwa:notLinked')],'fwa:class','fwa:Awaiting'),
  rule([is('fwa:labResult','fwa:none'),is('fwa:link','fwa:notLinked'),is('fwa:rash','fwa:No')],'fwa:class','fwa:DiscardedNoRash'),
];
const defaults=[{predicate:'fwa:class',value:'fwa:CannotBeClassified'},{predicate:'fwa:labResult',value:'fwa:none'},
  {predicate:'fwa:link',value:'fwa:notLinked'}];

test('an otherwise waits for the columns its column reads, so each record lands in one class',()=>{
  const e=evaluateAuthored(cases,fields,who,{},undefined,defaults);
  assert.deepEqual(e.records.map(r=>r.values.class),
    ['LaboratoryConfirmed','Discarded','EpiLinked','Awaiting','CannotBeClassified','DiscardedNoRash','CannotBeClassified']);
  assert.deepEqual(e.records[4].defaulted.sort(),['class','labResult','link'],'every column of case 5 took its otherwise');
  assert.deepEqual(e.defaultedByColumn,{labResult:4,link:5,class:2},'two of seven have a contact; four have no result');
  assert.ok(e.records.every(r=>!r.conflicts.length));
  assert.match(evaluationSentence(e,cases.map(c=>c.label)),/2 records took class's otherwise, because no rule gave class a value/);
});

test('an otherwise never settles a conflict, and a ruleset with one is evaluated directly, not compiled',()=>{
  const rules=[rule([is('fwa:rash','fwa:Yes')],'fwa:group','fwa:A'),rule([is('fwa:contact','fwa:Yes')],'fwa:group','fwa:B')];
  const e=evaluateAuthored(cases,fields,rules,{},undefined,[{predicate:'fwa:group',value:'fwa:Neither'}]);
  assert.equal(e.records[2].conflicts[0].column,'group','case 3 has a rash and a contact: two values, reported');
  assert.equal(e.records[2].values.group,undefined);
  assert.equal(e.records[6].values.group,'Neither');
  assert.equal(evaluatedDirectly({rules,otherwise:[{predicate:'fwa:group',value:'fwa:Neither'}]}),true);
  assert.equal(evaluatedDirectly({rules}),false,'is not alone still runs in the reasoner');
  assert.throws(()=>compileAuthoredRuleset({subject:'?s',rules,otherwise:[{predicate:'fwa:group',value:'fwa:Neither'}]}),/evaluated directly/);
});

test('two otherwises for one column, or two columns waiting on each other, are refused while written',()=>{
  assert.match(otherwiseProblems({rules:[],otherwise:[{predicate:'fwa:a',value:'fwa:x'},{predicate:'fwa:a',value:'fwa:y'}]})[0],/two otherwises/);
  const circle=[rule([is('fwa:b','fwa:x')],'fwa:a','fwa:y'),rule([is('fwa:a','fwa:y')],'fwa:b','fwa:x')];
  assert.match(otherwiseProblems({rules:circle,otherwise:[{predicate:'fwa:a',value:'fwa:n'},{predicate:'fwa:b',value:'fwa:n'}]})[0],/its own default/);
  assert.throws(()=>evaluateAuthored(cases,fields,circle,{},undefined,[{predicate:'fwa:a',value:'fwa:n'},{predicate:'fwa:b',value:'fwa:n'}]),/its own default/);
});
