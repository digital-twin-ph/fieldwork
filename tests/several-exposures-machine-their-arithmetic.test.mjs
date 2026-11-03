import test from 'node:test';
import assert from 'node:assert/strict';
import {executeWorkflow} from '../build/core.js';
import {dataTable} from '../build/data-table.js';

/** THE KERNEL'S ARITHMETIC REACHES THE NOTES WITH SEVERAL EXPOSURES TOO. The practitioner, 2026-11-03:
 *  the two-by-two "should emit the kernel computations for the study design in the notes". With one
 *  exposure it did; with Oswego's fourteen foods it machined one sentence and no formula. */
const rows=[['1','Y','Y','N'],['2','Y','Y','Y'],['3','N','N','Y'],['4','N','Y','N'],['5','Y','N','N'],['6','N','N','Y']];
const data=dataTable({headers:['ID','Ill','Ham','Milk'],rows},{keys:['Ill','Ham','Milk'],valueField:'ID'});
const workflow=(columns)=>({schema:'fieldwork/workflow/1',name:'Supper',nodes:[
  {id:'list',type:'table_input',x:0,y:0,params:{label:'Line list',keys:['Ill','Ham','Milk'],valueField:'ID',data}},
  {id:'tbt',type:'two_by_two',x:300,y:0,params:{label:'Two-by-two',exposureColumn:columns[0],exposureColumns:columns,
    outcomeColumn:'Ill',exposed:'Y',unexposed:'N',caseValue:'Y',nonCaseValue:'N',rowsAreSubjects:true,level:95}},
  {id:'out',type:'table_output',x:600,y:0,params:{label:'Foods'}}],
  edges:[{id:'e1',from:'list',to:'tbt',port:'records'},{id:'e2',from:'tbt',to:'out',port:'table'}]});

test('several exposures machine the formulas once in symbols; the table output carries the numbers',async()=>{
  const run=await executeWorkflow(workflow(['Ham','Milk']));
  const notes=run.machined.tbt;
  assert.deepEqual(notes.map(n=>n.fn),['method','limitation']);
  assert.match(notes[0].text,/computed from its own four cells/);
  assert.match(notes[0].text,/\\frac\{ad\}\{bc\}/);
  assert.doesNotMatch(notes[0].text,/\$a\$ = /,'no exposure\'s numbers are written into the formulas');
  // THE TABLE IS THE TABLE OUTPUT'S, which describes it in a note of its own; drawn here too, it was twice.
  assert.match(notes[1].id,/:comparisons$/);
  assert.match(run.machined.out[0].id,/:description$/);
  assert.ok(notes[0].cites?.length,'the methods it used are cited, so References lists them');
});
