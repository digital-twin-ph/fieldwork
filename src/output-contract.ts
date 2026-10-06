import type {Workflow,WorkflowNode} from './types.js';
import type {DisplayValue,Receipt} from './results.js';

/** Preserve scientific payloads while replacing legacy visual-output configurations. */
export function migrateOutputNodes(workflow:Workflow):void{
  workflow.nodes=workflow.nodes.map(node=>{
    if(!node||node.type!=='output'||!node.params)return node;
    const view=node.params.view??'map';
    if(!['map','table','bars'].includes(view))throw new Error('Visual outputs must use a map, table, or bar chart.');
    if(node.params.label!==undefined&&(typeof node.params.label!=='string'||node.params.label.length>60))throw new Error('Output names must be text of at most 60 characters.');
    if(view==='bars')return {...node,type:'chart_output',params:{label:node.params.label||`Chart · ${node.id}`.slice(0,60)}};
    return {...node,type:view==='map'?'map_output':'table_output',params:{label:node.params.label||`${view==='map'?'Map':'Table'} · ${node.id}`.slice(0,60),inputMode:'decisions'}};
  });
}

export function decisionPresentation(node:WorkflowNode<'map_output'|'table_output'>,input:DisplayValue,sourceNodeId:string,runId:string):{value:DisplayValue;receipt:Receipt}{
  if(!input||!Array.isArray(input.rows)||!Array.isArray(input.centers))throw new Error('Connect a supported reasoning result to this output.');
  const activity=`<urn:fieldwork:run:${runId}:view:${node.id}>`,source=`<urn:fieldwork:run:${runId}:output:${sourceNodeId}>`,result=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'+
    `${activity} a fw:${node.type==='map_output'?'MapView':'TableView'}, prov:Activity; prov:used ${source}.\n${result} a prov:Entity; prov:wasGeneratedBy ${activity}; prov:wasDerivedFrom ${source}.\n`;
  return {value:structuredClone(input),receipt:{nodeId:node.id,kind:'presentation',facts,rules:'',input:facts,conclusions:[],method:input.raster?'Present native raster cell values and boundary without resampling or new inference.':'Present existing decisions and evidence without recomputing, filtering or reclassifying records.'}};
}
