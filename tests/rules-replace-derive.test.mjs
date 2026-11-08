import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {runInThisContext} from 'node:vm';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {pinnedRuleset} from '../build/rule-application.js';

/** APPLY RULESET GIVES DERIVE A VALUE'S TABLE (experiment 188, stage 2). Every Derive a value step in the published
 *  South London and Nigeria projects, with an Apply ruleset step beside it on the same input: one rule, no condition,
 *  the same two columns and operator, the same new column's name. Both tables reach an output, the workflow runs, and
 *  the two must be the same rows with the same values. The rule reads the wide table's subjects, never its measure
 *  column: nothing in it names "measure". */
const root=new URL('../',import.meta.url);
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('vendor/eye-21.1.24.js',root),'utf8'),{filename:'eye.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const REPOS=['example-1855-cholera-south-london','example-2024-nigeria-immunization'];
const predicate=name=>`fwa:m_${name.replace(/[^a-zA-Z0-9]+/g,'_')}`;
const cases=REPOS.flatMap(repo=>{
  const file=new URL(`../../${repo}/fieldwork-project.json.gz`,import.meta.url);
  if(!existsSync(file))return [];
  const project=JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'));
  return (project.workflows??project.project.workflows).map(w=>w.document.workflow??w.document)
    .filter(w=>w.nodes.some(n=>n.type==='derive_value')).map(w=>({repo,workflow:w}));
});

test('the published Derive a value steps are all here to compare',()=>{
  if(!cases.length)return;
  assert.equal(cases.length,4,'three South London workflows and Nigeria');
});

for(const {repo,workflow} of cases)test(`${repo}: "${workflow.name}" gives the same table by Apply ruleset`,async()=>{
  const w=structuredClone(workflow);delete w.manifest;
  const derive=w.nodes.find(n=>n.type==='derive_value');
  const {left,operator,right,name}=derive.params;
  const input=w.edges.find(e=>e.to===derive.id);
  const pin=pinnedRuleset('urn:fieldwork:ruleset:extract-contract','1.0.0');
  w.nodes.push(
    {id:'byRule',type:'apply_ruleset',x:0,y:0,params:{label:'By rule',
      ruleset:{id:pin.id,version:pin.version,title:'Rules written in this workflow',inputs:pin.inputs,output:pin.output},
      parameters:{},authored:{title:'By rule',mustNotBeReadAs:'',parameters:[],
        fields:[...new Set([left,right])].map(m=>({attribute:m,predicate:predicate(m),kind:'number',unit:'unit:NUM'})),
        rules:[{any:[{all:[]}],then:[{predicate:'fwa:computed',column:name,
          compute:{left:{field:predicate(left)},operator,right:{field:predicate(right)}}}]}]}}},
    {id:'outDerive',type:'table_output',x:0,y:0,params:{label:'Derived',inputMode:'table'}},
    {id:'outRule',type:'table_output',x:0,y:0,params:{label:'By rule',inputMode:'table'}});
  w.edges.push({id:'x1',from:input.from,to:'byRule',port:'projections'},
    {id:'x2',from:derive.id,to:'outDerive',port:'table'},{id:'x3',from:'byRule',to:'outRule',port:'table'});
  const run=await executeWorkflow(validateWorkflow(w),reason);
  const rows=id=>run.outputs.find(o=>o.nodeId===id).rows;
  const derived=rows('outDerive'),byRule=rows('outRule');
  assert.ok(derived.some(r=>Object.values(r.key).includes(name)),`Derive a value made "${name}" rows`);
  assert.equal(byRule.length,derived.length,'the same number of rows');
  assert.deepEqual(byRule,derived,'the same rows, keys and values, in the same order');
});
