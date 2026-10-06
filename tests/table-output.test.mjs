import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageExercise} from '../build/spatial-coverage.js';
import {newTableOutput,tableOutput,pointTableMarkup} from '../build/table-output.js';
import {executeWorkflow,executionPlan,validateWorkflow,nodeInputs} from '../build/core.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function directWorkflow(){const w=coverageExercise();w.nodes=[w.nodes[1],{...newTableOutput(),id:'table',x:350,y:50}];w.edges=[{id:'points',from:'observations',to:'table',port:'points'}];return w;}

test('Table executes point data without a study area or invented review decisions',async()=>{
  const w=directWorkflow();Object.assign(w.nodes[0].params.data.features[0].properties,{count:0,confirmed:false,notes:null});const before=structuredClone(w);
  const result=await executeWorkflow(w,async()=>{throw new Error('Direct table must not require inference');});
  const table=result.outputs[0];assert.equal(table.view,'table');assert.equal(table.kind,'point-table');assert.equal(table.rows.length,4);
  assert.equal(table.rows[3].coordinates,null);assert.equal(table.rows[2].decision,undefined);
  assert.deepEqual(w,before);assert.equal(table.rows[0].attributes.count,0);assert.equal(table.rows[0].attributes.confirmed,false);
  assert.equal(table.spatialReference.geometryCRS,'OGC:CRS84');
  assert.match(result.receipts[0].facts,/fw:TableView/);assert.match(result.receipts[0].facts,/geo:wktLiteral/);
  assert.deepEqual(nodeInputs(w.nodes[1]),[['points','points'],['coverage','coverage-check']]);
  w.edges=[];assert.throws(()=>executionPlan(w),/points input connected/);
});

test('Table retains coverage decisions and source identity without mutating or filtering reviewed data',()=>{
  const coverage={kind:'spatial-coverage',checkNodeId:'coverage',pointLayers:[{sourceNodeId:'observations',label:'Visits',count:2}],rows:[{id:'a',excluded:true,decision:'Excluded',exclusionReason:'Verified error'},{id:'b',decision:'Review',coordinates:null}],measurement:{squareMetres:40},canProceed:false};
  const {value,receipt}=tableOutput({...newTableOutput(),id:'table'},{coverage},'run');
  assert.deepEqual(value,{...coverage,pointTable:true});value.rows[0].excluded=false;assert.equal(coverage.rows[0].excluded,true);
  assert.match(receipt.facts,/prov:wasInformedBy <urn:fieldwork:run:run:coverage:coverage>/);
  const w=coverageExercise();w.nodes.push({...newTableOutput(),id:'table',x:0,y:0});w.edges.push({id:'reviewed',from:'coverage',to:'table',port:'coverage'});
  assert.doesNotThrow(()=>executionPlan(w));w.edges.push({id:'mixed',from:'observations',to:'table',port:'points'});assert.throws(()=>validateWorkflow(w),/either a coverage check/);
});

test('Table combines layers with duplicate record IDs while preserving attributes',async()=>{
  const w=directWorkflow(),second=structuredClone(w.nodes[0]);second.id='second';second.params.label='Second layer';w.nodes.push(second);w.nodes[1].params.pointInputCount=2;
  w.edges.push({id:'second',from:'second',to:'table',port:'points_2'});
  const table=(await executeWorkflow(w,async()=>[])).outputs[0];assert.equal(table.rows.length,8);assert.equal(new Set(table.rows.map(r=>r.id)).size,8);
  assert.equal(table.rows.filter(r=>r.recordId==='inside').length,2);assert.equal(table.rows[4].sourceNodeId,'second');
  w.edges.at(-1).from='observations';assert.throws(()=>validateWorkflow(w),/once per operation/);
});

test('Table paging and search include off-page rows and attributes and escape user content',()=>{
  const rows=Array.from({length:105},(_,i)=>({id:`r${i}`,recordId:`r${i}`,name:`Visit ${i}`,layerLabel:'Visits',sourceNodeId:'source',coordinates:null,attributes:{...Object.fromEntries(Array.from({length:15},(_,n)=>[`field${n}`,n])),notes:i===104?'<script>alert(1)</script>':null,confirmed:false,count:0}}));
  const output={kind:'point-table',rows},first=pointTableMarkup(output,esc);
  assert.equal((first.body.match(/data-place=/g)||[]).length,100);assert.match(first.controls,/1–100 of 105/);assert.doesNotMatch(first.head,/field14/);
  const next=pointTableMarkup(output,esc,{page:1,attributePage:1});assert.equal((next.body.match(/data-place=/g)||[]).length,5);
  assert.match(next.head,/field14/);assert.match(next.body,/&lt;script&gt;/);assert.match(next.body,/<td>false<\/td>/);assert.match(next.body,/<td>0<\/td>/);assert.match(next.body,/Not supplied/);
  const search=pointTableMarkup(output,esc,{query:'alert(1)'});assert.equal((search.body.match(/data-place=/g)||[]).length,1);assert.match(search.body,/Visit 104/);
  assert.match(pointTableMarkup(output,esc,{query:'not-a-record'}).body,/No matching records/);
  assert.match(pointTableMarkup({rows:[]},esc).body,/No point records/);
});
