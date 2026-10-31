import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCells,strataNotNamed,mappingMarkup}
  from '../build/two-by-two-mapping.js';

/** MAPPING A TABLE'S VARIABLES ONTO a, b, c AND d.
 *
 *  The practitioner, 2026-10-31: *"The data tables are inputs to the computational epi widgets
 *  (2x2) so columns (variables) can be mapped to 2x2 cells."* And: *"I think in the 2x2 widget,
 *  that mapping exercise, being important, deserves a modal dialog."* Experiment 153.
 *
 *  THE MAPPING IS column+value -> CELL AND NEVER cell -> number, which is the whole safety of the
 *  widget: a cell pointed at directly cannot know what the table holds, and the stratum check is
 *  the commonest thing a two-by-two gets wrong. These tests hold that line. */

const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

const snow=()=>({kind:'data-table',keys:['water_supply','measure'],valueField:'people',
  unit:'people',rowCount:6,missingValueCount:0,rows:[
    {key:{water_supply:'S&V only',measure:'deaths_seven_weeks'},value:844},
    {key:{water_supply:'S&V only',measure:'survived'},value:166810},
    {key:{water_supply:'Lambeth only',measure:'deaths_seven_weeks'},value:18},
    {key:{water_supply:'Lambeth only',measure:'survived'},value:19115},
    {key:{water_supply:'Both companies',measure:'deaths_seven_weeks'},value:652},
    {key:{water_supply:'Both companies',measure:'survived'},value:299497}]});

const request=(over={})=>({label:'x',exposureColumn:'water_supply',exposed:'S&V only',
  unexposed:'Lambeth only',outcomeColumn:'measure',caseValue:'deaths_seven_weeks',
  nonCaseValue:'survived',level:95,...over});

test('each letter resolves to the row its two conditions select',()=>{
  const cells=resolveCells(snow(),request());
  assert.deepEqual(cells.map(c=>[c.letter,c.value]),
    [['a',844],['b',166810],['c',18],['d',19115]]);
  // And each carries the conditions that define it, which is the mapping made visible.
  assert.deepEqual(cells.map(c=>[c.exposure,c.outcome]),
    [['S&V only','deaths_seven_weeks'],['S&V only','survived'],
     ['Lambeth only','deaths_seven_weeks'],['Lambeth only','survived']]);
  for(const c of cells)assert.equal(c.problem,null);
});

test('A CELL MATCHING NO ROW IS NOT A ZERO, and says so before the step runs',()=>{
  const cells=resolveCells(snow(),request({caseValue:'hospitalised'}));
  const a=cells.find(c=>c.letter==='a');
  assert.equal(a.value,null);
  assert.match(a.problem,/not a zero: nobody counted it/);
});

test('a cell matching SEVERAL rows is not one number, which is a different fault',()=>{
  // An un-totalled table. Zero and two are both wrong and wrong differently, so the count is
  // carried rather than a boolean.
  const table=snow();
  table.rows.push({key:{water_supply:'S&V only',measure:'deaths_seven_weeks'},value:1});
  const a=resolveCells(table,request()).find(c=>c.letter==='a');
  assert.equal(a.rows,2);
  assert.equal(a.value,null);
  assert.match(a.problem,/not one number/);
  assert.match(a.problem,/Total the table/);
});

test('an empty cell is unknown, not zero',()=>{
  const table=snow();
  table.rows[0].value=null;
  const a=resolveCells(table,request()).find(c=>c.letter==='a');
  assert.equal(a.value,null);
  assert.match(a.problem,/unknown, not zero/);
});

test('an unfinished mapping is unmapped, not broken',()=>{
  const cells=resolveCells(snow(),request({exposed:''}));
  assert.deepEqual(cells.filter(c=>c.problem==='Not mapped yet.').map(c=>c.letter),['a','b']);
  // The half that IS mapped still resolves, so a practitioner sees progress rather than a wall.
  assert.equal(cells.find(c=>c.letter==='c').value,18);
});

test('WHAT THE MAPPING LEAVES OUT IS NAMED, which a cell-to-number mapping could never do',()=>{
  // South London's exposure column holds a third value. This is the commonest way a two-by-two
  // misleads, and it is knowable only because the widget reads the whole table.
  assert.deepEqual(strataNotNamed(snow(),request()),['Both companies']);
  // Naming all three leaves nothing out.
  assert.deepEqual(strataNotNamed(snow(),request({unexposed:'Both companies'})),
    ['Lambeth only']);
  assert.deepEqual(strataNotNamed(undefined,request()),[]);
});

test('the dialog shows the cells, the conditions and the stratum left out',()=>{
  const markup=mappingMarkup(snow(),request(),esc);
  for(const letter of ['a','b','c','d'])
    assert.match(markup,new RegExp(`<span class="tbt-letter">${letter}</span>`));
  assert.ok(markup.includes('844')&&markup.includes('166,810'));
  assert.match(markup,/Not named by this mapping/);
  assert.match(markup,/Both companies/);
  // NO CELL IS TYPEABLE. The dialog offers selects over columns and values and never an input
  // for a count -- which is what keeps the four refusals above reachable.
  assert.doesNotMatch(markup,/<input[^>]*data-mapping/);
  assert.match(markup,/<select[^>]*data-mapping="exposureColumn"/);
});

test('a table with no rows for a column offers nothing rather than a stale list',()=>{
  const markup=mappingMarkup(undefined,request(),esc);
  assert.match(markup,/Not mapped yet\./);
  assert.doesNotMatch(markup,/Not named by this mapping/);
});
