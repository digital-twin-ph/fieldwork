// EXPERIMENT 227'S SPIKE (2026-11-21). node scripts/zarr-point-spike.mjs <store>/measurements/reflectance
// SPIKE: one pixel's reflectance from an EOPF Sentinel-2 Zarr v3 store, by two byte ranges, with no Zarr library.
import {zstdDecompressSync} from 'node:zlib';
const STORE=process.argv[2];               // .../measurements/reflectance
const meta=JSON.parse(await (await fetch(`${STORE}/zarr.json`)).text()).consolidated_metadata.metadata;
let bytes=0;const get=async(url,range)=>{const r=await fetch(url,range?{headers:{Range:range}}:{});if(!r.ok)throw new Error(`${r.status} ${url}`);const b=new Uint8Array(await r.arrayBuffer());bytes+=b.length;return b;};
// UTM forward (WGS84), zone 33N
function utm(lon,lat,zone=33){const a=6378137,f=1/298.257223563,k0=0.9996,e2=f*(2-f),ep2=e2/(1-e2),r=Math.PI/180;
  const φ=lat*r,λ=lon*r,λ0=((zone-1)*6-180+3)*r,N=a/Math.sqrt(1-e2*Math.sin(φ)**2),T=Math.tan(φ)**2,C=ep2*Math.cos(φ)**2,A=Math.cos(φ)*(λ-λ0);
  const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*φ-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*φ)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*φ)-(35*e2**3/3072)*Math.sin(6*φ));
  return [k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000,
    k0*(M+N*Math.tan(φ)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720))];}
// Blosc 1 frame -> bytes
function blosc(buf){const v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
  const flags=buf[2],ts=buf[3],nbytes=v.getUint32(4,true),bs=v.getUint32(8,true);const out=new Uint8Array(nbytes);
  if(flags&0x02){out.set(buf.subarray(16,16+nbytes));}else{
    const nblocks=Math.ceil(nbytes/bs);
    for(let b=0;b<nblocks;b++){const start=v.getUint32(16+4*b,true),size=Math.min(bs,nbytes-b*bs);
      let p=start,o=b*bs;const cs=v.getInt32(p,true);p+=4;
      const raw=cs===size?buf.subarray(p,p+cs):zstdDecompressSync(buf.subarray(p,p+cs));out.set(raw,o);}
    if(flags&0x01){const t=new Uint8Array(nbytes);for(let b=0;b<nblocks;b++){const o=b*bs,n=Math.min(bs,nbytes-o),k=Math.floor(n/ts);
      for(let j=0;j<ts;j++)for(let i=0;i<k;i++)t[o+i*ts+j]=out[o+j*k+i];for(let i=k*ts;i<n;i++)t[o+i]=out[o+i];}return t;}}
  return out;}
const index={};
async function pixel(band,lon,lat){const m=meta[`r10m/${band}`],c=m.codecs[0].configuration,[ch]=c.chunk_shape,[h,w]=m.shape;
  const tr=meta['r10m'].attributes['spatial:transform'];const [x,y]=utm(lon,lat);
  // The transform's origin is the first pixel's CENTRE (399965 against the GeoTIFF's corner 399960): half a pixel back.
  const col=Math.floor((x-(tr[2]-tr[0]/2))/tr[0]),row=Math.floor((y-(tr[5]-tr[4]/2))/tr[4]);if(col<0||row<0||col>=w||row>=h)return NaN;
  const per=Math.ceil(w/ch),n=Math.ceil(h/ch)*per,shard=`${STORE}/r10m/${band}/c/0/0`;
  index[band]??=await get(shard,`bytes=-${n*16+4}`);const iv=new DataView(index[band].buffer,index[band].byteOffset);
  const k=Math.floor(row/ch)*per+Math.floor(col/ch),off=Number(iv.getBigUint64(k*16,true)),len=Number(iv.getBigUint64(k*16+8,true));
  if(off===2**64-1)return NaN;
  const dn=new Uint16Array(blosc(await get(shard,`bytes=${off}-${off+len-1}`)).buffer);
  const v=dn[(row%ch)*ch+(col%ch)];const sc=c.codecs[0].configuration;return v===0?NaN:v/sc.scale+sc.offset;}
const PLACES=[['Müggelberge (forest)',13.630,52.415],['Köpenick old town',13.577,52.445],['Farmland near Strausberg',13.950,52.590],
  ['Strausberg town centre',13.880,52.578],['Müggelsee (lake)',13.645,52.437]];
const t0=performance.now();
for(const [name,lon,lat] of PLACES){const red=await pixel('b04',lon,lat),nir=await pixel('b08',lon,lat);
  console.log(`${name}: red ${red.toFixed(4)}, near-infrared ${nir.toFixed(4)}, NDVI ${((nir-red)/(nir+red)).toFixed(3)}`);}
console.log(`${(performance.now()-t0).toFixed(0)} ms, ${(bytes/1024).toFixed(0)} KB fetched`);
