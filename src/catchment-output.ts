import type {Polygons} from './catchments.js';
import type {DisplayValue,Receipt} from './results.js';
import type {Escape,Position,PointCollection,WorkflowNode} from './types.js';
export function polygonDisplay(p:Polygons,view:'map'|'table'|'chart'):DisplayValue{
  if(p.kind==='hexbin'){
    if(view==='chart')throw new Error('H3 cell charts are not configured in this example.');
    return {kind:'point-table',polygons:p,pointTable:true,centers:[],rows:p.features.map(f=>({id:f.id,recordId:f.id,name:f.name,coordinates:p.sites.find(s=>s.id===f.id)?.geometry?.coordinates||null,sourceNodeId:'hex_aggregate',layerLabel:'H3 aggregate cells (centroids)',attributeTypes:{count:'integer'},attributes:{count:f.count??0}}))};
  }
  if(view==='chart'&&!p.summary)throw new Error('Connect Summarize points in polygons before a catchment chart.');
  if(view==='chart'&&p.summary?.valueField&&p.features.some(f=>f.total!<0))throw new Error('This chart supports nonnegative totals; use Table for signed summaries.');
  return {kind:'point-table',polygons:p,pointTable:true,centers:[],boundary:p.boundary,
    rows:p.features.map(f=>({id:f.id,recordId:f.id,name:f.name,coordinates:p.sites.find(s=>s.id===f.siteId)?.geometry?.coordinates||null,sourceNodeId:'catchments',layerLabel:'Catchments (coordinates locate source sites)',attributeTypes:{},attributes:{siteId:f.siteId,...(f.minutes!==undefined?{minutes:f.minutes}:{}),...(p.summary?{locations:f.count!,numericTotal:p.summary.valueField?f.total!:null,missingValues:f.missingValues!}:{})}})),
    ...(view==='chart'?{chart:{field:p.summary!.valueField?'total' as const:'count' as const,caption:(p.features.some(f=>f.minutes!==undefined)?'Cumulative thresholds (not time bands). ':'')+(p.summary!.valueField?`Sum ${p.summary!.valueField} by catchment; missing values reported in Table`:'Location memberships by catchment; overlaps can count more than once'),total:p.summary!.records,bins:p.features.map(f=>({key:f.id,label:f.name,count:p.summary!.valueField?f.total!:f.count!}))}}:{})};
}
export function polygonPresentationReceipt(node:WorkflowNode,source:string,runId:string,contextSource?:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:view`,kind=node.type==='map_output'?'MapView':node.type==='table_output'?'TableView':'ChartView';
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n<${activity}> a fw:${kind}, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>.\n<${entity}> a prov:Entity; prov:wasGeneratedBy <${activity}>.\n`;
  const context=node.type==='map_output'&&node.params.contextPoints;
  const presentation=node.type==='map_output'?node.params.presentation||'plot':kind;
  const extra=(contextSource?`<${activity}> prov:used <urn:fieldwork:run:${runId}:output:${contextSource}>.\n`:'')+`<${activity}> fw:parameters ${JSON.stringify(JSON.stringify({presentation,contextPoints:!!context}))}.\n`;
  return {nodeId:node.id,kind:'presentation',facts:facts+extra,input:facts+extra,rules:'',conclusions:[],method:'Display an existing polygon dataset and attributes without changing its geometry, membership or aggregation.'};
}
export function polygonSvg(p:Polygons,esc:Escape):string{
  if(p.kind==='hexbin'){
    const coords=p.features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates.flat():f.geometry.coordinates.flat(2));
    if(!coords.length)return '<text x="30" y="40">No cells meet the minimum occupancy</text>';
    const west=Math.min(...coords.map(c=>c[0])),east=Math.max(...coords.map(c=>c[0])),south=Math.min(...coords.map(c=>c[1])),north=Math.max(...coords.map(c=>c[1]));
    const cos=Math.cos((south+north)/2*Math.PI/180),scale=Math.min(790/Math.max((east-west)*cos,.00001),235/Math.max(north-south,.00001));
    const project=(c:Position)=>[425+(c[0]-(east+west)/2)*cos*scale,145-(c[1]-(north+south)/2)*scale];
    return '<rect width="850" height="295" fill="#f7faf8"/>'+p.features.map(f=>`<path data-hex-cell="${esc(f.id)}" d="M${(f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates[0][0]).map(c=>project(c).join(',')).join('L')}Z" fill="#3686a8" fill-opacity=".25" stroke="#19617c" stroke-width="1"><title>${esc(f.id)} · ${f.count} locations</title></path>`).join('')+'<text x="20" y="282" font-size="10">H3 aggregate cells · sparse cells omitted</text>';
  }
  const rings=p.features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()),coords=[...rings.flat(),...p.sites.flatMap(f=>f.geometry?[f.geometry.coordinates]:[]),...(p.observations?.features||[]).flatMap(f=>f.geometry?[f.geometry.coordinates]:[])];if(!coords.length)return '<text x="30" y="40">No intersecting polygons or located points</text>';
  const [west,south,east,north]=coords.reduce(([w,s,e,n],c)=>[Math.min(w,c[0]),Math.min(s,c[1]),Math.max(e,c[0]),Math.max(n,c[1])],[Infinity,Infinity,-Infinity,-Infinity]),cos=Math.cos((south+north)/2*Math.PI/180),scale=Math.min(790/Math.max((east-west)*cos,.00001),235/Math.max(north-south,.00001));
  const project=(c:Position)=>[425+(c[0]-(east+west)/2)*cos*scale,145-(c[1]-(north+south)/2)*scale],colors=['#3686a8','#c7773b','#719d47','#966bad','#c35b70','#4d9e94'];
  return '<rect width="850" height="295" fill="#f7faf8"/>'+p.features.map((f,i)=>{const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;return `<path data-catchment="${esc(f.id)}" d="${polys.flat().map(r=>'M'+r.map(c=>project(c).join(',')).join('L')+'Z').join('')}" fill="${colors[i%colors.length]}" fill-opacity=".22" fill-rule="evenodd" stroke="${colors[i%colors.length]}" stroke-width="1"><title>${esc(f.name)}${f.count===undefined?'':` · ${f.count} locations`}</title></path>`;}).join('')+(p.observations?.features||[]).filter(f=>f.geometry).map(f=>{const [x,y]=project(f.geometry!.coordinates);return `<circle cx="${x}" cy="${y}" r="1.8" fill="#70523a"><title>${esc(f.properties.name)}</title></circle>`;}).join('')+p.sites.filter(f=>f.geometry).map(f=>{const [x,y]=project(f.geometry!.coordinates);return `<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="#174d47"><title>${esc(f.properties.name)}</title></rect>`;}).join('')+'<text x="20" y="282" font-size="10">Squares: sites · dots: observations · polygons: modeled catchments</text>';
}

/** NB04-style geographic plot. SVG retains vector geometry for export. */
export function catchmentPlot(p:Polygons,esc:Escape,context?:PointCollection):string{
  const sites=context?.features||p.sites,observations=p.observations?.features||[];
  const coords=[...p.features.flatMap(f=>(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()).flat()),...sites.flatMap(f=>f.geometry?[f.geometry.coordinates]:[]),...observations.flatMap(f=>f.geometry?[f.geometry.coordinates]:[])];
  if(!coords.length)return '<text x="40" y="50">No located geometry to plot</text>';
  const [west,south,east,north]=coords.reduce(([w,s,e,n],c)=>[Math.min(w,c[0]),Math.min(s,c[1]),Math.max(e,c[0]),Math.max(n,c[1])],[Infinity,Infinity,-Infinity,-Infinity]);
  const cos=Math.cos((south+north)/2*Math.PI/180),scale=Math.min(680/Math.max((east-west)*cos,.00001),490/Math.max(north-south,.00001));
  const project=(c:Position)=>[460+(c[0]-(east+west)/2)*cos*scale,310-(c[1]-(north+south)/2)*scale];
  let svg=`<desc>${esc(p.method+' / '+p.notes.join(' '))}</desc>`+'<rect width="850" height="650" fill="white"/><text x="425" y="24" text-anchor="middle" font-size="16">Travel-time regions, observation locations and sites</text><rect x="85" y="45" width="740" height="530" fill="none" stroke="#333"/>';
  for(let i=0;i<=4;i++){const lon=west+(east-west)*i/4,lat=south+(north-south)*i/4,x=project([lon,south])[0],y=project([west,lat])[1];svg+=`<text x="${x}" y="595" text-anchor="middle" font-size="12">${lon.toFixed(4)}</text><text x="78" y="${y+4}" text-anchor="end" font-size="12">${lat.toFixed(4)}</text>`;}
  svg+='<text x="455" y="617" text-anchor="middle" font-size="14">Longitude</text><text transform="translate(20,310) rotate(-90)" text-anchor="middle" font-size="14">Latitude</text>';
  for(const f of [...p.features].sort((a,b)=>(b.minutes||0)-(a.minutes||0))){const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();svg+=`<path data-catchment="${esc(f.id)}" d="${rings.map(r=>'M'+r.map(c=>project(c).join(',')).join('L')+'Z').join('')}" fill="#1f77b4" fill-opacity=".2" fill-rule="evenodd"><title>${esc(f.name)}</title></path>`;}
  for(const [fs,color,r,kind] of [[observations,'gray',2.7,'observation'],[sites,'red',3.5,'site']] as const)for(const f of fs){if(!f.geometry)continue;const [x,y]=project(f.geometry.coordinates);svg+=`<circle data-plot-${kind}="${esc(f.id)}" cx="${x}" cy="${y}" r="${r}" fill="${color}"><title>${esc(f.properties.name)}</title></circle>`;}
  const times=[...new Set(p.features.flatMap(f=>f.minutes===undefined?[]:[f.minutes]))].sort((a,b)=>a-b);
  return svg+`<text x="425" y="640" text-anchor="middle" font-size="11">${times.length?'Cumulative regions: '+times.join(', ')+' min · ':''}Gray: observations · red: sites · CRS84</text>`;
}
