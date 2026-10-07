import type {Workflow,Boundary} from './types.js';
import {DATASET} from './old-naledi.js';
import {boundary} from '../examples/old-naledi/data.js';

/** Connections are ready; raster bytes are supplied locally by the practitioner. */
export function rasterExample():Workflow{
  const source=boundary as Boundary,cutline={geometry:{type:'Polygon' as const,coordinates:structuredClone(source.type==='MultiPolygon'?source.coordinates[0]:source.coordinates)},selectionMode:'polygon' as const};
  return {
    schema:'fieldwork/workflow/1',exampleId:'raster',name:'Old Naledi · raster clipping',
    nodes:[
      {id:'area',type:'area',x:20,y:40,params:{dataset:DATASET,label:'Old Naledi'}},
      {id:'raster-input',type:'raster_input',x:310,y:190,params:{label:'WorldPop raster'}},
      {id:'raster-clip',type:'clip_raster',x:610,y:40,params:{label:'Clip to Old Naledi',method:'all-touched',marginPixels:0,cutline}},
      {id:'raster-map',type:'map_output',x:920,y:40,params:{label:'Clipped population raster',inputMode:'raster'}}
    ],
    edges:[
      {id:'area-input',from:'area',to:'raster-input',port:'area'},
      {id:'area-clip',from:'area',to:'raster-clip',port:'area'},
      {id:'input-clip',from:'raster-input',to:'raster-clip',port:'raster'},
      {id:'clip-map',from:'raster-clip',to:'raster-map',port:'raster'}
    ]
  };
}
