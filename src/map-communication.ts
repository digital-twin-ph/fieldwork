import type {Output,Receipt} from './results.js';
import type {WorkflowNode,Workflow} from './types.js';

export interface MapPresentation {title:string; subtitle:string; sourceNote:string; legend:boolean; items:{label:string;color:string;shape?:'square'}[]; presentation:'plot'|'interactive'; basemap:'none'|'osm'|'topo'}

/** A map specification describes presentation; it never changes source geometries or decisions. */
export function mapPresentation(node:WorkflowNode<'map_output'>,output:Output,workflow:Workflow):MapPresentation{
  const upstream=workflow.edges.filter(e=>e.to===node.id).map(e=>workflow.nodes.find(n=>n.id===e.from)?.params.label||e.from);
  const sourceNote=node.params.mapSourceNote?.trim()||`Sources: ${upstream.join(', ')||'connected workflow inputs'} · CRS84. ${output.polygons?.method||output.method||'See N3 & evidence for method.'}`;
  let items:MapPresentation['items']=[];
  if(output.polygons){
    items=output.polygons.kind==='hexbin'?[{label:'Released H3 cell',color:'#3686a8'},{label:'Sparse cells omitted',color:'#ffffff'}]:output.polygons.features.some(f=>f.minutes!==undefined)?[
      {label:'Cumulative travel-time region',color:'#1f77b4'},
      {label:'Observations',color:node.params.presentation==='interactive'?'#d62f2f':'gray'},
      {label:'Sites / context',color:node.params.presentation==='interactive'?'#174d47':'red',shape:'square'}
    ]:[{label:'Modeled catchment',color:'#3686a8'},{label:'Observations',color:'#70523a'},{label:'Sites',color:'#174d47',shape:'square'}];
  }else if(output.raster)items=[{label:'Relative cell value (see scale)',color:'#3686a8'},{label:'NoData / outside mask',color:'#a8a8a8'}];
  else if(output.kind==='spatial-map')items=[{label:'Outside boundary',color:'#c88944'},{label:'Inside / boundary',color:'#598c73'},{label:'Missing location (not plotted)',color:'#a89b87'}];
  else items=[{label:'Review',color:'#c88944'},{label:'No flag',color:'#598c73'},{label:'Unknown',color:'#a89b87'},{label:'Facility',color:'#375e59',shape:'square'}];
  const interactive=node.params.presentation==='interactive'&&!!output.polygons;
  return {title:node.params.mapTitle?.trim()||node.params.label,subtitle:node.params.mapSubtitle?.trim()||'',sourceNote,legend:node.params.showLegend!==false,items,presentation:interactive?'interactive':'plot',basemap:interactive?node.params.basemap||'none':'none'};
}

export function standaloneMapSvg(content:string,viewBox:string,spec:MapPresentation):string{
  const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const lines=(value:string,max:number)=>value.match(new RegExp(`.{1,${max}}(?:\\s|$)|.{1,${max}}`,'g'))?.map(line=>line.trim())||[];
  const titleLines=lines(spec.title,60),subtitleLines=lines(spec.subtitle,105);
  const width=850,height=Number(viewBox.trim().split(/\s+/)[3])||295,base=52+titleLines.length*24+subtitleLines.length*16,legendRows=spec.legend?Math.ceil(spec.items.length/2):0,noteLines=lines(spec.sourceNote,110),footer=38+legendRows*22+noteLines.length*16,total=base+height+footer;
  const legend=spec.legend?spec.items.map((item,i)=>{const x=28+(i%2)*402,y=base+height+24+Math.floor(i/2)*22;return `${item.shape==='square'?`<rect x="${x}" y="${y-9}" width="10" height="10" fill="${item.color}"/>`:`<circle cx="${x+5}" cy="${y-4}" r="5" fill="${item.color}" stroke="#718171"/>`}<text x="${x+17}" y="${y}" font-size="12" fill="#344b40">${escape(item.label)}</text>`;}).join(''):'';
  const noteY=base+height+30+legendRows*22;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${total}" width="${width}" height="${total}" role="img" aria-label="${escape(spec.title)}"><title>${escape(spec.title)}</title><desc>${escape(spec.subtitle+' '+spec.sourceNote)}</desc><style>text{font-family:Arial,sans-serif}.gridline{stroke:#cdd8c5;stroke-width:.5;stroke-dasharray:2 6}.location-label{font-size:10px;fill:#4f6550}</style><rect width="${width}" height="${total}" fill="white"/>${titleLines.map((line,i)=>`<text x="28" y="${31+i*24}" font-size="20" font-weight="bold" fill="#213f34">${escape(line)}</text>`).join('')}${subtitleLines.map((line,i)=>`<text x="28" y="${35+titleLines.length*24+i*16}" font-size="12" fill="#53695e">${escape(line)}</text>`).join('')}<svg x="0" y="${base}" width="850" height="${height}" viewBox="${escape(viewBox)}">${content}</svg>${legend}${noteLines.map((line,i)=>`<text x="28" y="${noteY+i*16}" font-size="11" fill="#53695e">${escape(line)}</text>`).join('')}</svg>`;
}

export function mapSpecificationFacts(node:WorkflowNode<'map_output'>,output:Output,workflow:Workflow,runId:string,receipt:Receipt):string{
  const spec=mapPresentation(node,output,workflow),activity=node.params.inputMode==='polygons'?`urn:fieldwork:run:${runId}:output:${node.id}:view`:node.params.inputMode==='raster'||node.params.inputMode==='decisions'?`urn:fieldwork:run:${runId}:view:${node.id}`:`urn:fieldwork:run:${runId}:map:${node.id}`;
  const iri=`urn:fieldwork:run:${runId}:map-specification:${node.id}`;
  const sources=workflow.edges.filter(e=>e.to===node.id).map(e=>`<urn:fieldwork:run:${runId}:output:${e.from}>`);
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n<${iri}> a fw:MapSpecification, prov:Plan; dcterms:title ${JSON.stringify(spec.title)}; dcterms:description ${JSON.stringify(spec.subtitle)}; fw:mapLegend ${spec.legend}; fw:mapPresentation ${JSON.stringify(spec.presentation)}; fw:mapBasemap ${JSON.stringify(spec.basemap)}; fw:mapSourceNote ${JSON.stringify(spec.sourceNote)}; prov:wasDerivedFrom ${sources.join(', ')}.\n<${activity}> fw:mapSpecification <${iri}>; prov:used <${iri}>.\n`;
  receipt.facts+=facts;receipt.input=receipt.facts;return facts;
}
