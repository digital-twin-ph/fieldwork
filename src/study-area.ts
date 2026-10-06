import type {AreaParams,Boundary,Bounds,Escape,NodeSpec,Polygon,Position,Workflow,WorkflowNode} from './types.js';
import type {ReasonerQuad} from './worker-types.js';
import {isRecord} from './guards.js';
export const CRS84='http://www.opengis.net/def/crs/OGC/1.3/CRS84';
export const blankWorkflow=():Workflow=>({schema:'fieldwork/workflow/1',exampleId:'blank',name:'Study area experiment',nodes:[],edges:[]});
export const newStudyArea=():NodeSpec<'area'>=>({type:'area',params:{source:'drawn',label:'My study area',selectionMode:'polygon',geometry:null}});
const same=(a:Position,b:Position)=>a[0]===b[0]&&a[1]===b[1];
export function geometryBounds(g:Boundary):Bounds{const points=g.type==='MultiPolygon'?g.coordinates.flat(2):g.coordinates.flat();return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
export function bboxPolygon(west:number,south:number,east:number,north:number):Polygon{
  if(![west,south,east,north].every(Number.isFinite)||west>=east||south>=north)throw new Error('Use west < east and south < north.');
  return validateDrawnGeometry({type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]});
}
export function validateDrawnGeometry(raw:unknown):Polygon{
  if(!isRecord(raw)||raw.type!=='Polygon'||!Array.isArray(raw.coordinates)||raw.coordinates.length!==1)throw new Error('Draw a single polygon without holes.');
  const ring:unknown=raw.coordinates[0];
  if(!Array.isArray(ring)||ring.length<4||ring.length>201)throw new Error('Use 3 to 200 polygon vertices.');
  if(!ring.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=85))throw new Error('Use longitude −180 to 180 and latitude −85 to 85.');
  if(!same(ring[0],ring.at(-1)!))throw new Error('Close the polygon before using it.');
  const pts=ring.slice(0,-1);
  if(new Set(pts.map(p=>p.join(','))).size!==pts.length)throw new Error('Polygon vertices must be distinct.');
  const [west,south,east,north]=geometryBounds(raw as unknown as Polygon);
  if(east-west>180)throw new Error('Areas crossing the antimeridian are not supported in this experiment.');
  const cross=(a:Position,b:Position,c:Position)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const on=(a:Position,b:Position,p:Position)=>Math.abs(cross(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12&&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12;
  for(let i=0;i<pts.length;i++){
    const a=ring[i],b=ring[i+1];
    if(on(a,b,ring[(i+2)%pts.length])||on(b,ring[(i+2)%pts.length],a))throw new Error('Remove overlapping or collinear adjacent edges.');
    for(let j=i+1;j<pts.length;j++){
      if(j===i+1||(i===0&&j===pts.length-1))continue;
      const c=ring[j],d=ring[j+1];
      if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))throw new Error('Polygon edges must not cross or touch each other.');
    }
  }
  const area=Math.abs(pts.reduce((sum,p,i)=>sum+(p[0]-west)*(ring[i+1][1]-south)-(ring[i+1][0]-west)*(p[1]-south),0))/2;
  if(area<1e-10||east===west||north===south)throw new Error('The selected area is too small or has zero area.');
  return structuredClone(raw) as unknown as Polygon;
}
export function validateAreaParams(p:AreaParams){
  if(p.source!=='drawn')return;
  if(!['bbox','polygon'].includes(p.selectionMode))throw new Error('Choose a bounding box or polygon.');
  if(typeof p.label!=='string'||!p.label.trim()||p.label.length>100)throw new Error('Name the study area using 1 to 100 characters.');
  if(p.geometry!==null){
    validateDrawnGeometry(p.geometry);
    if(p.selectionMode==='bbox'){
      const ring=p.geometry.coordinates[0],b=geometryBounds(p.geometry);
      if(ring.length!==5||ring.slice(0,-1).some(([x,y])=>![b[0],b[2]].includes(x)||![b[1],b[3]].includes(y)))throw new Error('A bounding box must have four axis-aligned corners.');
    }
  }
}
export function geometryWKT(g:Boundary){
  const ring=(r:Position[])=>'('+r.map(p=>p.join(' ')).join(', ')+')';
  return g.type==='Polygon'?'POLYGON ('+g.coordinates.map(ring).join(', ')+')':'MULTIPOLYGON ('+g.coordinates.map(p=>'('+p.map(ring).join(', ')+')').join(', ')+')';
}
export function studyAreaN3(node:Pick<WorkflowNode<'area'>,'id'|'params'>){
  validateAreaParams(node.params);const p=node.params;
  if(p.source!=='drawn'||!p.geometry)throw new Error('Select a study area on the map before running.');
  const [west,south,east,north]=geometryBounds(p.geometry);
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n';
  const subject=`<urn:fieldwork:area:${node.id}>`,geometry=`<urn:fieldwork:geometry:${node.id}>`;
  const facts=`${prefix}\n${subject} a geo:Feature, fw:StudyArea;\n  rdfs:label ${JSON.stringify(p.label)};\n  fw:selectionMode fw:${p.selectionMode==='bbox'?'BoundingBox':'Polygon'};\n  geo:hasGeometry ${geometry}.\n\n${geometry} a geo:Geometry;\n  geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(p.geometry))}^^geo:wktLiteral;\n  fw:geometryValidated true;\n  fw:west ${west.toFixed(9)}; fw:south ${south.toFixed(9)};\n  fw:east ${east.toFixed(9)}; fw:north ${north.toFixed(9)}.\n`;
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
