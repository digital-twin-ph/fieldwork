/** A FILE'S SHA-256, READ A SLICE AT A TIME (2026-11-13). The practitioner chose GHS-POP's global grid from their
 *  Downloads folder, 12,047,498,632 bytes, and Raster input took its digest by reading the whole file into memory, which
 *  the browser refused: "The requested file could not be read, typically due to permission problems". The digest is the
 *  file's, as before (experiment 209: a file chosen is the file the example was built from); only the reading changed.
 *
 *  SubtleCrypto hashes one buffer and cannot continue, so this is SHA-256 as FIPS 180-4 states it, fed in pieces. */
const K=new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
  0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
  0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
  0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);

export class Sha256 {
  private h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  private block=new Uint8Array(64);private filled=0;private length=0;private w=new Uint32Array(64);
  private compress(data:Uint8Array,at:number){
    const w=this.w,h=this.h;
    for(let i=0;i<16;i++)w[i]=(data[at+4*i]!<<24|data[at+4*i+1]!<<16|data[at+4*i+2]!<<8|data[at+4*i+3]!)>>>0;
    for(let i=16;i<64;i++){const a=w[i-15]!,b=w[i-2]!;
      const s0=(a>>>7|a<<25)^(a>>>18|a<<14)^(a>>>3),s1=(b>>>17|b<<15)^(b>>>19|b<<13)^(b>>>10);
      w[i]=(w[i-16]!+s0+w[i-7]!+s1)>>>0;}
    let a=h[0]!,b=h[1]!,c=h[2]!,d=h[3]!,e=h[4]!,f=h[5]!,g=h[6]!,k=h[7]!;
    for(let i=0;i<64;i++){
      const t1=(k+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+((e&f)^(~e&g))+K[i]!+w[i]!)>>>0;
      const t2=(((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+((a&b)^(a&c)^(b&c)))>>>0;
      k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    h[0]=(h[0]!+a)>>>0;h[1]=(h[1]!+b)>>>0;h[2]=(h[2]!+c)>>>0;h[3]=(h[3]!+d)>>>0;
    h[4]=(h[4]!+e)>>>0;h[5]=(h[5]!+f)>>>0;h[6]=(h[6]!+g)>>>0;h[7]=(h[7]!+k)>>>0;
  }
  update(data:Uint8Array):this{
    this.length+=data.length;let at=0;
    if(this.filled){const take=Math.min(64-this.filled,data.length);this.block.set(data.subarray(0,take),this.filled);this.filled+=take;at=take;
      if(this.filled===64){this.compress(this.block,0);this.filled=0;}}
    for(;at+64<=data.length;at+=64)this.compress(data,at);
    if(at<data.length){this.block.set(data.subarray(at),0);this.filled=data.length-at;}
    return this;
  }
  hex():string{
    const bits=this.length*8,tail=new Uint8Array(((this.filled+9+63)>>6)*64-this.filled);
    tail[0]=0x80;
    // The message length in bits, big-endian, in the last eight bytes; up to 2^53 bits, which no file here approaches.
    const hi=Math.floor(bits/0x100000000),lo=bits>>>0,n=tail.length;
    tail[n-8]=hi>>>24;tail[n-7]=hi>>>16;tail[n-6]=hi>>>8;tail[n-5]=hi;tail[n-4]=lo>>>24;tail[n-3]=lo>>>16;tail[n-2]=lo>>>8;tail[n-1]=lo;
    this.length-=tail.length;this.update(tail);
    return [...this.h].map(x=>x.toString(16).padStart(8,'0')).join('');
  }
}

/** A Blob's SHA-256, read `chunk` bytes at a time, saying how far it has got. */
export async function blobDigest(blob:Blob,onProgress?:(read:number,of:number)=>void,chunk=32*1024*1024):Promise<string>{
  const hash=new Sha256();
  for(let at=0;at<blob.size;at+=chunk){
    hash.update(new Uint8Array(await blob.slice(at,Math.min(blob.size,at+chunk)).arrayBuffer()));
    onProgress?.(Math.min(blob.size,at+chunk),blob.size);
  }
  return hash.hex();
}

/** THE SAME, IN A WORKER, so the page stays responsive through a minute of hashing; where workers are not available (a
 *  test runner, a file read on the main thread before this existed), on the page. */
export function fileDigest(blob:Blob,onProgress?:(read:number,of:number)=>void):Promise<string>{
  if(typeof Worker==='undefined')return blobDigest(blob,onProgress);
  return new Promise((resolve,reject)=>{
    const worker=new Worker('./build/sha256-worker.js');
    worker.onmessage=(event:MessageEvent<{progress?:[number,number];digest?:string;error?:string;name?:string}>)=>{
      const m=event.data;
      if(m.progress){onProgress?.(m.progress[0],m.progress[1]);return;}
      worker.terminate();
      if(m.digest)resolve(m.digest);
      else{const e=new Error(m.error??'The file could not be read.');if(m.name)e.name=m.name;reject(e);}
    };
    worker.onerror=event=>{worker.terminate();reject(new Error(event.message||'The file could not be read.'));};
    worker.postMessage({blob});
  });
}
