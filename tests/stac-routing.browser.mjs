import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {DataFactory} from 'n3';
import {ontologyFiles,exampleFiles,loadGraph,validateGraph,summarize} from '../scripts/validate-ontology.mjs';
const files=[...ontologyFiles,...exampleFiles,'ontology/rules/processing-routing.n3','ontology/rules/jurisdiction-selection.n3'];
const input=(await Promise.all(files.map(f=>readFile(f,'utf8')))).join('\n');
const ex='urn:fieldwork:example:stac:',fw='urn:fieldwork:';
async function reason(page,data){await page.goto('/?example=blank');return page.evaluate(input=>new Promise((resolve,reject)=>{const worker=new Worker('./build/reasoning-worker.js');worker.onmessage=({data})=>{worker.terminate();data.error?reject(new Error(data.error)):resolve(data.quads);};worker.onerror=e=>{worker.terminate();reject(new Error(e.message));};worker.postMessage({id:1,input});}),data);}
const candidates=(q,id)=>q.filter(t=>t.subject===ex+id&&t.predicate===fw+'candidateOperation').map(t=>t.object).sort();

test('EYE routes STAC and generic acquisitions to shared readers and adds a GADM adapter only for its profile',async({page})=>{
  const q=await reason(page,input);
  expect(candidates(q,'readA')).toEqual([fw+'GeoJSONReader']);expect(candidates(q,'readB')).toEqual([fw+'GeoJSONReader']);
  expect(candidates(q,'processA')).toEqual([fw+'PolygonAreaRoutine','urn:fieldwork:gadm:NormalizeJurisdictions']);expect(candidates(q,'processB')).toEqual([fw+'PolygonAreaRoutine']);
  const graph=await loadGraph([...ontologyFiles,...exampleFiles]);const {namedNode:n,blankNode:b,literal:l}=DataFactory;
  for(const t of q){const s=t.subjectType==='BlankNode'?b(t.subject):n(t.subject);const o=t.objectType==='Literal'?l(t.object,t.language||n(t.datatype||'http://www.w3.org/2001/XMLSchema#string')):t.objectType==='BlankNode'?b(t.object):n(t.object);graph.addQuad(s,n(t.predicate),o);}
  const report=await validateGraph(graph,{postSelection:true});expect(report.conforms,JSON.stringify(summarize(report))).toBe(true);
});
test('routing refuses unavailable bytes and a mismatched inspection; a STAC media type never substitutes for inspection',async({page})=>{
  const unavailable=await reason(page,input.replace('sample:fileA fw:localAvailable true.','sample:fileA fw:localAvailable false.'));
  expect(candidates(unavailable,'readA')).toEqual([]);expect(candidates(unavailable,'readB')).toEqual([fw+'GeoJSONReader']);
  const mismatch=await reason(page,input.replace('ex:inspectionA a fw:AssetInspection; fw:inspectedAsset sample:fileA;','ex:inspectionA a fw:AssetInspection; fw:inspectedAsset sample:fileB;'));
  expect(candidates(mismatch,'readA')).toEqual([]);
  const metadataOnly=await reason(page,input+'\nex:metadataOnly a fw:RoutingRequest; fw:routingInput ex:asset.');
  expect(candidates(metadataOnly,'metadataOnly')).toEqual([]);
  expect(metadataOnly.some(t=>t.predicate===fw+'executionReady'||t.predicate===fw+'localAvailable')).toBe(false);
});
