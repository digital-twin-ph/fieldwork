/** Select rows by value, on Snow's Table IX (1855): houses supplied and deaths in the first seven weeks, for three
 *  suppliers, and houses without a death, which leaves the 2x2 once `houses` is left out. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRows} from '../build/select-rows.js';

const TABLE_IX=[
  ['Southwark and Vauxhall Company',40046,1263],
  ['Lambeth Company',26107,98],
  ['Rest of London',256423,1422],
];
const tableIX=()=>{
  const rows=TABLE_IX.flatMap(([supplier,houses,deaths])=>[
    {key:{supplier,measure:'houses'},value:houses},
    {key:{supplier,measure:'deaths'},value:deaths}]);
  return {kind:'data-table',keys:['supplier','measure'],valueField:'count',unit:'houses',
    rows,rowCount:rows.length,missingValueCount:0};
};
// Houses without a death, as Apply ruleset computes it for every record (experiment 188): one more measure per supplier.
const withSurvivors=()=>{const t=tableIX();
  const rows=[...t.rows,...TABLE_IX.map(([supplier,houses,deaths])=>({key:{supplier,measure:'houses without a death'},value:houses-deaths}))];
  return {...t,rows,rowCount:rows.length};};

test('keeping two measures leaves the 2x2, in the order named',()=>{
  const derived=withSurvivors();
  const {table,kept,dropped,absent}=selectRows(derived,'measure',['deaths','houses without a death']);
  assert.equal(kept,6);
  assert.equal(dropped,3,'the three "houses" rows are the ones removed');
  assert.deepEqual(absent,[]);
  // Two outcomes per supplier, and the totals a grid draws from them are now the houses supplied.
  const southwark=table.rows.filter(r=>r.key.supplier==='Southwark and Vauxhall Company');
  assert.equal(southwark.length,2);
  assert.equal(southwark[0].key.measure,'deaths','named order, not file order');
  assert.equal(southwark.reduce((sum,r)=>sum+r.value,0),40046);
});

test('a value the table does not hold is reported, not ignored',()=>{
  const {absent}=selectRows(tableIX(),'measure',['deaths','survivors']);
  assert.deepEqual(absent,['survivors']);
});

test('keeping nothing that exists is refused rather than returning an empty table',()=>{
  assert.throws(()=>selectRows(tableIX(),'measure',['survivors']),/Nothing would be left/);
});
