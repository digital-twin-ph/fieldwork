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
  return validateDrawnGeometry({type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]});
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

export function geometryBytes(g:unknown):number{return JSON.stringify(g).length;}

// Edge crossing in near-linear time instead of the O(n^2) pair scan this replaces. Measured, the
// quadratic form cost 240 ms at Shabunda's 4,395 vertices and 12.2 s at 32,000 -- so time, not
// memory, was the real ceiling, and admitting large polygons without this would freeze the editor
// rather than refuse. Edges go into a uniform grid of about one edge per cell and only edges
// sharing a cell are compared. Pairs may be compared more than once when they share several
// cells; the test is idempotent, so that costs a little work and no correctness.
function crossingFault(rings:Position[][]):string|null{
  const edges:Position[][]=[],ringOf:number[]=[],indexOf:number[]=[],ringEdges:number[]=[];
  for(let r=0;r<rings.length;r++){
    const ring=rings[r];ringEdges.push(ring.length-1);
    for(let i=0;i<ring.length-1;i++){edges.push([ring[i],ring[i+1]]);ringOf.push(r);indexOf.push(i);}
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
  // Consecutive edges of one ring share a vertex by construction, and the first and last edges of
  // a ring meet where it closes. Those touches are the ring, not a fault.
  const adjacent=(p:number,q:number)=>{
    if(ringOf[p]!==ringOf[q])return false;
    const i=indexOf[p],j=indexOf[q],last=ringEdges[ringOf[p]]-1;
    return Math.abs(i-j)===1||(Math.min(i,j)===0&&Math.max(i,j)===last);
  };
  for(const list of buckets.values()){
    for(let u=0;u<list.length;u++)for(let v=u+1;v<list.length;v++){
      const p=list[u],q=list[v];
      if(adjacent(p,q))continue;
      const [a,b]=edges[p],[c,d]=edges[q];
      if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))
        return ringOf[p]===ringOf[q]?'Polygon edges must not cross or touch each other.'
          :'The boundary\'s rings must not cross or touch each other.';
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
export function validateDrawnGeometry(raw:unknown):Polygon{
  if(!isRecord(raw)||raw.type!=='Polygon'||!Array.isArray(raw.coordinates)||raw.coordinates.length<1)throw new Error('Draw or choose a single polygon.');
  // Bytes first: a boundary too large to store is refused before anything walks its edges.
  const bytes=geometryBytes(raw);
  if(bytes>GEOMETRY_BYTE_BUDGET)throw new Error(`This boundary needs ${Math.round(bytes/1024)} KB and the budget for one extent is ${Math.round(GEOMETRY_BYTE_BUDGET/1024)} KB. Choose a smaller area or a coarser administrative level.`);
  const rings=(raw.coordinates as unknown[]).map((r,i)=>checkRing(r,i===0?'polygon':'interior ring'));
  const [west,south,east,north]=geometryBounds(raw as unknown as Polygon);
  if(east-west>180)throw new Error('Areas crossing the antimeridian are not supported in this experiment.');
  const fault=crossingFault(rings);
  if(fault)throw new Error(fault);
  // Interior rings are admitted because real jurisdictions have them: 22 of 189 DRC ADM2 units
  // carry an enclave, and no vertex budget reaches those. Having established that no two rings
  // cross, one vertex decides where a whole ring lies.
  const outer=rings[0];
  for(let h=1;h<rings.length;h++){
    if(!encloses(outer,rings[h][0]))throw new Error('An interior ring must lie inside the boundary.');
    for(let k=1;k<rings.length;k++)if(k!==h&&encloses(rings[k],rings[h][0]))throw new Error('Interior rings must not contain one another.');
  }
  const pts=outer.slice(0,-1);
  const area=Math.abs(pts.reduce((sum,p,i)=>sum+(p[0]-west)*(outer[i+1][1]-south)-(outer[i+1][0]-west)*(p[1]-south),0))/2;
  if(area<1e-10||east===west||north===south)throw new Error('The selected area is too small or has zero area.');
  return structuredClone(raw) as unknown as Polygon;
}
export function validateAreaParams(p:AreaParams){
  if(p.source!=='drawn')return;
  if(!['bbox','polygon','circle'].includes(p.selectionMode))throw new Error('Choose a bounding box, a polygon or a circle.');
  if(typeof p.label!=='string'||!p.label.trim()||p.label.length>100)throw new Error('Name the study area using 1 to 100 characters.');
  if(p.geometry!==null){
    validateDrawnGeometry(p.geometry);
    if(p.selectionMode==='bbox'){
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
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n';
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
  const facts=`${prefix}\n${subject} a geo:Feature, fw:StudyArea;\n  rdfs:label ${JSON.stringify(p.label)};\n  fw:selectionMode fw:${p.selectionMode==='bbox'?'BoundingBox':p.selectionMode==='circle'?'Circle':'Polygon'};\n  geo:hasGeometry ${geometry}.\n\n${geometry} a geo:Geometry;\n${history}  geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(p.geometry))}^^geo:wktLiteral;\n  fw:geometryValidated true;\n  fw:west ${west.toFixed(9)}; fw:south ${south.toFixed(9)};\n  fw:east ${east.toFixed(9)}; fw:north ${north.toFixed(9)}.\n`;
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
