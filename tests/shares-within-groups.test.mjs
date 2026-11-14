import test from 'node:test';
import assert from 'node:assert/strict';
import {groupTable,SHARE_MEASURE,shareName} from '../build/group-table.js';
import {wideFrame} from '../build/data-table-ui.js';

/** SHARES WITHIN GROUPS (experiment 191). A line list counted by classification and by what was recorded, as the
 *  Sierra Leone measles table is: the share within each classification, the share of all, and the refusals. */
const line=(n,classification,symptoms)=>Array.from({length:n},(_,i)=>({key:{id:`${classification}-${symptoms}-${i}`,classification,symptoms},value:1}));
const rows=[...line(3,'by the clinician','none'),...line(1,'by the clinician','some'),...line(4,'by symptoms','all')];
const table={kind:'data-table',keys:['id','classification','symptoms'],valueField:'value',rows,rowCount:rows.length,missingValueCount:0};

test('each group\'s share within a column: every stratum totals 100, beside its count',()=>{
  const r=groupTable(table,{by:['classification','symptoms'],aggregate:'count',share:{within:['classification']}});
  assert.deepEqual(r.table.keys,['classification','symptoms',SHARE_MEASURE]);
  assert.deepEqual(r.table.wide,{measureKey:SHARE_MEASURE,subjectKeys:['classification','symptoms'],asDeclared:true});
  const cell=(c,s,m)=>r.table.rows.find(x=>x.key.classification===c&&x.key.symptoms===s&&x.key[SHARE_MEASURE]===m)?.value;
  const name=shareName(['classification']);
  assert.equal(name,'% within classification');
  assert.deepEqual([cell('by the clinician','none','rows'),cell('by the clinician','none',name)],[3,75]);
  assert.deepEqual([cell('by the clinician','some','rows'),cell('by the clinician','some',name)],[1,25]);
  assert.equal(cell('by symptoms','all',name),100);
  assert.equal(r.groups,3,'three groups, each now two rows');
  assert.equal(r.shares.name,name);
});

test('none ticked is the share of the whole table, held to one decimal place',()=>{
  const r=groupTable(table,{by:['classification'],aggregate:'count',share:{within:[]}});
  const share=r.table.rows.filter(x=>x.key[SHARE_MEASURE]==='% of all').map(x=>x.value);
  assert.deepEqual(share,[50,50]);
  const odd=groupTable({...table,rows:rows.slice(0,7),rowCount:7},{by:['classification'],aggregate:'count',share:{within:[]}});
  assert.deepEqual(odd.table.rows.filter(x=>x.key[SHARE_MEASURE]==='% of all').map(x=>x.value),[57.1,42.9]);
});

test('the view shows the count and the share as two columns, one row per group',()=>{
  const r=groupTable(table,{by:['classification','symptoms'],aggregate:'count',share:{within:['classification']}});
  const frame=wideFrame(r.table);
  assert.ok(frame,'a frame, not the long list');
  assert.equal(frame.subject,'classification');
  assert.deepEqual(frame.attributes,['symptoms']);
  assert.deepEqual(frame.columns,['rows','% within classification']);
  assert.deepEqual(frame.rows.map(x=>[x.label,...x.attributes,...x.cells]),
    [['by the clinician','none',3,75],['by the clinician','some',1,25],['by symptoms','all',4,100]]);
});

test('a stratum whose total is unknown has every share unknown, and is counted',()=>{
  const sums=[{key:{d:'a',k:'x'},value:2},{key:{d:'a',k:'y'},value:null},{key:{d:'b',k:'x'},value:5},{key:{d:'b',k:'y'},value:5}];
  const t={kind:'data-table',keys:['d','k'],valueField:'cases',rows:sums.flatMap(s=>[{...s,key:{...s.key,id:'1'}},{key:{...s.key,id:'2'},value:0}]),rowCount:8,missingValueCount:1};
  t.keys=['d','k','id'];
  const r=groupTable(t,{by:['d','k'],share:{within:['d']}});
  const share=(d,k)=>r.table.rows.find(x=>x.key.d===d&&x.key.k===k&&x.key[SHARE_MEASURE]!=='cases').value;
  assert.equal(share('a','x'),null);
  assert.equal(share('a','y'),null);
  assert.equal(share('b','x'),50);
  assert.equal(r.shares.unknownStrata,1);
});

test('a share is refused with a minimum or a maximum, and when every kept column is a "within" column',()=>{
  assert.throws(()=>groupTable(table,{by:['classification'],aggregate:'maximum',share:{within:[]}}),/minimum, maximum, mean or median/);
  assert.throws(()=>groupTable(table,{by:['classification'],aggregate:'count',share:{within:['classification']}}),/100% of itself/);
  assert.throws(()=>groupTable(table,{by:['classification'],aggregate:'count',share:{within:['symptoms']}}),/not a kept column/);
});

test('without a share the table is as it always was',()=>{
  const r=groupTable(table,{by:['classification'],aggregate:'count'});
  assert.deepEqual(r.table.keys,['classification']);
  assert.equal(r.shares,undefined);
});
