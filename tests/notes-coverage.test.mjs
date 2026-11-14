import test from 'node:test';
import assert from 'node:assert/strict';
import {derivedNotes} from '../build/notes-derived.js';
import {referenceList} from '../build/references.js';

/** NOTES HOLD EVERY RESULT (2026-11-14; the practitioner: "The Notes is where a user may want to see all the results").
 *  A source is cited whatever its licence; a licence's attribution is not the reference. */
const node=(id,provenance)=>({id,type:'table_input',x:0,y:0,params:{label:id,provenance}});

test('a source whose licence is unstated or waived is still a reference, by its citation or its source sentence',()=>{
  const notes=derivedNotes([
    node('line',{what:'The line list',source:'ECDC, compiled from public reports',url:'https://example.org/mers',retrieved:'2026-11-11',licence:'unstated'}),
    node('kdca',{what:'The confirmed cases',published:'2025-12-02',licence:'none-applies',
      citation:{type:'dataset',authors:[{family:'Korea Disease Control and Prevention Agency',corporate:true}],title:'MERS confirmed cases',publisher:'data.go.kr'}}),
    node('osm',{what:'The hospitals, placed',source:'OpenStreetMap',licence:'ODbL-1.0'})],'w');
  const refs=referenceList([{workflowName:'W',machined:[],derived:notes}]);
  const texts=refs.map(r=>r.text);
  assert.ok(texts.some(t=>t.startsWith('ECDC, compiled from public reports. https://example.org/mers (accessed 2026-11-11)')),texts.join('\n'));
  assert.ok(texts.some(t=>t.includes('Korea Disease Control and Prevention Agency')&&t.includes('MERS confirmed cases')),texts.join('\n'));
  assert.ok(texts.some(t=>t.includes('OpenStreetMap')),texts.join('\n'));
  assert.equal(refs.filter(r=>r.kind==='source').length,3);
});

test('every step that ran says what it did in Methods, unless it wrote its own; outputs and sources do not',async()=>{
  const {executeWorkflow,validateWorkflow}=await import('../build/core.js');
  const rows=[{key:{g:'a',id:'1'},value:2},{key:{g:'a',id:'2'},value:3},{key:{g:'b',id:'3'},value:5}];
  const w={schema:'fieldwork/workflow/1',exampleId:'blank',name:'t',nodes:[
    {id:'t',type:'table_input',x:0,y:0,params:{label:'T',keys:['g','id'],valueField:'v',data:{kind:'data-table',keys:['g','id'],valueField:'v',unit:'cases',rows,rowCount:3,missingValueCount:0}}},
    {id:'g',type:'group_table',x:0,y:0,params:{label:'By g',by:['g']}},
    {id:'o',type:'table_output',x:0,y:0,params:{label:'Shown'}}],
    edges:[{id:'a',from:'t',to:'g',port:'records'},{id:'b',from:'g',to:'o',port:'table'}]};
  const run=await executeWorkflow(validateWorkflow(w),async()=>[]);
  const methods=(id)=>(run.machined?.[id]??[]).filter(n=>n.section==='Methods');
  assert.equal(methods('g').length,1,'Total within groups says what it totalled');
  assert.match(methods('g')[0].text,/3 rows totalled/);
  assert.equal(methods('o').length,0,'an output writes Results, not Methods');
  assert.equal(methods('t').filter(n=>n.fn==='method').length,0,'a source writes its source note, not a method note');
});
