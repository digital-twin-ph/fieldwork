import type {Output,Receipt} from './results.js';
import {outputOf} from './core.js';
import type {WorkflowNode,Workflow} from './types.js';
import {FIGURE_ROLE,FIGURE_TYPE,scaleBarSvg,northArrowSvg,metresPerPixel} from './presentation.js';

export interface MapPresentation {title:string; subtitle:string; sourceNote:string; legend:boolean; items:{label:string;color:string;shape?:'square'}[]; presentation:'plot'|'interactive'; basemap:'none'|'osm'|'topo';
  /** Licence and attribution for the data shown. Separate from the source note because a note is
   *  editorial and this is an obligation: an OSM-derived layer must say ODbL and credit
   *  contributors wherever the figure ends up, and a figure that travels without it is not
   *  publishable however complete it otherwise looks. */
  attribution:string}

/** A map specification describes presentation; it never changes source geometries or decisions. */
export function mapPresentation(node:WorkflowNode<'map_output'>,output:Output,workflow:Workflow):MapPresentation{
  const upstream=workflow.edges.filter(e=>e.to===node.id).map(e=>workflow.nodes.find(n=>n.id===e.from)?.params.label||e.from);
  const sourceNote=node.params.mapSourceNote?.trim()||`Sources: ${upstream.join(', ')||'connected workflow inputs'} · CRS84. ${output.polygons?.method||output.method||'See N3 & evidence for method.'}`;
  // Colours come from FIGURE_ROLE, so the same meaning carries the same hue here, in the plot and
  // in a chart placed beside it. They were eight unrelated hex literals until 2026-10-13.
  const R=FIGURE_ROLE;
  let items:MapPresentation['items']=[];
  if(output.polygons){
    items=output.polygons.kind==='hexbin'?[{label:'Released H3 cell',color:R.primary},{label:'Sparse cells omitted',color:R.background}]:output.polygons.features.some(f=>f.minutes!==undefined)?[
      {label:'Cumulative travel-time region',color:R.primary},
      {label:'Observations',color:R.secondary},
      {label:'Sites / context',color:R.site,shape:'square'}
    ]:[{label:'Modeled catchment',color:R.primary},{label:'Observations',color:R.secondary},{label:'Sites',color:R.site,shape:'square'}];
  }else if(output.raster)items=[{label:'Relative cell value (see scale)',color:R.primary},{label:'NoData / outside mask',color:R.unknown}];
  else if(output.kind==='spatial-map')items=[{label:'Outside boundary',color:R.attention},{label:'Inside / boundary',color:R.agreement},{label:'Missing location (not plotted)',color:R.unknown}];
  else items=[{label:'Review',color:R.attention},{label:'No flag',color:R.agreement},{label:'Unknown',color:R.unknown},{label:'Facility',color:R.site,shape:'square'}];
  const interactive=node.params.presentation==='interactive'&&!!output.polygons;
  const basemap=interactive?node.params.basemap||'none':'none';
  // Derived, not authored: a basemap carries an obligation the practitioner cannot opt out of by
  // leaving a field blank, and a street network reached this figure through an ODbL download.
  const credits=[
    basemap==='osm'?'Basemap © OpenStreetMap contributors, ODbL':'',
    // OpenTopoMap is a style over OSM data under a different licence, so crediting it as
    // OpenStreetMap alone -- which this did until 2026-10-14 -- under-credits the style.
    basemap==='topo'?'Basemap style © OpenTopoMap, CC-BY-SA; data © OpenStreetMap contributors, ODbL':'',
    output.polygons?.method?.includes('Dijkstra')||output.polygons?.notes?.some(n=>n.includes('OSM'))
      ?'Street network © OpenStreetMap contributors, ODbL':'',
  ].filter(Boolean);
  return {title:node.params.mapTitle?.trim()||node.params.label,subtitle:node.params.mapSubtitle?.trim()||'',sourceNote,legend:node.params.showLegend!==false,items,presentation:interactive?'interactive':'plot',basemap,
    attribution:credits.join(' · ')};
}

/** `metresPerPixel` comes from the plot's own frame (`catchmentFrame`), so the scale bar is drawn
 *  from the number the geometry was drawn with. Omitted for a view with no single ground scale --
 *  a decision table, a basemap-backed interactive view -- and then no bar is drawn, because a
 *  figure missing a scale bar is incomplete while a figure with a wrong one is misleading. */
export function standaloneMapSvg(content:string,viewBox:string,spec:MapPresentation,frame?:{metresPerPixel?:number}):string{
  const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const lines=(value:string,max:number)=>value.match(new RegExp(`.{1,${max}}(?:\\s|$)|.{1,${max}}`,'g'))?.map(line=>line.trim())||[];
  const t=FIGURE_TYPE;
  const titleLines=lines(spec.title,60),subtitleLines=lines(spec.subtitle,105);
  const width=850,height=Number(viewBox.trim().split(/\s+/)[3])||295,base=52+titleLines.length*24+subtitleLines.length*16,legendRows=spec.legend?Math.ceil(spec.items.length/2):0,noteLines=lines(spec.sourceNote,110);
  const creditLines=spec.attribution?lines(spec.attribution,110):[];
  const footer=38+legendRows*22+(noteLines.length+creditLines.length)*16,total=base+height+footer;
  const legend=spec.legend?spec.items.map((item,i)=>{const x=28+(i%2)*402,y=base+height+24+Math.floor(i/2)*22;return `${item.shape==='square'?`<rect x="${x}" y="${y-9}" width="10" height="10" fill="${item.color}"/>`:`<circle cx="${x+5}" cy="${y-4}" r="5" fill="${item.color}" stroke="${FIGURE_ROLE.quietInk}"/>`}<text x="${x+17}" y="${y}" font-size="${t.legend}" fill="${FIGURE_ROLE.ink}">${escape(item.label)}</text>`;}).join(''):'';
  const noteY=base+height+30+legendRows*22;
  // Placed over the plot's lower-left, inside the mapped frame rather than in the footer, which is
  // where a reader looks for them and where they stay if the figure is cropped to the map.
  const furniture=(frame?.metresPerPixel?scaleBarSvg({x:110,y:base+height-26,metresPerPixel:frame.metresPerPixel}):'')
    +(frame?.metresPerPixel?northArrowSvg({x:width-52,y:base+28}):'');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${total}" width="${width}" height="${total}" role="img" aria-label="${escape(spec.title)}"><title>${escape(spec.title)}</title><desc>${escape(spec.subtitle+' '+spec.sourceNote)}</desc><style>text{font-family:${t.family}}.gridline{stroke:#CDD8C5;stroke-width:.5;stroke-dasharray:2 6}.location-label{font-size:${t.tick-2}px;fill:${FIGURE_ROLE.quietInk}}</style><rect width="${width}" height="${total}" fill="${FIGURE_ROLE.background}"/>${titleLines.map((line,i)=>`<text x="28" y="${31+i*24}" font-size="${t.title}" font-weight="${t.titleWeight}" fill="${FIGURE_ROLE.ink}">${escape(line)}</text>`).join('')}${subtitleLines.map((line,i)=>`<text x="28" y="${35+titleLines.length*24+i*16}" font-size="${t.subtitle}" fill="${FIGURE_ROLE.quietInk}">${escape(line)}</text>`).join('')}<svg x="0" y="${base}" width="850" height="${height}" viewBox="${escape(viewBox)}">${content}</svg>${furniture}${legend}${[...noteLines,...creditLines].map((line,i)=>`<text x="28" y="${noteY+i*16}" font-size="${t.note}" fill="${FIGURE_ROLE.quietInk}">${escape(line)}</text>`).join('')}</svg>`;
}

export function mapSpecificationFacts(node:WorkflowNode<'map_output'>,output:Output,workflow:Workflow,runId:string,receipt:Receipt):string{
  const spec=mapPresentation(node,output,workflow),activity=node.params.inputMode==='polygons'?`urn:fieldwork:run:${runId}:output:${node.id}:view`:node.params.inputMode==='raster'||node.params.inputMode==='decisions'?`urn:fieldwork:run:${runId}:view:${node.id}`:`urn:fieldwork:run:${runId}:map:${node.id}`;
  const iri=`urn:fieldwork:run:${runId}:map-specification:${node.id}`;
  const sources=workflow.edges.filter(e=>e.to===node.id).map(e=>`<urn:fieldwork:run:${runId}:output:${e.from}>`);
  // The layers this map DRAWS, which is not the same as the ports it has.
  //
  // Asserted as ports first, on 2026-10-14, and corrected the same day: "layer count should be
  // about layers not ports." The isochrone map has two ports and draws four things -- a boundary,
  // four time bands, 250 death locations and eight pumps -- because `summarize_polygons` keeps
  // the points it counted on the value it returns, so they reach the map without being wired.
  // Counting ports reported 2 for a picture a reader sees four layers in.
  //
  // So this reads the same value the renderer draws from, in the order it draws: ground first,
  // then fills, then marks. A layer that arrived inside another layer's value says so with
  // fw:layerWithin rather than claiming a port it does not have. See docs/widgets/map_output.md.
  const ground=`urn:fieldwork:run:${runId}:map-specification:${node.id}`;void ground;
  const portOf=(type:string)=>workflow.edges.find(e=>e.to===node.id&&e.port===type);
  const drawn:{kind:string;features?:number;port?:string;within?:string;role?:string;provider?:string}[]=[];
  // Ground first. A basemap is displayed, so it is a layer -- asserted only as fw:mapBasemap
  // until 2026-10-14, which made the one knob that puts a whole layer under the data read as a
  // property of the specification. The same defect as mode: a layer recorded as a setting.
  // It arrives through neither a port nor another layer's value, so it names its provider.
  if(spec.basemap!=='none')drawn.push({kind:'BasemapLayer',provider:spec.basemap});
  if(output.boundary)drawn.push({kind:'AreaLayer',port:portOf('area')?.port});
  if(output.raster)drawn.push({kind:'RasterLayer',port:portOf('raster')?.port});
  if(output.network)drawn.push({kind:'NetworkLayer',port:portOf('network')?.port});
  if(output.polygons?.features?.length)
    drawn.push({kind:'PolygonsLayer',features:output.polygons.features.length,port:portOf('polygons')?.port});
  if(output.polygons?.observations?.features?.length)
    drawn.push({kind:'PointsLayer',features:output.polygons.observations.features.length,
      within:portOf('polygons')?.port,role:'observations'});
  if(output.contextPoints?.features?.length)
    drawn.push({kind:'PointsLayer',features:output.contextPoints.features.length,port:portOf('context')?.port,role:'context'});
  else if(output.polygons?.sites?.length)
    drawn.push({kind:'PointsLayer',features:output.polygons.sites.length,within:portOf('polygons')?.port,role:'sites'});
  if(!output.polygons&&!output.raster&&output.rows?.length)
    drawn.push({kind:'PointsLayer',features:output.rows.filter(r=>r.coordinates).length,port:portOf('points')?.port});
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n<${iri}> a fw:MapSpecification, prov:Plan; dcterms:title ${JSON.stringify(spec.title)}; dcterms:description ${JSON.stringify(spec.subtitle)}; fw:mapLegend ${spec.legend}; fw:mapPresentation ${JSON.stringify(spec.presentation)}; fw:mapBasemap ${JSON.stringify(spec.basemap)}; fw:mapSourceNote ${JSON.stringify(spec.sourceNote)}; prov:wasDerivedFrom ${sources.join(', ')}.\n<${activity}> fw:mapSpecification <${iri}>; prov:used <${iri}>.\n`;
  const layerFacts=`<${iri}> fw:layerCount ${drawn.length}.\n`
    +drawn.map((layer,index)=>`<${iri}> fw:layer [ fw:layerIndex ${index}; fw:layerKind <urn:fieldwork:${layer.kind}>; `
      +`${layer.features!==undefined?`fw:layerFeatureCount ${layer.features}; `:''}`
      +`${layer.role?`fw:layerRole ${JSON.stringify(layer.role)}; `:''}`
      +`${layer.provider?`fw:layerTileProvider ${JSON.stringify(layer.provider)}`
        :layer.port?`fw:layerPort ${JSON.stringify(layer.port)}`
        :`fw:layerWithin ${JSON.stringify(layer.within||'the value')}`} ].\n`).join('');
  receipt.facts+=facts+layerFacts;receipt.input=receipt.facts;return facts+layerFacts;
}
