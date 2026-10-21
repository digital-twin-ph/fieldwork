import test from 'node:test';
import assert from 'node:assert/strict';
import {clipExercise} from '../build/clip-points.js';
import {newTableOutput,tableOutput,pointTableMarkup} from '../build/table-output.js';
import {executeWorkflow,executionPlan,validateWorkflow,nodeInputs} from '../build/core.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function directWorkflow(){const w=clipExercise();w.nodes=[w.nodes[1],{...newTableOutput(),id:'table',x:350,y:50}];w.edges=[{id:'points',from:'observations',to:'table',port:'points'}];return w;}

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

test('a saved table fed by a coverage check opens as one fed by a clip',()=>{
  // `coverage_check` was retired on 2026-10-21. It had its own result kind, which a table copied
  // through with its review decisions and exclusion reasons; a table now receives points like
  // everything else. What this pins is that a workflow saved under the old contract still opens:
  // the node becomes a clip, and the edge that fed the table's `coverage` port becomes a points
  // edge rather than a connection to a port that no longer exists.
  const saved={schema:'fieldwork/workflow/1',id:'w',label:'Saved',nodes:[
    {id:'scope',type:'study_area',x:0,y:0,params:{source:'drawn',label:'Area',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[25.89,-24.7],[25.91,-24.7],[25.91,-24.68],[25.89,-24.68],[25.89,-24.7]]]}}},
    {id:'observations',type:'point_input',x:0,y:0,params:{label:'Records',data:{type:'FeatureCollection',features:[]}}},
    {id:'coverage',type:'coverage_check',x:0,y:0,params:{label:'Check spatial coverage',
      exclusions:[{sourceNodeId:'observations',featureId:'a',signature:'sig',reason:'Verified error'}]}},
    {id:'table',type:'table_output',x:0,y:0,params:{label:'Table'}},
  ],edges:[
    {id:'e1',from:'scope',to:'coverage',port:'area'},{id:'e2',from:'observations',to:'coverage',port:'points'},
    {id:'e3',from:'coverage',to:'table',port:'coverage'},
  ]};
  const opened=validateWorkflow(saved);
  const migrated=opened.nodes.find(n=>n.id==='coverage');
  assert.equal(migrated.type,'clip_points_to_area');
  assert.equal(migrated.sourceMigration.fromType,'coverage_check');
  assert.equal(opened.edges.find(e=>e.id==='e3').port,'points');
  // A table has no area port, so nothing is added for it; a map in the same position gets one.
  // The judgement could not be translated, so it is carried rather than dropped.
  assert.equal(migrated.sourceMigration.carriedExclusions.length,1);
  assert.equal(migrated.sourceMigration.carriedExclusions[0].reason,'Verified error');
  assert.equal(migrated.params.exclusions,undefined);
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
