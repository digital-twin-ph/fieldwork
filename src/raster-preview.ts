import type {Workflow,WorkflowNode,Boundary} from './types.js';
import type {RasterGrid} from './raster.js';
import {clipRaster} from './raster.js';
import {loadRasterAsset} from './raster-workflow.js';
import {boundary as oldNalediBoundary} from '../examples/old-naledi/data.js';
import {bufferedBoundary} from './area-buffer.js';

export function previewArea(workflow:Workflow,nodeId:string):{node:WorkflowNode<'area'>;boundary:Boundary}{
  const visited=new Set<string>(),buffers:number[]=[];let id=nodeId;
  while(!visited.has(id)){
    visited.add(id);const node=workflow.nodes.find(n=>n.id===id);
    if(node?.type==='area'){
      const boundary=node.params.geometry||(node.params.source!=='drawn'?oldNalediBoundary as Boundary:null);
      if(!boundary)throw new Error('Define the connected Study area first.');
      return {node,boundary:buffers.toReversed().reduce((shape,distance)=>bufferedBoundary(shape,distance),boundary)};
    }
    if(node?.type==='buffer_area')buffers.push(node.params.distanceM);
    const edge=workflow.edges.find(e=>e.to===id&&e.port==='area');
    if(!edge)break;id=edge.from;
  }
  throw new Error('Connect a Study area to preview clipping.');
}
export async function prepareRasterPreview(workflow:Workflow,nodeId:string):Promise<RasterGrid>{
  const visited=new Set<string>();
  async function source(id:string):Promise<RasterGrid>{
    if(visited.has(id))throw new Error('Raster connections contain a cycle.');visited.add(id);
    const node=workflow.nodes.find(n=>n.id===id);
    if(node?.type==='raster_input'){
      if(!node.params.asset)throw new Error('Prepare the connected GeoTIFF input first.');
      return loadRasterAsset(node.params.asset);
    }
    if(node?.type==='clip_raster')return clipRaster(await input(id),node.params.cutline?.geometry||previewArea(workflow,id).boundary,node.params);
    throw new Error('Connect a prepared Raster input or Clip raster.');
  }
  async function input(id:string){const edge=workflow.edges.find(e=>e.to===id&&e.port==='raster');if(!edge)throw new Error('Connect a raster before previewing.');return source(edge.from);}
  return input(nodeId);
}
