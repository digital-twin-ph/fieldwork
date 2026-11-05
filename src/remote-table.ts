import {unzipSync} from 'fflate';
import {contentHash} from './project-files.js';
import type {Workflow} from './types.js';

/** A TABLE FETCHED FROM WHERE IT IS PUBLISHED, kept as a spec in the project and as rows only on the device.
 *  Experiment 170. The practitioner, 2026-11-03: *"we can do NYC asthma just download data at open time"*, because
 *  NYC.gov reserves all rights to the counts and the project must not republish them. The rule tiles already keep
 *  (experiment 163): *"we keep specs not the asset."* */
export interface RemoteTableSource {
  url:string;
  /** The file inside an archive, where the URL is a zip. */
  entry?:string;
  /** The file read, before any parsing. Checked on every fetch. */
  sha256:string; bytes:number;
  /** The archive itself, where there is one. Checked too. */
  archiveSha256?:string;
  /** Who holds the data and how to cite it, said wherever the table is. */
  citation?:string;
}

const isZip=(bytes:Uint8Array)=>bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===0x03&&bytes[3]===0x04;
const nameOf=(path:string)=>path.split('/').at(-1)||path;

/** HOW MUCH HAS ARRIVED, for a progress line: bytes read, and the total when the host declares one. */
export type FetchProgress=(read:number,total:number|undefined)=>void;
export interface FetchOptions {onProgress?:FetchProgress; signal?:AbortSignal}
/** "1.5 of 8.8 MB", or "1.5 MB" when the host declared no length. */
export const progressText=(read:number,total?:number)=>`${(read/1e6).toFixed(1)}${total?` of ${(total/1e6).toFixed(1)}`:''} MB`;

/** The bytes at a URL. A refusal names the URL and the status, because a host that stopped answering is the
 *  likeliest cause and the practitioner can check it.
 *
 *  NO TIME LIMIT. Until 2026-11-05 a fetch was stopped after two minutes, a chosen number: that day Zenodo answered in
 *  half a second and then sent the NYC package at about 5 KB/s, so a download that was working was stopped and called a
 *  failure. A limit on how long a source may take bounds what can be fetched at all, and the caps ledger admits no new
 *  unmeasured limit of that kind. So the bytes are counted as they arrive, the practitioner sees them, and stopping is
 *  theirs (`signal`). A connection that dies is still an error, from the browser. */
export async function fetchBytes(url:string,{onProgress,signal}:FetchOptions={}):Promise<Uint8Array<ArrayBuffer>>{
  const stopped=(read:number,total?:number)=>new Error(`The download from ${url} was stopped after ${progressText(read,total)}. `
    +'Nothing was read.');
  let response:Response;
  // REVALIDATED, NOT TAKEN FROM THE CACHE: a file corrected at its source must be seen, and the digest is checked
  // either way. A cached copy of a refused file kept refusing after the source was fixed, found 2026-11-03.
  try{response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-cache',...(signal?{signal}:{})});}
  catch{throw signal?.aborted?stopped(0):new Error(`${url} could not be reached from this browser. The host may be down, or may not allow a browser to fetch from it.`);}
  if(!response.ok)throw new Error(`${url} answered ${response.status}.`);
  const total=Number(response.headers.get('content-length'))||undefined;
  if(!response.body){try{return new Uint8Array(await response.arrayBuffer());}catch(error){throw signal?.aborted?stopped(0,total):error;}}
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let read=0;
  onProgress?.(0,total);
  try{
    for(;;){
      const next=await reader.read();
      if(next.done)break;
      chunks.push(next.value);read+=next.value.length;onProgress?.(read,total);
    }
  }catch(error){
    throw signal?.aborted?stopped(read,total):new Error(`The download from ${url} broke off after ${progressText(read,total)}. `
      +'Nothing was read. Fetch it again to start over.');
  }
  const joined=new Uint8Array(read);let offset=0;
  for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  return joined;
}

/** The readable tables in an archive, CSV and Stata, in the archive's order. */
export function tablesInArchive(bytes:Uint8Array):string[]{
  if(!isZip(bytes))return [];
  const names:string[]=[];
  unzipSync(bytes,{filter:file=>{if(/\.(csv|dta)$/i.test(file.name))names.push(file.name);return false;}});
  return names;
}
export function archiveEntry(bytes:Uint8Array,entry:string):Uint8Array<ArrayBuffer>{
  const found=unzipSync(bytes,{filter:file=>file.name===entry})[entry];
  if(!found)throw new Error(`The archive holds no file "${entry}".`);
  return new Uint8Array(found);
}

/** THE ARCHIVE A FETCHED TABLE CAME FROM, read from this device, and the files in it that could be a data dictionary:
 *  CSV, Excel or Stata (experiment 172). Undefined when the device does not hold it; nothing is downloaded here. */
export async function archiveOnDevice(spec:RemoteTableSource):Promise<{entries:string[];read:(entry:string)=>Uint8Array}|undefined>{
  if(!spec.archiveSha256)return undefined;
  const bytes=await fromDevice(spec.archiveSha256);
  if(!bytes)return undefined;
  const entries:string[]=[];
  unzipSync(bytes,{filter:file=>{if(/\.(csv|xlsx|dta)$/i.test(file.name))entries.push(file.name);return false;}});
  return {entries,read:entry=>archiveEntry(bytes,entry)};
}

/** What a dialog reads, as the file a person would have chosen: name and bytes. */
export const asFile=(bytes:Uint8Array<ArrayBuffer>,path:string)=>new File([bytes],nameOf(path));

/** ONE DOWNLOAD PER FILE, NOT ONE PER WORKFLOW. The practitioner, 2026-11-04: *"I had to download the data set for
 *  NYC twice for 2 workflows. Double download."* What was fetched is kept on the device by its digest, in the store
 *  imported tiles use, and read from there when the same digest is asked for again. A copy is used only after its
 *  digest is checked again, so a damaged copy is fetched afresh rather than read. */
export interface ByteStore {read(digest:string):Promise<Uint8Array<ArrayBuffer>|null>; keep(digest:string,bytes:Uint8Array<ArrayBuffer>):Promise<void>}
let store:ByteStore|undefined;
export const useDeviceCopies=(given:ByteStore|undefined)=>{store=given;};

/** Which file a URL gave, and when: so the dialog can offer the copy for a URL typed again. On this device only. */
export interface DeviceCopy {sha256:string; bytes:number; fetchedAt:string}
const COPIES='fieldwork-remote-copies-v1';
// Typed here rather than from the DOM library, because the worker build that also compiles this module has none.
const storage=()=>(globalThis as {localStorage?:{getItem(k:string):string|null;setItem(k:string,v:string):void}}).localStorage;
const copies=():Record<string,DeviceCopy>=>{try{return JSON.parse(storage()?.getItem(COPIES)||'{}');}catch{return {};}};
export const deviceCopyOf=(url:string):DeviceCopy|undefined=>copies()[url];
const rememberCopy=(url:string,copy:DeviceCopy)=>{
  try{storage()?.setItem(COPIES,JSON.stringify({...copies(),[url]:copy}));}catch{/* the copy is still kept */}
};

/** The bytes with this digest from the device, checked; undefined when there is none or it no longer matches. */
async function fromDevice(digest:string):Promise<Uint8Array<ArrayBuffer>|undefined>{
  const held=await store?.read(digest).catch(()=>null);
  return held&&await contentHash(held)===digest?held:undefined;
}
/** Fetched from the source, then kept by its digest. */
async function fromSource(url:string,options:FetchOptions={}):Promise<{bytes:Uint8Array<ArrayBuffer>;digest:string}>{
  const bytes=await fetchBytes(url,options),digest=await contentHash(bytes);
  await store?.keep(digest,bytes).catch(()=>undefined);
  rememberCopy(url,{sha256:digest,bytes:bytes.length,fetchedAt:new Date().toISOString()});
  return {bytes,digest};
}

/** For the dialog: the device's copy of what this URL gave last time, unless `fresh`; else the source. */
export async function fetchOrDeviceCopy(url:string,{fresh=false,...options}:{fresh?:boolean}&FetchOptions={}):Promise<{bytes:Uint8Array<ArrayBuffer>;digest:string;
    from:'device'|'source';fetchedAt?:string}>{
  const copy=fresh?undefined:deviceCopyOf(url);
  const held=copy?await fromDevice(copy.sha256):undefined;
  if(held&&copy)return {bytes:held,digest:copy.sha256,from:'device',fetchedAt:copy.fetchedAt};
  return {...await fromSource(url,options),from:'source'};
}

/** Fetches a table its spec describes and refuses one that is not the file the spec names. The device's copy is read
 *  first when it has the file the spec names by digest; `from` says which it was. */
export async function fetchRemoteTable(spec:RemoteTableSource,options?:FetchOptions):Promise<File&{from?:'device'|'source'}>;
export async function fetchRemoteTable(spec:RemoteTableSource,options:{deviceOnly:true}):Promise<(File&{from?:'device'|'source'})|undefined>;
/** `deviceOnly` reads the device's copy or nothing: never the network. A run uses it, so running a workflow does not
 *  download anything a person did not ask for. */
export async function fetchRemoteTable(spec:RemoteTableSource,{deviceOnly=false,...options}:{deviceOnly?:boolean}&FetchOptions={}):Promise<(File&{from?:'device'|'source'})|undefined>{
  const wanted=spec.archiveSha256??(spec.entry?undefined:spec.sha256);
  const held=wanted?await fromDevice(wanted):undefined;
  if(deviceOnly&&!held)return undefined;
  const fetched=held??(await fromSource(spec.url,options)).bytes;
  const file=readSpec(spec,fetched,await (async()=>held?wanted!:await contentHash(fetched))());
  return Object.assign(await file,{from:held?'device' as const:'source' as const});
}
async function readSpec(spec:RemoteTableSource,fetched:Uint8Array<ArrayBuffer>,archive:string):Promise<File>{
  if(spec.archiveSha256){
    if(archive!==spec.archiveSha256)throw new Error(`The archive at ${spec.url} is not the one this table was read from: `
      +`its digest is ${archive.slice(0,12)}…, not ${spec.archiveSha256.slice(0,12)}…. Nothing was read.`);
  }
  const bytes=spec.entry?archiveEntry(fetched,spec.entry):fetched;
  const digest=await contentHash(bytes);
  if(digest!==spec.sha256)throw new Error(`The file ${spec.entry??spec.url} is not the one this table was read from: `
    +`its digest is ${digest.slice(0,12)}…, not ${spec.sha256.slice(0,12)}…. Nothing was read.`);
  return asFile(bytes,spec.entry??spec.url);
}

/** A WORKFLOW AS IT LEAVES THE DEVICE: a table with a remote source keeps its spec and its read settings and loses its
 *  rows, so an exported project or an example repository does not republish what the spec points to. */
export function withoutRemoteRows<W extends Workflow>(workflow:W):W{
  for(const node of workflow.nodes){
    if(node.type!=='table_input')continue;
    const p=node.params as {remote?:RemoteTableSource;data?:{rows:unknown[];rowCount:number;missingValueCount:number;findings?:unknown};sourceTable?:unknown};
    if(!p.remote||!p.data)continue;
    p.data={...p.data,rows:[],rowCount:0,missingValueCount:0};
    delete (p.data as {findings?:unknown}).findings;
    delete p.sourceTable;
    // And its reference: another device holds no such source, and a reference to it would refuse the import.
    delete (p as {sourceRef?:unknown}).sourceRef;
  }
  return workflow;
}
