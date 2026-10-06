import {ZipReader,ZipWriter,BlobReader,BlobWriter,Uint8ArrayReader} from '@zip.js/zip.js';
import type {FileEntry} from '@zip.js/zip.js';
import type {Workflow} from './types.js';
import {referencedPDFs,pdfDigest,MAX_BUNDLE_BYTES,MAX_PDF_BYTES,MAX_WORKFLOW_PDF_BYTES} from './evidence.js';
import {projectFiles,verifyProjectFile} from './project-files.js';
export {contentHash} from './project-files.js';
import {contentHash} from './project-files.js';
import {isRecord} from './guards.js';
import {assertProjectManifest,syncProjectManifest,sameProjectManifest} from './project-manifest.js';

const SCHEMA='fieldwork/encrypted-project/1',WORKFLOW_LIMIT=5_000_000,MANIFEST_LIMIT=1_000_000;
const encoder=new TextEncoder();
const options={useWebWorkers:false,useCompressionStream:true};
function requireValue(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
interface Descriptor {path:string;bytes:number;sha256:string;mediaType:string}
function descriptor(value:unknown):Descriptor{
  requireValue(isRecord(value)&&typeof value.path==='string'&&Number.isSafeInteger(value.bytes)&&Number(value.bytes)>=0&&typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256)&&typeof value.mediaType==='string','Invalid package manifest descriptor.');
  return value as unknown as Descriptor;
}
export async function createEncryptedPackage(workflow:Workflow,files:Map<string,Uint8Array<ArrayBuffer>>,password:string):Promise<Blob>{
  requireValue(password.length>=12,'Use a passphrase of at least 12 characters.');
  assertProjectManifest(workflow);workflow=structuredClone(workflow);syncProjectManifest(workflow);
  const refs=projectFiles(workflow);requireValue(files.size===refs.size,'Package must include every referenced PDF.');
  const workflowBytes=encoder.encode(JSON.stringify(workflow));requireValue(workflowBytes.length<=WORKFLOW_LIMIT,'Workflow exceeds the 5 MB package limit.');
  const assets:Descriptor[]=[],entries=new Map<string,Uint8Array<ArrayBuffer>>([['workflow.json',workflowBytes]]);
  for(const [hash,ref] of refs){const bytes=files.get(hash);requireValue(bytes&&bytes.length===ref.bytes,'PDF/raster missing or inconsistent with its reference.');await verifyProjectFile(ref,bytes);const path=`assets/${String(assets.length).padStart(4,'0')}.bin`;assets.push({path,bytes:bytes.length,sha256:hash,mediaType:ref.mediaType});entries.set(path,bytes);}
  const manifest=encoder.encode(JSON.stringify({schema:assets.some(a=>a.mediaType==='image/tiff')?'fieldwork/encrypted-project/2':SCHEMA,project:workflow.manifest,workflow:{path:'workflow.json',bytes:workflowBytes.length,sha256:await contentHash(workflowBytes),mediaType:'application/json'},assets}));
  requireValue(manifest.length<=MANIFEST_LIMIT,'Manifest exceeds the package limit.');
  const writer=new ZipWriter(new BlobWriter('application/zip'),{...options,password,zipCrypto:false,encryptionStrength:3,level:0,lastModDate:new Date(1980,0,1),extendedTimestamp:false});
  try{await writer.add('manifest.json',new Uint8ArrayReader(manifest));for(const [path,bytes] of entries)await writer.add(path,new Uint8ArrayReader(bytes));const blob=await writer.close();requireValue(blob.size<=MAX_BUNDLE_BYTES,'Package exceeds the 20 MB limit.');return blob;}catch(error){try{await writer.close();}catch{/* Preserve original failure. */}throw error;}
}

/** Parse and verify completely before the caller writes anything to browser storage. */
export async function readEncryptedPackage(blob:Blob,password:string,validate:(value:unknown)=>Workflow):Promise<{workflow:Workflow;files:Map<string,Uint8Array<ArrayBuffer>>}>{
  requireValue(blob.size<=MAX_BUNDLE_BYTES,'Package exceeds the 20 MB limit.');requireValue(password.length>0,'Enter the package passphrase.');
  const reader=new ZipReader(new BlobReader(blob),{...options,strictness:'strict',checkSignature:true,checkOverlappingEntry:true});
  try{
    const entries=new Map<string,FileEntry>();let advertised=0;
    for await(const entry of reader.getEntriesGenerator()){
      requireValue(entries.size<102&&!entry.directory&&!entries.has(entry.filename),'Unexpected or duplicate package entry.');
      requireValue(entry.filename==='manifest.json'||entry.filename==='workflow.json'||/^assets\/[0-9]{4}\.bin$/.test(entry.filename),'Unexpected package path.');
      requireValue(entry.encrypted&&entry.extraFieldAES?.strength===3&&entry.extraFieldAES.vendorVersion===2&&entry.compressionMethod===0,'Package requires AES-256 AE-2 encrypted, uncompressed entries.');
      const cap=entry.filename==='manifest.json'?MANIFEST_LIMIT:entry.filename==='workflow.json'?WORKFLOW_LIMIT:MAX_PDF_BYTES;
      requireValue(Number.isSafeInteger(entry.uncompressedSize)&&entry.uncompressedSize<=cap,'Package entry exceeds its size limit.');
      advertised+=entry.uncompressedSize;requireValue(advertised<=MANIFEST_LIMIT+WORKFLOW_LIMIT+MAX_WORKFLOW_PDF_BYTES,'Package contents exceed the total limit.');entries.set(entry.filename,entry);
    }
    async function extract(path:string,limit:number):Promise<Uint8Array<ArrayBuffer>>{
      const entry=entries.get(path);requireValue(entry,'Missing package entry.');let size=0;const chunks:Uint8Array[]=[];
      await entry.getData(new WritableStream<Uint8Array>({write(chunk){size+=chunk.length;requireValue(size<=limit&&size<=entry.uncompressedSize,'Extracted entry exceeds its size limit.');chunks.push(chunk.slice());}}),{...options,password,checkSignature:true,checkOverlappingEntry:true});
      requireValue(size===entry.uncompressedSize,'Package entry length mismatch.');const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
    }
    const manifest:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await extract('manifest.json',MANIFEST_LIMIT)));
    requireValue(isRecord(manifest)&&[SCHEMA,'fieldwork/encrypted-project/2'].includes(String(manifest.schema))&&Array.isArray(manifest.assets),'Unsupported encrypted project manifest.');
    const workflowDescriptor=descriptor(manifest.workflow),assets=manifest.assets.map(descriptor);
    requireValue(workflowDescriptor.path==='workflow.json'&&workflowDescriptor.mediaType==='application/json'&&workflowDescriptor.bytes<=WORKFLOW_LIMIT,'Invalid workflow descriptor.');
    const paths=new Set(['manifest.json','workflow.json']),hashes=new Set<string>();let pdfBytes=0;
    for(const asset of assets){requireValue(/^assets\/[0-9]{4}\.bin$/.test(asset.path)&&!paths.has(asset.path)&&!hashes.has(asset.sha256)&&(asset.mediaType==='application/pdf'||manifest.schema==='fieldwork/encrypted-project/2'&&asset.mediaType==='image/tiff')&&asset.bytes<=MAX_PDF_BYTES,'Invalid PDF asset descriptor.');paths.add(asset.path);hashes.add(asset.sha256);pdfBytes+=asset.bytes;}
    requireValue(pdfBytes<=MAX_WORKFLOW_PDF_BYTES&&paths.size===entries.size&&[...paths].every(path=>entries.has(path)),'Package inventory does not match its manifest.');
    async function verified(item:Descriptor){const bytes=await extract(item.path,item.bytes);requireValue(bytes.length===item.bytes&&await contentHash(bytes)===item.sha256,'Package content digest mismatch.');return bytes;}
    const raw:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await verified(workflowDescriptor)));
    requireValue(isRecord(raw)&&raw.manifest&&sameProjectManifest(raw.manifest,manifest.project),'Package project inventory does not match its workflow.');
    const workflow=validate(raw),refs=projectFiles(workflow),files=new Map<string,Uint8Array<ArrayBuffer>>();
    requireValue(refs.size===assets.length,'Package PDFs do not match workflow references.');
    for(const asset of assets){requireValue(refs.get(asset.sha256)?.bytes===asset.bytes&&refs.get(asset.sha256)?.mediaType===asset.mediaType,'Package PDF does not match its reference.');const bytes=await verified(asset);await verifyProjectFile(refs.get(asset.sha256)!,bytes);files.set(asset.sha256,bytes);}
    return {workflow,files};
  }finally{await reader.close();}
}
