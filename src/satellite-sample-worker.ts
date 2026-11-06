/** READS ONE SATELLITE FILE AT POINTS, in a worker, by HTTP range. h5wasm 0.10.3 (NIST; vendor/h5wasm-0.10.3-LICENSE.txt)
 *  opens the remote file as a lazy file, so only the blocks a read touches are fetched. Loaded from vendor/ when the first
 *  file is read and never precached: reading a remote file needs the network anyway. Experiment 179, S6.
 *
 *  What is read, and from which pixel, is `readAtPoints` in satellite-read.ts. This adds opening the remote file and
 *  what it cost.
 */
import {readAtPoints,type H5File,type ReaderPaths,type PointAt} from './satellite-read.js';

declare const h5wasm:{ready:Promise<{FS:{createLazyFile(parent:string,name:string,url:string,read:boolean,write:boolean):void;unlink(path:string):void}}>;
  File:new(path:string,mode:string)=>H5File&{close():void}};

importScripts('../vendor/h5wasm-0.10.3.js');

let opened=0;

self.onmessage=async(event:MessageEvent)=>{
  const {url,reader,points}=event.data as {url:string;reader:ReaderPaths;points:PointAt[]};
  const name=`f${++opened}.nc`;
  try{
    const {FS}=await h5wasm.ready;
    FS.createLazyFile('/',name,url,true,false);
    const file=new h5wasm.File('/'+name,'r');
    try{
      const read=readAtPoints(file,reader,points);
      // WHAT IT COST, where the browser can say: the lazy file's range requests are resource entries for this URL.
      const base=url.split('?')[0]!;
      const entries=performance.getEntriesByType('resource').filter(e=>e.name.split('?')[0]===base) as PerformanceResourceTiming[];
      const bytes=entries.reduce((n,e)=>n+(e.encodedBodySize||e.transferSize||0),0);
      postMessage({ok:true,...read,requests:entries.length||null,bytes:bytes>0?bytes:null});
    }finally{file.close();try{FS.unlink('/'+name);}catch{/* already gone */}}
  }catch(error){postMessage({ok:false,error:error instanceof Error?error.message:String(error)});}
};
