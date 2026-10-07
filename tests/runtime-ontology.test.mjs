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
  assert.equal(g.getObjects(n(base+'output:clip:activity'),n(fw+'computationCRS'),null)[0].value,'OGC:CRS84');
  assert.equal(g.getObjects(n(base+'output:network'),n(fw+'networkEdge'),null).length,1);
});
test('runtime shapes reject missing widget, source identity, direction, units and graph endpoints',async()=>{
  const base=fw+'run:'+run.runId+':',remove=(g,s,p)=>g.removeQuads(g.getQuads(n(s),n(p),null,null));
  for(const [label,mutate] of [
    ['missing widget',g=>remove(g,base+'plan:catchments',fw+'widget')],
    ['missing source site',g=>remove(g,base+'output:catchments:cell:origin-t1',fw+'sourceSite')],
    ['missing edge endpoint',g=>remove(g,base+'output:network:edge:0',fw+'toVertex')],
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
