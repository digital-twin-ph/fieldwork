import test from 'node:test';
import assert from 'node:assert/strict';
import {syncProjectManifest,assertProjectManifest} from '../build/project-manifest.js';
import {exampleWorkflow,validateWorkflow} from '../build/core.js';

test('project manifest inventories additions and removals and rejects stale saved inventories',()=>{
  const w=exampleWorkflow();syncProjectManifest(w);const first=structuredClone(w.manifest);assert.equal(first.inventory.nodes.length,w.nodes.length);
  syncProjectManifest(w);assert.deepEqual(w.manifest,first);
  w.nodes.push({id:'new-chart',type:'chart_output',x:0,y:0,params:{label:'Counts'}});assert.throws(()=>validateWorkflow(w),/manifest/);
  syncProjectManifest(w,true);assert.equal(w.manifest.revision,first.revision+1);assertProjectManifest(w);
  const source=w.nodes.find(n=>n.type==='observations');source.params.data.features.pop();assert.throws(()=>assertProjectManifest(w),/manifest/);syncProjectManifest(w,true);
  source.params.fields=[{key:'age',label:'Age',type:'integer'}];assert.throws(()=>assertProjectManifest(w),/manifest/);syncProjectManifest(w,true);
  w.edges.push({id:'counts',from:'criteria',to:'new-chart',port:'decisions'});assert.throws(()=>assertProjectManifest(w),/manifest/);syncProjectManifest(w,true);assert.deepEqual(validateWorkflow(w).manifest,w.manifest);
  w.nodes.pop();w.edges.pop();syncProjectManifest(w,true);assert.equal(w.manifest.inventory.nodes.length,first.inventory.nodes.length);
});

test('reference inventory tracks linked resources and deduplicates required PDF bytes',()=>{
  const w=exampleWorkflow(),ref={id:'pdf',kind:'pdf',filename:'source.pdf',sha256:'a'.repeat(64),bytes:42,mediaType:'application/pdf',title:'Source',role:'data',authors:'',published:'',locator:'',notes:'',addedAt:'2026-10-06T00:00:00.000Z',modifiedAt:'2026-10-06T00:00:00.000Z'};
  w.nodes[0].references=[ref];w.nodes[1].references=[structuredClone(ref)];syncProjectManifest(w);
  assert.equal(w.manifest.inventory.assets.length,1);assert.equal(w.manifest.inventory.assets[0].references.length,2);
  w.nodes[1].references=[];assert.throws(()=>assertProjectManifest(w),/manifest/);syncProjectManifest(w,true);assert.equal(w.manifest.inventory.assets[0].references.length,1);
  const {filename,sha256,bytes,mediaType,...metadata}=ref;w.nodes[1].references=[{...metadata,kind:'url',url:'https://example.org/census'}];syncProjectManifest(w,true);assert.equal(w.manifest.inventory.links[0].url,'https://example.org/census');
  assert.deepEqual(validateWorkflow(w).manifest,w.manifest);
});
