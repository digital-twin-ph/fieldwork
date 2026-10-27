/** The bundled Natural Earth context layer, drawn into a static figure.
 *
 *  Ground that needs no network and no tile provider. Experiment 52 measured the alternatives in
 *  2026-10-08 and concluded "PMTiles for interactive navigation, Natural Earth for static
 *  figures": it is public domain, so it may simply ship, and it is vector, so it draws in the
 *  FIGURE'S OWN PROJECTION rather than Web Mercator. That last part is why it sidesteps the
 *  problem experiment 137 calls the real engineering question -- a raster tile is a Mercator
 *  square and a figure is not, so baking tiles means accepting a mismatch; a coastline is a list
 *  of lon/lat points and goes through `project` like every other layer the figure draws.
 *
 *  CONTEXT, NEVER FRAME. These boundaries are generalised and disputed lines are a cartographic
 *  choice, so nothing here may be joined to, measured or reported by. The asset says so of
 *  itself; this module only draws it, and draws it under everything the workflow produced.
 */
import type {Position} from './types.js';
import asset from '../assets/natural-earth-110m.json';

export interface NaturalEarthLayer {id:string; kind:string; says:string; count:number;
  geometries:{type:string; coordinates:unknown}[]}
export interface NaturalEarthAsset {schema:string; scale:string; source:string; version:string;
  licence:string; notForFraming:string; layers:NaturalEarthLayer[]}
export const NATURAL_EARTH=asset as unknown as NaturalEarthAsset;
export const NATURAL_EARTH_CREDIT=`Natural Earth ${NATURAL_EARTH.scale}, public domain`;

/** How each layer is painted. Neutral and recessive: ground is layer 0 and must not compete with
 *  anything the workflow put on top of it, which is the same rule the raster bake follows when it
 *  withdraws the context wash. */
const PAINT:Record<string,{fill?:string;stroke?:string;width:number}>={
  land:{fill:'#EDE9E2',stroke:'#D9D3C9',width:.5},
  lakes:{fill:'#DCE6EC',stroke:'#C8D6DE',width:.4},
  countries:{stroke:'#B9B1A5',width:.7},
  provinces:{stroke:'#CFC8BC',width:.4},
};

const ringPath=(ring:Position[],project:(c:Position)=>[number,number]):string=>{
  let d='';
  for(let i=0;i<ring.length;i++){
    const [x,y]=project(ring[i]);
    if(!Number.isFinite(x)||!Number.isFinite(y))return '';
    d+=`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
};

/** Does this geometry touch the drawn extent at all? 127 land polygons is most of the planet and
 *  a figure of one country needs one of them; the rest are off-canvas and cost only time. */
const intersects=(coords:unknown,bounds:[number,number,number,number]):boolean=>{
  const [west,south,east,north]=bounds;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const walk=(c:unknown):void=>{
    if(Array.isArray(c)&&typeof c[0]==='number'){
      minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);
      minY=Math.min(minY,c[1] as number);maxY=Math.max(maxY,c[1] as number);return;
    }
    if(Array.isArray(c))for(const inner of c)walk(inner);
  };
  walk(coords);
  return maxX>=west&&minX<=east&&maxY>=south&&minY<=north;
};

/** The SVG for the context layer, in the caller's projection, or '' when nothing falls inside. */
export function naturalEarthMarkup(bounds:[number,number,number,number],
  project:(c:Position)=>[number,number]):{markup:string; drawn:number}{
  let markup='',drawn=0;
  for(const layer of NATURAL_EARTH.layers){
    const paint=PAINT[layer.id];
    if(!paint)continue;
    let paths='';
    for(const geometry of layer.geometries){
      if(!intersects(geometry.coordinates,bounds))continue;
      // A polygon's rings and a line's parts flatten to the same thing here: a list of point
      // lists. The fill rule closes a polygon's path and a line's is left open.
      const parts:Position[][]=[];
      const collect=(c:unknown,depth:number):void=>{
        if(depth===0){parts.push(c as Position[]);return;}
        if(Array.isArray(c))for(const inner of c)collect(inner,depth-1);
      };
      const depth=geometry.type==='Polygon'||geometry.type==='MultiLineString'?1
        :geometry.type==='MultiPolygon'?2:0;
      collect(geometry.coordinates,depth);
      // PER PART, not per geometry. A MultiPolygon's bounding box is the box around all of its
      // pieces, so testing the whole thing keeps every island of a country because one of them
      // is in view -- and over open ocean it kept a landmass whose pieces are all elsewhere.
      //
      // A single ring is kept whole even when most of it is outside: a continent's outline that
      // crosses the window genuinely crosses it, and dropping the points beyond the edge would
      // close the fill across the middle of the figure. The viewBox clips; this only decides
      // which pieces are worth handing it.
      // A BOUNDING BOX IS A PRE-FILTER, NOT A CLIP, and the difference shows over open ocean:
      // the Americas are one ring whose box spans a third of the planet, so a window in the
      // mid-Pacific sits inside the box with no coastline anywhere near it. The ring is still
      // drawn, because a ring that genuinely crosses the window must be, and the viewBox clips.
      // What that costs is bytes; what it must not cost is a false count, so `drawn` counts
      // shapes with a vertex actually inside the extent. A figure over empty ocean then says it
      // has no ground rather than claiming one shape nobody can see.
      const [west,south,east,north]=bounds;
      for(const part of parts){
        if(!intersects(part,bounds))continue;
        const d=ringPath(part,project);
        if(!d)continue;
        paths+=d+(paint.fill?'Z':'');
        if(part.some(([lon,lat])=>lon>=west&&lon<=east&&lat>=south&&lat<=north))drawn++;
      }
    }
    if(!paths)continue;
    markup+=`<path data-natural-earth="${layer.id}" d="${paths}" `
      +`fill="${paint.fill??'none'}" stroke="${paint.stroke??'none'}" `
      +`stroke-width="${paint.width}" stroke-linejoin="round" fill-rule="evenodd"/>`;
  }
  return {markup,drawn};
}
