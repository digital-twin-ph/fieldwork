import type {NodeSpec,WorkflowNode,PointInput,Escape,SpatialRelation} from './types.js';
import type {AreaValue,CoverageValue,MapValue,MapRow,Receipt} from './results.js';
export type MapInputs={coverage:CoverageValue;area?:never;points?:never}|{coverage?:undefined;area:AreaValue;points:PointInput};
import {pointRelation,relationLabel} from './spatial-coverage.js';
import {CRS84,geometryWKT} from './study-area.js';
import {pointLayers,layerRecords,layerSummary} from './point-layers.js';

export const newMapOutput=():NodeSpec<'map_output'>=>({type:'map_output',params:{label:'Study area and points'}});
export function mapOutput(node:WorkflowNode<'map_output'>,inputs:MapInputs,runId:string):{value:MapValue|CoverageValue;receipt?:Receipt}{
  // A reviewed input already includes the area, points and explicit decisions.
  if(inputs.coverage){const activity=`<urn:fieldwork:run:${runId}:map:${node.id}>`,source=`<urn:fieldwork:run:${runId}:output:${inputs.coverage.checkNodeId}>`,output=`<urn:fieldwork:run:${runId}:output:${node.id}>`;const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n${activity} a fw:MapView, prov:Activity; prov:used ${source}.\n${output} a prov:Entity; prov:wasGeneratedBy ${activity}; prov:wasDerivedFrom ${source}.\n`;return {value:structuredClone(inputs.coverage),receipt:{nodeId:node.id,kind:'presentation',facts,input:facts,rules:'',conclusions:[],method:'Display existing coverage decisions without reclassification.'}};}
  const area=inputs.area,layers=pointLayers(inputs.points);
  const rows=layerRecords(layers).map(({feature:f,...identity}):MapRow=>{const relation=pointRelation(f.geometry?.coordinates,area.boundary);return {...identity,name:f.properties.name,attributes:structuredClone(f.properties),coordinates:f.geometry?.coordinates||null,relation,status:relation==='Outside'?'Review':relation==='MissingLocation'?'Unknown':'NoFlag'};});
  const activity=`<urn:fieldwork:run:${runId}:map:${node.id}>`;
  let facts=(area.areaFacts||'')+'@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'+
    `${activity} a fw:MapView, prov:Activity; prov:used <${area.areaId}>${layers.map(l=>`, <urn:fieldwork:source:${l.sourceNodeId}>`).join('')}.\n`+
    `<${area.areaId}> a geo:Feature; geo:hasGeometry <${area.geometryId}>.\n<${area.geometryId}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(area.boundary))}^^geo:wktLiteral.\n`;
  for(const row of rows){const record=`<urn:fieldwork:record:${row.sourceNodeId}:${row.recordId}>`,shape=`<urn:fieldwork:record:${row.sourceNodeId}:${row.recordId}:geometry>`;
    facts+=`${record} a geo:Feature; <http://purl.org/dc/terms/isPartOf> <urn:fieldwork:source:${row.sourceNodeId}>; fw:spatialRelation fw:${row.relation}.\n`;
    if(row.coordinates)facts+=`${record} geo:hasGeometry ${shape}; geo:${{Inside:'sfWithin',Boundary:'sfTouches',Outside:'sfDisjoint'}[row.relation as Exclude<SpatialRelation,'MissingLocation'>]} <${area.areaId}>.\n${shape} a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> POINT ('+row.coordinates.join(' ')+')')}^^geo:wktLiteral.\n`;
  }
  return {value:{...structuredClone(area),kind:'spatial-map',rows,centers:[],pointLayers:layerSummary(layers),sourceNodeId:layers.length===1?layers[0].sourceNodeId:null},receipt:{nodeId:node.id,kind:'computation',input:facts,facts,rules:'',conclusions:[],method:'Turf point-in-polygon for display; no acceptance or exclusion decision'}};
}
export function mapEvidence(row:MapRow,dirty:boolean,esc:Escape){return `<div class="inspector-body"><span class="inspector-section">Map record ${dirty?'· previous run':''}</span><h2>${esc(row.name)}</h2><p class="muted">${esc(row.layerLabel)} · record ${esc(row.recordId)}</p><div class="source-card"><h3>${esc(relationLabel(row.relation))}</h3><p>${row.coordinates?row.coordinates.map(v=>v.toFixed(6)).join(', '):'No coordinates supplied; this record cannot be plotted.'}</p></div><p class="description">Outside the boundary is a spatial mismatch, not proof of a data-quality problem. Connect Check spatial coverage to this Map for exclusion and boundary-review actions.</p>${Object.entries(row.attributes).map(([key,value])=>`<div class="detail-row"><span>${esc(key)}</span><strong>${esc(value===null?'Not supplied':value)}</strong></div>`).join('')}</div>`;}
