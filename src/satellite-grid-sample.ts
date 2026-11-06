/** SAMPLE SATELLITE FILES OVER AREAS, OR AT POINTS, FROM GRIDDED FILES (experiment 180).
 *
 *  The second reader of Sample satellite files at points or over areas, beside the Sentinel-5P swath reader. A gridded
 *  product (MODIS land surface temperature, a Cloud-Optimized GeoTIFF per layer in the sinusoidal projection) is read
 *  by range with geotiff.js. Each area is projected into the file's grid and its cells chosen by centre once per tile
 *  grid, since every file of a tile shares it; a point is the cell that contains it. Tiles are added before anything is
 *  divided. One row per place per period per platform: Terra and Aqua are different measurements and are never pooled.
 *
 *  Values are as the file states them, in kelvin after its scale factor. Nothing is filled. */
import type {DataTable} from './data-table.js';
import type {Boundary} from './types.js';
import type {CatalogItem} from './satellite-catalog.js';
import type {SatelliteProduct} from './satellite-products.js';
import fieldwork from '../examples/eo/routes-fieldwork.json';
import {sinusoidal,projectBoundary,cellsIn,sumWindow,addSums,emptySums,modisPasses,MODIS_RULES,
  type AreaSums,type Grid,type ModisQualityRule} from './satellite-areas.js';

export interface GridLayer {label:string; variable:string; column:string; quality:string; clear:string}
export interface GridReader {format:'modis-cog'; readOn:string; layers:Record<string,GridLayer>; scale:number; fill:number;
  unit:string; projection:'modis-sinusoidal'; quality:{default:ModisQualityRule; note:string}; token:string}

const READERS=(fieldwork as unknown as {readers:Record<string,{format?:string}|string>}).readers;
export const gridReaderFor=(product:SatelliteProduct):GridReader|null=>{
  const found=READERS[product.route.id];
  return typeof found==='object'&&found.format==='modis-cog'?found as unknown as GridReader:null;};

/** A place to read: an area, its parts gathered, or a point. */
export type Place={id:string; name:string; kind:'area'; boundary:Boundary}|{id:string; name:string; kind:'point'; lon:number; lat:number};

/** THE PARTS OF ONE UNIT ARE ONE AREA: a municipality and its islands share an id in a joined layer, and are gathered
 *  into one MultiPolygon so its cells are counted once, under one name. */
export function areasFrom(features:readonly {id:string|number;name?:string;geometry?:Boundary|null}[]):Place[]{
  const byId=new Map<string,{name:string;polys:number[][][][]}>();
  for(const f of features){
    const g=f.geometry;if(!g||(g.type!=='Polygon'&&g.type!=='MultiPolygon'))continue;
    const id=String(f.id),held=byId.get(id)??{name:String(f.name??id),polys:[]};
    held.polys.push(...(g.type==='Polygon'?[g.coordinates as number[][][]]:g.coordinates as number[][][][]));
    byId.set(id,held);
  }
  return [...byId].map(([id,{name,polys}])=>({id,name,kind:'area' as const,
    boundary:(polys.length===1?{type:'Polygon',coordinates:polys[0]}:{type:'MultiPolygon',coordinates:polys}) as Boundary}));
}

/** What one place holds in one period on one platform, tiles added. */
export interface PlaceReading {placeId:string; period:string; end:string|null; platform:string; sums:AreaSums}

interface Image {getOrigin():number[]; getResolution():number[]; getWidth():number; getHeight():number;
  readRasters(o:{window:number[]}):Promise<ArrayLike<number>[]>; getGDALMetadata?(sample?:number):Promise<Record<string,string>|null>}

/** What the files said about their own values: how many stated their unit and scale factor, and that every one that
 *  did agreed with the product's. The practitioner, 2026-11-06: *"How do we know the unit is in K if we don't have a
 *  data dictionary?"* The file is the dictionary: each one is read for it, not only the first. */
export interface TagCheck {files:number; stated:number}
type Open=(url:string)=>Promise<Image>;

const tokens=new Map<string,{token:string;expires:number}>();
async function tokenFor(endpoint:string,fetcher:typeof fetch):Promise<string>{
  const held=tokens.get(endpoint);
  if(held&&held.expires-Date.now()>5*60_000)return held.token;
  let response:Response;
  try{response=await fetcher(endpoint);}
  catch{throw new Error('The anonymous token for these files could not be fetched. Check the connection; no account is needed.');}
  if(!response.ok)throw new Error(`The anonymous token request returned HTTP ${response.status}.`);
  const body=await response.json() as {token?:string;'msft:expiry'?:string};
  if(!body.token)throw new Error('The token response carried no token.');
  tokens.set(endpoint,{token:body.token,expires:Date.parse(body['msft:expiry']??'')||Date.now()+30*60_000});
  return body.token;
}

const gridKey=(g:Grid)=>`${g.origin.join(',')}|${g.resolution.join(',')}|${g.width}x${g.height}`;

/** WHICH SATELLITE, from the item, or from the product's own name where the item does not say. Planetary Computer
 *  left `platform` off some MODIS items of 2024 (Terra's h14v11 tile in most periods), and they were read as a third
 *  satellite, each half a state, with every municipality on the other tile "no cell": 2,044 rows of 8,280 in the first
 *  live run (experiment 180). MOD11A2 is Terra's product and MYD11A2 Aqua's, by NASA's naming. */
export const platformOf=(item:{id:string;platform:string|null})=>
  item.platform||(/^MOD/.test(item.id)?'terra':/^MYD/.test(item.id)?'aqua':'');

/** Reads every file at every place. `open` is geotiff.js's `fromUrl(...).getImage()`, passed in so Node and the
 *  browser use the same code. One window per file covers all its places; the masks are made once per tile grid. */
export async function readGridFiles(items:readonly CatalogItem[],reader:GridReader,layerKey:string,rule:ModisQualityRule,
  places:readonly Place[],open:Open,fetcher:typeof fetch=fetch,onFile:(done:number,of:number)=>void=()=>{},
  tags:TagCheck={files:0,stated:0}):Promise<PlaceReading[]>{
  const layer=reader.layers[layerKey];
  if(!layer)throw new Error(`This product has no "${layerKey}" layer. It has ${Object.keys(reader.layers).join(', ')}.`);
  const token=await tokenFor(reader.token,fetcher);
  type Projected={b:Boundary;xy?:undefined}|{b?:undefined;xy:[number,number]};
  const projected:Projected[]=places.map(p=>p.kind==='area'?{b:projectBoundary(p.boundary,(x,y)=>sinusoidal(x,y))}:{xy:sinusoidal(p.lon,p.lat)});
  const masks=new Map<string,({window:[number,number,number,number];mask:Uint8Array}|null)[]>();
  const merged=new Map<string,PlaceReading>();
  let done=0;
  for(const item of items){
    const href=(variable:string)=>{const f=item.files.find(x=>x.key===variable);
      if(!f)throw new Error(`Item ${item.id} has no ${variable} file.`);return `${f.href}${f.href.includes('?')?'&':'?'}${token}`;};
    const [value,qc,clear]=await Promise.all([open(href(layer.variable)),open(href(layer.quality)),open(href(layer.clear))]);
    // THE FILE'S OWN UNIT AND SCALE, read from every file. A file stating another stops the run, naming it, rather than
    // being converted on an assumption; a file stating none is counted and said.
    const md=await value.getGDALMetadata?.().catch(()=>null)??null;
    tags.files++;
    if(md&&(md.units!==undefined||md.scale_factor!==undefined)){
      if(md.units!==undefined&&md.units!==reader.unit)
        throw new Error(`${item.id} states its unit as "${md.units}", not ${reader.unit}. Nothing was converted; this product's reader expects ${reader.unit}.`);
      if(md.scale_factor!==undefined&&Math.abs(Number(md.scale_factor)-reader.scale)>1e-9)
        throw new Error(`${item.id} states a scale factor of ${md.scale_factor}, not ${reader.scale}. Nothing was read with the wrong one.`);
      tags.stated++;
    }
    const grid:Grid={origin:value.getOrigin().slice(0,2) as [number,number],resolution:value.getResolution().slice(0,2) as [number,number],
      width:value.getWidth(),height:value.getHeight()};
    const key=gridKey(grid);
    if(!masks.has(key))masks.set(key,projected.map(x=>{
      if(x.b)return cellsIn(x.b,grid);
      const c=Math.floor((x.xy![0]-grid.origin[0])/grid.resolution[0]),r=Math.floor((x.xy![1]-grid.origin[1])/grid.resolution[1]);
      return c>=0&&r>=0&&c<grid.width&&r<grid.height?{window:[c,r,c+1,r+1] as [number,number,number,number],mask:Uint8Array.of(1)}:null;}));
    const cells=masks.get(key)!;
    const present=cells.filter(Boolean) as {window:[number,number,number,number];mask:Uint8Array}[];
    const period=(item.datetime??'').slice(0,10),end=item.end?.slice(0,10)??null,platform=platformOf(item);
    if(present.length){
      const U=[Math.min(...present.map(c=>c.window[0])),Math.min(...present.map(c=>c.window[1])),
        Math.max(...present.map(c=>c.window[2])),Math.max(...present.map(c=>c.window[3]))];
      const [[V],[Q],[C]]=await Promise.all([value.readRasters({window:U}),qc.readRasters({window:U}),clear.readRasters({window:U})]);
      const UW=U[2]!-U[0]!;
      cells.forEach((c,index)=>{
        if(!c)return;
        const [c0,r0,c1,r1]=c.window,w=c1-c0,n=w*(r1-r0),v=new Array<number>(n),q=new Array<number>(n),k=new Array<number>(n);
        for(let r=r0;r<r1;r++)for(let col=c0;col<c1;col++){
          const src=(r-U[1]!)*UW+(col-U[0]!),dst=(r-r0)*w+(col-c0);v[dst]=V![src]!;q[dst]=Q![src]!;k[dst]=C![src]!;}
        const sums=sumWindow(c.mask,v,q,k,reader.fill,x=>modisPasses(x,rule));
        const id=`${places[index]!.id}|${period}|${platform}`;
        const held=merged.get(id);
        merged.set(id,{placeId:places[index]!.id,period,end,platform,sums:held?addSums(held.sums,sums):sums});
      });
    }
    // A place this tile does not reach still has a row for the period, so "no cell" is said, not left out.
    for(const p of places){const id=`${p.id}|${period}|${platform}`;
      if(!merged.has(id))merged.set(id,{placeId:p.id,period,end,platform,sums:emptySums()});}
    onFile(++done,items.length);
  }
  return [...merged.values()];
}

export type GridGap='no cell in the area'|'no retrieval'|'below quality threshold';
export const GRID_KEYS=['area','period_start','period_end','platform','layer','cells','cells_with_value','cells_passing',
  'value_min','value_max','clear_days','gap','measure'] as const;
export interface GridCounts {files:number; places:number; periods:number; rows:number; passing:number; belowQuality:number;
  noRetrieval:number; noCell:number}

/** THE UNIT A TEMPERATURE IS REPORTED IN. The file states kelvin; degrees Celsius and Fahrenheit are the same quantity
 *  by exact formulas. The practitioner, 2026-11-06, chose Celsius by default and asked for Fahrenheit beside kelvin,
 *  each stated on the result and in the receipt. A product whose unit is not K is reported as the file states it. */
export type ReportUnit='K'|'°C'|'°F';
export const reportUnit=(reader:GridReader,asked:ReportUnit|undefined):string=>reader.unit==='K'?(asked??'°C'):reader.unit;
const CONVERSIONS:Record<string,{apply:(k:number)=>number;says:string}>={
  '°C':{apply:k=>k-273.15,says:'°C = K − 273.15'},
  '°F':{apply:k=>k*9/5-459.67,says:'°F = K × 9/5 − 459.67'},
};
export const conversionSays=(reader:GridReader,unit:string)=>reader.unit==='K'?CONVERSIONS[unit]?.says??null:null;
const convert=(v:number,reader:GridReader,unit:string)=>reader.unit==='K'&&CONVERSIONS[unit]?CONVERSIONS[unit]!.apply(v):v;
const shown=(raw:number|null,reader:GridReader,unit:string)=>raw===null?'':String(+convert(raw*reader.scale,reader,unit).toFixed(2));

/** THE LONG TABLE: one row per place per period per platform. The value is the mean of the passing cells, in kelvin as
 *  the file states it; how many cells it rests on, and how many clear days, are on the same row. */
export function gridTable(places:readonly Place[],readings:readonly PlaceReading[],reader:GridReader,layerKey:string,
  rule:ModisQualityRule,areaColumn='area',asked?:ReportUnit):{table:DataTable;counts:GridCounts}{
  const layer=reader.layers[layerKey]!,name=new Map(places.map(p=>[p.id,p.name])),unit=reportUnit(reader,asked);
  const counts:GridCounts={files:0,places:places.length,periods:new Set(readings.map(r=>r.period)).size,rows:0,passing:0,
    belowQuality:0,noRetrieval:0,noCell:0};
  const sorted=[...readings].sort((a,b)=>a.period.localeCompare(b.period)||a.platform.localeCompare(b.platform)
    ||String(name.get(a.placeId)).localeCompare(String(name.get(b.placeId))));
  const rows:DataTable['rows']=sorted.map(r=>{
    const s=r.sums;
    const gap:GridGap|null=s.cells===0?'no cell in the area':s.withValue===0?'no retrieval':s.passing===0?'below quality threshold':null;
    if(gap==='no cell in the area')counts.noCell++;else if(gap==='no retrieval')counts.noRetrieval++;
    else if(gap)counts.belowQuality++;else counts.passing++;
    return {key:{[areaColumn]:name.get(r.placeId)??r.placeId,period_start:r.period,period_end:r.end??'',platform:r.platform,
      layer:layer.label.toLowerCase(),cells:String(s.cells),cells_with_value:String(s.withValue),cells_passing:String(s.passing),
      value_min:shown(s.min,reader,unit),value_max:shown(s.max,reader,unit),
      clear_days:s.clearCells?String(+(s.clearSum/s.clearCells).toFixed(2)):'',gap:gap??'',measure:layer.column},
      value:gap?null:+convert(s.sum/s.passing*reader.scale,reader,unit).toFixed(3)};
  });
  counts.rows=rows.length;
  const keys=GRID_KEYS.map(k=>k==='area'?areaColumn:k);
  const table:DataTable={kind:'data-table',keys,valueField:layer.column,unit,
    primaryKey:[areaColumn,'period_start','platform'],
    columns:{
      [layer.column]:{unit,description:`${layer.label} land surface temperature${conversionSays(reader,unit)?`, in ${unit} (the file states ${reader.unit}; ${conversionSays(reader,unit)})`:''}: the mean of the cells whose centre is in the area and that passed the quality rule (${MODIS_RULES[rule]}). The ground's skin where the sky was clear, not the air.`,origin:'file',confirmed:true},
      cells:{description:'Cells of the file whose centre is inside or on the area.',origin:'file',confirmed:true},
      cells_with_value:{description:'Of those, cells with a retrieved value.',origin:'file',confirmed:true},
      cells_passing:{description:'Of those, cells that passed the quality rule: the mean rests on these.',origin:'file',confirmed:true},
      clear_days:{description:'Mean number of clear days, of the eight, behind the passing cells: each 8-day value is the mean of its clear days only.',origin:'file',confirmed:true},
      gap:{description:'Where there is no value: no cell in the area, no retrieval (cloud or other), or below the quality threshold.',origin:'file',confirmed:true},
    },
    rows,rowCount:rows.length,missingValueCount:rows.filter(r=>r.value==null).length};
  return {table,counts};
}

const plural=(n:number,one:string,many=one+'s')=>`${n.toLocaleString('en-US')} ${n===1?one:many}`;

export function gridSentence(c:GridCounts,reader:GridReader,layerKey:string,rule:ModisQualityRule,product:SatelliteProduct,
  kind:'area'|'point',asked?:ReportUnit,tags?:TagCheck):string{
  const layer=reader.layers[layerKey]!,unit=reportUnit(reader,asked);
  return `Read ${plural(c.files,'file')} of ${product.route.label} at ${plural(c.places,kind==='area'?'area':'point')} over `
    +`${plural(c.periods,'8-day period')}: ${plural(c.rows,'row')}, one per ${kind} per period per satellite, Terra and Aqua kept apart. `
    +`${c.passing} hold a mean of passing cells; ${c.belowQuality} have values none of which passed, ${c.noRetrieval} no retrieval, `
    +`${c.noCell} no cell in the ${kind==='area'?'area':'grid'}. ${layer.label} land surface temperature in ${unit}`
    +`${conversionSays(reader,unit)?` (the file states ${reader.unit}; ${conversionSays(reader,unit)})`:''}, `
    +`${kind==='area'?'over the cells whose centre is in the area':'in the cell containing the point'}, quality rule: ${MODIS_RULES[rule]}. `
    +`Land surface temperature is the ground's, not the air's. Nothing was filled.`
    +(tags?(tags.stated===tags.files?` Every file stated its unit as ${reader.unit} and its scale factor as ${reader.scale}, and was read by them.`
      :` ${tags.files-tags.stated} of ${tags.files} files stated no unit or scale factor; the product's, ${reader.unit} and ${reader.scale}, were used for them.`):'');
}

export const CELL_CONVENTIONS={area:'cells whose centre is inside or on the area; the mean of those that passed; not area-weighted',
  point:'the cell containing the point'} as const;

export function gridFacts(entity:string,c:GridCounts,reader:GridReader,layerKey:string,rule:ModisQualityRule,
  product:SatelliteProduct,kind:'area'|'point',asked?:ReportUnit):string{
  const q=(v:string)=>JSON.stringify(v),layer=reader.layers[layerKey]!,n=(v:number)=>`"${v}"^^xsd:integer`,unit=reportUnit(reader,asked);
  return `@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:SatelliteAreaSample;\n`
    +`  fw:sampledRoute ${q(product.route.id)};\n  fw:sampledVariable ${q(layer.variable)};\n`
    +`  fw:satelliteValueUnit ${q(unit)};\n`
    +(conversionSays(reader,unit)?`  fw:unitAsStated ${q(reader.unit)};\n  fw:unitConversion ${q(conversionSays(reader,unit)!)};\n`:'')
    +`  fw:cellConvention ${q(CELL_CONVENTIONS[kind])};\n`
    +`  fw:qualityVariable ${q(layer.quality)};\n  fw:qualityRule ${q(MODIS_RULES[rule])};\n`
    +`  fw:filesRead ${n(c.files)};\n  fw:placesSampled ${n(c.places)};\n  fw:rowsWritten ${n(c.rows)};\n`
    +`  fw:rowsPassing ${n(c.passing)};\n  fw:rowsBelowQuality ${n(c.belowQuality)};\n  fw:rowsNoRetrieval ${n(c.noRetrieval)};\n`
    +`  fw:rowsNoCell ${n(c.noCell)};\n  fw:completenessRead true;\n  fw:imputed false.\n`;
}
