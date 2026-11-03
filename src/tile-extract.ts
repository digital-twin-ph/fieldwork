import {PMTiles} from 'pmtiles';
import {contentHash} from './project-files.js';
import {keepBytes,readPDF} from './evidence-storage.js';

/** A BASEMAP IMPORTED ONCE, FOR ONE AREA, AND KEPT ON THE DEVICE. Experiment 163.
 *
 *  The practitioner, 2026-11-02: *"import the tiles one time while connected and use the study area
 *  as boundary"*, and *"we keep specs not the asset."* So the spec below travels in the workflow and
 *  the tiles do not. Another laptop presses Import and gets what is published then, which is why
 *  `basemapLimitation` says so and why no digest here is checked against anything from elsewhere.
 *
 *  ONE PACKED FILE RATHER THAN A ROW PER TILE, in the store project files use, read when a map asks.
 *  `payload-store` is loaded whole at start-up, and Nigeria at zoom 10 is about 33 MB. */
export const TILE_SOURCE='https://data.source.coop/protomaps/openstreetmap/v4.pmtiles';
export const TILE_CREDIT='© OpenStreetMap contributors, ODbL · Protomaps';
export const TILE_MAX_ZOOMS=[8,9,10,11] as const;
export const TILE_DEFAULT_MAX_ZOOM=10;

export interface TileExtractSpec {
  source:string;
  /** West, south, east, north, from what the map draws. */
  bounds:[number,number,number,number];
  minZoom:number;
  maxZoom:number;
  /** When the archive was built, as it says. */
  built?:string;
  /** Local handle for the packed tiles: says nothing on another device, where it finds nothing. */
  digest?:string;
  tiles?:number;
  bytes?:number;
}

const tileX=(lon:number,z:number)=>Math.floor((lon+180)/360*2**z);
const tileY=(lat:number,z:number)=>{const r=lat*Math.PI/180;
  return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z);};

/** Every tile touching the boundary, lowest zoom first. */
export function tilesIn(bounds:TileExtractSpec['bounds'],minZoom:number,maxZoom:number):[number,number,number][]{
  const [west,south,east,north]=bounds,found:[number,number,number][]=[];
  for(let z=minZoom;z<=maxZoom;z++)
    for(let x=tileX(west,z);x<=tileX(east,z);x++)
      for(let y=tileY(north,z);y<=tileY(south,z);y++)found.push([z,x,y]);
  return found;
}

/** A four-byte index length, the index as JSON, then the tiles end to end. */
export function packTiles(tiles:Map<string,Uint8Array>):Uint8Array<ArrayBuffer>{
  const index:Record<string,[number,number]>={};let at=0;
  for(const [key,bytes] of tiles){index[key]=[at,bytes.length];at+=bytes.length;}
  const head=new TextEncoder().encode(JSON.stringify(index));
  const packed=new Uint8Array(4+head.length+at);
  new DataView(packed.buffer).setUint32(0,head.length);
  packed.set(head,4);
  let write=4+head.length;
  for(const bytes of tiles.values()){packed.set(bytes,write);write+=bytes.length;}
  return packed;
}
export function unpackTile(packed:Uint8Array<ArrayBuffer>,key:string):Uint8Array<ArrayBuffer>|null{
  const length=new DataView(packed.buffer,packed.byteOffset).getUint32(0);
  const index=JSON.parse(new TextDecoder().decode(packed.subarray(4,4+length))) as Record<string,[number,number]>;
  const found=index[key];
  return found?packed.slice(4+length+found[0],4+length+found[0]+found[1]):null;
}

/** Fetches the tiles for a spec by range request and keeps them. Absent tiles are ocean or nothing
 *  and are not an error; the archive has no tile there. */
export async function importTiles(request:Pick<TileExtractSpec,'source'|'bounds'|'minZoom'|'maxZoom'>,
  progress:(done:number,total:number)=>void):Promise<TileExtractSpec>{
  const archive=new PMTiles(request.source);
  const metadata=await archive.getMetadata() as {version?:string;'planetiler:osm:osmosisreplicationtime'?:string};
  const wanted=tilesIn(request.bounds,request.minZoom,request.maxZoom);
  const held=new Map<string,Uint8Array>();
  let next=0,done=0;
  const worker=async()=>{
    while(next<wanted.length){
      const [z,x,y]=wanted[next++]!;
      const tile=await archive.getZxy(z,x,y);
      if(tile)held.set(`${z}/${x}/${y}`,new Uint8Array(tile.data));
      progress(++done,wanted.length);
    }
  };
  await Promise.all(Array.from({length:8},worker));
  const packed=packTiles(held),digest=await contentHash(packed);
  await keepBytes(new Map([[digest,packed]]));
  const built=metadata['planetiler:osm:osmosisreplicationtime'];
  return {...request,...(built?{built}:{}),digest,tiles:held.size,bytes:packed.length};
}

const opened=new Map<string,Uint8Array<ArrayBuffer>>();
export async function tilesOnDevice(digest:string|undefined):Promise<Uint8Array<ArrayBuffer>|null>{
  if(!digest)return null;
  const held=opened.get(digest)??await readPDF(digest);
  if(held)opened.set(digest,held);
  return held;
}
