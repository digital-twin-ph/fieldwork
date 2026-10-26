/** Rules written on a step read the port that step actually has.
 *
 *  `authorRulesOn` keeps the wiring of whatever ruleset the node was holding -- "the step still
 *  takes what it took and gives back what it gave" (app.ts) -- so a node forked from the extract
 *  contract carries a `projections` port and never had a `subjects` one. The executor named
 *  `subjects` literally, got undefined, and refused the run with "Connect records to classify.
 *  There is nothing to apply rules to." about an input that was connected.
 *
 *  Reported 2026-10-26 against the Manila extract step. The branch's own comment already stated
 *  the rule it was breaking: "The pin gives this node its ports."
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {pinnedRuleset} from '../build/rule-application.js';

const root=new URL('../',import.meta.url);
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('vendor/eye-21.1.24.js',root),'utf8'),{filename:'eye.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const rows=[{key:{site:'Manila South'},value:410},{key:{site:'Manila North'},value:180}];
const table={kind:'data-table',keys:['site'],valueField:'value_mm',unit:'millimetre',
  rows,rowCount:rows.length,missingValueCount:0};

/** A node forked from a pin whose declared port is NOT `subjects`. */
function workflow(){
  const pin=pinnedRuleset('urn:fieldwork:ruleset:extract-contract','1.0.0');
  return {schema:'fieldwork/workflow/1',name:'Rules on a forked step',
    nodes:[
      {id:'projections',type:'table_input',x:0,y:0,
        params:{label:'Projections',keys:['site'],valueField:'value_mm',data:table}},
      {id:'rules',type:'apply_ruleset',x:300,y:0,
        params:{label:'Rules for this step',
          // Exactly what authorRulesOn writes: the held pin's ports, kept.
          ruleset:{id:pin.id,version:pin.version,title:'Rules written in this workflow',
            inputs:pin.inputs,output:pin.output},
          parameters:{},
          authored:{title:'Rules for this step',mustNotBeReadAs:'',parameters:[],
            fields:[{attribute:'value_mm',predicate:'fw:projectedValue',kind:'number',
              label:'Projected change',unit:'http://qudt.org/vocab/unit/MilliM',unitLabel:'mm'}],
            rules:[
              {any:[{all:[{field:'fw:projectedValue',comparator:'greaterThan',value:300}]}],
               then:[{predicate:'fw:decision',value:'fw:Review'}]},
              {any:[{all:[{field:'fw:projectedValue',comparator:'notGreaterThan',value:300}]}],
               then:[{predicate:'fw:decision',value:'fw:NoFlag'}]},
            ]}}},
      {id:'out',type:'table_output',x:600,y:0,params:{label:'Judged rows',inputMode:'table'}},
    ],
    edges:[{id:'e',from:'projections',to:'rules',port:'projections'},
      {id:'e2',from:'rules',to:'out',port:'table'}]};
}

test('a step whose pin declares `projections` reads its records from that port', async () => {
  // The failure this test exists for was a refusal, not a wrong number: the run rejected with
  // "Connect records to classify. There is nothing to apply rules to." So reaching the
  // assertions below at all is most of the point.
  const run=await executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow()))),reason);
  const judged=run.outputs.find(o=>o.nodeId==='out');
  assert.equal(judged.rows.length,2,'both rows were judged');
  const decision=site=>{
    const row=judged.rows.find(r=>r.key.site===site);
    return Object.entries(row.key).find(([k])=>k!=='site')?.[1];
  };
  assert.match(String(decision('Manila South')),/Review/,'410 mm is over the threshold');
  assert.match(String(decision('Manila North')),/NoFlag/,'180 mm is under it');
});
