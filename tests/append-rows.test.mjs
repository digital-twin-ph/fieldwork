import test from 'node:test';
import assert from 'node:assert/strict';
import {dataTable} from '../build/data-table.js';
import {appendRows,appendTables,appendSentence,appendPort,appendTableCount} from '../build/append-rows.js';

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
  assert.deepEqual(result.missing,[{column:'plz',rows:2,table:1}]);
  assert.match(appendSentence(result,{nameSource:true,sourceColumn:'source'}),/"plz" is empty on the 2 rows from the first table/);
  assert.equal(cases.rowCount,2,'neither input is changed');
});

test('tables measuring different things, a clashing source name and equal labels stop the step',()=>{
  const other=dataTable({headers:['id','n'],rows:[['x','1']]},{keys:['id'],valueField:'n'});
  assert.throws(()=>appendRows(cases,other),/the second table has "n" as the value column, where the first table has "age"/);
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

/** ANY NUMBER OF TABLES, ONE STEP (experiment 181): the practitioner, 2026-11-06, "we do not want too many widgets of
 *  the same kind chained when 1 will do." Five regression tables, labelled by their lag, declared numbers in weeks. */
const estimates=(ratio,lower,upper)=>({kind:'data-table',keys:['term','statistic'],valueField:'value',
  interval:{column:'statistic',estimate:'rate ratio',lower:'lower 95%',upper:'upper 95%',level:95,ratio:true},
  rows:[['rate ratio',ratio],['lower 95%',lower],['upper 95%',upper],['p',0.01]].map(([statistic,value])=>({key:{term:'LST',statistic},value})),
  rowCount:4,missingValueCount:0});

test('five tables stack in port order, each labelled, the labels declared numbers in weeks',()=>{
  const tables=[estimates(0.993,0.983,1.004),estimates(0.979,0.969,0.989),estimates(0.963,0.954,0.973),
    estimates(1.007,0.997,1.017),estimates(1.063,1.053,1.073)];
  const params={nameSource:true,sourceColumn:'lag',labels:['0','2','4','6','8'],labelsAreNumbers:{unit:'weeks before'}};
  const result=appendTables(tables,params);
  assert.deepEqual(result.from,[4,4,4,4,4]);
  assert.equal(result.table.rowCount,20);
  assert.deepEqual([...new Set(result.table.rows.map(r=>r.key.lag))],['0','2','4','6','8']);
  assert.deepEqual(result.table.numericKeys,{lag:'weeks before'});
  assert.deepEqual(result.table.interval,tables[0].interval,'an interval every table declares the same way survives');
  assert.equal(result.table.findings,undefined);
  assert.equal(appendSentence(result,params),'4 from table 1, 4 from table 2, 4 from table 3, 4 from table 4, 4 from table 5: 20 in all; "lag" says which, as a number in weeks before.');
});

test('a label declared a number that is not one is a finding, and its rows are kept',()=>{
  const result=appendTables([estimates(1,1,1),estimates(1,1,1),estimates(1,1,1)],
    {nameSource:true,sourceColumn:'lag',labels:['0','2 weeks','4'],labelsAreNumbers:{unit:'weeks'}});
  assert.equal(result.table.rowCount,12);
  assert.equal(result.table.findings.length,1);
  assert.match(result.table.findings[0].text,/"2 weeks" labels 4 rows of "lag", declared a number in weeks, and is not one/);
  assert.deepEqual(result.table.findings[0].rows,[5,6,7,8]);
});

test('three tables: a repeated label, a different measure, and the third table named in what is missing',()=>{
  assert.throws(()=>appendTables([cases,cases,cases],{nameSource:true,sourceColumn:'s',labels:['a','b','a']}),/"a" is used twice/);
  const other=dataTable({headers:['id','n'],rows:[['x','1']]},{keys:['id'],valueField:'n'});
  assert.throws(()=>appendTables([cases,cases,other]),/table 3 has "n" as the value column, where table 1 and table 2 have "age"/);
  // THE ODD ONE OUT IS NAMED, wherever it is: a census read with "level" first, beside three population tables (2026-11-20).
  assert.throws(()=>appendTables([other,cases,cases,cases],{},['Census 1984','WorldPop','GRID3','GHS-POP']),
    /"Census 1984" has "n" as the value column, where "WorldPop", "GRID3", and "GHS-POP" have "age"\. .*open "Census 1984"'s Configure… and choose the column holding the same quantity as its value, named "age"/);
  const result=appendTables([cases,cases,matched]);
  assert.deepEqual(result.missing,[{column:'plz',rows:2,table:1},{column:'plz',rows:2,table:2}]);
  assert.match(appendSentence(result,{}),/"plz" is empty on the 2 rows from table 1/);
  assert.throws(()=>appendTables([cases]),/at least two tables/);
});

test('ports keep their saved names, and a saved two-table workflow keeps its labels',()=>{
  assert.deepEqual([0,1,2,3].map(appendPort),['records','records_2','records_3','records_4']);
  assert.equal(appendTableCount({}),2);assert.equal(appendTableCount({tableCount:5}),5);assert.equal(appendTableCount({tableCount:1}),2);
  const result=appendRows(cases,matched,{nameSource:true,sourceColumn:'source',firstLabel:'cases',secondLabel:'panel'});
  assert.deepEqual([...new Set(result.table.rows.map(r=>r.key.source))],['cases','panel']);
});

test('a step counting in another unit is named, with the unit to state (2026-11-20)',()=>{
  const people=t=>({...t,unit:'people'});
  const census={kind:'data-table',keys:['district'],valueField:'population',unit:'people',rows:[{key:{district:'A'},value:1}],rowCount:1,missingValueCount:0};
  const raster={...census,unit:undefined};
  assert.throws(()=>appendTables([census,raster,people(raster),people(raster)],{},['Census 1984','WorldPop','GRID3','GHS-POP']),
    /"WorldPop" counts in no unit, where "Census 1984", "GRID3", and "GHS-POP" count in "people"\. .*open "WorldPop"'s Configure… and state its unit as "people"/);
});

/** COLUMNS NAMED DIFFERENTLY (2026-11-20): DR Congo's census names its provinces in "province", the population models
 *  in "name". Stacked as they were, the census rows had no "name" and every later step found nothing for them. */
const keyed=(key,names,value)=>({kind:'data-table',keys:[key],valueField:'population',unit:'people',
  rows:names.map((n,i)=>({key:{[key]:n},value:value+i})),rowCount:names.length,missingValueCount:0});
const provinces=['Kinshasa','Ituri','Tshopo','Kwilu'];
test('a table holding the first table\'s names under another column is refused, naming the column to stack it under',()=>{
  const models=keyed('name',provinces,100),census=keyed('province',['Kinshasa','Ituri','Tshopo','Equateur'],1);
  assert.throws(()=>appendTables([models,census],{},['WorldPop','Census 1984']),
    /"Census 1984" has no "name" column.*its "province" seems to hold the same kind of names: 3 of its 4 are names in "name" of the other table.*stack its "province" under "name".*check the 1 that are not/s);
});
test('stacked under the first table\'s column, the census rows carry their names there',()=>{
  const models=keyed('name',provinces,100),census=keyed('province',provinces,1);
  const r=appendTables([models,census],{stackUnder:[{table:1,column:'province',as:'name'}]});
  assert.deepEqual(r.table.keys,['name']);
  assert.deepEqual(r.table.rows.map(x=>x.key.name),[...provinces,...provinces]);
  assert.deepEqual(r.missing,[]);
});
test('tables naming different things in different columns are stacked as before, with nothing offered',()=>{
  const models=keyed('name',provinces,100),weeks=keyed('week',['1','2','3'],1);
  const r=appendTables([models,weeks]);
  assert.deepEqual(r.table.keys,['name','week']);
});
test('a column to stack under that the table already has is refused',()=>{
  const models=keyed('name',provinces,100);
  assert.throws(()=>appendTables([models,keyed('name',provinces,1)],{stackUnder:[{table:1,column:'name',as:'name'}]}).table&&
    appendTables([models,{...keyed('province',provinces,1),keys:['province','name'],rows:provinces.map(p=>({key:{province:p,name:p},value:1}))}],
      {stackUnder:[{table:1,column:'province',as:'name'}]}),/already has a "name" column/);
});

/** THE GRID (2026-11-20): read from `stackUnder`, written back to it. */
import {columnGrid,placeColumn,renameStacked,unstackedColumns} from '../build/append-rows.js';
test('the grid shows each stacked column, the column of each table filling it, and a suggestion where none does',()=>{
  const models=keyed('name',provinces,100),census=keyed('province',provinces,1);
  const grid=columnGrid([models,census]);
  assert.deepEqual(grid.map(r=>r.as),['name','province']);
  assert.deepEqual(grid[0].cells,[{column:'name'},{column:null,suggested:{column:'province',matched:4,of:4}}]);
  const under=placeColumn([],1,'name','province');
  assert.deepEqual(columnGrid([models,census],under).map(r=>[r.as,r.cells.map(c=>c.column)]),[['name',['name','province']]]);
  assert.deepEqual(placeColumn(under,1,'name',null),[]);
  const renamed=renameStacked([models,census],under,'name','province_name');
  assert.deepEqual(columnGrid([models,census],renamed).map(r=>[r.as,r.cells.map(c=>c.column)]),[['province_name',['name','province']]]);
  assert.deepEqual(appendTables([models,census],{stackUnder:renamed}).table.keys,['province_name']);
});

test('the name most tables use wins, whatever the order: a census first, holding "province", is stacked under the models\' "name"',()=>{
  const census=keyed('province',provinces,1),models=[100,200,300].map(v=>keyed('name',provinces,v));
  const found=unstackedColumns([census,...models]);
  assert.deepEqual(found.map(f=>[f.table,f.column,f.as]),[[0,'province','name']]);
  assert.throws(()=>appendTables([census,...models],{},['Census 1984','WorldPop','GRID3','GHS-POP']),
    /"Census 1984" has no "name" column.*4 of its 4 are names in "name" of the 3 other tables/s);
  assert.deepEqual(appendTables([census,...models],{stackUnder:[{table:0,column:'province',as:'name'}]}).table.keys,['name']);
});
