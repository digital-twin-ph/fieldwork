/** THE STATIC MAP OF A RESULT THAT CARRIES A BOUNDARY: the outline, its points and their layers, drawn as SVG. Every
 *  static map with a study area draws through here. It lived in Old Naledi's UI module as `oldMap`, a general renderer
 *  inside one example's code, and moved out when Old Naledi retired (docs/audits/old-naledi-audit.md, 2026-11-11);
 *  its overlay caption, "OLD NALEDI · SOURCE BOUNDARY" and later "STUDY AREA · SPATIAL COVERAGE", went with it. */
import {plotFrame} from './catchment-output.js';
import {proportionalRadius,sizedLargest,layerRanks,colouredClasses} from './point-layers.js';
import {linkLinesSvg} from './map-links.js';
import type {Escape,Position} from './types.js';
import type {DisplayValue} from './results.js';
import {markPath} from './presentation.js';
import {markLabel,LABEL_CEILING,MERGED_MARKS_FROM,MarkBatch} from './point-layers.js';

/** The frame this map draws in, and the projection that puts anything else in it.
 *
 *  Extracted so a caller can place something in the same frame without recomputing the
 *  arithmetic and getting a slightly different answer -- the pattern `rasterFrame` already uses.
 *  A basemap needs both: the extent, to know which tiles cover it, and the projection, to place
 *  each tile by its own corners. Experiment 137. */
/** `box`: draw over this extent instead of the data's own, for an inset's enlarged view (Map's manual, History: the inset). */
export function staticMapFrame(output:DisplayValue,box?:readonly [number,number,number,number]){
  const boundary=output.boundary!,polygons=boundary.type==='MultiPolygon'?boundary.coordinates:[boundary.coordinates];
  const outline=polygons.flat(2),points=box?[[box[0],box[1]],[box[2],box[3]]]:[...outline,...output.rows.filter(r=>r.coordinates!).map(r=>r.coordinates!),...(output.centers||[]).filter(c=>c.geometry).map(c=>c.geometry!.coordinates)];
  // A LOOP, NEVER Math.min(...xs) (2026-11-19). The practitioner's DR Congo at the first level, 26 provinces and 194,009
  // vertices, drew a blank map: spreading that many numbers into one call threw "Maximum call stack size exceeded", which
  // the map swallowed. study-area.ts has warned of exactly this since 2026-10-18; this frame had not heeded it.
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const p of points){const x=p![0]!,y=p![1]!;if(x<xmin)xmin=x;if(x>xmax)xmax=x;if(y<ymin)ymin=y;if(y>ymax)ymax=y;}
  const cos=Math.cos((ymin+ymax)/2*Math.PI/180);
  const frame=plotFrame([xmin,ymin,xmax,ymax],{width:720,margin:70}),scale=frame.scale;
  return {polygons,xmin,xmax,ymin,ymax,cos,scale,height:frame.height,
    bounds:[xmin,ymin,xmax,ymax] as [number,number,number,number],
    project:frame.project};
}
/** `labelField` names each layer's marks, keyed by source node, exactly as it does for the
 *  polygon plot. Passed in rather than read here so BOTH static renderers name marks the same
 *  way: this widget's history is a list of layers one renderer carried and another did not. */
export function staticBoundaryMap(output:DisplayValue,selected:string|null|undefined,esc:Escape,statusLabel:(status:string|undefined)=>string,labelField:Record<string,string>={},
  box?:readonly [number,number,number,number],
  /** For a drawing shown smaller than its 850 units, as an inset is (Map's manual, History: the inset): marks and lines drawn this many
   *  times larger, so on the page they are the size they are on the whole map. */
  markScale=1){
  const {polygons,project,height}=staticMapFrame(output,box);
  let svg=`<rect width="850" height="${height}" fill="#f0f3e9"/>`;
  // TAGGED AS CARRYING NO VALUE. This polygon is a boundary: it says where the study area is and
  // encodes no measurement, so its fill is spending a visual variable on nothing -- the same
  // objection `UnknownIsNotAHue` already makes about hue, one channel over. On a blank page a
  // pale wash still earns its place by separating figure from ground; over a basemap it simply
  // hides the ground, which is what the practitioner met on the South London figure, 2026-10-25.
  // So the fill is declared here and withdrawn by whoever draws ground underneath it.
  svg+=polygons.map(rings=>`<path data-fill-role="context" d="${rings.map(ring=>'M'+ring.map(p=>project(p).join(',')).join('L')+'Z').join(' ')}" fill="#dbe8d6" stroke="#668870" stroke-width="${1.5*markScale}" fill-rule="evenodd"/>`).join('');
  const focus=output.rows.find(r=>'result:'+r.id===selected);
  if(focus?.center){svg+=`<path d="M${project(focus.coordinates!).join(',')}L${project(focus.center.coordinates!).join(',')}" stroke="#587d6c" stroke-dasharray="4 4"/>`;}
  for(const c of output.centers||[]){if(!c.geometry)continue;const [x,y]=project(c.geometry!.coordinates);svg+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" fill="#315d57" stroke="white"/><text x="${x+9}" y="${y-8}">${esc(c.properties.name)}</text>`;}
  // THE ENCODING THE KEY ALREADY PROMISES. Hue and mark say which source a point came from and
  // fill says whether it is inside the study area -- the Inspector states it in those words, the
  // legend draws one entry per layer in that layer's hue and mark, the interactive map honours it
  // and the raster map was taught it on 2026-10-25. This renderer, the plainest static map in the
  // application, drew every mark as a circle coloured by status instead.
  //
  // Found the same day on Snow's own map: the key said the eight pumps were orange squares and
  // the plot drew 258 identical green dots, so the one distinction the figure exists to make --
  // deaths here, pumps there -- was the one it did not draw. A legend that disagrees with its
  // plot is worse than no legend; the reader trusts it.
  //
  // Where no symbols are declared the status colours stand, so every example that predates layer
  // symbols looks exactly as it did.
  const symbols=(output as {layerSymbols?:Record<string,{colour:string;shape:Parameters<typeof markPath>[0];size?:number;sizeBy?:string;colourBy?:string}>}).layerSymbols;
  // COLOUR BY, HERE TOO (2026-11-13): this renderer never read it, so MERS's static map drew twelve hospitals in one blue
  // under a key that said "coloured by cases". Each coloured layer's classes, as the interactive map and the polygon
  // figure take them.
  const coloured=colouredClasses(output.rows as never,(symbols||{}) as never);
  const colourValue=(r:typeof output.rows[number])=>{const by=symbols?.[r.sourceNodeId||'']?.colourBy;if(!by)return null;
    const v=(r as {attributes?:Record<string,unknown>}).attributes?.[by];return v===''||v===null||v===undefined?null:Number(v);};
  // AND THE PIN CLASS, WHERE THE LAYER HAS ONE. The interactive map drew "water intake" and
  // "tidal limit" in two hues while this one drew both in the layer's single colour -- the same
  // disagreement between a figure and its key that this comment block records for the pumps, one
  // encoding further on. A class is what a record IS; the layer is where it came from.
  const classes=(output as {pinClasses?:Record<string,{value:string;colour:string}[]>}).pinClasses;
  const classColour=(source?:string,pinClass?:string):string|undefined=>
    pinClass?classes?.[source||'']?.find(entry=>entry.value===pinClass)?.colour:undefined;
  // THE LINES FROM EACH RECORD TO THE ONE IT NAMES, under the marks so a mark is never hidden by a line.
  const links=(output as {links?:import('./map-links.js').MapLink[]}).links;
  if(links?.length)svg+=linkLinesSvg(links,output.rows,project as never,undefined,symbols?.[links[0]!.sourceNodeId]?.size??4);
  // PROPORTIONAL SYMBOLS (experiment 210): each sized layer's largest value, and its marks drawn largest first.
  const largest=sizedLargest(output.rows as never,(symbols||{}) as never);
  const valueOf=(r:typeof output.rows[number])=>{const by=symbols?.[r.sourceNodeId||'']?.sizeBy;return by?Number((r as {attributes?:Record<string,unknown>}).attributes?.[by])||0:0;};
  // Layer by layer in the order set in Manage layers (2026-11-12); within a sized layer, the largest marks first.
  const rank=layerRanks((output as {mapLayers?:{sourceNodeId?:string}[]}).mapLayers);
  const rows=[...output.rows].map((r,at)=>({r,at})).sort((a,b)=>rank(a.r.sourceNodeId)-rank(b.r.sourceNodeId)||valueOf(b.r)-valueOf(a.r)||(colourValue(a.r)??0)-(colourValue(b.r)??0)||a.at-b.at).map(x=>x.r);
  // EACH LAYER COUNTED ONCE. This counted the layer again for every mark (2026-11-19): 2.5 billion steps at 50,000 points.
  const perLayer=new Map<string,number>();
  for(const r of output.rows)if(r.coordinates)perLayer.set(r.sourceNodeId||'',(perLayer.get(r.sourceNodeId||'')??0)+1);
  const batch=new MarkBatch();let batched='',batchedCount=0,batchedName='';
  const flush=()=>{if(batch.size)svg+=batch.svg(batched,batchedCount,batchedName,esc);batchedCount=0;};
  for(const r of rows){if(!r.coordinates!)continue;if((r.sourceNodeId||'')!==batched){flush();batched=r.sourceNodeId||'';}const [x,y]=project(r.coordinates!),label=['spatial-coverage','spatial-map'].includes(output.kind||'')?(r.excluded?'Excluded':r.relation):statusLabel(r.status);
    const symbol=symbols?.[r.sourceNodeId||''];
    // The layer's own radius, or the default where none was chosen. A focused mark is drawn
    // larger than whatever that is, rather than at a fixed size that could be smaller than the
    // mark it is meant to pick out.
    const ramp=symbol?.colourBy?coloured.get(r.sourceNodeId||''):undefined;
    const step=ramp?ramp.classOf(colourValue(r)):null;
    const sized=!ramp&&!!symbol?.sizeBy&&largest.has(r.sourceNodeId||'');
    // A colour must be big enough to read: a coloured mark is never under 7 px across the radius.
    const base=sized?proportionalRadius((r as {attributes?:Record<string,unknown>}).attributes?.[symbol!.sizeBy!],largest.get(r.sourceNodeId||'')!,symbol?.size??4)
      :ramp?Math.max(7,symbol?.size??4):symbol?.size??4;
    const radius=(focus?.id===r.id?base+3:base)*markScale;
    const statusFill={Review:'#c18b4f',NoFlag:'#699178',Unknown:'#a89b87'}[r.status!];
    // `hollow` is the declared fill for a point outside the area, and `absent` for one a clip set
    // aside: drawn as an outline and as a neutral, never as a second hue competing with a layer.
    const hollow=r.relation==='Outside',aside=r.excluded||r.relation==='MissingLocation';
    const ink=ramp?(step===null?'#a89b87':ramp.colours[step]!):classColour(r.sourceNodeId,(r as {pinClass?:string}).pinClass)||symbol?.colour;
    const mark=symbol
      ?`<path d="${markPath(symbol.shape,x,y,radius)}" fill="${hollow?'none':aside?'#a89b87':ink}"${sized?' fill-opacity="0.55"':''} stroke="${aside?'#a89b87':ink}" stroke-width="${1.6*markScale}"/>`
      :`<circle cx="${x}" cy="${y}" r="${radius}" fill="${statusFill}" stroke="white" stroke-width="${1.2*markScale}"/>`;
    if(symbol&&(perLayer.get(r.sourceNodeId||'')??0)>MERGED_MARKS_FROM&&focus?.id!==r.id){
      batch.add(`fill="${hollow?'none':aside?'#a89b87':ink}"${sized?' fill-opacity="0.55"':''} stroke="${aside?'#a89b87':ink}" stroke-width="${1.6*markScale}"`,
        markPath(symbol.shape,x,y,radius));
      batchedCount++;batchedName=r.layerLabel||r.sourceNodeId||'';continue;}
    const named=(perLayer.get(r.sourceNodeId||'')??0)<=LABEL_CEILING
      ?markLabel(r as never,labelField[r.sourceNodeId||''],x,y,radius,esc):'';
    svg+=`<g class="location" role="button" tabindex="0" data-place="${esc(r.id)}" data-layer="${esc(r.sourceNodeId||'')}" aria-label="${esc(r.name)}, ${esc(label)}${r.layerLabel?', '+esc(r.layerLabel):''}"><title>${esc(r.name)} · ${esc(label)}${r.layerLabel?' · '+esc(r.layerLabel):''}</title>${mark}${named}</g>`;}
  flush();
  // No caption or instruction printed on the figure (2026-11-11): the map's title and key say what it is.
  return svg
    +`<text x="826" y="25" text-anchor="middle">N \u2191</text>`;
}
