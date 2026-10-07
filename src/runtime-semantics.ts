import registry from '../widgets/registry.json';
import type {WorkflowNode} from './types.js';
import type {Receipt} from './results.js';
import {attributeLiteral} from './attribute-schema.js';

/** Explicit bindings to receipt writers, not a parser or runtime version dispatcher. */
export function receiptActivities(node:WorkflowNode,runId:string):string[]{
  const base=`urn:fieldwork:run:${runId}:`,id=node.id;
  if(['network_input','voronoi','isochrone','clip_polygons','summarize_polygons'].includes(node.type))return [base+'output:'+id+':activity'];
  if(node.type==='donut_geomask'||node.type==='hex_aggregate')return [base+'output:'+id+':activity'];
  if(node.type==='compare_point_sets')return [base+'output:'+id+':activity'];
  if(node.type==='mean_center')return [base+'output:'+id+':activity'];
  if(node.type==='comparison_map')return [base+'output:'+id+':view'];
  if(node.type==='buffer_area')return [base+'output:'+id+':buffer'];
  if(node.type==='raster_input'||node.type==='clip_raster')return [base+'raster:'+id];
  if(node.type==='measure_area')return [base+'computation:'+id];
  if(node.type==='coverage_check')return [base+'coverage:'+id];
  if(node.type==='samples')return [base+'grid:'+id];
  if(node.type==='facilities')return [base+'selection:'+id];
  if(['map_output','table_output','chart_output'].includes(node.type)&&'inputMode' in node.params&&node.params.inputMode==='polygons')return [base+'output:'+id+':view'];
  if(node.type==='chart_output')return [base+'view:'+id];
  if(node.type==='map_output'||node.type==='table_output')return [base+(node.params.inputMode==='decisions'||node.params.inputMode==='raster'?'view:':node.type==='map_output'?'map:':'table:')+id];
  return [];
}

export function runtimeBindingN3(node:WorkflowNode,runId:string,receipts:Receipt[]):string{
  const base=`urn:fieldwork:run:${runId}:`,plan=`<${base}plan:${node.id}>`,step=`<${base}step:${node.id}>`,output=`<${base}output:${node.id}>`;
  const entry=registry.widgets.find(w=>w.nodeType===node.type)!;
  const release=entry.releases.find(r=>r.version===entry.currentVersion)!;
  let facts=`${plan} a fw:WorkflowNodePlan; fw:widget <${entry.id}>; fw:nodeType ${JSON.stringify(node.type)}; fw:catalogVersion ${JSON.stringify(entry.currentVersion)}; fw:catalogDigest ${JSON.stringify(release.sha256)}.\n<${entry.id}> a fw:WidgetDefinition.\n${step} a fw:WorkflowStep; fw:resultEntity ${output}.\n`;
  // Catalog versions describe the bundle's current descriptors, not selected old executables.
  for(const receipt of receipts.filter(r=>r.nodeId===node.id))for(const activity of receiptActivities(node,runId))facts+=`${step} fw:receiptActivity <${activity}>.\n<${activity}> a prov:Activity; fw:workflowNode ${plan}.\n`;
  if(node.type==='observations'||node.type==='places'||node.type==='centers'){
    facts+=`${plan} a fw:GenericInputConfiguration.\n${step} a fw:PointInput.\n${output} a fw:PointDataset, geo:FeatureCollection; prov:wasGeneratedBy ${step}; fw:recordCount ${node.params.data.features.length}.\n`;
    const definitions=node.type==='observations'?[...(node.params.fields||[]),...(node.params.attributeRules||[])]:[];
    if(node.type==='observations'&&node.params.sourceInfo)facts+=`${output} fw:sourceMetadata ${JSON.stringify(JSON.stringify(node.params.sourceInfo))}.\n`;
    for(const f of node.params.data.features){const record=`<${base}output:${node.id}:record:${encodeURIComponent(f.id)}>`;
      facts+=`${output} fw:member ${record}.\n${record} a geo:Feature; dcterms:identifier ${JSON.stringify(f.id)}; dcterms:title ${JSON.stringify(f.properties.name)}; dcterms:isPartOf ${output}; fw:missingLocation ${!f.geometry}.\n`;
      if(f.geometry)facts+=`${record} geo:hasGeometry [ a geo:Geometry; geo:asWKT ${JSON.stringify('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT ('+f.geometry.coordinates.join(' ')+')')}^^geo:wktLiteral ].\n`;
      for(const [key,value] of Object.entries(f.properties))if(key!=='name')facts+=`${record} fw:attribute [ fw:fieldKey ${JSON.stringify(key)}; ${value===null?'fw:missingValue true':'rdf:value '+attributeLiteral(value,definitions.find(d=>d.key===key)?.type)} ].\n`;
    }
  }
  return facts;
}
