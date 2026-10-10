import type {WorkflowNode} from './types.js';
import type {Catchment,Polygons} from './catchments.js';
import type {Receipt} from './results.js';

/** Several polygon layers collected into one, with nothing merged.
 *
 *  `summarize_combined_area` unions: it answers "is anywhere covered" and discards what
 *  distinguished the parts. This keeps them. The isochrone rings need that — four nested
 *  bands unioned are one blob the size of the largest, and the walking times are gone.
 *
 *  Ordered largest area first, so the smaller bands draw on top of the larger. The case
 *  study does the same thing by iterating `sorted(trip_times, reverse=True)`; ordering by
 *  area rather than by time generalises it to layers that are not bands.
 *
 *  Numbered ports, following `point-layers.ts`: `polygons`, `polygons_2` and so on. Six,
 *  because `isochrone` accepts at most six thresholds. */

export const MAX_POLYGON_LAYERS=6;
export const polygonPort=(index:number)=>index===0?'polygons':`polygons_${index+1}`;
export const isPolygonPort=(port:string)=>port==='polygons'||/^polygons_[2-6]$/.test(port);

export function validateStackNode(node:WorkflowNode<'stack_polygons'>):void{
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the collection using 1–60 characters.');
}

/** Approximate ring area in square degrees, for ordering only.
 *
 *  Degrees are not an area, which is why nothing is reported from this — it decides draw
 *  order and nothing else. `summarize_hull` and `summarize_combined_area` take a zone
 *  because they *report* areas; this one does not, so it does not ask for one. */
const ringExtent=(f:Catchment):number=>{
  const rings=f.geometry.type==='MultiPolygon'?f.geometry.coordinates.flat():f.geometry.coordinates;
  let extent=0;
  for(const ring of rings){
    let twice=0;
    for(let i=0;i<ring.length-1;i++)twice+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
    extent+=Math.abs(twice/2);
  }
  return extent;
};

export function stackPolygons(
  layers:Polygons[], node:WorkflowNode<'stack_polygons'>, runId:string, sourceNodeIds:string[],
):{value:Polygons;receipt:Receipt}{
  validateStackNode(node);
  if(!layers.length)throw new Error('Connect at least one polygon layer to collect.');
  if(layers.length>MAX_POLYGON_LAYERS)
    throw new Error(`Collect at most ${MAX_POLYGON_LAYERS} polygon layers at once.`);
  const crs=new Set(layers.map(l=>l.crs));
  if(crs.size>1)
    throw new Error(`These layers were computed in different coordinate systems (${[...crs].join(', ')}). Collecting them would put incomparable geometry in one layer.`);
  const features=layers.flatMap(l=>l.features)
    .map(f=>({...structuredClone(f)}))
    .sort((a,b)=>ringExtent(b)-ringExtent(a));
  if(!features.length)throw new Error('These layers hold no polygons.');
  const ids=new Set(features.map(f=>f.id));
  if(ids.size!==features.length)
    throw new Error('Two polygons share an identifier, so they cannot be told apart once collected. Label the sources differently.');
  const withMinutes=features.filter(f=>f.minutes!==undefined).length;
  const notes=[
    `${features.length} polygon${features.length===1?'':'s'} collected from ${layers.length} layer${layers.length===1?'':'s'}, largest first so smaller ones draw on top.`,
    'Nothing is merged. Overlapping polygons stay separate and a location inside several of them belongs to all of them, which is what lets a summary count memberships.',
    ...(withMinutes===features.length&&withMinutes>1
      ?[`All ${withMinutes} carry a travel time, so these are nested bands: each contains every shorter one. A count per band is cumulative, and the difference between neighbouring bands is what falls between them.`]
      :[]),
    ...layers.flatMap(l=>l.notes).filter((n,i,a)=>a.indexOf(n)===i),
  ];
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:stack>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:PolygonCollection, prov:Activity; `
    +`fw:layerCount ${layers.length}; `
    +`fw:polygonCount ${features.length}; `
    +`fw:bandedPolygonCount ${withMinutes}; `
    +`fw:drawOrder "largest area first"; `
    +sourceNodeIds.map(id=>`prov:used <urn:fieldwork:run:${runId}:${id}>`).join('; ')+`.\n`;
  return {value:{features,sites:layers.flatMap(l=>l.sites),
    method:`Collected ${layers.length} polygon layers without merging; ordered largest first`,
    crs:[...crs][0],notes,siteSourceNodeId:layers[0].siteSourceNodeId},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Collection of ${layers.length} polygon layers, ${features.length} polygons, largest first. ${notes.slice(1).join(' ')}`}};
}
