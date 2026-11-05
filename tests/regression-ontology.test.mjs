import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {fitRegression,specFrom,regressionReceipt} from '../build/regression.js';
import {REGRESSION_LICENCES,regressionMeasure,STUDY_DESIGNS} from '../build/study-design.js';
import {computeTwoByTwo,twoByTwoReceipt} from '../build/two-by-two.js';

/** REGRESSION IN THE ONTOLOGY (experiment 176). The practitioner, 2026-11-04: *"Just curious if we created ontology
 *  rules for regression"*, then *"Ontology next"*; and, choosing the licences, a rate ratio under cohort and ecological
 *  designs only. */

const declared=design=>({kind:'study-design',design,period:'',unitOfAnalysis:'',licence:{},sentence:'',included:[],withheld:[]});

test('what each declared design licenses from a regression, as the practitioner chose',()=>{
  const outcome=(design,family)=>{try{return regressionMeasure(declared(design),family);}catch(e){return `stops: ${e.message}`;}};
  assert.deepEqual(Object.fromEntries(STUDY_DESIGNS.map(d=>[d,[outcome(d,'logistic'),outcome(d,'poisson').split(':')[0]]])),{
    'cohort':['odds ratio','rate ratio'],
    'case-control':['odds ratio','stops'],
    'cross-sectional':['prevalence odds ratio','stops'],
    'ecological':['odds ratio','rate ratio'],
    'case-series':['stops: A case series has no comparison group, so there is no ratio to estimate.','stops'],
  });
  assert.match(outcome('case-control','poisson'),/Choose logistic regression/);
  // No design, or a stopped one, keeps the neutral name.
  assert.equal(regressionMeasure(undefined,'poisson'),null);
  assert.equal(regressionMeasure({...declared('case-control'),stopped:true},'poisson'),null);
  assert.deepEqual(Object.keys(REGRESSION_LICENCES).sort(),[...STUDY_DESIGNS].sort());
});

// Daily counts with a categorical day of week, a spline of temperature and strata: every kind of term the receipt states.
const rows=Array.from({length:400},(_,i)=>({o3:20+10*Math.sin(i/9)+(i%7),tmean:10+8*Math.sin(i/30),
  dow:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i%7],stratum:`m${Math.floor(i/28)}`,
  count:8+(i%5)+Math.round((20+10*Math.sin(i/9))/12)}));
const params={family:'poisson',outcome:'count',exposure:{column:'o3',as:'numeric'},
  adjust:[{column:'tmean',as:'spline',df:3},{column:'dow',as:'categorical',reference:'Mon'}],strata:'stratum',errors:'wald'};
const fit=()=>fitRegression(rows,specFrom(params));
const conforms=async facts=>validateGraph(new Store(new Parser().parse(facts)));

test('a regression\'s receipt states the fit in RDF and conforms to the shapes',async()=>{
  const result=fit();
  const {facts}=regressionReceipt({id:'reg'},result,params,'r1','table',false);
  const report=await conforms(facts);
  assert.equal(report.conforms,true,report.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));
  assert.match(facts,/a fw:RegressionModel/);
  assert.match(facts,/fw:modelFamily "poisson"/);
  assert.match(facts,/fw:exposureTerm \[ fw:termAttribute "o3"; fw:termEntry "numeric" \]/);
  assert.match(facts,/fw:adjustmentTerm \[ fw:termAttribute "tmean"; fw:termEntry "spline"; fw:termDegreesOfFreedom "3"/);
  assert.match(facts,/fw:termReference "Mon"/);
  assert.match(facts,/fw:stratumAttribute "stratum"/);
  assert.match(facts,/fw:noDesignDeclared true/);
  assert.match(facts,/fw:estimateName "rate ratio"; fw:modelTerm "o3"/);
  assert.equal((facts.match(/a fw:EpiEstimate/g)??[]).length,result.estimates.length);
});

test('a receipt that leaves out what the shapes require does not conform',async()=>{
  const {facts}=regressionReceipt({id:'reg'},fit(),params,'r1','table',true);
  for(const [what,broken] of [
    ['an interval method',facts.replace(/fw:intervalMethod "[^"]*"; /g,'')],
    ['a model term',facts.replace(/fw:modelTerm "[^"]*"; /g,'')],
    ['the error method',facts.replace(/fw:errorMethod "[^"]*";\n {2}/,'')],
    ['a family it does not have',facts.replace('fw:modelFamily "poisson"','fw:modelFamily "linear"')],
    ['an upper bound',facts.replace(/; fw:intervalUpper "[^"]*"\^\^xsd:double/g,'')],
  ])assert.equal((await conforms(broken)).conforms,false,`a receipt without ${what} conformed`);
});

test('an unbounded profile interval is written as xsd:double INF, and conforms',async()=>{
  const result=fit();result.estimates[0].upper=Infinity;
  const {facts}=regressionReceipt({id:'reg'},result,params,'r1','table',false);
  assert.match(facts,/fw:intervalUpper "INF"\^\^xsd:double/);
  assert.equal((await conforms(facts)).conforms,true);
});

test('the two-by-two\'s estimates, already written this way, conform to the estimate shape',async()=>{
  const row=(group,outcome,value)=>({key:{group,outcome},value});
  const table={kind:'data-table',keys:['group','outcome'],valueField:'n',missingValueCount:0,rowCount:4,
    rows:[row('e','case',30),row('e','well',70),row('u','case',0),row('u','well',90)]};
  const result=computeTwoByTwo(table,{label:'t',exposureColumn:'group',exposed:'e',unexposed:'u',
    outcomeColumn:'outcome',caseValue:'case',nonCaseValue:'well',level:95});
  const report=await conforms(twoByTwoReceipt({id:'n'},result,'run','src').facts);
  assert.equal(report.conforms,true,report.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));
});
