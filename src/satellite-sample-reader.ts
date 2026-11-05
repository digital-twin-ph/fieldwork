/** DRIVES THE READING WORKER, one file at a time, for Sample satellite files at points.
 *
 *  Each file gets its own worker, closed when it is read, so the WebAssembly memory one file used is returned before the
 *  next. Planetary Computer's anonymous token is fetched once per collection and reused until it expires (S4: the token
 *  endpoint needs no account). A file already read at the same points in this session is not read again: a second run
 *  of an unchanged workflow costs nothing. The cache lives only in this page; a reload reads again. Experiment 179. */
import type {CatalogItem} from './satellite-catalog.js';
import {dataFileOf,type FileReading,type SamplePoint,type SatelliteReader} from './satellite-sample.js';

const cache=new Map<string,FileReading>();
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

export async function readFiles(items:readonly CatalogItem[],reader:SatelliteReader,points:readonly SamplePoint[],
  onFile:(done:number,of:number)=>void=()=>{}):Promise<FileReading[]>{
  const signature=points.map(p=>`${p.id}@${p.lon},${p.lat}`).join(';');
  const out:FileReading[]=[];
  for(const [index,item] of items.entries()){
    const file=dataFileOf(item);
    if(!file)throw new Error(`${item.id} has no NetCDF file to read.`);
    const key=`${file.href}|${reader.variable}|${signature}`;
    let reading=cache.get(key);
    if(!reading){
      const url=reader.token?`${file.href}${file.href.includes('?')?'&':'?'}${await tokenFor(reader.token)}`:file.href;
      let read;
      try{read=await readOne(url,reader,points);}
      catch(error){throw new Error(`${item.id}: ${error instanceof Error?error.message:String(error)}`);}
      reading={...read,itemId:item.id,href:file.href,stream:item.stream??null,orbit:item.orbit??null,datetime:item.datetime};
      cache.set(key,reading);
    }
    out.push(reading);onFile(index+1,items.length);
  }
  return out;
}
