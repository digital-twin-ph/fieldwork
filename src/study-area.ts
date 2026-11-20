import {REPAIR_RULE} from './boundary-repair.js';
import type {AreaParams,Boundary,Bounds,Escape,NodeSpec,Polygon,Position,Workflow,WorkflowNode} from './types.js';
import type {ReasonerQuad} from './worker-types.js';
import {isRecord} from './guards.js';
import {validLogin} from './identity.js';
export const CRS84='http://www.opengis.net/def/crs/OGC/1.3/CRS84';
export const blankWorkflow=():Workflow=>({schema:'fieldwork/workflow/1',exampleId:'blank',name:'Study area experiment',nodes:[],edges:[]});
export const newStudyArea=():NodeSpec<'study_area'>=>({type:'study_area',params:{source:'drawn',label:'My study area',selectionMode:'polygon',geometry:null}});
const same=(a:Position,b:Position)=>a[0]===b[0]&&a[1]===b[1];
// Accumulated in a loop rather than with Math.min(...points): a published jurisdiction runs to
// thousands of vertices, and spreading an array that long into a call throws RangeError long
// before any storage budget is reached. Measured: DRC ADM2 averages 773 vertices per unit and
// its largest, Shabunda, carries 4,395 (docs/research/vertex-contract-probe-2026-10-18.md).
export function geometryBounds(g:Boundary):Bounds{
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  const rings=g.type==='MultiPolygon'?g.coordinates.flat():g.coordinates;
  for(const ring of rings)for(const [x,y] of ring){
    if(x<west)west=x; if(x>east)east=x;
    if(y<south)south=y; if(y>north)north=y;
  }
  return [west,south,east,north];
}
export function bboxPolygon(west:number,south:number,east:number,north:number):Polygon{
  if(![west,south,east,north].every(Number.isFinite)||west>=east||south>=north)throw new Error('Use west < east and south < north.');
  // A bounding box is a Polygon by construction, so the widened return is narrowed back here
  // rather than at every call site that relies on four corners.
  return validateDrawnGeometry({type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]}) as Polygon;
}
// A STUDY AREA is admitted as published, for as long as it fits the device. The practitioner,
// 2026-10-18: *"we want to admit polygons as long as they do not overrun memory."* That replaces
// the 3-200 vertex ceiling of decision A03, which was sized for a drawing gesture -- A03 says so
// itself, "outside this drawing contract" -- and which rejected 147 of 189 DRC ADM2 units (77%)
// once boundaries could be acquired rather than clicked.
//
// The budget is in bytes because bytes are what runs out. Measured on this device, localStorage
// accepts 5,226,496 bytes in both engines; navigator.storage.estimate() reports 1-10 GB but that
// governs IndexedDB and the cache, not localStorage. A workflow is written twice on every save
// (the open workflow and the saved workspaces), and an area keeps every extent it has had, so an
// area's cost is its revisions doubled. The budgets below leave the rest of the quota for the
// other workspaces. Serialized length is measured, not estimated from a vertex count.
export const STORAGE_QUOTA_BYTES=5226496;
// THE TWO BUDGETS ABOVE THIS LINE ARE GONE, 2026-11-05. One extent was held to 1,048,576 bytes and an area's history to
// 1,572,864, both sized against localStorage. The practitioner picked Uganda at ADM0 and *"nothing showed up on the
// dialog map"*: its outline is 1,215 KB in its largest part alone, and the refusal told them to choose a coarser
// level, which at ADM0 does not exist. A study area's outline and its history now go to the payload store
// (IndexedDB) under `areaRef`, as tables, networks and point layers already do, so what the budgets protected is
// not at risk. What remains is the device: a store that falls back to localStorage still refuses at save, with
// `storageRefusal` saying why. Experiment 179's TODO entry, and docs/experiments/121.

/** Why a save was refused, in terms the practitioner can act on -- which means telling the truth
 *  about whether acting is possible.
 *
 *  The old message said "Storage is full -- export the workflow to a file, or open fewer worked
 *  examples". That is sound advice when a workflow would fit beside less company and is WRONG
 *  advice when it would not fit in an empty store, which is the case this widget now produces:
 *  the practitioner downloaded Bunia on 2026-10-20 and the graph alone is several times the whole
 *  quota. Clearing every other example would not have helped, and the message sent them to do it.
 *
 *  localStorage accepts 5,226,496 bytes measured on this device, and a workflow is written twice
 *  on every save -- the open workflow and the saved workspaces -- so what one workflow may cost is
 *  half of that. See docs/experiments/121-storage-beyond-local-storage.md, where the stores that
 *  would hold it are measured at 10.7 GB in Chromium and 1.0 GB in WebKit. */
export function storageRefusal(bytes:number):string{
  const mb=(value:number)=>(value/1e6).toFixed(1);
  const affordable=STORAGE_QUOTA_BYTES/2;
  if(bytes>affordable)
    return `This workflow is ${mb(bytes)} MB and this device keeps workflows in a store that holds `
      +`${mb(STORAGE_QUOTA_BYTES)} MB in total, written twice on each save. It will not fit however `
      +`much else you clear, so it was not kept. Export it to a file to keep it, or cover a smaller `
      +`area: a saved street network can carry roughly ${Math.round(affordable/332).toLocaleString()} `
      +`junctions, which is well under the graph limit this widget offers.`;
  return 'This could not be saved on this device, so it was not kept. The workflow store is full — '
    +'export the workflow to a file, or open fewer worked examples: every one you open is kept '
    +'beside this one. A downloaded street network is the largest thing a workflow holds.';
}

export function geometryBytes(g:unknown):number{return JSON.stringify(g).length;}

// Edge crossing in near-linear time instead of the O(n^2) pair scan this replaces. Measured, the
// quadratic form cost 240 ms at Shabunda's 4,395 vertices and 12.2 s at 32,000 -- so time, not
// memory, was the real ceiling, and admitting large polygons without this would freeze the editor
// rather than refuse. Edges go into a uniform grid of cells about two edges long, and only edges
// sharing a cell, with boxes that meet, are compared. Pairs may be compared more than once when they share several
// cells; the test is idempotent, so that costs a little work and no correctness.
//
// Rings are addressed by (part, ring) now that a study area may hold several parts. Two edges of
// the SAME ring may legitimately share a vertex; edges of different rings, whether holes of one
// part or outlines of two, may not touch at all.
function crossingFault(parts:Position[][][]):string|null{
  const edges:Position[][]=[],partOf:number[]=[],ringOf:number[]=[],indexOf:number[]=[];
  const ringLength:number[][]=parts.map(rings=>rings.map(r=>r.length-1));
  for(let q=0;q<parts.length;q++)for(let r=0;r<parts[q].length;r++){
    const ring=parts[q][r];
    for(let i=0;i<ring.length-1;i++){edges.push([ring[i],ring[i+1]]);partOf.push(q);ringOf.push(r);indexOf.push(i);}
  }
  const n=edges.length;
  if(n<4)return null;
  // EACH EDGE'S BOX, so a pair whose boxes do not meet is passed over before any arithmetic.
  const box=new Float64Array(n*4);let length=0;
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for(let e=0;e<n;e++){
    const [a,b]=edges[e];
    const w=Math.min(a[0],b[0]),s=Math.min(a[1],b[1]),x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]);
    box[e*4]=w;box[e*4+1]=s;box[e*4+2]=x;box[e*4+3]=y;
    if(w<west)west=w;if(x>east)east=x;if(s<south)south=s;if(y>north)north=y;
    length+=Math.hypot(b[0]-a[0],b[1]-a[1]);
  }
  const meet=(p:number,q:number)=>box[p*4]<=box[q*4+2]+1e-12&&box[q*4]<=box[p*4+2]+1e-12
    &&box[p*4+1]<=box[q*4+3]+1e-12&&box[q*4+1]<=box[p*4+3]+1e-12;
  // CELLS SIZED TO THE EDGES (2026-11-20). The grid was sqrt(n) cells a side over the whole extent, so where edges are
  // short and dense -- a river border, a lake shore -- a thousand fell in one cell: DR Congo's 26 provinces, 194,009
  // edges, compared 18.6 million pairs, twice, and Chrome called the page unresponsive. A cell now spans about two
  // average edges, which compares 2.4 million. An edge crossing more than LONG_CELLS cells, a long straight border, is
  // kept out of the grid and compared with every edge whose box meets its own.
  const spanX=(east-west)||1,spanY=(north-south)||1;
  const size=Math.max(2*length/n,Math.max(spanX,spanY)/4096);
  const dimX=Math.max(1,Math.ceil(spanX/size)),dimY=Math.max(1,Math.ceil(spanY/size));
  const column=(x:number)=>Math.min(dimX-1,Math.max(0,Math.floor((x-west)/spanX*dimX)));
  const row=(y:number)=>Math.min(dimY-1,Math.max(0,Math.floor((y-south)/spanY*dimY)));
  const LONG_CELLS=64;
  const buckets=new Map<number,number[]>(),long:number[]=[];
  for(let e=0;e<n;e++){
    const x0=column(box[e*4]),y0=row(box[e*4+1]),x1=column(box[e*4+2]),y1=row(box[e*4+3]);
    if((x1-x0+1)*(y1-y0+1)>LONG_CELLS){long.push(e);continue;}
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const key=y*dimX+x,at=buckets.get(key);
      if(at)at.push(e);else buckets.set(key,[e]);
    }
  }
  // Consecutive edges of one ring share a vertex by construction, and its first and last edges
  // meet where it closes. Those touches are the ring, not a fault.
  const adjacent=(p1:number,q1:number)=>{
    if(partOf[p1]!==partOf[q1]||ringOf[p1]!==ringOf[q1])return false;
    const i=indexOf[p1],j=indexOf[q1],last=ringLength[partOf[p1]][ringOf[p1]]-1;
    return Math.abs(i-j)===1||(Math.min(i,j)===0&&Math.max(i,j)===last);
  };
  const pair=(p1:number,q1:number):string|null=>{
      if(!meet(p1,q1)||adjacent(p1,q1))return null;
      const [a,b]=edges[p1],[c,d]=edges[q1];
      // A PROPER CROSSING is one edge passing through another, which means the interiors meet.
      // TOUCHING is an endpoint or a collinear run lying on another edge -- a shared border.
      const crosses=cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
      const touches=on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
      if(!crosses&&!touches)return null;
      // ADJACENT UNITS SHARE A BORDER, and that is what adjacent units are.
      //
      // The practitioner, 2026-10-24: *"Study area can hold adjacent units, like North Kivu and
      // Ituri Provinces for Ebola outbreak."* The rule refused them: two squares sharing an edge
      // were rejected while the same two squares with a gap were accepted, so a multi-unit study
      // area worked only for units that do not touch -- which administrative units, tiling their
      // ground, almost never are. Snow's 32 South London sub-districts failed the same way.
      //
      // The application already held the opposite position elsewhere. Combined area's manual
      // says two provinces sharing a border "come through as two parts, not one welded outline",
      // because welding them would assert a third line neither authority drew. The widget kept
      // the border and acquisition refused it; this is that inconsistency, resolved the way the
      // manual already argued.
      //
      // Between parts, only a proper crossing is a fault -- interiors that overlap are not two
      // jurisdictions, they are a mistake. WITHIN a part the old rule stands unchanged: a ring
      // touching itself or another ring of the same part is a drawing fault, not a border.
      if(partOf[p1]!==partOf[q1])
        return crosses?'The parts of this area must not overlap each other. Parts that share a border are fine; these cross.':null;
      if(ringOf[p1]===ringOf[q1])return 'Polygon edges must not cross or touch each other.';
      // TWO RINGS OF ONE PART MAY MEET AT A POINT, as the OGC simple-features rule allows and shapely, GEOS and
      // PostGIS accept: a hole touching its outline at one vertex, an island meeting another at a corner. Refusing
      // that refused real municipalities -- Quatis's hole and three of Rio de Janeiro city's islands, in
      // geoBoundaries' Brazil, 2026-11-06 -- that shapely calls valid. A shared run of edge is still refused, and so
      // is a crossing.
      return crosses||sharesRun(a,b,c,d)?"The boundary's rings must not cross, or touch along an edge.":null;
  };
  for(const list of buckets.values()){
    for(let u=0;u<list.length;u++)for(let v=u+1;v<list.length;v++){
      const fault=pair(list[u],list[v]);if(fault)return fault;
    }
  }
  for(const l of long)for(let e=0;e<n;e++){
    if(e===l)continue;
    const fault=pair(l,e);if(fault)return fault;
  }
  return null;
}
/** True when two collinear edges overlap along a length, not just at a point. */
const sharesRun=(a:Position,b:Position,c:Position,d:Position)=>{
  if(Math.abs(cross(a,b,c))>=1e-12||Math.abs(cross(a,b,d))>=1e-12)return false;
  const axis=Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?0:1;
  const lo=Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis])),hi=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis]));
  return hi-lo>1e-12;
};
const cross=(a:Position,b:Position,c:Position)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const on=(a:Position,b:Position,p:Position)=>Math.abs(cross(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12&&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12;
const encloses=(ring:Position[],p:Position)=>{
  let inside=false;
  for(let i=0,j=ring.length-2;i<ring.length-1;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
};
function checkRing(ring:unknown,what:string):Position[]{
  if(!Array.isArray(ring)||ring.length<4)throw new Error(`Use at least 3 ${what} vertices.`);
  if(!ring.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85))throw new Error('Use longitude \u2212180 to 180 and latitude \u221285 to 85.');
  if(!same(ring[0],ring.at(-1)!))throw new Error('Close the polygon before using it.');
  const pts=ring.slice(0,-1);
  if(new Set(pts.map(p=>p.join(','))).size!==pts.length)throw new Error('Polygon vertices must be distinct.');
  for(let i=0;i<pts.length;i++){
    const a=ring[i],b=ring[i+1],c=ring[(i+2)%pts.length];
    if(on(a,b,c)||on(b,c,a))throw new Error('Remove overlapping or collinear adjacent edges.');
  }
  return ring as Position[];
}
/** Whether a point lies on a ring's edge (ends included).
 *
 *  TWO EXACT SHORTCUTS FIRST (2026-11-20): a point outside the ring's box is not on it, and a point that is one of its
 *  vertices is. Adjacent provinces share long runs of border vertices, and each was checked against every edge of the
 *  other province in turn: 2.5 s of applying DR Congo's 26 provinces. Only a point passing both is scanned. */
const ringIndex=new WeakMap<Position[],{box:[number,number,number,number];vertices:Set<string>}>();
function ringTouches(ring:Position[],p:Position):boolean{
  let index=ringIndex.get(ring);
  if(!index){
    let w=Infinity,s=Infinity,e=-Infinity,n=-Infinity;const vertices=new Set<string>();
    for(const [x,y] of ring){if(x<w)w=x;if(x>e)e=x;if(y<s)s=y;if(y>n)n=y;vertices.add(x+','+y);}
    index={box:[w,s,e,n],vertices};ringIndex.set(ring,index);
  }
  const [w,s,e,n]=index.box;
  if(p[0]<w-1e-12||p[0]>e+1e-12||p[1]<s-1e-12||p[1]>n+1e-12)return false;
  if(index.vertices.has(p[0]+','+p[1]))return true;
  for(let i=0;i<ring.length-1;i++)if(on(ring[i],ring[i+1],p))return true;
  return false;
}
const ringArea=(ring:Position[],west:number,south:number)=>{
  const pts=ring.slice(0,-1);
  return Math.abs(pts.reduce((sum,p,i)=>sum+(p[0]-west)*(ring[i+1][1]-south)-(ring[i+1][0]-west)*(p[1]-south),0))/2;
};

/** A study area's geometry, validated and returned unchanged.
 *
 *  A MultiPolygon is admitted because a study area may be several jurisdictions -- the
 *  practitioner, 2026-10-18: *"if there are several countries or cities in different countries
 *  involved in the study area"*. Before this, choosing more than one unit collapsed them to a
 *  bounding box, which is a shape that belongs to none of them, and it did so only because there
 *  was nowhere to put the second outline. */
/** CHECKED ONCE PER SHAPE (2026-11-20). Choosing units, Apply, and writing the area's N3 each validated the same
 *  geometry, three passes over DR Congo's 194,009 vertices. The result is remembered by the exact text of the
 *  coordinates, so a shape that differs in any vertex is checked again; the last few are kept. */
const checked=new Map<string,{ok:Boundary}|{fault:string}>();
export function validateDrawnGeometry(raw:unknown):Boundary{
  let key:string|undefined;
  try{if(isRecord(raw)&&Array.isArray(raw.coordinates))key=String(raw.type)+JSON.stringify(raw.coordinates);}catch{key=undefined;}
  const known=key===undefined?undefined:checked.get(key);
  if(known){if('fault' in known)throw new Error(known.fault);return structuredClone(known.ok);}
  try{
    const ok=validateOnce(raw);
    if(key!==undefined){checked.set(key,{ok});if(checked.size>4)checked.delete(checked.keys().next().value!);}
    return structuredClone(ok);
  }catch(error){
    if(key!==undefined&&error instanceof Error){checked.set(key,{fault:error.message});if(checked.size>4)checked.delete(checked.keys().next().value!);}
    throw error;
  }
}
function validateOnce(raw:unknown):Boundary{
  if(!isRecord(raw)||!Array.isArray(raw.coordinates))throw new Error('Draw or choose a polygon.');
  const multi=raw.type==='MultiPolygon';
  if(!multi&&raw.type!=='Polygon')throw new Error('Draw or choose a polygon.');
  const raw_parts=(multi?raw.coordinates:[raw.coordinates]) as unknown[];
  if(!raw_parts.length)throw new Error('Draw or choose a polygon.');
  const parts=raw_parts.map(part=>{
    if(!Array.isArray(part)||!part.length)throw new Error('Each part of the area needs an outline.');
    return (part as unknown[]).map((r,i)=>checkRing(r,i===0?'polygon':'interior ring'));
  });
  const [west,south,east,north]=geometryBounds(raw as unknown as Boundary);
  if(east-west>180)throw new Error('Areas crossing the antimeridian are not supported in this experiment.');
  const fault=crossingFault(parts);
  if(fault)throw new Error(fault);
  // Interior rings are admitted because real jurisdictions have them: 22 of 189 DRC ADM2 units
  // carry an enclave, and no vertex budget reaches those. Having established that no two rings
  // cross, one vertex decides where a whole ring lies.
  // THE PROBE IS A VERTEX OFF THE OTHER RING (2026-11-19), as for parts below: ray casting counts a point on a ring as
  // inside it, and two holes that touch, or a hole touching the outline, share vertices. Rwanda was refused with
  // "Interior rings must not contain one another" for holes that met. If every vertex is on the other ring, the two
  // trace the same line and containment is not what is wrong with them.
  const offRing=(ring:Position[],of:Position[])=>of.find(vertex=>!ringTouches(ring,vertex));
  for(const rings of parts){
    const outer=rings[0];
    for(let h=1;h<rings.length;h++){
      const inside=offRing(outer,rings[h]);
      if(inside&&!encloses(outer,inside))throw new Error('An interior ring must lie inside the boundary.');
      for(let k=1;k<rings.length;k++){
        if(k===h)continue;
        const probe=offRing(rings[k],rings[h]);
        if(probe&&encloses(rings[k],probe))throw new Error('Interior rings must not contain one another.');
      }
    }
    // A PART WITH NO AREA AT ALL is refused; a very small one is not (2026-11-13): Rwanda's Ngoma district carries, beside
    // itself, a triangle of about 1 m\u00b2 in geoBoundaries, and the whole district was refused for it. Too small is
    // asked of the area as a whole, below.
    if(ringArea(outer,west,south)===0)throw new Error('A part of the area has no area: its outline encloses nothing.');
  }
  if(parts.reduce((sum,rings)=>sum+ringArea(rings[0],west,south),0)<1e-10)throw new Error('The selected area is too small or has zero area.');
  // One part inside another is only legitimate when it sits in that part's hole -- an enclave
  // that belongs to the area. Inside the outline but not in a hole would be the same ground
  // counted twice.
  // A PROBE ON THE SHARED BORDER DECIDES NOTHING. Ray casting counts a point lying on the ring as
  // inside it, and the first vertex of an adjacent unit is very often exactly on the border it
  // shares -- so Ituri probed against North Kivu read as "one part inside another" when the two
  // merely meet. The probe is taken from the first vertex that is NOT on the other part's
  // outline; if every vertex is, the two parts trace the same line and containment is not what
  // is wrong with them.
  const onRing=ringTouches;
  for(let a=0;a<parts.length;a++)for(let b=0;b<parts.length;b++){
    if(a===b)continue;
    // Nor on its holes (2026-11-12): Gwangju's and Daegu's vertices lie on the edge of the hole South Jeolla and North
    // Gyeongsang leave for them, which ray casting may read as outside the hole, so South Korea's 17 provinces were refused.
    const probe=parts[b][0].find(vertex=>!parts[a].some(ring=>onRing(ring,vertex)));
    if(!probe)continue;
    if(encloses(parts[a][0],probe)&&!parts[a].slice(1).some(hole=>encloses(hole,probe)))
      throw new Error('One part of the area lies inside another. Parts must be separate, or sit in an interior ring.');
  }
  if(east===west||north===south)throw new Error('The selected area is too small or has zero area.');
  return structuredClone(raw) as unknown as Boundary;
}

/** A stable fingerprint of a boundary's coordinates, for telling "as published" from "edited".
 *
 *  FNV-1a over the serialized rings: deterministic, synchronous and identical in both engines,
 *  which `crypto.subtle` is not (it is async, and a receipt is built in one pass). This detects
 *  modification; it is not a security digest and nothing depends on it being hard to forge. */
export function boundaryFingerprint(g:Boundary):string{
  const text=JSON.stringify(g.coordinates);
  let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193)>>>0;
  }
  return hash.toString(16).padStart(8,'0');
}

export function validateAreaParams(p:AreaParams){
  if(p.source!=='drawn')return;
  if(!['bbox','polygon','circle'].includes(p.selectionMode))throw new Error('Choose a bounding box, a polygon or a circle.');
  if(typeof p.label!=='string'||!p.label.trim()||p.label.length>100)throw new Error('Name the study area using 1 to 100 characters.');
  if(p.geometry!==null){
    validateDrawnGeometry(p.geometry);
    if(p.selectionMode==='bbox'){
      // A box is one part with one ring. Saying so here keeps every reader of a bbox-mode area
      // entitled to four corners.
      if(p.geometry.type!=='Polygon')throw new Error('A bounding box is a single rectangle, not several parts.');
      if(p.geometry.coordinates.length!==1)throw new Error('A bounding box has no interior rings.');
      const ring=p.geometry.coordinates[0],b=geometryBounds(p.geometry);
      if(ring.length!==5||ring.slice(0,-1).some(([x,y])=>![b[0],b[2]].includes(x)||![b[1],b[3]].includes(y)))throw new Error('A bounding box must have four axis-aligned corners.');
    }
  }
}
export function geometryWKT(g:Boundary){
  const ring=(r:Position[])=>'('+r.map(p=>p.join(' ')).join(', ')+')';
  return g.type==='Polygon'?'POLYGON ('+g.coordinates.map(ring).join(', ')+')':'MULTIPOLYGON ('+g.coordinates.map(p=>'('+p.map(ring).join(', ')+')').join(', ')+')';
}
export function studyAreaN3(node:Pick<WorkflowNode<'study_area'>,'id'|'params'>){
  validateAreaParams(node.params);const p=node.params;
  if(p.source!=='drawn'||!p.geometry)throw new Error('Select a study area on the map before running.');
  const [west,south,east,north]=geometryBounds(p.geometry);
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n';
  // The STUDY AREA keeps one identifier across revisions -- it is the same investigation, and
  // the practitioner chose that over minting a new one each time. Its GEOMETRY is versioned, so
  // "did we revise our study area, and when" is answerable from the receipt alone: a current
  // geometry carrying prov:wasRevisionOf was revised, and prov:generatedAtTime says when. No new
  // vocabulary -- PROV already has both halves.
  const revisions=p.revisions?.length?p.revisions:[];
  const version=Math.max(1,revisions.length);
  const geometryIri=(n:number)=>`<urn:fieldwork:geometry:${node.id}${n>1?`:r${n}`:''}>`;
  const subject=`<urn:fieldwork:area:${node.id}>`,geometry=geometryIri(version);
  const current=revisions[version-1];
  const revisedAt=typeof current==='string'?current:current?.at;
  const restoredFrom=typeof current==='object'&&current?.restoredFrom;
  const history=(revisedAt?`  prov:generatedAtTime ${JSON.stringify(revisedAt)}^^xsd:dateTime;\n`:'')
    +(version>1?`  prov:wasRevisionOf ${geometryIri(version-1)};\n`:'')
    // Restoring an earlier extent is a revision of the one it replaced AND a derivation from the
    // one it brings back. Both are true and PROV says both: wasRevisionOf is a sub-property of
    // wasDerivedFrom, so a reader walking either relation gets a complete answer.
    +(restoredFrom?`  prov:wasDerivedFrom ${geometryIri(restoredFrom)};\n`:'');
  // WHOSE BOUNDARY THIS IS, and whether it is still theirs.
  //
  // A boundary carrying provenance is a claim to authenticity from the source, so the receipt has
  // to name the authority -- a licence states the terms of reuse, not who drew the line, and for
  // a contested frontier only the second answers anything. And because a practitioner may drag a
  // vertex or replace the outline with a box, the receipt compares the geometry against the
  // fingerprint taken when it was acquired and says which it is. Citing the source beneath a
  // shape we altered would attribute our line to them; CC BY requires indicating changes, so
  // this is a licence obligation as well as an honest one.
  //
  // dcterms and prov already say all of this. No new vocabulary is coined for it.
  const acquired=p.boundary;
  let provenance='';
  // Whether the published shape still is the published shape. Lifted out of the block below
  // because the human attribution turns on it: an unaltered boundary is the source's work and
  // naming a person beside it would credit them with somebody else's line.
  let unchanged=false;
  if(acquired&&p.geometry){
    const now=boundaryFingerprint(p.geometry);
    unchanged=now===acquired.publishedHash;
    const vertices=p.geometry.coordinates.reduce((n,r)=>n+r.length-1,0);
    const repairs=acquired.repairs??[];
    const state=unchanged
      ?(repairs.length
        // REPAIRED, AND SAID SO (2026-11-09): a change from the source, indicated as CC BY requires, with the rule and
        // every vertex, so it can be redone by hand.
        ?`Admitted from ${acquired.source} with ${repairs.length} of its ${acquired.vertices} vertices removed by the boundary repair: `
          +`${REPAIR_RULE} Removed: ${repairs.map(r=>`${r.unit}, ${r.kind==='repeated'?'repeated':'spike tip'} at ${r.at[0]} ${r.at[1]}`).join('; ')}. `
          +'The geometry was otherwise not simplified, generalised or edited.'
        :`Admitted as published from ${acquired.source}; the geometry was not simplified, generalised or edited.`)
      :`MODIFIED IN THIS WORKFLOW -- this is no longer ${acquired.source}'s boundary. `
        +(acquired.publishedHash==='bounding-box'
          ?'It is a bounding box around the chosen units, which includes ground in none of them.'
          :vertices===acquired.vertices
            ?`It has the published ${vertices} vertices but one or more were moved.`
            :`The source published ${acquired.vertices} vertices; this shape has ${vertices}.`)
        +' The source is cited for what this was derived from, not as the author of this shape.';
    provenance=`  dcterms:source ${JSON.stringify(acquired.source)};\n`
      +`  dcterms:identifier ${JSON.stringify(acquired.boundaryID+' / '+acquired.unitID)};\n`
      +`  dcterms:title ${JSON.stringify(acquired.unitName)};\n`
      +`  dcterms:license ${JSON.stringify(acquired.licence)};\n`
      +(acquired.canonical?`  dcterms:type ${JSON.stringify(acquired.canonical)};\n`:'')
      +(acquired.yearRepresented?`  dcterms:date ${JSON.stringify(acquired.yearRepresented)};\n`:'')
      +`  dcterms:provenance ${JSON.stringify(state)};\n`
      +`  fw:geometryAsPublished ${unchanged};\n`
      +(acquired.retrievedFrom?`  prov:wasDerivedFrom <${acquired.retrievedFrom}>;\n`:'')
      +(acquired.retrievedAt?`  prov:generatedAtTime ${JSON.stringify(acquired.retrievedAt)}^^xsd:dateTime;\n`:'');
  }
  // WHO DREW IT, for the shape no source can be cited for.
  //
  // The practitioner, 2026-10-29: *"any study area sourced from geoboundaries gets that
  // provenance. Anything else will either be the user or someone else, depends on who created the
  // study area if collaborative project."*
  //
  // Emitted for a DRAWN area, and for an acquired one that was then altered -- which is the author
  // the sentence above leaves unnamed when it says the source "is cited for what this was derived
  // from, not as the author of this shape". NOT emitted for an unaltered published boundary: that
  // line is geoBoundaries', and attributing it to whoever selected it would be the receipt
  // crediting a person with somebody else's work.
  //
  // The agent IRI is the account's GitHub page, which dereferences, and the basis travels with it
  // so a reader can tell a name that was typed from one GitHub returned. prov:wasAttributedTo is
  // PROV's own term; no vocabulary is coined for this.
  const drew=p.drawnBy&&validLogin(p.drawnBy.login)&&!(acquired&&unchanged)?p.drawnBy:null;
  const agentIri=drew?`<https://github.com/${drew.login}>`:'';
  const attribution=drew?`  prov:wasAttributedTo ${agentIri};\n`:'';
  const agent=drew
    ?`\n${agentIri} a prov:Agent, fw:Author;\n  fw:githubLogin ${JSON.stringify(drew.login)};\n`
      +`  fw:identityBasis ${JSON.stringify(drew.basis)}`
      +(drew.at?`;\n  prov:generatedAtTime ${JSON.stringify(drew.at)}^^xsd:dateTime`:'')+'.\n'
    :'';
  const facts=`${prefix}\n${subject} a geo:Feature, fw:StudyArea;\n  rdfs:label ${JSON.stringify(p.label)};\n  fw:selectionMode fw:${p.selectionMode==='bbox'?'BoundingBox':p.selectionMode==='circle'?'Circle':'Polygon'};\n  geo:hasGeometry ${geometry}.\n\n${geometry} a geo:Geometry;\n${provenance}${attribution}${history}  geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(p.geometry))}^^geo:wktLiteral;\n  fw:geometryValidated true;\n  fw:west ${west.toFixed(9)}; fw:south ${south.toFixed(9)};\n  fw:east ${east.toFixed(9)}; fw:north ${north.toFixed(9)}.\n${agent}`;
  const rules=`# Geometry checks run in the drawing widget. This rule consumes their explicit result.\n{ ?area a fw:StudyArea; geo:hasGeometry ?shape.\n  ?shape geo:asWKT ?wkt; fw:geometryValidated true.\n} => { ?area fw:readyForSpatialAnalysis true. }.\n`;
  return {facts,rules:prefix+rules,input:facts+'\n'+rules};
}
export function quadToN3(q:ReasonerQuad){
  const subject=q.subjectType==='BlankNode'?'_:'+q.subject:`<${q.subject}>`;
  const object=q.objectType==='Literal'?JSON.stringify(q.object)+(q.language?'@'+q.language:q.datatype?'^^<'+q.datatype+'>':''):q.objectType==='BlankNode'?'_:'+q.object:`<${q.object}>`;
  return `${subject} <${q.predicate}> ${object} .`;
}
export function areaSvg(geometry:Boundary,label='Study area'){
  const [w,s,e,n]=geometryBounds(geometry),cos=Math.cos((s+n)/2*Math.PI/180),scale=Math.min(700/Math.max((e-w)*cos,.00001),220/Math.max(n-s,.00001));
  const project=(p:Position)=>[425+(p[0]-(w+e)/2)*cos*scale,145-(p[1]-(s+n)/2)*scale];
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const paths=polygons.map(poly=>poly.map(r=>'M'+r.map(p=>project(p).join(',')).join('L')+'Z').join(' '));
  const safeLabel=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
  return '<rect width="850" height="295" fill="#f0f3e9"/>'+paths.map(d=>`<path d="${d}" fill="#dbe8d6" stroke="#176b59" stroke-width="2" fill-rule="evenodd"/>`).join('')+`<text x="425" y="150" text-anchor="middle" font-size="14" font-weight="600"${label.length>80?' textLength="700" lengthAdjust="spacingAndGlyphs"':''}>${safeLabel}</text>`+'<text x="18" y="23">SELECTED STUDY AREA · CRS84</text><text x="820" y="23">N ↑</text><text x="18" y="279">Stored geometry · online basemap is used only in the editor</text>';
}
