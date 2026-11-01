import test from 'node:test';
import assert from 'node:assert/strict';
import {designFor,upstreamNodeIds,DESIGN_LICENCES,isStudyDesign,studyDesignSentence,
  studyDesignReceipt} from '../build/study-design.js';
import {STUDY_DESIGNS} from '../build/study-design.js';

/** A WORKFLOW DECLARES HOW AS WELL AS WHERE.
 *
 *  The practitioner, 2026-10-28: *"Case control, cohort, cross-sectional studies carry with them
 *  pathways to specific epidemiology computations. So identifying the study design is key."*
 *  Experiment 154. There is no arithmetic here, so per D8 these test the DISTINCTION: that a
 *  design is declared and never inferred, that two answers are refused rather than resolved, and
 *  that an absent declaration is reported rather than defaulted. */

const design=(id,kind,extra={})=>({id,type:'study_design',x:0,y:0,
  params:{label:'Study design',design:kind,period:'1854',unitOfAnalysis:'',note:'',...extra}});
const node=(id,type)=>({id,type,x:0,y:0,params:{label:id}});
const w=(nodes,edges=[])=>({name:'W',nodes,edges:edges.map(([from,to,port='records'],i)=>
  ({id:`e${i}`,from,to,port}))});

test('a design reaches a computation by an EDGE, which beats any walk',()=>{
  const flow=w([design('d','cohort'),node('t','table_input'),node('x','two_by_two')],
    [['d','x','design'],['t','x','records']]);
  const found=designFor(flow,'x');
  assert.equal(found.found,'one');
  assert.equal(found.design,'cohort');
  assert.equal(found.node.id,'d');
});

test('WITHOUT AN EDGE IT WALKS UPSTREAM, which is what makes this a node and not a global',()=>{
  // `relate_table` and friends carry nothing: the walk removes the four-widget cascade.
  const flow=w([design('d','ecological'),node('t','table_input'),node('r','relate_table'),
    node('x','two_by_two')],[['d','t'],['t','r'],['r','x']]);
  assert.equal(designFor(flow,'x').design,'ecological');
});

test('UPSTREAM ONLY: a design declared downstream governs nothing',()=>{
  // A design reached by going forwards did not govern the computation, and reaching sideways
  // would make two unrelated branches of one canvas share a declaration neither connected to.
  const flow=w([node('t','table_input'),node('x','two_by_two'),design('d','cohort')],
    [['t','x'],['x','d']]);
  assert.equal(designFor(flow,'x').found,'absent');
  // And a design on a parallel branch is not upstream of this one either.
  const parallel=w([design('d','cohort'),node('a','table_input'),node('b','table_input'),
    node('x','two_by_two')],[['d','a'],['b','x']]);
  assert.equal(designFor(parallel,'x').found,'absent');
});

test('TWO DIFFERENT DESIGNS ARE REFUSED, never resolved by picking the nearer one',()=>{
  // The cost of a walk over an edge, paid openly: an edge would say which design governs a
  // computation and a walk has to decide. Deciding is the one thing it must not do -- which
  // study somebody is running is not a tie this application may break.
  const flow=w([design('d1','cohort'),design('d2','case-control'),
    node('t','table_input'),node('x','two_by_two')],[['d1','t'],['d2','t'],['t','x']]);
  const found=designFor(flow,'x');
  assert.equal(found.found,'ambiguous');
  assert.deepEqual(found.nodeIds.sort(),['d1','d2']);
});

test('two nodes AGREEING is not an ambiguity',()=>{
  // A practitioner may declare the same design on two branches that meet. What cannot be
  // resolved is two different answers to one question, not two statements of one answer.
  const flow=w([design('d1','cohort'),design('d2','cohort'),
    node('t','table_input'),node('x','two_by_two')],[['d1','t'],['d2','t'],['t','x']]);
  assert.equal(designFor(flow,'x').found,'one');
});

test('AN UNDECLARED DESIGN IS ABSENT, not a cohort',()=>{
  // The one distinction here that prevents nothing, and deliberately. 147 records the doubt:
  // a practitioner may not know which design they have, and an application that refused to
  // compute until told would be worse than one that stays quiet. So absence is REPORTED.
  const flow=w([node('t','table_input'),node('x','two_by_two')],[['t','x']]);
  const found=designFor(flow,'x');
  assert.equal(found.found,'absent');
  assert.equal(found.design,undefined,'absence must not resolve to a design');
});

test('a design is never read off the data: only a declaring node is a source',()=>{
  const flow=w([node('t','table_input'),node('x','two_by_two')],[['t','x']]);
  // Even with a column named like a design, nothing infers one.
  flow.nodes[0].params.data={keys:['cohort'],rows:[{key:{cohort:'yes'},value:1}]};
  assert.equal(designFor(flow,'x').found,'absent');
});

test('CASE-CONTROL LICENSES THE ODDS RATIO AND NOTHING ELSE',()=>{
  // The one that prevents a wrong number. a+b and c+d are artefacts of how many cases and
  // controls were sampled, so a/(a+b) is not a risk.
  const licence=DESIGN_LICENCES['case-control'];
  assert.deepEqual([...licence.estimates],['odds ratio']);
  assert.equal(licence.rowProportion,null);
  assert.match(licence.because,/artefacts of the sampling/);
});

test('cross-sectional keeps the arithmetic and loses the name "risk"',()=>{
  const licence=DESIGN_LICENCES['cross-sectional'];
  assert.equal(licence.rowProportion,'prevalence');
  assert.ok(licence.estimates.every(name=>!/^risk/.test(name)),
    'a cross-sectional study estimates prevalence, not risk');
});

test('an ecological design counts GROUPS, which is the inference it is read past',()=>{
  assert.equal(DESIGN_LICENCES['ecological'].unitOfAnalysis,'group');
  assert.match(DESIGN_LICENCES['ecological'].because,/need not hold between individuals/);
});

test('THE VOCABULARY IS CLOSED, and every member licenses something or says why not',()=>{
  assert.deepEqual([...STUDY_DESIGNS],
    ['cohort','case-control','cross-sectional','ecological','case-series']);
  for(const kind of STUDY_DESIGNS){
    const licence=DESIGN_LICENCES[kind];
    assert.ok(licence,`${kind} has no licence`);
    assert.ok(licence.because.trim(),`${kind} does not say what it licenses or why not`);
    assert.ok(licence.unitOfAnalysis.trim(),`${kind} does not say what one row counts`);
  }
  assert.ok(!isStudyDesign('randomised-trial'),'a design nothing serves is not admitted');
  assert.ok(isStudyDesign('cohort'));
});

test('the receipt states what was declared and what it licenses, never what was estimated',()=>{
  const n=design('d','case-control',{period:'1854',unitOfAnalysis:''});
  const receipt=studyDesignReceipt(n,'run1');
  assert.match(receipt.facts,/a fw:StudyDesign/);
  assert.match(receipt.facts,/fw:studyDesignKind "case-control"/);
  assert.match(receipt.facts,/fw:studyPeriod "1854"/);
  assert.match(receipt.facts,/fw:licensedEstimate "odds ratio"/);
  assert.doesNotMatch(receipt.facts,/fw:estimateValue/,
    'a declaration must not assert an estimate; that is the computation’s receipt');
  // A design licensing NOTHING omits the property, which says so rather than predating it.
  assert.doesNotMatch(studyDesignReceipt(design('d','case-series'),'run1').facts,
    /fw:licensedEstimate/);
});

test('one declaration is not worded two ways',()=>{
  // The rule `twoByTwoSentence` and `rateRatioSentence` already keep: the receipt and any
  // machined note say the same thing, because they call the same function.
  const n=design('d','ecological',{unitOfAnalysis:'sub-district'});
  assert.equal(studyDesignReceipt(n,'r').method,studyDesignSentence(n));
  assert.match(studyDesignSentence(n),/ecological study, 1854/);
  assert.match(studyDesignSentence(n),/unit of analysis is the sub-district/);
});

test('the walk is cycle-safe, because a canvas is a graph somebody drew',()=>{
  const flow=w([node('a','relate_table'),node('b','relate_table')],[['a','b'],['b','a']]);
  assert.deepEqual([...upstreamNodeIds(flow,'a')].sort(),['a','b']);
});
