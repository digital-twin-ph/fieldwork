/** SEARCH A SATELLITE CATALOG: where the files are, for a chosen product, over the study area and dates.
 *
 *  The practitioner, 2026-11-05: *"STAC zeroes in on the source URLs."* Experiment 179.
 *
 *  ADAPTED FROM JLT'S STAC BROWSER (https://github.com/jltobias/JupyterLite-STAC-Browser, commit 945d8b3, MIT):
 *  `dateRange`, the error messages of `fetchJSON` and paging by `next` links are its `web/stac.js`, ported to
 *  TypeScript. Its 500-item bound was kept until 0.41.0 and then lifted (experiment 182). It searches the collection's own items endpoint, which experiment 179's S3 and S4 used from a
 *  browser origin. Fieldwork adds what each file is, from the chosen product: licence as read, sign-in, whether a
 *  browser can read it, attribution, and that completeness is unknown until a reader opens the file.
 *
 *  METADATA ONLY. A search reads catalog records; no data file is downloaded here. */
import type {SatelliteProduct} from './satellite-products.js';

/** NO ITEM BOUND. JLT's browser stops at 500 items; Fieldwork kept that until sixteen years of MODIS over Rio de Janeiro
 *  needed about 2,900. The practitioner, 2026-11-06, chose to lift it and store only what a reader reads (experiment
 *  182). A search still needs dates, so it cannot ask for all time. */
export const REQUEST_TIMEOUT_MS=20_000;

/** JLT's `dateRange`: real calendar dates, start not after end, an open end allowed. */
export function dateRange(start='',end=''):string|undefined{
  for(const value of [start,end])
    if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))
      ||new Date(value).toISOString().slice(0,10)!==value))
      throw new Error('Dates must be real calendar dates in YYYY-MM-DD format.');
  if(start&&end&&start>end)throw new Error('Start date must be before or equal to end date.');
  return start||end?`${start?start+'T00:00:00Z':'..'}/${end?end+'T23:59:59.999999Z':'..'}`:undefined;
}

export type BBox=[number,number,number,number];
/** The study area's bounding box, west, south, east, north. */
export function bboxOf(geometry:{type:string;coordinates:unknown}|undefined|null):BBox|null{
  if(!geometry)return null;
  const xs:number[]=[],ys:number[]=[];
  const walk=(v:unknown):void=>{if(Array.isArray(v)&&typeof v[0]==='number'){xs.push(v[0] as number);ys.push(v[1] as number);}
    else if(Array.isArray(v))v.forEach(walk);};
  walk(geometry.coordinates);
  return xs.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]:null;
}

/** JLT's `fetchJSON` messages, which tell a practitioner which failure happened. */
async function fetchJSON(url:string,fetcher:typeof fetch):Promise<unknown>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetcher(url,{signal:controller.signal,credentials:'omit',
      headers:{Accept:'application/geo+json, application/json'}});
    if(!response.ok)throw new Error(`HTTP ${response.status} from provider. Retry later or choose another catalog.`);
    try{return await response.json();}
    catch(error){if((error as Error).name==='AbortError')throw error;
      throw new Error('Provider returned non-JSON content; use a STAC JSON root URL.');}
  }catch(error){
    if((error as Error).name==='AbortError')throw new Error('Request timed out after 20 seconds. Retry or narrow the query.');
    if(error instanceof TypeError)throw new Error('Browser could not reach this URL. Check network, HTTPS certificate, and '
      +'provider CORS support. A static site cannot bypass CORS.');
    throw error;
  }finally{clearTimeout(timer);}
}

export interface CatalogFile {key:string; host:string; href:string; type:string|null; roles:string[]}
export interface CatalogItem {id:string; datetime:string|null; bbox:BBox|null; platform:string|null; files:CatalogFile[];
  /** The processing stream as the item states it (`s5p:processing_mode`): NRTI, near real time, or OFFL, offline. */
  stream?:string|null;
  /** The end of the period a composite covers, where the item states one (`end_datetime`). */
  end?:string;
  /** The orbit as the item states it (`sat:absolute_orbit`). Two items with one orbit are one overpass. */
  orbit?:number|null;
}

/** ONE OVERPASS, TWO STREAMS. Found 2026-11-05 building the sampler: the two NO₂ items over New York City on 7 June
 *  2023, which 0.28.0 called two overpasses, are orbit 29273 twice: a five-minute near-real-time granule and the whole
 *  orbit processed offline. Sampling both would count one reading twice. Where an orbit has an offline item, its
 *  near-real-time items are not kept by default; the product's facts recommend the offline stream for time series. A
 *  practitioner can still tick one back. Items with no stated orbit or stream are all kept. */
export function defaultKept(items:readonly CatalogItem[]):string[]{
  const offline=new Set(items.filter(i=>i.stream==='OFFL'&&i.orbit!=null).map(i=>i.orbit));
  return items.filter(i=>!(i.stream==='NRTI'&&i.orbit!=null&&offline.has(i.orbit))).map(i=>i.id);
}
/** How many distinct overpasses the items are: distinct orbits, plus every item that states none. */
export const overpassCount=(items:readonly CatalogItem[]):number=>
  new Set(items.filter(i=>i.orbit!=null).map(i=>i.orbit)).size+items.filter(i=>i.orbit==null).length;
export interface CatalogSearch {
  catalog:string; collection:string; productType:string|null; bbox:BBox; from:string; until:string;
  /** Items the catalog returned for the area and dates, before the product filter. */
  returned:number;
  items:CatalogItem[];
  /** True on a search saved before 0.41.0 that stopped at the old 500-item bound with more to read. */
  truncated:boolean; requests:number; searchedAt:string;
  /** FILES PER ITEM KEPT, where a reader decides: only the files it reads are stored. `offered` is how many the first
   *  item listed. Absent when every file was kept. */
  files?:{kept:string[]; offered:number};
  /** Where the searched extent came from: a connected Study area, or edges typed in the dialog. Absent on searches
   *  saved before 0.28.1, which could only come from a Study area. */
  areaFrom?:AreaFrom;
}
export type AreaFrom='study area'|'typed extent';

/** A TYPED EXTENT, CHECKED, the W/S/E/N field of JLT's STAC Browser. The practitioner, 2026-11-05, on a dialog whose
 *  Search stayed grey until a Study area was connected: *"the search catalog UI is not enough for the search"*. Returns
 *  the box, or the reason it is not one. Crossing the antimeridian is refused as JLT's is: split it into two searches. */
export function typedBox(w:string,s:string,e:string,n:string):{box:BBox}|{problem:string}{
  const v=[w,s,e,n].map(x=>x.trim()===''?NaN:Number(x));
  if(v.some(x=>!Number.isFinite(x)))return {problem:'Type all four edges, in decimal degrees.'};
  const [W,S,E,N]=v as BBox;
  if([W,E].some(x=>x<-180||x>180))return {problem:'West and east are longitudes, between -180 and 180.'};
  if([S,N].some(x=>x<-90||x>90))return {problem:'South and north are latitudes, between -90 and 90.'};
  if(W>=E)return {problem:'West must be less than east. An extent across the antimeridian needs two searches.'};
  if(S>=N)return {problem:'South must be less than north.'};
  return {box:[W,S,E,N]};
}

const productTypeOf=(item:{id?:unknown;properties?:Record<string,unknown>}):string|null=>
  (item.properties?.['s5p:product_type'] as string|undefined)??null;

const toItem=(raw:Record<string,unknown>,keep?:(key:string,file:{href:string;type:string|null})=>boolean):CatalogItem=>{
  const props=(raw.properties??{}) as Record<string,unknown>;
  const assets=(raw.assets??{}) as Record<string,Record<string,unknown>>;
  // A COMPOSITE COVERS A PERIOD: MODIS's 8-day items state a start and an end, and the end is kept so the period is
  // said, not inferred from the next item (experiment 180).
  return {id:String(raw.id),datetime:(props.datetime as string|undefined)??(props.start_datetime as string|undefined)??null,
    ...(typeof props.end_datetime==='string'?{end:props.end_datetime as string}:{}),
    bbox:Array.isArray(raw.bbox)&&raw.bbox.length>=4?(raw.bbox.slice(0,4) as BBox):null,
    platform:(props.platform as string|undefined)??null,
    stream:typeof props['s5p:processing_mode']==='string'?props['s5p:processing_mode'] as string:null,
    orbit:typeof props['sat:absolute_orbit']==='number'?props['sat:absolute_orbit'] as number:null,
    files:Object.entries(assets).filter(([key,a])=>typeof a?.href==='string'
      &&(!keep||keep(key,{href:String(a.href),type:(a.type as string|undefined)??null}))).map(([key,a])=>{
      const href=String(a.href);let host=href;try{host=new URL(href).host;}catch{/* an s3:// address keeps its form */}
      return {key,host,href,type:(a.type as string|undefined)??null,roles:Array.isArray(a.roles)?a.roles.map(String):[]};})};
};

/** One search: the product's collection, over the box and dates, paging to the end. `keep` names the files a reader
 *  reads; the others are not stored, and the search says how many each item offered. */
export async function searchCatalog(product:SatelliteProduct,bbox:BBox,from:string,until:string,
  fetcher:typeof fetch=fetch,keep?:(key:string,file:{href:string;type:string|null})=>boolean):Promise<CatalogSearch>{
  const datetime=dateRange(from,until);
  if(!datetime)throw new Error('Choose the dates to search: a catalog search over all time is too large to read.');
  const url=new URL(`${product.route.endpoint.replace(/\/$/,'')}/collections/${encodeURIComponent(product.route.collection)}/items`);
  url.searchParams.set('bbox',bbox.map(v=>+v.toFixed(5)).join(','));
  url.searchParams.set('datetime',datetime);
  url.searchParams.set('limit','100');
  let next:string|null=url.href,returned=0,requests=0,offered=0;const items:CatalogItem[]=[];const keptKeys=new Set<string>();
  while(next){
    const page=await fetchJSON(next,fetcher) as {type?:string;features?:Record<string,unknown>[];links?:{rel:string;href:string;method?:string}[]};
    requests++;
    if(page?.type!=='FeatureCollection'||!Array.isArray(page.features))
      throw new Error('Search response is not a GeoJSON FeatureCollection.');
    for(const raw of page.features){
      returned++;
      if(product.route.productType&&productTypeOf(raw)!==product.route.productType)continue;
      if(!items.length)offered=Object.values((raw.assets??{}) as Record<string,{href?:unknown}>).filter(a=>typeof a?.href==='string').length;
      const item=toItem(raw,keep);item.files.forEach(f=>keptKeys.add(f.key));items.push(item);
    }
    const link=page.links?.find(l=>l.rel==='next'&&(l.method??'GET').toUpperCase()==='GET');
    next=link?.href??null;
  }
  return {catalog:product.route.endpoint,collection:product.route.collection,productType:product.route.productType??null,
    bbox,from,until,returned,items,truncated:false,requests,searchedAt:new Date().toISOString(),
    ...(keep&&items.length&&keptKeys.size<offered?{files:{kept:[...keptKeys].sort(),offered}}:{})};
}

/** The sentence a search states. */
export const searchSentence=(s:CatalogSearch,product:SatelliteProduct):string=>
  `${s.items.length} ${product.route.productType?`${product.route.productType} `:''}item${s.items.length===1?'':'s'} in `
  +`${s.collection} over ${s.areaFrom==='typed extent'?'the typed extent':'the study area'} from ${s.from} to ${s.until}`
  +(product.route.productType?`, of ${s.returned} the catalog returned for the area and dates`:'')+'.'
  +(s.items.some(i=>i.orbit!=null)&&overpassCount(s.items)!==s.items.length
    ?` They are ${overpassCount(s.items)} overpass${overpassCount(s.items)===1?'':'es'}: an orbit can come in more than one processing stream.`:'')
  +(s.truncated?' The search stopped at the old limit of 500 items; search again for the rest.':'')
  +(s.files?` Each item offered ${s.files.offered} files; the ${s.files.kept.length} the reader reads are kept: ${s.files.kept.join(', ')}.`:'')
  +' Metadata only: no file was read, so how many pixels each holds, and of what quality, is not yet known.';

/** The receipt's facts. */
export function searchFacts(entity:string,s:CatalogSearch,itemsKept:number):string{
  const q=(v:string)=>JSON.stringify(v);
  return `@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:SatelliteCatalogSearch;\n`
    +`  fw:stacCatalog ${q(s.catalog)};\n  fw:stacCollection ${q(s.collection)};\n`
    +(s.productType?`  fw:productType ${q(s.productType)};\n`:'')
    +`  fw:searchBBox ${q(s.bbox.join(','))};\n`
    +(s.areaFrom?`  fw:searchAreaFrom ${q(s.areaFrom)};\n`:'')
    +`  fw:searchFrom "${s.from}"^^xsd:date;\n  fw:searchUntil "${s.until}"^^xsd:date;\n`
    +`  fw:itemsReturned "${s.returned}"^^xsd:integer;\n  fw:itemsMatched "${s.items.length}"^^xsd:integer;\n`
    +`  fw:itemsKept "${itemsKept}"^^xsd:integer;\n  fw:searchTruncated ${s.truncated};\n`
    +`  fw:completenessRead false.\n`;
}
