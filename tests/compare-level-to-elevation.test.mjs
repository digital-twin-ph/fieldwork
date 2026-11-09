import test from 'node:test';
import assert from 'node:assert/strict';
import {executeWorkflow} from '../build/core.js';
import {resolveRuleset} from '../build/rulesets.js';

/** COMPARE A PROJECTED RISE WITH AN ELEVATION, as a published ruleset (experiment 197), replacing the Compare level to
 *  elevation widget. The rise in millimetres as Relate brings it, the elevation in metres; equality reaches. */
const run=async rows=>{
  const data={kind:'data-table',keys:['place','value_mm','elevation_m'],valueField:'n',numericKeys:{value_mm:'millimetre',elevation_m:'metre'},
    rows:rows.map(([place,value_mm,elevation_m])=>({key:{place,value_mm,elevation_m},value:1})),rowCount:rows.length,missingValueCount:0};
  const w={schema:'fieldwork/workflow/1',name:'t',nodes:[{id:'t',type:'table_input',x:0,y:0,params:{label:'t',keys:data.keys,valueField:'n',data}},
    {id:'c',type:'apply_ruleset',x:0,y:0,params:{label:'c',ruleset:{id:'urn:fieldwork:ruleset:compare-level-to-elevation',version:'1.0.0',
      title:'Compare a projected rise with an elevation',inputs:[['records','table']],output:'table'},parameters:{}}},
    {id:'o',type:'table_output',x:0,y:0,params:{label:'o',inputMode:'table'}}],
    edges:[{id:'e1',from:'t',to:'c',port:'records'},{id:'e2',from:'c',to:'o',port:'table'}]};
  return (await executeWorkflow(w,async()=>[])).tables.c.rows.map(r=>r.key);
};

test('reaches, stays below, equal reaches, and a missing value is unknown',async()=>{
  const out=await run([['below',  '1124','0.9'],['equal','1124','1.124'],['above','1124','1.5'],['norise','','1'],['noheight','1124','']]);
  assert.deepEqual(out.map(r=>r.level),['Reaches','Reaches','StaysBelow','Unknown','Unknown']);
  assert.deepEqual(out.map(r=>r.margin_mm),['-224','0','376','','']);
});

test('it carries resolvable evidence and says what it must not be read as',()=>{
  const r=resolveRuleset('urn:fieldwork:ruleset:compare-level-to-elevation','1.0.0');
  assert.match(r.mustNotBeReadAs,/inundation or flood model/);
  assert.ok(r.basis.evidence.every(e=>/^https:\/\/doi\.org\//.test(e.url)));
  assert.deepEqual(r.inputContract.fieldFrom.map(b=>b.attribute),['value_mm','elevation_m']);
});
