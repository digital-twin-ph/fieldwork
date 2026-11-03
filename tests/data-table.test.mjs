import test from 'node:test';
import assert from 'node:assert/strict';
import {findingsSummary,dataTable,keyDomains,tableReceipt,MAX_TABLE_ROWS} from '../build/data-table.js';

const csv=(headers,rows)=>({headers,rows});
const projection=csv(['site_id','scenario','year','quantile','value_m'],[
  ['145','ssp126','2050','0.5','0.21'],
  ['145','ssp126','2100','0.5','0.52'],
  ['145','ssp585','2050','0.5','0.24'],
  ['145','ssp585','2100','0.5','0.77'],
]);
const selection={keys:['site_id','scenario','year','quantile'],valueField:'value_m'};

test('a long-format table keeps its key and its value', () => {
  const table=dataTable(projection,selection);
  assert.equal(table.kind,'data-table');
  assert.deepEqual(table.keys,selection.keys);
  assert.equal(table.valueField,'value_m');
  assert.equal(table.rowCount,4);
  assert.equal(table.missingValueCount,0);
  assert.deepEqual(table.rows[3].key,{site_id:'145',scenario:'ssp585',year:'2100',quantile:'0.5'});
  assert.equal(table.rows[3].value,0.77);
  assert.deepEqual(keyDomains(table).scenario,['ssp126','ssp585']);
});

test('a repeated key loads and is a finding naming the rows, because a refused file cannot be diagnosed', () => {
  const duplicated=csv(projection.headers,[...projection.rows,['145','ssp126','2050','0.5','0.99']]);
  const table=dataTable(duplicated,selection);
  assert.equal(table.rowCount,duplicated.rows.length);
  assert.equal(table.findings.length,1);
  assert.equal(table.findings[0].kind,'repeated-key');
  assert.match(table.findings[0].text,/repeat site_id=145, scenario=ssp126/);
});

test('uniqueness is checked on the declared primary key, and a secondary key may repeat', () => {
  const list=csv(['ID','Household','Food','Age'],[['1','A','Y','30'],['2','A','Y','31'],['2','B','N','32']]);
  const none=dataTable(list,{keys:['ID','Household','Food'],valueField:'Age'});
  assert.equal(none.findings,undefined);
  const table=dataTable(list,{keys:['ID','Household','Food'],valueField:'Age',primaryKey:['ID'],secondaryKeys:['Household']});
  assert.deepEqual(table.primaryKey,['ID']);
  assert.deepEqual(table.secondaryKeys,['Household']);
  assert.deepEqual(table.findings.map(f=>f.rows),[[2,3]]);
  assert.equal(findingsSummary(table),'1 repeated key value');
});

test('dropping a key column keeps every row and says the key repeats', () => {
  // Without the year, the remaining key repeats: the signature of a wide table or a missing key.
  const table=dataTable(projection,{keys:['site_id','scenario','quantile'],valueField:'value_m'});
  assert.equal(table.rowCount,projection.rows.length);
  assert.ok(table.findings.every(f=>f.kind==='repeated-key'));
});

test('an absent value is kept as unknown and counted, never read as zero', () => {
  const gappy=csv(projection.headers,[...projection.rows.slice(0,3),['145','ssp585','2100','0.5','']]);
  const table=dataTable(gappy,selection);
  assert.equal(table.rows[3].value,null);
  assert.equal(table.missingValueCount,1);
  assert.equal(table.rowCount,4);
});

test('a unit is recorded as stated and is never inferred', () => {
  assert.equal(dataTable(projection,selection).unit,undefined);
  assert.equal(dataTable(projection,{...selection,unit:'metre'}).unit,'metre');
  const facts=tableReceipt({id:'t',params:{label:'T'}},dataTable(projection,selection),'run').receipt.facts;
  assert.match(facts,/fw:valueUnitStatus "unstated"/);
  assert.doesNotMatch(facts,/fw:valueUnit "/);
  const stated=tableReceipt({id:'t',params:{label:'T'}},dataTable(projection,{...selection,unit:'metre'}),'run').receipt.facts;
  assert.match(stated,/fw:valueUnitStatus "stated"/);
  assert.match(stated,/fw:valueUnit "metre"/);
});

test('the receipt records the declared contract and the counts', () => {
  const facts=tableReceipt({id:'tbl',params:{label:'T'}},dataTable(projection,selection),'r1').receipt.facts;
  assert.match(facts,/a fw:TabularInput, prov:Activity/);
  assert.match(facts,/a fw:DataTable, dcat:Dataset, prov:Entity/);
  for(const key of selection.keys)assert.match(facts,new RegExp(`fw:keyField "${key}"`));
  assert.match(facts,/fw:tableRowCount "4"\^\^xsd:integer/);
  assert.match(facts,/fw:tableMissingValueCount "0"\^\^xsd:integer/);
});

test('an absent or contradictory column selection is refused', () => {
  assert.throws(()=>dataTable(projection,{keys:[],valueField:'value_m'}),/at least one key column/);
  assert.throws(()=>dataTable(projection,{keys:['site_id','site_id'],valueField:'value_m'}),/must be distinct/);
  assert.throws(()=>dataTable(projection,{keys:['site_id'],valueField:''}),/column holding the value/);
  assert.throws(()=>dataTable(projection,{keys:['site_id'],valueField:'site_id'}),/cannot also be a key/);
  assert.throws(()=>dataTable(projection,{keys:['nope'],valueField:'value_m'}),/no column named "nope"/);
  assert.throws(()=>dataTable(projection,{keys:['site_id','scenario','year','quantile'],valueField:'absent'}),/no column named "absent"/);
});

test('a nonnumeric value and an empty key are findings; an oversized or empty table is refused', () => {
  const unreadable=dataTable(csv(projection.headers,[['145','ssp126','2050','0.5','high']]),selection);
  assert.equal(unreadable.rows[0].value,null);
  assert.equal(unreadable.findings[0].value,'high');
  assert.match(unreadable.findings[0].text,/nonnumeric value "high"/);
  const blank=dataTable(csv(projection.headers,[['','ssp126','2050','0.5','0.2']]),selection);
  assert.match(blank.findings[0].text,/no value in key column "site_id"/);
  const many=csv(['k','v'],Array.from({length:MAX_TABLE_ROWS+1},(_,i)=>[String(i),'1']));
  assert.throws(()=>dataTable(many,{keys:['k'],valueField:'v'}),/at most 20,000 rows/);
  assert.throws(()=>dataTable(csv(['k','v'],[]),{keys:['k'],valueField:'v'}),/no rows/);
});
