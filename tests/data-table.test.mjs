import test from 'node:test';
import assert from 'node:assert/strict';
import {dataTable,keyDomains,tableReceipt,MAX_TABLE_ROWS} from '../build/data-table.js';

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

test('a duplicate key tuple is refused, because one value would overwrite another', () => {
  const duplicated=csv(projection.headers,[...projection.rows,['145','ssp126','2050','0.5','0.99']]);
  assert.throws(()=>dataTable(duplicated,selection),/share the key site_id=145, scenario=ssp126/);
});

test('dropping a key column is refused rather than silently collapsing rows', () => {
  // Without the year, the remaining key repeats: the signature of a wide table or a missing key.
  assert.throws(()=>dataTable(projection,{keys:['site_id','scenario','quantile'],valueField:'value_m'}),
    /check whether a key column is missing/);
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

test('a nonnumeric value, an empty key and an oversized table are refused', () => {
  assert.throws(()=>dataTable(csv(projection.headers,[['145','ssp126','2050','0.5','high']]),selection),/nonnumeric value "high"/);
  assert.throws(()=>dataTable(csv(projection.headers,[['','ssp126','2050','0.5','0.2']]),selection),/no value in key column "site_id"/);
  const many=csv(['k','v'],Array.from({length:MAX_TABLE_ROWS+1},(_,i)=>[String(i),'1']));
  assert.throws(()=>dataTable(many,{keys:['k'],valueField:'v'}),/at most 2,000 rows/);
  assert.throws(()=>dataTable(csv(['k','v'],[]),{keys:['k'],valueField:'v'}),/no rows/);
});
