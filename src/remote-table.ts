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

/** The bytes at a URL. A refusal names the URL and the status, because a host that stopped answering is the
 *  likeliest cause and the practitioner can check it. */
export async function fetchBytes(url:string):Promise<Uint8Array<ArrayBuffer>>{
  let response:Response;
  // REVALIDATED, NOT TAKEN FROM THE CACHE: a file corrected at its source must be seen, and the digest is checked
  // either way. A cached copy of a refused file kept refusing after the source was fixed, found 2026-11-03.
  try{response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-cache'});}
  catch{throw new Error(`${url} could not be reached from this browser. The host may be down, or may not allow a browser to fetch from it.`);}
  if(!response.ok)throw new Error(`${url} answered ${response.status}.`);
  return new Uint8Array(await response.arrayBuffer());
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
async function fromSource(url:string):Promise<{bytes:Uint8Array<ArrayBuffer>;digest:string}>{
  const bytes=await fetchBytes(url),digest=await contentHash(bytes);
  await store?.keep(digest,bytes).catch(()=>undefined);
  rememberCopy(url,{sha256:digest,bytes:bytes.length,fetchedAt:new Date().toISOString()});
  return {bytes,digest};
}

/** For the dialog: the device's copy of what this URL gave last time, unless `fresh`; else the source. */
export async function fetchOrDeviceCopy(url:string,{fresh=false}={}):Promise<{bytes:Uint8Array<ArrayBuffer>;digest:string;
    from:'device'|'source';fetchedAt?:string}>{
  const copy=fresh?undefined:deviceCopyOf(url);
  const held=copy?await fromDevice(copy.sha256):undefined;
  if(held&&copy)return {bytes:held,digest:copy.sha256,from:'device',fetchedAt:copy.fetchedAt};
  return {...await fromSource(url),from:'source'};
}

/** Fetches a table its spec describes and refuses one that is not the file the spec names. The device's copy is read
 *  first when it has the file the spec names by digest; `from` says which it was. */
export async function fetchRemoteTable(spec:RemoteTableSource):Promise<File&{from?:'device'|'source'}>{
  const wanted=spec.archiveSha256??(spec.entry?undefined:spec.sha256);
  const held=wanted?await fromDevice(wanted):undefined;
  const fetched=held??(await fromSource(spec.url)).bytes;
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
