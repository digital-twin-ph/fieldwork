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

/** Fetches a table its spec describes and refuses one that is not the file the spec names. */
export async function fetchRemoteTable(spec:RemoteTableSource):Promise<File>{
  const fetched=await fetchBytes(spec.url);
  if(spec.archiveSha256){
    const archive=await contentHash(fetched);
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
  }
  return workflow;
}
