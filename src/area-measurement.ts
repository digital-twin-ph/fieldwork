import type {NodeSpec, WorkflowNode, AreaUnit} from './types.js';
import type {AreaValue,Receipt} from './results.js';
import {calculateArea,formatArea,AREA_UNITS,validateAreaUnit} from './area-computation.js';
import {CRS84,geometryWKT} from './study-area.js';
export {formatArea,AREA_UNITS,validateAreaUnit};
export const newAreaMeasurement=():NodeSpec<'measure_area'>=>({type:'measure_area',params:{unit:'km2'}});
export function measureArea(node:WorkflowNode<'measure_area'>,source:AreaValue,runId:string):{value:AreaValue;receipt:Receipt}{
  const measurement=calculateArea(source.boundary,node.params.unit);
  const shape=`<${source.geometryId}>`,feature=`<${source.areaId}>`;
  const activity=`<urn:fieldwork:run:${runId}:computation:${node.id}>`,entity=`<urn:fieldwork:run:${runId}:measurement:${node.id}>`;
  const facts=`@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n\n# Computed in JavaScript; not an EYE inference.\n${feature} a geo:Feature, fw:StudyArea; geo:hasGeometry ${shape}.\n${shape} a geo:Geometry;\n  geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(source.boundary))}^^geo:wktLiteral;\n  geo:hasMetricArea "${measurement.squareMetres}"^^xsd:double.\n${activity} a fw:AreaComputation, prov:Activity;\n  fw:studyArea ${feature}; fw:inputGeometry ${shape};\n  prov:used ${feature}, ${shape}; prov:generated ${entity};\n  fw:method ${JSON.stringify(measurement.method)}.\n${entity} a fw:AreaMeasurement, prov:Entity, qudt:QuantityValue;\n  fw:measuredGeometry ${shape}; prov:wasGeneratedBy ${activity};\n  qudt:numericValue "${measurement.squareMetres}"^^xsd:double;\n  qudt:unit <http://qudt.org/vocab/unit/M2>.\n`;
  // Enrich a copy of the same study area; sibling branches keep their input snapshot.
  const areaFacts=(source.areaFacts||'')+facts;
  return {value:{...structuredClone(source),kind:'study-area',measurement,areaFacts},receipt:{nodeId:node.id,kind:'computation',input:facts,facts,rules:'',conclusions:[],measurement,areaId:source.areaId,geometryId:source.geometryId}};
}
export function areaUnitOptions(selected:AreaUnit){return ['Metric','Imperial'].map(system=>`<optgroup label="${system}">${Object.entries(AREA_UNITS).filter(([,v])=>v.system===system).map(([key,v])=>`<option value="${key}" ${key===selected?'selected':''}>${v.label}</option>`).join('')}</optgroup>`).join('');}
