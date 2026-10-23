import test from 'node:test';
import assert from 'node:assert/strict';
import {DataFactory,Store,Parser} from 'n3';
import {canvasN3} from '../build/canvas-semantics.js';
import {TYPES} from '../build/core.js';
import {executeWorkflow} from '../build/core.js';
import {auditRuntimeRun} from '../scripts/audit-runtime-n3.mjs';
import {validateGraph,summarize} from '../scripts/validate-ontology.mjs';
import {runtimeSemanticWorkflow,readinessStub} from './fixtures/runtime-semantic-workflow.mjs';
const {namedNode:n,literal:l}=DataFactory,fw='urn:fieldwork:',prov='http://www.w3.org/ns/prov#',qudt='http://qudt.org/schema/qudt/';
const run=await executeWorkflow(runtimeSemanticWorkflow(),readinessStub);
const audit=await auditRuntimeRun(run);

test('every catalog node type emits a SHACL-conforming draft plan, including incomplete widgets',async()=>{
  const workflow={nodes:Object.keys(TYPES).map(type=>({id:type,type,params:{},x:0,y:0})),edges:[]};
  const graph=new Store(new Parser().parse(canvasN3(workflow)));
  assert.equal((await validateGraph(graph)).conforms,true);
  workflow.edges.push({id:'broken',from:'absent',to:'area',port:'area'});
  assert.equal((await validateGraph(new Store(new Parser().parse(canvasN3(workflow))))).conforms,false);
});
test('uncited executed widgets bind plans and receipts to catalog identities and pass runtime SHACL',()=>{
  assert.equal(run.evidence.length,0);assert.equal(audit.summary.conforms,true,JSON.stringify(audit.summary));
  assert.match(run.provenanceN3,/fw:PointDataset/);assert.match(run.provenanceN3,/rdf:value 2/);
  const g=audit.graph,base=fw+'run:'+run.runId+':';
  for(const id of ['network','catchments','clip','summary'])assert.equal(g.getObjects(n(base+'output:'+id),n(prov+'wasGeneratedBy'),null).length,1);
  const source=g.getObjects(n(base+'output:catchments:cell:origin-t1'),n(fw+'sourceSite'),null)[0];assert.equal(source.value,base+'output:pumps:record:origin');
  // The clip intersects in longitude and latitude and projects nothing, so it states its frame
  // with the standard term and must claim no metric CRS. Until 2026-10-13 this line asserted
  // fw:computationCRS "OGC:CRS84" and then fw:metricCRS "OGC:CRS84": a geographic frame under a
  // predicate meaning projected. Checked here at the graph level as well as in the receipt,
  // because this is the form a reader's query actually sees.
  assert.equal(g.getObjects(n(base+'output:clip:activity'),n(fw+'metricCRS'),null).length,0);
  assert.equal(g.getObjects(n(base+'output:clip:activity'),n('http://purl.org/dc/terms/conformsTo'),null)[0].value,
    'http://www.opengis.net/def/crs/OGC/1.3/CRS84');
  // WHICH GRAPH, NOT THE GRAPH. Until 2026-10-23 this asserted the receipt carried an enumerated
  // edge, and the code carried every one: 711 MB of Turtle for a province, past the string a
  // browser will hold. The practitioner: "We don't use N3 represented graphs to compute on
  // graphs... But if we query which graph holds the data, we should be able to answer that in N3
  // as part of the receipts." So the receipt is asked for the network's identity instead.
  assert.equal(g.getObjects(n(base+'output:network'),n(fw+'networkNodeCount'),null).length,1,
    'the receipt says how many junctions the graph holds');
  assert.equal(g.getObjects(n(base+'output:network'),n(fw+'networkEdgeCount'),null).length,1,
    'and how many segments');
  assert.equal(g.getObjects(n(base+'output:network'),n(fw+'networkNode'),null).length,0,
    'and does not transcribe them');
});
test('runtime shapes reject missing widget, source identity, direction, units and graph endpoints',async()=>{
  const base=fw+'run:'+run.runId+':',remove=(g,s,p)=>g.removeQuads(g.getQuads(n(s),n(p),null,null));
  for(const [label,mutate] of [
    ['missing widget',g=>remove(g,base+'plan:catchments',fw+'widget')],
    ['missing source site',g=>remove(g,base+'output:catchments:cell:origin-t1',fw+'sourceSite')],
    // An edge that IS described must still be well formed: the shape did not become lenient,
    // it stopped demanding transcription. Asserted on a vertex and edge added here, because the
    // receipt no longer carries any of its own.
    ['malformed edge that is described',g=>{
      const edge=n(base+'output:network:edge:probe'),vertex=n(base+'output:network:node:probe');
      g.addQuad(n(base+'output:network'),n(fw+'networkEdge'),edge);
      g.addQuad(edge,n('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),n(fw+'NetworkEdge'));
      g.addQuad(edge,n(fw+'fromVertex'),vertex);
    }],
    ['network without a junction count',g=>remove(g,base+'output:network',fw+'networkNodeCount')],
    ['invalid direction',g=>{remove(g,base+'output:catchments:activity',fw+'travelDirection');g.addQuad(n(base+'output:catchments:activity'),n(fw+'travelDirection'),l('either'));}],
    ['wrong time unit',g=>{const q=g.getObjects(n(base+'output:catchments:activity'),n(fw+'timeBudget'),null)[0];g.removeQuads(g.getQuads(q,n(qudt+'unit'),null,null));g.addQuad(q,n(qudt+'unit'),n('http://qudt.org/vocab/unit/M'));}],
    ['duplicate generation',g=>g.addQuad(n(base+'output:catchments'),n(prov+'wasGeneratedBy'),n(base+'step:catchments'))],
  ]){const g=new Store([...audit.graph]);mutate(g);const report=await validateGraph(g);assert.equal(report.conforms,false,label+' '+JSON.stringify(summarize(report)));}
});
test('semantic audit detects tampered catalog bindings and independent run identities',async()=>{
  const changed=structuredClone(run);changed.provenanceN3=changed.provenanceN3.replace(/fw:catalogDigest "[a-f0-9]{64}"/,'fw:catalogDigest "'+ '0'.repeat(64)+'"');
  assert.equal((await auditRuntimeRun(changed)).summary.conforms,false);
  const other=await executeWorkflow(runtimeSemanticWorkflow(),readinessStub);assert.notEqual(other.runId,run.runId);assert.ok(!other.provenanceN3.includes(run.runId));
});
