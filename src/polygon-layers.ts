import type {Catchment,Polygons} from './catchments.js';

/** A MAP'S POLYGON LAYERS (2026-11-13). Map takes polygon layers as it takes point layers, one port each: `polygons`,
 *  `polygons_2` and so on, six at most. Collect polygon layers did this as a widget of its own between the layers and the
 *  map, and the practitioner retired it: *"we can connect polygon layers directly to the Map output"*
 *  (docs/audits/collect-polygon-layers-retired.md).
 *
 *  Collected as that widget collected them, because a map draws one polygon value: nothing merged, each feature keeping
 *  its layer's name so the layer list shows each layer, and the larger drawn first so the smaller draw on top. */
export const MAX_POLYGON_LAYERS=6;
export const polygonPort=(index:number)=>index===0?'polygons':`polygons_${index+1}`;
export const isPolygonPort=(port:string)=>port==='polygons'||/^polygons_[2-6]$/.test(port);

/** Approximate ring area in square degrees, for draw order only: nothing is reported from it. */
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

/** Several polygon layers as the one value a map draws. `names` names each layer where its features carry no name. */
export function collectPolygonLayers(layers:Polygons[],names:string[]=[]):Polygons{
  const present=layers.filter(Boolean);
  if(!present.length)throw new Error('No polygon layer reached the map.');
  const crs=new Set(present.map(l=>l.crs));
  if(crs.size>1)
    throw new Error(`These polygon layers were computed in different coordinate systems (${[...crs].join(', ')}). Drawn together they would not line up.`);
  // A SHARED IDENTIFIER IS MADE DISTINCT, not refused: two files numbered feature-1, feature-2 … are two layers, and a map
  // that would not draw them together would be refusing nothing but a coincidence of numbering.
  const seen=new Set<string>();
  const features=present.flatMap((l,index)=>l.features.map(f=>{
    const id=seen.has(String(f.id))?`${index+1}:${f.id}`:String(f.id);seen.add(id);
    return {...structuredClone(f),id,layerName:f.layerName??l.layerName??names[index]??`Layer ${index+1}`};
  })).sort((a,b)=>ringExtent(b)-ringExtent(a));
  const notes=[`${features.length} polygon${features.length===1?'':'s'} from ${present.length} layers, drawn largest first so smaller ones show on top; nothing is merged.`,
    ...present.flatMap(l=>l.notes??[]).filter((n,i,a)=>a.indexOf(n)===i)];
  // WHAT THE SHADE IS, where every layer says the same: four sources' "% within source" are one quantity.
  const valueNames=[...new Set(present.map(l=>l.valueName?.trim()).filter(Boolean))];
  return {features,sites:present.flatMap(l=>l.sites??[]),method:[...new Set(present.map(l=>l.method).filter(Boolean))].join('; '),
    ...(valueNames.length===1&&present.every(l=>l.valueName?.trim())?{valueName:valueNames[0]}:{}),
    crs:[...crs][0],notes,...(present[0]!.siteSourceNodeId?{siteSourceNodeId:present[0]!.siteSourceNodeId}:{})};
}
