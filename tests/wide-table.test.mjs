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
import {wideDataTable} from '../build/data-table.js';

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
