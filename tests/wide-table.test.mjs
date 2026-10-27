/** A wide file read as published, which is the shape epidemiological data arrives in.
 *
 *  "We have to assume wide in as default, that's the epidemiology mindset." -- the practitioner,
 *  2026-10-26. Until now this application refused the shape: the long reader treats a repeated
 *  key as "the signature of a wide table" and stops. So every long table it holds was melted by
 *  hand somewhere else, including the ones its own worked examples ship -- the fixture below is
 *  Snow's Table IX exactly as the South London repository carries it, and the example loads a
 *  pre-melted six-row version of it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {wideDataTable,tableReceipt} from '../build/data-table.js';
import {validateWorkflow} from '../build/core.js';

// data/table-ix-first-seven-weeks.csv, byte for byte.
const TABLE_IX={
  headers:['supplier','houses','deaths','deaths_per_10000_houses'],
  rows:[
    ['Southwark and Vauxhall Company','40046','1263','315'],
    ['Lambeth Company','26107','98','37'],
    ['Rest of London','256423','1422','59'],
  ]};
const read=(selection)=>wideDataTable(TABLE_IX,
  {keys:['supplier'],valueFields:['houses','deaths'],measureKey:'measure',
    valueField:'count',unit:'houses',...selection});

test('a wide file becomes the long table the rest of the application reads',()=>{
  const table=read();
  assert.deepEqual(table.keys,['supplier','measure']);
  assert.equal(table.valueField,'count');
  assert.equal(table.rowCount,6,'three suppliers times two measures');
  const value=(supplier,measure)=>table.rows
    .find(r=>r.key.supplier===supplier&&r.key.measure===measure).value;
  assert.equal(value('Southwark and Vauxhall Company','houses'),40046);
  assert.equal(value('Southwark and Vauxhall Company','deaths'),1263);
  assert.equal(value('Rest of London','houses'),256423);
});

test('the columns taken are named, not inferred from what is left over',()=>{
  // The file also carries deaths_per_10000_houses. It is not a variable of this analysis
  // unless it is asked for, so adding a column to a file cannot quietly add one to an analysis.
  assert.ok(!read().rows.some(r=>r.key.measure==='deaths_per_10000_houses'));
  assert.equal(read({valueFields:['houses','deaths','deaths_per_10000_houses']}).rowCount,9);
});

test('an empty cell is unknown, and is not read as zero',()=>{
  const table=wideDataTable({headers:TABLE_IX.headers,
    rows:[['Lambeth Company','','98','37'],...TABLE_IX.rows.slice(2)]},
    {keys:['supplier'],valueFields:['houses','deaths'],measureKey:'measure',valueField:'count'});
  const lambeth=table.rows.find(r=>r.key.supplier==='Lambeth Company'&&r.key.measure==='houses');
  assert.equal(lambeth.value,null);
  assert.equal(table.missingValueCount,1);
});

test('a repeated subject is diagnosed as a duplicate record, not as a long table',()=>{
  assert.throws(()=>wideDataTable({headers:TABLE_IX.headers,
    rows:[TABLE_IX.rows[0],TABLE_IX.rows[0]]},
    {keys:['supplier'],valueFields:['houses'],measureKey:'measure',valueField:'count'}),
    /both describe supplier=Southwark and Vauxhall Company.*one row per subject/s);
});

test('a column that is both a key and a value is refused',()=>{
  assert.throws(()=>read({valueFields:['supplier','houses']}),/cannot be both/);
});

test('a measure column colliding with a key column is refused',()=>{
  assert.throws(()=>read({measureKey:'supplier'}),/already a key column/);
});

test('a nonnumeric value names the row and the column',()=>{
  assert.throws(()=>wideDataTable({headers:TABLE_IX.headers,
    rows:[['Lambeth Company','many','98','37']]},
    {keys:['supplier'],valueFields:['houses'],measureKey:'measure',valueField:'count'}),
    /Row 1 has a nonnumeric value "many" in "houses"/);
});

test('the row ceiling counts melted values, not file rows',()=>{
  const rows=Array.from({length:700},(_,i)=>[`s${i}`,'1','2','3']);
  assert.throws(()=>wideDataTable({headers:TABLE_IX.headers,rows},
    {keys:['supplier'],valueFields:['houses','deaths','deaths_per_10000_houses'],
      measureKey:'measure',valueField:'count'}),/is 2,100 values/);
});

// THE READING IS IN THE RECEIPT, from 2026-10-27. Melting is something done to the file the
// practitioner supplied, and the long result cannot describe it: a receipt citing only the long
// table would name a shape the file does not contain and say nothing about which columns were
// taken. The columns are NAMED rather than inferred, so their absence is meaningful too.
test('a melted import says so in its receipt, and names the columns it took',()=>{
  const table=read();
  const {receipt}=tableReceipt(
    {id:'t1',params:{label:'Snow Table IX',unit:'houses',
      wide:{keys:['supplier'],valueFields:['houses','deaths'],measureKey:'measure'}}},
    table,'run1');
  assert.match(receipt.facts,/fw:readAs "wide"/);
  assert.match(receipt.facts,/fw:subjectKeyField "supplier"/);
  assert.match(receipt.facts,/fw:meltedValueField "houses"/);
  assert.match(receipt.facts,/fw:meltedValueField "deaths"/);
  assert.match(receipt.facts,/fw:measureKeyField "measure"/);
  assert.match(receipt.facts,/fw:meltedValueFieldCount "2"\^\^xsd:integer/);
  // The column the file carries and the analysis did not take is absent, which is the point of
  // naming them: it is the difference between "not in the file" and "not asked for".
  assert.ok(!/deaths_per_10000_houses/.test(receipt.facts));
});

test('a table that was already long says THAT, rather than saying nothing',()=>{
  const {receipt}=tableReceipt({id:'t2',params:{label:'Long table'}},
    {kind:'data-table',keys:['sub_district','measure'],valueField:'count',
      rows:[{key:{sub_district:'Brixton',measure:'deaths'},value:3}],
      rowCount:1,missingValueCount:0},'run2');
  assert.match(receipt.facts,/fw:readAs "long"/);
  // No melt happened, so nothing claims one.
  assert.ok(!/fw:meltedValueField|fw:subjectKeyField|fw:measureKeyField/.test(receipt.facts));
});

// THE SELECTION IS CHECKED AGAINST THE TABLE IT CLAIMS TO HAVE PRODUCED. The two descriptions
// are redundant -- a melt gives keys = [...subject keys, measureKey] -- which is exactly what
// makes them checkable. A stored `wide` block that disagrees would put columns in a receipt that
// the table was not built from, which is the failure mode of every unverified claim in here.
const tableNode=(wide)=>({
  schema:'fieldwork/workflow/1',id:'w',name:'Wide import',
  nodes:[{id:'t',type:'table_input',x:0,y:0,params:{
    label:'Snow Table IX',keys:['supplier','measure'],valueField:'count',
    data:read(),...(wide?{wide}:{})}}],
  edges:[]});

test('a wide selection agreeing with the table it produced is accepted',()=>{
  assert.ok(validateWorkflow(tableNode(
    {keys:['supplier'],valueFields:['houses','deaths'],measureKey:'measure'})));
});

test('a wide selection that does not describe the table is refused',()=>{
  // The melt would have given keys ['supplier','measure'], not ['supplier','variable'].
  assert.throws(()=>validateWorkflow(tableNode(
    {keys:['supplier'],valueFields:['houses','deaths'],measureKey:'variable'})),
    /must together be the table's key columns/);
  // A subject key the table does not carry.
  assert.throws(()=>validateWorkflow(tableNode(
    {keys:['district'],valueFields:['houses'],measureKey:'measure'})),
    /must together be the table's key columns/);
  // Empty selections are refused by name rather than producing an empty receipt.
  assert.throws(()=>validateWorkflow(tableNode(
    {keys:[],valueFields:['houses'],measureKey:'measure'})),/subject key columns/);
  assert.throws(()=>validateWorkflow(tableNode(
    {keys:['supplier'],valueFields:[],measureKey:'measure'})),/value columns/);
  assert.throws(()=>validateWorkflow(tableNode(
    {keys:['supplier'],valueFields:['houses','houses'],measureKey:'measure'})),/distinct/);
});

test('a table read as long needs no wide block, and is still valid', ()=>{
  assert.ok(validateWorkflow(tableNode(undefined)));
});
