import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {referenceURL,validateReferences,pdfDigest,encodeFile,decodeFile,MAX_PDF_BYTES,evidenceProvenance} from '../build/evidence.js';
import {importWorkflowDocument} from '../build/evidence-storage.js';
import {validateWorkflow,executeWorkflow,exampleWorkflow} from '../build/core.js';
const reference=(overrides={})=>({id:'census',kind:'url',title:'Annual census',role:'data',url:'https://example.org/census/2022',authors:'Census office',published:'2022',locator:'Table 4, p. 27',notes:'Denominator for sampling',addedAt:'2026-10-06T12:00:00.000Z',modifiedAt:'2026-10-06T12:00:00.000Z',...overrides});
const pdf=()=>new TextEncoder().encode('%PDF-1.4\nSynthetic regression fixture\n%%EOF');

test('citation metadata and safe URLs validate without changing legacy workflows',()=>{
  assert.equal(referenceURL('https://example.org/census'), 'https://example.org/census');
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///private','https://name:password@example.org','https://example.org/<x>','https://example.org/a b'])assert.throws(()=>referenceURL(url));
  const workflow=exampleWorkflow(),legacy=validateWorkflow(workflow);assert.equal(legacy.nodes[0].references,undefined);
  workflow.nodes[0].references=[reference()];assert.deepEqual(validateWorkflow(workflow).nodes[0].references,[reference()]);
  for(const fields of [{title:''},{role:'verified'},{modifiedAt:'2026-02-30T12:00:00.000Z'},{modifiedAt:'2020-10-06T12:00:00.000Z'},{kind:'text'},{notes:'x'.repeat(2001)}])assert.throws(()=>validateReferences([reference(fields)]));
  assert.throws(()=>validateReferences([reference(),reference()]),/duplicate/);
  assert.throws(()=>validateReferences(Array.from({length:21},(_,i)=>reference({id:'r'+i}))),/20/);
});

test('PDF fingerprint and base64 round trip preserve exact bytes and enforce bounded input',async()=>{
  const bytes=pdf();assert.equal(await pdfDigest(bytes),createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(decodeFile(encodeFile(bytes)),bytes);
  await assert.rejects(pdfDigest(new TextEncoder().encode('<html>not a PDF')),/PDF/);
  await assert.rejects(pdfDigest(new Uint8Array(MAX_PDF_BYTES+1)),/5 MB/);
  assert.throws(()=>decodeFile('not base64'),/encoding/);
});

test('workflow reference limits count unique PDFs and reject conflicting metadata',()=>{
  const w=exampleWorkflow(),ref=reference({kind:'pdf',filename:'census.pdf',sha256:'a'.repeat(64),bytes:4_000_000,mediaType:'application/pdf'});
  w.nodes[0].references=[ref];w.nodes[1].references=[ref];assert.doesNotThrow(()=>validateWorkflow(w));
  w.nodes[1].references=[{...ref,bytes:3_000_000}];assert.throws(()=>validateWorkflow(w),/Conflicting/);
  w.nodes[1].references=[{...ref,sha256:'b'.repeat(64)}];w.nodes[2].references=[{...ref,sha256:'c'.repeat(64)}];assert.throws(()=>validateWorkflow(w),/10 MB/);
});

test('run evidence snapshots citations and records lineage without injecting citations into rule premises',async()=>{
  const w=exampleWorkflow();w.nodes[0].references=[reference({title:'Census "quote"\nnew line'})];w.nodes.find(n=>n.type==='policy').references=[reference({id:'method',role:'method'})];
  const inputs=[];
  const result=await executeWorkflow(w,async input=>{inputs.push(input);return w.nodes[0].params.data.features.map(f=>({subject:'urn:fieldwork:place:'+f.id,predicate:'urn:fieldwork:decision',object:'urn:fieldwork:Unknown'}));});
  assert.equal(result.evidence.length,2);assert.equal(result.receipts[0].references[0].role,'method');
  assert.match(result.provenanceN3,/dcterms:references/);assert.match(result.provenanceN3,/prov:used/);assert.match(result.provenanceN3,/fw:MethodReference/);
  assert.match(result.provenanceN3,/Census \\"quote\\"\\nnew line/);
  assert.ok(inputs.every(input=>!input.includes('example.org')&&!input.includes('dcterms:references')));
  w.nodes[0].references[0].title='Changed later';assert.notEqual(result.evidence[0].references[0].title,'Changed later');
  const other=evidenceProvenance(w.nodes,w.edges,'different-run');assert.ok(other.provenanceN3.includes('run:different-run:reference:neighborhoods:census'));
});

test('bundles reject altered, missing, duplicate and unreferenced PDFs before opening storage',async()=>{
  const w=exampleWorkflow(),bytes=pdf(),sha256=await pdfDigest(bytes);
  w.nodes[0].references=[reference({kind:'pdf',filename:'census.pdf',sha256,bytes:bytes.length,mediaType:'application/pdf'})];
  const attachment={sha256,bytes:bytes.length,dataBase64:encodeFile(bytes)};
  const changed=bytes.slice();changed[10]^=1;
  for(const attachments of [[],[attachment,attachment],[{...attachment,sha256:'b'.repeat(64)}],[{...attachment,dataBase64:encodeFile(changed)}]])await assert.rejects(importWorkflowDocument({schema:'fieldwork/bundle/1',workflow:w,attachments},validateWorkflow),/PDF|checksum/);
  assert.equal((await importWorkflowDocument(exampleWorkflow(),validateWorkflow)).schema,'fieldwork/workflow/1');
});
