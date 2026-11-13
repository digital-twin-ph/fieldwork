import {orderedSteps,categoricalSteps,polygonShading,shadedValues,type classifyValues,type classifyCategories,FIGURE_ROLE,markPath} from './presentation.js';
import type {Polygons} from './catchments.js';
import type {DisplayValue,Receipt} from './results.js';
import type {Escape,Position,PointCollection,WorkflowNode} from './types.js';
export function polygonDisplay(p:Polygons,view:'map'|'table'|'chart'):DisplayValue{
  if(p.kind==='hexbin'){
    if(view==='chart')throw new Error('H3 cell charts are not configured in this example.');
    return {kind:'point-table',polygons:p,pointTable:true,centers:[],rows:p.features.map(f=>({id:f.id,recordId:f.id,name:f.name,coordinates:p.sites.find(s=>s.id===f.id)?.geometry?.coordinates||null,sourceNodeId:'aggregate_points_to_h3_cell',layerLabel:'H3 aggregate cells (centroids)',attributeTypes:{count:'integer'},attributes:{count:f.count??0}}))};
  }
  if(view==='chart'&&!p.summary)throw new Error('Connect Summarize points in polygons before a catchment chart.');
  if(view==='chart'&&p.summary?.valueField&&p.features.some(f=>f.total!<0))throw new Error('This chart supports nonnegative totals; use Table for signed summaries.');
  return {kind:'point-table',polygons:p,pointTable:true,centers:[],boundary:p.boundary,
    // A LABEL CANNOT BE PINNED TO ONE STUDY. The practitioner, 2026-10-28: *"Labels have to be
    // generic and applicable to similar artifacts in other studies. If we need to identify
    // polygons, we can use polygon_id."*
    //
    // This table said `siteId` for every polygon layer and called them all "Catchments". Neither
    // was true of what it was showing. South London's choropleth shades 32 ADMINISTRATIVE
    // SUB-DISTRICTS, which are not catchments of anything and have no sites -- `area-join.ts:141`
    // sets `siteId:part.id`, making each sub-district its own site to satisfy a required field,
    // and casts the result past the compiler with `as unknown as`. So a practitioner opening that
    // table met a column called `siteId` holding a sub-district's name, under a heading saying the
    // coordinates locate source sites when there are none.
    //
    // `polygon_id` identifies the polygon, which every producer has. `site_id` is emitted only
    // where the layer actually carries that site, which is what the field always meant.
    rows:p.features.map(f=>({id:f.id,recordId:f.id,name:f.name,coordinates:p.sites.find(s=>s.id===f.siteId)?.geometry?.coordinates||null,sourceNodeId:'catchments',layerLabel:p.sites.length?'Polygons (coordinates locate the site each was derived from)':'Polygons',attributeTypes:{},attributes:{polygon_id:f.id,...(p.sites.some(s=>s.id===f.siteId)?{site_id:f.siteId}:{}),
      // WHAT THE POLYGON CARRIES, as it carries it (2026-11-10): a space-time scan's clusters hold their days, counts and
      // p-value as properties, and the table showed none of them. Every polygon layer's own properties now show in Table;
      // a map's rows are unchanged.
      ...(view==='table'?f.properties??{}:{}),...(f.minutes!==undefined?{minutes:f.minutes}:{}),
      // A rule's conclusion about this polygon, and what it enclosed, shown where the polygon is
      // shown. Added 2026-10-14 with the port change that made a ruleset hand back the shapes it
      // judged: a judgement that travels with the record has to be visible on the record, or the
      // table a practitioner reads is poorer than the one the old decisions port gave them.
      // Experiment 113.
      ...(f.status!==undefined?{status:f.status,explanation:f.explanation??null}:{}),
      ...(f.areaSquareMetres!==undefined?{areaSquareMetres:f.areaSquareMetres}:{}),
      ...(p.summary?{locations:f.count!,numericTotal:p.summary.valueField?f.total!:null,missingValues:f.missingValues!}:{})}})),
    ...(view==='chart'?{chart:{field:p.summary!.valueField?'total' as const:'count' as const,caption:(p.features.some(f=>f.minutes!==undefined)?'Cumulative thresholds (not time bands). ':'')+(p.summary!.valueField?`Sum ${p.summary!.valueField} by polygon; missing values reported in Table`:'Location memberships by polygon; overlaps can count more than once'),total:p.summary!.records,bins:p.features.map(f=>({key:f.id,label:f.name,count:p.summary!.valueField?f.total!:f.count!,...(f.minutes===undefined?{}:{order:f.minutes})}))}}:{})};
}
export function polygonPresentationReceipt(node:WorkflowNode,source:string,runId:string,contextSource?:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:view`,kind=node.type==='map_output'?'MapView':node.type==='table_output'?'TableView':'ChartView';
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n<${activity}> a fw:${kind}, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>.\n<${entity}> a prov:Entity; prov:wasGeneratedBy <${activity}>.\n`;
  const context=node.type==='map_output'&&node.params.contextPoints;
  const presentation=node.type==='map_output'?node.params.presentation||'plot':kind;
  const extra=(contextSource?`<${activity}> prov:used <urn:fieldwork:run:${runId}:output:${contextSource}>.\n`:'')+`<${activity}> fw:parameters ${JSON.stringify(JSON.stringify({presentation,contextPoints:!!context}))}.\n`;
  return {nodeId:node.id,kind:'presentation',facts:facts+extra,input:facts+extra,rules:'',conclusions:[],method:'Display an existing polygon dataset and attributes without changing its geometry, membership or aggregation.'};
}
/** The frame `polygonSvg` draws in, so ground can be placed in it.
 *
 *  Same reason as `mapFrame` and `rasterFrame`: a caller that recomputes this arithmetic gets a
 *  slightly different answer, and a basemap a few pixels out is worse than none. Returns null
 *  where there is nothing to frame, which is the hexbin case with no cells. */
/** A STATIC PLOT'S FRAME, FROM ITS AREA'S SHAPE (2026-11-12, the practitioner: "Ok" to a frame that follows the area). 850
 *  wide always; as tall as the area needs at the plot's width, from 295, every frame's height until then, to 650, the
 *  walking-time plot's. A wide area keeps 295 and draws exactly as before; a tall one, such as Soho's deaths or Hagelloch,
 *  is no longer drawn small in a short strip. */
export function plotFrame(bounds:[number,number,number,number],usable:{width:number;margin:number}){
  const [west,south,east,north]=bounds,cos=Math.cos((south+north)/2*Math.PI/180);
  const w=Math.max((east-west)*cos,.00001),h=Math.max(north-south,.00001);
  const height=Math.max(295,Math.min(650,Math.round(usable.width*h/w+usable.margin)));
  const scale=Math.min(usable.width/w,(height-usable.margin)/h),middle=height/2-2.5;
  return {height,scale,cos,project:(c:Position):[number,number]=>[425+(c[0]-(east+west)/2)*cos*scale,middle-(c[1]-(north+south)/2)*scale]};
}
export function polygonFrame(p:Polygons):{project:(c:Position)=>[number,number];bounds:[number,number,number,number];height:number}|null{
  const coords=p.kind==='hexbin'
    ?p.features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates.flat():f.geometry.coordinates.flat(2))
    :[...p.features.flatMap(f=>(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat())).flat(),
      ...p.sites.flatMap(f=>f.geometry?[f.geometry.coordinates]:[])];
  if(!coords.length)return null;
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const c of coords as Position[]){
    if(c[0]<west)west=c[0];if(c[0]>east)east=c[0];
    if(c[1]<south)south=c[1];if(c[1]>north)north=c[1];
  }
  const frame=plotFrame([west,south,east,north],{width:790,margin:60});
  return {bounds:[west,south,east,north],height:frame.height,project:frame.project};
}
export function polygonSvg(p:Polygons,esc:Escape):string{
  if(p.kind==='hexbin'){
    const coords=p.features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates.flat():f.geometry.coordinates.flat(2));
    if(!coords.length)return '<text x="30" y="40">No cells meet the minimum occupancy</text>';
    // Folded: spreading a province's worth of coordinates into Math.min overflows the call stack.
    let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
    for(const c of coords){
      if(c[0]<west)west=c[0];if(c[0]>east)east=c[0];
      if(c[1]<south)south=c[1];if(c[1]>north)north=c[1];
    }
    const {project,height}=plotFrame([west,south,east,north],{width:790,margin:60});
    return `<rect width="850" height="${height}" fill="#f7faf8"/>`+p.features.map(f=>`<path data-hex-cell="${esc(f.id)}" d="M${(f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates[0][0]).map(c=>project(c).join(',')).join('L')}Z" fill="#3686a8" fill-opacity=".25" stroke="#19617c" stroke-width="1"><title>${esc(f.id)} · ${f.count} locations</title></path>`).join('')+'<text x="20" y="282" font-size="14">H3 aggregate cells · sparse cells omitted</text>';
  }
  const rings=p.features.flatMap(f=>f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()),coords=[...rings.flat(),...p.sites.flatMap(f=>f.geometry?[f.geometry.coordinates]:[]),...(p.observations?.features||[]).flatMap(f=>f.geometry?[f.geometry.coordinates]:[])];if(!coords.length)return '<text x="30" y="40">No intersecting polygons or located points</text>';
  const [west,south,east,north]=coords.reduce(([w,s,e,n],c)=>[Math.min(w,c[0]),Math.min(s,c[1]),Math.max(e,c[0]),Math.max(n,c[1])],[Infinity,Infinity,-Infinity,-Infinity]);
  const {project,height}=plotFrame([west,south,east,north],{width:790,margin:60});
  // COLOURED BY VALUE WHERE THERE IS ONE, by position where there is not. A catchment's colour
  // says which catchment; a choropleth's colour says how much, and reading the second as the
  // first is the misreading this whole figure exists to avoid. `classifyValues` returns null
  // when nothing carries a value, which is every figure this renderer drew before today.
  // CLASSES THAT CANNOT BE RANKED, and they take precedence because ASKING FOR THEM IS A
  // DECISION SOMEBODY MADE.
  //
  // A feature carries a category only where the join was told to carry one, and telling it to is
  // the practitioner declaring that this figure is about the class. The first version of this
  // let a numeric value win, reasoning that a choropleth must never silently become a map of
  // water companies -- but the table behind Snow's exposure map carries deaths per sub-district
  // AS WELL as the supplying company, so that rule drew the wrong figure for the one case the
  // feature was built for. The protection is real and belongs upstream: a category exists only
  // when it was asked for, so nothing can become categorical by accident.
  const {grouped,classed}=polygonShading(p.features);
  // ORDERED WHERE THERE IS AN ORDER. Bands carry `minutes` and rank; named regions do not, and
  // YlGnBu's whole design is a lightness ramp a reader is meant to rank. Tidal and non-tidal
  // drawn in two steps of it assert a sequence the categories do not have.
  const banded=p.features.some(f=>f.minutes!==undefined);
  // Null past the palette's length: more regions than hues is a neutral wash, not a repeat.
  // A HUE PER FEATURE ONLY WHERE THE FEATURES ARE NAMED THINGS, for the reason `categoricalKey`
  // gives: numbered parts of one layer are not categories, and colouring them as though they
  // were asserts a grouping nobody made.
  const categorical=classed||grouped||banded||p.featuresNamed===false?null
    :categoricalSteps(p.features.length);
  // THE WASH THE PALETTE PROMISES. `categoricalSteps` returns null past its length and says in
  // its own comment that "the caller keeps its neutral fill"; this caller fell through to
  // `orderedSteps`, which is YlGnBu -- a SEQUENTIAL ramp. So 34 named regions with no value and
  // no rank were drawn in a lightness sequence a reader is meant to rank, which is the precise
  // misreading the categorical work of 2026-10-28 was done to prevent. Written into the comment
  // that day and not into the line beneath it; reported 2026-10-29 off a published figure.
  //
  // Bands keep the ramp, because minutes DO have an order. Everything else past the palette is
  // one neutral: no hue competing, and the naming left to the labels and the key.
  const wash=!classed&&!grouped&&!banded&&!categorical;
  const colors=classed?classed.colours
    :grouped?grouped.colours
    :categorical??(wash?[FIGURE_ROLE.unknown]:orderedSteps(p.features.length));
  return `<rect width="850" height="${height}" fill="#f7faf8"/>`+p.features.map((f,i)=>{const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const at=classed?classed.classOf(f.value):grouped?grouped.classOf(f.category):null;
    // A part with no value is drawn in a neutral, never in the lowest class: an unmatched
    // boundary would otherwise read as a finding of low incidence rather than as no data.
    // A part with no class is drawn in the neutral for the same reason a part with no value is:
    // a sub-district nobody has assigned a company to must not read as belonging to the first.
    const fill=classed||grouped?(at===null?FIGURE_ROLE.unknown:colors[at]):colors[i%colors.length];
    // Value-bearing fills are readable at full strength; a catchment's identity wash is not
    // the same thing and keeps the lighter tint it has always had.
    const opacity=classed||grouped?(at===null?'.18':'.78'):categorical?'.55':wash?'.16':'.22';
    return `<path data-catchment="${esc(f.id)}"${classed&&f.value!==undefined?` data-value="${f.value}"`:''}${grouped&&f.category?` data-category="${esc(f.category)}"`:''} d="${polys.flat().map(r=>'M'+r.map(c=>project(c).join(',')).join('L')+'Z').join('')}" fill="${fill}" fill-opacity="${opacity}" fill-rule="evenodd" stroke="${classed?FIGURE_ROLE.quietInk:fill}" stroke-width="${classed?'.6':'1'}"><title>${esc(f.name)}${f.category?` · ${esc(f.category)}`:''}${f.value===undefined?'':` · ${f.value}`}${f.count===undefined?'':` · ${f.count} locations`}</title></path>`;}).join('')+(p.observations?.features||[]).filter(f=>f.geometry).map(f=>{const [x,y]=project(f.geometry!.coordinates);return `<circle cx="${x}" cy="${y}" r="1.8" fill="#70523a"><title>${esc(f.properties.name)}</title></circle>`;}).join('')+p.sites.filter(f=>f.geometry).map(f=>{const [x,y]=project(f.geometry!.coordinates);return `<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="#174d47"><title>${esc(f.properties.name)}</title></rect>`;}).join('')+plotKey(p,classed,esc,grouped,height);
}

// THE KEY NAMES WHAT IS DRAWN, and nothing else. This line was a fixed string -- "Squares:
// sites · dots: observations · polygons: modeled catchments" -- printed under every figure this
// renderer produced, including a choropleth of sub-district mortality that has no sites, no
// observations and no modeled catchment anywhere on it. A key that describes marks the figure
// does not carry is worse than no key: it is the one part of a figure a reader trusts without
// checking. `EveryMarkIsInTheKey` in map-conformance asks the converse of the same question.
function plotKey(p:Polygons,classed:ReturnType<typeof classifyValues>,esc:Escape,
  grouped:ReturnType<typeof classifyCategories>=null,height=295):string{
  // AT THE FOOT OF THE FRAME, whatever its height (2026-11-13): placed for 295, the ramp sat across the middle of Botswana's
  // districts in a 650 frame. A 295 frame draws it where it always was.
  const foot=height-295;
  const marks:string[]=[];
  if(p.sites.some(f=>f.geometry))marks.push('squares: sites');
  if((p.observations?.features||[]).some(f=>f.geometry))marks.push('dots: observations');
  // What the polygons ARE differs with what they carry. A catchment is modeled; a boundary
  // shaded by a joined value is measured, and calling it modeled would misreport its standing.
  // WHAT THE POLYGONS ARE, in the layer's own name where it has one. "Polygons: modeled
  // catchments" was printed under a figure of the Thames on 2026-10-29: these were read from a
  // published extract and modelled by nobody. A catchment is modelled; a read water body is not,
  // and the key is the one part of a figure a reader trusts without checking.
  // WHAT THE SHADE IS, by the layer's own name for it where it gives one: "population, people per pixel", not "the joined
  // value", which a raster's totals are not.
  marks.push(classed?`polygon shade: ${p.valueName?.trim()||'the joined value'}`
    :p.layerName?.trim()?`polygons: ${p.layerName.trim()}`
    :p.features.some(f=>f.minutes!==undefined)?'polygons: modeled catchments'
    :'polygons: the layer drawn');
  // The method belongs on the key line, not beside the ramp: set beside it, the sentence ran
  // across the polygons it was explaining.
  const method=classed?` · ${classed.classes} ${classed.method==='quantile'
    ?'quantile classes, about equal counts, so the shade shows rank'
    :'equal-interval classes, equal value spans, so the shade shows magnitude'}`
    // SAID, so a reader is not left to infer from the absence of breaks that there is an order.
    :grouped?` · polygon shade: the class each part belongs to, which has no order`:'';
  const key=`<text x="20" y="${foot+(classed||grouped?290:282)}" font-size="14">`
    +esc(marks.join(' · ').replace(/^./,c=>c.toUpperCase())+method)+'</text>';
  // THE CLASSES, NAMED. A categorical figure's key is the only place a reader learns what a hue
  // MEANS -- there is no ramp to read and no breaks to interpolate -- so a swatch without its
  // label is a colour with no referent. `EveryMarkIsInTheKey` asks the converse of this.
  //
  // Laid out in rows of two rather than a strip, because a class label is a phrase ("Southwark
  // and Vauxhall Company only") and not a number, and a strip of 56-pixel swatches has nowhere
  // to put one.
  if(grouped){
    const perRow=2,swatch=11;
    return grouped.labels.map((label,i)=>{
      const x=22+(i%perRow)*402,y=foot+250+Math.floor(i/perRow)*18;
      return `<rect x="${x}" y="${y}" width="${swatch}" height="${swatch}" `
        +`fill="${grouped.colours[i]}" fill-opacity=".78" `
        +`stroke="${FIGURE_ROLE.quietInk}" stroke-width=".4"/>`
        +`<text x="${x+swatch+6}" y="${y+swatch-1}" font-size="14" `
        +`fill="${FIGURE_ROLE.quietInk}">${esc(label)}</text>`;
    }).join('')+key;
  }
  if(!classed)return key;

  // A SHADE WITHOUT ITS BREAKS SAYS ONLY "MORE" AND "LESS". The classes are quantiles taken from
  // the data, so every break printed here is a value that occurs in it and a reader can find the
  // sub-district that sits on one. Experiment 137.
  const values=shadedValues(p.features);
  const lowest=Math.min(...values);
  // THE RAMP WITH ITS EDGES, as the practitioner reads it (2026-11-13: "The legend is readable"), each class 90 pixels wide
  // so seven-figure edges with their separators stand apart: at 56, Botswana's 143454 and 217031 touched.
  const width=90,left=40,top=foot+250;
  const round=(v:number)=>{const a=Math.abs(v);return Number(a>=100?v.toFixed(0):a>=10?v.toFixed(1):v.toFixed(2)).toLocaleString('en');};
  const swatches=classed.colours.map((colour,i)=>
    `<rect x="${left+i*width}" y="${top}" width="${width}" height="10" fill="${colour}" `
    +`fill-opacity=".78" stroke="${FIGURE_ROLE.quietInk}" stroke-width=".4"/>`).join('');
  const edges=[lowest,...classed.breaks].map((v,i)=>
    `<text x="${left+i*width}" y="${top+23}" font-size="14" text-anchor="middle" `
    +`fill="${FIGURE_ROLE.quietInk}">${round(v)}</text>`).join('');
  return swatches+edges+key;
}

/** The plot's frame: the extent it fits, the pixels it gives a degree of latitude, and the
 *  projection itself.
 *
 *  Exported so a scale bar is drawn from the same number the geometry was drawn with. Computing it
 *  twice is the defect this repository keeps finding -- two lists that must agree will not -- and a
 *  scale bar that disagrees with its own map is worse than none, because a reader measures off it.
 *  Returns null when there is nothing located to plot. */
export function catchmentFrame(p:Polygons,context?:PointCollection):{project:(c:Position)=>number[];pixelsPerDegreeLatitude:number;bounds:[number,number,number,number]}|null{
  const sites=context?.features||p.sites,observations=p.observations?.features||[];
  const coords=[...p.features.flatMap(f=>(f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat()).flat()),...sites.flatMap(f=>f.geometry?[f.geometry.coordinates]:[]),...observations.flatMap(f=>f.geometry?[f.geometry.coordinates]:[])];
  if(!coords.length)return null;
  const [west,south,east,north]=coords.reduce(([w,s,e,n],c)=>[Math.min(w,c[0]),Math.min(s,c[1]),Math.max(e,c[0]),Math.max(n,c[1])],[Infinity,Infinity,-Infinity,-Infinity]);
  const cos=Math.cos((south+north)/2*Math.PI/180),scale=Math.min(680/Math.max((east-west)*cos,.00001),490/Math.max(north-south,.00001));
  return {project:(c:Position)=>[460+(c[0]-(east+west)/2)*cos*scale,310-(c[1]-(north+south)/2)*scale],
    pixelsPerDegreeLatitude:scale,bounds:[west,south,east,north]};
}

/** NB04-style geographic plot. SVG retains vector geometry for export. */
export function catchmentPlot(p:Polygons,esc:Escape,context?:PointCollection):string{
  const sites=context?.features||p.sites,observations=p.observations?.features||[];
  const frame=catchmentFrame(p,context);
  if(!frame)return '<text x="40" y="50">No located geometry to plot</text>';
  const {project,bounds:[west,south,east,north]}=frame;
  let svg=`<desc>${esc(p.method+' / '+p.notes.join(' '))}</desc>`+// The frame around the plot was 740x530 of ink carrying nothing, and the heading duplicated the
  // title the standalone figure already puts above it. Both removed 2026-10-13, after Tufte: what is
  // left on the page is the geometry, its axis labels, and the furniture a reader measures with.
  '<rect width="850" height="650" fill="white"/>';
  for(let i=0;i<=4;i++){const lon=west+(east-west)*i/4,lat=south+(north-south)*i/4,x=project([lon,south])[0],y=project([west,lat])[1];svg+=`<text x="${x}" y="595" text-anchor="middle" font-size="14">${lon.toFixed(4)}</text><text x="78" y="${y+4}" text-anchor="end" font-size="14">${lat.toFixed(4)}</text>`;}
  svg+='<text x="455" y="617" text-anchor="middle" font-size="14">Longitude</text><text transform="translate(20,310) rotate(-90)" text-anchor="middle" font-size="14">Latitude</text>';
  for(const f of [...p.features].sort((a,b)=>(b.minutes||0)-(a.minutes||0))){const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();svg+=`<path data-catchment="${esc(f.id)}" d="${rings.map(r=>'M'+r.map(c=>project(c).join(',')).join('L')+'Z').join('')}" fill="#1f77b4" fill-opacity=".2" fill-rule="evenodd"><title>${esc(f.name)}</title></path>`;}
  // THE COLOURS THE KEY NAMES, and the shapes it draws. This plot used `gray` and `red` while the
  // legend beside it named Okabe-Ito's #CC79A7 and #E69F00 and drew the sites as squares, so a
  // reader matching marks to the key matched nothing. Worse than a mismatch: `red` on `gray` is
  // the pair that fails first under the commonest colour vision deficiencies, and neither colour
  // is in the declared palette -- which is what CategoricalPaletteIsColourBlindSafe exists to
  // prevent, on a figure it was not checking. Found 2026-10-25 by rendering it to look at it.
  //
  // Shape carries the distinction as well as hue, so the two are told apart without colour.
  for(const [fs,color,r,shape,kind] of [
    [observations,FIGURE_ROLE.secondary,2.7,'circle','observation'],
    [sites,FIGURE_ROLE.site,4,'square','site']] as const)
    for(const f of fs){if(!f.geometry)continue;const [x,y]=project(f.geometry.coordinates);
      svg+=`<path data-plot-${kind}="${esc(f.id)}" d="${markPath(shape,x,y,r)}" fill="${color}" stroke="white" stroke-width=".8"><title>${esc(f.properties.name)}</title></path>`;}
  const times=[...new Set(p.features.flatMap(f=>f.minutes===undefined?[]:[f.minutes]))].sort((a,b)=>a-b);
  return svg+`<text x="425" y="640" text-anchor="middle" font-size="14">${times.length?'Cumulative regions: '+times.join(', ')+' min · ':''}Dots: observations · squares: sites · CRS84</text>`;
}
