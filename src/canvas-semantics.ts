import {HOST_REGISTRY} from './pack-catalog.js';
import type {Workflow} from './types.js';
import registry from '../widgets/registry.json';

/** Draft plans are RDF, but are never represented as executed evidence. */
export function canvasN3(workflow:Workflow):string {
  const id=(value:string)=>`<urn:fieldwork:canvas:node:${encodeURIComponent(value)}>`;
  let text='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dct: <http://purl.org/dc/terms/>.\n';
  for(const node of workflow.nodes){
    const entry=registry.widgets.find(w=>w.nodeType===node.type);
    if(!entry)throw new Error(`No semantic widget registration for ${node.type}`);
    const release=entry.releases.find(r=>r.version===entry.currentVersion)!;
    text+=`${id(node.id)} a fw:CanvasNodePlan, prov:Plan; dct:identifier ${JSON.stringify(node.id)}; fw:nodeType ${JSON.stringify(node.type)}; fw:widget <${entry.id}>; fw:catalogVersion ${JSON.stringify(entry.currentVersion)}; fw:catalogDigest ${JSON.stringify(release.sha256)}; fw:widgetDefinitionSource ${JSON.stringify(HOST_REGISTRY)}; fw:configuration ${JSON.stringify(JSON.stringify(node.params))}.\n<${entry.id}> a fw:WidgetDefinition.\n`;
  }
  for(const edge of workflow.edges)text+=`<urn:fieldwork:canvas:edge:${encodeURIComponent(edge.id)}> a fw:CanvasConnection; fw:fromPlan ${id(edge.from)}; fw:toPlan ${id(edge.to)}; fw:inputPort ${JSON.stringify(edge.port)}.\n`;
  return text;
}
