/** PHOTOS ON A PIN (experiment 09's open item 13; the practitioner, 2026-11-22: *"Can pushpins also include photos?"*).
 *
 *  Decided the same day: up to ten photos a pin, each with a caption, reduced to 2,048 px on the long side as JPEG when
 *  added, the original not kept. The place a phone wrote into the photo is read first, offered to place a pin that has
 *  no position, and then gone: re-encoding keeps the pixels and nothing else, so the stored copy carries no location
 *  and no camera details. The bytes are kept on the device by digest, as a note's picture is (`noteImageKey`), and
 *  travel in encrypted backups only; a plain copy and a shared project carry each photo's digest and caption. */
import type {NoteImagePayload} from './note-image.js';
import type {PinPhoto} from './types.js';

export const MAX_PIN_PHOTOS=10;
export const PIN_PHOTO_EDGE=2048;
const JPEG_QUALITY=0.85;

/** WHERE A PHOTO SAYS IT WAS TAKEN: EXIF's GPS latitude and longitude, as decimal degrees, or null where the file is not
 *  a JPEG, carries no EXIF, or no GPS position. Read from the bytes as they came, before anything is re-encoded. */
export function exifPosition(bytes:Uint8Array):[number,number]|null{
  if(bytes[0]!==0xff||bytes[1]!==0xd8)return null;
  let at=2;
  while(at+4<=bytes.length&&bytes[at]===0xff){
    const marker=bytes[at+1]!,length=(bytes[at+2]!<<8)|bytes[at+3]!;
    if(marker===0xda||length<2)return null;
    if(marker===0xe1&&String.fromCharCode(...bytes.subarray(at+4,at+10))==='Exif\0\0')return tiffPosition(bytes.subarray(at+10,at+2+length));
    at+=2+length;
  }
  return null;
}
function tiffPosition(t:Uint8Array):[number,number]|null{
  if(t.length<8)return null;
  const little=t[0]===0x49&&t[1]===0x49;if(!little&&!(t[0]===0x4d&&t[1]===0x4d))return null;
  const view=new DataView(t.buffer,t.byteOffset,t.byteLength);
  const u16=(o:number)=>view.getUint16(o,little),u32=(o:number)=>view.getUint32(o,little);
  const entries=(ifd:number)=>{if(ifd+2>t.length)return [];const n=u16(ifd),out:{tag:number;type:number;count:number;value:number}[]=[];
    for(let i=0;i<n;i++){const e=ifd+2+i*12;if(e+12>t.length)break;out.push({tag:u16(e),type:u16(e+2),count:u32(e+4),value:e+8});}return out;};
  const gpsPointer=entries(u32(4)).find(e=>e.tag===0x8825);if(!gpsPointer)return null;
  const gps=entries(u32(gpsPointer.value));
  const ref=(tag:number)=>{const e=gps.find(x=>x.tag===tag);return e?String.fromCharCode(t[e.value]!):'';};
  const dms=(tag:number)=>{const e=gps.find(x=>x.tag===tag);if(!e||e.type!==5||e.count!==3)return null;const o=u32(e.value);if(o+24>t.length)return null;
    const r=(k:number)=>{const d=u32(o+k*8+4);return d?u32(o+k*8)/d:NaN;};const v=r(0)+r(1)/60+r(2)/3600;return Number.isFinite(v)?v:null;};
  const lat=dms(2),lon=dms(4);if(lat===null||lon===null)return null;
  const signedLat=ref(1)==='S'?-lat:lat,signedLon=ref(3)==='W'?-lon:lon;
  if(Math.abs(signedLat)>90||Math.abs(signedLon)>180||(signedLat===0&&signedLon===0))return null;
  return [signedLon,signedLat];
}

/** EVERY METADATA SEGMENT REMOVED from a JPEG: APP1 to APP15 (EXIF, XMP, ICC and makers' notes) and comments, up to the
 *  image data. Re-encoding alone is not enough: WebKit's encoder writes an EXIF segment of its own (found 2026-11-22). */
export function withoutMetadata(bytes:Uint8Array<ArrayBuffer>):Uint8Array<ArrayBuffer>{
  if(bytes[0]!==0xff||bytes[1]!==0xd8)return bytes;
  const kept:Uint8Array[]=[bytes.subarray(0,2)];let at=2;
  while(at+4<=bytes.length&&bytes[at]===0xff){
    const marker=bytes[at+1]!;
    if(marker===0xda){kept.push(bytes.subarray(at));break;}
    const end=at+2+((bytes[at+2]!<<8)|bytes[at+3]!);
    if((marker<0xe1||marker>0xef)&&marker!==0xfe)kept.push(bytes.subarray(at,end));
    at=end;
  }
  if(at+4>bytes.length||bytes[at]!==0xff)return bytes;
  const out=new Uint8Array(kept.reduce((n,k)=>n+k.length,0));let o=0;for(const k of kept){out.set(k,o);o+=k.length;}
  return out;
}

const hex=(bytes:Uint8Array)=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');

/** A CHOSEN FILE MADE INTO A PIN'S PHOTO: its position read, then the picture drawn at no more than 2,048 px and encoded
 *  as JPEG, which leaves the location and camera details behind. Refused, in words, where the browser cannot read it. */
export async function photoFromFile(file:File):Promise<{photo:PinPhoto;payload:NoteImagePayload;position:[number,number]|null}>{
  const original=new Uint8Array(await file.arrayBuffer());
  const position=exifPosition(original);
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(new Blob([original],{type:file.type||'image/jpeg'}),{imageOrientation:'from-image'});}
  catch{throw new Error(`${file.name||'This file'} could not be read as a picture here. Choose a JPEG, PNG or WebP photo.`);}
  const scale=Math.min(1,PIN_PHOTO_EDGE/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');if(!context)throw new Error('This browser cannot draw the photo.');
  context.drawImage(bitmap,0,0,width,height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',JPEG_QUALITY));
  if(!blob)throw new Error('This browser could not encode the photo.');
  const bytes=withoutMetadata(new Uint8Array(await blob.arrayBuffer()));
  const sha256=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
  let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return {photo:{sha256,mime:'image/jpeg',bytes:bytes.length,width,height,addedAt:new Date().toISOString()},
    payload:{kind:'note-image',mime:'image/jpeg',data:`data:image/jpeg;base64,${btoa(binary)}`},position};
}

/** Metres between two longitude-latitude positions, on a sphere: enough to say how far a photo was taken from its pin. */
export function metresApart(a:[number,number],b:[number,number]):number{
  const r=Math.PI/180,dLat=(b[1]-a[1])*r,dLon=(b[0]-a[0])*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dLon/2)**2;
  return 2*6_371_008.8*Math.asin(Math.min(1,Math.sqrt(h)));
}

/** Read back from a saved workflow: each pin's photos, only those with a digest, at most ten, captions as text. */
export function readPinPhotos(raw:unknown):Record<string,PinPhoto[]>|undefined{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return undefined;
  const out:Record<string,PinPhoto[]>={};
  for(const [pin,list] of Object.entries(raw as Record<string,unknown>)){
    if(!Array.isArray(list))continue;
    const kept=list.flatMap((p):PinPhoto[]=>{
      if(!p||typeof p!=='object')return [];const r=p as Record<string,unknown>;
      if(typeof r.sha256!=='string'||!/^[0-9a-f]{64}$/.test(r.sha256)||r.mime!=='image/jpeg')return [];
      const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0;
      return [{sha256:r.sha256,mime:'image/jpeg',bytes:n(r.bytes),width:n(r.width),height:n(r.height),
        addedAt:typeof r.addedAt==='string'?r.addedAt:'',...(typeof r.caption==='string'&&r.caption.trim()?{caption:r.caption.trim().slice(0,300)}:{})}];
    }).slice(0,MAX_PIN_PHOTOS);
    if(kept.length)out[pin]=kept;
  }
  return Object.keys(out).length?out:undefined;
}
