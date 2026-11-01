import test from 'node:test';
import assert from 'node:assert/strict';
import {DESIGN_LICENCES,includedMeasures,notEstimable,readUnderDesign,studyDesignReceipt}
  from '../build/study-design.js';
import {withDesign,withMeasure} from '../build/study-design-dialog.js';
import {computeTwoByTwo,twoByTwoSentence,twoByTwoReceipt,twoByTwoEstimateRows}
  from '../build/two-by-two.js';
import {twoByTwoEquationNote} from '../build/equations.js';
import {twoByTwoMarkup} from '../build/two-by-two-view.js';

/** STEP 3 OF THE DESIGN SEQUENCE, reached through the dialog the practitioner asked for: *"select
 *  the study design and ... unselect or select which computations to include downstream."* A tick
 *  that reached only the dialog would be a control that cannot act, so every surface is read. */

const row=(group,outcome,value)=>({key:{group,outcome},value});
const table={kind:'data-table',keys:['group','outcome'],valueField:'n',missingValueCount:0,rowCount:4,
  rows:[row('exposed','case',30),row('exposed','well',70),row('unexposed','case',10),row('unexposed','well',90)]};
const request={label:'t',exposureColumn:'group',exposed:'exposed',unexposed:'unexposed',
  outcomeColumn:'outcome',caseValue:'case',nonCaseValue:'well',level:95};
const params=(design,extra={})=>({label:'d',design,period:'',unitOfAnalysis:'',note:'',...extra});
const declared=p=>{
  const included=includedMeasures(p),licence=DESIGN_LICENCES[p.design];
  return {kind:'study-design',design:p.design,period:'',unitOfAnalysis:licence.unitOfAnalysis,licence,
    sentence:'',included,withheld:licence.estimates.filter(n=>!included.includes(n))};};
const read=p=>readUnderDesign(computeTwoByTwo(table,request),declared(p));
const esc=v=>String(v);
const surfaces=r=>[twoByTwoSentence(r),twoByTwoEquationNote(r,'n').text,
  twoByTwoReceipt({id:'n'},r,'run','src').facts,twoByTwoMarkup(r,esc)];

test('no declaration leaves every surface as it was',()=>{
  const r=computeTwoByTwo(table,request);
  assert.equal(r.reading,undefined);
  assert.deepEqual(r.estimates.map(e=>e.name),['risk ratio','odds ratio','risk difference']);
  assert.match(twoByTwoSentence(r),/^exposed against unexposed: 30\.000% case against 10\.000%, a risk ratio of 3\.00/);
  assert.match(twoByTwoEquationNote(r,'n').text,/The risks are/);
});

test('case-control: the odds ratio alone, and no surface calls a/(a+b) a risk',()=>{
  const r=read(params('case-control'));
  assert.deepEqual(twoByTwoEstimateRows(r).map(e=>e.name),['odds ratio']);
  assert.match(twoByTwoSentence(r),/^exposed against unexposed: an odds ratio of 3\.86/);
  const [sentence,note,facts,figure]=surfaces(r);
  assert.doesNotMatch(sentence,/risk|30\.000%/);
  assert.doesNotMatch(note,/The risks are|\*\*risk ratio\*\*|30\/100/);
  assert.match(note,/Not reported under this design: risk ratio, risk difference/);
  assert.match(facts,/fw:notEstimable "risk ratio"/);
  assert.match(figure,/Not reported: risk ratio, risk difference/);
});

test('cross-sectional: the arithmetic keeps its value and takes its true name on every surface',()=>{
  const r=read(params('cross-sectional'));
  const plain=computeTwoByTwo(table,request);
  assert.deepEqual(twoByTwoEstimateRows(r).map(e=>e.name),
    ['prevalence ratio','prevalence odds ratio','prevalence difference']);
  assert.deepEqual(r.estimates.map(e=>e.value),plain.estimates.map(e=>e.value));
  const [sentence,note,facts,figure]=surfaces(r);
  assert.match(sentence,/a prevalence ratio of 3\.00/);
  assert.match(note,/The prevalences are/);
  assert.match(note,/\\mathrm\{PR\}/);
  assert.doesNotMatch(note,/\\mathrm\{(RR|OR|RD)\}/);
  assert.match(facts,/fw:estimateName "prevalence ratio"/);
  assert.match(figure,/prevalence odds ratio/);
  for(const text of [sentence,note,figure])assert.doesNotMatch(text,/risk ratio/);
});

test('A MEASURE UNTICKED LEAVES EVERY SURFACE, and the receipts record that it was withheld',()=>{
  const p=withMeasure(params('cohort'),'risk ratio',false);
  assert.deepEqual(p.computations,['odds ratio','risk difference']);
  const r=read(p);
  assert.deepEqual(r.reading.withheld,['risk ratio']);
  const [sentence,note,facts,figure]=surfaces(r);
  assert.match(sentence,/an odds ratio of/);
  assert.doesNotMatch(note,/\*\*risk ratio\*\*/);
  assert.match(facts,/fw:withheldEstimate "risk ratio"/);
  assert.doesNotMatch(facts,/fw:estimateName "risk ratio"/);
  assert.match(figure,/Not reported: risk ratio/);
  assert.match(studyDesignReceipt({id:'d',params:p},'run').facts,/fw:withheldEstimate "risk ratio"/);
});

test('a difference leading the sentence is not rounded away',()=>{
  const p=withMeasure(withMeasure(params('cohort'),'risk ratio',false),'odds ratio',false);
  assert.match(twoByTwoSentence(read(p)),/a risk difference of 0\.2000/);
});

test('a design that licenses nothing reports nothing, and says so',()=>{
  const r=read(params('case-series'));
  assert.deepEqual(r.estimates,[]);
  assert.match(twoByTwoSentence(r),/with no measure reported under this design/);
  assert.match(twoByTwoMarkup(r,esc),/No measure is reported/);
  assert.equal(twoByTwoEquationNote(r,'n').text.includes('undefined'),false);
});

test('ticking everything back returns to no recorded choice',()=>{
  const off=withMeasure(params('cohort'),'odds ratio',false);
  assert.equal('computations' in withMeasure(off,'odds ratio',true),false);
});

test('a new design drops the old choice, which named measures it may not have',()=>{
  const moved=withDesign(withMeasure(params('cohort'),'odds ratio',false),'case-control');
  assert.equal('computations' in moved,false);
  assert.deepEqual(includedMeasures(moved),['odds ratio']);
});

test('a measure the design does not license cannot be reintroduced by an edited file',()=>{
  assert.deepEqual(includedMeasures(params('case-control',{computations:['risk ratio','odds ratio']})),
    ['odds ratio']);
  assert.deepEqual(notEstimable('cohort'),[]);
  assert.deepEqual(notEstimable('case-control'),['risk ratio','risk difference']);
});
