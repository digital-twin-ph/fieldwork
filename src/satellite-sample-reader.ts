/** DRIVES THE READING WORKER, one file at a time, for Sample satellite files at points.
 *
 *  Each file gets its own worker, closed when it is read, so the WebAssembly memory one file used is returned before the
 *  next. Planetary Computer's anonymous token is fetched once per collection and reused until it expires (S4: the token
 *  endpoint needs no account). A file already read at the same points in this session is not read again: a second run
 *  of an unchanged workflow costs nothing. The cache lives only in this page; a reload reads again. Experiment 179. */
import type {CatalogItem} from './satellite-catalog.js';
import {dataFileOf,type FileReading,type SamplePoint,type SatelliteReader} from './satellite-sample.js';

const cache=new Map<string,FileReading>();
const savedKeys=new Set<string>();
/** Forgets every file read this session; for a measurement or a test. */
export const clearFileCache=()=>{cache.clear();savedKeys.clear();};
const tokens=new Map<string,{token:string;expires:number}>();

async function tokenFor(endpoint:string):Promise<string>{
  const held=tokens.get(endpoint);
  if(held&&held.expires-Date.now()>5*60_000)return held.token;
  let response:Response;
  try{response=await fetch(endpoint);}
  catch{throw new Error('The anonymous token for these files could not be fetched. Check the connection; no account is needed.');}
  if(!response.ok)throw new Error(`The anonymous token request returned HTTP ${response.status}.`);
  const body=await response.json() as {token?:string;'msft:expiry'?:string};
  if(!body.token)throw new Error('The token response carried no token.');
  const expires=Date.parse(body['msft:expiry']??'')||Date.now()+30*60_000;
  tokens.set(endpoint,{token:body.token,expires});
  return body.token;
}

function readOne(url:string,reader:SatelliteReader,points:readonly SamplePoint[]):Promise<Omit<FileReading,'itemId'|'href'|'stream'|'orbit'|'datetime'>>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker('./build/satellite-sample-worker.js');
    worker.onmessage=event=>{worker.terminate();
      const d=event.data as {ok:boolean;error?:string}&Omit<FileReading,'itemId'|'href'|'stream'|'orbit'|'datetime'>;
      if(d.ok)resolve(d);else reject(new Error(d.error??'The file could not be read.'));};
    worker.onerror=event=>{worker.terminate();reject(new Error(event.message||'The reading worker failed.'));};
    worker.postMessage({url,reader,points:points.map(p=>({id:p.id,lon:p.lon,lat:p.lat}))});
  });
}

/** Files in flight at once, and tries per file, for Sentinel-5P (experiment 182). The time is network waiting, so
 *  files overlap; a file that fails is tried again before the run stops, naming it. */
export interface FileReadOptions {concurrency?:number; attempts?:number; retryMs?:number;
  /** Readings kept on this device across sessions; `reread` reads every file anyway; `stats.saved` counts the files
   *  taken from the device (2026-11-09). */
  saved?:import('./satellite-reading-store.js').ReadingStore; reread?:boolean; stats?:{saved:number}}
/** Measured on 2026-11-06 (experiment 182), 10 NYC overpasses in Chromium: 46.9 s one at a time, 21.8 s at 3, 18.3 s
 *  at 6. Three, because each file in flight holds a worker and its chunks in memory, which a low-end device feels. */
export const S5P_CONCURRENCY=3;

export async function readFiles(items:readonly CatalogItem[],reader:SatelliteReader,points:readonly SamplePoint[],
  onFile:(done:number,of:number)=>void=()=>{},options:FileReadOptions={},
  read:(url:string,reader:SatelliteReader,points:readonly SamplePoint[])=>ReturnType<typeof readOne>=readOne):Promise<FileReading[]>{
  const signature=points.map(p=>`${p.id}@${p.lon},${p.lat}`).join(';');
  const concurrency=Math.max(1,Math.floor(options.concurrency??S5P_CONCURRENCY));
  const attempts=Math.max(1,Math.floor(options.attempts??3)),retryMs=options.retryMs??1500;
  const out:FileReading[]=new Array(items.length);
  const one=async(item:CatalogItem):Promise<FileReading>=>{
    const file=dataFileOf(item);
    if(!file)throw new Error(`${item.id} has no NetCDF file to read.`);
    const key=`${file.href}|${reader.variable}|${signature}`;
    const held=options.reread?undefined:cache.get(key);
    if(held){if(savedKeys.has(key)&&options.stats)options.stats.saved++;return held;}
    const kept=options.saved&&!options.reread?await options.saved.get(`swath|${key}`) as FileReading|undefined:undefined;
    if(kept&&Array.isArray((kept as {pixels?:unknown}).pixels)){
      cache.set(key,kept);savedKeys.add(key);if(options.stats)options.stats.saved++;return kept;}
    for(let attempt=1;;attempt++){
      try{
        const url=reader.token?`${file.href}${file.href.includes('?')?'&':'?'}${await tokenFor(reader.token)}`:file.href;
        const got=await read(url,reader,points);
        const reading={...got,itemId:item.id,href:file.href,stream:item.stream??null,orbit:item.orbit??null,datetime:item.datetime};
        cache.set(key,reading);savedKeys.delete(key);await options.saved?.put(`swath|${key}`,reading);return reading;
      }catch(error){
        const said=error instanceof Error?error.message:String(error);
        if(attempt>=attempts)throw new Error(`${item.id}: ${said}${attempts>1?` (after ${attempts} attempts)`:''}`);
        await new Promise(resolve=>setTimeout(resolve,retryMs*attempt));
      }
    }
  };
  let next=0,done=0;
  const lane=async()=>{while(next<items.length){const index=next++;out[index]=await one(items[index]!);onFile(++done,items.length);}};
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},lane));
  return out;
}
