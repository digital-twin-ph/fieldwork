import type {WorkflowNode,NodeSpec,Workflow,PointInput,PointFeature,Position,SpatialRelation,ParamsByType} from './types.js';
import type {AreaValue,CoverageValue,CoverageRow,Receipt} from './results.js';
import type {Reasoner} from './worker-types.js';
import {pointRelation} from './spatial-predicates.js';
import {bboxPolygon,CRS84} from './study-area.js';
import {pointLayers,layerRecords,layerSummary,recordKey} from './point-layers.js';
import {attributeLiteral} from './attribute-schema.js';
export {pointRelation};
export const newObservations=():NodeSpec<'observations'>=>({type:'observations',params:{label:'Point observations',data:{type:'FeatureCollection' as const,features:[]}}});
export const newCoverageCheck=():NodeSpec<'coverage_check'>=>({type:'coverage_check',params:{exclusions:[]}});
export const featureSignature=(f:PointFeature)=>JSON.stringify([f.id,f.properties,f.geometry?.coordinates||null]);
export const relationLabel=(r:SpatialRelation)=>({Inside:'Inside',Boundary:'On boundary',Outside:'Outside study area',MissingLocation:'Missing coordinates'}[r]);
export function validateCoverageParams(p:ParamsByType['coverage_check']){
  if(!Array.isArray(p.exclusions)||p.exclusions.length>2000)throw new Error('Invalid spatial coverage exclusions.');
  const keys=new Set();for(const e of p.exclusions){
    if(!e||!(['sourceNodeId','featureId'] as const).every(k=>typeof e[k]==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(e[k]))||typeof e.signature!=='string'||e.signature.length>60000||typeof e.reason!=='string'||!e.reason.trim()||e.reason.length>300)throw new Error('An exclusion needs its source, record snapshot and a reason (1–300 characters).');
    const key=e.sourceNodeId+':'+e.featureId;if(keys.has(key))throw new Error('Duplicate record exclusion.');keys.add(key);
  }
}
export function coverageFacts(node:WorkflowNode<'coverage_check'>,area:AreaValue,points:PointInput,runId:string){
  const activity=`<urn:fieldwork:run:${runId}:coverage:${node.id}>`;
  const layers=pointLayers(points);
  const rows=layerRecords(layers).map(({feature:f,...identity})=>{
    const exclusion=node.params.exclusions.find(e=>e.sourceNodeId===identity.sourceNodeId&&e.featureId===f.id&&e.signature===featureSignature(f));
    return {...identity,name:f.properties.name,attributes:structuredClone(f.properties),coordinates:f.geometry?.coordinates||null,relation:pointRelation(f.geometry?.coordinates,area.boundary),excluded:!!exclusion,exclusionReason:exclusion?.reason||'',signature:featureSignature(f),iri:`urn:fieldwork:record:${identity.sourceNodeId}:${f.id}`};
  });
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n';
  let facts=prefix+`\n${activity} a fw:SpatialCoverageCheck, prov:Activity;\n  fw:studyArea <${area.areaId}>; fw:inputGeometry <${area.geometryId}>;\n  prov:used <${area.areaId}>${layers.map(l=>`, <urn:fieldwork:source:${l.sourceNodeId}>`).join('')}.\n`;
  for(const r of rows){
    const iri=`<${r.iri}>`;
    facts+=`${activity} fw:checkedRecord ${iri}.\n${iri} a geo:Feature; rdfs:label ${JSON.stringify(r.name)}; <http://purl.org/dc/terms/isPartOf> <urn:fieldwork:source:${r.sourceNodeId}>; fw:spatialRelation fw:${r.relation}; fw:excluded ${r.excluded}.\n`;
    if(r.excluded)facts+=`${iri} fw:exclusionReason ${JSON.stringify(r.exclusionReason)}.\n`;
    for(const [key,value] of Object.entries(r.attributes)){if(key==='name')continue;facts+=`${iri} fw:attribute [ fw:fieldKey ${JSON.stringify(key)}; ${value===null?'fw:missingValue true':'<http://www.w3.org/1999/02/22-rdf-syntax-ns#value> '+attributeLiteral(value,r.attributeTypes[key])} ].\n`;}
    if(r.coordinates){const shape=`<${r.iri}:geometry>`,relation={Inside:'sfWithin',Boundary:'sfTouches',Outside:'sfDisjoint'}[r.relation as Exclude<SpatialRelation,'MissingLocation'>];facts+=`${iri} geo:hasGeometry ${shape}; geo:${relation} <${area.areaId}>.\n${shape} a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> POINT ('+r.coordinates.join(' ')+')')}^^geo:wktLiteral.\n`;}
  }
  const rules=`# Point relations are computed locally. Boundary points are included by policy.\n{ ?r fw:excluded true. } => { ?r fw:coverageDecision fw:Excluded. }.\n{ ?r fw:excluded false; fw:spatialRelation fw:Inside. } => { ?r fw:coverageDecision fw:Accept. }.\n{ ?r fw:excluded false; fw:spatialRelation fw:Boundary. } => { ?r fw:coverageDecision fw:Accept. }.\n{ ?r fw:excluded false; fw:spatialRelation fw:Outside. } => { ?r fw:coverageDecision fw:Review. }.\n{ ?r fw:excluded false; fw:spatialRelation fw:MissingLocation. } => { ?r fw:coverageDecision fw:Review. }.\n{ ?activity fw:checkedRecord ?r. ?r fw:coverageDecision fw:Review. } => { ?activity fw:requiresReview true. }.\n`;
  facts=(area.areaFacts||'')+facts;
  return {rows,facts,rules:prefix+rules,input:facts+'\n'+rules};
}
export async function checkCoverage(node:WorkflowNode<'coverage_check'>,area:AreaValue,points:PointInput,reasoner:Reasoner,runId:string):Promise<{value:CoverageValue;receipt:Receipt}>{
  const n3=coverageFacts(node,area,points,runId),conclusions=await reasoner(n3.input);
  const rows=n3.rows.map((r):CoverageRow=>{const decisions=conclusions.filter(q=>q.subject===r.iri&&q.predicate==='urn:fieldwork:coverageDecision').map(q=>q.object.replace('urn:fieldwork:',''));if(new Set(decisions).size!==1||!['Accept','Review','Excluded'].includes(decisions[0]))throw new Error(`Coverage rule did not classify ${r.name} consistently.`);return {...r,decision:decisions[0] as CoverageRow['decision'],status:decisions[0]==='Accept'?'NoFlag':decisions[0]==='Review'?'Review':'Unknown'};});
  const reviewCount=rows.filter(r=>r.decision==='Review').length,excludedCount=rows.filter(r=>r.decision==='Excluded').length;
  const layers=pointLayers(points),byRecord=new Map(rows.map(r=>[r.id,r]));
  const retainedLayers=layers.map(l=>({sourceNodeId:l.sourceNodeId,label:l.label||l.sourceNodeId,data:{type:'FeatureCollection' as const,features:l.features.filter(f=>!byRecord.get(recordKey(l.sourceNodeId,f.id,layers.length>1))!.excluded).map(f=>structuredClone(f))}}));
  const value:CoverageValue={...area,kind:'spatial-coverage',rows,centers:[],checkNodeId:node.id,areaNodeId:area.areaId.split(':').at(-1)!,sourceNodeId:layers.length===1?layers[0].sourceNodeId:null,pointLayers:layerSummary(layers),reviewCount,excludedCount,canProceed:rows.length>0&&reviewCount===0&&rows.length>excludedCount,retainedLayers,retainedData:{type:'FeatureCollection',features:retainedLayers.flatMap(l=>l.data.features.map(f=>({...f,id:recordKey(l.sourceNodeId,f.id,layers.length>1)})))}};
  return {value,receipt:{nodeId:node.id,facts:n3.facts,rules:n3.rules,input:n3.input,conclusions,exclusions:structuredClone(node.params.exclusions),method:'Turf 7.3.5 point-in-polygon; CRS84; boundary included; no tolerance buffer'}};
}
export function coverageExercise():Workflow{
  const feature=(id:string,name:string,coordinates:Position|null):PointFeature=>({type:'Feature',id,properties:{name},geometry:coordinates?{type:'Point',coordinates}:null});
  return {schema:'fieldwork/workflow/1',exampleId:'coverage',name:'Spatial coverage · synthetic exercise',nodes:[
    {id:'scope',type:'area',x:40,y:40,params:{source:'drawn',label:'Illustrative Old Naledi study box',selectionMode:'bbox',geometry:bboxPolygon(25.89,-24.7,25.91,-24.68)}},
    {id:'observations',type:'observations',x:40,y:230,params:{label:'Synthetic coverage records',data:{type:'FeatureCollection' as const,features:[feature('inside','Inside example',[25.9,-24.69]),feature('edge','Boundary example',[25.91,-24.69]),feature('outside','Outside example',[25.92,-24.69]),feature('missing','Missing-location example',null)]}}},
    {id:'coverage',type:'coverage_check',x:380,y:120,params:{exclusions:[]}}
  ],edges:[{id:'scope-link',from:'scope',to:'coverage',port:'area'},{id:'points-link',from:'observations',to:'coverage',port:'points'}]};
}
