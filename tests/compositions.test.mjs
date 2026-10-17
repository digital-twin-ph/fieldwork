import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateComposition,openInputs,detectDrift,expandComposition,STAGE_VERBS}
  from '../build/compositions.js';
import {executeWorkflow} from '../build/core.js';

const load=async()=>({
  composition:JSON.parse(await readFile('compositions/compute_walking_catchment/0.5.0.json','utf8')),
  registry:JSON.parse(await readFile('widgets/registry.json','utf8'))});
const clone=o=>structuredClone(o);

test('the shipped composition validates against the live registry',async()=>{
  const {composition,registry}=await load();
  validateComposition(composition,registry);
  assert.equal(composition.governance.status,'private','not admitted to the palette');
  assert.ok(STAGE_VERBS.includes(composition.stage));
});

test('its public ports are checked against the graph, not taken on trust',async()=>{
  const {composition,registry}=await load();
  // Four member inputs are open; two public ports serve them, the network fanning out.
  assert.deepEqual(openInputs(composition).map(o=>`${o.node}.${o.port}`),
    ['snap.sites','snap.network','reach.network','corridor.network']);
  assert.deepEqual(composition.ports.inputs.map(p=>p.name),['sites','network']);

  const missing=clone(composition);
  missing.ports.inputs[1].members=missing.ports.inputs[1].members.slice(0,1);
  assert.throws(()=>validateComposition(missing,registry),
    /reach's network input is open and no public port serves it, so the composition could never run/);

  const overreach=clone(composition);
  overreach.ports.inputs[0].members.push({node:'reach',port:'sites'});
  assert.throws(()=>validateComposition(overreach,registry),
    /maps to reach:sites, which is not an open input\. An internal edge already fills it\./);

  const mistyped=clone(composition);
  mistyped.ports.inputs[0].type='polygons';
  assert.throws(()=>validateComposition(mistyped,registry),/declared polygons but snap:sites takes points/);
});

test('only registry widgets may be members, pinned to a published digest',async()=>{
  const {composition,registry}=await load();
  const invented=clone(composition);
  invented.members[0].type='summarise_walking';
  assert.throws(()=>validateComposition(invented,registry),
    /is not a registered widget\. A composition may contain only widgets the registry governs\./);

  const unpublished=clone(composition);
  unpublished.members[1].version='9.9.9';
  assert.throws(()=>validateComposition(unpublished,registry),
    /pins reachable_nodes 9\.9\.9, which the registry does not list/);

  const tampered=clone(composition);
  tampered.members[1].sha256='0'.repeat(64);
  assert.throws(()=>validateComposition(tampered,registry),
    /pins a digest that is not reachable_nodes 0\.5\.0's\. Re-pin it rather than editing the digest\./);
});

test('the name asserts the stage, and the stage cannot contradict it',async()=>{
  const {composition,registry}=await load();
  const freeVerb=clone(composition);
  freeVerb.nodeType='draw_walking_catchment';
  assert.throws(()=>validateComposition(freeVerb,registry),
    /starts with "draw", which is not a stage verb/);

  const contradiction=clone(composition);
  contradiction.stage='summarise';
  assert.throws(()=>validateComposition(contradiction,registry),
    /names the stage "compute" but declares "summarise"\. The name is the assertion/);

  const stolen=clone(composition);
  stolen.nodeType='summarize_hull';
  assert.throws(()=>validateComposition(stolen,registry),/is already a widget node type/);
});

test('a parameter cannot be both fixed and exposed',async()=>{
  const {composition,registry}=await load();
  const both=clone(composition);
  both.members[3].fixed={bufferM:25};
  assert.throws(()=>validateComposition(both,registry),
    /corridor:bufferM is both fixed and exposed as bufferM\. Choose one\./);
});

test('drift is reported per member, naming where it moved',async()=>{
  const {composition,registry}=await load();
  assert.deepEqual(detectDrift(composition,registry).map(d=>d.state),
    ['unchanged','unchanged','unchanged','unchanged']);

  // A member publishing a new version: pinned release still exists, but is no longer current.
  const moved=clone(registry);
  const band=moved.widgets.find(w=>w.nodeType==='travel_time_band');
  band.releases.push({version:'0.5.0',path:'x',sha256:'1'.repeat(64)});
  band.currentVersion='0.5.0';
  const afterMove=detectDrift(composition,moved).find(d=>d.node==='band');
  assert.equal(afterMove.state,'moved');
  assert.match(afterMove.detail,/has moved from 0\.3\.0 to 0\.5\.0 since this composition pinned it/);

  // A published release edited underneath it.
  const rewritten=clone(registry);
  rewritten.widgets.find(w=>w.nodeType==='corridor'===undefined);
  const corridor=rewritten.widgets.find(w=>w.nodeType==='reachable_corridor');
  corridor.releases.find(r=>r.version==='0.3.0').sha256='2'.repeat(64);
  const afterEdit=detectDrift(composition,rewritten).find(d=>d.node==='corridor');
  assert.equal(afterEdit.state,'moved');
  assert.match(afterEdit.detail,/no longer has the digest this composition pinned, so that release changed/);

  // A member removed outright.
  const removed=clone(registry);
  removed.widgets=removed.widgets.filter(w=>w.nodeType!=='snap_to_network');
  const afterRemoval=detectDrift(composition,removed).find(d=>d.node==='snap');
  assert.equal(afterRemoval.state,'gone');
  assert.match(afterRemoval.detail,/no longer in the registry\. Anything this composition did with it cannot be reproduced\./);
});

test('expanding it needs every public parameter',async()=>{
  const {composition}=await load();
  assert.throws(()=>expandComposition(composition,'c1',{zone:30}),
    /compute_walking_catchment needs a value for hemisphere/);
});

test('run as one step it gives the hand-built chain, and one receipt per member',async()=>{
  const {composition,registry}=await load();
  validateComposition(composition,registry);
  const {johnSnowExample}=await import('../build/john-snow.js');
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input');
  const pumps=example.nodes.find(n=>n.id==='pumps');

  const expanded=expandComposition(composition,'catchment',{zone:30,hemisphere:'north',
    maxSnapM:100,travelMode:'walking',speedMPerMin:75,direction:'outbound',
    traversalMinutes:15,minutes:5,bufferM:25});
  assert.equal(expanded.nodes.length,4,'four members become four nodes');

  // The composition's open ports are wired to the sources the canvas already holds.
  const map={id:'catchment-map',type:'map_output',x:900,y:0,
    params:{label:'Walking catchment',inputMode:'polygons'}};
  const workflow={schema:'fieldwork/workflow/1',
    nodes:[structuredClone(pumps),structuredClone(network),...expanded.nodes,map],
    edges:[...expanded.edges,...expanded.inputs.map((input,i)=>({id:`feed-${i}`,
      from:input.port==='sites'?pumps.id:network.id,to:input.node,port:input.memberPort})),
      {id:'to-map',from:expanded.output,to:map.id,port:'polygons'}]};
  const run=await executeWorkflow(workflow,async()=>[]);

  // D8 in experiment 75: a composition must not emit one receipt claiming its members' work.
  const memberReceipts=run.receipts.filter(r=>expanded.nodes.some(n=>n.id===r.nodeId));
  assert.equal(memberReceipts.length,4,'one receipt per member, not one for the composition');
  assert.deepEqual(memberReceipts.map(r=>r.nodeId.replace('catchment-','')).sort(),
    ['band','corridor','reach','snap']);
  for(const receipt of memberReceipts)
    assert.ok(receipt.facts.includes('prov:used'),`${receipt.nodeId} records what it used`);

  // The street selection, re-measured on 2026-10-14 when D1 began to be charged: 283 entered and
  // 38 cut, from 301 and 45. The budget now pays for the 10.91 m walk from the pump to its
  // junction before any street is walked, so fewer streets fall inside it. The shrink is the
  // result, not a regression -- and lab check 08 agreed with Shapely on the OLD selection, so its
  // fixture is now of a corridor this build no longer produces. Recorded in experiment 114.
  const corridor=memberReceipts.find(r=>r.nodeId==='catchment-corridor');
  assert.match(corridor.facts,/fw:corridorCount 1/);
  assert.match(corridor.facts,/fw:enteredSegmentCount 283/);
  assert.match(corridor.facts,/fw:partialSegmentCount 38/);
  const snap=memberReceipts.find(r=>r.nodeId==='catchment-snap');
  assert.match(snap.facts,/fw:siteCount 1; fw:snappedNodeCount 1/);
  const reach=memberReceipts.find(r=>r.nodeId==='catchment-reach');
  assert.match(reach.facts,/fw:reachedNodeCount 706/,'the 15 minute traversal');
  const band=memberReceipts.find(r=>r.nodeId==='catchment-band');
  assert.match(band.facts,/fw:bandMinutes 5; fw:bandBudgetMetres 375\.00/);
  // 142 junctions until 2026-10-14, 134 now: the five-minute band pays for the 10.91 m walk onto
  // the network before any street, so eight junctions it used to reach fall outside the budget.
  assert.match(band.facts,/fw:junctionsInBand 134/);
  assert.ok(run.outputs.length>=1,'the corridor reached a map');
});

test('a member publishing a new release makes a pinned composition report drift',async()=>{
  // The cascade the ontology coupling exists to produce: travel_time_band 0.3.0 records
  // the fw: terms it asserts, which is a release, which is drift for anything pinning
  // 0.2.0. Kept as a fixture so the report stays exercised rather than remembered.
  const drifted=JSON.parse(await readFile('tests/fixtures/drifted-composition-2026-10-10.json','utf8'));
  const {registry}=await load();
  validateComposition(drifted,registry);   // still valid: the pinned release still exists
  const report=detectDrift(drifted,registry);
  const band=report.find(d=>d.node==='band');
  assert.equal(band.state,'moved');
  assert.equal(band.pinnedVersion,'0.2.0');
  assert.equal(band.currentVersion,'0.3.0');
  assert.match(band.detail,/Read that release's changes before trusting the result/);
  // When this fixture was made only `band` had moved. By 2026-10-14 the other three had
  // published too -- D1 charged, the snap limit marking instead of refusing, D3 modelled -- so
  // the same fixture now reports four. That growth is the point of keeping it: a composition
  // pinned four days ago is further from the build every time a member changes, and the report
  // says so by name. The single-member case is covered above against a cloned registry.
  assert.deepEqual(report.filter(d=>d.state!=='unchanged').map(d=>d.node),
    ['snap','reach','band','corridor']);

  // And the shipped version, re-pinned, reports none.
  const current=JSON.parse(await readFile('compositions/compute_walking_catchment/0.5.0.json','utf8'));
  assert.deepEqual(detectDrift(current,registry).filter(d=>d.state!=='unchanged'),[]);
});

test('as one node on a canvas it runs, and still emits one receipt per member',async()=>{
  // The whole point: the canvas holds one node, the executor sees four, and the numbers are
  // the ones the Validation Lab checked against NetworkX and GEOS.
  const {expandMicroWorkflows}=await import('../build/compositions.js');
  const {resolveComposition}=await import('../build/composition-registry.js');
  const {executeWorkflow,validateWorkflow,nodeInputs,outputOf}=await import('../build/core.js');
  const {johnSnowExample}=await import('../build/john-snow.js');
  const {composition}=await load();

  const example=johnSnowExample('snow-isochrone');
  const pumps=example.nodes.find(n=>n.id==='pumps'),network=example.nodes.find(n=>n.type==='network_input');
  const host={id:'catchment',type:'micro_workflow',x:400,y:40,params:{
    label:'Walking catchment',
    composition:{id:composition.id,nodeType:composition.nodeType,version:composition.version,
      title:composition.title,stage:composition.stage,
      inputs:composition.ports.inputs.map(p=>[p.name,p.type]),output:composition.ports.output.type},
    parameters:{zone:30,hemisphere:'north',maxSnapM:100,travelMode:'walking',speedMPerMin:75,
      direction:'outbound',traversalMinutes:15,minutes:5,bufferM:25}}};
  const map={id:'map',type:'map_output',x:700,y:40,params:{label:'Catchment',inputMode:'polygons'}};
  const authored={schema:'fieldwork/workflow/1',
    nodes:[structuredClone(pumps),structuredClone(network),host,map],
    edges:[{id:'p',from:pumps.id,to:host.id,port:'sites'},
      {id:'n',from:network.id,to:host.id,port:'network'},
      {id:'m',from:host.id,to:map.id,port:'polygons'}]};

  // The authored graph is four nodes, and its ports come from the pinned contract.
  const valid=validateWorkflow(structuredClone(authored));
  assert.equal(valid.nodes.length,4,'the canvas holds one node for the composition');
  assert.deepEqual(nodeInputs(host).map(([p])=>p),['sites','network']);
  assert.equal(outputOf(host),'polygons');

  // Expansion turns it into the members, fanning the network out to three of them.
  const {workflow:expanded,receipts:arrangement}=expandMicroWorkflows(
    structuredClone(authored),resolveComposition,'run');
  assert.equal(expanded.nodes.length,7,'two sources, four members, one map');
  assert.equal(expanded.edges.filter(e=>e.from===network.id).length,3,'the network feeds three steps');
  assert.ok(!expanded.nodes.some(n=>n.type==='micro_workflow'),'no composition node survives');
  // One record of the arrangement, which claims no computation.
  assert.equal(arrangement.length,1);
  assert.match(arrangement[0].facts,/a prov:Plan, fw:MicroWorkflow/);
  assert.match(arrangement[0].facts,/fw:compositionVersion "0\.5\.0"/);
  assert.match(arrangement[0].facts,/fw:claimsNoComputation true/);
  assert.match(arrangement[0].facts,/fw:governanceStatus "private"/);
  assert.equal((arrangement[0].facts.match(/fw:memberOf/g)||[]).length,4,'each member is associated');

  const run=await executeWorkflow(structuredClone(authored),async()=>[]);
  const members=run.receipts.filter(r=>r.nodeId.startsWith('catchment-'));
  assert.equal(members.length,4,'one receipt per member, not one for the composition');
  // And the arrangement, which is a fifth receipt about the plan rather than the work.
  const plan=run.receipts.find(r=>r.nodeId==='catchment');
  assert.ok(plan,'the expansion is recorded');
  assert.match(plan.facts,/fw:compositionId "urn:fieldwork:composition:compute_walking_catchment"/);
  assert.match(plan.facts,/fw:parameterValue "75"/,'the speed it was run with');
  assert.match(plan.method,/states the association only/);
  const corridor=members.find(r=>r.nodeId==='catchment-corridor');
  assert.match(corridor.facts,/fw:enteredSegmentCount 283/);
  assert.match(corridor.facts,/fw:partialSegmentCount 38/);
  assert.match(members.find(r=>r.nodeId==='catchment-band').facts,/fw:junctionsInBand 134/);
  assert.ok(run.outputs.length>=1,'the result reached the map');
});

test('a pinned composition this build does not carry fails by name',async()=>{
  const {expandMicroWorkflows}=await import('../build/compositions.js');
  const {resolveComposition}=await import('../build/composition-registry.js');
  const {composition}=await load();
  const host=version=>({id:'h',type:'micro_workflow',x:0,y:0,params:{label:'x',
    composition:{id:composition.id,nodeType:composition.nodeType,version,title:composition.title,
      stage:composition.stage,inputs:[['sites','points']],output:'polygons'},parameters:{}}});
  assert.throws(()=>expandMicroWorkflows({schema:'fieldwork/workflow/1',nodes:[host('9.9.9')],edges:[]},
    resolveComposition,'run'),/version 9\.9\.9, and this build carries 0\.5\.0/);
  const absent={...host('0.2.0')};
  absent.params.composition.id='urn:fieldwork:composition:summarize_nothing';
  assert.throws(()=>expandMicroWorkflows({schema:'fieldwork/workflow/1',nodes:[absent],edges:[]},
    resolveComposition,'run'),/which this build does not carry\. Nothing it did can be reproduced here\./);
});

test('an unconfigured micro-workflow has no ports, and a malformed pin is refused',async()=>{
  const {validateWorkflow,nodeInputs,outputOf}=await import('../build/core.js');
  const bare={id:'h',type:'micro_workflow',x:0,y:0,params:{label:'Unconfigured'}};
  assert.deepEqual(nodeInputs(bare),[]);
  assert.equal(outputOf(bare),null);
  const workflow=p=>({schema:'fieldwork/workflow/1',
    nodes:[{id:'h',type:'micro_workflow',x:0,y:0,params:{label:'x',...p}},
      {id:'m',type:'map_output',x:1,y:1,params:{label:'m',inputMode:'polygons'}}],edges:[]});
  assert.throws(()=>validateWorkflow(workflow({composition:{id:'not-a-urn',version:'0.2.0'},parameters:{}})),
    /names a composition by id and version/);
  assert.throws(()=>validateWorkflow(workflow({
    composition:{id:'urn:fieldwork:composition:compute_walking_catchment',nodeType:'x',version:'0.2.0',
      title:'T',stage:'compute',inputs:[],output:'polygons'},parameters:{}})),
    /pins no ports, so nothing could connect to it/);
  assert.throws(()=>validateWorkflow(workflow({
    composition:{id:'urn:fieldwork:composition:compute_walking_catchment',nodeType:'x',version:'0.2.0',
      title:'T',stage:'compute',inputs:[['sites','points']],output:'polygons'},
    parameters:{zone:{nested:true}}})),/zone must be a single value/);
});
