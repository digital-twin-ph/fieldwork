/** EVERYTHING WITHIN A STATED DISTANCE OF WHAT IS CONNECTED: points, lines or polygons.
 *
 *  This began as one point. The practitioner, 2026-11-23: *"The area around a point is also supposed to work for
 *  polygons and lines. We offer the preview because it's important to see the resulting picture of overlapping
 *  buffers, and the widget should offer to make a union of buffers during Apply."*
 *
 *  So the step buffers each feature that arrives and then answers one of two questions, which is the union offer:
 *
 *  - **One area** (`yields:'area'`). The buffers are dissolved into a single scope. This is what a single point has
 *    always produced, so a workflow built before this change is unchanged, and it is the only form the things that
 *    consume a scope -- the clip, the street network, the facility search -- will take.
 *  - **A polygon layer** (`yields:'polygons'`). One buffer per feature, kept apart, each named for what it was drawn
 *    around. Use it to SEE the buffers; overlaps stay visible because nothing was welded.
 *
 *  WHAT THE UNION COSTS IS STATED, not implied, the way `combined-area.ts` states it: the summed area of the parts
 *  and the area once combined, and the difference where there is one. Two buffers overlapping meant two things
 *  reached the same ground, and dissolving them erases that.
 *
 *  THE RASTER WINDOW IS STILL A COST. The single-point rule was measured on 2026-10-09: three Philippine gauges span
 *  5.1 x 9.0 degrees, which the 262,144-cell cap serves at a 1,469 m cell against 19 m for one 5 km scope. That is
 *  not a reason to refuse -- the practitioner asked for several, and a scattered scope is sometimes the question --
 *  so it is reported in the notes when the buffers are far apart, and the practitioner decides. See
 *  docs/experiments/68-area-around-a-point.md. */
import {buffer} from '@turf/buffer';
import {area as turfArea} from '@turf/area';
import * as polygonClipping from 'polyclip-ts';
import type {AreaValue,Receipt} from './results.js';
import type {Boundary,LineLayer,PointCollection,Position,WorkflowNode} from './types.js';
import type {Catchment,Polygons} from './catchments.js';
import {metric} from './catchments.js';
import {ringAreaM2} from './convex-hull.js';
import {geometryBounds,geometryByReference} from './study-area.js';
import {validateBuffer} from './area-buffer.js';

/** Turf's `steps` is per quadrant. Measured 2026-10-09 at a 5 km radius: 8 steps gives 32 vertices and 99.36% of the
 *  true circle area, 32 gives 128 vertices and 99.96%. A scope's edge decides membership, so the finer setting is
 *  used and the figure is recorded rather than implied. */
export const BUFFER_POINT_STEPS=32;
/** Beyond this the buffers are no longer one neighbourhood, and a raster window over them is coarse. Reported, never
 *  refused: see the note on the raster window above. */
export const SCATTERED_SPAN_DEGREES=1;

const text=(value:unknown)=>typeof value==='string'?value.trim():'';
type ClipPolygon=[number,number][][];
const ringsOf=(geometry:Boundary):Position[][][]=>
  geometry.type==='MultiPolygon'?geometry.coordinates as Position[][][]:[geometry.coordinates as Position[][]];

/** WHAT IS BEING BUFFERED, as one list, whatever port it arrived on. A feature keeps the name it came with, because
 *  a buffer drawn around the Kibali Mining Site is that mine's surroundings and a layer of unnamed rings is not an
 *  answer to anything. */
export interface Buffered {id:string; name:string; geometry:Boundary}
export interface BufferSource {id:string; name:string; geometry:{type:string;coordinates:unknown}}

export function featuresToBuffer(inputs:{points?:PointCollection;lines?:LineLayer;polygons?:Polygons}):BufferSource[] {
  const out:BufferSource[]=[];
  for(const f of inputs.points?.features??[])
    if(f.geometry)out.push({id:String(f.id),name:text(f.properties?.name)||String(f.id),geometry:f.geometry});
  for(const f of inputs.lines?.features??[])
    if(f.geometry)out.push({id:String(f.id),name:text(f.properties?.name)||String(f.id),geometry:f.geometry});
  for(const f of inputs.polygons?.features??[])
    if(f.geometry)out.push({id:String(f.id),name:text(f.name)||String(f.id),geometry:f.geometry as {type:string;coordinates:unknown}});
  return out;
}

/** Draft validation. A node just added has nothing connected yet and must remain addable. */
export function validateBufferPointNode(node:WorkflowNode<'buffer_point'>):void{
  validateBuffer(node.params.distanceM);
  if(node.params.yields!==undefined&&!['area','polygons'].includes(node.params.yields))
    throw new Error('Area around a point yields one area or a polygon layer.');
}

/** What must hold to run. The named feature is OPTIONAL now: empty means every feature connected, which is what
 *  several points asked for. It used to be required, and refusing with nothing named was the only behaviour a
 *  single-point step could have. */
export function requireRunnableBufferPoint(node:WorkflowNode<'buffer_point'>):void{
  validateBufferPointNode(node);
}

const bufferOne=(source:BufferSource,distanceM:number):Buffered=>{
  const result=buffer({type:'Feature',properties:{},geometry:source.geometry as never},distanceM,
    {units:'meters',steps:BUFFER_POINT_STEPS});
  if(!result||result.type!=='Feature'||!result.geometry)
    throw new Error(`"${source.name}" could not be given an area at ${distanceM} m.`);
  return {id:source.id,name:source.name,geometry:result.geometry as Boundary};
};

/** The span of everything drawn, in degrees, for the scattered-buffers note. */
export const spanOf=(geometries:readonly Boundary[]):number=>{
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const g of geometries){const [a,b,c,d]=geometryBounds(g);
    if(a<xmin)xmin=a;if(b<ymin)ymin=b;if(c>xmax)xmax=c;if(d>ymax)ymax=d;}
  return Math.max(xmax-xmin,ymax-ymin);
};

/** THE BUFFERS, AND WHAT COMBINING THEM COSTS. Dissolved in a metric projection, as `combined-area.ts` does, and
 *  reporting both areas so the overlap is a number rather than something a reader has to infer. */
export function dissolve(buffered:readonly Buffered[],zone:number,hemisphere:'north'|'south'){
  const projection=metric(zone,hemisphere);
  const project=(rings:Position[][]):ClipPolygon=>rings.map(r=>r.map(p=>projection.forward(p) as [number,number]));
  const projected=buffered.flatMap(b=>ringsOf(b.geometry).map(project));
  const combined=(projected.length===1?[projected[0]!]
    :polygonClipping.union(projected[0]!,...projected.slice(1))) as ClipPolygon[];
  const netArea=(rings:Position[][]):number=>
    rings.reduce((net,ring,i)=>net+(i===0?ringAreaM2(ring):-ringAreaM2(ring)),0);
  const partsArea=projected.reduce((total,rings)=>total+netArea(rings),0);
  const combinedM2=combined.reduce((total,rings)=>total+netArea(rings),0);
  const geometry:Boundary={type:'MultiPolygon',
    coordinates:combined.map(rings=>rings.map(r=>r.map(p=>projection.inverse(p))))};
  return {geometry,partsArea,combinedM2,overlapM2:partsArea-combinedM2,pieces:combined.length,crs:projection.crs};
}

/** The UTM zone a longitude falls in, so the dissolve has a metric projection without asking for one. The step has
 *  never had a zone setting and adding one to buffer a circle would be a question with no bearing on the answer. */
export const zoneFor=(geometries:readonly Boundary[]):{zone:number;hemisphere:'north'|'south'}=>{
  let x=0,y=0,n=0;
  for(const g of geometries){const [a,b,c,d]=geometryBounds(g);x+=(a+c)/2;y+=(b+d)/2;n++;}
  const lon=n?x/n:0,lat=n?y/n:0;
  return {zone:Math.min(60,Math.max(1,Math.floor((lon+180)/6)+1)),hemisphere:lat<0?'south':'north'};
};

/** THE STEP ITSELF. Buffers every feature connected, or the one named, and answers as a scope or as a layer. */
export function bufferFeatures(
  inputs:{points?:PointCollection;lines?:LineLayer;polygons?:Polygons},
  node:WorkflowNode<'buffer_point'>, runId:string,
):{value:AreaValue|Polygons;receipt:Receipt}{
  requireRunnableBufferPoint(node);
  const all=featuresToBuffer(inputs);
  if(!all.length)throw new Error(
    'Connect points, lines or a polygon layer: Area around a point draws its area around what is connected.');
  const wanted=text(node.params.pointId);
  // ONE NAMED FEATURE, where one is named. Matched on the id or the name, as it always was.
  const chosen=wanted?all.filter(f=>f.id===wanted||f.name===wanted):all;
  if(wanted&&!chosen.length)throw new Error(
    `Nothing called "${wanted}" is connected to Area around a point. Choose one of the ${all.length.toLocaleString('en')} `
    +'features connected, or leave it unset to draw an area around every one of them.');
  const distanceM=node.params.distanceM;
  const buffered=chosen.map(f=>bufferOne(f,distanceM));
  const span=spanOf(buffered.map(b=>b.geometry));
  if(buffered.some(b=>{const [,ymin,,ymax]=geometryBounds(b.geometry);return Math.abs(ymin)>80||Math.abs(ymax)>80;}))
    throw new Error('This prototype supports areas below 80\u00b0 latitude.');
  // THE ONE-DEGREE LIMIT IS A LIMIT ON SCOPES, NOT ON LAYERS (2026-11-23). It guards the raster window: a study area
  // windows every grid this workflow reads, and a scope spanning degrees serves cells too coarse to mean anything.
  // A polygon layer windows nothing -- it is drawn and measured against, and nothing samples a raster through it --
  // so carrying the limit over to it would refuse the question the practitioner brought: the foraging range around
  // bat sighting points across two provinces, against the miners inside it. Extending a guard past what it guards
  // is how a prototype limit becomes a wrong answer.
  if(node.params.yields!=='polygons'&&span>1)
    throw new Error(
      `The area drawn spans ${span.toFixed(2)}\u00b0, and a study area windows every raster this workflow reads, so this `
      +'prototype holds a scope to one degree. Keep the buffers as a polygon layer in Configure\u2026 to draw them at '
      +'this spread, or draw around fewer features.');
  const scattered=span>SCATTERED_SPAN_DEGREES/4&&buffered.length>1;
  const {zone,hemisphere}=zoneFor(buffered.map(b=>b.geometry));
  const said=`${distanceM.toLocaleString('en')} m`;
  const around=buffered.length===1?`"${buffered[0]!.name}"`
    :`${buffered.length.toLocaleString('en')} features`;

  if(node.params.yields==='polygons'){
    // KEPT APART, each named for what it was drawn around, so overlaps stay visible and a reader can tell which
    // buffer is whose. Nothing is welded, so nothing is lost.
    const features:Catchment[]=buffered.map(b=>({id:b.id,name:b.name,siteId:b.id,geometry:b.geometry,
      areaSquareMetres:Number(turfArea({type:'Feature',properties:{},geometry:b.geometry as never}).toFixed(2))}));
    const notes=[
      `Everything within ${said} of ${around}, as ${features.length.toLocaleString('en')} separate area${features.length===1?'':'s'}.`,
      'Kept apart, so where two overlap is where two things reach the same ground. Combine them into one area in Configure… to use this as a study area.',
      ...(scattered?[`They span ${span.toFixed(2)}° between them. A raster window over a scattered scope is coarse: the cell cap serves a wide span at a coarse cell and a single 5 km scope at about 19 m.`]:[]),
    ];
    const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:buffer`;
    const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n`
      +`<${activity}> a fw:PointBuffer, prov:Activity; fw:method "Turf local buffer, ${BUFFER_POINT_STEPS} steps per quadrant, each feature kept apart"; `
      +`fw:bufferDistance [ a qudt:QuantityValue; qudt:numericValue ${distanceM}; qudt:unit <http://qudt.org/vocab/unit/M> ].\n`
      +buffered.map(b=>`<${activity}> fw:sourceFeature ${JSON.stringify(b.name)}.\n`).join('')
      +`<${entity}> a prov:Entity; prov:wasGeneratedBy <${activity}>; fw:partCount ${features.length}.\n`;
    return {value:{features,sites:[],method:`Buffer of ${features.length} features at ${said}`,crs:'CRS84',notes},
      receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
        method:`Everything within ${said} of ${around}, kept as ${features.length} separate areas. A derived construction, not a surveyed boundary.`}};
  }

  // ONE SCOPE. Dissolved, with what the dissolve cost stated rather than implied.
  //
  // ONE FEATURE IS NOT DISSOLVED. Passing a single buffer through the union returned a MultiPolygon of one part
  // where a Polygon went in, which is a different shape for the same answer -- caught by the unit check that has
  // asserted `Polygon` since this step was one point. Nothing downstream should have to handle a wrapper that only
  // appears because the code took a general path for a particular case.
  const {geometry,partsArea,combinedM2,overlapM2,pieces,crs}=buffered.length===1
    ?{geometry:buffered[0]!.geometry,
      partsArea:turfArea({type:'Feature',properties:{},geometry:buffered[0]!.geometry as never}),
      combinedM2:turfArea({type:'Feature',properties:{},geometry:buffered[0]!.geometry as never}),
      overlapM2:0,pieces:1,crs:'CRS84'}
    :dissolve(buffered,zone,hemisphere);
  const ideal=buffered.length===1?Math.PI*distanceM*distanceM:0;
  const fraction=ideal?turfArea({type:'Feature',properties:{},geometry:geometry as never})/ideal:1;
  const areaId=`urn:fieldwork:run:${runId}:output:${node.id}`,geometryId=areaId+':geometry',activity=areaId+':pointbuffer';
  const overlapSaid=buffered.length>1
    ? ` The ${buffered.length} areas cover ${partsArea.toFixed(0)} m² between them and ${combinedM2.toFixed(0)} m² once combined`
      +(overlapM2>=1?`; ${overlapM2.toFixed(0)} m² was covered more than once, and combining them has discarded which feature reached it.`:'.')
    : '';
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`<${activity}> a fw:PointBuffer, prov:Activity; `
    +`fw:method "Turf local buffer, ${BUFFER_POINT_STEPS} steps per quadrant${buffered.length>1?`, dissolved in ${crs}`:''}"; `
    +buffered.map(b=>`fw:sourcePoint ${JSON.stringify(b.name)}; `).join('')
    +(buffered.length===1?`fw:circleAreaFraction "${fraction.toFixed(4)}"^^xsd:decimal; `:'')
    +`fw:partCount ${buffered.length}; `
    +`fw:bufferDistance [ a qudt:QuantityValue; qudt:numericValue ${distanceM}; qudt:unit <http://qudt.org/vocab/unit/M> ].\n`
    +`<${areaId}> a fw:StudyArea, geo:Feature; prov:wasGeneratedBy <${activity}>; geo:hasGeometry <${geometryId}>.\n`
    +`<${geometryId}> a geo:Geometry; ${geometryByReference(geometry)}.\n`;
  return {
    value:{kind:'study-area',boundary:geometry,areaId,geometryId,label:node.params.label,
      bounds:geometryBounds(geometry),rows:[],centers:[],spatialReference:undefined},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Everything within ${said} of ${around}`
        +(buffered.length===1?`. A derived scope, not a surveyed boundary: its edge is a decision and its radius an assumption of the question. The polygon approximates the circle with ${BUFFER_POINT_STEPS} steps per quadrant, covering ${(fraction*100).toFixed(2)}% of its area.`
          :`, dissolved into ${pieces} piece${pieces===1?'':'s'} in ${crs}.${overlapSaid}`)
        +(scattered?` They span ${span.toFixed(2)}°; a raster window over a scattered scope is coarse.`:'')},
  };
}

/** THE SINGLE-FEATURE FORM, kept because three callers and the walkthrough read it and because one point is still
 *  the common case. It is `bufferFeatures` with only the points port connected. */
export function bufferPoint(points:PointCollection,node:WorkflowNode<'buffer_point'>,runId:string):
  {value:AreaValue;receipt:Receipt}{
  const made=bufferFeatures({points},node,runId);
  return {value:made.value as AreaValue,receipt:made.receipt};
}

/** THE PICTURE THE DIALOG DRAWS, before anything is run. The practitioner, 2026-11-23: *"We offer the preview
 *  because it's important to see the resulting picture of overlapping buffers."* Same construction as the run, so
 *  what is previewed is what the step makes -- a preview computed another way is a second implementation whose
 *  disagreements nobody would see. */
export function previewBuffers(sources:readonly BufferSource[],distanceM:number,combine:boolean){
  if(!sources.length||!Number.isFinite(distanceM)||distanceM<=0)return undefined;
  let buffered:Buffered[];
  try{buffered=sources.map(f=>bufferOne(f,distanceM));}catch{return undefined;}
  const span=spanOf(buffered.map(b=>b.geometry));
  const {zone,hemisphere}=zoneFor(buffered.map(b=>b.geometry));
  const each=buffered.map(b=>({name:b.name,geometry:b.geometry,
    areaM2:turfArea({type:'Feature',properties:{},geometry:b.geometry as never})}));
  if(!combine||buffered.length<2)
    return {each,combined:undefined,span,partsArea:each.reduce((t,b)=>t+b.areaM2,0),
      overlapM2:0,pieces:each.length,crs:'CRS84'};
  const {geometry,partsArea,combinedM2,overlapM2,pieces,crs}=dissolve(buffered,zone,hemisphere);
  return {each,combined:geometry,span,partsArea,combinedM2,overlapM2,pieces,crs};
}
