import type {Position} from './types.js';

/** Raster basemap tiles, baked into a static figure.
 *
 *  Experiment 137. A static plot has never had ground under it: choosing a basemap switched the
 *  map to the interactive presentation, which is the only renderer that draws tiles. Python's
 *  contextily shows the medium is not the obstacle -- it fetches tiles for an extent and draws
 *  them into a matplotlib figure -- and a baked figure is MORE self-contained than an interactive
 *  one, because a reader holding the file holds the ground too.
 *
 *  Only the raster providers are served here. OpenFreeMap serves vector tiles rendered by
 *  MapLibre, and baking those needs a GL canvas rasterised first; `catchment-map.ts` says so, and
 *  this module refuses them by name rather than appearing to support them. */

/** What a provider is, and what crediting it costs. The attribution is not optional: a figure
 *  travels away from the application that drew it, and ODbL attaches to the copy. */
export interface TileProvider {
  id:'osm'|'topo';
  url:(z:number,x:number,y:number)=>string;
  attribution:string;
  /** The provider's own stated ceiling on zoom. */
  maxZoom:number;
}
export const TILE_PROVIDERS:Record<'osm'|'topo',TileProvider>={
  osm:{id:'osm',url:(z,x,y)=>`https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    attribution:'© OpenStreetMap contributors, ODbL',maxZoom:19},
  topo:{id:'topo',url:(z,x,y)=>`https://tile.opentopomap.org/${z}/${x}/${y}.png`,
    attribution:'© OpenStreetMap contributors, ODbL · SRTM · OpenTopoMap (CC-BY-SA)',maxZoom:17},
};

/** Web Mercator, which is the tiles' frame and NOT this application's plot frame. */
const lonToTileX=(lon:number,z:number)=>(lon+180)/360*2**z;
const latToTileY=(lat:number,z:number)=>{
  const r=lat*Math.PI/180;
  return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z;
};
export const tileXToLon=(x:number,z:number)=>x/2**z*360-180;
export const tileYToLat=(y:number,z:number)=>{
  const n=Math.PI*(1-2*y/2**z);
  return 180/Math.PI*Math.atan(Math.sinh(n));
};

/** The zoom at which the extent fills roughly the drawn width without exceeding a tile budget.
 *
 *  A budget rather than a resolution: every tile is a request to somebody else's server and a
 *  few hundred kilobytes of `data:` URI in the figure. OpenStreetMap's usage policy permits
 *  ordinary figure-sized use and not bulk download, so the ceiling is what keeps this the
 *  former. */
export function chooseZoom(bounds:[number,number,number,number],maxTiles:number,provider:TileProvider):number{
  const [west,south,east,north]=bounds;
  for(let z=provider.maxZoom;z>=0;z--){
    const x0=Math.floor(lonToTileX(west,z)),x1=Math.floor(lonToTileX(east,z));
    const y0=Math.floor(latToTileY(north,z)),y1=Math.floor(latToTileY(south,z));
    if((x1-x0+1)*(y1-y0+1)<=maxTiles)return z;
  }
  return 0;
}

export interface PlacedTile {z:number; x:number; y:number; url:string;
  /** The tile's own lon/lat corners, so the caller places it in ITS projection rather than
   *  assuming the plot is Web Mercator. */
  bounds:[number,number,number,number];}

/** Every tile covering the extent, with the lon/lat box each one occupies.
 *
 *  PLACED BY ITS OWN CORNERS, which is the whole reason this returns bounds rather than pixels.
 *  Tiles are Web Mercator and this project's static plot is equirectangular with one cosine taken
 *  at the middle latitude, so laying a tile grid on it with a single transform misaligns, and the
 *  error grows with the latitude span. Projecting each tile's corners with the plot's own
 *  projection makes the approximation piecewise -- it applies within one tile instead of across
 *  the figure. Experiment 137 states the bound and what remains unmeasured. */
export function tilesForBounds(bounds:[number,number,number,number],z:number,provider:TileProvider):PlacedTile[]{
  const [west,south,east,north]=bounds;
  const x0=Math.floor(lonToTileX(west,z)),x1=Math.floor(lonToTileX(east,z));
  const y0=Math.floor(latToTileY(north,z)),y1=Math.floor(latToTileY(south,z));
  const out:PlacedTile[]=[];
  const span=2**z;
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    // Outside the world, there is no tile. A figure at a pole or across the antimeridian asks
    // for these, and a request for one is a 404 that would otherwise look like a network fault.
    if(y<0||y>=span)continue;
    const wrapped=((x%span)+span)%span;
    out.push({z,x:wrapped,y,url:provider.url(z,wrapped,y),
      bounds:[tileXToLon(x,z),tileYToLat(y+1,z),tileXToLon(x+1,z),tileYToLat(y,z)]});
  }
  return out;
}

/** `<image>` elements for a figure, in the caller's own projection.
 *
 *  `project` is the plot's own lon/lat → pixel function, so this module never needs to know what
 *  projection the figure is in. A tile that cannot be fetched is OMITTED rather than drawn as a
 *  gap or an error: ground is context, and a figure missing one tile of context is still a true
 *  figure, where a figure that refuses to draw because a tile server was slow is not. */
export async function basemapImages(
  bounds:[number,number,number,number],project:(c:Position)=>[number,number],
  provider:TileProvider,fetchTile:(url:string)=>Promise<string|null>,maxTiles=16
):Promise<{markup:string; drawn:number; requested:number; zoom:number}>{
  const zoom=chooseZoom(bounds,maxTiles,provider);
  const tiles=tilesForBounds(bounds,zoom,provider);
  const parts:string[]=[];
  let drawn=0;
  for(const tile of tiles){
    const href=await fetchTile(tile.url);
    if(!href)continue;
    const [tw,ts,te,tn]=tile.bounds;
    const [left,top]=project([tw,tn]),[right,bottom]=project([te,ts]);
    // Width and height from the projected corners, so a tile stretches to whatever the plot's
    // projection makes of it rather than being assumed square on the page.
    parts.push(`<image href="${href}" x="${left}" y="${top}" width="${Math.abs(right-left)}" `
      +`height="${Math.abs(bottom-top)}" preserveAspectRatio="none"/>`);
    drawn++;
  }
  return {markup:parts.length?`<g data-basemap="${provider.id}">${parts.join('')}</g>`:'',
    drawn,requested:tiles.length,zoom};
}

/** Tiles already fetched in this session, so a re-render costs nobody a request.
 *
 *  OpenStreetMap's tile usage policy permits a figure's worth of tiles and not bulk download, and
 *  a map that refetched on every render would drift towards the latter without anyone deciding
 *  to. Keyed by URL, which already carries the provider and the z/x/y. */
const fetched=new Map<string,string|null>();
export const forgetTiles=()=>fetched.clear();

/** THE OFFLINE PROMISE IS A FLOW, NOT AN ABSOLUTE. The practitioner, 2026-10-25: *"It's a flow
 *  from online to offline. Online download the assets, offline use the cached assets."*
 *
 *  A session-only cache does not honour that. It made the first open fetch and bake, and the next
 *  open -- the one on a field device with no network, which is the case this application is built
 *  for -- find nothing and draw a figure with no ground under it. So a fetched tile goes where
 *  every other downloaded asset goes: the payload store, which survives a reload, is hydrated at
 *  startup, and is counted in the storage figures the Project tab shows. A practitioner can see
 *  what the basemap cost them and clear it with everything else.
 *
 *  Keyed by the tile URL rather than a content digest, because the question asked here is "have I
 *  already got z/x/y from this provider", not "have I seen these bytes". */
export const tileCacheKey=(url:string)=>`basemap-tile:${url}`;
let store:{read:(key:string)=>unknown; write:(key:string,value:unknown)=>Promise<unknown>}|null=null;
/** Injected rather than imported, so this module stays testable without a browser database and
 *  the storage layer stays the caller's choice. */
export const useTileStore=(next:typeof store)=>{store=next;};

/** One tile as a `data:` URI, or null if it could not be had.
 *
 *  Null rather than a throw: a missing tile is missing context, and the figure is still true
 *  without it. The caller omits it. */
export async function fetchTileAsDataURI(url:string,timeoutMs=8000):Promise<string|null>{
  if(fetched.has(url))return fetched.get(url)!;
  // Durable first: a tile fetched on a previous visit is why the figure still has ground on a
  // device that is now offline.
  const kept=store?.read(tileCacheKey(url));
  if(typeof kept==='string'){fetched.set(url,kept);return kept;}
  let href:string|null=null;
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      // NO `referrerPolicy:'no-referrer'`. It was here for the privacy constraint and had the
      // opposite effect of the one intended: OpenStreetMap's tile usage policy requires a Referer
      // or User-Agent that identifies the application, a browser cannot set the latter, and an
      // unidentified app is what they block. The practitioner met it as tiles reading "Access
      // blocked" baked into a figure, 2026-10-25. The Referer discloses this application's own
      // URL and nothing about a workflow, so it is still only the tile request.
      const response=await fetch(url,{signal:controller.signal});
      if(response.ok){
        const blob=await response.blob();
        href=await new Promise<string|null>(resolve=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:null);
          reader.onerror=()=>resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    }finally{clearTimeout(timer);}
  }catch{href=null;}
  fetched.set(url,href);
  // A failure is remembered for the session and NOT written down: the next visit should try
  // again rather than inherit one bad afternoon's network.
  //
  // NOT AWAITED, from 2026-10-28. The tile is already in hand; the write is a durability
  // convenience for the NEXT visit, and this function's contract is to return a tile or null. So
  // a storage layer that neither completes nor fails should not be able to hold a tile hostage --
  // and `payload-store.ts` has a timeout on OPENING the database and none on a transaction, so
  // `committed(tx)` can wait forever.
  //
  // That hazard is real and this removes it. It was NOT, however, the cause of the webkit figure
  // failure it was first written to fix: that was `page.route` failing to intercept a request
  // that passes through the service worker, measured 2026-10-28 as 3 tile requests seen and 0
  // routed, so the test reached the real tile server. Recorded here because the wrong attribution
  // was briefly in this comment, and a fix that credits itself with someone else's bug teaches
  // the next reader the wrong lesson.
  //
  // The rejection is swallowed deliberately and for the same reason the failure above is not
  // written down: a tile that could not be cached is still a tile, and the practitioner is told
  // about a degraded store by `payload-store.ts` itself, which is where that belongs.
  if(href&&store)void store.write(tileCacheKey(url),href).catch(()=>{});
  return href;
}
