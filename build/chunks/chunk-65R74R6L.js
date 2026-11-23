import{b as m,d}from"./chunk-7Z5NKNP6.js";import{m as s}from"./chunk-NZ2Z6VR2.js";var A=()=>({type:"measure_area",params:{unit:"km2"}});function v(a,e,t){let r=d(e.boundary,a.params.unit),n=`<${e.geometryId}>`,o=`<${e.areaId}>`,p=`<urn:fieldwork:run:${t}:computation:${a.id}>`,u=`<urn:fieldwork:run:${t}:measurement:${a.id}>`,i=`@prefix geo: <http://www.opengis.net/ont/geosparql#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix fw: <urn:fieldwork:>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix qudt: <http://qudt.org/schema/qudt/>.

# Computed in JavaScript; not an EYE inference.
${o} a geo:Feature, fw:StudyArea; geo:hasGeometry ${n}.
${n} a geo:Geometry;
  ${s(e.boundary)};
  geo:hasMetricArea "${r.squareMetres}"^^xsd:double.
${p} a fw:AreaComputation, prov:Activity;
  fw:studyArea ${o}; fw:inputGeometry ${n};
  prov:used ${o}, ${n}; prov:generated ${u};
  fw:method ${JSON.stringify(r.method)}.
${u} a fw:AreaMeasurement, prov:Entity, qudt:QuantityValue;
  fw:measuredGeometry ${n}; prov:wasGeneratedBy ${p};
  qudt:numericValue "${r.squareMetres}"^^xsd:double;
  qudt:unit <http://qudt.org/vocab/unit/M2>.
`,f=(e.areaFacts||"")+i;return{value:{...structuredClone(e),kind:"study-area",measurement:r,areaFacts:f},receipt:{nodeId:a.id,kind:"computation",input:i,facts:i,rules:"",conclusions:[],measurement:r,areaId:e.areaId,geometryId:e.geometryId}}}function h(a){return["Metric","Imperial"].map(e=>`<optgroup label="${e}">${Object.entries(m).filter(([,t])=>t.system===e).map(([t,r])=>`<option value="${t}" ${t===a?"selected":""}>${r.label}</option>`).join("")}</optgroup>`).join("")}export{A as a,v as b,h as c};
//# sourceMappingURL=chunk-65R74R6L.js.map
