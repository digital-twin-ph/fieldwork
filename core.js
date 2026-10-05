export const NS = 'urn:fieldwork:';
export const TYPES = {
  places: {title:'Neighborhoods', group:'Sources', icon:'▦', color:'blue', description:'Local neighborhood locations', inputs:[], output:'points'},
  centers: {title:'Cooling centers', group:'Sources', icon:'⌂', color:'blue', description:'Local facility locations', inputs:[], output:'points'},
  alert: {title:'Heat alert', group:'Sources', icon:'☀', color:'amber', description:'Assessment context', inputs:[], output:'alert'},
  nearest: {title:'Nearest center', group:'Spatial operations', icon:'⌁', color:'teal', description:'Calculate straight-line distance', inputs:[['places','points'],['centers','points']], output:'distances'},
  policy: {title:'Outreach criteria', group:'Semantic reasoning', icon:'⋈', color:'purple', description:'Apply N3 rules with EYE-JS', inputs:[['distances','distances'],['alert','alert']], output:'decisions'},
  output: {title:'Visual output', group:'Outputs', icon:'◈', color:'green', description:'Display decisions as a map or table', inputs:[['decisions','decisions']], output:null}
};
const point = (id,name,coordinates) => ({type:'Feature',id,properties:{name},geometry: coordinates ? {type:'Point',coordinates} : null});
export function exampleWorkflow() {
  return {schema:'fieldwork/workflow/1',name:'Heat outreach screening',nodes:[
    {id:'neighborhoods',type:'places',x:35,y:52,params:{label:'Neighborhoods',data:{type:'FeatureCollection',features:[point('oakwood','Oakwood',[-84.455,33.873]),point('northgate','Northgate',[-84.337,33.875]),point('riverside','Riverside',[-84.438,33.812]),point('midtown','Midtown',[-84.37,33.79]),point('eastfield','Eastfield',[-84.277,33.795]),point('brookside','Brookside',[-84.421,33.734]),point('southpark','South Park',[-84.34,33.72]),point('cedar','Cedar Heights',null)]}}},
    {id:'centers',type:'centers',x:35,y:229,params:{label:'Cooling centers',data:{type:'FeatureCollection',features:[point('library','Central Library',[-84.367,33.79]),point('community','West Community Hall',[-84.426,33.823])]}}},
    {id:'nearest',type:'nearest',x:323,y:90,params:{}},
    {id:'alert',type:'alert',x:323,y:284,params:{active:true,date:'2026-07-15'}},
    {id:'criteria',type:'policy',x:605,y:151,params:{thresholdKm:5}},
    {id:'map',type:'output',x:879,y:70,params:{label:'Outreach map',view:'map'}},
    {id:'table',type:'output',x:879,y:249,params:{label:'Decision table',view:'table'}}
  ],edges:[
    {id:'e1',from:'neighborhoods',to:'nearest',port:'places'}, {id:'e2',from:'centers',to:'nearest',port:'centers'},
    {id:'e3',from:'nearest',to:'criteria',port:'distances'}, {id:'e4',from:'alert',to:'criteria',port:'alert'},
    {id:'e5',from:'criteria',to:'map',port:'decisions'},
    {id:'e6',from:'criteria',to:'table',port:'decisions'}]};
}
export function validateGeoJSON(data) {
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length > 2000) throw new Error('Use a GeoJSON FeatureCollection with at most 2,000 point features.');
  const ids = new Set();
  return {type:'FeatureCollection',features:data.features.map((feature,i)=>{
    if (feature.type !== 'Feature') throw new Error(`Record ${i+1} is not a Feature.`);
    const id = String(feature.id ?? `point-${i+1}`);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new Error('Feature IDs must be unique letters, numbers, hyphens, or underscores (max 80).');
    ids.add(id);
    const g = feature.geometry;
    if (g !== null && (!g || g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2 || !g.coordinates.slice(0,2).every(Number.isFinite) || Math.abs(g.coordinates[0]) > 180 || Math.abs(g.coordinates[1]) > 90)) throw new Error(`Invalid point coordinates for ${id}. Use longitude, latitude in CRS84, or null for a missing location.`);
    return point(id,String(feature.properties?.name ?? id).slice(0,100),g?.coordinates.slice(0,2));
  })};
}
export function validateWorkflow(raw) {
  if (!raw || raw.schema !== 'fieldwork/workflow/1' || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges) || raw.nodes.length > 50 || raw.edges.length > 100) throw new Error('Invalid Fieldwork workflow. Maximum 50 nodes and 100 connections.');
  const w = structuredClone(raw), ids = new Set();
  for (const n of w.nodes) {
    if (!Object.hasOwn(TYPES,n.type) || !/^[a-zA-Z0-9_-]{1,80}$/.test(n.id) || ids.has(n.id)) throw new Error('Invalid or duplicate node.');
    ids.add(n.id);
    if (![n.x,n.y].every(Number.isFinite) || Math.abs(n.x)>10000 || Math.abs(n.y)>10000 || !n.params) throw new Error('Invalid node position or parameters.');
    if (['places','centers'].includes(n.type)) n.params.data=validateGeoJSON(n.params.data);
    if (n.type==='output') {
      n.params.view ??= 'map';
      if (!['map','table'].includes(n.params.view)) throw new Error('Visual outputs must use a map or table.');
      if (n.params.label !== undefined && (typeof n.params.label!=='string' || n.params.label.length>60)) throw new Error('Output names must be text of at most 60 characters.');
    }
    if (n.type==='policy' && (!Number.isFinite(n.params.thresholdKm) || n.params.thresholdKm<0 || n.params.thresholdKm>1000)) throw new Error('Distance threshold must be between 0 and 1,000 km.');
    if (n.type==='alert' && (![true,false,null].includes(n.params.active) || !/^\d{4}-\d{2}-\d{2}$/.test(n.params.date) || !Number.isFinite(Date.parse(n.params.date)) || new Date(n.params.date).toISOString().slice(0,10)!==n.params.date)) throw new Error('Invalid heat alert or assessment date.');
  }
  const edgeIds=new Set(), ports=new Set();
  for (const e of w.edges) {
    if (typeof e.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(e.id) || edgeIds.has(e.id)) throw new Error('Invalid or duplicate connector ID.');
    edgeIds.add(e.id);
    const a=w.nodes.find(n=>n.id===e.from),b=w.nodes.find(n=>n.id===e.to);
    if (!a || !b || a.id===b.id || !TYPES[a.type].output || TYPES[b.type].inputs.find(([p])=>p===e.port)?.[1] !== TYPES[a.type].output) throw new Error('Incompatible node connection.');
    const key=`${e.to}:${e.port}`;
    if (ports.has(key)) throw new Error('Each input port accepts one connection.');
    ports.add(key);
  }
  const visited=new Set(), stack=new Set();
  function visit(id) {if(stack.has(id)) throw new Error('Workflow cycles are not supported. Keep inference inside the rule node.');if(visited.has(id))return;stack.add(id);w.edges.filter(e=>e.to===id).forEach(e=>visit(e.from));stack.delete(id);visited.add(id);}
  w.nodes.forEach(n=>visit(n.id));
  if(w.outputId && !w.nodes.some(n=>n.id===w.outputId && n.type==='output')) throw new Error('Selected output does not exist.');
  return w;
}
export function executionPlan(workflow) {
  const w=validateWorkflow(workflow), outputs=w.nodes.filter(n=>n.type==='output');
  if(!outputs.length) throw new Error('Add a visual output before running.');
  const result=[], done=new Set();
  function visit(node) {if(done.has(node.id))return;for(const [port] of TYPES[node.type].inputs){const e=w.edges.find(e=>e.to===node.id && e.port===port);if(!e)throw new Error(`${TYPES[node.type].title} needs its ${port} input connected.`);visit(w.nodes.find(n=>n.id===e.from));} done.add(node.id);result.push(node);}
  outputs.forEach(visit);return result;
}
export function distanceKm(a,b) {
  const rad=x=>x*Math.PI/180, dlat=rad(b[1]-a[1]),dlon=rad(b[0]-a[0]);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dlon/2)**2;
  return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export function nearestPlaces(places,centers) {
  const valid=centers.features.filter(f=>f.geometry);
  return places.features.map(place=>{
    if (!place.geometry || !valid.length) return {id:place.id,name:place.properties.name,coordinates:place.geometry?.coordinates ?? null,distanceKm:null,center:null,reason:!place.geometry?'Neighborhood location is missing.':'No cooling center with valid coordinates is available.'};
    let best=null,distance=Infinity;
    for(const center of valid){const value=distanceKm(place.geometry.coordinates,center.geometry.coordinates);if(value<distance){best=center;distance=value;}}
    return {id:place.id,name:place.properties.name,coordinates:place.geometry.coordinates,distanceKm:distance,center:{id:best.id,name:best.properties.name,coordinates:best.geometry.coordinates}};
  });
}
export function makeN3(rows,alert,threshold) {
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';
  const facts=rows.map(r=>`<urn:fieldwork:place:${r.id}> fw:distanceKnown ${r.distanceKm!==null}; fw:alertKnown ${alert.active!==null}.${r.distanceKm!==null?`\n<urn:fieldwork:place:${r.id}> fw:distanceKm ${r.distanceKm.toFixed(9)}.`:''}${alert.active!==null?`\n<urn:fieldwork:place:${r.id}> fw:heatAlert ${alert.active}.`:''}`).join('\n');
  const t=Number(threshold).toFixed(9);
  const rules=`# Missing evidence stays unknown. Threshold is illustrative.\n{ ?p fw:distanceKnown false. } => { ?p fw:decision fw:Unknown. }.\n{ ?p fw:alertKnown false. } => { ?p fw:decision fw:Unknown. }.\n{ ?p fw:distanceKm ?d; fw:heatAlert true. ?d math:greaterThan ${t}. } => { ?p fw:decision fw:Review. }.\n{ ?p fw:distanceKm ?d; fw:heatAlert true. ?d math:notGreaterThan ${t}. } => { ?p fw:decision fw:NoFlag. }.\n{ ?p fw:distanceKnown true; fw:heatAlert false. } => { ?p fw:decision fw:NoFlag. }.\n`;
  return {facts:prefix+facts+'\n',rules:prefix+rules,input:prefix+facts+'\n\n'+rules};
}
export async function executeWorkflow(workflow,reasoner,onProgress=()=>{}) {
  const plan=executionPlan(workflow), values=new Map(), trace=[], receipts=[];
  for(const node of plan){
    onProgress(node.id,'running');const begin=performance.now();
    const inputs=Object.fromEntries(workflow.edges.filter(e=>e.to===node.id).map(e=>[e.port,values.get(e.from)]));
    let value;
    switch(node.type){
      case 'places':case 'centers':value=node.params.data;break;
      case 'alert':value=node.params;break;
      case 'nearest':value={rows:nearestPlaces(inputs.places,inputs.centers),centers:inputs.centers.features,method:'Haversine; sphere radius 6371.0088 km; CRS84 longitude/latitude'};break;
      case 'policy':{
        const {rows,centers,method}=inputs.distances,alert=inputs.alert,threshold=node.params.thresholdKm;
        const n3=makeN3(rows,alert,threshold);const conclusions=await reasoner(n3.input);
        const decisions=new Map();
        for(const q of conclusions){if(q.predicate===NS+'decision'){const id=q.subject.slice((NS+'place:').length);const decision=q.object.slice(NS.length);if(!['Review','NoFlag','Unknown'].includes(decision))throw new Error('Reasoner returned an unknown decision.');if(decisions.has(id)&&decisions.get(id)!==decision)throw new Error('Reasoner returned conflicting decisions.');decisions.set(id,decision);}}
        value={rows:rows.map(r=>{const status=decisions.get(r.id);if(!status)throw new Error(`Reasoner did not classify ${r.name}.`);return {...r,status,explanation: status==='Unknown' ? (r.reason || 'Heat alert status is missing.') : `Nearest center: ${r.center.name}. Distance ${r.distanceKm.toFixed(2)} km ${r.distanceKm>threshold?'>':'≤'} ${threshold} km. Heat alert ${alert.active?'active':'inactive'} on ${alert.date}.`};}),centers,method,threshold,alert};
        receipts.push({nodeId:node.id,...n3,conclusions});break;
      }
      case 'output':value=inputs.decisions;break;
    }
    values.set(node.id,value);trace.push({nodeId:node.id,type:node.type,milliseconds:performance.now()-begin});onProgress(node.id,'done');
  }
  const outputs=plan.filter(n=>n.type==='output').map(n=>({nodeId:n.id,label:n.params.label||`${n.params.view==='table'?'Table':'Map'} · ${n.id}`,view:n.params.view,...values.get(n.id)}));
  return {outputs,trace,receipts,engine:'EYE-JS 21.1.24 (WASM)',runAt:new Date().toISOString()};
}
