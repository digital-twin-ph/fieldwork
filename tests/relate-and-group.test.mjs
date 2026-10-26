/** `RELATE` and `GROUP`, on the two tables the South London example already ships.
 *
 *  The oracle is not invented. The example's `contingency` workflow carries a THREE-stratum table
 *  of people by water supply and outcome, computed by hand and inlined into the project file with
 *  `bytes: 0` and `sha256: ""` -- because nothing in the application could join two tables. These
 *  tests assert that relating Table XII's `water_supply` onto Table VIII's 32 sub-districts and
 *  totalling within it reproduces those six numbers exactly, which is what makes the hand
 *  computation removable rather than merely duplicated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relateTable} from '../build/relate-table.js';
import {groupTable} from '../build/group-table.js';
import {deriveValue,selectRows} from '../build/derive-value.js';

const DATA='../example-1855-cholera-south-london/data/';
const readCsv=name=>{
  const [head,...body]=readFileSync(DATA+name,'utf8').trim().split('\n');
  const cells=line=>line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0,-1)
    .map(c=>c.replace(/,$/,'').replace(/^"|"$/g,''));
  return {headers:cells(head),rows:body.map(cells)};
};

/** Table VIII, melted: one row per sub-district per measure. */
const tableVIII=()=>{
  const {headers,rows}=readCsv('table-viii-sub-districts-seven-weeks.csv');
  const at=name=>headers.indexOf(name);
  const out=[];
  for(const row of rows)for(const measure of ['population_1851','deaths_seven_weeks'])
    out.push({key:{sub_district:row[at('sub_district')],measure},value:Number(row[at(measure)])});
  return {kind:'data-table',keys:['sub_district','measure'],valueField:'people',unit:'people',
    rows:out,rowCount:out.length,missingValueCount:0};
};
/** Table XII, whose `water_supply` is a KEY column: it is a category, not a number. */
const tableXII=()=>{
  const {headers,rows}=readCsv('table-xii-sub-districts-1849-1854.csv');
  const at=name=>headers.indexOf(name);
  const out=rows.map(row=>({key:{sub_district:row[at('sub_district')],
    water_supply:row[at('water_supply')]},value:Number(row[at('deaths_1854')])}));
  return {kind:'data-table',keys:['sub_district','water_supply'],valueField:'deaths',
    rows:out,rowCount:out.length,missingValueCount:0};
};

test('a category is related across on a shared key, and the row count does not change',()=>{
  const left=tableVIII();
  const {table,related,dropped,gaps,values}=relateTable(left,tableXII(),
    {on:'sub_district',bring:'water_supply'});
  assert.equal(related,64,'32 sub-districts, two measures each');
  assert.equal(dropped,0);
  assert.deepEqual(gaps,[]);
  assert.equal(table.rows.length,left.rows.length,'relating a category adds a column, not rows');
  assert.deepEqual(table.keys,['sub_district','measure','water_supply']);
  assert.deepEqual([...values].sort(),['Lambeth Company and Southwark and Vauxhall Company',
    'Lambeth Company only','Southwark and Vauxhall Company only']);
});

test('the hand-computed contingency table is reproduced exactly',()=>{
  const related=relateTable(tableVIII(),tableXII(),{on:'sub_district',bring:'water_supply'}).table;
  const {table:grouped,groups,collapsedFrom,dropped}=groupTable(related,
    {by:['water_supply','measure']});
  assert.equal(groups,6,'three supply categories, two measures');
  assert.equal(collapsedFrom,64);
  assert.deepEqual(dropped,['sub_district']);

  const {table:derived}=deriveValue(grouped,{keyColumn:'measure',left:'population_1851',
    operator:'minus',right:'deaths_seven_weeks',name:'survived'});
  const {table}=selectRows(derived,'measure',['deaths_seven_weeks','survived']);

  const cell=(supply,measure)=>table.rows.find(r=>r.key.water_supply===supply
    &&r.key.measure===measure).value;
  // The six numbers inlined in the example project, which nothing in the application could derive.
  assert.equal(cell('Southwark and Vauxhall Company only','deaths_seven_weeks'),844);
  assert.equal(cell('Southwark and Vauxhall Company only','survived'),166810);
  assert.equal(cell('Lambeth Company and Southwark and Vauxhall Company','deaths_seven_weeks'),652);
  assert.equal(cell('Lambeth Company and Southwark and Vauxhall Company','survived'),299497);
  assert.equal(cell('Lambeth Company only','deaths_seven_weeks'),18);
  assert.equal(cell('Lambeth Company only','survived'),19115);
  assert.equal(table.rows.length,6);
});

test('an ambiguous key is refused rather than resolved',()=>{
  const right={...tableXII()};
  right.rows=[...right.rows,{key:{sub_district:right.rows[0].key.sub_district,
    water_supply:'Lambeth Company only'},value:1}];
  assert.throws(()=>relateTable(tableVIII(),right,{on:'sub_district',bring:'water_supply'}),
    /more than one "water_supply"/);
});

test('a left key the right table lacks is reported, not defaulted',()=>{
  const right=tableXII();
  const missing=right.rows[0].key.sub_district;
  right.rows=right.rows.slice(1);
  const {gaps,dropped,table}=relateTable(tableVIII(),right,
    {on:'sub_district',bring:'water_supply'});
  assert.deepEqual(gaps,[{key:missing,rows:2}]);
  assert.equal(dropped,2);
  assert.equal(table.rows.length,62);
  assert.ok(!table.rows.some(r=>r.key.water_supply===undefined),
    'no row carries an invented category');
});

test('relating a column the left table already has is refused',()=>{
  const left=relateTable(tableVIII(),tableXII(),{on:'sub_district',bring:'water_supply'}).table;
  assert.throws(()=>relateTable(left,tableXII(),{on:'sub_district',bring:'water_supply'}),
    /already has a "water_supply" column/);
});

test('a group holding an empty cell totals to null and is named',()=>{
  const related=relateTable(tableVIII(),tableXII(),{on:'sub_district',bring:'water_supply'}).table;
  const holed={...related,rows:related.rows.map((row,i)=>
    i===related.rows.findIndex(r=>r.key.water_supply==='Lambeth Company only')
      ?{...row,value:null}:row)};
  const {table,gaps}=groupTable(holed,{by:['water_supply','measure']});
  assert.equal(gaps.length,1,'one group held the empty cell');
  assert.equal(gaps[0].rowsEmpty,1);
  const affected=table.rows.find(r=>r.key.water_supply==='Lambeth Company only'
    &&r.key.measure===gaps[0].group.split(' · ')[1]);
  assert.equal(affected.value,null,'an unknown total is null, not a smaller number');
});

test('grouping by every column is refused as a no-op',()=>{
  assert.throws(()=>groupTable(tableVIII(),{by:['sub_district','measure']}),
    /every row is already its own group/);
});
