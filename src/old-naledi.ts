import type {Boundary,Position,Workflow,WorkflowNode,NodeDefinition,NodeType,ParamsByType,PointFeature} from './types.js';
import type {Facility,GradedFacility,AreaValue,SamplesValue,RegistryValue,GradedRegistryValue,AccessValue,Receipt,AccessRow} from './results.js';
import type {Reasoner,ReasonerQuad} from './worker-types.js';
const boundary=sourceBoundary as Boundary;
export interface OldInputs {area:AreaValue; facilities:GradedRegistryValue; samples:SamplesValue; access:AccessValue}
import {boundary as sourceBoundary,facilities,provenance} from '../examples/old-naledi/data.js';
import {validateAreaParams} from './study-area.js';
export const SOURCE='https://git.cdc.gov/digital-twin/Gaborone-TB-Agent-Based-Modeling/-/blob/7f183843075a6534b6699cd107cc74def1315bcd/';
export const DATASET='gaborone-7f183843';
export const OLD_TYPES:Record<'area'|'facilities'|'samples'|'xpert'|'access'|'access_policy'|'facility_audit',NodeDefinition>={
  area:{title:'Study area',group:'Sources',icon:'⬡',color:'blue',description:'Define the geographic extent used by your workflow',inputs:[],output:'area'},
  facilities:{title:'Facility registry',group:'Sources',icon:'⌂',color:'blue',description:'Historical Gaborone facility locations and service types',inputs:[['area','area']],output:'facilities'},
  samples:{title:'Sample locations',group:'Spatial operations',icon:'▦',color:'teal',description:'Generate demonstration points inside the study boundary',inputs:[['area','area']],output:'samples'},
  xpert:{title:'Diagnostic evidence',group:'Semantic reasoning',icon:'⋈',color:'purple',description:'Apply the NB06 evidence hierarchy with N3',inputs:[['facilities','facilities']],output:'gradedFacilities'},
  access:{title:'Facility access',group:'Spatial operations',icon:'⌁',color:'teal',description:'Find the nearest facility meeting your evidence criteria',inputs:[['samples','samples'],['facilities','gradedFacilities']],output:'access'},
  access_policy:{title:'Access review',group:'Semantic reasoning',icon:'⋈',color:'purple',description:'Classify access proxies and explicit missing evidence with N3',inputs:[['access','access']],output:'decisions'},
  facility_audit:{title:'Evidence register',group:'Summaries',icon:'☷',color:'green',description:'Inspect every candidate facility and its evidence basis',inputs:[['facilities','gradedFacilities']],output:'decisions'}
};
export function oldNalediWorkflow():Workflow{
  const node=<K extends NodeType>(id:string,type:K,x:number,y:number,params:ParamsByType[K])=>({id,type,x,y,params}) as WorkflowNode<K>;
  const edges=[['area','samples','area'],['area','facilities','area'],['facilities','xpert','facilities'],['samples','access','samples'],['xpert','access','facilities'],['access','review','access'],['xpert','audit','facilities'],['review','access-map','decisions'],['review','access-table','decisions'],['review','access-chart','decisions'],['audit','evidence-table','decisions']].map(([from,to,port],i)=>({id:`old-e${i}`,from,to,port}));
  return {schema:'fieldwork/workflow/1',exampleId:'old-naledi',name:'Old Naledi · diagnostic access',nodes:[
    node('area','area',25,140,{dataset:DATASET}),node('samples','samples',255,30,{spacingM:250}),node('facilities','facilities',255,265,{dataset:DATASET,radiusKm:6}),
    node('xpert','xpert',485,265,{}),node('access','access',715,30,{minimumEvidence:'contextual',service:'onsite',speedMPerMin:70}),
    node('review','access_policy',945,30,{thresholdMin:30}),node('audit','facility_audit',715,300,{}),
    node('access-map','output',1175,0,{label:'Access map',view:'map'}),node('access-table','output',1175,150,{label:'Access table',view:'table'}),
    node('access-chart','output',1175,300,{label:'Access zones',view:'bars'}),node('evidence-table','output',945,300,{label:'Facility evidence',view:'table'})
  ],edges};
}
export function validateOldNode(n:WorkflowNode){
  const range=(key:string,value:number,min:number,max:number)=>{if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${key} must be between ${min} and ${max}.`);};
  if(n.type==='area'&&n.params.source==='drawn')validateAreaParams(n.params);
  else if((n.type==='area'||n.type==='facilities')&&(!('dataset' in n.params)||n.params.dataset!==DATASET))throw new Error('Unknown Old Naledi dataset version.');
  if(n.type==='facilities')range('radiusKm',n.params.radiusKm,1,15);
  if(n.type==='samples')range('spacingM',n.params.spacingM,150,1000);
  if(n.type==='access_policy')range('thresholdMin',n.params.thresholdMin,0,120);
  if(n.type==='access'){
    range('speedMPerMin',n.params.speedMPerMin,30,120);
    if(!['direct','contextual','inferential'].includes(n.params.minimumEvidence)||!['onsite','anyKnown'].includes(n.params.service))throw new Error('Invalid facility evidence or service filter.');
  }
}
export function inBoundary(point:Position,geometry:Boundary=boundary){
  const ringContains=(ring:Position[])=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;};
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.some(rings=>ringContains(rings[0])&&!rings.slice(1).some(ringContains));
}
function extent(g:Boundary){const pts=g.type==='MultiPolygon'?g.coordinates.flat(2):g.coordinates.flat();return [Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];}
export function sampleLocations(geometry:Boundary,spacingM:number){
  const [x0,y0,x1,y1]=extent(geometry),dy=spacingM/111195,dx=dy/Math.cos((y0+y1)/2*Math.PI/180),points=[];
  if(Math.ceil((x1-x0)/dx)*Math.ceil((y1-y0)/dy)>10000)throw new Error('This study area needs too many grid cells. Reduce its extent or increase sample spacing.');
  for(let y=y0+dy/2;y<y1;y+=dy)for(let x=x0+dx/2;x<x1;x+=dx){if(inBoundary([x,y],geometry)){if(points.length>=2000)throw new Error('At most 2,000 sample locations are supported. Increase sample spacing.');points.push({id:`sample-${points.length+1}`,name:`Sample ${points.length+1}`,coordinates:[x,y]});}}
  return points;
}
const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';
const refs={Direct:'Baik 2019; Mokomane 2024. Named Princess Marina Hospital evidence in NB06.',Contextual:'Mokomane 2024; Dickinson 2017. Hospital-type inference in NB06.',Inferential:'Dickinson 2017; Mokomane 2024. General clinic inference in NB06.',None:'No facility-specific or applicable type-based evidence in NB06.'};
export function facilityN3(items:Facility[]){
  const facts=items.map(f=>{
    const named=f.name==='Princess Marina Hospital'?'Marina':f.name==='Broadhurst II Clinic'?'Broadhurst':'None';
    const kind=['Referral Hospital','District Hospital','Primary Hospital'].includes(f.serviceType)?'Hospital':['Poly Clinic','Clinic with Maternity','Clinic'].includes(f.serviceType)?'Clinic':f.serviceType==='Health Post'?'HealthPost':'Other';
    return `fw:${f.id} fw:namedRule fw:${named}; fw:government ${f.owner==='GOVERNMENT'}; fw:facilityKind fw:${kind}.`;
  }).join('\n');
  const rules=`# NB06 hierarchy: named evidence, then government facility type, then unknown.
{ ?f fw:namedRule fw:Marina. } => { ?f fw:evidenceLevel fw:Direct; fw:service fw:Onsite. }.
{ ?f fw:namedRule fw:Broadhurst. } => { ?f fw:evidenceLevel fw:Contextual; fw:service fw:OnsiteOrReferral. }.
{ ?f fw:namedRule fw:None; fw:government true; fw:facilityKind fw:Hospital. } => { ?f fw:evidenceLevel fw:Contextual; fw:service fw:Onsite. }.
{ ?f fw:namedRule fw:None; fw:government true; fw:facilityKind fw:Clinic. } => { ?f fw:evidenceLevel fw:Inferential; fw:service fw:OnsiteOrReferral. }.
{ ?f fw:namedRule fw:None; fw:government true; fw:facilityKind fw:HealthPost. } => { ?f fw:evidenceLevel fw:Inferential; fw:service fw:ReferralOnly. }.
{ ?f fw:namedRule fw:None; fw:government false. } => { ?f fw:evidenceLevel fw:None; fw:service fw:Unknown. }.
{ ?f fw:namedRule fw:None; fw:government true; fw:facilityKind fw:Other. } => { ?f fw:evidenceLevel fw:None; fw:service fw:Unknown. }.
`;
  return {facts:prefix+facts,rules:prefix+rules,input:prefix+facts+'\n'+rules};
}
function assertion<T extends string>(quads:ReasonerQuad[],id:string,predicate:string,allowed:readonly T[]):T{
  const terms=[...new Set(quads.filter(q=>q.subject==='urn:fieldwork:'+id&&q.predicate==='urn:fieldwork:'+predicate).map(q=>q.object.replace('urn:fieldwork:','')))];
  if(terms.length!==1||!allowed.some(term=>term===terms[0]))throw new Error(`Missing or conflicting ${predicate} assertion for ${id}.`);
  return terms[0] as T;
}
export const tierLabel=(t:string)=>(({Direct:'Direct',Contextual:'Contextual',Inferential:'Inferential',None:'No evidence'} as Record<string,string>)[t]||t);
export const serviceLabel=(t:string)=>(({Onsite:'Onsite',OnsiteOrReferral:'Onsite or referral',ReferralOnly:'Referral only',Unknown:'Unknown'} as Record<string,string>)[t]||t);
export const zoneLabel=(z:string)=>(({Within5:'≤ 5 min',Within15:'5–15 min',Within30:'15–30 min',Over30:'> 30 min',Unknown:'Unknown'} as Record<string,string>)[z]||z);
export function accessN3(rows:AccessRow[],threshold:number){
  const facts=rows.map(r=>`fw:${r.id} fw:accessKnown ${r.minutes!==null}.${r.minutes===null?'':`\nfw:${r.id} fw:proxyMinutes ${r.minutes.toFixed(9)}.`}`).join('\n');
  const rules=`# Proxy access review; not a clinical recommendation or routed travel time.
{ ?p fw:accessKnown false. } => { ?p fw:decision fw:Unknown; fw:zone fw:Unknown. }.
{ ?p fw:proxyMinutes ?m. ?m math:greaterThan ${threshold.toFixed(9)}. } => { ?p fw:decision fw:Review. }.
{ ?p fw:proxyMinutes ?m. ?m math:notGreaterThan ${threshold.toFixed(9)}. } => { ?p fw:decision fw:NoFlag. }.
{ ?p fw:proxyMinutes ?m. ?m math:notGreaterThan 5. } => { ?p fw:zone fw:Within5. }.
{ ?p fw:proxyMinutes ?m. ?m math:greaterThan 5; math:notGreaterThan 15. } => { ?p fw:zone fw:Within15. }.
{ ?p fw:proxyMinutes ?m. ?m math:greaterThan 15; math:notGreaterThan 30. } => { ?p fw:zone fw:Within30. }.
{ ?p fw:proxyMinutes ?m. ?m math:greaterThan 30. } => { ?p fw:zone fw:Over30. }.
`;
  return {facts:prefix+facts,rules:prefix+rules,input:prefix+facts+'\n'+rules};
}
export async function executeOldNode(node:WorkflowNode,inputs:OldInputs,reasoner:Reasoner,receipts:Receipt[],distanceKm:(a:Position,b:Position)=>number){
  switch(node.type){
    case 'area':return {boundary:structuredClone(boundary),dataset:DATASET,provenance:structuredClone(provenance)};
    case 'samples':return {...inputs.area,rows:sampleLocations(inputs.area.boundary,node.params.spacingM),spacingM:node.params.spacingM};
    case 'facilities':{
      const [x0,y0,x1,y1]=extent(inputs.area.boundary),origin=[(x0+x1)/2,(y0+y1)/2];
      return {...inputs.area,facilities:facilities.filter(f=>f.coordinates&&distanceKm(origin,f.coordinates)<=node.params.radiusKm).map(f=>({...f})),radiusKm:node.params.radiusKm};
    }
    case 'xpert':{
      const n3=facilityN3(inputs.facilities.facilities),conclusions=await reasoner(n3.input);
      receipts.push({nodeId:node.id,source:SOURCE+'06-Gaborone-Health-Facilities.ipynb',...n3,conclusions});
      return {...inputs.facilities,facilities:inputs.facilities.facilities.map(f=>{
        const tier=assertion(conclusions,f.id,'evidenceLevel',['Direct','Contextual','Inferential','None']);
        const service=assertion(conclusions,f.id,'service',['Onsite','OnsiteOrReferral','ReferralOnly','Unknown']);
        return {...f,tier,service,reference:f.name==='Broadhurst II Clinic'?'Hamda 2020. Named contextual evidence in NB06.':f.serviceType==='Health Post'?'NB06 assumption: expected specimen referral; no facility-specific evidence.':refs[tier]};
      })};
    }
    case 'access':{
      const rank={Direct:3,Contextual:2,Inferential:1,None:0},minimum={direct:3,contextual:2,inferential:1}[node.params.minimumEvidence];
      const eligible=inputs.facilities.facilities.filter(f=>rank[f.tier]>=minimum&&(node.params.service==='onsite'?f.service==='Onsite':f.service!=='Unknown'));
      const rows=inputs.samples.rows.map((point):AccessRow=>{
        let center:GradedFacility|null=null,distance:number|null=null;for(const f of eligible){const d=distanceKm(point.coordinates,f.coordinates);if(distance===null||d<distance){center=f;distance=d;}}
        return {...point,center,distanceKm:distance,minutes:distance===null?null:distance*1000/node.params.speedMPerMin};
      });
      return {...inputs.samples,kind:'access' as const,rows,eligibleCount:eligible.length,candidateCount:inputs.facilities.facilities.length,filters:{...node.params},centers:eligible.map((f):PointFeature=>({type:'Feature',id:f.id,properties:{name:f.name},geometry:{type:'Point',coordinates:f.coordinates}})),method:'Straight-line distance / walking speed; not street routing',source:SOURCE,dataset:DATASET};
    }
    case 'access_policy':{
      const n3=accessN3(inputs.access.rows,node.params.thresholdMin),conclusions=await reasoner(n3.input);receipts.push({nodeId:node.id,...n3,conclusions});
      return {...inputs.access,thresholdMin:node.params.thresholdMin,rows:inputs.access.rows.map(r=>{
        const status=assertion(conclusions,r.id,'decision',['Review','NoFlag','Unknown']),zone=assertion(conclusions,r.id,'zone',['Within5','Within15','Within30','Over30','Unknown']);
        return {...r,status,zone,explanation:r.minutes===null?'No facility meets the selected evidence and service criteria within the candidate search area. Access remains unknown.':`${r.center!.name}: ${r.distanceKm!.toFixed(2)} km straight-line, or ${r.minutes.toFixed(1)} proxy minutes at ${inputs.access.filters.speedMPerMin} m/min. ${tierLabel(r.center!.tier)} evidence; ${serviceLabel(r.center!.service).toLowerCase()}. Review threshold: ${node.params.thresholdMin} minutes.`};
      })};
    }
    case 'facility_audit':return {kind:'facility-evidence' as const,boundary:inputs.facilities.boundary,dataset:DATASET,provenance:structuredClone(provenance),source:SOURCE,centers:[],rows:inputs.facilities.facilities.map(f=>({...f,status:f.tier==='Direct'?'NoFlag' as const:f.tier==='None'?'Unknown' as const:'Review' as const,distanceKm:null,explanation:f.reference}))};
    default:throw new Error('Unsupported Old Naledi node.');
  }
}
