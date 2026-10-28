import test from 'node:test';
import assert from 'node:assert/strict';
import {crossTab,wideFrame,CROSSTAB_MAX_COLUMNS} from '../build/data-table-ui.js';

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

/* ---- the frame: a table as an epidemiologist meets one everywhere else ----
 *
 *  The practitioner, 2026-10-27: "pandas does not show you a long table", and on the relate
 *  result specifically: "I want to see a wider table with rows correctly linked on the linking
 *  key ... not in JSON."
 *
 *  `crossTab` is a tabulation of two keys with margins and stays the better view where it
 *  applies. Everything else fell through to a paged list of key-value pairs.
 */
const frameOf=rows=>({kind:'data-table',keys:Object.keys(rows[0].key),valueField:'count',
  rows,rowCount:rows.length,missingValueCount:0});

test('a key every subject carries in full is an axis; one they carry once describes them',()=>{
  // Snow's shape: each sub-district has both measures and exactly one supplier.
  const table=frameOf([
    {key:{sub:'A',supply:'S&V',measure:'population'},value:19709},
    {key:{sub:'A',supply:'S&V',measure:'deaths'},value:125},
    {key:{sub:'B',supply:'Lambeth',measure:'population'},value:8015},
    {key:{sub:'B',supply:'Lambeth',measure:'deaths'},value:53}]);
  const frame=wideFrame(table);
  assert.equal(frame.subject,'sub');
  assert.deepEqual(frame.attributes,['supply']);
  assert.deepEqual(frame.columns,['population','deaths']);
  assert.deepEqual(frame.rows.map(r=>[r.label,...r.attributes,...r.cells]),
    [['A','S&V',19709,125],['B','Lambeth',8015,53]]);
});

test('a measure key holding ONE value is still an axis, which cardinality cannot tell',()=>{
  // South London's contingency Table XII: one value column melted, so `measure` has a single
  // value and looks exactly like an attribute until you ask whether every subject has it.
  const table=frameOf([
    {key:{sub:'A',supply:'S&V',measure:'deaths 1854'},value:371},
    {key:{sub:'B',supply:'Lambeth',measure:'deaths 1854'},value:161}]);
  const frame=wideFrame(table);
  assert.deepEqual(frame.attributes,['supply'],'the supplier describes the sub-district');
  assert.deepEqual(frame.columns,['deaths 1854'],'the measure stays the axis');
  assert.deepEqual(frame.rows[0].cells,[371]);
});

test('position cannot decide it either, because relate appends its brought column last',()=>{
  // `relateTable` returns [...left.keys, bring], so the LAST key is an attribute here and the
  // measure key sits in the middle. The melt puts the measure last. Both shapes must work.
  const table=frameOf([
    {key:{sub:'A',measure:'population',supply:'S&V'},value:19709},
    {key:{sub:'A',measure:'deaths',supply:'S&V'},value:125},
    {key:{sub:'B',measure:'population',supply:'Lambeth'},value:8015},
    {key:{sub:'B',measure:'deaths',supply:'Lambeth'},value:53}]);
  const frame=wideFrame(table);
  assert.deepEqual(frame.attributes,['supply']);
  assert.deepEqual(frame.columns,['population','deaths']);
});

test('a table that resolves to no single axis returns null rather than guessing',()=>{
  // Two keys that each vary WITHIN a subject: both are axes and nothing says which one names
  // the variables, so there is no frame to draw.
  const table=frameOf([
    {key:{sub:'A',year:'1849',measure:'deaths'},value:283},
    {key:{sub:'A',year:'1849',measure:'population'},value:19709},
    {key:{sub:'A',year:'1854',measure:'deaths'},value:371},
    {key:{sub:'A',year:'1854',measure:'population'},value:19800},
    {key:{sub:'B',year:'1849',measure:'deaths'},value:157},
    {key:{sub:'B',year:'1849',measure:'population'},value:8000},
    {key:{sub:'B',year:'1854',measure:'deaths'},value:161},
    {key:{sub:'B',year:'1854',measure:'population'},value:8015}]);
  assert.equal(wideFrame(table),null);
  assert.equal(wideFrame(frameOf([{key:{only:'A'},value:1}])),null,'one key is already a list');
});

test('an absent cell is drawn as absent, and a null as unknown',()=>{
  const table=frameOf([
    {key:{sub:'A',measure:'population'},value:19709},
    {key:{sub:'A',measure:'deaths'},value:null},
    {key:{sub:'B',measure:'population'},value:8015}]);
  const frame=wideFrame(table);
  assert.deepEqual(frame.rows[0].cells,[19709,null],'null is a cell the file left empty');
  assert.deepEqual(frame.rows[1].cells,[8015,undefined],'undefined is a row that has no such cell');
});

test('one column and nothing describing the subject is a list, not a frame',()=>{
  // Manila's assignment: every facility takes gauge 145, so pivoting draws a single column
  // headed "145" and loses `distance_m`, the column a reader came for. `crossTab` has refused
  // this since 2026-10-26; the frame reintroduced it on 2026-10-27 and the sea-level browser
  // test caught it before it shipped.
  const assignment=frameOf([
    {key:{point_id:'F1',projection_site:'145'},value:1000},
    {key:{point_id:'F2',projection_site:'145'},value:1200}]);
  assert.equal(wideFrame(assignment),null);
});

test('one column WITH something describing the subject is a table',()=>{
  // The same single-column shape, but the supplier makes it worth drawing: a melt of one value
  // column reads sub-district, water supply, deaths 1854.
  const table=frameOf([
    {key:{sub_district:'A',water_supply:'S&V',measure:'deaths 1854'},value:371},
    {key:{sub_district:'B',water_supply:'Lambeth',measure:'deaths 1854'},value:161}]);
  const frame=wideFrame(table);
  assert.deepEqual(frame.attributes,['water_supply']);
  assert.deepEqual(frame.columns,['deaths 1854']);
});
