/** THE STATIC MAP OF A RESULT THAT CARRIES A BOUNDARY: the outline, its points and their layers, drawn as SVG. Every
 *  static map with a study area draws through here. It lived in Old Naledi's UI module as `oldMap`, a general renderer
 *  inside one example's code, and moved out when Old Naledi retired (docs/audits/old-naledi-audit.md, 2026-11-11);
 *  its overlay caption, "OLD NALEDI · SOURCE BOUNDARY" and later "STUDY AREA · SPATIAL COVERAGE", went with it. */
import {linkLinesSvg} from './map-links.js';
import type {Escape,Position} from './types.js';
import type {DisplayValue} from './results.js';
import {markPath} from './presentation.js';
import {markLabel,LABEL_CEILING} from './point-layers.js';

/** The frame this map draws in, and the projection that puts anything else in it.
 *
 *  Extracted so a caller can place something in the same frame without recomputing the
 *  arithmetic and getting a slightly different answer -- the pattern `rasterFrame` already uses.
 *  A basemap needs both: the extent, to know which tiles cover it, and the projection, to place
 *  each tile by its own corners. Experiment 137. */
export function staticMapFrame(output:DisplayValue){
  const boundary=output.boundary!,polygons=boundary.type==='MultiPolygon'?boundary.coordinates:[boundary.coordinates];
  const outline=polygons.flat(2),points=[...outline,...output.rows.filter(r=>r.coordinates!).map(r=>r.coordinates!),...(output.centers||[]).filter(c=>c.geometry).map(c=>c.geometry!.coordinates)];
  const xs=points.map(p=>p![0]),ys=points.map(p=>p![1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),cos=Math.cos((ymin+ymax)/2*Math.PI/180);
  const scale=Math.min(720/Math.max((xmax-xmin)*cos,.001),225/Math.max(ymax-ymin,.001));
  return {polygons,xmin,xmax,ymin,ymax,cos,scale,
    bounds:[xmin,ymin,xmax,ymax] as [number,number,number,number],
    project:(p:Position):[number,number]=>[425+(p[0]-(xmin+xmax)/2)*cos*scale,145-(p[1]-(ymin+ymax)/2)*scale]};
}
/** `labelField` names each layer's marks, keyed by source node, exactly as it does for the
 *  polygon plot. Passed in rather than read here so BOTH static renderers name marks the same
 *  way: this widget's history is a list of layers one renderer carried and another did not. */
export function staticBoundaryMap(output:DisplayValue,selected:string|null|undefined,esc:Escape,statusLabel:(status:string|undefined)=>string,labelField:Record<string,string>={}){
  const {polygons,project}=staticMapFrame(output);
  let svg='<rect width="850" height="295" fill="#f0f3e9"/>';
  // TAGGED AS CARRYING NO VALUE. This polygon is a boundary: it says where the study area is and
  // encodes no measurement, so its fill is spending a visual variable on nothing -- the same
  // objection `UnknownIsNotAHue` already makes about hue, one channel over. On a blank page a
  // pale wash still earns its place by separating figure from ground; over a basemap it simply
  // hides the ground, which is what the practitioner met on the South London figure, 2026-10-25.
  // So the fill is declared here and withdrawn by whoever draws ground underneath it.
  svg+=polygons.map(rings=>`<path data-fill-role="context" d="${rings.map(ring=>'M'+ring.map(p=>project(p).join(',')).join('L')+'Z').join(' ')}" fill="#dbe8d6" stroke="#668870" stroke-width="1.5" fill-rule="evenodd"/>`).join('');
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
  const symbols=(output as {layerSymbols?:Record<string,{colour:string;shape:Parameters<typeof markPath>[0];size?:number}>}).layerSymbols;
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
  for(const r of output.rows){if(!r.coordinates!)continue;const [x,y]=project(r.coordinates!),label=['spatial-coverage','spatial-map'].includes(output.kind||'')?(r.excluded?'Excluded':r.relation):statusLabel(r.status);
    const symbol=symbols?.[r.sourceNodeId||''];
    // The layer's own radius, or the default where none was chosen. A focused mark is drawn
    // larger than whatever that is, rather than at a fixed size that could be smaller than the
    // mark it is meant to pick out.
    const base=symbol?.size??4;
    const radius=focus?.id===r.id?base+3:base;
    const statusFill={Review:'#c18b4f',NoFlag:'#699178',Unknown:'#a89b87'}[r.status!];
    // `hollow` is the declared fill for a point outside the area, and `absent` for one a clip set
    // aside: drawn as an outline and as a neutral, never as a second hue competing with a layer.
    const hollow=r.relation==='Outside',aside=r.excluded||r.relation==='MissingLocation';
    const ink=classColour(r.sourceNodeId,(r as {pinClass?:string}).pinClass)||symbol?.colour;
    const mark=symbol
      ?`<path d="${markPath(symbol.shape,x,y,radius)}" fill="${hollow?'none':aside?'#a89b87':ink}" stroke="${aside?'#a89b87':ink}" stroke-width="1.6"/>`
      :`<circle cx="${x}" cy="${y}" r="${radius}" fill="${statusFill}" stroke="white" stroke-width="1.2"/>`;
    const named=output.rows.filter(x=>x.coordinates&&x.sourceNodeId===r.sourceNodeId).length<=LABEL_CEILING
      ?markLabel(r as never,labelField[r.sourceNodeId||''],x,y,radius,esc):'';
    svg+=`<g class="location" role="button" tabindex="0" data-place="${esc(r.id)}" data-layer="${esc(r.sourceNodeId||'')}" aria-label="${esc(r.name)}, ${esc(label)}${r.layerLabel?', '+esc(r.layerLabel):''}"><title>${esc(r.name)} · ${esc(label)}${r.layerLabel?' · '+esc(r.layerLabel):''}</title>${mark}${named}</g>`;}
  // No caption or instruction printed on the figure (2026-11-11): the map's title and key say what it is.
  return svg
    +`<text x="826" y="25" text-anchor="middle">N \u2191</text>`;
}
