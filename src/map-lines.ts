/** THE LINE LAYERS A MAP CARRIES, and how every renderer draws them (experiment 229).
 *
 *  A MODULE OF ITS OWN BECAUSE BOTH STATIC RENDERERS NEED IT (2026-11-24). These lived in `static-map.ts`, which is
 *  one of the two renderers; the other, `catchment-output.ts`, is imported BY it, so it could not import them back
 *  without a cycle. The practical consequence was the defect this move fixes: a map carrying polygons is drawn by
 *  `polygonSvg`, which had no way to reach this code, so hand-drawn lines were shown in the interactive preview and
 *  on no static figure. `map-layer-list.ts` records the general version of this -- *"a layer is carried where
 *  somebody remembered to carry it"* -- and the remedy is the same: put the layer somewhere every renderer can see. */
import type {LineLayer} from './types.js';
import type {DisplayValue} from './results.js';

/** A line layer as a map carries it: the layer, plus the step it came from and that step's label, which is what
 *  Manage layers lists it by and what the hide switch keys on. */
export type LineLayerOnMap=LineLayer&{sourceNodeId:string;label:string};

export const lineLayersOf=(output:DisplayValue):LineLayerOnMap[]=>
  ((output as unknown as {lines?:LineLayerOnMap[]}).lines??[]);

/** THE COLOUR OF EACH LINE LAYER, dark and apart from the points' hues and the area's green. */
export const LINE_COLOURS=['#7a3e9d','#b5482f','#2f5f98','#8a6d1d'];

/** Every vertex these layers hold, for a frame that must span them. */
export const lineVerticesOf=(layers:readonly LineLayerOnMap[]):[number,number][]=>
  layers.flatMap(l=>l.features.flatMap(f=>
    (f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.coordinates.flat()) as [number,number][]));

/** WHETHER A MAP MARKS A LINE LAYER'S DIRECTION. `undefined` is the default and is not "no": it is *where the lines
 *  were drawn by hand*.
 *
 *  THE DEFAULT IS A PROPERTY OF THE LINES, NOT A PREFERENCE (2026-11-24). The first form of this was off unless
 *  asked, and the practitioner reported the consequence at once: *"The arrow head does not show up in the map
 *  output. But it shows up on line layer preview."* The editor draws a head on every line it holds, because every
 *  line it holds was drawn by somebody clicking positions in an order -- and `line-draw.ts` argues that the order of
 *  clicking IS the direction, the one thing a hand-drawn line carries that a derived one gets from its data. So for
 *  a drawn layer the direction is a decision a person made, and a map that hides it is hiding their work.
 *
 *  A layer read from a GPX or taken as the border two areas share is the other case, and it is why this is not
 *  simply on: the order of positions in a published track or a computed border is an artefact of how the file was
 *  written, and an arrowhead on one asserts a direction nobody chose. Those stay unmarked unless asked.
 *
 *  `'all'` and `'none'` are the practitioner saying so outright, and they win over the source either way. */
export type ArrowChoice='all'|'none';
export const marksDirection=(layer:{source:string},choice?:ArrowChoice):boolean=>
  choice==='all'?true:choice==='none'?false:layer.source==='drawn';

/** The parts of a layer, each as a list of positions, whether it holds LineStrings or MultiLineStrings. */
const partsOf=(layer:LineLayerOnMap):[number,number][][]=>
  layer.features.flatMap(f=>(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates) as [number,number][][]);

/** The bearing from the last positioned vertex to the end, in degrees, measured by whatever projects a position to
 *  screen points -- `map.latLngToLayerPoint` on a Leaflet map, a frame's `project` on a figure. Null where the line
 *  has no last segment with any length, which is a line with no direction to point in. */
export function endBearing(vertices:readonly [number,number][],at:(v:[number,number])=>{x:number;y:number}):number|null{
  if(vertices.length<2)return null;
  const tip=at(vertices[vertices.length-1]!);
  for(let i=vertices.length-2;i>=0;i--){
    const from=at(vertices[i]!),dx=tip.x-from.x,dy=tip.y-from.y;
    if(Math.hypot(dx,dy)>1e-6)return Math.atan2(dy,dx)*180/Math.PI;
  }
  return null;
}

/** AN ARROWHEAD AT THE END OF ONE PART, drawn in the figure's own units (the practitioner, 2026-11-24: *"include an
 *  option to mark the direction by placing an arrow head on the line"*).
 *
 *  AS AN EXPLICIT PATH, not an SVG `<marker>`. A marker that takes its colour from the line it sits on needs
 *  `context-stroke`, and these figures are serialized into Notes, into the downloads and into the project file, where
 *  they are re-rendered by whatever opens them; `markPath` draws every other mark on these maps the same way, for the
 *  same reason. Returns nothing where the last segment has no length, which a part of one repeated position has:
 *  there is no direction to point in, and normalising a zero vector would draw a triangle at an arbitrary angle.
 *
 *  The tip is ON the final position, so the arrowhead ends where the line ends rather than overshooting it. */
function arrowHead(part:readonly [number,number][],project:(p:[number,number])=>[number,number],markScale:number):string{
  // ONE DEFINITION OF WHICH WAY A LINE RUNS, shared with the Leaflet maps: the last segment that has a length,
  // walking back from the end, because a route clicked twice in one place or read from a file that repeats its final
  // position has no bearing in its final segment at all.
  const angle=endBearing(part,v=>{const [x,y]=project(v);return {x,y};});
  if(angle===null)return '';
  const tip=project(part[part.length-1]!);
  const radians=angle*Math.PI/180,ux=Math.cos(radians),uy=Math.sin(radians);
  const long=9*markScale,half=4*markScale;
  const base=[tip[0]-ux*long,tip[1]-uy*long] as [number,number];
  // The normal to the bearing: the barbs sit either side of the base, which is what makes it read as a head and not
  // as a continuation of the line.
  const at=(sign:number)=>[base[0]-uy*half*sign,base[1]+ux*half*sign].map(v=>+v.toFixed(1)).join(',');
  return `M${tip.map(v=>+v.toFixed(1)).join(',')}L${at(1)}L${at(-1)}Z`;
}

/** Each line layer as one path, over the area and under the points.
 *
 *  Takes the layers rather than the output, so a renderer handed a polygon layer can draw them too.
 *
 *  `arrows`: see `marksDirection`. */
export function lineLayersSvg(layers:readonly LineLayerOnMap[],project:(p:[number,number])=>[number,number],markScale=1,arrows?:ArrowChoice):string{
  return layers.map((layer,i)=>{
    const parts=partsOf(layer),colour=LINE_COLOURS[i%LINE_COLOURS.length];
    const d=parts.map(part=>'M'+part.map(p=>project(p).map(v=>+v.toFixed(1)).join(',')).join('L')).join('');
    const heads=marksDirection(layer,arrows)?parts.map(part=>arrowHead(part,project,markScale)).filter(Boolean).join(''):'';
    return `<path data-line-layer="${layer.sourceNodeId}" d="${d}" fill="none" stroke="${colour}" stroke-width="${2.5*markScale}" stroke-linejoin="round" stroke-linecap="round"/>`
      // IN THE SAME SWITCHED GROUP as the line it belongs to: a layer hidden in Manage layers must take its
      // arrowheads with it, and the hide switch keys on `data-line-layer`.
      +(heads?`<path data-line-layer="${layer.sourceNodeId}" data-line-arrow="" d="${heads}" fill="${colour}" stroke="none"/>`:'');}).join('');
}

/** THE SAME ARROWHEAD ON A LEAFLET MAP, as an icon's markup: drawn in screen pixels so it is the size a reader sees
 *  at every zoom rather than growing with the map, and turned to the bearing the caller measured in layer points.
 *  Shared by the interactive map and the Line layer editor, so one head is drawn wherever direction is marked. */
export const arrowIconSvg=(angleDeg:number,colour:string,size=20):string=>
  `<svg width="${size}" height="${size}" viewBox="-10 -10 20 20" aria-hidden="true" style="transform:rotate(${angleDeg.toFixed(1)}deg)">`
  +`<path d="M10,0L-2,-5L-2,5Z" fill="${colour}" stroke="#ffffff" stroke-width="1"/></svg>`;


