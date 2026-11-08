import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateGroupTableNulls} from '../build/group-table.js';
import {selectRows} from '../build/select-rows.js';

/** TWO PARAMETERS THAT OUTLIVED WHAT THEY MEANT, found on 2026-10-31 in the one workflow the
 *  South London example had not re-exported -- "Cholera in 1849 compared with 1854".
 *
 *  Both are the same shape: a value saved on a node that NOTHING IN THE APPLICATION COULD REACH.
 *  Neither changed a number. Both would have been published in a bundle a collaborator reads. */

const table=()=>({kind:'data-table',keys:['measure'],valueField:'count',
  rows:[{key:{measure:'deaths 1849'},value:2261},
        {key:{measure:'deaths 1854'},value:2458},
        {key:{measure:'1854 deaths per 1849 death'},value:1.087}],
  rowCount:3,missingValueCount:0});

test('A VALUE THE TABLE NO LONGER HOLDS IS REPORTED, which is how this was found at all',()=>{
  // `select_rows` asked for "change 1849 to 1854" long after `derive_value` stopped producing it.
  // It never silently vanished -- `absent` carried it into every receipt -- and that is the only
  // reason a stale parameter was visible from outside the file.
  const result=selectRows(table(),'measure',['change 1849 to 1854','1854 deaths per 1849 death']);
  assert.deepEqual(result.absent,['change 1849 to 1854']);
  assert.equal(result.kept,1);
  // And asking ONLY for what is gone is refused rather than drawn as an empty figure.
  assert.throws(()=>selectRows(table(),'measure',['change 1849 to 1854']),/Nothing would be left/);
});

test('`missingAsZero` is dropped on open, because it states the opposite of what runs',()=>{
  // The practitioner withdrew the zero override: *"the more prudent action to deal with blanks is
  // to opt to exclude them, not assign a zero value."* `excludeMissing` replaced it and nothing
  // reads the old key -- but a reader of the published JSON would find the two side by side and
  // believe the one that is not true.
  const workflow={nodes:[
    {id:'a',type:'group_table',params:{by:['water_supply','measure'],excludeMissing:true,missingAsZero:true}},
    {id:'b',type:'group_table',params:{by:['measure']}},
    {id:'c',type:'chart_output',params:{barOrder:'smallest'}},
    null],edges:[]};
  migrateGroupTableNulls(workflow);
  assert.ok(!('missingAsZero' in workflow.nodes[0].params),'the withdrawn key survived the open');
  assert.equal(workflow.nodes[0].params.excludeMissing,true,'the rule that replaced it was lost');
  assert.deepEqual(workflow.nodes[1].params,{by:['measure']},'a node without the key was rewritten');
  assert.deepEqual(workflow.nodes[2].params,{barOrder:'smallest'},'another node type was touched');
});
