// A SMALL SCANNED-SHEET GEOTIFF FOR TESTS (TODO 35): 3 bands of 8 bits, polyconic on NAD27 centred at 76.4375 W, the
// projection USGS's 1943 Lycoming sheets use. Its tags are deliberately offset 600 m west of the drawn sheet, as Oswego
// East's are by 652 m, so a test can find the offset and correct it. The printed neat line is a dark border round the
// quarter-minute box 76.39 W to 76.37 W, 43.49 N to 43.51 N; a black square marks its north-east corner.
import {writeFileSync} from 'node:fs';
const proj4=(await import('../node_modules/proj4/dist/proj4-src.js')).default;
const poly='+proj=poly +lat_0=43.375 +lon_0=-76.4375 +x_0=0 +y_0=0 +ellps=clrk66 +units=m +no_defs',nad='+proj=longlat +ellps=clrk66 +no_defs';
const to=proj4(nad,poly),res=10,W=260,H=300,margin=300;
const [x0,y1]=to.forward([-76.39,43.51]),[x1,y0]=to.forward([-76.37,43.49]);
// The page: the sheet plus a 300 m margin; its tags offset 600 m west of where it is drawn.
const ox=x0-margin-600,oy=y1+margin;
const rgb=new Uint8Array(W*H*3).fill(235);
const at=(x,y)=>[Math.floor((x-(x0-margin))/res),Math.floor((oy-y)/res)];
const [c0,r0]=at(x0,y1),[c1,r1]=at(x1,y0);
for(let r=0;r<H;r++)for(let c=0;c<W;c++){const k=(r*W+c)*3;
  const border=(c>=c0&&c<=c1&&(Math.abs(r-r0)<=1||Math.abs(r-r1)<=1))||(r>=r0&&r<=r1&&(Math.abs(c-c0)<=1||Math.abs(c-c1)<=1));
  const mark=Math.abs(c-c1)<=4&&Math.abs(r-r0)<=4;
  if(border||mark){rgb[k]=30;rgb[k+1]=30;rgb[k+2]=30;}else if(c>c0&&c<c1&&r>r0&&r<r1){rgb[k]=200;rgb[k+1]=225;rgb[k+2]=190;}}
// A MINIMAL TIFF, written by hand: geotiff.js's writer drops the projection keys a polyconic sheet needs.
const keys=[[1024,0,1,1],[1025,0,1,1],[2048,0,1,4267],[3072,0,1,32767],[3074,0,1,32767],[3075,0,1,22],[3076,0,1,9001],
  [3080,34736,1,0],[3081,34736,1,1],[3082,34736,1,2],[3083,34736,1,3],[3092,34736,1,4]];
const geoDoubles=[-76.4375,43.375,0,0,1];
const geoDir=[1,1,0,keys.length,...keys.flat()];
const pixels=Buffer.from(rgb);
const entries=[];// [tag,type,count,value|Buffer]
const SHORT=3,LONG=4,DOUBLE=12;
const shorts=a=>{const b=Buffer.alloc(a.length*2);a.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b;};
const doubles=a=>{const b=Buffer.alloc(a.length*8);a.forEach((v,i)=>b.writeDoubleLE(v,i*8));return b;};
entries.push([256,SHORT,1,W],[257,SHORT,1,H],[258,SHORT,3,shorts([8,8,8])],[259,SHORT,1,1],[262,SHORT,1,2],[273,LONG,1,'STRIP'],
  [277,SHORT,1,3],[278,SHORT,1,H],[279,LONG,1,pixels.length],[284,SHORT,1,1],
  [33550,DOUBLE,3,doubles([res,res,0])],[33922,DOUBLE,6,doubles([0,0,0,ox,oy,0])],[34735,SHORT,geoDir.length,shorts(geoDir)],[34736,DOUBLE,geoDoubles.length,doubles(geoDoubles)]);
const ifdSize=2+entries.length*12+4;let extra=8+ifdSize;const blobs=[];
for(const e of entries)if(Buffer.isBuffer(e[3])&&e[3].length>4){e.offset=extra;blobs.push(e[3]);extra+=e[3].length+(e[3].length%2);if(e[3].length%2)blobs.push(Buffer.alloc(1));}
const stripAt=extra;
const head=Buffer.alloc(8);head.write('II',0);head.writeUInt16LE(42,2);head.writeUInt32LE(8,4);
const ifd=Buffer.alloc(ifdSize);ifd.writeUInt16LE(entries.length,0);
entries.forEach((e,i)=>{const o=2+i*12;ifd.writeUInt16LE(e[0],o);ifd.writeUInt16LE(e[1],o+2);ifd.writeUInt32LE(e[2],o+4);
  if(e[3]==='STRIP')ifd.writeUInt32LE(stripAt,o+8);else if(Buffer.isBuffer(e[3])){if(e[3].length<=4)e[3].copy(ifd,o+8);else ifd.writeUInt32LE(e.offset,o+8);}
  else if(e[1]===SHORT)ifd.writeUInt16LE(e[3],o+8);else ifd.writeUInt32LE(e[3],o+8);});
ifd.writeUInt32LE(0,ifdSize-4);
const file=Buffer.concat([head,ifd,...blobs,pixels]);
writeFileSync(process.argv[2],file);console.log('written',file.length,'bytes; NE corner pixel',c1,r0);
