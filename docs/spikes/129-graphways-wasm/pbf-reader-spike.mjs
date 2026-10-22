/** Experiment 129, step one: can a browser read a published OSM extract, and what does it cost?
 *  Written against DecompressionStream and typed arrays only, so the same code runs in a browser.
 *  No dependency: the point of the measurement is what the platform can do unaided. */
import {readFile} from 'node:fs/promises';

const WALKABLE=new Set(['footway','path','steps','pedestrian','living_street','residential',
  'service','unclassified','tertiary','secondary','primary','track','cycleway','road','trunk']);
const DRIVABLE=new Set(['motorway','motorway_link','trunk','trunk_link','primary','primary_link',
  'secondary','secondary_link','tertiary','tertiary_link','unclassified','residential',
  'living_street','service','road']);

class Reader{
  constructor(bytes){this.b=bytes;this.p=0;}
  get done(){return this.p>=this.b.length;}
  varint(){let shift=0,result=0;for(;;){const byte=this.b[this.p++];result+=shift<28?(byte&0x7f)<<shift:(byte&0x7f)*Math.pow(2,shift);if(byte<0x80)return result;shift+=7;}}
  svarint(){const v=this.varint();return v%2?-(v+1)/2:v/2;}
  skip(wire){
    if(wire===0)this.varint();
    // `this.p += this.varint()` reads the OLD p before the varint advances it, so every skipped
    // field landed short by the length of its own length prefix.
    else if(wire===2){const n=this.varint();this.p+=n;}
    else if(wire===5)this.p+=4;
    else if(wire===1)this.p+=8;
    else throw new Error(`wire type ${wire}`);
  }
  bytes(){const n=this.varint();const out=this.b.subarray(this.p,this.p+n);this.p+=n;return out;}
}
const fields=function*(reader){while(!reader.done){const key=reader.varint();yield [key>>>3,key&7];}};

const inflate=async bytes=>{
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

async function* blobs(bytes){
  let offset=0;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  while(offset+4<=bytes.length){
    const headerLength=view.getUint32(offset);offset+=4;
    const header=new Reader(bytes.subarray(offset,offset+headerLength));offset+=headerLength;
    let type='',size=0;
    for(const [field,wire] of fields(header)){
      if(field===1&&wire===2)type=new TextDecoder().decode(header.bytes());
      else if(field===3&&wire===0)size=header.varint();
      else header.skip(wire);
    }
    const blob=new Reader(bytes.subarray(offset,offset+size));offset+=size;
    let raw=null,zlib=null;
    for(const [field,wire] of fields(blob)){
      if(field===1&&wire===2)raw=blob.bytes();
      else if(field===3&&wire===2)zlib=blob.bytes();
      else blob.skip(wire);
    }
    yield {type,body:raw??await inflate(zlib)};
  }
}

function stringTable(reader){
  const strings=[];
  for(const [field,wire] of fields(reader)){
    if(field===1&&wire===2)strings.push(new TextDecoder().decode(reader.bytes()));
    else reader.skip(wire);
  }
  return strings;
}

/** One PrimitiveBlock: the ways whose highway tag is in `keep`, and their node references. */
function readBlock(body,keep,onWay,onNodes){
  const block=new Reader(body);
  let strings=[],granularity=100,latOffset=0,lonOffset=0;
  const groups=[];
  for(const [field,wire] of fields(block)){
    if(field===1&&wire===2)strings=stringTable(new Reader(block.bytes()));
    else if(field===2&&wire===2)groups.push(block.bytes());
    else if(field===17&&wire===0)granularity=block.varint();
    else if(field===19&&wire===0)latOffset=block.svarint();
    else if(field===20&&wire===0)lonOffset=block.svarint();
    else block.skip(wire);
  }
  for(const groupBytes of groups){
    const group=new Reader(groupBytes);
    for(const [field,wire] of fields(group)){
      if(field===3&&wire===2){               // Way
        const way=new Reader(group.bytes());
        const keys=[],vals=[];let refs=null;
        for(const [f,w] of fields(way)){
          if(f===2&&w===2){const r=new Reader(way.bytes());while(!r.done)keys.push(r.varint());}
          else if(f===3&&w===2){const r=new Reader(way.bytes());while(!r.done)vals.push(r.varint());}
          else if(f===8&&w===2){refs=[];const r=new Reader(way.bytes());let id=0;while(!r.done){id+=r.svarint();refs.push(id);}}
          else way.skip(w);
        }
        let highway=null;
        for(let i=0;i<keys.length;i++)if(strings[keys[i]]==='highway')highway=strings[vals[i]];
        if(highway&&keep.has(highway)&&refs)onWay(refs);
      }
      else if(field===2&&wire===2){          // DenseNodes
        const dense=new Reader(group.bytes());
        let ids=null,lats=null,lons=null;
        for(const [f,w] of fields(dense)){
          if(f===1&&w===2){ids=[];const r=new Reader(dense.bytes());let id=0;while(!r.done){id+=r.svarint();ids.push(id);}}
          else if(f===8&&w===2){lats=[];const r=new Reader(dense.bytes());let v=0;while(!r.done){v+=r.svarint();lats.push(v);}}
          else if(f===9&&w===2){lons=[];const r=new Reader(dense.bytes());let v=0;while(!r.done){v+=r.svarint();lons.push(v);}}
          else dense.skip(w);
        }
        if(ids&&lats&&lons)onNodes(ids,lats,lons,granularity,latOffset,lonOffset);
      }
      else group.skip(wire);
    }
  }
}

const file=process.argv[2];
const mode=process.argv[3]==='driving'?DRIVABLE:WALKABLE;
const bytes=new Uint8Array(await readFile(file));
console.log(`FILE ${file} ${(bytes.length/1e6).toFixed(2)} MB`);

let started=Date.now();
const needed=new Set();
let ways=0,refs=0;
for await (const blob of blobs(bytes)){
  if(blob.type!=='OSMData')continue;
  readBlock(blob.body,mode,wayRefs=>{ways++;refs+=wayRefs.length;for(const id of wayRefs)needed.add(id);},()=>{});
}
const waysMs=Date.now()-started;
console.log(`WAYS ${ways.toLocaleString('en')} kept, ${refs.toLocaleString('en')} references, ${needed.size.toLocaleString('en')} distinct nodes, ${waysMs} ms`);

started=Date.now();
let kept=0;
const coordinates=new Map();
for await (const blob of blobs(bytes)){
  if(blob.type!=='OSMData')continue;
  readBlock(blob.body,mode,()=>{},(ids,lats,lons,granularity,latOffset,lonOffset)=>{
    for(let i=0;i<ids.length;i++){
      if(!needed.has(ids[i]))continue;
      kept++;
      coordinates.set(ids[i],[(lonOffset+granularity*lons[i])/1e9,(latOffset+granularity*lats[i])/1e9]);
    }
  });
}
const nodesMs=Date.now()-started;
console.log(`NODES ${kept.toLocaleString('en')} placed, ${nodesMs} ms`);
console.log(`TOTAL ${(waysMs+nodesMs)/1000} s · heap ${(process.memoryUsage().heapUsed/1e6).toFixed(0)} MB`);
const sample=[...coordinates.values()].slice(0,2);
console.log('SAMPLE',JSON.stringify(sample));
