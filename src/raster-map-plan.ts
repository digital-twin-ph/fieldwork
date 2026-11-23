/** A MAP OF RASTERS, LAYER BY LAYER, AS MANAGE LAYERS SETS IT (2026-11-22). The practitioner: "The Manage Layers of the Map
 *  configure dialog also does not seem to work. I tried to group the study areas together, and the rasters together but it
 *  did not work." Rasters were drawn from the run alone, so Manage layers' order, names, groups and switches reached none of
 *  them. Here each raster, point layer and the Map's study area is matched to its layer in that list, by its port. */
import type {WorkflowNode} from './types.js';
import {mapLayerList} from './map-layer-list.js';
import {isRasterPort,RASTER_POINT_COLOURS,type DrawnDensity,type RasterPoints,type RasterMapLayer} from './raster-panels.js';
import {isPointPort} from './point-layers.js';

const byPort=(a:string,b:string)=>a.localeCompare(b,'en',{numeric:true});
export function rasterMapPlan(result:unknown,node:WorkflowNode<'map_output'>,edges:readonly {from:string;to:string;port:string}[],
    labelOf:(id:string)=>string|undefined):RasterMapLayer[]{
  const r=result as {rasterPanels?:DrawnDensity[];rasterPoints?:RasterPoints[];rasterArea?:number[][][]};
  const panels=r.rasterPanels??[],points=r.rasterPoints??[];
  const layers=mapLayerList(node,edges,labelOf);
  // The run's panels are in the order of the raster ports, its point layers in the order of the point ports.
  const rasterPorts=edges.filter(e=>e.to===node.id&&isRasterPort(e.port)).map(e=>e.port).sort(byPort);
  const pointPorts=edges.filter(e=>e.to===node.id&&isPointPort(e.port)).map(e=>e.port).sort(byPort);
  const plan:RasterMapLayer[]=[];let pointsSeen=0;
  for(const layer of layers){
    const common={label:layer.label,drawn:layer.drawn,...(layer.group?{group:layer.group.label}:{})};
    if(layer.kind==='RasterLayer'){const panel=panels[rasterPorts.indexOf(layer.port)];if(panel)plan.push({...common,kind:'raster',panel});}
    else if(layer.kind==='PointsLayer'){const held=points[pointPorts.indexOf(layer.port)];
      if(held)plan.push({...common,kind:'points',points:held,colour:RASTER_POINT_COLOURS[pointsSeen++%RASTER_POINT_COLOURS.length]!});}
    else if(layer.kind==='AreaLayer'&&layer.port==='area'&&r.rasterArea?.length)plan.push({...common,kind:'area',outline:r.rasterArea});
  }
  // A RASTER THE LIST DOES NOT NAME (a run older than its ports) is still drawn, last, as before.
  for(const panel of panels)if(!plan.some(l=>l.kind==='raster'&&l.panel===panel))plan.push({label:panel.layer,drawn:true,kind:'raster',panel});
  return plan;
}
