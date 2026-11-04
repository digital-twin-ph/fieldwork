import test from 'node:test';
import assert from 'node:assert/strict';
import {dehydrateWorkflow,hydrateWorkflow} from '../build/project.js';
import {withoutRemoteRows} from '../build/remote-table.js';

/** A WIDE TABLE'S SOURCE FILE IS KEPT BY DIGEST, not inside the saved workflow. Found 2026-11-04 (experiment 174):
 *  NYC's file read wide, 92 columns by 3,653 rows, did not fit in the saved workflow and the save was refused. */
const source={headers:['date','count'],rows:[['2023-06-07','49']]};
const node=extra=>({id:'t',type:'table_input',params:{data:{rows:[]},sourceTable:source,sourceRef:'source:abc',...extra}});

test('saved without its source file when the device holds it, and given it back on open',()=>{
  const stored=dehydrateWorkflow({nodes:[node()]},digest=>digest==='source:abc');
  assert.equal(stored.nodes[0].params.sourceTable,undefined);
  assert.equal(stored.nodes[0].params.sourceRef,'source:abc');
  const opened=hydrateWorkflow(stored,{'source:abc':source});
  assert.deepEqual(opened.nodes[0].params.sourceTable,source);
});

test('kept inline when the device does not hold it, and refused on open when it is missing',()=>{
  assert.deepEqual(dehydrateWorkflow({nodes:[node()]},()=>false).nodes[0].params.sourceTable,source);
  const stored=dehydrateWorkflow({nodes:[node()]},()=>true);
  assert.throws(()=>hydrateWorkflow(stored,{}),/missing/);
});

test('an export of a fetched table carries neither the source file nor its reference',()=>{
  const exported=withoutRemoteRows({nodes:[node({remote:{url:'https://example.org/t.csv'}})]});
  assert.equal(exported.nodes[0].params.sourceTable,undefined);
  assert.equal(exported.nodes[0].params.sourceRef,undefined);
});
