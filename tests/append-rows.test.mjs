import test from 'node:test';
import assert from 'node:assert/strict';
import {dataTable} from '../build/data-table.js';
import {appendRows,appendTables,appendSentence,appendPort,appendTableCount} from '../build/append-rows.js';

/** ROWS OF ONE TABLE AFTER ANOTHER'S, as pandas concat stacks them. Experiment 166. */
const cases=dataTable({headers:['id','fall','galia','age'],rows:[['c1','1','1','30'],['c2','1','0','41']]},
  {keys:['id','fall','galia'],valueField:'age'});
const matched=dataTable({headers:['id','fall','galia','plz','age'],rows:[['p1','0','0','30159','25']]},
  {keys:['id','fall','galia','plz'],valueField:'age'});

test('rows stack in order, columns line up by name, and a column one table lacks is said',()=>{
  const result=appendRows(cases,matched,{nameSource:true,sourceColumn:'source',firstLabel:'cases',secondLabel:'matched panel'});
  assert.equal(result.table.rowCount,3);
  assert.deepEqual(result.table.keys,['id','fall','galia','plz','source']);
  assert.deepEqual(result.table.rows.map(r=>r.key.source),['cases','cases','matched panel']);
  assert.equal(result.table.rows[0].key.plz,'');
  assert.deepEqual(result.missing,[{column:'plz',rows:2,table:1}]);
  assert.match(appendSentence(result,{nameSource:true,sourceColumn:'source'}),/"plz" is empty on the 2 rows from the first table/);
  assert.equal(cases.rowCount,2,'neither input is changed');
});

test('tables measuring different things, a clashing source name and equal labels stop the step',()=>{
  const other=dataTable({headers:['id','n'],rows:[['x','1']]},{keys:['id'],valueField:'n'});
  assert.throws(()=>appendRows(cases,other),/measure different things: "age" and "n"/);
  assert.throws(()=>appendRows(cases,matched,{nameSource:true,sourceColumn:'fall'}),/already a column/);
  assert.throws(()=>appendRows(cases,matched,{nameSource:true,sourceColumn:'source',firstLabel:'a',secondLabel:'a'}),/different labels/);
});

test('ids that repeat once stacked: qualified by source, or replaced by a new key with source and old id kept',()=>{
  const one=dataTable({headers:['id','age'],rows:[['1','30'],['2','40']]},{keys:['id'],valueField:'age',primaryKey:['id']});
  const two=dataTable({headers:['id','age'],rows:[['1','25']]},{keys:['id'],valueField:'age',primaryKey:['id']});
  const plain=appendRows(one,two);
  assert.deepEqual(plain.table.primaryKey,['id']);
  assert.match(plain.table.findings[0].text,/Rows 1, 3 repeat id=1/,'a repeat is a finding, not a refusal');
  const sourced=appendRows(one,two,{nameSource:true,sourceColumn:'source'});
  assert.deepEqual(sourced.table.primaryKey,['source','id']);
  assert.equal(sourced.table.findings,undefined);
  const keyed=appendRows(one,two,{nameSource:true,sourceColumn:'source',newKey:'row'});
  assert.deepEqual(keyed.table.primaryKey,['row']);
  assert.deepEqual(keyed.table.alternateKeys,[['source','id']]);
  assert.deepEqual(keyed.table.rows.map(r=>[r.key.row,r.key.id,r.key.source]),[['1','1','first'],['2','2','first'],['3','1','second']]);
  assert.throws(()=>appendRows(one,two,{newKey:'id'}),/already a column/);
});

/** ANY NUMBER OF TABLES, ONE STEP (experiment 181): the practitioner, 2026-11-06, "we do not want too many widgets of
 *  the same kind chained when 1 will do." Five regression tables, labelled by their lag, declared numbers in weeks. */
const estimates=(ratio,lower,upper)=>({kind:'data-table',keys:['term','statistic'],valueField:'value',
  interval:{column:'statistic',estimate:'rate ratio',lower:'lower 95%',upper:'upper 95%',level:95,ratio:true},
  rows:[['rate ratio',ratio],['lower 95%',lower],['upper 95%',upper],['p',0.01]].map(([statistic,value])=>({key:{term:'LST',statistic},value})),
  rowCount:4,missingValueCount:0});

test('five tables stack in port order, each labelled, the labels declared numbers in weeks',()=>{
  const tables=[estimates(0.993,0.983,1.004),estimates(0.979,0.969,0.989),estimates(0.963,0.954,0.973),
    estimates(1.007,0.997,1.017),estimates(1.063,1.053,1.073)];
  const params={nameSource:true,sourceColumn:'lag',labels:['0','2','4','6','8'],labelsAreNumbers:{unit:'weeks before'}};
  const result=appendTables(tables,params);
  assert.deepEqual(result.from,[4,4,4,4,4]);
  assert.equal(result.table.rowCount,20);
  assert.deepEqual([...new Set(result.table.rows.map(r=>r.key.lag))],['0','2','4','6','8']);
  assert.deepEqual(result.table.numericKeys,{lag:'weeks before'});
  assert.deepEqual(result.table.interval,tables[0].interval,'an interval every table declares the same way survives');
  assert.equal(result.table.findings,undefined);
  assert.equal(appendSentence(result,params),'4 from table 1, 4 from table 2, 4 from table 3, 4 from table 4, 4 from table 5: 20 in all; "lag" says which, as a number in weeks before.');
});

test('a label declared a number that is not one is a finding, and its rows are kept',()=>{
  const result=appendTables([estimates(1,1,1),estimates(1,1,1),estimates(1,1,1)],
    {nameSource:true,sourceColumn:'lag',labels:['0','2 weeks','4'],labelsAreNumbers:{unit:'weeks'}});
  assert.equal(result.table.rowCount,12);
  assert.equal(result.table.findings.length,1);
  assert.match(result.table.findings[0].text,/"2 weeks" labels 4 rows of "lag", declared a number in weeks, and is not one/);
  assert.deepEqual(result.table.findings[0].rows,[5,6,7,8]);
});

test('three tables: a repeated label, a different measure, and the third table named in what is missing',()=>{
  assert.throws(()=>appendTables([cases,cases,cases],{nameSource:true,sourceColumn:'s',labels:['a','b','a']}),/"a" is used twice/);
  const other=dataTable({headers:['id','n'],rows:[['x','1']]},{keys:['id'],valueField:'n'});
  assert.throws(()=>appendTables([cases,cases,other]),/Table 3 measures something different from the first: "n", not "age"/);
  const result=appendTables([cases,cases,matched]);
  assert.deepEqual(result.missing,[{column:'plz',rows:2,table:1},{column:'plz',rows:2,table:2}]);
  assert.match(appendSentence(result,{}),/"plz" is empty on the 2 rows from table 1/);
  assert.throws(()=>appendTables([cases]),/at least two tables/);
});

test('ports keep their saved names, and a saved two-table workflow keeps its labels',()=>{
  assert.deepEqual([0,1,2,3].map(appendPort),['records','records_2','records_3','records_4']);
  assert.equal(appendTableCount({}),2);assert.equal(appendTableCount({tableCount:5}),5);assert.equal(appendTableCount({tableCount:1}),2);
  const result=appendRows(cases,matched,{nameSource:true,sourceColumn:'source',firstLabel:'cases',secondLabel:'panel'});
  assert.deepEqual([...new Set(result.table.rows.map(r=>r.key.source))],['cases','panel']);
});
