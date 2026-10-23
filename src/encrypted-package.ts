import {ZipReader,ZipWriter,BlobReader,BlobWriter,Uint8ArrayReader} from '@zip.js/zip.js';
import type {FileEntry} from '@zip.js/zip.js';
import type {Workflow} from './types.js';
import {referencedPDFs,pdfDigest,MAX_BUNDLE_BYTES,MAX_PDF_BYTES,MAX_WORKFLOW_PDF_BYTES} from './evidence.js';
import {projectFiles,verifyProjectFile} from './project-files.js';
export {contentHash} from './project-files.js';
import {contentHash} from './project-files.js';
import {isRecord} from './guards.js';
import {assertProjectManifest,syncProjectManifest,sameProjectManifest} from './project-manifest.js';

/** What a workflow may weigh inside a package, and WHY the two directions differ.
 *
 *  One number did both jobs until 2026-10-20, and it was 5,000,000 bytes -- set when a workflow
 *  could not be much larger than that, because its payloads had to fit in a 5,226,496-byte
 *  localStorage. Payloads moved to IndexedDB that morning and a town-sized street network became
 *  possible: Bunia is an estimated 14.2 MB. The export cap then refused the very thing the storage
 *  work had just made downloadable. The practitioner: *"we are setting caps that have not met
 *  reality yet and this is a DE project to test the limits of browser based field operations."*
 *
 *  So they are two numbers now, because they protect against different things.
 *
 *  EXPORT protects nothing. The data is already in memory, already the practitioner's, and
 *  already on their machine; refusing to write it to a file they asked for is a cap on their own
 *  work. What limits it is what the browser can hold while serialising, encrypting and zipping,
 *  and the ceiling below is measured rather than assumed -- see docs/experiments/125.
 *
 *  IMPORT is a defence. A package arriving from elsewhere is untrusted, and a crafted ZIP that
 *  advertises a small compressed size and decompresses into gigabytes is the attack this guards.
 *  It is set at the export ceiling, so anything this application can write it can read back. */
const SCHEMA='fieldwork/encrypted-project/1';
/** THE WORKFLOW IS COMPRESSED BEFORE IT IS PACKAGED.
 *
 *  The practitioner, 2026-10-22, trying to take an encrypted backup of a province: *"So encrypted
 *  zip description is misleading. And I found another cap!"* -- being told their workflow was
 *  215.2 MB against a 64 MB package limit. Both halves of that were wrong. The entry is written
 *  with `level:0`, deliberately, so the package's bytes are reproducible: a ZIP that stores and
 *  does not deflate. So the limit was measured on bytes nothing was ever going to shrink, and the
 *  format's own compression had already been traded away for determinism.
 *
 *  Gzip gives the compression back without taking the determinism: a fixed input compresses to
 *  fixed bytes, and `level:0` still governs the archive. A street graph compresses about 25 to 1,
 *  so 215 MB becomes about 9 MB and the limit is no longer anywhere near. The number does not
 *  move, because the number was sound -- it was measuring the wrong thing. */
const WORKFLOW_EXPORT_LIMIT=64_000_000;
const WORKFLOW_IMPORT_LIMIT=64_000_000;
const MANIFEST_LIMIT=1_000_000;
const gzip=async(bytes:Uint8Array):Promise<Uint8Array<ArrayBuffer>>=>new Uint8Array(await new Response(
  new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
const gunzip=async(bytes:Uint8Array):Promise<Uint8Array<ArrayBuffer>>=>new Uint8Array(await new Response(
  new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
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
  const plainBytes=encoder.encode(JSON.stringify(workflow));
  const workflowBytes=await gzip(plainBytes);
  // Measured on what the package CARRIES, which is the compressed entry. The message says both,
  // because "215.2 MB" of a file that would have been written as 9 MB told a practitioner the
  // wrong thing about their own work.
  requireValue(workflowBytes.length<=WORKFLOW_EXPORT_LIMIT,
    `This workflow is ${(plainBytes.length/1e6).toFixed(1)} MB, and ${(workflowBytes.length/1e6).toFixed(1)} MB compressed, `
    +`more than the ${WORKFLOW_EXPORT_LIMIT/1e6} MB a package can carry. Export it as a workflow file instead, or cover a smaller area.`);
  const assets:Descriptor[]=[],entries=new Map<string,Uint8Array<ArrayBuffer>>([['workflow.json.gz',workflowBytes]]);
  for(const [hash,ref] of refs){const bytes=files.get(hash);requireValue(bytes&&bytes.length===ref.bytes,'PDF/raster missing or inconsistent with its reference.');await verifyProjectFile(ref,bytes);const path=`assets/${String(assets.length).padStart(4,'0')}.bin`;assets.push({path,bytes:bytes.length,sha256:hash,mediaType:ref.mediaType});entries.set(path,bytes);}
  const manifest=encoder.encode(JSON.stringify({schema:assets.some(a=>a.mediaType==='image/tiff')?'fieldwork/encrypted-project/2':SCHEMA,project:workflow.manifest,workflow:{path:'workflow.json.gz',bytes:workflowBytes.length,sha256:await contentHash(workflowBytes),mediaType:'application/gzip',plainBytes:plainBytes.length},assets}));
  requireValue(manifest.length<=MANIFEST_LIMIT,'Manifest exceeds the package limit.');
  const writer=new ZipWriter(new BlobWriter('application/zip'),{...options,password,zipCrypto:false,encryptionStrength:3,level:0,lastModDate:new Date(1980,0,1),extendedTimestamp:false});
  try{await writer.add('manifest.json',new Uint8ArrayReader(manifest));for(const [path,bytes] of entries)await writer.add(path,new Uint8ArrayReader(bytes));const blob=await writer.close();requireValue(blob.size<=MAX_BUNDLE_BYTES,`Package exceeds the ${(MAX_BUNDLE_BYTES/1e6).toFixed(0)} MB limit.`);return blob;}catch(error){try{await writer.close();}catch{/* Preserve original failure. */}throw error;}
}

/** Parse and verify completely before the caller writes anything to browser storage. */
export async function readEncryptedPackage(blob:Blob,password:string,validate:(value:unknown)=>Workflow):Promise<{workflow:Workflow;files:Map<string,Uint8Array<ArrayBuffer>>}>{
  requireValue(blob.size<=MAX_BUNDLE_BYTES,`Package exceeds the ${(MAX_BUNDLE_BYTES/1e6).toFixed(0)} MB limit.`);requireValue(password.length>0,'Enter the package passphrase.');
  const reader=new ZipReader(new BlobReader(blob),{...options,strictness:'strict',checkSignature:true,checkOverlappingEntry:true});
  try{
    const entries=new Map<string,FileEntry>();let advertised=0;
    for await(const entry of reader.getEntriesGenerator()){
      requireValue(entries.size<102&&!entry.directory&&!entries.has(entry.filename),'Unexpected or duplicate package entry.');
      requireValue(entry.filename==='manifest.json'||entry.filename==='workflow.json'||entry.filename==='workflow.json.gz'||/^assets\/[0-9]{4}\.bin$/.test(entry.filename),'Unexpected package path.');
      requireValue(entry.encrypted&&entry.extraFieldAES?.strength===3&&entry.extraFieldAES.vendorVersion===2&&entry.compressionMethod===0,'Package requires AES-256 AE-2 encrypted, uncompressed entries.');
      const cap=entry.filename==='manifest.json'?MANIFEST_LIMIT:entry.filename.startsWith('workflow.json')?WORKFLOW_IMPORT_LIMIT:MAX_PDF_BYTES;
      requireValue(Number.isSafeInteger(entry.uncompressedSize)&&entry.uncompressedSize<=cap,'Package entry exceeds its size limit.');
      advertised+=entry.uncompressedSize;requireValue(advertised<=MANIFEST_LIMIT+WORKFLOW_IMPORT_LIMIT+MAX_WORKFLOW_PDF_BYTES,'Package contents exceed the total limit.');entries.set(entry.filename,entry);
    }
    async function extract(path:string,limit:number):Promise<Uint8Array<ArrayBuffer>>{
      const entry=entries.get(path);requireValue(entry,'Missing package entry.');let size=0;const chunks:Uint8Array[]=[];
      await entry.getData(new WritableStream<Uint8Array>({write(chunk){size+=chunk.length;requireValue(size<=limit&&size<=entry.uncompressedSize,'Extracted entry exceeds its size limit.');chunks.push(chunk.slice());}}),{...options,password,checkSignature:true,checkOverlappingEntry:true});
      requireValue(size===entry.uncompressedSize,'Package entry length mismatch.');const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
    }
    const manifest:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await extract('manifest.json',MANIFEST_LIMIT)));
    requireValue(isRecord(manifest)&&[SCHEMA,'fieldwork/encrypted-project/2'].includes(String(manifest.schema))&&Array.isArray(manifest.assets),'Unsupported encrypted project manifest.');
    const workflowDescriptor=descriptor(manifest.workflow),assets=manifest.assets.map(descriptor);
    // A package written before 2026-10-22 carries workflow.json uncompressed; one written since
    // carries workflow.json.gz. Both are read, because a backup taken yesterday is still a backup.
    const compressed=workflowDescriptor.path==='workflow.json.gz';
    requireValue((compressed?workflowDescriptor.mediaType==='application/gzip':workflowDescriptor.mediaType==='application/json')
      &&(workflowDescriptor.path==='workflow.json'||compressed)&&workflowDescriptor.bytes<=WORKFLOW_IMPORT_LIMIT,'Invalid workflow descriptor.');
    const paths=new Set(['manifest.json',workflowDescriptor.path]),hashes=new Set<string>();let pdfBytes=0;
    for(const asset of assets){requireValue(/^assets\/[0-9]{4}\.bin$/.test(asset.path)&&!paths.has(asset.path)&&!hashes.has(asset.sha256)&&(asset.mediaType==='application/pdf'||manifest.schema==='fieldwork/encrypted-project/2'&&asset.mediaType==='image/tiff')&&asset.bytes<=MAX_PDF_BYTES,'Invalid PDF asset descriptor.');paths.add(asset.path);hashes.add(asset.sha256);pdfBytes+=asset.bytes;}
    requireValue(pdfBytes<=MAX_WORKFLOW_PDF_BYTES&&paths.size===entries.size&&[...paths].every(path=>entries.has(path)),'Package inventory does not match its manifest.');
    async function verified(item:Descriptor){const bytes=await extract(item.path,item.bytes);requireValue(bytes.length===item.bytes&&await contentHash(bytes)===item.sha256,'Package content digest mismatch.');return bytes;}
    // Decompressed only after its hash is verified, and bounded afterwards: a small entry that
    // expands without limit is the oldest trick an archive plays, and the epi-gis limits profile
    // names "expanded bytes and ratio" for exactly this. MAX_BUNDLE_BYTES is the same ceiling a
    // plain import is held to, so one number governs how much work may be read back in.
    const stored=await verified(workflowDescriptor);
    const workflowJSON=compressed?await gunzip(stored):stored;
    requireValue(workflowJSON.length<=MAX_BUNDLE_BYTES,
      `This package expands to ${(workflowJSON.length/1e6).toFixed(1)} MB, more than the `
      +`${MAX_BUNDLE_BYTES/1e6} MB that may be read back in.`);
    const raw:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(workflowJSON));
    requireValue(isRecord(raw)&&raw.manifest&&sameProjectManifest(raw.manifest,manifest.project),'Package project inventory does not match its workflow.');
    const workflow=validate(raw),refs=projectFiles(workflow),files=new Map<string,Uint8Array<ArrayBuffer>>();
    requireValue(refs.size===assets.length,'Package PDFs do not match workflow references.');
    for(const asset of assets){requireValue(refs.get(asset.sha256)?.bytes===asset.bytes&&refs.get(asset.sha256)?.mediaType===asset.mediaType,'Package PDF does not match its reference.');const bytes=await verified(asset);await verifyProjectFile(refs.get(asset.sha256)!,bytes);files.set(asset.sha256,bytes);}
    return {workflow,files};
  }finally{await reader.close();}
}
