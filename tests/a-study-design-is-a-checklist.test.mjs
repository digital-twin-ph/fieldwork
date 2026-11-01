import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDY_DESIGNS,migrateSurveillanceDesign,studyDesignReceipt,studyDesignSentence} from '../build/study-design.js';
import {DESIGN_QUESTIONS,designQuestions,refinementSentences,answerSentence,openSlots,tableSentences,inheritedFill}
  from '../build/study-design-questions.js';
import {designChecklist,checklistSummary} from '../build/study-design-checklist.js';
import {checklistMarkup,designPageCount,withToggle,withAnswer,withDesign,withFill,withCell,withTableField} from '../build/study-design-dialog.js';

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
  assert.deepEqual(ids(params('case-control')),['SRC','A1','T1','CC1','CC2','CC3','CC4','CC5','CC6','G1']);
  assert.deepEqual(ids(params('cohort')),['SRC','A1','T1','C1','C2','C3','C4','G1']);
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
  assert.match(answerSentence(q,{option:'CC6.3'}),/answered not sure or not stated, so any reading that depends on it is not given\./);
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
  for(const k of ['a','c'])p=withCell(p,k,{counts:'deaths',source:'the Registrar General'});
  for(const k of ['a+b','c+d'])p=withCell(p,k,{counts:'houses',source:'a return to Parliament'});
  for(const k of ['b','d'])p=withCell(p,k,{counts:'houses with no death',derived:true});
  assert.deepEqual(tableSentences(p.table),[
    'Exposed was Southwark and Vauxhall Company, unexposed was Lambeth Company, and the outcome was a death from cholera.',
    'a and c count deaths.','b and d count houses with no death.','a+b and c+d count houses.',
    'a and c came from the Registrar General.','a+b and c+d came from a return to Parliament.',
    'b and d were worked out from other cells.']);
  assert.equal(designPageCount(p),11);
  const w=workflow('cohort',p);
  w.nodes[0].params=p;
  w.nodes[2]={id:'t',type:'rate_ratio',params:{label:'ratio',compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'}};
  const items=designChecklist(w,'d');
  assert.equal(status(items,'computation'),'done');
  assert.match(items.find(i=>i.id==='computation').detail,/does not yet obey/);
  assert.equal(status(items,'table-groups'),'done');
  assert.equal(status(items,'table-cells'),'done');
  assert.equal(status(items,'table-match'),'done');
});

test('a two-by-two with other groups is reported, never corrected',()=>{
  const w=workflow('ecological',{table:{exposed:'Southwark and Vauxhall Company only',unexposed:'Lambeth Company only',outcome:'death'}});
  let items=designChecklist(w,'d');
  assert.equal(status(items,'table-match'),'differs');
  assert.match(items.find(i=>i.id==='table-match').detail,/the computation has e against u\. Are these the same groups\?/);
  assert.match(checklistSummary(items),/1 to compare\.$/);
  w.nodes[2].params.exposed='southwark and vauxhall company only';
  w.nodes[2].params.unexposed='Lambeth Company only';
  items=designChecklist(w,'d');
  assert.equal(status(items,'table-match'),'done');
});

test('designs other than South London have no table page yet',()=>{
  assert.equal(designPageCount(params('case-control')),12);
  assert.equal(designPageCount(params('cohort')),11);
});

test('exposure and what a cell counts are two facts, for any design, and neither is South London',()=>{
  const p=withCell(withTableField(params('ecological'),'exposureKnownFor','villages'),'a',{counts:'children'});
  assert.deepEqual(tableSentences(p.table),['Exposure was known for villages.','a counts children.']);
});

test('a cell needs what it counts and a source, unless it was worked out',()=>{
  let w=workflow('cohort');
  const blank=designChecklist(w,'d').find(i=>i.id==='table-cells');
  assert.equal(blank.status,'open');
  assert.match(blank.detail,/a, b, a\+b, c, d, c\+d/);
  let p=w.nodes[0].params;
  for(const k of ['a','a+b','c','c+d'])p=withCell(p,k,{counts:'x'});
  for(const k of ['b','d'])p=withCell(p,k,{counts:'y',derived:true});
  w.nodes[0].params=p;
  assert.match(designChecklist(w,'d').find(i=>i.id==='table-cells').detail,/a, a\+b, c, c\+d/);
});

test('no worked example is written into the design source',async()=>{
  const {readFile}=await import('node:fs/promises');
  for(const f of ['study-design.ts','study-design-questions.ts','study-design-checklist.ts','study-design-dialog.ts']){
    const code=(await readFile(new URL(`../src/${f}`,import.meta.url),'utf8'))
      .split('\n').filter(l=>!/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code,/Southwark|Lambeth|Vauxhall|Registrar|Parliament|sub-district/i,f);
  }
});

test('where the table holds the sources, stage 2 asks only about surveillance',()=>{
  for(const design of ['cohort','ecological']){
    const q=designQuestions(params(design)).find(x=>x.id==='SRC');
    assert.equal(q.text,'Does any of this come from a surveillance system?');
    assert.deepEqual(q.options.map(o=>o.label),['Yes','No','Not sure / not stated']);
    assert.ok(ids(withAnswer(params(design),'SRC','SRC.1')).includes('S1'));
    assert.ok(!ids(withAnswer(params(design),'SRC','SRC.9')).includes('S1'));
  }
  assert.equal(designQuestions(params('case-series')).find(x=>x.id==='SRC').options.length,8);
});

test('a group blank is filled from the table, and the practitioner can overrule it',()=>{
  const table={exposureKnownFor:'villages'};
  const q=DESIGN_QUESTIONS.find(x=>x.id==='E2');
  const option=q.options.find(o=>o.sentence?.includes('‹group›')&&/not known/.test(o.sentence)).id;
  assert.equal(inheritedFill('group',table),'villages');
  assert.equal(inheritedFill('Outcome',table),'');
  assert.equal(answerSentence(q,{option},table),'Exposure within villages was not known.');
  assert.deepEqual(openSlots(q,{option},table),[]);
  assert.deepEqual(openSlots(q,{option}),['group']);
  assert.equal(answerSentence(q,{option,fills:{group:'the upland villages'}},table),'Exposure within the upland villages was not known.');
  assert.equal(inheritedFill('Group',table),'');
});

test('A2 and the natural experiment question follow only from outside allocation',()=>{
  const with_=o=>ids(withAnswer(params('cohort'),'A1',o));
  assert.ok(!ids(params('cohort')).includes('A2'));
  for(const o of ['A1.3','A1.4','A1.5','A1.6'])assert.deepEqual(with_(o).slice(1,5),['A1','A2','A3','T1'],o);
  for(const o of ['A1.1','A1.2','A1.7','A1.8','A1.9'])assert.ok(!with_(o).includes('A3'),o);
});

test('the natural experiment always names its definition',()=>{
  const q=DESIGN_QUESTIONS.find(x=>x.id==='A3');
  assert.match(answerSentence(q,{option:'A3.2'}),/broad sense.*Craig et al\. 2025.*not thereby.*narrow sense.*Dunning 2008/);
  assert.match(answerSentence(q,{option:'A3.3',fills:{'narrow argument':'x'}}),/narrow sense.*Dunning 2008.*because x/);
  assert.equal(answerSentence(q,{option:'A3.1'}),null);
});

test('A2 holds several options, and None and not sure stand alone',()=>{
  const q=DESIGN_QUESTIONS.find(x=>x.id==='A2');
  let p=withToggle(params('cohort'),q,'A2.1',true);
  p=withToggle(p,q,'A2.3',true);
  assert.equal(p.answers.A2.option,'A2.1 A2.3');
  assert.deepEqual(openSlots(q,p.answers.A2),['allocation source','control']);
  assert.match(answerSentence(q,p.answers.A2),/documented.*negative control/i);
  p=withToggle(p,q,'A2.4',true);
  assert.equal(p.answers.A2.option,'A2.4');
  p=withToggle(p,q,'A2.2',true);
  assert.equal(p.answers.A2.option,'A2.2');
  p=withToggle(p,q,'A2.2',false);
  assert.equal(p.answers.A2,undefined);
  const r=withAnswer(params('cohort',{answers:{A1:{option:'A1.5'},A2:{option:'A2.1 A2.3'}}}),'T1','T1.1');
  const {facts}=studyDesignReceipt({id:'d',params:r},'run');
  assert.match(facts,/refinementAnswer "A2\.1";\n  fw:refinementAnswer "A2\.3"/);
});

test('investigator allocation stops the declaration, and nothing pretends otherwise',()=>{
  const p=params('cohort',{period:'1854',answers:{A1:{option:'A1.1'}}});
  assert.equal(studyDesignSentence({params:p}),'No study design was declared.');
  assert.deepEqual(ids(p),['SRC','A1']);
  const {facts}=studyDesignReceipt({id:'d',params:p},'run');
  assert.match(facts,/fw:designStopped true/);
  assert.doesNotMatch(facts,/studyDesignKind|licensedEstimate/);
  assert.match(facts,/fw:refinementAnswer "A1\.1"/);
  const items=designChecklist(workflow('cohort',p),'d');
  assert.equal(items.find(i=>i.id==='stopped').status,'open');
  assert.equal(items.some(i=>i.id==='computation'||i.id==='period'||i.id==='C1'),false);
});
