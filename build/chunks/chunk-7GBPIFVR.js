import{b as f,d as l}from"./chunk-6VMI554J.js";import{a as d,h as m}from"./chunk-GTKU6WFB.js";import{d as s}from"./chunk-ZUGTHI7D.js";s();var v=()=>({type:"measure_area",params:{unit:"km2"}});function h(a,e,t){let r=l(e.boundary,a.params.unit),n=`<${e.geometryId}>`,o=`<${e.areaId}>`,p=`<urn:fieldwork:run:${t}:computation:${a.id}>`,u=`<urn:fieldwork:run:${t}:measurement:${a.id}>`,i=`@prefix geo: <http://www.opengis.net/ont/geosparql#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix fw: <urn:fieldwork:>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix qudt: <http://qudt.org/schema/qudt/>.

# Computed in JavaScript; not an EYE inference.
${o} a geo:Feature, fw:StudyArea; geo:hasGeometry ${n}.
${n} a geo:Geometry;
  geo:asWKT ${JSON.stringify("<"+d+"> "+m(e.boundary))}^^geo:wktLiteral;
  geo:hasMetricArea "${r.squareMetres}"^^xsd:double.
${p} a fw:AreaComputation, prov:Activity;
  fw:studyArea ${o}; fw:inputGeometry ${n};
  prov:used ${o}, ${n}; prov:generated ${u};
  fw:method ${JSON.stringify(r.method)}.
${u} a fw:AreaMeasurement, prov:Entity, qudt:QuantityValue;
  fw:measuredGeometry ${n}; prov:wasGeneratedBy ${p};
  qudt:numericValue "${r.squareMetres}"^^xsd:double;
  qudt:unit <http://qudt.org/vocab/unit/M2>.
`,c=(e.areaFacts||"")+i;return{value:{...structuredClone(e),kind:"study-area",measurement:r,areaFacts:c},receipt:{nodeId:a.id,kind:"computation",input:i,facts:i,rules:"",conclusions:[],measurement:r,areaId:e.areaId,geometryId:e.geometryId}}}function x(a){return["Metric","Imperial"].map(e=>`<optgroup label="${e}">${Object.entries(f).filter(([,t])=>t.system===e).map(([t,r])=>`<option value="${t}" ${t===a?"selected":""}>${r.label}</option>`).join("")}</optgroup>`).join("")}export{v as a,h as b,x as c};
//# sourceMappingURL=chunk-7GBPIFVR.js.map
