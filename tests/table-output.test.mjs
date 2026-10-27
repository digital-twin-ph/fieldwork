import test from 'node:test';
import assert from 'node:assert/strict';
import {clipExercise} from '../build/clip-points.js';
import {newTableOutput,tableOutput,pointTableMarkup} from '../build/table-output.js';
import {executeWorkflow,executionPlan,validateWorkflow,nodeInputs,shownMode} from '../build/core.js';

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
  // EVERY PORT A TABLE CAN SHOW, ON EVERY TABLE. They used to appear and disappear with an
  // `inputMode` parameter, so the port a connection needed might not exist on the node.
  assert.deepEqual(nodeInputs(w.nodes[1]),
    [['points','points'],['coverage','coverage-check'],['table','table'],
     ['polygons','polygons'],['decisions','decisions']]);
  // And it insists on none of them: a view with nothing wired is unfinished, not failed, which
  // is what `incomplete-workflow` reports. It used to throw "needs its points input connected",
  // which with every port declared would have demanded four unrelated inputs at once.
  w.edges=[];assert.deepEqual(executionPlan(w).length>0,true);
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
  assert.match(next.head,/field14/);assert.match(next.body,/&lt;script&gt;/);assert.match(next.body,/<td>false<\/td>/);assert.match(next.body,/<td>0<\/td>/);
  // `false` and `0` are VALUES and are drawn; an absent cell is not, and says which kind of
  // absence it is. It used to read "Not supplied", which a reader could not tell from data.
  assert.doesNotMatch(next.body,/Not supplied/);
  assert.match(next.body,/data-absent="empty"/);
  const search=pointTableMarkup(output,esc,{query:'alert(1)'});assert.equal((search.body.match(/data-place=/g)||[]).length,1);assert.match(search.body,/Visit 104/);
  assert.match(pointTableMarkup(output,esc,{query:'not-a-record'}).body,/No matching records/);
  assert.match(pointTableMarkup({rows:[]},esc).body,/No point records/);
});

/* ---- a table shows what it is wired, with nothing set first ----
 *
 *  The practitioner, 2026-10-27, trying to view the output of Relate a column: "I tried to view
 *  the output from relate table in table output widget but it won't connect. There is something
 *  wrong there." A freshly added table defaulted to points, so the `table` port did not exist on
 *  the node and the edge was refused -- the blocker `output-mode-set-before-the-shape-arrives`,
 *  removed from `map_output` on 2026-10-15 under `a-map-has-layers-not-modes` and left here.
 */
test('a freshly added table accepts a table, with no mode set first',()=>{
  const fresh=newTableOutput();
  assert.equal(fresh.params.inputMode,undefined,'nothing writes a mode any more');
  const ports=nodeInputs({...fresh,id:'t',x:0,y:0});
  assert.ok(ports.some(([port,type])=>port==='table'&&type==='table'),
    'the table port exists on a node nobody has configured');
});

test('the renderer is read from what is wired, and the stored mode only as a fallback',()=>{
  const node={...newTableOutput(),id:'t',x:0,y:0};
  const wire=port=>[{to:'t',port}];
  assert.equal(shownMode(node,wire('table')),'table');
  assert.equal(shownMode(node,wire('polygons')),'polygons');
  assert.equal(shownMode(node,wire('decisions')),'decisions');
  assert.equal(shownMode(node,wire('points')),'spatial');
  assert.equal(shownMode(node,[]),'spatial','nothing wired is the general path, not a failure');
  // A workflow saved before this opens and shows what it showed.
  const saved={...node,params:{...node.params,inputMode:'decisions'}};
  assert.equal(shownMode(saved,[]),'decisions');
  // But a connection beats the stored mode, so a saved node is not stuck in it.
  assert.equal(shownMode(saved,wire('table')),'table');
});

test('a table port and a points port coexist, so neither excludes the other',()=>{
  const node={...newTableOutput(),id:'t',x:0,y:0};
  const ports=nodeInputs(node).map(([port])=>port);
  for(const port of ['points','coverage','table','polygons','decisions'])
    assert.ok(ports.includes(port),`${port} is always offered`);
  // Specificity decides which renderer runs when more than one is wired.
  assert.equal(shownMode(node,[{to:'t',port:'points'},{to:'t',port:'table'}]),'table');
});
