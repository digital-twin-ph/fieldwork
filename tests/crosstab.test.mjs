import test from 'node:test';
import assert from 'node:assert/strict';
import {crossTab,CROSSTAB_MAX_COLUMNS} from '../build/data-table-ui.js';

/** THE EPIDEMIOLOGIST'S 2x2 IS PREDICTABLE, and this is the shape it expects.
 *
 *  The practitioner, 2026-10-26: *"the way epidemiologists construct their 2x2 tables is very
 *  predictable, 4 cells ABCD with categories on top and on the left, with totals as 4th column
 *  or 4th row."* A long list of (row, column, value) triples is the same data saying less: the
 *  comparison a reader is making runs along a row rather than down a column three rows apart.
 *
 *  Generic rather than epidemiological. Any table with exactly two key columns pivots this way. */

const twoByTwo={kind:'data-table',keys:['supply','outcome'],valueField:'people',unit:'people',
  rows:[
    {key:{supply:'Southwark and Vauxhall only',outcome:'died'},value:844},
    {key:{supply:'Southwark and Vauxhall only',outcome:'survived'},value:166810},
    {key:{supply:'Lambeth only',outcome:'died'},value:18},
    {key:{supply:'Lambeth only',outcome:'survived'},value:19115},
  ],rowCount:4,missingValueCount:0};

test('four cells, categories on top and on the left',()=>{
  const g=crossTab(twoByTwo);
  assert.deepEqual(g.columns,['died','survived']);
  assert.deepEqual(g.rows.map(r=>r.label),['Southwark and Vauxhall only','Lambeth only']);
  // A B / C D, in the order an epidemiologist reads them.
  assert.deepEqual(g.rows.map(r=>r.cells),[[844,166810],[18,19115]]);
});

test('totals as a fourth column and a fourth row, with N in the corner',()=>{
  const g=crossTab(twoByTwo);
  assert.deepEqual(g.rows.map(r=>r.total),[167654,19133],'A+B and C+D');
  assert.deepEqual(g.columnTotals,[862,185925],'A+C and B+D');
  assert.equal(g.grandTotal,186787,'N');
});

/** NOT EVERY TWO-KEY TABLE IS ADDABLE. A rate ratio's own output is keyed by group and measure,
 *  and 1,263 deaths plus 40,046 houses is not a quantity. The table's declared unit is what says
 *  the cells count the same thing; without one there are no totals rather than a guess. */
test('no totals where the cells are not commensurable',()=>{
  const rateTable={kind:'data-table',keys:['group','measure'],valueField:'count',
    rows:[
      {key:{group:'Southwark and Vauxhall Company',measure:'deaths'},value:1263},
      {key:{group:'Southwark and Vauxhall Company',measure:'houses at risk'},value:40046},
      {key:{group:'Lambeth Company',measure:'deaths'},value:98},
      {key:{group:'Lambeth Company',measure:'houses at risk'},value:26107},
    ],rowCount:4,missingValueCount:0};
  const g=crossTab(rateTable);
  assert.deepEqual(g.rows.map(r=>r.cells),[[1263,40046],[98,26107]]);
  assert.deepEqual(g.rows.map(r=>r.total),[null,null]);
  assert.equal(g.grandTotal,null);
});

test('a missing cell is a gap, not a zero',()=>{
  const sparse={...twoByTwo,rows:twoByTwo.rows.slice(0,3),rowCount:3,unit:'people'};
  const g=crossTab(sparse);
  assert.equal(g.rows[1].cells[1],undefined,'no row said what it was');
  assert.equal(g.rows[1].total,null,'and a total over a gap is not a number');
});

test('a grid wider than a screen stays a list',()=>{
  const wide={kind:'data-table',keys:['place','year'],valueField:'count',
    rows:Array.from({length:CROSSTAB_MAX_COLUMNS+1},(_,i)=>({key:{place:'a',year:String(1850+i)},value:i})),
    rowCount:CROSSTAB_MAX_COLUMNS+1,missingValueCount:0};
  assert.equal(crossTab(wide),null);
});

test('a table that is not two-keyed is not a matrix',()=>{
  assert.equal(crossTab({kind:'data-table',keys:['only'],valueField:'v',rows:[],rowCount:0,missingValueCount:0}),null);
});

// Manila's 194 health facilities all take gauge 145, so the assignment is 194 rows against ONE
// column and perfectly dense -- which the density rule happily pivoted into a 194-row grid,
// hiding `distance_m`, the column a reader came for. A single column is a list drawn with extra
// lines. Found by the sea-level example on both engines, 2026-10-26.
test('one column is a list, however dense it is',()=>{
  const rows=Array.from({length:12},(_,i)=>({key:{point_id:`p${i}`,projection_site:'145'},value:i}));
  assert.equal(crossTab({kind:'data-table',keys:['point_id','projection_site'],
    valueField:'distance_m',unit:'metre',rows,rowCount:rows.length,missingValueCount:0}),null);
});

test('one row is a list too',()=>{
  const rows=[{key:{supply:'Southwark',outcome:'died'},value:1263},
    {key:{supply:'Southwark',outcome:'survived'},value:38783}];
  assert.equal(crossTab({kind:'data-table',keys:['supply','outcome'],
    valueField:'people',unit:'people',rows,rowCount:2,missingValueCount:0}),null);
});

// A stated unit was the only way to earn margins, and it is a weak proxy for the claim that
// matters: South London's mortality table states "people or deaths, as the measure says" --
// prose DENYING commensurability, read as granting it -- while Snow's Table IX states nothing
// and, once two house-counting measures are selected, has the property and cannot say so.
// So the claim is made by whoever composes the figure. 2026-10-26.
const housesAndDeaths=()=>({kind:'data-table',keys:['supplier','measure'],valueField:'count',
  rows:[
    {key:{supplier:'Southwark and Vauxhall Company',measure:'deaths'},value:1263},
    {key:{supplier:'Southwark and Vauxhall Company',measure:'houses without a death'},value:38783},
    {key:{supplier:'Lambeth Company',measure:'deaths'},value:98},
    {key:{supplier:'Lambeth Company',measure:'houses without a death'},value:26009}],
  rowCount:4,missingValueCount:0});

test('a table stating no unit gets no margins on its own',()=>{
  const grid=crossTab(housesAndDeaths());
  assert.equal(grid.grandTotal,null);
  assert.deepEqual(grid.rows.map(r=>r.total),[null,null]);
});

test('asserting the cells count the same thing earns the margins',()=>{
  const grid=crossTab(housesAndDeaths(),{assertCommensurable:true});
  // Snow's published house counts, which is the check the margins are for.
  assert.deepEqual(grid.rows.map(r=>r.total),[40046,26107]);
  assert.deepEqual(grid.columnTotals,[1361,64792]);
  assert.equal(grid.grandTotal,66153);
});

test('an assertion cannot conjure a total over an unknown cell',()=>{
  const table=housesAndDeaths();
  table.rows[1].value=null;
  const grid=crossTab(table,{assertCommensurable:true});
  assert.equal(grid.rows[0].total,null,'a row holding an unknown has an unknown total');
  assert.equal(grid.grandTotal,null);
});
