import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {computeRateTwoByTwo,readRatesUndeclared,isRateLayout} from '../build/two-by-two-rates.js';
import {rateTwoByTwoReceipt,rateTwoByTwoSentence} from '../build/two-by-two.js';
import {RATE_RATIO_LICENCES,REGRESSION_LICENCES,rateRatioMeasure,STUDY_DESIGNS} from '../build/study-design.js';

/** THE RATE RATIO, FOLDED INTO THE TWO-BY-TWO (experiment 161, step 6). The practitioner, 2026-11-05: *"It should be in
 *  the Epi kernel 2x2 widget I think that's what we decided"*. What must hold is the step's own line: South London's
 *  8.40 unchanged. The values below are the ones lab check 27 compared with statsmodels, from the Rate ratio widget,
 *  in `validation-lab/content/fixtures/rate-ratio-snow-001.json`. */

const tableIX=(over={})=>({kind:'data-table',keys:['supplier','measure'],valueField:'count',rowCount:6,missingValueCount:0,
  rows:[['Southwark and Vauxhall Company','deaths',1263],['Southwark and Vauxhall Company','houses',40046],
    ['Lambeth Company','deaths',98],['Lambeth Company','houses',26107],
    ['Rest of London','deaths',1422],['Rest of London','houses',256423]]
    .map(([supplier,measure,value])=>({key:{supplier,measure},value:over[`${supplier}/${measure}`]??value}))});
const request={exposureColumn:'supplier',exposed:'Southwark and Vauxhall Company',unexposed:'Lambeth Company',
  outcomeColumn:'measure',caseValue:'deaths',nonCaseValue:'',unitsAtRiskValue:'houses',level:95};

test('Table IX gives the Rate ratio widget\'s 8.40 and interval, to the bit',()=>{
  const r=computeRateTwoByTwo(tableIX(),request);
  assert.ok(isRateLayout(r));
  assert.deepEqual(r.cells,{exposedEvents:1263,exposedUnitsAtRisk:40046,unexposedEvents:98,unexposedUnitsAtRisk:26107});
  const [rr]=r.estimates;
  assert.equal(rr.name,'rate ratio');
  assert.equal(rr.method,'log-normal');
  assert.equal(rr.value,8.401853429780243);
  assert.equal(rr.lower,6.84096208049671);
  assert.equal(rr.upper,10.31889085553658);
  assert.equal(r.rateExposed,0.031538730459971034);
  assert.equal(r.rateUnexposed,0.0037537825104378138);
  // The third supplier is named as left out, never silently dropped.
  assert.deepEqual(r.strataLeftOut,['Rest of London']);
  assert.match(rateTwoByTwoSentence(r),/^Southwark and Vauxhall Company against Lambeth Company: a rate ratio of 8\.40 \(95% interval 6\.84 to 10\.32, log-normal\), from 1,263 deaths in 40,046 houses and 98 in 26,107\.$/);
});

test('units at risk need not be whole, and events must be',()=>{
  const r=computeRateTwoByTwo(tableIX({'Lambeth Company/houses':26107.5}),request);
  assert.equal(r.cells.unexposedUnitsAtRisk,26107.5);
  assert.throws(()=>computeRateTwoByTwo(tableIX({'Lambeth Company/deaths':98.5}),request),/not a whole number/);
});

test('a group with no events keeps its counts and says why the ratio has none',()=>{
  const r=computeRateTwoByTwo(tableIX({'Lambeth Company/deaths':0}),request);
  assert.equal(r.estimates[0].value,null);
  assert.match(r.estimates[0].unavailable,/"Lambeth Company" has 0 deaths/);
  assert.match(r.warnings.join(' '),/Lambeth Company has 0 deaths/);
});

test('what the rate layout refuses',()=>{
  for(const [why,req,pattern] of [
    ['no units at risk named',{...request,unitsAtRiskValue:''},/Name the value of the outcome column that holds the units at risk/],
    ['a line list',{...request,rowsAreSubjects:true},/A line list has no units at risk/],
    ['events named as units',{...request,unitsAtRiskValue:'deaths'},/must be different values/],
    ['a value the table lacks',{...request,unitsAtRiskValue:'people'},/no row for supplier "Southwark and Vauxhall Company" with measure "people"/],
  ])assert.throws(()=>computeRateTwoByTwo(tableIX(),req),pattern,why);
  assert.throws(()=>computeRateTwoByTwo(tableIX({'Lambeth Company/houses':0}),request),/"Lambeth Company" has no houses/);
});

test('a design licenses a rate ratio where it licenses one from a Poisson regression, and nowhere else',()=>{
  const name=licence=>'name' in licence?licence.name:'stops';
  assert.deepEqual(Object.fromEntries(STUDY_DESIGNS.map(d=>[d,name(RATE_RATIO_LICENCES[d])])),
    Object.fromEntries(STUDY_DESIGNS.map(d=>[d,name(REGRESSION_LICENCES[d].poisson)])));
  const declared=design=>({kind:'study-design',design,period:'',unitOfAnalysis:'',licence:{},sentence:'',included:[],withheld:[]});
  assert.equal(rateRatioMeasure(declared('cohort')),'rate ratio');
  assert.equal(rateRatioMeasure(undefined),null);
  // The two-by-two's own remedy, not the regression's.
  assert.throws(()=>rateRatioMeasure(declared('case-control')),/Read the table as cases and non-cases\.$/);
  assert.doesNotThrow(()=>rateRatioMeasure({...declared('case-control'),stopped:true}));
});

test('the receipt states the layout in RDF and conforms to the shapes',async()=>{
  const r=readRatesUndeclared(computeRateTwoByTwo(tableIX(),request));
  const {facts}=rateTwoByTwoReceipt({id:'t'},r,'run','table');
  assert.match(facts,/a fw:TwoByTwo/);
  assert.match(facts,/fw:unitsAtRiskValue "houses"/);
  assert.match(facts,/fw:exposedUnitsAtRisk "40046"\^\^xsd:double/);
  assert.match(facts,/fw:noDesignDeclared true/);
  assert.match(facts,/fw:estimateName "rate ratio"; fw:intervalMethod "log-normal"/);
  const report=await validateGraph(new Store(new Parser().parse(facts)));
  assert.equal(report.conforms,true,report.results.map(x=>`${x.path?.value} ${x.message}`).join('\n'));
});

test('a saved workflow holding the retired Rate ratio widget refuses to open, naming it',async()=>{
  const {validateWorkflow}=await import('../build/core.js');
  const legacy={schema:'fieldwork/workflow/1',name:'old',nodes:[
    {id:'t',type:'table_input',x:0,y:0,params:{label:'Table IX',keys:['supplier','measure'],valueField:'count',data:tableIX()}},
    {id:'r',type:'rate_ratio',x:0,y:0,params:{label:'ratio',compared:'a',reference:'b',level:95,method:'log-normal'}}],edges:[]};
  assert.throws(()=>validateWorkflow(legacy),/Rate ratio with an interval, which was retired and cannot be replaced automatically/);
});
