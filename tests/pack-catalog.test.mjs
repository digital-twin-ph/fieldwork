import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Store,Parser} from 'n3';
import {PACK_CATALOG,packCatalogN3,HOST_REGISTRY} from '../build/pack-catalog.js';
import {canvasN3} from '../build/canvas-semantics.js';
import {TYPES,executeWorkflow} from '../build/core.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {runtimeSemanticWorkflow,readinessStub} from './fixtures/runtime-semantic-workflow.mjs';

const prefixes='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n';
const graphOf=text=>new Store(new Parser().parse(prefixes+text));
const catalogText=await readFile(new URL('../widgets/packs.json',import.meta.url),'utf8');

test('the build records the catalog it was built from, and the digest can be recomputed', () => {
  assert.equal(PACK_CATALOG.version,JSON.parse(catalogText).catalogVersion);
  assert.equal(PACK_CATALOG.digest,createHash('sha256').update(catalogText).digest('hex'));
  // A stale bundle is the failure this check exists for: editing the catalog without
  // rebuilding would leave a receipt naming a catalog that no longer matches the repository.
});

test('the recorded catalog conforms, and an incompletely identified one does not', async () => {
  assert.equal((await validateGraph(graphOf(packCatalogN3('r1')))).conforms,true);
  const noDigest='<urn:fieldwork:run:r1:pack-catalog> a fw:PackCatalog; fw:packCatalogVersion "0.1.2".\n';
  assert.equal((await validateGraph(graphOf(noDigest))).conforms,false);
  const badVersion=packCatalogN3('r1').replace(/"0\.\d+\.\d+"/,'"latest"');
  assert.equal((await validateGraph(graphOf(badVersion))).conforms,false);
});

test('every node type states that its definition came from the host registry', async () => {
  const workflow={nodes:Object.keys(TYPES).map(type=>({id:type,type,params:{},x:0,y:0})),edges:[]};
  const n3=canvasN3(workflow);
  const stated=[...n3.matchAll(/fw:widgetDefinitionSource "([^"]+)"/g)].map(m=>m[1]);
  assert.equal(stated.length,Object.keys(TYPES).length);
  assert.deepEqual([...new Set(stated)],[HOST_REGISTRY]);
  assert.equal((await validateGraph(new Store(new Parser().parse(n3)))).conforms,true);
});

test('a plan that does not state its source is refused, so silence cannot pass for host provenance', async () => {
  const workflow={nodes:[{id:'area',type:'area',params:{},x:0,y:0}],edges:[]};
  const silent=canvasN3(workflow).replace(/; fw:widgetDefinitionSource "[^"]+"/,'');
  assert.equal((await validateGraph(new Store(new Parser().parse(silent)))).conforms,false);
  const invented=canvasN3(workflow).replace(/fw:widgetDefinitionSource "[^"]+"/,'fw:widgetDefinitionSource "wherever"');
  assert.equal((await validateGraph(new Store(new Parser().parse(invented)))).conforms,false);
});

test('an executed run records the catalog once, beside its other recorded metadata', async () => {
  const run=await executeWorkflow(runtimeSemanticWorkflow(),readinessStub);
  const matches=[...run.provenanceN3.matchAll(/a fw:PackCatalog/g)];
  assert.equal(matches.length,1);
  assert.match(run.provenanceN3,new RegExp(`fw:packCatalogVersion "${PACK_CATALOG.version.replace(/\./g,'\\.')}"`));
  assert.match(run.provenanceN3,new RegExp(`<urn:fieldwork:run:${run.runId}:pack-catalog>`));
  // The catalog is recorded metadata, so it must not appear as an input any step consumed.
  assert.doesNotMatch(run.provenanceN3,/prov:used <urn:fieldwork:run:[^>]*:pack-catalog>/);
});
