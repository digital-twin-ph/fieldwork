import test from 'node:test';
import assert from 'node:assert/strict';
import {executeWorkflow} from '../build/core.js';
import {forkMachinedNote} from '../build/notes.js';
import {producedBy} from '../build/notes-ui.js';

const row=(group,outcome,value)=>({key:{group,outcome},value});
const table={kind:'data-table',keys:['group','outcome'],valueField:'n',rowCount:4,missingValueCount:0,
  rows:[row('e','c',30),row('e','w',70),row('u','c',10),row('u','w',90)]};
const tbt=(id,label)=>({id,type:'two_by_two',x:0,y:0,params:{label,exposureColumn:'group',exposed:'e',
  unexposed:'u',outcomeColumn:'outcome',caseValue:'c',nonCaseValue:'w',level:95}});
const flow=(nodes,edges)=>({schema:'fieldwork/workflow/1',id:'w',label:'w',nodes:[
  {id:'cells',type:'table_input',x:0,y:0,params:{label:'Cells',keys:['group','outcome'],valueField:'n',data:table}},...nodes],edges});
const design=(id,kind)=>({id,type:'study_design',x:0,y:0,params:{label:'Study design',design:kind,period:'',unitOfAnalysis:'',note:''}});
const out=(id)=>({id,type:'table_output',x:0,y:0,params:{label:id,inputMode:'table'}});
const reasoner=async()=>({conclusions:[]});
const run=w=>executeWorkflow(w,reasoner,()=>{});

test('a machined note records the widget and the version that ran',async()=>{
  const r=await run(flow([tbt('t','One company against the other'),out('o')],
    [{id:'1',from:'cells',to:'t',port:'records'},{id:'2',from:'t',to:'o',port:'table'}]));
  const [note]=r.machined.t;
  assert.equal(note.widget.type,'two_by_two');
  assert.equal(note.widget.title,'Two-by-two table');
  assert.match(note.widget.version,/^\d+\.\d+\.\d+$/);
  assert.equal(producedBy(note,'One company against the other'),'Two-by-two table · One company against the other');
  assert.equal(producedBy(note,'Two-by-two table'),'Two-by-two table');
});

test('an edited note keeps which widget it started from, and survives saving',()=>{
  const widget={type:'two_by_two',title:'Two-by-two table',version:'0.5.0'};
  const fork=forkMachinedNote({kind:'machined',id:'n',section:'Methods',text:'x',nodeId:'t',widget},'f','y');
  assert.deepEqual(fork.forkedFrom.widget,widget);
});

test('a table takes one design: a second connection is refused',async()=>{
  const w=flow([design('d1','cohort'),design('d2','case-control'),tbt('t','The table'),out('o')],
    [{id:'1',from:'cells',to:'t',port:'records'},{id:'2',from:'d1',to:'t',port:'design'},
     {id:'3',from:'d2',to:'t',port:'design'},{id:'4',from:'t',to:'o',port:'table'}]);
  await assert.rejects(run(w),/Each input port accepts one connection/);
});

test('two designs on separate branches each govern their own table',async()=>{
  const w=flow([design('d1','cohort'),design('d2','case-control'),tbt('t1','First'),tbt('t2','Second'),out('o1'),out('o2')],
    [{id:'1',from:'cells',to:'t1',port:'records'},{id:'2',from:'cells',to:'t2',port:'records'},
     {id:'3',from:'d1',to:'t1',port:'design'},{id:'4',from:'d2',to:'t2',port:'design'},
     {id:'5',from:'t1',to:'o1',port:'table'},{id:'6',from:'t2',to:'o2',port:'table'}]);
  const r=await run(w);
  assert.match(r.machined.t1[0].text,/\*\*risk ratio\*\*/);
  assert.doesNotMatch(r.machined.t2[0].text,/\*\*risk ratio\*\*/);
  assert.match(r.machined.t2[0].text,/\*\*odds ratio\*\*/);
});

test('investigator allocation leaves a connected table under neutral names',async()=>{
  const d=design('d','cohort');d.params.answers={A1:{option:'A1.1'}};
  const r=await run(flow([d,tbt('t','The table'),out('o')],
    [{id:'1',from:'cells',to:'t',port:'records'},{id:'2',from:'d',to:'t',port:'design'},{id:'3',from:'t',to:'o',port:'table'}]));
  assert.match(r.machined.t[0].text,/ratio of row proportions/);
  assert.match(r.machined.d[0].text,/^No study design was declared\. Exposure was allocated by the investigators/);
});
