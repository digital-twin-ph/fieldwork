import type {AreaParams,Boundary,Bounds,Escape,NodeSpec,Polygon,Position,Workflow,WorkflowNode} from './types.js';
import type {ReasonerQuad} from './worker-types.js';
import {isRecord} from './guards.js';
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
/** One extent, as JSON. About 26,000 vertices at the measured 39.2 bytes per vertex. */
export const GEOMETRY_BYTE_BUDGET=1048576;
/** Every extent one area has had. Doubled by the two writes, this leaves ~40% of the quota free. */
export const AREA_BYTE_BUDGET=1572864;

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
// rather than refuse. Edges go into a uniform grid of about one edge per cell and only edges
// sharing a cell are compared. Pairs may be compared more than once when they share several
// cells; the test is idempotent, so that costs a little work and no correctness.
// Edge crossing in near-linear time instead of the O(n^2) pair scan this replaces. Measured, the
// quadratic form cost 240 ms at Shabunda's 4,395 vertices and 12.2 s at 32,000 -- so time, not
// memory, was the real ceiling, and admitting large polygons without this would freeze the editor
// rather than refuse. Edges go into a uniform grid of about one edge per cell and only edges
// sharing a cell are compared. Pairs may be compared more than once when they share several
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
  let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
  for(const [a] of edges){if(a[0]<west)west=a[0];if(a[0]>east)east=a[0];if(a[1]<south)south=a[1];if(a[1]>north)north=a[1];}
  const dim=Math.max(1,Math.min(512,Math.ceil(Math.sqrt(n))));
  const spanX=(east-west)||1,spanY=(north-south)||1;
  const cellOf=(x:number,y:number)=>{
    const cx=Math.min(dim-1,Math.max(0,Math.floor((x-west)/spanX*dim)));
    const cy=Math.min(dim-1,Math.max(0,Math.floor((y-south)/spanY*dim)));
    return cy*dim+cx;
  };
  const buckets=new Map<number,number[]>();
  for(let e=0;e<n;e++){
    const [a,b]=edges[e];
    const c0=cellOf(Math.min(a[0],b[0]),Math.min(a[1],b[1])),c1=cellOf(Math.max(a[0],b[0]),Math.max(a[1],b[1]));
    const x0=c0%dim,y0=Math.floor(c0/dim),x1=c1%dim,y1=Math.floor(c1/dim);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const key=y*dim+x,at=buckets.get(key);
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
  for(const list of buckets.values()){
    for(let u=0;u<list.length;u++)for(let v=u+1;v<list.length;v++){
      const p1=list[u],q1=list[v];
      if(adjacent(p1,q1))continue;
      const [a,b]=edges[p1],[c,d]=edges[q1];
      // A PROPER CROSSING is one edge passing through another, which means the interiors meet.
      // TOUCHING is an endpoint or a collinear run lying on another edge -- a shared border.
      const crosses=cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
      const touches=on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
      if(!crosses&&!touches)continue;
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
      if(partOf[p1]!==partOf[q1]){
        if(crosses)return 'The parts of this area must not overlap each other. Parts that share a border are fine; these cross.';
        continue;
      }
      return ringOf[p1]===ringOf[q1]?'Polygon edges must not cross or touch each other.'
        :"The boundary's rings must not cross or touch each other.";
    }
  }
  return null;
}
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
export function validateDrawnGeometry(raw:unknown):Boundary{
  if(!isRecord(raw)||!Array.isArray(raw.coordinates))throw new Error('Draw or choose a polygon.');
  const multi=raw.type==='MultiPolygon';
  if(!multi&&raw.type!=='Polygon')throw new Error('Draw or choose a polygon.');
  // Bytes first: a boundary too large to store is refused before anything walks its edges.
  const bytes=geometryBytes(raw);
  if(bytes>GEOMETRY_BYTE_BUDGET)throw new Error(`This boundary needs ${Math.round(bytes/1024)} KB and the budget for one extent is ${Math.round(GEOMETRY_BYTE_BUDGET/1024)} KB. Choose a smaller area or a coarser administrative level.`);
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
  for(const rings of parts){
    const outer=rings[0];
    for(let h=1;h<rings.length;h++){
      if(!encloses(outer,rings[h][0]))throw new Error('An interior ring must lie inside the boundary.');
      for(let k=1;k<rings.length;k++)if(k!==h&&encloses(rings[k],rings[h][0]))throw new Error('Interior rings must not contain one another.');
    }
    if(ringArea(outer,west,south)<1e-10)throw new Error('The selected area is too small or has zero area.');
  }
  // One part inside another is only legitimate when it sits in that part's hole -- an enclave
  // that belongs to the area. Inside the outline but not in a hole would be the same ground
  // counted twice.
  // A PROBE ON THE SHARED BORDER DECIDES NOTHING. Ray casting counts a point lying on the ring as
  // inside it, and the first vertex of an adjacent unit is very often exactly on the border it
  // shares -- so Ituri probed against North Kivu read as "one part inside another" when the two
  // merely meet. The probe is taken from the first vertex that is NOT on the other part's
  // outline; if every vertex is, the two parts trace the same line and containment is not what
  // is wrong with them.
  const onRing=(ring:Position[],p:Position)=>{
    for(let i=0;i<ring.length-1;i++)if(on(ring[i],ring[i+1],p))return true;
    return false;
  };
  for(let a=0;a<parts.length;a++)for(let b=0;b<parts.length;b++){
    if(a===b)continue;
    const probe=parts[b][0].find(vertex=>!onRing(parts[a][0],vertex));
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
  // An area keeps every extent it has had, and a save writes the whole workflow twice, so what
  // runs out is the sum over revisions rather than the size of the current one. Refusing here
  // says so while the practitioner can still act on it -- a storage failure at save time can
  // only report that the device is full.
  const kept=[...(p.revisions??[]).map(r=>r.geometry),...(p.geometry?[p.geometry]:[])];
  const total=kept.reduce((sum,g)=>sum+geometryBytes(g),0);
  if(total>AREA_BYTE_BUDGET)throw new Error(`This area's ${kept.length} extents need ${Math.round(total/1024)} KB and the budget is ${Math.round(AREA_BYTE_BUDGET/1024)} KB. Remove an earlier extent from its history, or choose a coarser administrative level.`);
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
  if(acquired&&p.geometry){
    const now=boundaryFingerprint(p.geometry);
    const unchanged=now===acquired.publishedHash;
    const vertices=p.geometry.coordinates.reduce((n,r)=>n+r.length-1,0);
    const state=unchanged
      ?`Admitted as published from ${acquired.source}; the geometry was not simplified, generalised or edited.`
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
  const facts=`${prefix}\n${subject} a geo:Feature, fw:StudyArea;\n  rdfs:label ${JSON.stringify(p.label)};\n  fw:selectionMode fw:${p.selectionMode==='bbox'?'BoundingBox':p.selectionMode==='circle'?'Circle':'Polygon'};\n  geo:hasGeometry ${geometry}.\n\n${geometry} a geo:Geometry;\n${provenance}${history}  geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(p.geometry))}^^geo:wktLiteral;\n  fw:geometryValidated true;\n  fw:west ${west.toFixed(9)}; fw:south ${south.toFixed(9)};\n  fw:east ${east.toFixed(9)}; fw:north ${north.toFixed(9)}.\n`;
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
  return '<rect width="850" height="295" fill="#f0f3e9"/>'+paths.map(d=>`<path d="${d}" fill="#dbe8d6" stroke="#176b59" stroke-width="2" fill-rule="evenodd"/>`).join('')+`<text x="425" y="150" text-anchor="middle" font-size="12" font-weight="600"${label.length>80?' textLength="700" lengthAdjust="spacingAndGlyphs"':''}>${safeLabel}</text>`+'<text x="18" y="23">SELECTED STUDY AREA · CRS84</text><text x="820" y="23">N ↑</text><text x="18" y="279">Stored geometry · online basemap is used only in the editor</text>';
}
