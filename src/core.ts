import {loadRaster,clipRaster,rasterReceipt,validateRasterAsset} from './raster-workflow.js';
import {projectFiles} from './project-files.js';
import type {RasterGrid} from './raster.js';
import {chartOutput} from './chart-output.js';
import {assertProjectManifest,syncProjectManifest} from './project-manifest.js';
import {migrateOutputNodes,decisionPresentation} from './output-contract.js';
import {referencedPDFs,evidenceProvenance} from './evidence.js';
import type {Workflow,WorkflowNode,NodeDefinition,NodeType,PortType,PointFeature,PointCollection,Position,ParamsByType,PointInput,Scalar} from './types.js';
import type {Reasoner} from './worker-types.js';
import type {AreaValue,CoverageValue,DisplayValue,WorkflowRun,Output,Receipt,NearestRow,Status} from './results.js';
import type {OldInputs} from './old-naledi.js';
import {isRecord,required} from './guards.js';
interface ExecutionInputs extends OldInputs {raster:RasterGrid;coverage?:CoverageValue;places:PointCollection;centers:PointCollection;distances:{rows:NearestRow[];centers:PointFeature[];method:string};alert:ParamsByType['alert'];decisions:DisplayValue}
import {OLD_TYPES,validateOldNode,executeOldNode,migrateFacilitySources} from './old-naledi.js';
import {studyAreaN3,geometryBounds} from './study-area.js';
import {measureArea,validateAreaUnit} from './area-measurement.js';
import {checkCoverage,validateCoverageParams} from './spatial-coverage.js';
import {mapOutput} from './map-output.js';
import {tableOutput} from './table-output.js';
import {MAX_POINT_LAYERS,pointPort,isPointPort} from './point-layers.js';
import {validateAttributeSchema} from './attribute-schema.js';
import {defaultSpatialReference,validateSpatialReference} from './spatial-reference.js';
export const NS = 'urn:fieldwork:';
export const TYPES:Record<NodeType,NodeDefinition> = {
  raster_input:{title:'Raster input',group:'Sources',icon:'▦',color:'blue',description:'Acquire a GeoTIFF window around the study area',inputs:[['area','area']],output:'raster'},
  clip_raster:{title:'Clip raster',group:'Spatial operations',icon:'✂',color:'teal',description:'Mask raster cells with the study polygon',inputs:[['area','area'],['raster','raster']],output:'raster'},
  places: {title:'Neighborhoods', group:'Sources', icon:'▦', color:'blue', description:'Local neighborhood locations', inputs:[], output:'points'},
  centers: {title:'Cooling centers', group:'Sources', icon:'⌂', color:'blue', description:'Local facility locations', inputs:[], output:'points'},
  alert: {title:'Heat alert', group:'Sources', icon:'☀', color:'amber', description:'Assessment context', inputs:[], output:'alert'},
  nearest: {title:'Nearest center', group:'Spatial operations', icon:'⌁', color:'teal', description:'Calculate straight-line distance', inputs:[['places','points'],['centers','points']], output:'distances'},
  policy: {title:'Outreach criteria', group:'Semantic reasoning', icon:'⋈', color:'purple', description:'Apply N3 rules with EYE-JS', inputs:[['distances','distances'],['alert','alert']], output:'decisions'},
  ...OLD_TYPES,
  measure_area:{title:'Calculate area',group:'Spatial operations',icon:'▱',color:'teal',description:'Attach an area measurement to the study area',inputs:[['area','area']],output:'area'},
  observations:{title:'Input data',group:'Sources',icon:'▦',color:'blue',description:'Import point observations or generate synthetic records',inputs:[],output:'points'},
  coverage_check:{title:'Check spatial coverage',group:'Semantic reasoning',icon:'◎',color:'purple',description:'Identify observations outside the study boundary',inputs:[['area','area'],['points','points']],output:'coverage-check'},
  map_output:{title:'Map',group:'Outputs',icon:'◈',color:'green',description:'Display the study polygon and points, including outside records',inputs:[['area','area'],['points','points'],['coverage','coverage-check'],['raster','raster']],output:null},
  table_output:{title:'Table',group:'Outputs',icon:'☷',color:'green',description:'Display point coordinates, attributes and available review decisions',inputs:[['points','points'],['coverage','coverage-check']],output:null},
  chart_output:{title:'Chart',group:'Outputs',icon:'▥',color:'green',description:'Count reasoning results by decision, access zone or evidence tier',inputs:[['decisions','decisions']],output:null},
  output: {title:'Visual output', group:'Outputs', icon:'◈', color:'green', description:'Display results as a map, table, or bar chart', inputs:[['decisions','decisions']], output:null}
};
const point = (id:string,name:string,coordinates:Position|null|undefined):PointFeature => ({type:'Feature',id,properties:{name},geometry: coordinates ? {type:'Point',coordinates} : null});
export function nodeInputs(node:WorkflowNode):[string,PortType][]{
  if(node.type==='map_output'&&node.params.inputMode==='raster')return [['raster','raster']];
  if((node.type==='map_output'||node.type==='table_output')&&node.params.inputMode==='decisions')return [['decisions','decisions']];
  if(node.type!=='map_output'&&node.type!=='table_output'&&node.type!=='coverage_check')return TYPES[node.type].inputs;
  return [...(node.type==='table_output'?[]:[['area','area']]),...Array.from({length:node.params.pointInputCount??1},(_,i)=>[pointPort(i),'points']),...(['map_output','table_output'].includes(node.type)?[['coverage','coverage-check']]:[]),...(node.type==='map_output'?[['raster','raster']]:[])] as [string,PortType][];
}
export function exampleWorkflow():Workflow {
  return {schema:'fieldwork/workflow/1',name:'Heat outreach screening',nodes:[
    {id:'neighborhoods',type:'observations',x:35,y:52,params:{label:'Neighborhoods',data:{type:'FeatureCollection',features:[point('oakwood','Oakwood',[-84.455,33.873]),point('northgate','Northgate',[-84.337,33.875]),point('riverside','Riverside',[-84.438,33.812]),point('midtown','Midtown',[-84.37,33.79]),point('eastfield','Eastfield',[-84.277,33.795]),point('brookside','Brookside',[-84.421,33.734]),point('southpark','South Park',[-84.34,33.72]),point('cedar','Cedar Heights',null)]}}},
    {id:'centers',type:'observations',x:35,y:229,params:{label:'Cooling centers',data:{type:'FeatureCollection',features:[point('library','Central Library',[-84.367,33.79]),point('community','West Community Hall',[-84.426,33.823])]}}},
    {id:'nearest',type:'nearest',x:323,y:90,params:{}},
    {id:'alert',type:'alert',x:323,y:284,params:{active:true,date:'2026-07-15'}},
    {id:'criteria',type:'policy',x:605,y:151,params:{thresholdKm:5}},
    {id:'map',type:'map_output',x:879,y:70,params:{label:'Outreach map',inputMode:'decisions'}},
    {id:'table',type:'table_output',x:879,y:249,params:{label:'Decision table',inputMode:'decisions'}}
  ],edges:[
    {id:'e1',from:'neighborhoods',to:'nearest',port:'places'}, {id:'e2',from:'centers',to:'nearest',port:'centers'},
    {id:'e3',from:'nearest',to:'criteria',port:'distances'}, {id:'e4',from:'alert',to:'criteria',port:'alert'},
    {id:'e5',from:'criteria',to:'map',port:'decisions'},
    {id:'e6',from:'criteria',to:'table',port:'decisions'}]};
}
export function validateGeoJSON(data:unknown,{attributes=false}={}):PointCollection {
  if (!isRecord(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length > 2000) throw new Error('Use a GeoJSON FeatureCollection with at most 2,000 point features.');
  const ids = new Set();
  return {type:'FeatureCollection',features:data.features.map((feature,i)=>{
    if (!isRecord(feature)||feature.type !== 'Feature') throw new Error(`Record ${i+1} is not a Feature.`);
    const id = String(feature.id ?? `point-${i+1}`);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new Error('Feature IDs must be unique letters, numbers, hyphens, or underscores (max 80).');
    ids.add(id);
    const g = feature.geometry;
    if(feature.properties!==undefined&&feature.properties!==null&&!isRecord(feature.properties))throw new Error('Invalid point properties.');
    if (g !== null && (!isRecord(g) || g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2 || !g.coordinates.slice(0,2).every(Number.isFinite) || Math.abs(g.coordinates[0]) > 180 || Math.abs(g.coordinates[1]) > 90)) throw new Error(`Invalid point coordinates for ${id}. Use longitude, latitude in CRS84, or null for a missing location.`);
    const normalized=point(id,String(feature.properties?.name ?? id).slice(0,100),g===null?null:(g as {coordinates:number[]}).coordinates.slice(0,2));
    if(attributes){const entries=Object.entries(feature.properties||{});if(entries.length>50||entries.some(([key,value])=>!key||key.length>100||['__proto__','constructor','prototype'].includes(key)||!(value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=1000||typeof value==='number'&&Number.isFinite(value))))throw new Error('Use at most 50 scalar attributes per record, with text up to 1,000 characters.');normalized.properties={...Object.fromEntries(entries) as Record<string,Scalar>,name:normalized.properties.name};}
    return normalized;
  })};
}
export function validateWorkflow(raw:unknown):Workflow {
  if (!isRecord(raw) || raw.schema !== 'fieldwork/workflow/1' || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges) || raw.nodes.length > 50 || raw.edges.length > 100) throw new Error('Invalid Fieldwork workflow. Maximum 50 nodes and 100 connections.');
  // Individual node/edge fields are checked below before this value leaves the boundary.
  const w = structuredClone(raw) as unknown as Workflow, ids = new Set<string>();
  referencedPDFs(w);
  assertProjectManifest(w);
  // Normalize historical heat sources before validation to preserve scalar attributes.
  w.nodes=w.nodes.map(n=>n && (n.type==='places'||n.type==='centers')
    ? {...n,type:'observations',sourceMigration:{fromType:n.type,version:'1'}} : n);
  migrateFacilitySources(w);
  migrateOutputNodes(w);
  for (const n of w.nodes) {
    if (!Object.hasOwn(TYPES,n.type) || !/^[a-zA-Z0-9_-]{1,80}$/.test(n.id) || ids.has(n.id)) throw new Error('Invalid or duplicate node.');
    ids.add(n.id);
    if (![n.x,n.y].every(Number.isFinite) || Math.abs(n.x)>10000 || Math.abs(n.y)>10000 || !n.params) throw new Error('Invalid node position or parameters.');
    if((n.type==='area'||n.type==='observations'||n.type==='places'||n.type==='centers')){n.params.spatialReference??=defaultSpatialReference();validateSpatialReference(n.params.spatialReference);}
    if ((n.type==='places'||n.type==='centers'||n.type==='observations')) n.params.data=validateGeoJSON(n.params.data,{attributes:n.type==='observations'});
    if(n.type==='observations'){validateAttributeSchema(n.params.data,n.params.fields,n.params.attributeRules);if(n.params.pinIdStrategy!==undefined&&!['sequential','uuid'].includes(n.params.pinIdStrategy))throw new Error('Choose sequential or UUID identifiers for new pins.');}
    if((n.type==='map_output'||n.type==='table_output')&&n.params.inputMode!==undefined&&!(n.type==='map_output'?['spatial','decisions','raster']:['spatial','decisions']).includes(n.params.inputMode))throw new Error('Choose spatial inputs or reasoning results.');
    if(n.type==='raster_input'||n.type==='clip_raster'){if(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>60)throw new Error('Raster node names require 1-60 characters.');if(n.type==='raster_input'&&n.params.asset)validateRasterAsset(n.params.asset);if(n.type==='clip_raster'&&n.params.method!=='cell-center')throw new Error('Only cell-center raster clipping is supported.');}
    if (n.type==='output') {
      n.params.view ??= 'map';
      if (!['map','table','bars'].includes(n.params.view)) throw new Error('Visual outputs must use a map, table, or bar chart.');
      if (n.params.label !== undefined && (typeof n.params.label!=='string' || n.params.label.length>60)) throw new Error('Output names must be text of at most 60 characters.');
    }
    if (n.type==='policy' && (!Number.isFinite(n.params.thresholdKm) || n.params.thresholdKm<0 || n.params.thresholdKm>1000)) throw new Error('Distance threshold must be between 0 and 1,000 km.');
    if (n.type==='alert' && (![true,false,null].includes(n.params.active) || !/^\d{4}-\d{2}-\d{2}$/.test(n.params.date) || !Number.isFinite(Date.parse(n.params.date)) || new Date(n.params.date).toISOString().slice(0,10)!==n.params.date)) throw new Error('Invalid heat alert or assessment date.');
    if(Object.hasOwn(OLD_TYPES,n.type))validateOldNode(n);
    if(n.type==='measure_area')validateAreaUnit(n.params.unit);
    if(n.type==='coverage_check')validateCoverageParams(n.params);
    if((n.type==='map_output'||n.type==='table_output'||n.type==='coverage_check')&&n.params.pointInputCount!==undefined&&(!Number.isInteger(n.params.pointInputCount)||n.params.pointInputCount<1||n.params.pointInputCount>MAX_POINT_LAYERS))throw new Error('Use 1–8 point input ports.');
    if((n.type==='map_output'||n.type==='table_output'||n.type==='chart_output')&&(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>60))throw new Error(`${TYPES[n.type].title} names must be text of 1–60 characters.`);
  }
  const edgeIds=new Set(), ports=new Set();
  for (const e of w.edges) {
    if (typeof e.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(e.id) || edgeIds.has(e.id)) throw new Error('Invalid or duplicate connector ID.');
    edgeIds.add(e.id);
    const a=w.nodes.find(n=>n.id===e.from),b=w.nodes.find(n=>n.id===e.to);
    if (!a || !b || a.id===b.id || !TYPES[a.type].output || nodeInputs(b).find(([p])=>p===e.port)?.[1] !== TYPES[a.type].output) throw new Error('Incompatible node connection.');
    const key=`${e.to}:${e.port}`;
    if (ports.has(key)) throw new Error('Each input port accepts one connection.');
    ports.add(key);
  }
  const visited=new Set(), stack=new Set();
  for(const n of w.nodes.filter(n=>(n.type==='map_output'||n.type==='table_output'||n.type==='coverage_check'))){const sources=w.edges.filter(e=>e.to===n.id&&isPointPort(e.port)).map(e=>e.from);if(new Set(sources).size!==sources.length)throw new Error('Connect each point source once per operation.');}
  for(const n of w.nodes.filter(n=>(n.type==='map_output'||n.type==='table_output'))){const inputs=w.edges.filter(e=>e.to===n.id);if(inputs.some(e=>e.port==='raster')&&n.params.inputMode!=='raster')throw new Error('Choose Raster mode for a connected raster.');if(inputs.some(e=>e.port==='coverage')&&inputs.length>1)throw new Error(`${TYPES[n.type].title} accepts either a coverage check or separate ${n.type==='map_output'?'area and ':''}points. Disconnect the other inputs first.`);}
  function visit(id:string) {if(stack.has(id)) throw new Error('Workflow cycles are not supported. Keep inference inside the rule node.');if(visited.has(id))return;stack.add(id);w.edges.filter(e=>e.to===id).forEach(e=>visit(e.from));stack.delete(id);visited.add(id);}
  w.nodes.forEach(n=>visit(n.id));
  if(w.outputId && !w.nodes.some(n=>n.id===w.outputId && ['output','map_output','table_output','chart_output'].includes(n.type))) throw new Error('Selected output does not exist.');
  projectFiles(w);
  if(w.manifest)syncProjectManifest(w);
  return w;
}
function resultNodes(w:Pick<Workflow,'nodes'>){return w.nodes.filter(n=>['output','measure_area','coverage_check','map_output','table_output','chart_output'].includes(n.type));}
export function executionPlan(workflow:Workflow) {
  const w=validateWorkflow(workflow), outputs=resultNodes(w);
  if(!outputs.length){
    if(!w.nodes.length||!w.nodes.every(n=>n.type==='area'))throw new Error('Add a visual output before running, or start with a Study area node.');
    outputs.push(...w.nodes);
  }
  for(const n of w.nodes)if(n.type==='area'&&n.params.source==='drawn'&&!n.params.geometry)throw new Error('Select a study area on the map before running.');
  const result:WorkflowNode[]=[], done=new Set<string>();
  function visit(node:WorkflowNode) {if(done.has(node.id))return;const inputs=['map_output','table_output'].includes(node.type)?(w.edges.some(e=>e.to===node.id&&e.port==='coverage')?[['coverage']]:nodeInputs(node).filter(([port])=>port!=='coverage'&&(port!=='raster'||node.type==='map_output'&&node.params.inputMode==='raster'))):nodeInputs(node);for(const [port] of inputs){const e=w.edges.find(e=>e.to===node.id && e.port===port);if(!e)throw new Error(`${TYPES[node.type].title} needs its ${port} input connected.`);visit(required(w.nodes.find(n=>n.id===e.from)));} done.add(node.id);result.push(node);}
  outputs.forEach(visit);return result;
}
export function distanceKm(a:Position,b:Position) {
  const rad=(x:number)=>x*Math.PI/180, dlat=rad(b[1]-a[1]),dlon=rad(b[0]-a[0]);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dlon/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export function nearestPlaces(places:PointCollection,centers:PointCollection):NearestRow[] {
  const valid=centers.features.filter(f=>f.geometry);
  return places.features.map(place=>{
    if (!place.geometry || !valid.length) return {id:place.id,name:place.properties.name,coordinates:place.geometry?.coordinates ?? null,distanceKm:null,center:null,reason:!place.geometry?'Neighborhood location is missing.':'No cooling center with valid coordinates is available.'};
    let best:PointFeature|null=null,distance=Infinity;
    for(const center of valid){const value=distanceKm(place.geometry.coordinates,center.geometry!.coordinates);if(value<distance){best=center;distance=value;}}
    return {id:place.id,name:place.properties.name,coordinates:place.geometry.coordinates,distanceKm:distance,center:{id:best!.id,name:best!.properties.name,coordinates:best!.geometry!.coordinates}};
  });
}
export function makeN3(rows:NearestRow[],alert:ParamsByType['alert'],threshold:number) {
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';
  const facts=rows.map(r=>`<urn:fieldwork:place:${r.id}> fw:distanceKnown ${r.distanceKm!==null}; fw:alertKnown ${alert.active!==null}.${r.distanceKm!==null?`\n<urn:fieldwork:place:${r.id}> fw:distanceKm ${r.distanceKm!.toFixed(9)}.`:''}${alert.active!==null?`\n<urn:fieldwork:place:${r.id}> fw:heatAlert ${alert.active}.`:''}`).join('\n');
  const t=Number(threshold).toFixed(9);
  const rules=`# Missing evidence stays unknown. Threshold is illustrative.\n{ ?p fw:distanceKnown false. } => { ?p fw:decision fw:Unknown. }.\n{ ?p fw:alertKnown false. } => { ?p fw:decision fw:Unknown. }.\n{ ?p fw:distanceKm ?d; fw:heatAlert true. ?d math:greaterThan ${t}. } => { ?p fw:decision fw:Review. }.\n{ ?p fw:distanceKm ?d; fw:heatAlert true. ?d math:notGreaterThan ${t}. } => { ?p fw:decision fw:NoFlag. }.\n{ ?p fw:distanceKnown true; fw:heatAlert false. } => { ?p fw:decision fw:NoFlag. }.\n`;
  return {facts:prefix+facts+'\n',rules:prefix+rules,input:prefix+facts+'\n\n'+rules};
}
export async function executeWorkflow(workflow:Workflow,reasoner:Reasoner,onProgress:(id:string,status:'running'|'done')=>void=()=>{}):Promise<WorkflowRun> {
  workflow=validateWorkflow(workflow);
  const plan=executionPlan(workflow), values=new Map<string,unknown>(), trace:WorkflowRun['trace']=[], receipts:Receipt[]=[],runId=crypto.randomUUID();
  for(const node of plan){
    onProgress(node.id,'running');const begin=performance.now();
    const inputs=Object.fromEntries(workflow.edges.filter(e=>e.to===node.id).map(e=>[e.port,values.get(e.from)])) as unknown as ExecutionInputs;
    const pointInputs=():{layers:import('./types.js').PointLayer[]}=>({layers:nodeInputs(node).filter(([port])=>isPointPort(port)).map(([port])=>{const edge=workflow.edges.find(e=>e.to===node.id&&e.port===port),source=workflow.nodes.find(n=>n.id===edge!.from);return {...(inputs[port as keyof ExecutionInputs] as unknown as PointCollection),sourceNodeId:edge!.from,label:source!.params.label||TYPES[source!.type].title,attributeDefinitions:[...('fields' in source!.params?source!.params.fields||[]:[]),...('attributeRules' in source!.params?source!.params.attributeRules||[]:[])]};})});
    let value:unknown;
    switch(node.type){
      case 'raster_input':{if(!node.params.asset)throw new Error('Prepare the raster window before running.');const grid=await loadRaster(node.params.asset,inputs.area);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId));break;}
      case 'clip_raster':{const grid=clipRaster(inputs.raster,inputs.area.boundary);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from));break;}
      case 'places':case 'centers':value={...node.params.data,spatialReference:structuredClone(node.params.spatialReference)};break;
      case 'observations':value={...node.params.data,sourceNodeId:node.id,sourceKind:'input-points',sourceInfo:structuredClone(node.params.sourceInfo),spatialReference:structuredClone(node.params.spatialReference)};break;
      case 'alert':value=node.params;break;
      case 'nearest':value={rows:nearestPlaces(inputs.places,inputs.centers),centers:inputs.centers.features,method:'Haversine; sphere radius 6371.0088 km; CRS84 longitude/latitude'};break;
      case 'policy':{
        const {rows,centers,method}=inputs.distances,alert=inputs.alert,threshold=node.params.thresholdKm;
        const n3=makeN3(rows,alert,threshold);const conclusions=await reasoner(n3.input);
        const decisions=new Map<string,Status>();
        for(const q of conclusions){if(q.predicate===NS+'decision'){const id=q.subject.slice((NS+'place:').length);const decision=q.object.slice(NS.length);if(!['Review','NoFlag','Unknown'].includes(decision))throw new Error('Reasoner returned an unknown decision.');if(decisions.has(id)&&decisions.get(id)!==decision)throw new Error('Reasoner returned conflicting decisions.');decisions.set(id,decision as Status);}}
        value={rows:rows.map(r=>{const status=decisions.get(r.id);if(!status)throw new Error(`Reasoner did not classify ${r.name}.`);return {...r,status,explanation: status==='Unknown' ? (r.reason || 'Heat alert status is missing.') : `Nearest center: ${r.center!.name}. Distance ${r.distanceKm!.toFixed(2)} km ${r.distanceKm!>threshold?'>':'≤'} ${threshold} km. Heat alert ${alert.active?'active':'inactive'} on ${alert.date}.`};}),centers,method,threshold,alert};
        receipts.push({nodeId:node.id,...n3,conclusions});break;
      }
      case 'chart_output':{const shown=chartOutput(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}
      case 'output':value=inputs.decisions;break;
      case 'map_output':{if(node.params.inputMode==='raster'){const source=workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from;const shown=decisionPresentation(node,{kind:'raster-map',raster:inputs.raster,boundary:inputs.raster.boundary,rows:[],centers:[]},source,runId);value=shown.value;receipts.push(shown.receipt);break;}if(node.params.inputMode==='decisions'){const shown=decisionPresentation(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}const mapped=mapOutput(node,inputs.coverage?{coverage:inputs.coverage}:{area:inputs.area,points:pointInputs()},runId);value=mapped.value;if(mapped.receipt)receipts.push(mapped.receipt);break;}
      case 'table_output':{if(node.params.inputMode==='decisions'){const shown=decisionPresentation(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}const table=tableOutput(node,inputs.coverage?{coverage:inputs.coverage}:{points:pointInputs()},runId);value=table.value;receipts.push(table.receipt);break;}
      case 'measure_area':{const computed=measureArea(node,inputs.area,runId);value=computed.value;receipts.push(computed.receipt);break;}
      case 'coverage_check':{const checked=await checkCoverage(node,inputs.area,pointInputs(),reasoner,runId);value=checked.value;receipts.push(checked.receipt);break;}
      case 'area':{
        if(node.params.source!=='drawn'){value={...await executeOldNode(node,inputs,reasoner,receipts,distanceKm,runId),areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,label:node.params.label||'Old Naledi',rows:[],centers:[]};break;}
        const n3=studyAreaN3(node),conclusions=await reasoner(n3.input);
        const ready=conclusions.some(q=>q.subject===`urn:fieldwork:area:${node.id}`&&q.predicate===NS+'readyForSpatialAnalysis'&&q.object==='true');
        if(!ready)throw new Error('The reasoner did not confirm the study-area input contract.');
        receipts.push({nodeId:node.id,...n3,conclusions});
        value={kind:'study-area',areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,boundary:structuredClone(node.params.geometry),bounds:geometryBounds(node.params.geometry!),label:node.params.label,selectionMode:node.params.selectionMode,ready,rows:[],centers:[],source:'User-drawn geometry in CRS84'};break;
      }
      default:value=await executeOldNode(node,inputs,reasoner,receipts,distanceKm);
    }
    if(node.type==='area'&&isRecord(value))value.spatialReference=structuredClone(node.params.spatialReference);
    values.set(node.id,value);trace.push({nodeId:node.id,type:node.type,milliseconds:performance.now()-begin});onProgress(node.id,'done');
  }
  const outputNodes=resultNodes({nodes:plan});
  const display=(id:string)=>required(values.get(id)) as DisplayValue;
  const outputs:Output[]=outputNodes.length?outputNodes.flatMap((n):Output[]=>{
    if(n.type==='coverage_check')return (['table','map'] as const).map(view=>({...display(n.id),nodeId:n.id+'-'+view,label:view==='table'?'Coverage review':'Coverage map',view}));
    const view=n.type==='output'?n.params.view:n.type==='table_output'?'table':n.type==='chart_output'?'bars':'map';
    return [{...display(n.id),nodeId:n.id,label:n.params.label||(n.type==='measure_area'?'Area · '+display(n.id).label:(view==='table'?'Table':'Map')+' · '+n.id),view}];
  }):plan.filter(n=>n.type==='area').map(n=>({...display(n.id),kind:'study-area',rows:[],centers:[],nodeId:n.id,label:n.params.label||'Study area preview',view:'map'}));
  const provenance=evidenceProvenance(plan,workflow.edges,runId);
  for(const receipt of receipts){const cited=provenance.evidence.find(e=>e.nodeId===receipt.nodeId);if(cited)receipt.references=structuredClone(cited.references);}
  return {...provenance,outputs,trace,receipts,runId,engine:'EYE-JS 21.1.24 (WASM)',runAt:new Date().toISOString()};
}
