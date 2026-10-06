import type {Workflow} from './types.js';
import {isRecord} from './guards.js';
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;

/** Required project inventory; availability is verified against actual bytes at transfer. */
export function projectInventory(workflow:Workflow){
  const nodes=workflow.nodes.map(node=>{
    const params=node.params as unknown as Record<string,unknown>,data=params.data;
    return {id:node.id,type:node.type,records:isRecord(data)&&Array.isArray(data.features)?data.features.map(f=>String(f.id)).sort():null,
      fields:Array.isArray(params.fields)?params.fields.map(f=>String(f.key)).sort():[],attributeRules:Array.isArray(params.attributeRules)?params.attributeRules.map(f=>String(f.key)).sort():[],
      attributeKeys:isRecord(data)&&Array.isArray(data.features)?[...new Set(data.features.flatMap(f=>Object.keys(f.properties||{})))].sort():[],
      geometry:!!params.geometry,referenceIds:(node.references||[]).map(ref=>ref.id).sort()};
  }).sort((a,b)=>compare(a.id,b.id));
  const connections=workflow.edges.map(edge=>({id:edge.id,from:edge.from,to:edge.to,port:edge.port})).sort((a,b)=>compare(a.id,b.id));
  const assets=new Map<string,{sha256:string;bytes:number;mediaType:string;references:{nodeId:string;referenceId:string;filename:string}[]}>(),links:{nodeId:string;referenceId:string;url:string}[]=[];
  for(const node of [...workflow.nodes].sort((a,b)=>compare(a.id,b.id)))for(const ref of [...node.references||[]].sort((a,b)=>compare(a.id,b.id))){
    if(ref.kind==='pdf'){const asset=assets.get(ref.sha256)||{sha256:ref.sha256,bytes:ref.bytes,mediaType:'application/pdf',references:[]};asset.references.push({nodeId:node.id,referenceId:ref.id,filename:ref.filename});assets.set(ref.sha256,asset);}
    else links.push({nodeId:node.id,referenceId:ref.id,url:ref.url});
  }
  for(const node of workflow.nodes)if(node.type==='raster_input'&&node.params.asset){const asset=node.params.asset,previous=assets.get(asset.sha256)||{sha256:asset.sha256,bytes:asset.bytes,mediaType:asset.mediaType,references:[]};previous.references.push({nodeId:node.id,referenceId:'raster-input',filename:asset.filename});assets.set(asset.sha256,previous);}
  return {nodes,connections,assets:[...assets.values()].sort((a,b)=>compare(a.sha256,b.sha256)),links};
}
export interface ProjectManifest {schema:'fieldwork/project-manifest/1';revision:number;updatedAt:string;inventory:ReturnType<typeof projectInventory>}
function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(isRecord(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
export const sameProjectManifest=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
export function assertProjectManifest(workflow:Workflow):void{
  const manifest=workflow.manifest;if(manifest===undefined)return; // Legacy projects acquire one on save.
  if(!isRecord(manifest)||manifest.schema!=='fieldwork/project-manifest/1'||!Number.isSafeInteger(manifest.revision)||manifest.revision<1||typeof manifest.updatedAt!=='string'||!Number.isFinite(Date.parse(manifest.updatedAt))||canonical(manifest.inventory)!==canonical(projectInventory(workflow)))throw new Error('Project manifest does not match its nodes, connections, records or references. Import a complete project.');
}
export function syncProjectManifest(workflow:Workflow,touch=false):void{
  const inventory=projectInventory(workflow),previous=workflow.manifest;
  if(!touch&&previous&&canonical(previous.inventory)===canonical(inventory))return;
  workflow.manifest={schema:'fieldwork/project-manifest/1',revision:(previous?.revision||0)+1,updatedAt:new Date().toISOString(),inventory};
}
