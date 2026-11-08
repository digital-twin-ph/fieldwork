import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {runInThisContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {executeWorkflow,validateWorkflow} from '../build/core.js';

/** APPLY RULESET GIVES WHAT DERIVE A VALUE GAVE (experiment 188, stage 5). Before Derive a value was retired, every
 *  output of the four published workflows that used it was run and its rows recorded as a digest, in
 *  tests/fixtures/derive-retired.json. Those workflows now compute the same values with Apply ruleset, one rule for
 *  every record; each output must give the same rows, in the same order, as Derive a value did. */
const root=new URL('../',import.meta.url);
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('vendor/eye-21.1.24.js',root),'utf8'),{filename:'eye.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));
const fixture=JSON.parse(readFileSync(new URL('fixtures/derive-retired.json',import.meta.url),'utf8'));
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const projects=new Map();
const projectOf=repo=>{
  if(!projects.has(repo)){const file=new URL(`../../${repo}/fieldwork-project.json.gz`,import.meta.url);
    projects.set(repo,existsSync(file)?JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')):null);}
  return projects.get(repo);
};

test('the four workflows Derive a value was in are all recorded',()=>{
  assert.equal(fixture.workflows.length,4,'three South London workflows and Nigeria');
  assert.equal(fixture.workflows.reduce((n,w)=>n+Object.keys(w.outputs).length,0),9,'nine outputs among them');
});

for(const {repo,workflow:name,outputs} of fixture.workflows)
  test(`${repo}: "${name}" gives Derive a value's rows through Apply ruleset`,{skip:projectOf(repo)?false:`${repo} is not checked out beside this repository.`},async()=>{
    const project=projectOf(repo);
    const workflow=project.workflows.map(w=>w.document.workflow??w.document).find(w=>w.name===name);
    assert.ok(workflow,`"${name}" is in the project`);
    assert.ok(!workflow.nodes.some(n=>n.type==='derive_value'),'no Derive a value step is left');
    assert.ok(workflow.nodes.some(n=>n.type==='apply_ruleset'&&n.params.authored?.rules.some(r=>r.then.some(c=>c.compute))),
      'an Apply ruleset step computes the value');
    const w=structuredClone(workflow);delete w.manifest;
    const run=await executeWorkflow(validateWorkflow(w),reason);
    const now=Object.fromEntries(run.outputs.map(o=>[o.nodeId,{rows:o.rows?.length??null,sha256:digest(o.rows??o)}]));
    assert.deepEqual(now,outputs,'every output, row for row');
  });

/** A SAVED WORKFLOW WITH A DERIVE A VALUE STEP opens with it migrated: the same rule, stamped, its units asked for. */
test('a saved Derive a value step opens as Apply ruleset, stamped, and asks for its units',async()=>{
  const rows=[['Southwark',40046,1263],['Lambeth',26107,98]].flatMap(([supplier,houses,deaths])=>[
    {key:{supplier,measure:'houses'},value:houses},{key:{supplier,measure:'deaths'},value:deaths}]);
  const data={kind:'data-table',keys:['supplier','measure'],valueField:'count',rows,rowCount:rows.length,missingValueCount:0};
  const saved={schema:'fieldwork/workflow/1',name:'Table IX',nodes:[
    {id:'t',type:'table_input',x:0,y:0,params:{label:'Table IX',keys:['supplier','measure'],valueField:'count',data,
      wide:{keys:['supplier'],valueFields:['houses','deaths'],measureKey:'measure'}}},
    {id:'d',type:'derive_value',x:0,y:0,params:{label:'Houses without a death',keyColumn:'measure',left:'houses',
      operator:'minus',right:'deaths',name:'houses without a death'}},
    {id:'o',type:'table_output',x:0,y:0,params:{label:'Out',inputMode:'table'}}],
    edges:[{id:'e1',from:'t',to:'d',port:'records'},{id:'e2',from:'d',to:'o',port:'table'}]};
  const w=validateWorkflow(saved);
  const step=w.nodes.find(n=>n.id==='d');
  assert.equal(step.type,'apply_ruleset');
  assert.deepEqual(step.sourceMigration,{fromType:'derive_value',version:'1'});
  assert.equal(step.params.authored.rules[0].then[0].column,'houses without a death');
  assert.equal(w.edges.find(e=>e.to==='d').port,'projections');
  // No unit was recorded, so the step does not run until the practitioner states them.
  const run=await executeWorkflow(w,reason).catch(error=>({error}));
  const said=run.error?.message??run.unfinished?.find(u=>u.nodeId==='d')?.message??'';
  assert.match(said,/houses is a number and states no unit/);
  // Stated, it gives Derive a value's rows: houses minus deaths, one per supplier, after the table's own.
  for(const f of step.params.authored.fields){f.unit='http://qudt.org/vocab/unit/NUM';f.unitLabel=f.attribute;}
  const out=(await executeWorkflow(w,reason)).outputs.find(o=>o.nodeId==='o').rows;
  assert.deepEqual(out.slice(-2).map(r=>[r.key.supplier,r.key.measure,r.value]),
    [['Southwark','houses without a death',38783],['Lambeth','houses without a death',26009]]);
});
