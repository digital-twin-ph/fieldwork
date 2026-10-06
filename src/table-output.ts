import type {NodeSpec,WorkflowNode,PointInput,Escape} from './types.js';
import type {CoverageValue,TableValue,PointRow,CoverageRow,Receipt} from './results.js';
export type TableInputs={coverage:CoverageValue;points?:never}|{coverage?:undefined;points:PointInput};
import {pointLayers,layerRecords,layerSummary} from './point-layers.js';
import {attributeLiteral} from './attribute-schema.js';
import {defaultSpatialReference} from './spatial-reference.js';
import {relationLabel} from './spatial-coverage.js';
import {CRS84} from './study-area.js';

export const newTableOutput=():NodeSpec<'table_output'>=>({type:'table_output',params:{label:'Point table'}});
export function tableOutput(node:WorkflowNode<'table_output'>,inputs:TableInputs,runId:string):{value:TableValue|CoverageValue;receipt:Receipt}{
  const layers=inputs.coverage?null:pointLayers(inputs.points);
  const value:TableValue|CoverageValue=inputs.coverage?structuredClone(inputs.coverage):{
    kind:'point-table',rows:layerRecords(layers!).map(({feature,...identity})=>({...identity,name:feature.properties.name,attributes:structuredClone(feature.properties),coordinates:structuredClone(feature.geometry?.coordinates||null)})),
    pointLayers:layerSummary(layers!),spatialReference:structuredClone(layers![0]?.spatialReference||defaultSpatialReference()),centers:[],
  };
  value.pointTable=true;
  const activity=`<urn:fieldwork:run:${runId}:table:${node.id}>`,entity=`<urn:fieldwork:run:${runId}:table-result:${node.id}>`;
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n';
  facts+=`${activity} a fw:TableView, prov:Activity; prov:generated ${entity}; prov:used ${value.pointLayers.map(l=>`<urn:fieldwork:source:${l.sourceNodeId}>`).join(', ')}.\n${entity} a prov:Entity; rdfs:label ${JSON.stringify(node.params.label)}; prov:wasGeneratedBy ${activity}.\n`;
  if(inputs.coverage)facts+=`${activity} prov:wasInformedBy <urn:fieldwork:run:${runId}:coverage:${inputs.coverage.checkNodeId}>.\n`;
  else for(const row of value.rows){
    const record=`<urn:fieldwork:record:${row.sourceNodeId}:${row.recordId}>`,geometry=`<urn:fieldwork:record:${row.sourceNodeId}:${row.recordId}:geometry>`;
    facts+=`${record} a geo:Feature; rdfs:label ${JSON.stringify(row.name)}; <http://purl.org/dc/terms/isPartOf> <urn:fieldwork:source:${row.sourceNodeId}>.\n`;
    if(row.coordinates)facts+=`${record} geo:hasGeometry ${geometry}.\n${geometry} a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> POINT ('+row.coordinates.join(' ')+')')}^^geo:wktLiteral.\n`;
    for(const [key,v] of Object.entries(row.attributes))if(key!=='name')facts+=`${record} fw:attribute [ fw:fieldKey ${JSON.stringify(key)}; ${v===null?'fw:missingValue true':'<http://www.w3.org/1999/02/22-rdf-syntax-ns#value> '+attributeLiteral(v,row.attributeTypes[key])} ].\n`;
  }
  return {value,receipt:{nodeId:node.id,kind:'presentation',input:facts,facts,rules:'',conclusions:[],method:'Tabular presentation of source records; no new spatial classification or exclusion'}};
}

const display=(v:unknown)=>v===null||v===undefined?'Not supplied':String(v);
const action=(r:Partial<CoverageRow>)=>r.excluded?'Excluded':r.decision==='Review'?'Review required':r.decision==='Accept'?'Included':'';
export const TABLE_PAGE_SIZE=100,ATTRIBUTE_PAGE_SIZE=12;
export function pointTableMarkup(output:TableValue|CoverageValue,esc:Escape,{query='',page=0,attributePage=0}={}){
  const allKeys=[...new Set(output.rows.flatMap(r=>Object.keys(r.attributes).filter(k=>k!=='name')))];
  const columns=allKeys.slice(attributePage*ATTRIBUTE_PAGE_SIZE,(attributePage+1)*ATTRIBUTE_PAGE_SIZE),reviewed=output.kind==='spatial-coverage';
  const needle=query.trim().toLowerCase(),filtered=output.rows.filter((r:PointRow & Partial<CoverageRow>)=>!needle||[r.name,r.recordId,r.layerLabel,r.sourceNodeId,...(r.coordinates||[]),r.relation?relationLabel(r.relation):'',action(r),r.exclusionReason||'',...Object.values(r.attributes).map(display)].join(' ').toLowerCase().includes(needle));
  const pages=Math.max(1,Math.ceil(filtered.length/TABLE_PAGE_SIZE));page=Math.min(page,pages-1);
  const headers=['Layer','Record ID','Name','Longitude (°)','Latitude (°)',...(reviewed?['Spatial relation','Review decision','Exclusion reason']:[]),...columns];
  const shown=filtered.slice(page*TABLE_PAGE_SIZE,(page+1)*TABLE_PAGE_SIZE);
  return {
    head:headers.map(h=>`<th scope="col">${esc(h)}</th>`).join(''),
    body:shown.length?shown.map((r:PointRow & Partial<CoverageRow>)=>`<tr tabindex="0" data-place="${esc(r.id)}">${[r.layerLabel,r.recordId,r.name,...(r.coordinates||[null,null]),...(reviewed?[relationLabel(r.relation!),action(r),r.exclusionReason||null]:[]),...columns.map(k=>r.attributes[k])].map(v=>`<td>${esc(display(v))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">${output.rows.length?'No matching records.':'No point records in this input.'}</td></tr>`,
    controls:`<div class="table-page-group"><button class="button small" data-table-page="${page-1}" ${page===0?'disabled':''}>Previous rows</button><span role="status">${filtered.length?`${page*TABLE_PAGE_SIZE+1}–${Math.min((page+1)*TABLE_PAGE_SIZE,filtered.length)}`:'0'} of ${filtered.length} records</span><button class="button small" data-table-page="${page+1}" ${page+1>=pages?'disabled':''}>Next rows</button></div>${allKeys.length>ATTRIBUTE_PAGE_SIZE?`<div class="table-page-group"><button class="button small" data-table-fields="${attributePage-1}" ${attributePage===0?'disabled':''}>Previous attributes</button><span>Attributes ${attributePage*ATTRIBUTE_PAGE_SIZE+1}–${Math.min((attributePage+1)*ATTRIBUTE_PAGE_SIZE,allKeys.length)} of ${allKeys.length}</span><button class="button small" data-table-fields="${attributePage+1}" ${(attributePage+1)*ATTRIBUTE_PAGE_SIZE>=allKeys.length?'disabled':''}>Next attributes</button></div>`:''}`,
  };
}
export function pointTableEvidence(row:PointRow,dirty:boolean,esc:Escape){return `<div class="inspector-body"><span class="inspector-section">Point record ${dirty?'· previous run':''}</span><h2>${esc(row.name)}</h2><p>${esc(row.layerLabel)} · ${esc(row.recordId)}</p><p>${row.coordinates?'Longitude, latitude: '+row.coordinates.map(esc).join(', '):'No coordinates supplied'}</p><p class="muted">Source attributes; no spatial coverage decision has been made.</p>${Object.entries(row.attributes).map(([k,v])=>`<div class="detail-row"><span>${esc(k)}</span><strong>${esc(display(v))}</strong></div>`).join('')}</div>`;}
