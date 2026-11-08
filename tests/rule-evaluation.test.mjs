import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {compileAuthoredRuleset,computesValues} from '../build/authored-rules.js';
import {authoredFacts,authoredConclusions} from '../build/authored-application.js';
import {evaluateAuthored} from '../build/rule-evaluation.js';

/** THE RULES, EVALUATED DIRECTLY, AND HELD TO THE REASONER. Experiment 188, stage 1. The data are the synthetic files
 *  of example-workflows-rulesets, whose answers were worked by hand; where that repository is not beside this one, the
 *  same rows are written here. */
const root=new URL('../',import.meta.url);
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('vendor/eye-21.1.24.js',root),'utf8'),{filename:'eye.js'});
const REPO=new URL('../../example-workflows-rulesets/',import.meta.url);
const csv=(name,fallback)=>{const url=new URL(name,REPO);const text=existsSync(url)?readFileSync(url,'utf8'):fallback;
  const [head,...lines]=text.trim().split('\n');const h=head.split(',');
  return lines.map(l=>{const v=l.split(',');return Object.fromEntries(h.map((x,i)=>[x,v[i]??'']));});};
const record=(properties,index)=>({id:`row-${index}`,label:`Row ${index+1}`,properties});
const number=v=>v===''?null:Number(v);

const visits=csv('data/clinic-visits.csv',`id,clinic,age_years,weight_kg,temperature_c,visit_date
V01,Hillside,2,12.1,38.4,2025-03-03
V02,Hillside,4,16,37.2,2025-03-03
V03,Hillside,5,18.2,38,2025-03-04
V04,Hillside,6,20.5,,2025-03-04`).map((r,i)=>record({clinic:r.clinic,age_years:number(r.age_years),
  weight_kg:number(r.weight_kg),temperature_c:number(r.temperature_c)},i));
const visitFields=[{attribute:'clinic',predicate:'fwa:clinic',kind:'term'},
  {attribute:'age_years',predicate:'fwa:age',kind:'number',unit:'unit:YR'},
  {attribute:'temperature_c',predicate:'fwa:temperature',kind:'number',unit:'unit:DEG_C'}];

test('rules that N3 can run give the same conclusions evaluated directly, every comparator among them', async () => {
  const rules=[
    {any:[{all:[{field:'fwa:age',comparator:'lessThan',value:5}]}],then:[{predicate:'fwa:band',value:'fwa:UnderFive'}]},
    {any:[{all:[{field:'fwa:age',comparator:'notLessThan',value:5}]}],then:[{predicate:'fwa:band',value:'fwa:FiveOrOver'}]},
    {any:[{all:[{field:'fwa:temperature',comparator:'greaterThan',value:{setting:'fever'}}]}],
      then:[{predicate:'fwa:fever',value:'fwa:Yes'}]},
    {any:[{all:[{field:'fwa:temperature',comparator:'notGreaterThan',value:{setting:'fever'}}]}],
      then:[{predicate:'fwa:fever',value:'fwa:No'}]},
    {any:[{all:[{field:'fwa:temperatureKnown',comparator:'equals',value:false}]}],
      then:[{predicate:'fwa:fever',value:'fwa:NotMeasured'}]},
    {any:[{all:[{field:'fwa:clinic',comparator:'equals',value:'fwa:Hillside'}]},
      {all:[{field:'fwa:age',comparator:'greaterThan',value:60}]}],then:[{predicate:'fwa:site',value:'fwa:North'}]},
  ];
  const settings={fever:38};
  const direct=evaluateAuthored(visits,visitFields,rules,settings);
  const compiled=compileAuthoredRuleset({subject:'?s',rules}).replaceAll('{{fever}}','38');
  // The reasoner reads the same records authoredFacts writes for them.
  const table={type:'FeatureCollection',features:visits.map(r=>({type:'Feature',id:r.id,properties:r.properties,geometry:null}))};
  const quads=await eyereasoner.n3reasoner(authoredFacts(table,visitFields)+'\n'+compiled,undefined,{outputType:'quads'});
  const reasoned=authoredConclusions(quads.map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value})));
  visits.forEach((r,i)=>assert.deepEqual(direct.records[i].values,reasoned.get(encodeURIComponent(r.id))??{},
    `${r.id}: the same conclusions directly as from the reasoner`));
  // The fixture reaches each branch: a child, an older child, a fever, none, and a temperature not measured.
  assert.deepEqual(direct.records.slice(0,4).map(r=>[r.values.band,r.values.fever]),
    [['UnderFive','Yes'],['UnderFive','No'],['FiveOrOver','No'],['FiveOrOver','NotMeasured']]);
  // Every record is banded once, by one of the two age rules.
  assert.equal(direct.matchedByRule[0]+direct.matchedByRule[1],visits.length);
});

const districts=csv('data/districts.csv',`district,houses,deaths,population
Northgate,4200,61,18900
Eastmarsh,3150,12,13800
Southfield,5020,118,23400
Westbury,2875,0,12100
Harbour,0,0,340`).map((r,i)=>record({district:r.district,houses:number(r.houses),deaths:number(r.deaths)},i));
const expected=csv('expected/districts.csv',`district,houses_without_a_death,deaths_per_10000_houses
Northgate,4139,145.23809523809524
Eastmarsh,3138,38.095238095238095
Southfield,4902,235.0597609561753
Westbury,2875,0
Harbour,0,`);
const districtFields=[{attribute:'houses',predicate:'fwa:houses',kind:'number',unit:'unit:NUM'},
  {attribute:'deaths',predicate:'fwa:deaths',kind:'number',unit:'unit:NUM'}];

test('a computed value for every record, read by a second rule, matches the answers worked by hand', () => {
  const always=[{all:[]}];
  const rules=[
    {any:always,then:[{predicate:'fwa:houses_without_a_death',compute:{left:{field:'fwa:houses'},operator:'minus',right:{field:'fwa:deaths'}}}]},
    // Read before it is computed: the order the rules are listed in does not decide what can be read.
    {any:always,then:[{predicate:'fwa:deaths_per_10000_houses',compute:{left:{field:'fwa:deaths_per_house'},operator:'times',right:10000}}]},
    {any:always,then:[{predicate:'fwa:deaths_per_house',compute:{left:{field:'fwa:deaths'},operator:'dividedBy',right:{field:'fwa:houses'}}}]},
  ];
  assert.equal(computesValues({rules}),true);
  const out=evaluateAuthored(districts,districtFields,rules);
  out.records.forEach((r,i)=>{
    const want=expected[i];
    assert.equal(r.values.houses_without_a_death,Number(want.houses_without_a_death),want.district);
    if(want.deaths_per_10000_houses==='')assert.equal(r.values.deaths_per_10000_houses,undefined,`${want.district} has none`);
    else assert.equal(r.values.deaths_per_10000_houses,Number(want.deaths_per_10000_houses),`${want.district}, exactly`);
  });
  // HARBOUR HAS NO HOUSES: the division by zero is an empty value, counted, and the rule reading it says what it lacked.
  const harbour=out.records[4];
  assert.equal(harbour.values.deaths_per_house,null);
  assert.deepEqual(harbour.divisionsByZero,['deaths_per_house']);
  assert.deepEqual(harbour.missing,[{column:'deaths_per_10000_houses',operands:['deaths_per_house']}]);
  assert.ok(out.records.slice(0,4).every(r=>!r.divisionsByZero.length&&!r.missing.length));
});

test('two rules giving one record different values give it none, and the conflict names both rules', () => {
  const rules=[
    {any:[{all:[{field:'fwa:deaths',comparator:'greaterThan',value:50}]}],then:[{predicate:'fwa:level',value:'fwa:High'}]},
    {any:[{all:[{field:'fwa:houses',comparator:'greaterThan',value:5000}]}],then:[{predicate:'fwa:level',value:'fwa:Low'}]},
  ];
  const out=evaluateAuthored(districts,districtFields,rules);
  // Southfield: 118 deaths and 5,020 houses, so both rules fire.
  assert.deepEqual(out.records[2].values,{});
  assert.deepEqual(out.records[2].conflicts,[{column:'level',values:['High','Low'],rules:[1,2]}]);
  assert.deepEqual(out.records[0].values,{level:'High'});
  assert.equal(out.unmatched,3);
});

/** THE RUN TAKES THE DIRECT PATH when a rule computes a value: a table in, the same table out with the new column, and
 *  a method that counts what the table cannot show. One numeric column, the table's value, until stage 2 makes a wide
 *  table's columns the records' attributes. */
test('a step whose rule computes a value runs it directly, and its method counts the division by zero', async () => {
  const {executeWorkflow,validateWorkflow}=await import('../build/core.js');
  const {pinnedRuleset}=await import('../build/rule-application.js');
  const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
    .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));
  const rows=districts.map(d=>({key:{district:d.properties.district},value:d.properties.houses}));
  const table={kind:'data-table',keys:['district'],valueField:'houses',unit:'houses',rows,rowCount:rows.length,missingValueCount:0};
  const pin=pinnedRuleset('urn:fieldwork:ruleset:extract-contract','1.0.0');
  const w={schema:'fieldwork/workflow/1',name:'Computed',nodes:[
    {id:'t',type:'table_input',x:0,y:0,params:{label:'Districts',keys:['district'],valueField:'houses',data:table}},
    {id:'r',type:'apply_ruleset',x:300,y:0,params:{label:'Houses per thousand',
      ruleset:{id:pin.id,version:pin.version,title:'Rules written in this workflow',inputs:pin.inputs,output:pin.output},
      parameters:{},authored:{title:'Houses per thousand',mustNotBeReadAs:'',parameters:[],
        fields:[{attribute:'houses',predicate:'fwa:houses',kind:'number',unit:'unit:NUM',unitLabel:'houses'}],
        rules:[{any:[{all:[]}],then:[{predicate:'fwa:per_house',compute:{left:1000,operator:'dividedBy',right:{field:'fwa:houses'}}}]}]}}},
    {id:'out',type:'table_output',x:600,y:0,params:{label:'Out',inputMode:'table'}}],
    edges:[{id:'e',from:'t',to:'r',port:'projections'},{id:'e2',from:'r',to:'out',port:'table'}]};
  const run=await executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(w))),reason);
  const out=run.outputs.find(o=>o.nodeId==='out');
  assert.deepEqual(out.rows.map(r=>r.key.per_house),[String(1000/4200),String(1000/3150),String(1000/5020),String(1000/2875),'']);
  const receipt=run.receipts.find(r=>r.nodeId==='r');
  assert.equal(receipt.kind,'computation');
  assert.match(receipt.method,/evaluated directly over 5 records, because a rule computes a value/);
  assert.match(receipt.method,/1 record has an empty value, from a division by zero: Harbour/);
});
