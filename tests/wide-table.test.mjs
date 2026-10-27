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
import {validateWorkflow,executeWorkflow} from '../build/core.js';

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

// CONVERTING DURING THE RUN. The practitioner, 2026-10-27, on the worked examples: can this be
// "a check box and wide table conversion happens during the workflow run". The reason to want it
// is not the checkbox: a melt done once in a dialog leaves nothing behind, and a melt done by
// the run is a step whose receipt names every column it took. The example that prompted it ships
// 52,619 bytes of melted tables whose source CSVs are 3,972.
const SOURCE={headers:['supplier','houses','deaths','deaths_per_10000_houses'],
  rows:[['Southwark and Vauxhall Company','40046','1263','315'],
        ['Lambeth Company','26107','98','37'],
        ['Rest of London','256423','1422','59']]};
const converting=(overrides={})=>({
  schema:'fieldwork/workflow/1',id:'w',name:'Converts on run',
  nodes:[{id:'t',type:'table_input',x:0,y:0,params:{
    label:'Snow Table IX, as published',
    keys:['supplier','measure'],valueField:'count',unit:'houses',
    // Empty until a run computes it -- the state core.ts already allows for a node with no file.
    data:{kind:'data-table',keys:['supplier','measure'],valueField:'count',rows:[],rowCount:0,missingValueCount:0},
    sourceTable:SOURCE,convertOnRun:true,
    wide:{keys:['supplier'],valueFields:['houses','deaths'],measureKey:'measure'},
    ...overrides}},
  // A run needs something that displays a result, so the table is shown.
  {id:'out',type:'table_output',x:300,y:0,params:{label:'The table, as read',inputMode:'table'}}],
  edges:[{id:'e1',from:'t',to:'out',port:'table'}]});

test('a node may carry the file as published and no computed table',()=>{
  assert.ok(validateWorkflow(converting()));
});

test('converting on run is refused without a source or without a selection',()=>{
  assert.throws(()=>validateWorkflow(converting({sourceTable:undefined})),/carries no source table/);
  assert.throws(()=>validateWorkflow(converting({sourceTable:{headers:[],rows:[]}})),/carries no source table/);
  assert.throws(()=>validateWorkflow(converting({wide:undefined})),/does not say which columns/);
});

test('a conversion naming a column the file does not have is refused by name',()=>{
  assert.throws(()=>validateWorkflow(converting(
    {wide:{keys:['supplier'],valueFields:['houses','fatalities'],measureKey:'measure'}})),
    /no column named "fatalities"/);
  assert.throws(()=>validateWorkflow(converting(
    {wide:{keys:['district'],valueFields:['houses'],measureKey:'measure'},keys:['district','measure']})),
    /no column named "district"/);
});

test('the run computes the table from the file, and says in the receipt that it did',async()=>{
  const run=await executeWorkflow(converting(),'test');
  const table=run.tables?.t;
  assert.ok(table,'the run kept no table for the converting node');
  assert.equal(table.rowCount,6,'three suppliers times two value columns');
  assert.deepEqual(table.keys,['supplier','measure']);
  assert.equal(table.valueField,'count');
  assert.equal(table.unit,'houses');
  const value=(s,m)=>table.rows.find(r=>r.key.supplier===s&&r.key.measure===m).value;
  assert.equal(value('Southwark and Vauxhall Company','houses'),40046);
  assert.equal(value('Lambeth Company','deaths'),98);
  // The column the file carries and the conversion did not take is absent, and the receipt says
  // which were taken -- which is the whole difference from melting in a dialog.
  assert.ok(!table.rows.some(r=>r.key.measure==='deaths_per_10000_houses'));
  const facts=run.receipts.find(r=>r.nodeId==='t').facts;
  assert.match(facts,/fw:readAs "wide"/);
  assert.match(facts,/fw:meltedValueField "houses"/);
  assert.match(facts,/fw:meltedValueField "deaths"/);
  assert.ok(!/deaths_per_10000_houses/.test(facts));
});

test('a run refuses an empty source rather than producing an empty table',async()=>{
  await assert.rejects(executeWorkflow(converting({sourceTable:{headers:SOURCE.headers,rows:[]}}),'test'),
    /carries no source table|source is empty/);
});

/* ---- a measure is called what the analysis calls it ----
 *
 *  The practitioner, 2026-10-27, after four of South London's six table inputs could not be
 *  converted on run: "Let's do widetable first."
 *
 *  A melt named every measure after its column, so converting those four would have renamed the
 *  vocabulary every downstream step refers to -- a Rate's measure key, a derived value's two
 *  operands, a selection's values -- all at once. The columns below are Snow's Table VIII as
 *  published, and the names beside them are what the South London workflows have always called
 *  them.
 */
const TABLE_VIII={
  headers:['sub_district','population_1851','deaths_seven_weeks','deaths_southwark_vauxhall',
    'deaths_lambeth','deaths_pump_wells'],
  rows:[['St. Saviour, Southwark','19709','125','115','0','0'],
        ['St. Olave, Southwark','8015','53','43','0','0']]};
const SNOW_NAMES={population_1851:'population',deaths_seven_weeks:'deaths',
  deaths_southwark_vauxhall:'deaths Southwark and Vauxhall',deaths_lambeth:'deaths Lambeth',
  deaths_pump_wells:'deaths pump-wells'};
const selection=extra=>({keys:['sub_district'],
  valueFields:['population_1851','deaths_seven_weeks','deaths_southwark_vauxhall',
    'deaths_lambeth','deaths_pump_wells'],
  measureKey:'measure',valueField:'count',...extra});

test('a value column is melted under the name the analysis gives it',()=>{
  const table=wideDataTable(TABLE_VIII,selection({measureNames:SNOW_NAMES}));
  const measures=[...new Set(table.rows.map(r=>r.key.measure))];
  assert.deepEqual(measures,['population','deaths','deaths Southwark and Vauxhall',
    'deaths Lambeth','deaths pump-wells']);
  // The value travels with it; only the name changed.
  assert.equal(table.rows.find(r=>r.key.measure==='population').value,19709);
  assert.equal(table.rows.find(r=>r.key.measure==='deaths Southwark and Vauxhall').value,115);
});

test('a column left out of the mapping keeps its own name',()=>{
  const table=wideDataTable(TABLE_VIII,
    selection({measureNames:{population_1851:'population'}}));
  const measures=[...new Set(table.rows.map(r=>r.key.measure))];
  assert.ok(measures.includes('population'));
  assert.ok(measures.includes('deaths_seven_weeks'),'unnamed columns are not touched');
});

test('two columns cannot share a measure name, because that would merge two variables',()=>{
  assert.throws(()=>wideDataTable(TABLE_VIII,selection({
    measureNames:{deaths_lambeth:'deaths',deaths_seven_weeks:'deaths'}})),
    /both be called "deaths"/);
  // Including the case where the clash is with a column that was NOT renamed.
  assert.throws(()=>wideDataTable(TABLE_VIII,selection({
    measureNames:{deaths_lambeth:'deaths_seven_weeks'}})),/both be called/);
});

test('naming a column that is not being melted is refused rather than ignored',()=>{
  assert.throws(()=>wideDataTable(TABLE_VIII,selection({
    measureNames:{deaths_thames_ditches:'deaths Thames and ditches'}})),
    /is not one of the value columns/);
  assert.throws(()=>wideDataTable(TABLE_VIII,selection({
    measureNames:{population_1851:'   '}})),/empty measure name/);
});

test('a name is never inferred from the column, because the inference is wrong where it matters',()=>{
  // `deaths_pump_wells` would prettify to "deaths pump wells"; the analysis says "pump-wells".
  const table=wideDataTable(TABLE_VIII,selection({}));
  assert.ok([...new Set(table.rows.map(r=>r.key.measure))].includes('deaths_pump_wells'),
    'without a stated name the column name is kept verbatim, underscores and all');
});

test('the receipt records the rename, so a reader can follow a measure back to its column',()=>{
  const wide={keys:['sub_district'],
    valueFields:['population_1851','deaths_seven_weeks'],measureKey:'measure',
    measureNames:{population_1851:'population',deaths_seven_weeks:'deaths'}};
  const table=wideDataTable(TABLE_VIII,{...wide,valueField:'count'});
  const {receipt}=tableReceipt({id:'t',params:{label:'Table VIII',wide}},table,'run1');
  assert.match(receipt.facts,/fw:readAs "wide"/);
  assert.match(receipt.facts,/fw:fromColumn "population_1851"; fw:toMeasure "population"/);
  assert.match(receipt.facts,/fw:fromColumn "deaths_seven_weeks"; fw:toMeasure "deaths"/);
  // Applying a rename without recording it would leave a reader unable to check "population"
  // against a file whose column is `population_1851`.
  assert.equal((receipt.facts.match(/fw:measureRenaming/g)||[]).length,2);
});
