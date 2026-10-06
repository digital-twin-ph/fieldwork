import type {PointInput,PointLayer} from './types.js';
export const MAX_POINT_LAYERS=8;
export const pointPort=(index:number)=>index===0?'points':`points_${index+1}`;
export const isPointPort=(port:string)=>port==='points'||/^points_[2-8]$/.test(port);
export function pointLayers(points:PointInput){
  const layers='layers' in points?points.layers:[points];
  if(layers.length>MAX_POINT_LAYERS||layers.reduce((sum,l)=>sum+l.features.length,0)>2000)throw new Error('Use at most 8 point layers and 2,000 records combined per operation.');
  if(new Set(layers.map(l=>l.sourceNodeId)).size!==layers.length)throw new Error('Connect each point source once per operation.');
  return layers;
}
export const recordKey=(source:string,id:string,multiple:boolean)=>multiple?`${source.length}_${source}_${id}`:id;
export const layerSummary=(layers:PointLayer[])=>layers.map(l=>({sourceNodeId:l.sourceNodeId,label:l.label||l.sourceNodeId,count:l.features.length}));
export function layerRecords(layers:PointLayer[]){return layers.flatMap(layer=>layer.features.map(feature=>({feature,id:recordKey(layer.sourceNodeId,feature.id,layers.length>1),recordId:feature.id,sourceNodeId:layer.sourceNodeId,layerLabel:layer.label||layer.sourceNodeId,attributeTypes:Object.fromEntries((layer.attributeDefinitions||[]).map(d=>[d.key,d.type]))})));}
