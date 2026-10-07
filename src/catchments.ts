import {catchmentSemantics} from './catchment-semantics.js';
import {buffer as turfBuffer} from '@turf/buffer';
import proj4 from 'proj4';
import * as polygonClipping from 'polyclip-ts';
type ClipPolygon=[number,number][][];
type ClipMultiPolygon=ClipPolygon[];
import type {Boundary,PointCollection,PointFeature,Position,WorkflowNode,NodeDefinition} from './types.js';
import type {Receipt} from './results.js';
import {geometryBounds} from './study-area.js';
import {pointRelation} from './spatial-predicates.js';

export interface Network {nodes:{id:string;coordinates:Position}[];edges:{from:string;to:string;lengthM:number;geometry?:Position[]}[];source:string;provenance?:Record<string,unknown>}
export interface Catchment {id:string;name:string;siteId:string;geometry:Boundary;minutes?:number;count?:number;total?:number;missingValues?:number}
export interface Polygons {siteSourceNodeId?:string;features:Catchment[];sites:PointFeature[];method:string;crs:string;boundary?:Boundary;notes:string[];observations?:PointCollection;summary?:{records:number;matched:number;unmatched:number;missingLocation:number;multiple:number;valueField:string};snaps?:{siteId:string;nodeId:string;distanceM:number}[]}
export const CATCHMENT_TYPES:Record<'voronoi'|'network_input'|'isochrone'|'clip_polygons'|'summarize_polygons',NodeDefinition>={
  voronoi:{title:'Voronoi catchments',group:'Spatial operations',icon:'◇',color:'teal',description:'Allocate an extent to the nearest site in a metric CRS',inputs:[['area','area'],['sites','points']],output:'polygons'},
  network_input:{title:'Street network',group:'Sources',icon:'⌁',color:'blue',description:'Download OSM by study area or upload a directed graph',inputs:[['area','area']],output:'network'},
  isochrone:{title:'Network isochrone',group:'Spatial operations',icon:'◷',color:'teal',description:'Buffer reachable network segments for a time budget',inputs:[['sites','points'],['network','network']],output:'polygons'},
  clip_polygons:{title:'Clip polygons',group:'Spatial operations',icon:'✂',color:'teal',description:'Intersect each polygon with the study area',inputs:[['area','area'],['polygons','polygons']],output:'polygons'},
  summarize_polygons:{title:'Summarize points in polygons',group:'Summaries',icon:'∑',color:'teal',description:'Count locations and optionally sum a numeric attribute',inputs:[['polygons','polygons'],['points','points']],output:'polygons'}
};
const validId=(s:unknown)=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s);
const coordinate=(p:unknown):p is Position=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=80;
export function validateNetwork(n:Network){
  if(!n||!Array.isArray(n.nodes)||!Array.isArray(n.edges)||!n.nodes.length||n.nodes.length>2000||n.edges.length>5000||typeof n.source!=='string'||!n.source.trim()||n.source.length>2000)throw new Error('Network needs 1–2,000 nodes, up to 5,000 directed edges and a source description.');
  const ids=new Set<string>();for(const p of n.nodes){if(!p||!validId(p.id)||ids.has(p.id)||!coordinate(p.coordinates))throw new Error('Network node IDs and CRS84 coordinates must be valid and unique.');ids.add(p.id);}
  let vertices=0;for(const e of n.edges){if(!e||!ids.has(e.from)||!ids.has(e.to)||!Number.isFinite(e.lengthM)||e.lengthM<=0||e.lengthM>100000)throw new Error('Network edges need known endpoints and positive metre lengths.');if(e.geometry){vertices+=e.geometry.length;if(!Array.isArray(e.geometry)||e.geometry.length<2||!e.geometry.every(coordinate))throw new Error('Invalid edge geometry.');}}
  if(vertices>30000)throw new Error('Network geometry exceeds 30,000 vertices.');
  if(n.provenance!==undefined&&(!n.provenance||typeof n.provenance!=='object'||Array.isArray(n.provenance)||JSON.stringify(n.provenance).length>100000))throw new Error('Invalid or oversized network provenance.');
}
export function validateCatchmentNode(n:WorkflowNode){
  if(Object.hasOwn(CATCHMENT_TYPES,n.type)&&(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>100))throw new Error('Name the operation using 1–100 characters.');
  if(n.type==='network_input'){
    if(!n.params.data||!Array.isArray(n.params.data.nodes)||!Array.isArray(n.params.data.edges))throw new Error('Invalid network input.');
    if(n.params.data.nodes.length||n.params.data.edges.length)validateNetwork(n.params.data);
    if(n.params.marginM!==undefined&&(!Number.isFinite(n.params.marginM)||n.params.marginM<0||n.params.marginM>2000))throw new Error('Use a 0–2,000 metre download margin.');
    if(n.params.inputMethod!==undefined&&!['osm','file'].includes(n.params.inputMethod))throw new Error('Choose OSM download or file upload.');
  }
  if(n.type==='voronoi'||n.type==='isochrone'){if(!Number.isInteger(n.params.zone)||n.params.zone<1||n.params.zone>60||!['north','south'].includes(n.params.hemisphere))throw new Error('Choose a UTM zone 1–60 and hemisphere.');}
  if(n.type==='isochrone'){const p=n.params;if(![p.minutes,p.speedMPerMin,p.bufferM,p.maxSnapM].every(Number.isFinite)||p.minutes<.1||p.minutes>60||p.speedMPerMin<1||p.speedMPerMin>200||p.bufferM<1||p.bufferM>100||p.maxSnapM<0||p.maxSnapM>1000||!['outbound','inbound'].includes(p.direction))throw new Error('Use 0.1–60 minutes, 1–200 m/min, 1–100 m buffer and 0–1,000 m snap limit.');}
  if(n.type==='isochrone'){const p=n.params;if(p.thresholds!==undefined&&(!Array.isArray(p.thresholds)||p.thresholds.length>6||p.thresholds.some((t,i,a)=>!Number.isFinite(t)||t<.1||t>60||(i>0&&t<=a[i-1]))))throw new Error('Use up to six increasing, unique time thresholds between 0.1 and 60 minutes.');if(p.fillHoles!==undefined&&typeof p.fillHoles!=='boolean')throw new Error('Invalid infill option.');}
  if(n.type==='summarize_polygons'&&(!['include','exclude'].includes(n.params.boundary)||typeof n.params.valueField!=='string'||n.params.valueField.length>100))throw new Error('Choose boundary inclusion and a numeric field name (or leave empty).');
}
export function metric(zone:number,hemisphere:string){
  const definition=`+proj=utm +zone=${zone} ${hemisphere==='south'?'+south ':''}+datum=WGS84 +units=m +no_defs`,p=proj4('EPSG:4326',definition),central=zone*6-183;
  return {crs:`EPSG:${hemisphere==='south'?32700+zone:32600+zone}`,forward:(c:Position):Position=>{if(!coordinate(c)||Math.abs(c[0]-central)>6||(hemisphere==='north'?c[1]<0:c[1]>0))throw new Error('Coordinates fall outside this prototype’s UTM zone/hemisphere guard. Choose the appropriate metric CRS.');return p.forward(c);},inverse:(c:Position):Position=>p.inverse(c)};
}
type Metric=ReturnType<typeof metric>;
const dist=(a:Position,b:Position)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function sites(input:PointCollection,max=100){if(!input?.features.length||input.features.length>max||input.features.some(f=>!f.geometry))throw new Error(`Use 1–${max} sites with known locations.`);return input.features;}
function halfPlane(ring:Position[],a:Position,b:Position){
  const normal=[b[0]-a[0],b[1]-a[1]],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],signed=(p:Position)=>(p[0]-mid[0])*normal[0]+(p[1]-mid[1])*normal[1];
  const out:Position[]=[];for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],dp=signed(p),dq=signed(q);if(dp<=0)out.push(p);if((dp<0&&dq>0)||(dp>0&&dq<0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}return out;
}
export function voronoi(input:PointCollection,area:Boundary,zone:number,hemisphere:string):Polygons{
  const fs=sites(input),m=metric(zone,hemisphere),xy=fs.map(f=>m.forward(f.geometry!.coordinates));
  for(let i=0;i<xy.length;i++)for(let j=0;j<i;j++)if(dist(xy[i],xy[j])<.001)throw new Error('Coincident sites need an explicit merge or tie policy before Voronoi.');
  const bounds=geometryBounds(area),corners=[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]]].map(m.forward);
  if(dist(corners[0],corners[2])>50000)throw new Error('Voronoi prototype reporting extent must be under 50 km across.');
  const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]),left=Math.min(...xs)-100,right=Math.max(...xs)+100,bottom=Math.min(...ys)-100,top=Math.max(...ys)+100;
  const features:Catchment[]=fs.flatMap((f,i)=>{let ring:Position[]=[[left,bottom],[right,bottom],[right,top],[left,top]];for(let j=0;j<xy.length&&ring.length;j++)if(i!==j)ring=halfPlane(ring,xy[i],xy[j]);return ring.length<3?[]:[{id:f.id,siteId:f.id,name:f.properties.name,geometry:{type:'Polygon' as const,coordinates:[[...ring,ring[0]].map(m.inverse)]}}];});
  return {features,sites:structuredClone(fs),crs:m.crs,method:'Euclidean half-plane Voronoi in WGS84 UTM; finite reporting envelope',notes:['Finite envelope only; connect Clip polygons for the exact study boundary. Cells model proximity, not actual pump use.']};
}
const multi=(b:Boundary)=>b.type==='Polygon'?[b.coordinates]:b.coordinates;
export function clipPolygons(input:Polygons,boundary:Boundary):Polygons{
  return {...structuredClone(input),boundary:structuredClone(boundary),features:input.features.flatMap(f=>{const coordinates=polygonClipping.intersection(multi(f.geometry) as ClipMultiPolygon,multi(boundary) as ClipMultiPolygon);return coordinates.length?[{...f,geometry:{type:'MultiPolygon' as const,coordinates}}]:[];}),notes:[...input.notes,'Clipped in CRS84 coordinate space; empty intersections omitted.']};
}
function partial(line:Position[],fraction:number){const lengths=line.slice(1).map((p,i)=>dist(p,line[i])),total=lengths.reduce((a,b)=>a+b,0),out=[line[0]];let remaining=total*fraction;for(let i=0;i<lengths.length;i++){if(remaining>=lengths[i]){out.push(line[i+1]);remaining-=lengths[i];}else{if(lengths[i]>0){const t=remaining/lengths[i];out.push([line[i][0]+t*(line[i+1][0]-line[i][0]),line[i][1]+t*(line[i+1][1]-line[i][1])]);}break;}}return out;}
export function isochrone(input:PointCollection,network:Network,params:WorkflowNode<'isochrone'>['params']):Polygons{
  if(params.thresholds?.length){validateCatchmentNode({id:'check',type:'isochrone',params,x:0,y:0});const results=params.thresholds.map(minutes=>isochrone(input,network,{...params,minutes,thresholds:undefined}));return {...results[0],features:results.flatMap(p=>p.features.map(f=>({...f,id:f.siteId+'-t'+f.minutes}))),method:'Cumulative network isochrones: '+params.thresholds.join(', ')+' minutes; '+params.speedMPerMin+' m/min; '+params.bufferM+' m corridor; '+params.direction,notes:[...results[0].notes,'Nested thresholds are cumulative, not disjoint time bands.']};}
  validateNetwork(network);validateCatchmentNode({id:'check',type:'isochrone',params,x:0,y:0});const fs=sites(input,10),m=metric(params.zone,params.hemisphere),coords=new Map(network.nodes.map(n=>[n.id,m.forward(n.coordinates)]));
  const edges=network.edges.map(e=>{const start=coords.get(e.from)!,end=coords.get(e.to)!;let line=e.geometry?e.geometry.map(m.forward):[start,end];if(dist(line[0],start)>dist(line.at(-1)!,start))line=line.toReversed();if(dist(line[0],start)>2||dist(line.at(-1)!,end)>2)throw new Error('Network edge geometry does not match its endpoints within 2 metres.');return params.direction==='inbound'?{from:e.to,to:e.from,lengthM:e.lengthM,line:line.toReversed()}:{...e,line};});
  const adjacency=new Map<string,typeof edges>();for(const e of edges){const list=adjacency.get(e.from)||[];list.push(e);adjacency.set(e.from,list);}
  const snaps:NonNullable<Polygons['snaps']>=[],notes=['Turf/JSTS corridor buffer in a local azimuthal equidistant projection, 8 quadrant segments. Approximate corridor polygons, not exact travel-time surfaces. Edge time uses supplied length / constant speed. No off-network connectors; snap distance is reported but not charged. Graph extent can truncate reachability. OSM snapshot is not an 1854 street reconstruction.'];
  const features=fs.map(f=>{const origin=m.forward(f.geometry!.coordinates),snap=network.nodes.reduce((a,b)=>dist(coords.get(a.id)!,origin)<=dist(coords.get(b.id)!,origin)?a:b),snapDistance=dist(coords.get(snap.id)!,origin);if(snapDistance>params.maxSnapM)throw new Error(`${f.properties.name}: nearest network node is ${Math.round(snapDistance)} m away, beyond the snap limit.`);snaps.push({siteId:f.id,nodeId:snap.id,distanceM:snapDistance});
    const budget=params.minutes*params.speedMPerMin,distances=new Map<string,number>([[snap.id,0]]),settled=new Set<string>();
    for(;;){let current:string|undefined,best=Infinity;for(const [id,d] of distances)if(!settled.has(id)&&d<best){current=id;best=d;}if(!current||best>budget)break;settled.add(current);for(const e of adjacency.get(current)||[]){const cost=best+e.lengthM;if(cost<(distances.get(e.to)??Infinity))distances.set(e.to,cost);}}
    const lines:Position[][]=[];for(const e of edges){const d=distances.get(e.from)??Infinity;if(d<budget){const line=partial(e.line,Math.min(1,(budget-d)/e.lengthM));if(line.length>1)lines.push(line.map(m.inverse));}}
    const buffered=turfBuffer(lines.length?{type:'MultiLineString',coordinates:lines}:{type:'Point',coordinates:snap.coordinates},params.bufferM,{units:'meters',steps:8});
    if(!buffered||buffered.type!=='Feature')throw new Error('Network buffer did not produce a polygon.');
    const filled=multi(buffered.geometry).map(p=>[p[0]]) as ClipPolygon[];
    const geometry:Boundary=params.fillHoles?{type:'MultiPolygon',coordinates:polygonClipping.union(filled[0],...filled.slice(1))}:buffered.geometry;
    return {id:f.id,siteId:f.id,minutes:params.minutes,name:`${f.properties.name} - ${params.minutes} min`,geometry};
  });notes.push(params.fillHoles?'Infill enabled: interior holes are filled for illustrative regions; this can include unreachable off-network locations.':'Infill disabled: corridor holes are retained.');return {features,sites:structuredClone(fs),crs:m.crs,method:`Dijkstra ${params.direction}; ${params.minutes} min; ${params.speedMPerMin} m/min; partial edges; ${params.bufferM} m corridor`,notes,snaps};
}
export function summarizePolygons(input:Polygons,points:PointCollection,params:WorkflowNode<'summarize_polygons'>['params']):Polygons{
  const features=input.features.map(f=>({...structuredClone(f),count:0,total:0,missingValues:0}));let matched=0,unmatched=0,missingLocation=0,multiple=0;
  for(const p of points.features){if(!p.geometry){missingLocation++;continue;}const hits=features.filter(f=>{const r=pointRelation(p.geometry!.coordinates,f.geometry);return r==='Inside'||params.boundary==='include'&&r==='Boundary';});if(!hits.length){unmatched++;continue;}matched++;if(hits.length>1)multiple++;for(const f of hits){f.count++;if(params.valueField){const value=p.properties[params.valueField];if(typeof value==='number'&&Number.isFinite(value))f.total+=value;else f.missingValues++;}}}
  if(features.some(f=>!Number.isFinite(f.total)))throw new Error('Numeric total overflow; review the input values.');
  return {...structuredClone(input),features,observations:structuredClone(points),summary:{records:points.features.length,matched,unmatched,missingLocation,multiple,valueField:params.valueField},notes:[...input.notes,`Boundary: ${params.boundary}. All memberships retained; ${multiple} locations have multiple memberships. Do not add overlapping catchment counts as a unique total.`]};
}
export function catchmentReceipt(node:WorkflowNode,value:Polygons|Network,runId:string,sources:string[]):Receipt{
  const operationCRS=node.type==='clip_polygons'||node.type==='summarize_polygons'?'OGC:CRS84':'features' in value?value.crs:'';
  const operationMethod=node.type==='clip_polygons'?'Polygon intersection in CRS84; empty intersections omitted':node.type==='summarize_polygons'?'Point membership in CRS84 with explicit boundary policy; all memberships retained':'features' in value?value.method:'Validated directed network input; supplied metre lengths';
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`,classes:Record<string,string>={voronoi:'VoronoiComputation',isochrone:'NetworkIsochrone',clip_polygons:'PolygonClipping',summarize_polygons:'PolygonPointSummary',network_input:'NetworkInput'};
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n'+`<${activity}> a prov:Activity, fw:${classes[node.type]}; fw:parameters ${JSON.stringify(JSON.stringify(node.type==='network_input'?{source:(value as Network).source,inputMethod:node.params.inputMethod,marginM:node.params.marginM}:node.params))}.\n<${entity}> a prov:Entity; prov:wasGeneratedBy <${activity}>.\n`;
  for(const source of sources)facts+=`<${activity}> prov:used <urn:fieldwork:run:${runId}:output:${source}>.\n`;
  if('nodes' in value)facts+=`<${entity}> fw:sourceDescription ${JSON.stringify(value.source)}; fw:networkMetadata ${JSON.stringify(JSON.stringify(value.provenance||{}))}; fw:networkNodeCount ${value.nodes.length}; fw:networkEdgeCount ${value.edges.length}.\n`;
  if('features' in value){facts+=`<${activity}> fw:computationCRS ${JSON.stringify(operationCRS)}; fw:method ${JSON.stringify(operationMethod)}; fw:caveats ${JSON.stringify(value.notes.join(' '))}.\n`;for(const f of value.features){const id=`${entity}:cell:${encodeURIComponent(f.id)}`,wkt='MULTIPOLYGON ('+multi(f.geometry).map(p=>'('+p.map(r=>'('+r.map(c=>c.join(' ')).join(', ')+')').join(', ')+')').join(', ')+')';facts+=`<${entity}> fw:member <${id}>.\n<${id}> a geo:Feature; fw:siteId ${JSON.stringify(f.siteId)}; geo:hasGeometry [ a geo:Geometry; geo:asWKT ${JSON.stringify('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> '+wkt)}^^geo:wktLiteral ].\n`;if(f.minutes!==undefined)facts+=`<${id}> fw:travelTimeMinutes ${f.minutes}.\n`;if(f.count!==undefined)facts+=`<${id}> fw:recordCount ${f.count}; fw:missingValueCount ${f.missingValues}.\n`;}if(value.summary?.valueField)for(const f of value.features)facts+=`<${entity}:cell:${encodeURIComponent(f.id)}> fw:numericTotal ${f.total}.\n`;if(value.summary)facts+=`<${entity}> fw:summary ${JSON.stringify(JSON.stringify(value.summary))}.\n`;if(value.snaps)facts+=`<${activity}> fw:networkSnaps ${JSON.stringify(JSON.stringify(value.snaps))}.\n`;}
  facts+=catchmentSemantics(node,value,entity,activity,runId);
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:operationMethod};
}
