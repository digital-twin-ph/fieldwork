import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDY_DESIGNS,migrateSurveillanceDesign,studyDesignReceipt} from '../build/study-design.js';
import {DESIGN_QUESTIONS,designQuestions,refinementSentences,answerSentence,openSlots,tableSentences}
  from '../build/study-design-questions.js';
import {designChecklist,checklistSummary} from '../build/study-design-checklist.js';
import {checklistMarkup,designPageCount,withAnswer,withDesign,withFill,withTableField,withTableSource} from '../build/study-design-dialog.js';

/** EXPERIMENT 159. Stage 2 asks what the selected design needs, and the checklist reads the
 *  workflow against it. What it must never do is pass a declaration off as something it checked. */

const params=(design,extra={})=>({label:'d',design,period:'',unitOfAnalysis:'',note:'',...extra});
const ids=p=>designQuestions(p).map(q=>q.id);
const workflow=(design='case-control',over={})=>({nodes:[
  {id:'d',type:'study_design',params:params(design,over)},
  {id:'cells',type:'table_input',params:{label:'Cells'}},
  {id:'t',type:'two_by_two',params:{label:'t',exposureColumn:'g',exposed:'e',unexposed:'u',
    outcomeColumn:'o',caseValue:'c',nonCaseValue:'w',level:95}},
  {id:'out',type:'table_output',params:{label:'out'}}],
  edges:[{id:'1',from:'cells',to:'t',port:'records'},{id:'2',from:'d',to:'t',port:'design'},
    {id:'3',from:'t',to:'out',port:'table'}]});
const status=(items,id)=>items.find(i=>i.id===id)?.status;

test('surveillance is not a study design',()=>{
  assert.deepEqual([...STUDY_DESIGNS],['cohort','case-control','cross-sectional','ecological','case-series']);
});

test('a saved surveillance declaration is removed with its edges',()=>{
  const w=workflow();w.nodes[0].params.design='surveillance';
  migrateSurveillanceDesign(w);
  assert.equal(w.nodes.some(n=>n.type==='study_design'),false);
  assert.equal(w.edges.some(e=>e.from==='d'),false);
  assert.equal(w.edges.length,2);
});

test('each design asks its own questions, and every question can be answered not sure',()=>{
  assert.deepEqual(ids(params('case-control')),['SRC','CC1','CC2','CC3','CC4','CC5','CC6','G1']);
  assert.deepEqual(ids(params('cohort')),['SRC','C1','C2','C3','C4','G1']);
  for(const q of DESIGN_QUESTIONS)assert.ok(q.options.some(o=>o.unknown),q.id);
  assert.equal(new Set(DESIGN_QUESTIONS.flatMap(q=>q.options.map(o=>o.id))).size,
    DESIGN_QUESTIONS.reduce((n,q)=>n+q.options.length,0));
});

test('no source note, link or evidence tag leaks into a question',()=>{
  const text=JSON.stringify(DESIGN_QUESTIONS);
  assert.doesNotMatch(text,/https?:|\[Full|\[Direct|\[Tool|\*\*|`/);
});

test('a surveillance source brings the surveillance questions, under any design',()=>{
  for(const design of STUDY_DESIGNS){
    const p=withAnswer(params(design),'SRC','SRC.1');
    assert.ok(ids(p).includes('S1'),design);
    assert.ok(!ids(params(design)).includes('S1'),design);
  }
});

test('a case-control source speaks of cases, and CC3 keeps its reading',()=>{
  const q=designQuestions(params('case-control')).find(x=>x.id==='SRC');
  assert.equal(q.text,'Where did the cases come from?');
  assert.equal(answerSentence(q,{option:'SRC.1',fills:{system:'PIDSR'}}),'Cases came from PIDSR, a surveillance system.');
  const cc3=DESIGN_QUESTIONS.find(x=>x.id==='CC3');
  assert.match(answerSentence(cc3,{option:'CC3.2'}),/estimates the risk ratio if censoring is unrelated/);
});

test('a blank stays visible, and not sure says what is unknown',()=>{
  const q=DESIGN_QUESTIONS.find(x=>x.id==='CC6');
  assert.match(answerSentence(q,{option:'CC6.1'}),/‹population›/);
  assert.deepEqual(openSlots(q,{option:'CC6.1'}),['population']);
  assert.match(answerSentence(q,{option:'CC6.3'}),/answered not sure or not stated/);
});

test('answers survive a change of design',()=>{
  const p=withFill(withAnswer(params('case-control'),'CC3','CC3.2'),'CC3','x','y');
  const back=withDesign(withDesign(p,'cohort'),'case-control');
  assert.deepEqual(back.answers,p.answers);
  assert.deepEqual(refinementSentences(withDesign(p,'cohort')),[]);
});

test('the implemented items follow the canvas',()=>{
  const w=workflow();
  let items=designChecklist(w,'d');
  for(const id of ['computation','measures','mapping','data','output'])assert.equal(status(items,id),'done',id);
  assert.equal(status(items,'provenance'),'open');
  assert.match(items.find(i=>i.id==='provenance').detail,/Cells/);
  w.nodes[1].params.provenance={source:'Field team',licence:'unstated'};
  assert.equal(status(designChecklist(w,'d'),'provenance'),'done');
  w.edges=w.edges.filter(e=>e.id!=='2');
  assert.equal(status(designChecklist(w,'d'),'computation'),'open');
  w.edges=[{id:'2',from:'d',to:'t',port:'design'}];
  items=designChecklist(w,'d');
  assert.equal(status(items,'output'),'open');
  assert.equal(status(items,'data'),'open');
});

test('a case series is told when a comparison is drawn',()=>{
  const items=designChecklist(workflow('case-series'),'d');
  assert.equal(status(items,'no-comparison'),'open');
  assert.equal(items.some(i=>i.id==='computation'),false);
});

test('open, unknown and done are three facts, and a summary is not a score',()=>{
  const w=workflow('case-control',{answers:{CC1:{option:'CC1.1'},CC2:{option:'CC2.3'},CC6:{option:'CC6.1'}}});
  const items=designChecklist(w,'d');
  assert.equal(status(items,'CC1'),'done');
  assert.equal(status(items,'CC2'),'unknown');
  assert.equal(status(items,'CC6'),'open');
  assert.equal(status(items,'CC3'),'open');
  assert.match(checklistSummary(items),/^Checklist: \d+ done, 1 stated as unknown, \d+ open\.$/);
  assert.doesNotMatch(checklistSummary(items),/%/);
});

test('the checklist keeps what it read apart from what it was told',()=>{
  const html=checklistMarkup(designChecklist(workflow(),'d'),String);
  assert.match(html,/Read from this workflow/);
  assert.match(html,/Fieldwork cannot check these/);
  assert.match(html,/does not grade/);
  assert.ok(html.indexOf('data-check="data"')<html.indexOf('Declared by you'));
  assert.ok(html.indexOf('data-check="CC1"')>html.indexOf('Declared by you'));
});

test('the receipt records answers to the questions this design asks, and no others',()=>{
  const p=params('cohort',{answers:{C1:{option:'C1.1'},CC3:{option:'CC3.2'}}});
  const {facts}=studyDesignReceipt({id:'d',params:p},'run');
  assert.match(facts,/fw:refinementAnswer "C1\.1"/);
  assert.doesNotMatch(facts,/CC3/);
});

test('South London, cohort: Table IX declared in the practitioner words, with two sources',()=>{
  let p=params('cohort',{period:'1854',unitOfAnalysis:'house'});
  for(const [f,v] of [['exposed','Southwark and Vauxhall Company'],['unexposed','Lambeth Company'],
    ['outcome','a death from cholera'],['noOutcome','no death']])p=withTableField(p,f,v);
  for(const [k,v] of [['a','the Registrar General'],['c','the Registrar General'],
    ['a+b','a return to Parliament'],['c+d','a return to Parliament']])p=withTableSource(p,k,v);
  assert.deepEqual(tableSentences(p.table),[
    'Exposed was Southwark and Vauxhall Company, unexposed was Lambeth Company, and the outcome was a death from cholera.',
    'a and c came from the Registrar General.','a+b and c+d came from a return to Parliament.']);
  assert.equal(designPageCount(p),9);
  const w=workflow('cohort',p);
  w.nodes[0].params=p;
  w.nodes[2]={id:'t',type:'rate_ratio',params:{label:'ratio',compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'}};
  const items=designChecklist(w,'d');
  assert.equal(status(items,'computation'),'done');
  assert.match(items.find(i=>i.id==='computation').detail,/does not yet obey/);
  assert.equal(status(items,'table-groups'),'done');
  assert.equal(status(items,'table-sources'),'done');
  assert.equal(status(items,'table-match'),'done');
});

test('a two-by-two with other groups is reported, never corrected',()=>{
  const w=workflow('ecological',{table:{exposed:'Southwark and Vauxhall Company only',unexposed:'Lambeth Company only',outcome:'death'}});
  let items=designChecklist(w,'d');
  assert.equal(status(items,'table-match'),'open');
  assert.match(items.find(i=>i.id==='table-match').detail,/the computation has e against u/);
  w.nodes[2].params.exposed='southwark and vauxhall company only';
  w.nodes[2].params.unexposed='Lambeth Company only';
  items=designChecklist(w,'d');
  assert.equal(status(items,'table-match'),'done');
});

test('designs other than South London have no table page yet',()=>{
  assert.equal(designPageCount(params('case-control')),10);
  assert.equal(designPageCount(params('cohort')),9);
});

test('exposure and what the cells count are two facts, for any design, and neither is South London',()=>{
  const p=withTableField(withTableField(params('ecological'),'exposureKnownFor','villages'),'cellsCount','children');
  assert.ok(tableSentences(p.table).includes('Exposure was known for villages, and the cells count children.'));
});

test('no worked example is written into the design source',async()=>{
  const {readFile}=await import('node:fs/promises');
  for(const f of ['study-design.ts','study-design-questions.ts','study-design-checklist.ts','study-design-dialog.ts']){
    const code=(await readFile(new URL(`../src/${f}`,import.meta.url),'utf8'))
      .split('\n').filter(l=>!/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code,/Southwark|Lambeth|Vauxhall|Registrar|Parliament|sub-district/i,f);
  }
});
