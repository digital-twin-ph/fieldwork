import type {NodeSpec,WorkflowNode,PointInput,Escape,SpatialRelation} from './types.js';
import {GEOSPARQL_PREDICATE} from './spatial-predicates.js';
import {resolveLayerSymbol,fillClass,SPATIAL_RELATION_FILL,MARK_VOCABULARY,categoricalSteps,type LayerSymbol} from './presentation.js';
import type {AreaValue,MapValue,MapRow,Receipt} from './results.js';
export type MapInputs={area:AreaValue;points:PointInput};
import {pointRelation,relationLabel} from './spatial-coverage.js';
import {CRS84,geometryWKT} from './study-area.js';
import {pointLayers,layerRecords,layerSummary} from './point-layers.js';

export const newMapOutput=():NodeSpec<'map_output'>=>({type:'map_output',params:{label:'Map'}});
export function mapOutput(node:WorkflowNode<'map_output'>,inputs:MapInputs,runId:string):{value:MapValue;receipt?:Receipt}{
  const area=inputs.area,layers=pointLayers(inputs.points);
  // THE PIN CLASS EACH RECORD CARRIES, where its layer has a class field. Read from the attribute
  // the practitioner nominated, never guessed from a property name -- the same rule the polygon
  // layer's naming property follows. A record whose class attribute is absent or blank has no
  // class, which is a different thing from having one called "".
  const classField=node.params.pinClassField||{};
  const pinClassOf=(source:string,properties:Record<string,unknown>):string|undefined=>{
    const key=classField[source]?.trim();
    if(!key)return undefined;
    const held=properties[key];
    if(held===undefined||held===null||String(held).trim()==='')return undefined;
    return String(held).trim();
  };
  const rows=layerRecords(layers).map(({feature:f,...identity}):MapRow=>{const relation=pointRelation(f.geometry?.coordinates,area.boundary);const pinClass=pinClassOf(identity.sourceNodeId,f.properties);return {...identity,name:f.properties.name,attributes:structuredClone(f.properties),coordinates:f.geometry?.coordinates||null,relation,...(pinClass?{pinClass}:{}),fill:fillClass(SPATIAL_RELATION_FILL,relation),status:relation==='Outside'?'Review':relation==='MissingLocation'?'Unknown':'NoFlag'};});
  const activity=`<urn:fieldwork:run:${runId}:map:${node.id}>`;

  // POINTS A CLIP SET ASIDE are drawn, not received. A `clip_points_to_area` step upstream passes
  // on only what is in the area and carries what it excluded; the map adds those as rows so they
  // appear in the colour it already uses for Outside, which is how a practitioner sees whether
  // the clip threw away a cluster across one border or a scatter in every direction. They are
  // marked, so nothing reads them as records the workflow holds.
  for(const layer of layers){
    const carried=(layer as unknown as {excludedPoints?:{id:string;properties:{name?:string};geometry?:{coordinates:number[]}}[]}).excludedPoints;
    for(const feature of carried||[])
      rows.push({sourceNodeId:layer.sourceNodeId,recordId:String(feature.id),id:`excluded_${layer.sourceNodeId}_${feature.id}`,
        name:feature.properties?.name||'(unnamed)',attributes:{...feature.properties,excludedByArea:true},
        coordinates:feature.geometry?.coordinates||null,
        // An unplaceable record is not outside the area: it is a record nobody could locate,
        // and saying 'Outside' about it would be a claim the data does not support.
        relation:feature.geometry?'Outside':'MissingLocation',
        fill:fillClass(SPATIAL_RELATION_FILL,feature.geometry?'Excluded':'MissingLocation'),excludedByArea:true} as unknown as MapRow);
  }
  let facts=(area.areaFacts||'')+'@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'+
    `${activity} a fw:MapView, prov:Activity; prov:used <${area.areaId}>${layers.map(l=>`, <urn:fieldwork:source:${l.sourceNodeId}>`).join('')}.\n`+
    `<${area.areaId}> a geo:Feature; geo:hasGeometry <${area.geometryId}>.\n<${area.geometryId}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(area.boundary))}^^geo:wktLiteral.\n`;
  for(const row of rows){const record=`<urn:fieldwork:record:${row.sourceNodeId}:${row.recordId}>`,shape=`<urn:fieldwork:record:${row.sourceNodeId}:${row.recordId}:geometry>`;
    facts+=`${record} a geo:Feature; <http://purl.org/dc/terms/isPartOf> <urn:fieldwork:source:${row.sourceNodeId}>; fw:spatialRelation fw:${row.relation}.\n`;
    if(row.coordinates)facts+=`${record} geo:hasGeometry ${shape}; geo:${GEOSPARQL_PREDICATE[row.relation as Exclude<SpatialRelation,'MissingLocation'>]} <${area.areaId}>.\n${shape} a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> POINT ('+row.coordinates.join(' ')+')')}^^geo:wktLiteral.\n`;
  }
  // The symbol each layer is drawn with, resolved HERE so the plot, the interactive map, the
  // legend and the receipt all read one answer. A practitioner's choice wins; a layer they have
  // not chosen for takes the one its position gives it.
  const layerSymbols=Object.fromEntries(layers.map((layer,index)=>
    [layer.sourceNodeId,resolveLayerSymbol(index,node.params.layerSymbols?.[layer.sourceNodeId])]));
  const layerNames=Object.fromEntries(layers.map(layer=>[layer.sourceNodeId,layer.label||layer.sourceNodeId]));
  // ONE SYMBOL PER CLASS, resolved here so the interactive map, the plot, the layer control and
  // the key all read one answer -- the same reason the per-layer symbols are resolved here.
  //
  // Hues come from the categorical palette, which returns null past its length: more classes than
  // distinct hues is not a classed figure, and repeating one would assert a grouping nobody made.
  // Past that the layer keeps its own single symbol and the classes live in the popups, which is
  // what a reader can still check.
  const pinClasses=Object.fromEntries(layers.flatMap(layer=>{
    const field=classField[layer.sourceNodeId]?.trim();
    if(!field)return [];
    const seen:string[]=[];
    for(const row of rows)
      if(row.sourceNodeId===layer.sourceNodeId&&row.pinClass&&!seen.includes(row.pinClass))
        seen.push(row.pinClass);
    if(!seen.length)return [];
    const hues=categoricalSteps(seen.length);
    if(!hues)return [];
    const shape=layerSymbols[layer.sourceNodeId]?.shape;
    return [[layer.sourceNodeId,seen.map((value,index)=>
      ({value,colour:hues[index],shape}))] as const];
  }));
  return {value:{...structuredClone(area),kind:'spatial-map',rows,centers:[],pointLayers:layerSummary(layers),layerSymbols,layerNames,
    ...(Object.keys(pinClasses).length?{pinClasses}:{}),markHalo:node.params.markHalo!==false,fillEncoding:SPATIAL_RELATION_FILL,sourceNodeId:layers.length===1?layers[0].sourceNodeId:null},receipt:{nodeId:node.id,kind:'computation',input:facts,facts,rules:'',conclusions:[],method:'Turf point-in-polygon for display; no acceptance or exclusion decision'}};
}
export function mapEvidence(row:MapRow,dirty:boolean,esc:Escape){return `<div class="inspector-body"><span class="inspector-section">Map record ${dirty?'· previous run':''}</span><h2>${esc(row.name)}</h2><p class="muted">${esc(row.layerLabel)} · record ${esc(row.recordId)}</p><div class="source-card"><h3>${esc(relationLabel(row.relation))}</h3><p>${row.coordinates?row.coordinates.map(v=>v.toFixed(6)).join(', '):'No coordinates supplied; this record cannot be plotted.'}</p></div><p class="description">Outside the boundary is a spatial mismatch, not proof of a data-quality problem. Connect Check spatial coverage to this Map for exclusion and boundary-review actions.</p>${Object.entries(row.attributes).map(([key,value])=>`<div class="detail-row"><span>${esc(key)}</span><strong>${esc(value===null?'Not supplied':value)}</strong></div>`).join('')}</div>`;}
