/** `ASSIGN`, over the long-format table the application actually holds.
 *
 *  The numbers are Snow's Table IX (1855), which is the table the South London example already
 *  carries: houses supplied and deaths in the first seven weeks, for three suppliers. The
 *  derived measure is the one the 2x2 was missing -- houses WITHOUT a death -- and the point of
 *  deriving it here is that it had to be computed outside the application before.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveValue,selectRows} from '../build/derive-value.js';

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
const derive=(table,request)=>deriveValue(table,
  {keyColumn:'measure',left:'houses',operator:'minus',right:'deaths',
    name:'houses without a death',...request});

test('a measure is derived from two others, group by group',()=>{
  const {table,derived,gaps}=derive(tableIX(),{});
  assert.equal(derived,3,'one derived row per supplier');
  assert.deepEqual(gaps,[]);
  const value=supplier=>table.rows.find(r=>r.key.supplier===supplier
    &&r.key.measure==='houses without a death').value;
  assert.equal(value('Southwark and Vauxhall Company'),40046-1263);
  assert.equal(value('Lambeth Company'),26107-98);
  assert.equal(value('Rest of London'),256423-1422);
  // The rows it was computed from are still there. Removing them is a selection, and a
  // different step does it.
  assert.equal(table.rows.length,9);
});

test('a group missing an operand yields no row, and is named',()=>{
  const table=tableIX();
  // Lambeth's house count goes unrecorded, which is not the same as Lambeth having no houses.
  table.rows.find(r=>r.key.supplier==='Lambeth Company'&&r.key.measure==='houses').value=null;
  const result=derive(table,{});
  assert.equal(result.derived,2);
  assert.deepEqual(result.gaps,[{group:'Lambeth Company',missing:['houses']}]);
  assert.ok(!result.table.rows.some(r=>r.key.supplier==='Lambeth Company'
    &&r.key.measure==='houses without a death'),'no zero was invented for Lambeth');
});

test('a derived name already in the column is refused',()=>{
  assert.throws(()=>derive(tableIX(),{name:'deaths'}),/already a value/);
});

test('a column the table does not have is refused by name',()=>{
  assert.throws(()=>derive(tableIX(),{keyColumn:'outcome'}),/has no "outcome" column/);
});

test('division by zero is unknown rather than infinite',()=>{
  const table=tableIX();
  for(const row of table.rows)if(row.key.measure==='deaths')row.value=0;
  const {table:out}=derive(table,{operator:'dividedBy',name:'houses per death'});
  assert.ok(out.rows.filter(r=>r.key.measure==='houses per death').every(r=>r.value===null));
});

test('keeping two measures leaves the 2x2, in the order named',()=>{
  const derived=derive(tableIX(),{}).table;
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
