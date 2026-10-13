import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// RENAMED_NODE_TYPES is declared in src/types.ts and re-exported by core, which is the module the
// build emits; types.ts carries no entry point of its own.
import {validateWorkflow,TYPES,RENAMED_NODE_TYPES} from '../build/core.js';

const workflow=(nodes,edges=[])=>({schema:'fieldwork/workflow/1',name:'test',nodes,edges});

test('a saved workflow naming a renamed type still opens, and is stamped', ()=>{
  // A rename is not a retirement. A retirement refuses and names the widget; a rename rewrites and
  // records that it did, because the operation is unchanged and refusing would destroy work for a
  // naming decision the practitioner did not make.
  const square={type:'Polygon',coordinates:[[[25.9,-24.7],[25.95,-24.7],[25.95,-24.65],[25.9,-24.65],[25.9,-24.7]]]};
  const w=validateWorkflow(workflow([
    {id:'area',type:'area',x:0,y:0,params:{source:'drawn',label:'Study area',selectionMode:'bbox',geometry:square}},
    {id:'grid',type:'samples',x:10,y:10,params:{spacingM:250}}],
    [{id:'e1',from:'area',to:'grid',port:'area'}]));
  const node=w.nodes.find(n=>n.id==='grid');
  assert.equal(node.type,'point_grid','the old identifier must resolve to the new type');
  assert.deepEqual(node.sourceMigration,{fromType:'samples',version:'1'},
    'a rewrite a practitioner did not ask for must be visible in the file');
  assert.equal(node.params.spacingM,250,'parameters survive a rename untouched');
  assert.equal(w.edges[0].port,'area','a rename does not touch ports');
});

test('every renamed type maps to a type that exists', ()=>{
  for(const [from,to] of Object.entries(RENAMED_NODE_TYPES)){
    assert.ok(TYPES[to],`${from} is renamed to ${to}, which is not a node type`);
    assert.ok(!TYPES[from],`${from} must no longer be a node type, or the rename is incomplete`);
  }
});

test('the registry declares the archived name for every rename, and only for real ones', ()=>{
  const registry=JSON.parse(readFileSync(new URL('../widgets/registry.json',import.meta.url),'utf8'));
  const declared=new Map();
  for(const entry of registry.widgets)
    for(const previous of entry.previousNodeTypes??[])declared.set(previous,entry.nodeType);
  assert.deepEqual(Object.fromEntries(declared),RENAMED_NODE_TYPES,
    'the registry and the application must agree about what was renamed to what');
});

test('a rename runs before a retirement refuses, so the refusal names the right widget', ()=>{
  // The 2026-10-06 fixture names BOTH a renamed type (`samples`) and a retired one (`access`), and
  // it refuses by design -- a widget decomposed into three steps cannot be migrated to one other
  // widget. What this asserts is the ordering: the rename has already been applied by the time the
  // retirement check runs, so a practitioner is told about the widget that actually cannot be
  // replaced rather than about a name that was merely changed.
  const raw=JSON.parse(readFileSync(new URL('./fixtures/old-naledi-source-2026-10-06.json',import.meta.url),'utf8'));
  assert.ok(raw.nodes.some(n=>n.type==='samples'),'the fixture must still name the old type, or this test is vacuous');
  assert.throws(()=>validateWorkflow(raw),error=>{
    assert.match(error.message,/Facility access/,'the refusal must name the retired widget');
    assert.doesNotMatch(error.message,/samples|Point grid/,'a renamed widget must not appear in a retirement refusal');
    return true;
  });
});
