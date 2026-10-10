import type {Workflow} from './types.js';
import type {EvidenceBundle,EvidenceFile,EvidenceReference} from './evidence.js';
import {decodeFile,encodeFile,pdfDigest,referencedPDFs,MAX_PDF_BYTES} from './evidence.js';
import {projectFiles,verifyProjectFile} from './project-files.js';
import type {ProjectFile} from './project-files.js';
import {isRecord} from './guards.js';
import {assertProjectManifest,syncProjectManifest} from './project-manifest.js';

const DATABASE='fieldwork-evidence-v1',STORE='pdfs';
function openDatabase():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('Local PDF storage is unavailable. Your reference has not been saved.'));
    request.onblocked=()=>reject(new Error('Close other Fieldwork tabs and retry local PDF storage.'));
  });
}
// Stored as bytes, not as a Blob. Measured 2026-10-09: WebKit aborts any transaction that puts a
// Blob or File into an object store — `UnknownError: Error preparing Blob/File data to be stored in
// object store` — while a Uint8Array stores normally. Storing Blobs made every attached PDF and
// every retained raster window fail in Safari, which is 11 of the 13 WebKit test failures and, more
// to the point, the feature simply not working for Safari users. The media type is not stored
// alongside, because every caller wants the bytes and reconstructs what it needs.
export async function storePDFs(files:Map<string,Uint8Array<ArrayBuffer>>,refs?:Map<string,ProjectFile>):Promise<void> {
  if(!files.size)return;
  for(const [hash,bytes] of files){const ref=refs?.get(hash);if(ref)await verifyProjectFile(ref,bytes);else if(await pdfDigest(bytes)!==hash)throw new Error('PDF checksum mismatch.');}
  const db=await openDatabase();
  try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.oncomplete=()=>resolve();
    // The abort reason is reported rather than guessed at. The previous message asserted a full
    // disk and discarded tx.error, which is how a browser refusing the value at all was mistaken
    // for a quota problem for as long as it was.
    tx.onabort=()=>reject(new Error(`Could not save the file locally: ${tx.error?`${tx.error.name}: ${tx.error.message}`:'the browser aborted the transaction without stating a reason'}. Your reference remains unsaved.`));
    tx.onerror=()=>{};
    for(const [hash,bytes] of files)tx.objectStore(STORE).put(bytes,hash);
  });}finally{db.close();}
}
/** Reads stored bytes. Accepts a Blob as well, because a database written by a version that
 *  stored Blobs is still on the devices of everyone who used one, and their attachments must keep
 *  opening. Nothing writes a Blob any more. */
export async function readPDF(hash:string):Promise<Uint8Array<ArrayBuffer>|null> {
  const db=await openDatabase();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(hash);
    request.onsuccess=()=>{
      const value=request.result as unknown;
      if(value===undefined)resolve(null);
      else if(value instanceof Uint8Array)resolve(value as Uint8Array<ArrayBuffer>);
      else if(value instanceof ArrayBuffer)resolve(new Uint8Array(value));
      else if(value instanceof Blob)value.arrayBuffer().then(buffer=>resolve(new Uint8Array(buffer)),()=>reject(new Error('Could not read the locally stored file. Reattach the original.')));
      else reject(new Error('Invalid stored file. Reattach the original.'));
    };
    request.onerror=()=>reject(new Error('Could not read the locally stored file.'));
  });}finally{db.close();}
}
export async function verifiedPDF(ref:Extract<EvidenceReference,{kind:'pdf'}>):Promise<Uint8Array<ArrayBuffer>> {
  const bytes=await readPDF(ref.sha256);
  if(!bytes)throw new Error(`PDF unavailable on this device: ${ref.filename}. Edit the reference and attach the file, or import a bundle containing it.`);
  if(bytes.length!==ref.bytes)throw new Error(`Stored PDF size mismatch: ${ref.filename}. Reattach the original.`);
  if(await pdfDigest(bytes)!==ref.sha256)throw new Error(`Stored PDF checksum mismatch: ${ref.filename}. Reattach the original.`);
  return bytes;
}
export async function attachPDF(file:File):Promise<Pick<Extract<EvidenceReference,{kind:'pdf'}>,'kind'|'filename'|'sha256'|'bytes'|'mediaType'>> {
  if(file.size>MAX_PDF_BYTES)throw new Error('PDFs must be at most 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),sha256=await pdfDigest(bytes);
  await storePDFs(new Map([[sha256,bytes]]));
  return {kind:'pdf',filename:file.name,sha256,bytes:bytes.length,mediaType:'application/pdf'};
}
export async function exportEvidenceFiles(workflow:Workflow):Promise<EvidenceFile[]> {
  assertProjectManifest(workflow);
  const result:EvidenceFile[]=[];
  for(const ref of projectFiles(workflow).values())result.push({sha256:ref.sha256,bytes:ref.bytes,...(ref.mediaType==='image/tiff'?{mediaType:ref.mediaType}:{}),dataBase64:encodeFile(await verifiedProjectFile(ref))});
  return result;
}
export async function workflowDocument(workflow:Workflow):Promise<Workflow|EvidenceBundle> {
  assertProjectManifest(workflow);const snapshot=structuredClone(workflow);syncProjectManifest(snapshot);const attachments=await exportEvidenceFiles(snapshot);
  return attachments.length?{schema:'fieldwork/bundle/1',workflow:snapshot,attachments}:snapshot;
}
export async function importWorkflowDocument(raw:unknown,validate:(raw:unknown)=>Workflow):Promise<Workflow> {
  if(!isRecord(raw)||raw.schema!=='fieldwork/bundle/1'){
    const workflow=validate(raw);
    // A reference-only document is complete only if its PDF bytes exist locally.
    for(const ref of projectFiles(workflow).values())await verifiedProjectFile(ref);
    return workflow;
  }
  const workflow=validate(raw.workflow),expected=projectFiles(workflow);
  if(!Array.isArray(raw.attachments)||raw.attachments.length!==expected.size)throw new Error('The workflow bundle must include exactly its referenced PDFs.');
  const files=new Map<string,Uint8Array<ArrayBuffer>>();
  for(const item of raw.attachments){
    if(!isRecord(item)||typeof item.sha256!=='string'||files.has(item.sha256))throw new Error('Invalid or duplicate PDF in bundle.');
    const reference=expected.get(item.sha256);
    if(!reference||item.bytes!==reference.bytes)throw new Error('Bundle PDF metadata does not match the reference.');
    const bytes=decodeFile(item.dataBase64);
    if((item.mediaType||'application/pdf')!==reference.mediaType||bytes.length!==reference.bytes)throw new Error('Bundle PDF checksum or size mismatch. The workflow has not been imported.');
    await verifyProjectFile(reference,bytes);files.set(item.sha256,bytes);
  }
  // Validate every file before one atomic write; never partially import a bundle.
  await storePDFs(files,expected);
  return workflow;
}

export async function verifiedProjectFile(ref:ProjectFile):Promise<Uint8Array<ArrayBuffer>>{const bytes=await readPDF(ref.sha256);if(!bytes)throw new Error((ref.mediaType==='application/pdf'?'PDF':'Raster')+' unavailable on this device: '+ref.filename+'. Import a complete package or reattach the source.');await verifyProjectFile(ref,bytes);return bytes;}
