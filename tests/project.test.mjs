import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILT_IN_PROJECTS,WORKFLOW_LABELS,projectOfWorkflow,projectById,multiWorkflowProjects,newProject,validateProject,siblingInputs,SHAREABLE_INPUT_TYPES,payloadDigest,dehydrateWorkflow,hydrateWorkflow} from '../build/project.js';

// The picker was a FOURTH copy of the example vocabulary -- the `exampleId` union, the deep-link
// allowlist, the options in index.html and the project registry -- and this test existed to keep
// the third from drifting from the fourth. Since 2026-10-20 the picker is built from the registry
// in renderProjectOptions, so there is no copy left to compare: the markup holds two empty
// selects. What remains comparable is the label map, which is still written by hand.
test('every workflow in a project has a label, and every label belongs to a project',()=>{
  for(const project of BUILT_IN_PROJECTS)
    for(const key of project.workflows)
      assert.ok(WORKFLOW_LABELS[key],`${project.id} lists ${key}, which has no label`);
  for(const key of Object.keys(WORKFLOW_LABELS)){
    if(key==='blank')continue; // a new empty canvas belongs to no investigation until one is created
    assert.ok(projectOfWorkflow(key),`${key} has a label and belongs to no project`);
  }
});

test('the picker is built rather than written, so the markup carries no example list',()=>{
  const indexHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(!indexHtml.includes('id="example-select"'),'the single picker is gone');
  assert.match(indexHtml,/<select id="project-select"[^>]*><\/select>/);
  assert.match(indexHtml,/<select id="workflow-select"[^>]*><\/select>/);
  for(const key of Object.keys(WORKFLOW_LABELS))
    assert.ok(!indexHtml.includes(`value="${key}"`),`index.html still names the workflow ${key}`);
});

test('no workflow is in two projects at once',()=>{
  const seen=new Map();
  for(const project of BUILT_IN_PROJECTS)for(const key of project.workflows){
    assert.equal(seen.get(key),undefined,`${key} is in both ${seen.get(key)} and ${project.id}`);
    seen.set(key,project.id);
  }
});

// The finding behind experiment 122: the single-workflow model was already wrong twice over.
test('two built-in projects hold more than one workflow',()=>{
  const many=multiWorkflowProjects();
  assert.deepEqual(many.map(p=>p.id).sort(),['cholera-london-1854','old-naledi']);
  assert.equal(projectById('cholera-london-1854').workflows.length,4);
  assert.equal(projectById('old-naledi').workflows.length,2);
  // All four Snow workflows ask about one outbreak, which is what makes them one project.
  assert.ok(projectById('cholera-london-1854').workflows.every(k=>k.startsWith('snow-')));
});

test('a created project gets a readable id, and a colliding name is numbered rather than refused',()=>{
  const first=newProject('1854 Cholera Outbreak in London','One outbreak.');
  assert.equal(first.id,'1854-cholera-outbreak-in-london');
  assert.deepEqual(first.workflows,[]);
  const second=newProject('Old Naledi','Same name as a built-in.',BUILT_IN_PROJECTS);
  assert.equal(second.id,'old-naledi-2');
  assert.equal(newProject('   ','').id,'project');
  assert.equal(newProject('   ','').name,'Untitled project');
});

test('a stored project is read defensively and duplicate workflows collapse',()=>{
  const sound={schema:'fieldwork/project/1',id:'p',name:'P',subject:'s',workflows:['p/w1','p/w1','p/w2']};
  assert.deepEqual(validateProject(sound).workflows,['p/w1','p/w2']);
  for(const bad of [null,{},{schema:'fieldwork/project/2',id:'p',name:'P',subject:'',workflows:[]},
    {schema:'fieldwork/project/1',id:'',name:'P',subject:'',workflows:[]},
    {schema:'fieldwork/project/1',id:'p',name:'P',subject:'',workflows:[1]},
    {schema:'fieldwork/project/1',id:'p',name:'P',subject:'',workflows:Array(51).fill('k')}])
    assert.throws(()=>validateProject(bad),/Project could not be read/);
});

// The practitioner's sequence, 2026-10-19, with the qualifier they sharpened: input widgets from
// other workflows FROM THE SAME PROJECT, and nothing at all when there is no other workflow.
test('sibling inputs come from the same project only, and there are none until a second workflow exists',()=>{
  const project={schema:'fieldwork/project/1',id:'soho',name:'Soho',subject:'',workflows:['soho/w1','soho/w2']};
  const other={schema:'fieldwork/project/1',id:'other',name:'Other',subject:'',workflows:['other/w1']};
  const saved={
    'soho/w1':{name:'Pump catchments',nodes:[
      {id:'deaths',type:'point_input',params:{label:'250 death locations',data:{type:'FeatureCollection',features:Array(250).fill({})}}},
      {id:'table',type:'table_input',params:{label:'Snow 1855 Table 1',data:{rows:Array(5).fill({})}}},
      {id:'area',type:'study_area',params:{label:'Soho reporting rectangle',geometry:{type:'Polygon',coordinates:[]}}},
      {id:'map',type:'map_output',params:{label:'Map'}}]},
    'soho/w2':{name:'Network reach',nodes:[{id:'net',type:'network_input',params:{label:'Soho OSM network',data:{nodes:Array(738).fill({}),edges:[]}}}]},
    'other/w1':{name:'Somewhere else',nodes:[{id:'p',type:'point_input',params:{label:'Not in this project',data:{type:'FeatureCollection',features:[]}}}]},
  };
  const projects=[project,other];

  // The first workflow of a project sees its sibling's shareable inputs -- and only those.
  const forW1=siblingInputs('soho/w1',projects,saved);
  assert.deepEqual(forW1.map(i=>i.label),['Soho OSM network']);
  assert.equal(forW1[0].records,738);
  assert.equal(forW1[0].workflowName,'Network reach');

  // Looking from w2: w1's point and table inputs, but NOT its study area and NOT its map output.
  const forW2=siblingInputs('soho/w2',projects,saved);
  assert.deepEqual(forW2.map(i=>i.type).sort(),['point_input','table_input']);
  assert.ok(!forW2.some(i=>i.type==='study_area'),'a drawn study area is a per-question decision, not a shared input');
  assert.equal(forW2.find(i=>i.type==='point_input').records,250);

  // Nothing from another project, however identical its widgets.
  assert.ok(!forW2.some(i=>i.workflowKey.startsWith('other/')),'another project is not a sibling');

  // The three states that yield nothing, all ordinary.
  assert.deepEqual(siblingInputs('other/w1',projects,saved),[],'the only workflow in a project has no sibling');
  assert.deepEqual(siblingInputs('unfiled/w1',projects,saved),[],'a workflow in no project has no sibling');
  assert.deepEqual(siblingInputs('soho/w1',[{...project,workflows:['soho/w1','soho/w3']}],saved),[],
    'a sibling that is listed but not saved contributes nothing');
});

test('a malformed sibling workflow is skipped rather than throwing',()=>{
  // The current workflow must itself be a member: "other workflows from the same project"
  // presupposes a project, so a non-member sees nothing however many siblings are stored.
  const project={schema:'fieldwork/project/1',id:'p',name:'P',subject:'',workflows:['p/w0','p/w1','p/w2','p/w3','p/w4']};
  const saved={'p/w1':{nodes:[{id:'a',type:'point_input',params:{data:{type:'FeatureCollection',features:[]}}}]},
    'p/w2':null,'p/w3':{nodes:'not an array'},'p/w4':{nodes:[null,'nope',{type:'point_input'}]}};
  assert.deepEqual(siblingInputs('p/w9',[project],saved),[],'a non-member sees nothing');
  const found=siblingInputs('p/w0',[project],saved);
  assert.equal(found.length,2);
  assert.equal(found[0].label,'point_input','a node with no label falls back to its type');
  assert.equal(found[0].records,0);
  assert.equal(found[1].records,null,'a node with no data reports no record count rather than zero');
});

// Phase two: one payload held once, referenced by the workflows that use it. The reference exists
// on disk and nowhere else -- a workflow in memory always carries its data, because
// validateWorkflow runs validateGeoJSON on every point input.
test('a referenced payload is dropped on the way out and put back on the way in',()=>{
  const payload={type:'FeatureCollection',features:[{id:'a'},{id:'b'}]};
  const workflow={schema:'fieldwork/workflow/1',name:'W',nodes:[
    {id:'shared',type:'point_input',params:{label:'Deaths',data:payload,dataRef:'abc123'}},
    {id:'own',type:'point_input',params:{label:'Pumps',data:{type:'FeatureCollection',features:[{id:'p'}]}}},
    {id:'area',type:'study_area',params:{label:'Soho',geometry:{type:'Polygon',coordinates:[]}}}],edges:[]};

  // The store has to SAY it holds the payload. Dehydrating against a store that does not is how
  // an imported project lost its data on the first save: the reference was written and the bytes
  // were not, and the next load refused the workflow.
  const held=digest=>digest==='abc123';
  assert.ok(dehydrateWorkflow(workflow).nodes[0].params.data,'nothing is stripped without a store to vouch for it');
  const stored=dehydrateWorkflow(workflow,held);
  assert.equal(stored.nodes[0].params.data,undefined,'a referenced payload the store holds is not written');
  assert.equal(stored.nodes[0].params.dataRef,'abc123','the reference is');
  assert.equal(stored.nodes[0].params.label,'Deaths','its own label survives — the geoprivacy case');
  assert.ok(stored.nodes[1].params.data,'an unreferenced payload is written inline');
  assert.ok(stored.nodes[2].params.geometry,'a drawn study area is untouched');
  assert.ok(workflow.nodes[0].params.data,'the workflow in memory keeps its payload');

  const back=hydrateWorkflow(stored,{abc123:payload});
  assert.deepEqual(back.nodes[0].params.data,payload);
  assert.equal(back.nodes[0].params.dataRef,'abc123');
});

test('a missing shared payload is refused rather than hydrated to nothing',()=>{
  const stored={schema:'fieldwork/workflow/1',name:'W',nodes:[
    {id:'shared',type:'point_input',params:{label:'Deaths',dataRef:'deadbeefcafe0000'}}],edges:[]};
  assert.throws(()=>hydrateWorkflow(stored,{}),/Shared input data is missing/,
    'an input that silently became zero records would run and give a clean, wrong answer');
  assert.throws(()=>hydrateWorkflow(stored,{}),/shared/i);
});

test('hydration can clone, so editing one workflow cannot reach the stored payload',()=>{
  const payload={type:'FeatureCollection',features:[{id:'a'}]};
  const datasets={d1:payload};
  const stored={schema:'fieldwork/workflow/1',name:'W',nodes:[{id:'n',type:'point_input',params:{label:'L',dataRef:'d1'}}],edges:[]};
  const shared=hydrateWorkflow(stored,datasets);
  assert.equal(shared.nodes[0].params.data,payload,'a read-only copy shares the reference');
  const owned=hydrateWorkflow(stored,datasets,true);
  assert.notEqual(owned.nodes[0].params.data,payload,'the edited copy does not');
  assert.deepEqual(owned.nodes[0].params.data,payload);
  owned.nodes[0].params.data.features.push({id:'b'});
  assert.equal(payload.features.length,1,'the dataset store is unchanged');
});

test('a payload digest is stable across structured clones and differs with content',async()=>{
  const payload={type:'FeatureCollection',features:[{id:'a',properties:{DEATHS:3}}]};
  const a=await payloadDigest(payload);
  const b=await payloadDigest(structuredClone(payload));
  assert.equal(a,b,'several workflows holding clones of one imported file agree');
  assert.equal(a.length,64);
  const c=await payloadDigest({...payload,features:[{id:'a',properties:{DEATHS:4}}]});
  assert.notEqual(a,c);
});
