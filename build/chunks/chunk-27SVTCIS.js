import{b as m,d as f}from"./chunk-RYI6BBCP.js";import{a as s,h as d}from"./chunk-TYIWYWGA.js";var g=()=>({type:"measure_area",params:{unit:"km2"}});function A(a,e,t){let r=f(e.boundary,a.params.unit),n=`<${e.geometryId}>`,o=`<${e.areaId}>`,p=`<urn:fieldwork:run:${t}:computation:${a.id}>`,u=`<urn:fieldwork:run:${t}:measurement:${a.id}>`,i=`@prefix geo: <http://www.opengis.net/ont/geosparql#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix fw: <urn:fieldwork:>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix qudt: <http://qudt.org/schema/qudt/>.

# Computed in JavaScript; not an EYE inference.
${o} a geo:Feature, fw:StudyArea; geo:hasGeometry ${n}.
${n} a geo:Geometry;
  geo:asWKT ${JSON.stringify("<"+s+"> "+d(e.boundary))}^^geo:wktLiteral;
  geo:hasMetricArea "${r.squareMetres}"^^xsd:double.
${p} a fw:AreaComputation, prov:Activity;
  fw:studyArea ${o}; fw:inputGeometry ${n};
  prov:used ${o}, ${n}; prov:generated ${u};
  fw:method ${JSON.stringify(r.method)}.
${u} a fw:AreaMeasurement, prov:Entity, qudt:QuantityValue;
  fw:measuredGeometry ${n}; prov:wasGeneratedBy ${p};
  qudt:numericValue "${r.squareMetres}"^^xsd:double;
  qudt:unit <http://qudt.org/vocab/unit/M2>.
`,l=(e.areaFacts||"")+i;return{value:{...structuredClone(e),kind:"study-area",measurement:r,areaFacts:l},receipt:{nodeId:a.id,kind:"computation",input:i,facts:i,rules:"",conclusions:[],measurement:r,areaId:e.areaId,geometryId:e.geometryId}}}function v(a){return["Metric","Imperial"].map(e=>`<optgroup label="${e}">${Object.entries(m).filter(([,t])=>t.system===e).map(([t,r])=>`<option value="${t}" ${t===a?"selected":""}>${r.label}</option>`).join("")}</optgroup>`).join("")}export{g as a,A as b,v as c};
//# sourceMappingURL=chunk-27SVTCIS.js.map
