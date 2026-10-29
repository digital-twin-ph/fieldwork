import type {Boundary,Scalar} from './types.js';
import type {InputProvenance} from './input-provenance.js';
import {MAX_LAYER_FEATURES,MAX_LAYER_VERTICES,type ParsedFeature} from './polygon-layer.js';

/** POLYGON FEATURES FROM A PUBLISHED EXTRACT, scoped by the study area.
 *
 *  `polygon_input` could read a GeoJSON file and nothing else, so the practitioner had to find
 *  the polygons themselves. On 2026-10-28, acquiring the Thames for South London, that meant
 *  locating a Geofabrik extract by hand, writing a reader, deriving the country by eye and
 *  writing the ODbL into the example's notice. Every one of those is something this application
 *  already does for other data -- `extractsFor` names the extract, `countryOfArea` names the
 *  country, `set_bbox(geometryBounds +/- marginM)` scopes the read, and `boundary-source.ts`
 *  carries a licence per selection. The practitioner put it plainly: *"what we just need from the
 *  polygon widget is something like what study area does already with geoboundary and what street
 *  network does with Geofabrik"*, and then the part that matters -- *"street network does as well
 *  based on study area"*. The study area is the scope.
 *
 *  WHY NOT THE STREET ENGINE. `street-engine.wasm` reads the same files and cannot answer this:
 *  it indexes highway ways, and `ringOf` hands it a ring list to clip a NETWORK against. Water
 *  and buildings are areas, carried as closed ways and as multipolygon relations whose members are
 *  open fragments, and nothing in that engine assembles a ring from members.
 *
 *  WHY OVERPASS IS NOT THE PATH. Measured the same day: six Overpass endpoints were unreachable
 *  or at capacity, and the one response that arrived was a valid EMPTY result -- because the query
 *  asked for `natural=water` and the Thames is `waterway=river`. A published extract already on
 *  the device answered in ten seconds what two days of queries had not, and it cannot be at
 *  capacity.
 *
 *  THREE PASSES, for the reason `street-engine.ts` reads its file twice: wasm32 has no filesystem
 *  and neither has a browser tab holding 124 MB. Relations first, to learn which ways they need;
 *  then those ways and the closed ways that are areas on their own; then the nodes those ways
 *  reference. Holding every way of a country extract to avoid a pass is the trade this refuses.
 *
 *  SCOPE IS NOT CLIPPING, and the distinction is `polygon_input`'s own: that widget reads a file
 *  AS PUBLISHED and says so, because clipping silently would hand on a different shape under its
 *  author's name. A bounding box here selects WHICH FEATURES ARE READ -- a feature is in or out,
 *  never cut -- which is what `set_bbox` does for a street network. Cutting a published polygon
 *  remains a separate step a practitioner chooses and a receipt records.
 */

/** What a practitioner can ask an extract for. A closed set, because each value is a claim about
 *  which tags mean "this is an area of that kind", and a tag guessed from a name is the error
 *  `polygon-layer.ts` already refuses. */
export const AREA_KINDS=['water','building'] as const;
export type AreaKind=typeof AREA_KINDS[number];

/** The tags that mean each kind, with the key that labels a feature.
 *
 *  `waterway=riverbank` is the retired form of `natural=water` + `water=river` and is still on
 *  older geometry, so both are read. Nothing here reads `waterway=river`, which is a CENTRELINE:
 *  a line tagged as the river's course, not the water's area. Reading it as an area is how a
 *  river becomes a hairline polygon. */
const MATCHES:Record<AreaKind,(tags:Record<string,string>)=>boolean>={
  water:tags=>tags.natural==='water'||tags.waterway==='riverbank',
  building:tags=>'building' in tags&&tags.building!=='no',
};

export interface AreaRequest {
  kinds:readonly AreaKind[];
  /** CRS84 degrees, west, south, east, north -- the study area's bounds plus its margin. */
  bbox:[number,number,number,number];
  /** Which tag labels each feature. Absent numbers them, as a read file does. */
  nameTag?:string;
  /** Read only features carrying at least this many vertices.
   *
   *  A KIND IS TOO COARSE ON ITS OWN, measured on 2026-10-28: `water` over South London's box
   *  returns 1,030 features, of which 916 are closed ways -- ponds, basins, a boating lake -- and
   *  the layer cap is 500, so the first realistic request refused. At 40 vertices it is 219 and
   *  every water body the Thames reaches is still there, the smallest of them 60. A STATED
   *  threshold, defaulting to nothing: a default tuned until one example's own features survive
   *  is a number fitted to one answer, and the next study area would inherit it. */
  minVertices?:number;
  maxFeatures?:number;
  maxVertices?:number;
}

/** WHAT WAS RETRIEVED AND UNDER WHAT TERMS, on the model `find_health_facilities` already keeps.
 *
 *  The licence is stated here rather than inferred later, which is `boundary-source.ts`'s rule --
 *  *"The licence is per boundary, not per source"* -- applied to the one source this reads. An
 *  extract of OpenStreetMap is ODbL whatever is taken from it, and ODbL is share-alike, so a
 *  practitioner has an obligation the moment these features reach a published figure. */
export interface AreaRetrieval {
  source:'openstreetmap-extract';
  licence:string; licenceIRI:string; attribution:string; sourceIRI:string;
  kinds:readonly AreaKind[];
  bbox:[number,number,number,number];
  at:string;
  filename?:string; sha256?:string; bytes?:number;
  kept:number;
  /** Why features were not kept, so a surprising count has an account rather than a guess. */
  dropped:{outsideBox:number; unclosed:number; noGeometry:number; belowMinVertices:number};
}

const varint=(b:Uint8Array,i:number):[number,number]=>{
  let r=0,s=0,x=0;
  do{x=b[i++]; r+=(x&0x7f)*Math.pow(2,s); s+=7;}while(x&0x80);
  return [r,i];
};
const zigzag=(n:number):number=>(n%2?-(n+1):n)/2;

/** Protobuf fields, as (number, value) with length-delimited values handed back as views.
 *
 *  Only the two wire types the OSM schema uses are read; a third would be a file this cannot
 *  claim to understand, so it refuses instead of skipping. */
function*fields(b:Uint8Array):Generator<[number,number|Uint8Array]>{
  let i=0;
  while(i<b.length){
    let tag:number,len:number;
    [tag,i]=varint(b,i);
    const field=tag>>>3,wire=tag&7;
    if(wire===0){let v:number;[v,i]=varint(b,i);yield [field,v];}
    else if(wire===2){[len,i]=varint(b,i);yield [field,b.subarray(i,i+len)];i+=len;}
    else if(wire===5)i+=4;
    else if(wire===1)i+=8;
    else throw new Error(`This .osm.pbf uses protobuf wire type ${wire}, which this reader does `
      +'not understand. Rather than skip the field and hand on whatever follows, it stops.');
  }
}
const packed=(b:Uint8Array):number[]=>{
  const out:number[]=[];
  let i=0,v:number;
  while(i<b.length){[v,i]=varint(b,i);out.push(v);}
  return out;
};

/** zlib, through the platform rather than a bundled copy -- the same device
 *  `encrypted-package.ts` uses for gzip. A PBF blob is zlib-wrapped, which is
 *  `DecompressionStream('deflate')`; `'deflate-raw'` would reject the two-byte header. */
const inflate=async(bytes:Uint8Array):Promise<Uint8Array>=>new Uint8Array(await new Response(
  new Blob([bytes as BlobPart]).stream()
    .pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());

/** Each OSMData blob, decompressed, as (stringtable, primitive group) pairs. */
async function*groups(bytes:Uint8Array):AsyncGenerator<[Uint8Array[],Uint8Array]>{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let at=0;
  while(at+4<=bytes.length){
    const headerLength=view.getUint32(at);at+=4;
    if(at+headerLength>bytes.length)throw new Error('This .osm.pbf ends inside a blob header, so '
      +'it is truncated. A partly written download reads as a valid file until it does not.');
    let kind='',size=0;
    for(const [field,value] of fields(bytes.subarray(at,at+headerLength))){
      if(field===1&&value instanceof Uint8Array)kind=new TextDecoder().decode(value);
      else if(field===3&&typeof value==='number')size=value;
    }
    at+=headerLength;
    const blob=bytes.subarray(at,at+size);at+=size;
    if(kind!=='OSMData')continue;
    let raw:Uint8Array|null=null;
    for(const [field,value] of fields(blob)){
      if(field===1&&value instanceof Uint8Array)raw=value;
      else if(field===3&&value instanceof Uint8Array)raw=await inflate(value);
    }
    if(!raw)continue;
    const strings:Uint8Array[]=[];const blocks:Uint8Array[]=[];
    for(const [field,value] of fields(raw)){
      // Braced deliberately: unbraced, the `else` below binds to the INNER `if` and the
      // stringtable branch swallows every primitive group. The compiler caught it by narrowing
      // `field` to 1 and refusing the comparison against 2.
      if(field===1&&value instanceof Uint8Array){
        for(const [k,s] of fields(value))if(k===1&&s instanceof Uint8Array)strings.push(s);
      }
      else if(field===2&&value instanceof Uint8Array)blocks.push(value);
    }
    for(const group of blocks)yield [strings,group];
  }
}

const text=(strings:Uint8Array[],index:number):string=>
  index<strings.length?new TextDecoder().decode(strings[index]):'';
const tagsOf=(strings:Uint8Array[],keys:number[],values:number[]):Record<string,string>=>{
  const tags:Record<string,string>={};
  for(let i=0;i<Math.min(keys.length,values.length);i++)
    tags[text(strings,keys[i])]=text(strings,values[i]);
  return tags;
};

interface WayRecord {refs:number[]; tags:Record<string,string>}

/** Join open fragments into closed rings, reporting what would not close.
 *
 *  A multipolygon relation's members are fragments in no particular order and in either
 *  direction, so each is tried against both ends of the ring being built. A fragment that joins
 *  nothing is COUNTED rather than dropped in silence: `polygon-layer.ts` refuses an unclosed ring
 *  outright, on the ground that a ring its author left open may not be the shape they meant, and
 *  a reader that quietly closed one here would be making exactly that guess. */
function stitch(fragments:number[][]):{rings:number[][]; unclosed:number}{
  const open=fragments.filter(f=>f.length>1).map(f=>f.slice());
  const rings:number[][]=[];
  let unclosed=0;
  while(open.length){
    let ring=open.shift()!;
    for(let joined=true;joined&&ring[0]!==ring[ring.length-1];){
      joined=false;
      for(let i=0;i<open.length;i++){
        const f=open[i];
        if(f[0]===ring[ring.length-1])ring=ring.concat(f.slice(1));
        else if(f[f.length-1]===ring[ring.length-1])ring=ring.concat(f.slice().reverse().slice(1));
        else if(f[f.length-1]===ring[0])ring=f.slice(0,-1).concat(ring);
        else if(f[0]===ring[0])ring=f.slice().reverse().slice(0,-1).concat(ring);
        else continue;
        open.splice(i,1);joined=true;break;
      }
    }
    if(ring[0]===ring[ring.length-1]&&ring.length>=4)rings.push(ring);
    else unclosed++;
  }
  return {rings,unclosed};
}

/** Read the areas of the requested kinds that fall within the box.
 *
 *  `bytes` is a published .osm.pbf the practitioner already holds, which is the arrangement
 *  `extract-catalogue.ts` records: Geofabrik serves no `Access-Control-Allow-Origin`, so this
 *  application never fetches one -- the download is the browser's own and the file stays on the
 *  device. Nothing here reaches the network. */
export async function areasFromExtract(bytes:Uint8Array,request:AreaRequest,
  onPhase?:(phase:string)=>void):Promise<{
  features:ParsedFeature[]; retrieval:AreaRetrieval;
}>{
  if(!request.kinds.length)throw new Error('Choose at least one kind of area to read.');
  const [west,south,east,north]=request.bbox;
  if(!(east>west&&north>south))throw new Error('The bounding box has no area. It comes from the '
    +'study area’s own bounds, so an empty one means nothing upstream has a boundary yet.');
  const maxFeatures=request.maxFeatures??MAX_LAYER_FEATURES;
  const maxVertices=request.maxVertices??MAX_LAYER_VERTICES;
  const matches=(tags:Record<string,string>):boolean=>
    request.kinds.some(kind=>MATCHES[kind](tags));
  // WHAT IT IS DOING, for a reader watching 17 s pass. Three passes are three phases because
  // that is what the file shape forces, so the count is honest rather than a progress bar whose
  // fractions were invented.
  const say=(phase:string)=>onPhase?.(phase);
  say(`Reading ${(bytes.length/1e6).toFixed(0)} MB of extract\u2026`);

  // PASS ONE: the relations that are areas of a requested kind, and the ways they are built from.
  const relations:{id:number; tags:Record<string,string>; outer:number[]; inner:number[]}[]=[];
  const wanted=new Set<number>();
  for await (const [strings,group] of groups(bytes)){
    for(const [field,value] of fields(group)){
      if(field!==4||!(value instanceof Uint8Array))continue;
      let id=0,keys:number[]=[],values:number[]=[],roles:number[]=[],types:number[]=[];
      const members:number[]=[];
      for(const [k,v] of fields(value)){
        if(k===1&&typeof v==='number')id=v;
        else if(k===2&&v instanceof Uint8Array)keys=packed(v);
        else if(k===3&&v instanceof Uint8Array)values=packed(v);
        else if(k===8&&v instanceof Uint8Array)roles=packed(v);
        else if(k===9&&v instanceof Uint8Array){
          let d=0;for(const m of packed(v)){d+=zigzag(m);members.push(d);}}
        else if(k===10&&v instanceof Uint8Array)types=packed(v);
      }
      const tags=tagsOf(strings,keys,values);
      if(!matches(tags))continue;
      const outer:number[]=[],inner:number[]=[];
      for(let i=0;i<members.length;i++){
        if(types[i]!==1)continue;                       // 1 = way; a relation member is not a ring
        (text(strings,roles[i])==='inner'?inner:outer).push(members[i]);
        wanted.add(members[i]);
      }
      if(outer.length)relations.push({id,tags,outer,inner});
    }
  }

  // PASS TWO: those member ways, and the closed ways that are areas in their own right.
  say(`${relations.length.toLocaleString()} multipolygon${relations.length===1?'':'s'}; `
    +'finding the ways they are built from\u2026');
  const ways=new Map<number,WayRecord>();
  const closed:{id:number; tags:Record<string,string>; refs:number[]}[]=[];
  for await (const [strings,group] of groups(bytes)){
    for(const [field,value] of fields(group)){
      if(field!==3||!(value instanceof Uint8Array))continue;
      let id=0,keys:number[]=[],values:number[]=[];
      const refs:number[]=[];
      for(const [k,v] of fields(value)){
        if(k===1&&typeof v==='number')id=v;
        else if(k===2&&v instanceof Uint8Array)keys=packed(v);
        else if(k===3&&v instanceof Uint8Array)values=packed(v);
        else if(k===8&&v instanceof Uint8Array){
          let d=0;for(const r of packed(v)){d+=zigzag(r);refs.push(d);}}
      }
      const member=wanted.has(id);
      const tags=member?{}:tagsOf(strings,keys,values);
      if(member)ways.set(id,{refs,tags:{}});
      else if(matches(tags)&&refs.length>3&&refs[0]===refs[refs.length-1])
        closed.push({id,tags,refs});
    }
  }

  // PASS THREE: the coordinates, for the nodes those ways name and no others.
  say(`${(ways.size+closed.length).toLocaleString()} ways; reading their coordinates\u2026`);
  const needed=new Set<number>();
  for(const w of ways.values())for(const r of w.refs)needed.add(r);
  for(const c of closed)for(const r of c.refs)needed.add(r);
  const position=new Map<number,[number,number]>();
  for await (const [,group] of groups(bytes)){
    for(const [field,value] of fields(group)){
      if(field!==2||!(value instanceof Uint8Array))continue;
      let ids:number[]=[],lats:number[]=[],lons:number[]=[];
      for(const [k,v] of fields(value)){
        if(k===1&&v instanceof Uint8Array)ids=packed(v);
        else if(k===8&&v instanceof Uint8Array)lats=packed(v);
        else if(k===9&&v instanceof Uint8Array)lons=packed(v);
      }
      let id=0,lat=0,lon=0;
      for(let i=0;i<ids.length;i++){
        id+=zigzag(ids[i]);lat+=zigzag(lats[i]??0);lon+=zigzag(lons[i]??0);
        // The granularity and offsets a block may declare are not read: every Geofabrik and
        // planet build writes the defaults, and a block that did not would be silently misplaced
        // by a hundredth of a degree. Checked rather than assumed -- see the test.
        if(needed.has(id))position.set(id,[Math.round(lon*1e-7*1e7)/1e7,Math.round(lat*1e-7*1e7)/1e7]);
      }
    }
  }

  const ringOf=(refs:number[]):[number,number][]|null=>{
    const points=refs.map(r=>position.get(r)).filter((p):p is [number,number]=>!!p);
    return points.length===refs.length?points:null;
  };
  const inBox=(points:[number,number][]):boolean=>
    points.some(([x,y])=>x>=west&&x<=east&&y>=south&&y<=north);

  say(`${position.size.toLocaleString()} coordinates; building the areas\u2026`);
  const dropped={outsideBox:0,unclosed:0,noGeometry:0,belowMinVertices:0};
  const minVertices=request.minVertices??0;
  const found:{feature:ParsedFeature; vertices:number}[]=[];
  const take=(id:string,tags:Record<string,string>,rings:[number,number][][],holes:[number,number][][])=>{
    if(!rings.length){dropped.noGeometry++;return;}
    if(!rings.some(inBox)){dropped.outsideBox++;return;}
    const vertices=rings.reduce((n,r)=>n+r.length,0)+holes.reduce((n,r)=>n+r.length,0);
    if(vertices<minVertices){dropped.belowMinVertices++;return;}
    const name=request.nameTag?.trim();
    const geometry:Boundary=rings.length===1
      ?{type:'Polygon',coordinates:[rings[0],...holes] as unknown as never}
      :{type:'MultiPolygon',coordinates:rings.map((r,i)=>i===0?[r,...holes]:[r]) as unknown as never};
    found.push({vertices,feature:{id,name:(name&&tags[name])||'',geometry,
      properties:tags as unknown as Record<string,Scalar>}});
  };

  for(const r of relations){
    const outer=stitch(r.outer.map(w=>ways.get(w)?.refs??[]));
    const inner=stitch(r.inner.map(w=>ways.get(w)?.refs??[]));
    dropped.unclosed+=outer.unclosed+inner.unclosed;
    const rings=outer.rings.map(ringOf).filter((p):p is [number,number][]=>!!p);
    const holes=inner.rings.map(ringOf).filter((p):p is [number,number][]=>!!p);
    take(`osm-r${r.id}`,r.tags,rings,holes);
  }
  for(const c of closed){
    const ring=ringOf(c.refs);
    take(`osm-w${c.id}`,c.tags,ring?[ring]:[],[]);
  }

  // COUNTED FIRST, THEN REFUSED, so a refusal can state a threshold that WOULD fit instead of
  // telling a practitioner to narrow something and leaving them to work out by how much. The
  // number is read off the distribution this read actually found, not chosen.
  if(found.length>maxFeatures){
    const sorted=found.map(f=>f.vertices).sort((a,b)=>b-a);
    throw new Error(`That box holds ${found.length.toLocaleString()} `
      +`${request.kinds.join(' and ')} features and this reads at most `
      +`${maxFeatures.toLocaleString()}. A minimum of ${sorted[maxFeatures-1]} vertices would `
      +`keep the largest ${maxFeatures.toLocaleString()} of them. Or narrow the study area, or `
      +'its margin.');
  }
  const total=found.reduce((n,f)=>n+f.vertices,0);
  if(total>maxVertices)
    throw new Error(`Those ${found.length.toLocaleString()} features carry `
      +`${total.toLocaleString()} vertices, past the ${maxVertices.toLocaleString()} the rest of `
      +'this application assumes a study’s geometry holds.');
  const features=found.map(({feature},i)=>({...feature,name:feature.name||`Feature ${i+1}`}));

  return {features,retrieval:{
    source:'openstreetmap-extract',
    licence:'ODbL-1.0',
    licenceIRI:'https://opendatacommons.org/licenses/odbl/1-0/',
    attribution:'© OpenStreetMap contributors',
    sourceIRI:'https://www.openstreetmap.org/copyright',
    kinds:[...request.kinds],bbox:[west,south,east,north],
    at:new Date().toISOString(),kept:features.length,dropped,
  }};
}

/** The retrieval as the provenance record every other input already carries.
 *
 *  NOT A NEW VOCABULARY. `input-provenance.ts` already declares `fw:licence`,
 *  `fw:retrievedFrom` and `fw:retrievedAt`, already knows `ODbL-1.0` as a KNOWN_OBLIGATION
 *  carrying `shareAlike: true` and the attribution OpenStreetMap asks for, and `polygon_input`
 *  already declares a `provenance` parameter for exactly this -- *"so a published boundary is not
 *  redistributed through a workflow without saying whose line it is"*. Asserting new terms here
 *  would mean declaring them in the ontology and earning a receipt nobody else reads; mapping
 *  onto the record every other input uses means `attributionFor` and `shareAlike` answer for this
 *  layer the way they answer for the rest, and a figure's credits need no special case. */
export function retrievalProvenance(retrieval:AreaRetrieval,
  file?:{filename:string;sha256?:string}):InputProvenance{
  const box=retrieval.bbox.map(n=>n.toFixed(4)).join(', ');
  return {
    what:`${retrieval.kinds.join(' and ')} areas read from a published OpenStreetMap extract`
      +`${file?` (${file.filename})`:''}, within ${box}`,
    source:'OpenStreetMap contributors',
    url:retrieval.sourceIRI,
    licence:retrieval.licence,
    licenceSource:retrieval.licenceIRI,
    retrievedFrom:file?.filename??retrieval.source,
    retrievedAt:retrieval.at.slice(0,10),
  } as InputProvenance;
}

/** The same read, in a worker, which is how the application calls it.
 *
 *  `networkInWorker` is the model: the bytes are transferred so a copy of the extract is not
 *  held twice, and the caller's own view is left intact by slicing first. A worker per read and
 *  terminated after, rather than one kept alive: a read holds the whole decoded file, and there
 *  is nothing to keep warm between two reads of different files.
 *
 *  Nothing here touches the network. The .osm.pbf is a file the practitioner already downloaded
 *  -- Geofabrik serves no `Access-Control-Allow-Origin`, which `extract-catalogue.ts` records --
 *  so the file stays on the device and only what was read out of it is kept. */
export async function areasInWorker(bytes:Uint8Array,request:AreaRequest,
  onPhase?:(phase:string)=>void):Promise<{features:ParsedFeature[]; retrieval:AreaRetrieval}>{
  const worker=new Worker('./build/osm-areas-worker.js');
  try{
    return await new Promise((resolve,reject)=>{
      worker.onmessage=({data})=>{
        if(data.phase){onPhase?.(data.phase);return;}
        if(data.error){reject(new Error(data.error));return;}
        resolve(data);
      };
      worker.onerror=event=>reject(new Error(event.message
        ||'The polygon reader worker did not start.'));
      const copy=bytes.slice();   // transferred, so the caller's view is left intact
      worker.postMessage({bytes:copy.buffer,request},[copy.buffer]);
    });
  }finally{worker.terminate();}
}

/** The box to read, from the study area's bounds and a margin in metres.
 *
 *  ONE FUNCTION, because two would disagree. The Inspector uses this box to work out which
 *  published extracts cover the read, and the acquisition uses it to decide what to keep; a box
 *  computed twice is a widget that offers Greater London and then reads outside it.
 *
 *  The margin is converted PER AXIS. `street-engine.ts` divides by 111,195 for both, which is a
 *  degree of latitude; a degree of longitude is shorter everywhere but the equator, so the same
 *  division under-covers east and west. At South London's 51.5°N a degree of longitude is about
 *  69,200 m, so a 5,000 m margin is 0.0722° of longitude and 0.0450° of latitude -- the uniform
 *  form would have given 0.0450° both ways and missed 2,800 m of the margin the practitioner
 *  asked for. Teddington Lock sits 4,460 m outside South London's bounds, which is the distance
 *  that margin exists to cross, so under-covering it by that much is not a rounding matter.
 *
 *  NO CEILING ON THE MARGIN. The `osmQuery` path caps its own at 2,000 m and the network
 *  extract's control stops at the same number; South London needs 5,000, so a cap here would
 *  refuse the one study area this was built for. */
export function readBox(bounds:readonly [number,number,number,number],
  marginM:number):[number,number,number,number]{
  const [west,south,east,north]=bounds;
  const lat=(south+north)/2;
  const perDegreeLat=111_195;
  // cos(lat) at the box's middle rather than at each edge: the difference across a study area is
  // metres, and a box whose north and south edges were widened by different amounts would not be
  // a box.
  const perDegreeLon=Math.max(1,perDegreeLat*Math.cos(lat*Math.PI/180));
  const dx=marginM/perDegreeLon,dy=marginM/perDegreeLat;
  return [Math.max(-180,west-dx),Math.max(-90,south-dy),
          Math.min(180,east+dx),Math.min(90,north+dy)];
}
