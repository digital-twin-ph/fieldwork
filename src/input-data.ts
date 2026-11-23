
import {readCoordinate,coordinateReport,type ReadCoordinate,type CoordinateReport} from './coordinates.js';
import type {Database,SqlJsStatic,SqlValue} from 'sql.js';
import type {Boundary,Position,PointFeature,PointCollection,Scalar} from './types.js';
import {READABLE_SOURCE_EPSG,utmFromEPSGCode} from './metric-crs.js';
import {reprojectToCRS84} from './reproject.js';
import {MAX_POINT_RECORDS} from './point-layers.js';
// A point file's size on import is the table file's: a file of points a table can read, Point data can read.
import {MAX_TABLE_FILE_BYTES as MAX_POINT_FILE_BYTES} from './data-table.js';
/** THE NAMES A COLUMN OF COORDINATES GOES BY, in one place (2026-11-23). Point data's CSV import knew them and proposed
 *  by them; Tabular data did not, so latitude and longitude were proposed as measurements and melted into measure and
 *  value, which left a table with no coordinates for Point data to read; and Point data's own from-a-table dialog
 *  proposed nothing at all. The practitioner, 2026-11-23: *"Latitude and Longitude does not show up on the point table
 *  so it cannot be picked."* */
export const COLUMN_ALIASES={longitude:['longitude','lon','lng','x','easting','east'],
  latitude:['latitude','lat','y','northing','north'],id:['id','fid'],name:['name','label']} as const;
export type ColumnRole=keyof typeof COLUMN_ALIASES;
/** The first column of `columns` whose name is one of that role's, compared without case or surrounding spaces. */
export const columnFor=(role:ColumnRole,columns:readonly string[]):string|undefined=>
  columns.find(c=>(COLUMN_ALIASES[role] as readonly string[]).includes(c.trim().toLowerCase()));
/** A COORDINATE LOCATES THE SUBJECT, IT DOES NOT MEASURE IT: true for a column named as a longitude or a latitude. */
export const isCoordinateColumn=(name:string):boolean=>{
  const h=name.trim().toLowerCase();
  return (COLUMN_ALIASES.longitude as readonly string[]).includes(h)||(COLUMN_ALIASES.latitude as readonly string[]).includes(h);
};
export interface CSVTable {headers:string[]; rows:string[][];
  /** Columns the file gave no name, or a name another column has, and the name each is read under. */
  named?:{column:number;given:string;as:string}[];
  /** How the file's bytes were read as text, where it was not UTF-8. */
  encoding?:'windows-1252'}
/** A FILE'S TEXT, AS UTF-8 OR, WHERE IT IS NOT, AS WINDOWS-1252 (2026-11-23): the African Bat Database's CSV is written
 *  as Excel on Windows writes, and read as UTF-8 its accented place names became replacement characters, unsaid. */
export async function readTextFile(file:Blob):Promise<{text:string;encoding?:'windows-1252'}>{
  const bytes=new Uint8Array(await file.arrayBuffer());
  try{return {text:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};}
  catch{return {text:new TextDecoder('windows-1252').decode(bytes),encoding:'windows-1252'};}
}
/** Which columns hold the axes, and in which unit.
 *
 *  The axes are **x and y**, not longitude and latitude, and the explicit mapping is the
 *  practitioner's: longitude is x, latitude is y. That holds for degrees, and the same ordering
 *  holds for projected metres, where x is easting and y is northing. It is why one gate can read
 *  both — and why naming the slots `longitude` and `latitude` was wrong, because `reproject-ui`
 *  passes easting into the longitude slot and northing into the latitude slot. The ordering was
 *  always right; only the names were true of one caller.
 *
 *  `units` is required and has no default. The practitioner's point: geopandas will not build a
 *  GeoDataFrame without a CRS and complains loudly when one is missing, and this function had no
 *  notion of one at all. It is called from two places with the same two slots meaning different
 *  things — the ordinary import reads degrees, and `reproject-ui` reads UTM **easting and
 *  northing in metres** into the `longitude` and `latitude` fields and converts afterwards. So the
 *  unit lived in what the caller did next, and nothing in the data or the signature carried it.
 *
 *  Measured before the fix: a CSV of UTM metres imported through the ordinary path produced
 *  `[500000, 7800000]` as a longitude and latitude, with no error. Downstream nothing catches it —
 *  every point reads as Outside the study area, which is a finding about geography rather than an
 *  error, and haversine on metres-read-as-degrees returns a finite nonsense distance. */
export interface CSVMapping {x:number; y:number; id:number; name:number; units:'degree'|'metre'}
export interface GeoPackageLayer {table_name:string; column_name:string; srs_id:number; epsg:number}

import {geometryBounds} from './study-area.js';
import {pointRelation} from './spatial-predicates.js';
const feature=(id:string,name:string,coordinates:Position|null):PointFeature=>({type:'Feature',id,properties:{name},geometry:coordinates?{type:'Point',coordinates}:null});
/** `maxRecords` is the caller's: points default to MAX_POINT_RECORDS, and a table passes its own ceiling, MAX_TABLE_ROWS. */
export function parseCSV(text:string,maxRecords=MAX_POINT_RECORDS,maxChars=MAX_POINT_FILE_BYTES):CSVTable{
  if(text.length>maxChars)throw new Error(`CSV exceeds the ${maxChars/1e6} MB limit.`);
  text=text.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
  const endField=()=>{row.push(field);field='';closed=false;};
  const endRow=()=>{endField();if(row.some(s=>s.trim()))rows.push(row);row=[];if(rows.length>maxRecords+1)throw new Error(`CSV supports at most ${maxRecords.toLocaleString('en-US')} records.`);};
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c===',')endField();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;endRow();}else if(c==='"'&&!field&&!closed)quoted=true;else{if(closed||c==='"')throw new Error('Malformed CSV quoting.');field+=c;}}
  if(quoted)throw new Error('CSV has an unclosed quoted field.');if(field||row.length||closed)endRow();
  if(!rows.length)throw new Error('CSV needs a header row.');const given=rows.shift()!.map(s=>s.trim());
  // A COLUMN WITH NO NAME, OR ANOTHER'S, IS NAMED AND SAID, NOT REFUSED (2026-11-23): R writes its row numbers under an
  // empty header, and the African Bat Database's CSV was refused whole for it. "column_1" for the first column without a
  // name; a name met again takes "_2", "_3"; neither takes a name the file uses.
  const headers:string[]=[],named:{column:number;given:string;as:string}[]=[];
  given.forEach((h,i)=>{let as=h||`column_${i+1}`;
    for(let n=2;headers.includes(as)||(as!==h&&given.includes(as));n++)as=`${h||`column_${i+1}`}_${n}`;
    headers.push(as);if(as!==h)named.push({column:i+1,given:h,as});});
  if(rows.some(r=>r.length!==headers.length))throw new Error('Every CSV row must have the same number of fields as the header.');
  return {headers,rows,...(named.length?{named}:{})};
}
/** The loud complaint. Degrees are bounded and metres are not, so the check that matters is the
 *  one that catches a projected file read as geographic — and it names the widget that reads
 *  projected files, because "out of range" without that is a dead end for a practitioner. */
function checkRange(x:number,y:number,units:'degree'|'metre',record:number):void{
  if(units==='degree'){
    if(Math.abs(x)>180||Math.abs(y)>90)
      throw new Error(`CSV record ${record} has coordinates (${x}, ${y}) outside the longitude and `
        +`latitude range. If this file holds projected coordinates in metres, import it with `
        +`Reproject, which asks for the UTM zone and converts.`);
  }else if(Math.abs(x)>10000000||Math.abs(y)>10000000)
    throw new Error(`CSV record ${record} has coordinates (${x}, ${y}) too large to be UTM metres.`);
}

/** What reading the coordinates came to, for the dialog to say: values read as degrees, minutes and seconds, those with
 *  no hemisphere, and the records whose coordinates could not be read, with why. */
export interface CSVCoordinateReport {x:CoordinateReport; y:CoordinateReport; unread:{record:number; reason:string}[]}
export function csvPoints(table:CSVTable,mapping:CSVMapping,report?:CSVCoordinateReport):PointCollection{
  const {x:xColumn,y:yColumn,id,name}=mapping;
  if(!Number.isInteger(xColumn)||!Number.isInteger(yColumn)||xColumn===yColumn||![xColumn,yColumn].every(i=>i>=0&&i<table.headers.length))throw new Error('Select distinct longitude and latitude columns.');
  const readX:ReadCoordinate[]=[],readY:ReadCoordinate[]=[],unread:CSVCoordinateReport['unread']=[];
  const features=table.rows.map((r,i)=>{
    const lon=r[xColumn].trim(),lat=r[yColumn].trim();
    let position:Position|null=null;
    if(lon&&lat){
      // IN DEGREES, decimal or degrees, minutes and seconds (2026-11-18); in metres, numbers only, as before. A value
      // that cannot be read leaves its record unplaced and said, not the file refused.
      const rx=mapping.units==='degree'?readCoordinate(lon,'x'):{value:Number(lon),dms:false,hemisphereStated:true};
      const ry=mapping.units==='degree'?readCoordinate(lat,'y'):{value:Number(lat),dms:false,hemisphereStated:true};
      readX.push(rx);readY.push(ry);
      if(rx.value===null||ry.value===null||!Number.isFinite(rx.value)||!Number.isFinite(ry.value)){
        if(mapping.units==='metre')throw new Error(`CSV record ${i+1} has nonnumeric coordinates.`);
        unread.push({record:i+1,reason:(rx.value===null?rx.reason:ry.reason)??`(${lon}, ${lat}) is not a pair of coordinates`});
      }else{checkRange(rx.value,ry.value,mapping.units,i+1);position=[rx.value,ry.value];}
    }
    const f=feature(id>=0?r[id].trim():`row-${i+1}`,name>=0?r[name]:`Record ${i+1}`,position);
    f.properties={...Object.fromEntries(table.headers.map((h,j)=>[h,r[j]])),name:f.properties.name};return f;});
  if(report){report.x=coordinateReport(readX);report.y=coordinateReport(readY);report.unread=unread;}
  return {type:'FeatureCollection',features};
}
export function syntheticPoints(boundary:Boundary,{inside=20,outside=2,seed=42}={}):PointCollection{
  if(![inside,outside,seed].every(Number.isInteger)||inside<1||outside<0||inside+outside>MAX_POINT_RECORDS||seed<0||seed>4294967295)throw new Error(`Use 1–${MAX_POINT_RECORDS.toLocaleString('en')} total points and an integer seed from 0 to 4294967295.`);
  let state=seed>>>0;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  const [w,s,e,n]=geometryBounds(boundary),dx=e-w,dy=n-s,features:PointFeature[]=[];
  for(const [count,isInside] of ([[inside,true],[outside,false]] as const)){let made=0,attempts=0;while(made<count&&attempts++<100000){const a=isInside?[w,s,e,n]:[Math.max(-180,w-dx),Math.max(-85,s-dy),Math.min(180,e+dx),Math.min(85,n+dy)];const p=[a[0]+random()*(a[2]-a[0]),a[1]+random()*(a[3]-a[1])];if((pointRelation(p,boundary)==='Inside')!==isInside||(!isInside&&pointRelation(p,boundary)!=='Outside'))continue;made++;features.push(feature(`synthetic-${features.length+1}`,`Synthetic ${isInside?'inside':'outside'} ${made}`,p));}if(made<count)throw new Error('Could not sample this shape within the attempt limit. Try a less narrow boundary.');}
  return {type:'FeatureCollection',features};
}
const quote=(id:string)=>'"'+String(id).replaceAll('"','""')+'"';
const records=(db:Database,sql:string):Record<string,SqlValue>[]=>{const r=db.exec(sql)[0];return r?r.values.map(values=>Object.fromEntries(r.columns.map((c,i)=>[c,values[i]]))):[];};
/** RFC 7946 fixes GeoJSON at CRS84 and removed the `crs` member the superseded 2008 draft allowed.
 *  Files written to that draft are still in circulation, and a `crs` member naming something else
 *  is the one case where a GeoJSON says plainly that it is not what this importer assumes. Reading
 *  it as degrees anyway is the same silent failure a UTM CSV used to produce, so it is refused by
 *  name. A member that names CRS84 or EPSG:4326 agrees with RFC 7946 and is accepted. */
export function geoJSONDeclaredCRS(raw:unknown):string{
  const member=(raw as {crs?:unknown})?.crs;
  if(member===undefined||member===null)return 'CRS84';
  const name=(member as {properties?:{name?:unknown}})?.properties?.name;
  if(typeof name!=='string')throw new Error('This GeoJSON carries a "crs" member this importer cannot read. RFC 7946 removed that member and fixes GeoJSON at CRS84; remove it if the coordinates are longitude and latitude.');
  if(/(CRS84|(EPSG(::?|:)|^)4326$)/i.test(name))return 'CRS84';
  throw new Error(`This GeoJSON declares its coordinates as ${name}. This importer reads CRS84 longitude and latitude, which is what RFC 7946 fixes GeoJSON at; convert the file before importing.`);
}
export function geoPackageLayers(db:Database):GeoPackageLayer[]{
  const layers=records(db,"SELECT g.table_name, g.column_name, g.srs_id, s.organization_coordsys_id AS epsg FROM gpkg_geometry_columns g JOIN gpkg_contents c ON c.table_name=g.table_name JOIN gpkg_spatial_ref_sys s ON s.srs_id=g.srs_id JOIN sqlite_master m ON m.name=g.table_name WHERE c.data_type='features' AND m.type='table' AND upper(g.geometry_type_name)='POINT' AND g.z=0 AND g.m=0 AND upper(s.organization)='EPSG'");
  // A GeoPackage states its own CRS in `gpkg_spatial_ref_sys`. Until 2026-10-13 that declaration
  // was read only in order to REFUSE anything but EPSG:4326, which told the practitioner to go and
  // reproject a file that had already told us what it was. The declaration is now honoured: 4326 is
  // read as it stands, a WGS84 UTM zone is converted on import, and anything else is refused BY ITS
  // CODE rather than as a blanket "not 4326", because that is the part the practitioner can act on.
  const described=layers.map(layer=>{if(typeof layer.table_name!=="string"||typeof layer.column_name!=="string"||typeof layer.srs_id!=="number"||typeof layer.epsg!=="number")throw new Error("Invalid GeoPackage layer metadata.");return {table_name:layer.table_name,column_name:layer.column_name,srs_id:layer.srs_id,epsg:layer.epsg};});
  const readable=described.filter(layer=>READABLE_SOURCE_EPSG(layer.epsg));
  if(!readable.length){
    const found=[...new Set(described.map(l=>`EPSG:${l.epsg}`))];
    throw new Error(described.length
      ?`This GeoPackage's point layers are in ${found.join(', ')}. This importer reads EPSG:4326 and WGS84 UTM zones; another projection or datum needs a conversion this prototype does not implement, so convert the layer before importing.`
      :'No supported 2D POINT layers. The importer reads 2D POINT layers in EPSG:4326 or a WGS84 UTM zone.');
  }
  return readable;
}
export function decodeGeoPackagePoint(bytes:unknown,srsId:number):Position|null{
  if(bytes===null)return null;
  if(!(bytes instanceof Uint8Array)||bytes.length<8)throw new Error('Invalid GeoPackage geometry.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),flags=bytes[3],little=!!(flags&1),envelope=(flags>>1)&7;
  if(bytes[0]!==71||bytes[1]!==80||bytes[2]!==0||(flags&224)||envelope>4||view.getInt32(4,little)!==srsId)throw new Error('Unsupported GeoPackage geometry header or CRS.');
  const offset=8+[0,32,48,48,64][envelope];
  if(bytes.length<offset+21)throw new Error('Truncated GeoPackage point.');
  const order=view.getUint8(offset);if(order>1||view.getUint32(offset+1,!!order)!==1)throw new Error('Only standard 2D Point WKB is supported.');
  const coords=[view.getFloat64(offset+5,!!order),view.getFloat64(offset+13,!!order)];
  if(flags&16){if(!coords.every(Number.isNaN))throw new Error('Inconsistent empty GeoPackage point.');return null;}
  return coords;
}
export function geoPackagePoints(db:Database,layer:string):PointCollection{
  const valid=geoPackageLayers(db).find(l=>l.table_name===layer);if(!valid)throw new Error('Select a supported GeoPackage point layer.');
  const columns=records(db,`PRAGMA table_info(${quote(layer)})`),id=columns.find(c=>c.pk===1)?.name,name=columns.find(c=>['name','label'].includes(String(c.name).toLowerCase()))?.name;
  if(typeof id!=='string')throw new Error('The point layer needs a primary key.');
  const rows=records(db,`SELECT * FROM ${quote(layer)} ORDER BY ${quote(id)} LIMIT 2001`);
  if(rows.length>MAX_POINT_RECORDS)throw new Error(`This GeoPackage layer has ${rows.length.toLocaleString('en')} points; Point data reads at most ${MAX_POINT_RECORDS.toLocaleString('en')}.`);
  const collection:PointCollection={type:'FeatureCollection',features:rows.map(r=>{const f=feature(String(r[id]),String((typeof name==='string'?r[name]:null)??r[id]),decodeGeoPackagePoint(r[valid.column_name],valid.srs_id));const attrs=Object.entries(r).filter(([k])=>k!==valid.column_name);if(attrs.some(([,v])=>v instanceof Uint8Array))throw new Error('Binary attribute fields are not supported in this point importer.');f.properties={...Object.fromEntries(attrs) as Record<string,Scalar>,name:f.properties.name};return f;})};
  const utm=utmFromEPSGCode(valid.epsg);
  return utm?reprojectToCRS84(collection,utm.zone,utm.hemisphere).collection:collection;
}
let sqlite:Promise<SqlJsStatic>|null=null;
export function loadSQLite(){if(!sqlite)sqlite=new Promise<SqlJsStatic>((resolve,reject)=>{const script=document.createElement('script');script.src='./vendor/sql-wasm.js';script.onload=()=>globalThis.initSqlJs({locateFile:()=>new URL('./vendor/sql-wasm.wasm',location.href).href}).then(resolve,reject);script.onerror=()=>reject(new Error('The local GeoPackage reader could not load.'));document.head.append(script);}).catch(error=>{sqlite=null;throw error;});return sqlite;}

