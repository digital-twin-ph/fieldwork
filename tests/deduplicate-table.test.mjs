import test from 'node:test';
import assert from 'node:assert/strict';
import {dataTable} from '../build/data-table.js';
import {deduplicateTable} from '../build/deduplicate-table.js';
import {pairSignature} from '../build/deduplicate-points.js';

/** THE DEDUPLICATE WIDGET OVER ONE TABLE. Experiment 164: rows that repeat the primary key are
 *  compared, exact copies merge, and a pair that disagrees waits for a person who says which row
 *  stays. */
const list=dataTable({headers:['ID','Food','Age'],rows:[
  ['1','Y','30'],['1','Y','30'],['2','N','40'],['2','Y','40'],['3','N','50']]},
  {keys:['ID','Food'],valueField:'Age',primaryKey:['ID']});
const params={nameMatch:'exact',fuzzyThreshold:0.88};

test('an exact copy merges, and a pair that disagrees waits with its differing column named',()=>{
  assert.equal(list.findings.length,2);
  const result=deduplicateTable(list,'t','Line list',params);
  assert.equal(result.compared,2);
  assert.equal(result.matched,1);
  assert.equal(result.awaiting,1);
  assert.deepEqual(result.removedRows,[2]);
  assert.equal(result.table.rowCount,4);
  const waiting=result.candidates.find(c=>c.classification==='review');
  assert.deepEqual(waiting.differs,['Food']);
  assert.match(result.table.findings[0].text,/Rows 3, 4 still repeat ID=2/);
  assert.equal(list.rowCount,5,'the input table is not changed');
});

test('a person keeps the second row, and the decision lapses if either row changes',()=>{
  const first=deduplicateTable(list,'t','Line list',params);
  const waiting=first.candidates.find(c=>c.classification==='review');
  const decision={key:waiting.key,decision:'match',reason:'Food was corrected',signature:pairSignature(waiting),keep:'b'};
  const result=deduplicateTable(list,'t','Line list',params,[decision]);
  assert.deepEqual(result.removedRows,[2,3]);
  assert.equal(result.table.findings,undefined);
  assert.deepEqual(result.table.rows.map(r=>r.key.Food),['Y','Y','N']);
  const stale={...decision,signature:'changed'};
  assert.equal(deduplicateTable(list,'t','Line list',params,[stale]).awaiting,1);
});

test('without a primary key or chosen columns there is nothing to block on, and it says so',()=>{
  const bare=dataTable({headers:['ID','Age'],rows:[['1','3'],['1','3']]},{keys:['ID'],valueField:'Age'});
  assert.throws(()=>deduplicateTable(bare,'t','T',params),/declare a primary key/);
  assert.equal(deduplicateTable(bare,'t','T',{...params,blockColumns:['ID']}).merged,1);
});
