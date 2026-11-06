/** SAMPLE SATELLITE FILES AT POINTS: the value of the swath pixel containing each point, per overpass, with its quality
 *  and, where there is no usable value, which kind of gap it is.
 *
 *  The practitioner, 2026-11-05: *"Sample satellite files seems to be more straightforward and less confusing."* And on
 *  completeness: *"widget has to make user aware of download data quality issues in this case completeness."* The
 *  admission review and every reading this is built on are in experiment 179.
 *
 *  What this module is: the reader settings per product, the classification of each reading, the long table, its
 *  sentence and its receipt. Pure, so it is tested without a browser. The bytes are read by
 *  `satellite-sample-worker.ts`, driven by `satellite-sample-reader.ts`. */
import fieldwork from '../examples/eo/routes-fieldwork.json';
import type {SatelliteProduct} from './satellite-products.js';
import type {CatalogItem} from './satellite-catalog.js';
import {repeatedKeys,type DataTable} from './data-table.js';
import {FILL} from './satellite-pixels.js';

export interface SatelliteReader {
  format:'s5p-l2-netcdf'; readOn:string; variable:string; column:string;
  latitude:string; longitude:string; time:string;
  /** The corner paths, read from the file and kept as found; the nearest-centre rule does not read them. */
  latitudeBounds?:string; longitudeBounds?:string;
  quality:{variable:string; threshold:number; operators:Record<string,QualityOperator>; note:string};
  token?:string;
}
export type QualityOperator='>='|'>';
/** THE THREE GAPS, kept apart because they mean different things (experiment 179, S8): no overpass, the satellite did not
 *  see the point that day or the point is outside the file's swath; no retrieval, it saw it and no value was retrieved
 *  (cloud, mostly); below the quality threshold, a value was retrieved and the product's own rule says not to use it. */
export type GapKind='no overpass'|'no retrieval'|'below quality threshold';

const READERS=(fieldwork as unknown as {readers:Record<string,SatelliteReader|string>}).readers;
export const readerFor=(product:SatelliteProduct):SatelliteReader|null=>{
  const found=READERS[product.route.id];return typeof found==='object'?found:null;};

/** One point as the reader needs it. */
export interface SamplePoint {id:string; name:string; lon:number; lat:number}
/** What the worker read at one point in one file. `row` null: no pixel of the file contains the point. */
export interface PixelReading {pointId:string; row:number|null; col:number|null; value:number|null; qaRaw:number|null; time:string|null}
/** One file, read. */
export interface FileReading {
  itemId:string; href:string; stream:string|null; orbit:number|null; datetime:string|null;
  units:string|null; qaScale:number; pixels:PixelReading[];
  /** Requests and bytes the browser fetched for this file, where it could measure them. */
  requests:number|null; bytes:number|null;
}

/** The threshold as the stored integer: 0.75 at scale 0.01 is 75. See the reader's quality note. */
export const rawThreshold=(threshold:number,scale:number)=>Math.round(threshold/scale);

export function classify(p:PixelReading,thresholdRaw:number,operator:QualityOperator,qaFill=255):{gap:GapKind|null;passes:boolean|null}{
  if(p.row==null)return {gap:'no overpass',passes:null};
  if(p.value==null||!Number.isFinite(p.value)||p.value>=FILL||p.qaRaw==null||p.qaRaw===qaFill)return {gap:'no retrieval',passes:null};
  const passes=operator==='>='?p.qaRaw>=thresholdRaw:p.qaRaw>thresholdRaw;
  return passes?{gap:null,passes:true}:{gap:'below quality threshold',passes:false};
}

/** Every UTC day from one date to another, inclusive. */
export function days(from:string,until:string):string[]{
  const out:string[]=[];const end=Date.parse(until+'T00:00:00Z');
  for(let t=Date.parse(from+'T00:00:00Z');Number.isFinite(t)&&t<=end&&out.length<3700;t+=86400000)out.push(new Date(t).toISOString().slice(0,10));
  return out;
}

export interface SampleCounts {files:number; points:number; days:number; rows:number; passing:number;
  belowQuality:number; noRetrieval:number; noOverpass:number; unplaced:number; requests:number|null; bytes:number|null}

export const SAMPLE_KEYS=['point_id','point','date','overpass_time','stream','orbit','scanline','ground_pixel',
  'value_as_read','qa_value','passes_quality','gap','measure'] as const;

/** THE ID COLUMN IS NAMED AS THE POINTS' SOURCE NAMES IT: `site` when Point data read the ids from a table's `site`
 *  column, `point_id` otherwise. So the result relates back to the source on that column, with nobody renaming it:
 *  the NYC ground readings are keyed `site` and `date`, and so are these (2026-11-05, experiment 179). */
const renameId=(keys:readonly string[],idColumn:string)=>keys.map(k=>k==='point_id'?idColumn:k);

/** THE LONG TABLE: one row per point per overpass read, and one per point per day with no overpass. The value column
 *  holds a value only where it passed the quality rule; any value read is kept as read in `value_as_read`, so a
 *  reading below the threshold is visible and never silently used. Nothing is filled. */
export function sampleTable(points:readonly SamplePoint[],readings:readonly FileReading[],from:string,until:string,
  reader:SatelliteReader,operator:QualityOperator,unplaced=0,idColumn='point_id'):{table:DataTable;counts:SampleCounts}{
  const rows:DataTable['rows']=[];
  const counts:SampleCounts={files:readings.length,points:points.length,days:0,rows:0,passing:0,belowQuality:0,noRetrieval:0,
    noOverpass:0,unplaced,requests:null,bytes:null};
  const span=days(from,until);counts.days=span.length;
  const dateOf=(r:FileReading)=>(r.datetime??'').slice(0,10);
  for(const point of points)for(const day of span){
    const same=readings.filter(r=>dateOf(r)===day);
    if(!same.length){
      rows.push({key:{point_id:point.id,point:point.name,date:day,overpass_time:'',stream:'',orbit:'',scanline:'',ground_pixel:'',
        value_as_read:'',qa_value:'',passes_quality:'',gap:'no overpass',measure:reader.column},value:null});
      counts.noOverpass++;continue;
    }
    for(const r of same){
      const p=r.pixels.find(x=>x.pointId===point.id)??{pointId:point.id,row:null,col:null,value:null,qaRaw:null,time:null};
      const {gap,passes}=classify(p,rawThreshold(reader.quality.threshold,r.qaScale),operator);
      const read=p.value!=null&&p.value<FILL?p.value:null;
      rows.push({key:{point_id:point.id,point:point.name,date:day,overpass_time:p.time??r.datetime??'',stream:r.stream??'',
        orbit:r.orbit!=null?String(r.orbit):'',scanline:p.row!=null?String(p.row):'',ground_pixel:p.col!=null?String(p.col):'',
        value_as_read:read!=null?String(read):'',qa_value:p.qaRaw!=null&&p.qaRaw!==255?(p.qaRaw*r.qaScale).toFixed(2):'',
        passes_quality:passes==null?'':passes?'yes':'no',gap:gap??'',measure:reader.column},value:gap?null:read});
      if(gap==='no overpass')counts.noOverpass++;else if(gap==='no retrieval')counts.noRetrieval++;
      else if(gap==='below quality threshold')counts.belowQuality++;else counts.passing++;
    }
  }
  counts.rows=rows.length;
  const measured=readings.filter(r=>r.requests!=null);
  if(measured.length===readings.length&&readings.length)counts.requests=measured.reduce((n,r)=>n+(r.requests??0),0);
  // A cross-origin download's size is hidden from the page unless the server allows it (Timing-Allow-Origin), and
  // Planetary Computer's storage does not: the browser reports 0. Zero is "not visible", never "nothing was read".
  if(measured.length===readings.length&&readings.length&&readings.every(r=>(r.bytes??0)>0)){
    counts.bytes=measured.reduce((n,r)=>n+(r.bytes??0),0);}
  // ONE OVERPASS READ TWICE is a finding, not a refusal: two streams of one orbit both kept.
  // The id column takes the source's name, last, so nothing above needs to know it.
  if(idColumn!=='point_id'&&!SAMPLE_KEYS.includes(idColumn as typeof SAMPLE_KEYS[number]))
    for(const r of rows){const {point_id,...rest}=r.key;r.key={[idColumn]:point_id!,...rest};}
  else idColumn='point_id';
  const twice=repeatedKeys(rows.filter(r=>r.key.orbit).map(r=>r.key),[idColumn,'orbit']).map(f=>({...f,
    text:`${f.text} One orbit is one overpass: two of its processing streams were read. Keep one in Search a satellite catalog.`}));
  const units=readings.find(r=>r.units)?.units??undefined;
  const table:DataTable={kind:'data-table',keys:renameId(SAMPLE_KEYS,idColumn),valueField:reader.column,...(units?{unit:units}:{}),
    primaryKey:[idColumn,'date','overpass_time','stream'],secondaryKeys:[idColumn,'orbit'],
    ...(twice.length?{findings:twice}:{}),
    columns:{
      [reader.column]:{unit:units,description:`${reader.variable}, at the pixel whose centre is nearest the point, where it passed the quality rule. A column amount, not a surface concentration.`,origin:'file',confirmed:true},
      value_as_read:{unit:units,description:'The value read at the pixel, whether or not it passed the quality rule. Empty where none was retrieved.',origin:'file',confirmed:true},
      qa_value:{description:`${reader.quality.variable}, scaled as the file states. The rule: qa_value ${operator} ${reader.quality.threshold}.`,origin:'file',confirmed:true},
      gap:{description:'Where there is no usable value, which kind of gap: no overpass, no retrieval, or below quality threshold.',origin:'file',confirmed:true},
    },
    rows,rowCount:rows.length,missingValueCount:rows.filter(r=>r.value==null).length};
  return {table,counts};
}

const plural=(n:number,one:string,many=one+'s')=>`${n.toLocaleString('en-US')} ${n===1?one:many}`;

export function sampleSentence(c:SampleCounts,reader:SatelliteReader,operator:QualityOperator,product:SatelliteProduct):string{
  return `Read ${plural(c.files,'file')} of ${product.route.label} at ${plural(c.points,'point')} over ${plural(c.days,'day')}: `
    +`${plural(c.rows,'row')}, one per point per overpass and one per point per day without one. `
    +`${plural(c.passing,'row')} hold a value passing qa_value ${operator} ${reader.quality.threshold}; `
    +`${c.belowQuality.toLocaleString('en-US')} below it, ${c.noRetrieval.toLocaleString('en-US')} with no retrieval, `
    +`${c.noOverpass.toLocaleString('en-US')} with no overpass.`
    +(c.unplaced?` ${plural(c.unplaced,'point')} without coordinates ${c.unplaced===1?'was':'were'} not sampled.`:'')
    +` The value is that of the pixel whose centre is nearest the point, not an interpolation, and a column amount, not a surface `
    +`concentration. Nothing was filled.`
    +(c.bytes!=null?` ${(c.bytes/1e6).toFixed(1)} MB in ${plural(c.requests??0,'request')}.`
      :c.requests!=null?` ${plural(c.requests,'request')}; the storage does not let the browser see their size.`:'');
}

export function sampleFacts(entity:string,c:SampleCounts,reader:SatelliteReader,operator:QualityOperator,product:SatelliteProduct,units:string|null):string{
  const q=(v:string)=>JSON.stringify(v);
  return `@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:SatellitePointSample;\n`
    +`  fw:sampledRoute ${q(product.route.id)};\n  fw:sampledVariable ${q(reader.variable)};\n`
    +(units?`  fw:satelliteValueUnit ${q(units)};\n`:'')
    +`  fw:pixelConvention "pixel whose centre is nearest; no interpolation";\n`
    +`  fw:qualityVariable ${q(reader.quality.variable)};\n  fw:qualityThreshold "${reader.quality.threshold}"^^xsd:decimal;\n`
    +`  fw:qualityOperator ${q(operator)};\n`
    +`  fw:filesRead "${c.files}"^^xsd:integer;\n  fw:pointsSampled "${c.points}"^^xsd:integer;\n`
    +`  fw:rowsWritten "${c.rows}"^^xsd:integer;\n  fw:rowsPassing "${c.passing}"^^xsd:integer;\n`
    +`  fw:rowsBelowQuality "${c.belowQuality}"^^xsd:integer;\n  fw:rowsNoRetrieval "${c.noRetrieval}"^^xsd:integer;\n`
    +`  fw:rowsNoOverpass "${c.noOverpass}"^^xsd:integer;\n`
    +`  fw:completenessRead true;\n  fw:imputed false.\n`;
}

/** The file of an item a reader opens: its NetCDF asset. */
export const dataFileOf=(item:CatalogItem)=>item.files.find(f=>/netcdf/i.test(f.type??'')||/\.nc(\?|$)/.test(f.href))??null;
