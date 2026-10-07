import {latLngToCell,cellToBoundary,cellToLatLng} from 'h3-js';
import type {PointCollection,PointFeature,Position,WorkflowNode} from './types.js';
import type {Polygons} from './catchments.js';
import type {Receipt} from './results.js';

export function validatePrivacyNode(node:WorkflowNode):void {
  if(node.type!=='donut_geomask'&&node.type!=='hex_aggregate')return;
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>100)throw new Error('Name the geoprivacy operation using 1–100 characters.');
  if(node.type==='donut_geomask'){
    const {innerM,outerM,seed}=node.params;
    if(!Number.isFinite(innerM)||!Number.isFinite(outerM)||innerM<0||outerM<=innerM||outerM>5000||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new Error('Use a 0–5,000 m donut with outer radius greater than inner radius and a 32-bit demonstration seed.');
  }else if(!Number.isInteger(node.params.resolution)||node.params.resolution<0||node.params.resolution>15||!Number.isInteger(node.params.minOccupancy)||node.params.minOccupancy<2||node.params.minOccupancy>100)throw new Error('Use H3 resolution 0–15 and minimum cell occupancy 2–100.');
}
function located(input:PointCollection):PointFeature[]{
  if(!input?.features?.length||input.features.some(f=>!f.geometry))throw new Error('Geoprivacy operations require 1 or more points with known coordinates. Review missing locations separately.');
  return input.features;
}
function rng(seed:number){let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
export function moveDonut(input:PointCollection,params:WorkflowNode<'donut_geomask'>['params']):PointCollection{
  validatePrivacyNode({id:'check',type:'donut_geomask',x:0,y:0,params});const random=rng(params.seed),r=6371008.8;
  return {type:'FeatureCollection',features:located(input).map((f,i)=>{
    const [longitude,latitude]=f.geometry!.coordinates,angle=2*Math.PI*random(),distance=params.innerM+(params.outerM-params.innerM)*random();
    const a=latitude*Math.PI/180,b=longitude*Math.PI/180,d=distance/r;
    const y=Math.asin(Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(angle));
    const x=b+Math.atan2(Math.sin(angle)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(y));
    return {type:'Feature' as const,id:`moved-${i+1}`,properties:{name:`Moved location ${i+1}`},geometry:{type:'Point' as const,coordinates:[((x*180/Math.PI+540)%360)-180,y*180/Math.PI]}};
  })};
}
export function aggregateHex(input:PointCollection,params:WorkflowNode<'hex_aggregate'>['params']):Polygons{
  validatePrivacyNode({id:'check',type:'hex_aggregate',x:0,y:0,params});const groups=new Map<string,number>();
  for(const f of located(input)){const [lon,lat]=f.geometry!.coordinates,id=latLngToCell(lat,lon,params.resolution);groups.set(id,(groups.get(id)||0)+1);}
  const kept=[...groups].filter(([,count])=>count>=params.minOccupancy).sort(([a],[b])=>a.localeCompare(b));
  return {kind:'hexbin',features:kept.map(([id,count])=>({id,siteId:id,name:`H3 cell ${id}`,count,geometry:{type:'Polygon',coordinates:[cellToBoundary(id,true) as Position[]]}})),sites:kept.map(([id])=>{const [lat,lon]=cellToLatLng(id);return {type:'Feature',id,properties:{name:`H3 cell ${id}`},geometry:{type:'Point',coordinates:[lon,lat]}};}),crs:'OGC:CRS84',method:`H3 cell aggregation, resolution ${params.resolution}; minimum occupancy ${params.minOccupancy}`,notes:[`${groups.size-kept.length} sparse cells omitted. Occupancy is not an anonymity guarantee.`],summary:{records:input.features.length,matched:kept.reduce((sum,[,count])=>sum+count,0),unmatched:input.features.length-kept.reduce((sum,[,count])=>sum+count,0),missingLocation:0,multiple:0,valueField:''}};
}
export function privacyReceipt(node:WorkflowNode<'donut_geomask'|'hex_aggregate'>,runId:string,sourceId:string,inputCount:number,output:PointCollection|Polygons):Receipt{
  const activity=`urn:fieldwork:run:${runId}:output:${node.id}:activity`,entity=`urn:fieldwork:run:${runId}:output:${node.id}`;
  const type=node.type==='donut_geomask'?'DonutGeomasking':'HexAggregation';
  const features=node.type==='donut_geomask'?(output as PointCollection).features:(output as Polygons).features;
  const outputCount=features.length;
  const parameters=node.type==='donut_geomask'?`fw:innerRadius [ a qudt:QuantityValue; qudt:numericValue ${node.params.innerM}; qudt:unit <http://qudt.org/vocab/unit/M> ]; fw:outerRadius [ a qudt:QuantityValue; qudt:numericValue ${node.params.outerM}; qudt:unit <http://qudt.org/vocab/unit/M> ]; fw:randomSeed ${node.params.seed}`:`fw:h3Resolution ${node.params.resolution}; fw:minimumOccupancy ${node.params.minOccupancy}`;
  let facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n<${activity}> a fw:${type}, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${sourceId}>; ${parameters}; fw:inputCount ${inputCount}; fw:outputCount ${outputCount}.\n<${entity}> a ${node.type==='donut_geomask'?'fw:MovedPointDataset':'fw:HexCellDataset'}, geo:FeatureCollection, prov:Entity; fw:recordCount ${outputCount}; prov:wasGeneratedBy <${activity}>; prov:wasDerivedFrom <urn:fieldwork:run:${runId}:output:${sourceId}>.\n`;
  for(const feature of features){const item=`${entity}:feature:${feature.id}`,geometry=`${item}:geometry`;
    const wkt=node.type==='donut_geomask'?`POINT (${(feature as PointFeature).geometry!.coordinates.join(' ')})`:`POLYGON (${(feature as Polygons['features'][number]).geometry.type==='Polygon'?(feature as Polygons['features'][number]).geometry.coordinates.map(r=>`(${r.map(c=>c.join(' ')).join(', ')})`).join(', '):''})`;
    facts+=`<${entity}> fw:member <${item}>.\n<${item}> a ${node.type==='donut_geomask'?'fw:MovedPoint':'fw:HexCell'}, geo:Feature; geo:hasGeometry <${geometry}>${node.type==='hex_aggregate'?`; fw:recordCount ${(feature as Polygons['features'][number]).count}`:''}.\n<${geometry}> a geo:Geometry; geo:asWKT ${JSON.stringify('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> '+wkt)}^^geo:wktLiteral.\n`;
  }
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:node.type==='donut_geomask'?'Reproducible educational displacement; seeded noncryptographic generator; no privacy guarantee.':'H3 aggregation with sparse-cell omission; no anonymity guarantee.'};
}
