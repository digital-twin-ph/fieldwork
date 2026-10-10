import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateComposition,openInputs,detectDrift,expandComposition,STAGE_VERBS}
  from '../build/compositions.js';
import {executeWorkflow} from '../build/core.js';

const load=async()=>({
  composition:JSON.parse(await readFile('compositions/compute_walking_catchment/0.2.0.json','utf8')),
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
    /pins a digest that is not reachable_nodes 0\.3\.0's\. Re-pin it rather than editing the digest\./);
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
  band.releases.push({version:'0.4.0',path:'x',sha256:'1'.repeat(64)});
  band.currentVersion='0.4.0';
  const afterMove=detectDrift(composition,moved).find(d=>d.node==='band');
  assert.equal(afterMove.state,'moved');
  assert.match(afterMove.detail,/has moved from 0\.3\.0 to 0\.4\.0 since this composition pinned it/);

  // A published release edited underneath it.
  const rewritten=clone(registry);
  rewritten.widgets.find(w=>w.nodeType==='corridor'===undefined);
  const corridor=rewritten.widgets.find(w=>w.nodeType==='reachable_corridor');
  corridor.releases.find(r=>r.version==='0.2.0').sha256='2'.repeat(64);
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

  // The same street selection the Shapely parity check agreed with: 301 entered, 45 cut.
  const corridor=memberReceipts.find(r=>r.nodeId==='catchment-corridor');
  assert.match(corridor.facts,/fw:corridorCount 1/);
  assert.match(corridor.facts,/fw:enteredSegmentCount 301/);
  assert.match(corridor.facts,/fw:partialSegmentCount 45/);
  const snap=memberReceipts.find(r=>r.nodeId==='catchment-snap');
  assert.match(snap.facts,/fw:siteCount 1; fw:snappedNodeCount 1/);
  const reach=memberReceipts.find(r=>r.nodeId==='catchment-reach');
  assert.match(reach.facts,/fw:reachedNodeCount 706/,'the 15 minute traversal');
  const band=memberReceipts.find(r=>r.nodeId==='catchment-band');
  assert.match(band.facts,/fw:bandMinutes 5; fw:bandBudgetMetres 375\.00/);
  assert.match(band.facts,/fw:junctionsInBand 142/);
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
  assert.deepEqual(report.filter(d=>d.state!=='unchanged').map(d=>d.node),['band'],
    'only the member that moved');

  // And the shipped version, re-pinned, reports none.
  const current=JSON.parse(await readFile('compositions/compute_walking_catchment/0.2.0.json','utf8'));
  assert.deepEqual(detectDrift(current,registry).filter(d=>d.state!=='unchanged'),[]);
});
