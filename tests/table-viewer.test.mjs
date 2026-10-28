/** Quick Look shows a table, not its storage.
 *
 *  The practitioner, 2026-10-27: "If I showed the long table from South London for this Friday
 *  demo, I would probably get weird looks." `tableViewOf` flattened every table to
 *  `[...keys, valueField]`, one row per key-value pair, so a quick look at Snow's Table VIII
 *  showed 224 rows of `sub_district | measure | count`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {tableViewOf} from '../build/table-viewer.js';

const table=(keys,valueField,rows,unit)=>({kind:'data-table',keys,valueField,...(unit?{unit}:{}),
  rows,rowCount:rows.length,missingValueCount:rows.filter(r=>r.value===null).length});

const TABLE_VIII=table(['sub_district','measure'],'count',[
  {key:{sub_district:'St. Saviour',measure:'population'},value:19709},
  {key:{sub_district:'St. Saviour',measure:'deaths'},value:125},
  {key:{sub_district:'St. Olave',measure:'population'},value:8015},
  {key:{sub_district:'St. Olave',measure:'deaths'},value:53}]);

test('a melted table is shown at its published width, one row per subject',()=>{
  const view=tableViewOf(TABLE_VIII,'Table VIII');
  assert.deepEqual(view.columns,['sub_district','population','deaths']);
  assert.equal(view.rows.length,2,'two sub-districts, not four key-value pairs');
  assert.deepEqual(view.rows[0],{sub_district:'St. Saviour',population:19709,deaths:125});
  assert.match(view.note,/2 sub_district/);
  assert.match(view.note,/4 values in all/,'the stored row count is still stated');
});

test('a brought column rides beside the subject rather than becoming a variable',()=>{
  // What `relateTable` returns: [...left.keys, bring].
  const related=table(['sub_district','measure','water_supply'],'count',[
    {key:{sub_district:'St. Saviour',measure:'population',water_supply:'S&V'},value:19709},
    {key:{sub_district:'St. Saviour',measure:'deaths',water_supply:'S&V'},value:125},
    {key:{sub_district:'St. Olave',measure:'population',water_supply:'Lambeth'},value:8015},
    {key:{sub_district:'St. Olave',measure:'deaths',water_supply:'Lambeth'},value:53}]);
  const view=tableViewOf(related,'Related');
  assert.deepEqual(view.columns,['sub_district','water_supply','population','deaths']);
  assert.deepEqual(view.rows[0],
    {sub_district:'St. Saviour',water_supply:'S&V',population:19709,deaths:125});
  assert.match(view.note,/with water_supply/);
});

test('a table that cannot be framed keeps its stored columns, and its value heading',()=>{
  // Manila's assignment: every facility takes one gauge, so there is nothing to pivot and
  // `distance_m` is the column a reader came for.
  const assignment=table(['point_id','projection_site'],'distance_m',[
    {key:{point_id:'F1',projection_site:'145'},value:1000},
    {key:{point_id:'F2',projection_site:'145'},value:1200}],'metre');
  const view=tableViewOf(assignment,'Assigned gauges');
  assert.deepEqual(view.columns,['point_id','projection_site','distance_m']);
  assert.match(view.note,/Keyed by point_id, projection_site/);
  assert.match(view.note,/in metre/);
});

test('an empty cell is carried as unknown rather than dropped',()=>{
  const ragged=table(['sub_district','measure'],'count',[
    {key:{sub_district:'Dulwich',measure:'deaths 1849'},value:9},
    {key:{sub_district:'Dulwich',measure:'deaths 1854'},value:null},
    {key:{sub_district:'Norwood',measure:'deaths 1849'},value:10},
    {key:{sub_district:'Norwood',measure:'deaths 1854'},value:12}]);
  const view=tableViewOf(ragged,'1849 and 1854');
  assert.equal(view.rows[0]['deaths 1854'],null,'the empty 1854 cell stays unknown, never zero');
  assert.equal(view.rows[1]['deaths 1854'],12);
});

test('the unit is stated where there is one and named as unstated where there is not',()=>{
  assert.match(tableViewOf(TABLE_VIII,'t').note,/an unstated unit/);
  assert.match(tableViewOf({...TABLE_VIII,unit:'people'},'t').note,/in people/);
});
