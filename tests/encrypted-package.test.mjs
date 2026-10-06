import test from 'node:test';
import assert from 'node:assert/strict';
import {ZipReader,ZipWriter,BlobReader,BlobWriter,Uint8ArrayReader} from '@zip.js/zip.js';
import {createEncryptedPackage,readEncryptedPackage,contentHash} from '../build/encrypted-package.js';
import {exampleWorkflow,validateWorkflow} from '../build/core.js';
import {syncProjectManifest} from '../build/project-manifest.js';
const password='a long test passphrase 🔐',pdf=new TextEncoder().encode('%PDF-1.4\nSynthetic private reference\n%%EOF');
async function fixture(){const workflow=exampleWorkflow(),hash=await contentHash(pdf),ref={id:'census',kind:'pdf',filename:'private-census.pdf',sha256:hash,bytes:pdf.length,mediaType:'application/pdf',title:'Private annual census',role:'data',authors:'',published:'',locator:'',notes:'',addedAt:'2026-10-06T00:00:00.000Z',modifiedAt:'2026-10-06T00:00:00.000Z'};workflow.nodes[0].references=[ref];workflow.nodes[1].references=[structuredClone(ref)];return {workflow,files:new Map([[hash,pdf]])};}
async function unpack(blob){const reader=new ZipReader(new BlobReader(blob),{useWebWorkers:false});try{const items=[];for(const entry of await reader.getEntries())items.push([entry.filename,new Uint8Array(await entry.arrayBuffer({password,useWebWorkers:false}))]);return items;}finally{await reader.close();}}
async function repack(items,options={}){const writer=new ZipWriter(new BlobWriter(),{password,encryptionStrength:3,zipCrypto:false,level:0,useWebWorkers:false,...options});for(const [path,bytes] of items)await writer.add(path,new Uint8ArrayReader(bytes));return writer.close();}

test('encrypted project round trips workflow and deduplicated binary PDFs without plaintext metadata',async()=>{
  const {workflow,files}=await fixture();syncProjectManifest(workflow);const before=structuredClone(workflow),zip=await createEncryptedPackage(workflow,files,password),other=await createEncryptedPackage(workflow,files,password);
  assert.notDeepEqual(new Uint8Array(await zip.arrayBuffer()),new Uint8Array(await other.arrayBuffer()));
  const raw=new TextDecoder().decode(await zip.arrayBuffer());for(const secret of ['private-census.pdf','Private annual census','Heat outreach','Synthetic private reference'])assert.ok(!raw.includes(secret));
  assert.equal((await unpack(zip)).length,3);const result=await readEncryptedPackage(zip,password,validateWorkflow);
  assert.deepEqual(result.workflow,validateWorkflow(workflow));assert.deepEqual(result.files,files);assert.deepEqual(workflow,before);
  const empty=exampleWorkflow();assert.equal((await readEncryptedPackage(await createEncryptedPackage(empty,new Map(),password),password,validateWorkflow)).files.size,0);
});

test('wrong passwords, truncated or altered ciphertext fail before workflow validation',async()=>{
  const {workflow,files}=await fixture(),zip=await createEncryptedPackage(workflow,files,password);let calls=0;const validate=value=>{calls++;return validateWorkflow(value);};
  await assert.rejects(()=>readEncryptedPackage(zip,'wrong password',validate));assert.equal(calls,0);
  await assert.rejects(()=>readEncryptedPackage(zip.slice(0,zip.size-20),password,validate));
  const bytes=new Uint8Array(await zip.arrayBuffer()),view=new DataView(bytes.buffer),offset=30+view.getUint16(26,true)+view.getUint16(28,true)+24;bytes[offset]^=1;
  await assert.rejects(()=>readEncryptedPackage(new Blob([bytes]),password,validate));assert.equal(calls,0);
});

test('inventory, digest and PDF reference checks reject authenticated but inconsistent packages',async()=>{
  const {workflow,files}=await fixture(),items=await unpack(await createEncryptedPackage(workflow,files,password));
  await assert.rejects(()=>readEncryptedPackage(new Blob(['not a ZIP']),password,validateWorkflow));
  for(const mutated of [items.slice(0,2),[...items,['unexpected.bin',pdf]],items.map(([path,bytes])=>[path,path.startsWith('assets/')?new TextEncoder().encode('%PDF-wrong'):bytes])]){
    const zip=await repack(mutated);await assert.rejects(()=>readEncryptedPackage(zip,password,validateWorkflow));
  }
  const manifest=JSON.parse(new TextDecoder().decode(items[0][1]));manifest.assets[0].sha256='0'.repeat(64);
  const zip=await repack([['manifest.json',new TextEncoder().encode(JSON.stringify(manifest))],...items.slice(1)]);await assert.rejects(()=>readEncryptedPackage(zip,password,validateWorkflow));
  const original=await createEncryptedPackage(workflow,files,password);
  // ZIP names are public and are not covered by entry-content authentication.
  // Reject duplicate/traversal names independently of password validation.
  for(const [from,to] of [['workflow.json','manifest.json'],['assets/0000.bin','../bad/0000.bin']]){
    const bytes=Buffer.from(await original.arrayBuffer());for(let i=bytes.indexOf(from);i!==-1;i=bytes.indexOf(from,i+to.length))bytes.write(to,i);
    await assert.rejects(()=>readEncryptedPackage(new Blob([bytes]),password,validateWorkflow));
  }
});

test('unencrypted, weak-encryption and compressed archives are outside the profile',async()=>{
  const {workflow,files}=await fixture(),items=await unpack(await createEncryptedPackage(workflow,files,password));
  for(const options of [{password:undefined},{zipCrypto:true},{encryptionStrength:1},{level:6}]){const zip=await repack(items,options);await assert.rejects(()=>readEncryptedPackage(zip,password,validateWorkflow),/AES-256/);}
});

test('resource limits and export completeness are enforced',async()=>{
  const {workflow,files}=await fixture();await assert.rejects(()=>createEncryptedPackage(workflow,files,'short'),/12 characters/);
  await assert.rejects(()=>createEncryptedPackage(workflow,new Map(),password),/every referenced PDF/);
  await assert.rejects(()=>readEncryptedPackage(new Blob([new Uint8Array(20_000_001)]),password,validateWorkflow),/20 MB/);
  const writer=new ZipWriter(new BlobWriter(),{password,encryptionStrength:3,level:0,useWebWorkers:false});await writer.add('manifest.json',new Uint8ArrayReader(new Uint8Array(1_000_001)));
  const oversized=await writer.close();await assert.rejects(()=>readEncryptedPackage(oversized,password,validateWorkflow),/size limit/);
});
