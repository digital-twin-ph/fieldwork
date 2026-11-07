import test from 'node:test';
import assert from 'node:assert/strict';
import {executionPlan,openEnds} from '../build/core.js';

/** STEPS UNDER CONSTRUCTION (experiment 182): a run also computes a step that leads to no output when every input it
 *  needs is connected, so the step chained after it can be set up against its table. */
const table=(id,keys)=>({id,type:'table_input',x:0,y:0,params:{label:id,keys,valueField:'n',
  data:{kind:'data-table',keys,valueField:'n',rows:[{key:Object.fromEntries(keys.map(k=>[k,'a'])),value:1}],rowCount:1,missingValueCount:0}}});
const node=(id,type,params)=>({id,type,x:0,y:0,params:{label:id,...params}});
const edge=(from,to,port)=>({id:`${from}-${to}-${port}`,from,to,port});

test('a finished step leading to no output is computed after the plan, with what above it the plan does not make',()=>{
  const w={schema:'fieldwork/workflow/1',name:'t',nodes:[table('cases',['place','week']),table('rain',['place','week']),
      node('kept','select_rows',{keyColumn:'place',values:['a']}),node('shown','table_output',{}),
      node('join','relate_table',{on:'place',bring:'n'}),node('half','relate_table',{on:'',bring:''})],
    edges:[edge('cases','kept','records'),edge('kept','shown','table'),
      edge('kept','join','records'),edge('rain','join','related'),edge('kept','half','records')]};
  const planned=executionPlan(w);
  assert.deepEqual(planned.map(n=>n.id),['cases','kept','shown']);
  // `join` has both inputs; `rain` is above it and not planned. `half` lacks its second table and is left alone.
  assert.deepEqual(openEnds(w,planned).map(n=>n.id),['rain','join']);
});

test('a run computes the step under construction and hands its table on; one that fails is named and the run goes on',async()=>{
  const {executeWorkflow}=await import('../build/core.js');
  const w={schema:'fieldwork/workflow/1',name:'t',nodes:[table('cases',['place','week']),table('rain',['place','week']),
      node('kept','select_rows',{keyColumn:'place',values:['a']}),node('shown','table_output',{}),
      node('join','relate_table',{on:'place',bring:'n'}),node('bad','select_rows',{keyColumn:'nowhere',values:['x']})],
    edges:[edge('cases','kept','records'),edge('kept','shown','table'),
      edge('kept','join','records'),edge('rain','join','related'),edge('kept','bad','records')]};
  const run=await executeWorkflow(w,async()=>({conclusions:[]}),()=>{});
  assert.ok(run.tables.join,'the join under construction has its table');
  assert.equal(run.unfinished.length,1);assert.equal(run.unfinished[0].nodeId,'bad');
  assert.match(run.unfinished[0].message,/no "nowhere" column/);
});

/** ONE RELATE, SEVERAL SHIFTS, IN A RUN (experiment 185): the step brings a column per shift, keeps every row, and its
 *  receipt states each shift's column, matched and empty counts. */
test('a Relate step with several shifts runs, keeping every row, and its receipt states each shift',async()=>{
  const {executeWorkflow}=await import('../build/core.js');
  const t=(id,rows)=>({id,type:'table_input',x:0,y:0,params:{label:id,keys:['place','week'],valueField:'n',
    data:{kind:'data-table',keys:['place','week'],valueField:'n',rows:rows.map(([w,n])=>({key:{place:'a',week:w},value:n})),rowCount:rows.length,missingValueCount:0}}});
  const w={schema:'fieldwork/workflow/1',name:'t',nodes:[t('cases',[['2024-02-18',5],['2024-02-25',6]]),t('rain',[['2024-02-11',20],['2024-02-18',30]]),
      node('join','relate_table',{on:'place',bring:'n',within:{date:'week',start:'week',end:'week'},shifts:[0,-7]}),node('shown','table_output',{})],
    edges:[edge('cases','join','records'),edge('rain','join','related'),edge('join','shown','table')]};
  const run=await executeWorkflow(w,async()=>({conclusions:[]}),()=>{});
  const table=run.tables.join;
  assert.deepEqual(table.keys,['place','week','n_0d','n_-7d']);
  assert.deepEqual(table.rows.map(r=>[r.key.n_0d,r.key['n_-7d']]),[['30','20'],['','30']]);
  assert.deepEqual(run.relateShifts.join.map(c=>[c.shiftDays,c.matched,c.empty]),[[0,1,1],[-7,2,0]]);
  const facts=run.receipts.find(r=>r.nodeId==='join').facts;
  assert.match(facts,/fw:columnName "n_0d"; fw:dateShiftDays "0"\^\^xsd:integer; fw:relatedRowCount "1"\^\^xsd:integer; fw:emptyRowCount "1"\^\^xsd:integer/);
});
