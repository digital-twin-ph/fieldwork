import test from 'node:test';
import assert from 'node:assert/strict';
import {fromTable,computeRate} from '../build/rate.js';

// Snow's Table IX, 1855: "the proportion of deaths to 10,000 houses, during the first seven weeks
// of the epidemic". The figures this widget was built for and could not read until today.
// The houses and deaths columns are transcribed from the table; the third column is the rate Snow
// printed, which is NOT always the quotient of the first two -- see the divergence test below.
const table={kind:'data-table',keys:['supplier','measure'],valueField:'value',rowCount:6,
  missingValueCount:0,
  rows:[
    {key:{supplier:'Southwark and Vauxhall',measure:'houses'},value:40046},
    {key:{supplier:'Southwark and Vauxhall',measure:'deaths'},value:1263},
    {key:{supplier:'Lambeth',measure:'houses'},value:26107},
    {key:{supplier:'Lambeth',measure:'deaths'},value:98},
    {key:{supplier:'Rest of London',measure:'houses'},value:256423},
    {key:{supplier:'Rest of London',measure:'deaths'},value:1422},
  ]};
const PRINTED={'Southwark and Vauxhall':315,'Lambeth':37,'Rest of London':59};

const snowRates=()=>computeRate(fromTable(table,'measure'),{
  numeratorField:'deaths',denominatorField:'houses',groupBy:'supplier',
  denominatorUnit:'houses',rateKind:'ratio',multiplier:10000,minimumDenominator:1,
  numeratorPeriod:'first seven weeks of the 1854 epidemic',denominatorVintage:'1854'});

test('a long table pivots into one record per subject',()=>{
  const records=fromTable(table,'measure');
  assert.equal(records.length,3);
  const sv=records.find(r=>r.id==='Southwark and Vauxhall');
  assert.equal(sv.properties.houses,40046);
  assert.equal(sv.properties.deaths,1263);
});

test("Table IX's own columns divide to 315.39, 37.54 and 55.46 per 10,000 houses",()=>{
  const by=Object.fromEntries(snowRates().rows.map(r=>[r.group,r.rate]));
  assert.equal(by['Southwark and Vauxhall'].toFixed(2),'315.39');
  assert.equal(by['Lambeth'].toFixed(2),'37.54');
  assert.equal(by['Rest of London'].toFixed(2),'55.46');
});

// What this test is for: Snow's printed rate column is the external reference, and two of its three
// cells are reproduced only if he truncated. The third is not reproduced at all. Asserting it holds
// the arithmetic to the source instead of to the figure most often quoted from it.
test("Snow's printed column is reproduced by truncation for two suppliers and not for the third",()=>{
  const by=Object.fromEntries(snowRates().rows.map(r=>[r.group,r.rate]));
  for(const supplier of ['Southwark and Vauxhall','Lambeth'])
    assert.equal(Math.floor(by[supplier]),PRINTED[supplier],
      `${supplier}: truncating the quotient should give Snow's printed rate`);
  assert.notEqual(Math.floor(by['Rest of London']),PRINTED['Rest of London']);
  assert.notEqual(Math.round(by['Rest of London']),PRINTED['Rest of London']);
  // 1,422 deaths at 59 per 10,000 houses implies about 241,000 houses, not the 256,423 printed
  // beside it. Whichever cell is wrong, the rate widget cannot produce 59 from this table, and
  // reproducing the quoted figure would mean reproducing the discrepancy.
  assert.equal(Math.round(1422/PRINTED['Rest of London']*10000/1000)*1000,241000);
});

test('a measure key that is the only key is refused, because there is no subject',()=>{
  assert.throws(()=>fromTable({...table,keys:['measure']},'measure'),/nothing to compute a rate for/);
});

// The pivot and the arithmetic are checked above as functions. This runs them the way the
// application does: a table_input wired to a rate node on the records port, executed.
test('a table_input wired to a rate node runs and carries the rates into its output table',async()=>{
  const {executeWorkflow,validateWorkflow}=await import('../build/core.js');
  const workflow={schema:'fieldwork/workflow/1',id:'snow-supply',name:"Snow's water supply",
    nodes:[
      {id:'ix',type:'table_input',x:40,y:40,
        params:{label:'Table IX',keys:table.keys,valueField:table.valueField,data:table}},
      {id:'rates',type:'rate',x:300,y:40,
        params:{label:'Deaths per 10,000 houses',source:'table',measureKey:'measure',
          numeratorField:'deaths',denominatorField:'houses',groupBy:'supplier',
          denominatorUnit:'houses',rateKind:'ratio',multiplier:10000,minimumDenominator:1,
          numeratorPeriod:'first seven weeks of the 1854 epidemic',denominatorVintage:'1854'}},
      {id:'shown',type:'table_output',x:560,y:40,params:{label:'Rates',inputMode:'table'}},
    ],
    edges:[{id:'ix-rates',from:'ix',to:'rates',port:'records'},
      {id:'rates-shown',from:'rates',to:'shown',port:'table'}]};
  const result=await executeWorkflow(validateWorkflow(structuredClone(workflow)),
    async()=>[]);
  // The run produces one output, the Table output's, and the rates are its values.
  assert.equal(result.outputs.length,1);
  const out=result.outputs[0];
  assert.equal(out.nodeId,'shown');
  assert.equal(out.valueField,'per 10,000 houses','the output states what its numbers are per');
  assert.equal(out.rowCount,3);
  const by=Object.fromEntries(out.rows.map(r=>[r.key.group,r.value]));
  assert.equal(by['Southwark and Vauxhall'].toFixed(2),'315.39');
  assert.equal(by['Lambeth'].toFixed(2),'37.54');
  assert.equal(by['Rest of London'].toFixed(2),'55.46');
});
