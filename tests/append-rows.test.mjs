import test from 'node:test';
import assert from 'node:assert/strict';
import {dataTable} from '../build/data-table.js';
import {appendRows,appendSentence} from '../build/append-rows.js';

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
  assert.deepEqual(result.missing,[{column:'plz',rows:2,from:'first'}]);
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
