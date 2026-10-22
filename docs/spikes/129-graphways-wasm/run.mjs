import {readFile} from 'node:fs/promises';
const wasm=await readFile(process.argv[2]);
const pbf=new Uint8Array(await readFile(process.argv[3]));
const drive=process.argv[4]==='driving'?1:0;
const {instance}=await WebAssembly.instantiate(wasm,{});
const {alloc,graph_from_pbf,set_bbox,memory}=instance.exports;
const box=process.argv[5];
if(box){const [w,s2,e,n]=box.split(',').map(Number);set_bbox(w,s2,e,n);console.log('BBOX',box);}
const pointer=alloc(pbf.length);
new Uint8Array(memory.buffer,pointer,pbf.length).set(pbf);
const started=performance.now();
const junctions=graph_from_pbf(pointer,pbf.length,drive);
const ms=performance.now()-started;
console.log(`PBF ${(pbf.length/1e6).toFixed(1)} MB -> junctions ${junctions.toLocaleString('en')} in ${(ms/1000).toFixed(1)} s · wasm memory ${(memory.buffer.byteLength/1e6).toFixed(0)} MB`);
