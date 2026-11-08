/** A RANGE OF A COLUMN, instead of a list of its values.
 *
 *  The practitioner, 2026-11-03, building the NYC example's June 2023 smoke days by ticking fourteen
 *  dates out of 3,653: *"this is not frictionless"*. The range is from and to, both kept, and it is
 *  offered only for a column whose values are all dates or all numbers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRange,orderOf,inRange,rangeSentence} from '../build/select-rows.js';

const daily=(days,start='2023-05-30')=>{
  const first=Date.parse(`${start}T00:00:00Z`);
  const rows=Array.from({length:days},(_,i)=>({
    key:{date:new Date(first+i*86_400_000).toISOString().slice(0,10)},value:i===3?null:20+i}));
  return {kind:'data-table',keys:['date'],valueField:'count',rows,rowCount:rows.length,
    missingValueCount:rows.filter(r=>r.value===null).length};
};

test('the June smoke days are two ends, both kept, in the table\'s order',()=>{
  const {table,kept,dropped}=selectRange(daily(30),'date','2023-06-01','2023-06-14');
  assert.equal(kept,14);
  assert.equal(dropped,16);
  assert.equal(table.rows[0].key.date,'2023-06-01');
  assert.equal(table.rows.at(-1).key.date,'2023-06-14');
  // A missing count is a VALUE missing, not a row: 2 June has no count and is still kept, counted.
  assert.equal(table.missingValueCount,1);
  assert.equal(selectRange(daily(30),'date','2023-06-10','2023-06-14').table.missingValueCount,0);
  assert.equal(rangeSentence('date','2023-06-01','2023-06-14'),'date from 2023-06-01 to 2023-06-14');
});

test('an empty end is open',()=>{
  assert.equal(selectRange(daily(30),'date','2023-06-20','').kept,9);
  assert.equal(selectRange(daily(30),'date','','2023-05-31').kept,2);
  assert.equal(rangeSentence('date','2023-06-20',''),'date from 2023-06-20 on');
  assert.throws(()=>selectRange(daily(30),'date','',''),/a from, a to, or both/);
});

test('numbers compare as numbers, so 9 comes before 10',()=>{
  const rows=['2','9','10','11','30'].map(n=>({key:{week:n},value:1}));
  const table={kind:'data-table',keys:['week'],valueField:'cases',rows,rowCount:5,missingValueCount:0};
  assert.deepEqual(selectRange(table,'week','9','11').table.rows.map(r=>r.key.week),['9','10','11']);
  assert.throws(()=>selectRange(table,'week','nine','11'),/not a number/);
});

test('a column with no honest order is offered no range',()=>{
  assert.equal(orderOf(['2023-06-01','2023-06-02','']),'date');
  assert.equal(orderOf(['1','2.5','-3']),'number');
  assert.equal(orderOf(['Lambeth','Southwark']),undefined);
  // Mixed: any order picked for it would be invented here.
  assert.equal(orderOf(['2023-06-01','7']),undefined);
  assert.equal(orderOf(['']),undefined);
  const rows=['Lambeth','Southwark'].map(supplier=>({key:{supplier},value:1}));
  const table={kind:'data-table',keys:['supplier'],valueField:'deaths',rows,rowCount:2,missingValueCount:0};
  assert.throws(()=>selectRange(table,'supplier','A','M'),/no order/);
});

test('a backwards range, or one that keeps nothing, is refused with what the column holds',()=>{
  assert.throws(()=>selectRange(daily(30),'date','2023-06-14','2023-06-01'),/backwards/);
  assert.throws(()=>selectRange(daily(30),'date','2024-01-01','2024-01-31'),/runs from 2023-05-30 to 2023-06-28/);
  assert.throws(()=>selectRange(daily(30),'date','June','2023-06-14'),/year-month-day/);
});

test('an empty cell is outside every range',()=>{
  assert.equal(inRange('','number','',''),false);
  assert.equal(inRange('','date','2023-01-01',''),false);
});

/** EVERY VALUE BUT THESE (experiment 182): twelve doubled weeks left out of Brazil's 833, in the table's order. */
test('leaving out values keeps every other row in order, counts what went, and names a value not present',async()=>{
  const {selectRows}=await import('../build/select-rows.js');
  const table={kind:'data-table',keys:['week','place'],valueField:'cases',rowCount:5,missingValueCount:0,
    rows:[['2010-12-19','a',1],['2010-12-26','a',2],['2010-12-26','a',3],['2011-01-02','a',4],['2011-01-09','b',5]]
      .map(([week,place,value])=>({key:{week,place},value}))};
  const r=selectRows(table,'week',['2010-12-26','1999-01-01'],true);
  assert.deepEqual(r.table.rows.map(x=>x.value),[1,4,5]);
  assert.equal(r.kept,3);assert.equal(r.dropped,2);assert.deepEqual(r.absent,['1999-01-01']);
  assert.throws(()=>selectRows(table,'place',['a','b'],true),/leaves no rows/);
  assert.throws(()=>selectRows(table,'week',[],true),/to leave out/);
});
