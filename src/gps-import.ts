/** WAYPOINTS FROM A GPS DEVICE (experiment 09's open item 14; the practitioner, 2026-11-22: *"Can point data also use
 *  exports from GPS devices?"*, then *"Waypoints only"*).
 *
 *  GPX, which handheld units and phone apps export, and KML or KMZ, which Google Earth and many field apps export. Each
 *  waypoint or point placemark becomes a point, with its name, time, elevation and description. Tracks, routes and
 *  shapes are lines or areas, which Point data does not hold and Fieldwork has no layer for yet: they are counted and
 *  said, never silently dropped. Both formats state longitude and latitude on WGS84, so nothing is converted. */
import {unzipSync,strFromU8} from 'fflate';
import type {PointCollection,PointFeature} from './types.js';

export interface GpsRead {collection:PointCollection; format:'gpx'|'kml'; lines:{tracks:number;routes:number;shapes:number}}

const child=(el:Element,name:string)=>[...el.children].find(c=>c.localName===name);
const text=(el:Element|undefined)=>el?.textContent?.trim()??'';
const number=(value:string)=>value!==''&&Number.isFinite(Number(value))?Number(value):undefined;

function point(id:string,lon:number,lat:number,props:Record<string,string|number|undefined>):PointFeature|null{
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
  const properties:PointFeature['properties']={name:String(props.name||id)};
  for(const [k,v] of Object.entries(props))if(k!=='name'&&v!==undefined&&v!=='')properties[k]=v;
  return {type:'Feature',id,properties,geometry:{type:'Point',coordinates:[lon,lat]}};
}

export function readGpx(xml:string):GpsRead{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName!=='gpx')throw new Error('This file is not GPX: its first element is not <gpx>.');
  const features:PointFeature[]=[];
  [...doc.documentElement.children].filter(e=>e.localName==='wpt').forEach((w,i)=>{
    const f=point(`wpt-${i+1}`,Number(w.getAttribute('lon')),Number(w.getAttribute('lat')),{name:text(child(w,'name')),time:text(child(w,'time')),
      elevation_m:number(text(child(w,'ele'))),description:text(child(w,'desc'))||text(child(w,'cmt')),symbol:text(child(w,'sym')),type:text(child(w,'type'))});
    if(f)features.push(f);});
  const count=(name:string)=>[...doc.documentElement.children].filter(e=>e.localName===name).length;
  return {collection:{type:'FeatureCollection',features},format:'gpx',lines:{tracks:count('trk'),routes:count('rte'),shapes:0}};
}

export function readKml(xml:string):GpsRead{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName!=='kml')throw new Error('This file is not KML: its first element is not <kml>.');
  const features:PointFeature[]=[];let tracks=0,shapes=0;
  [...doc.getElementsByTagNameNS('*','Placemark')].forEach((p,i)=>{
    const has=(name:string)=>p.getElementsByTagNameNS('*',name).length>0;
    const pt=p.getElementsByTagNameNS('*','Point')[0];
    if(!pt){if(has('LineString')||has('Track'))tracks++;else if(has('Polygon'))shapes++;return;}
    const [lon,lat,alt]=text(pt.getElementsByTagNameNS('*','coordinates')[0]).split(',').map(Number);
    const extra:Record<string,string>={};
    for(const d of [...p.getElementsByTagNameNS('*','Data')]){const key=(d.getAttribute('name')??'').replace(/[^A-Za-z0-9_]/g,'_');if(/^[A-Za-z]/.test(key)&&!['name','capturedAt'].includes(key))extra[key.slice(0,60)]=text(d.getElementsByTagNameNS('*','value')[0]);}
    const f=point(`placemark-${i+1}`,lon!,lat!,{name:text(child(p,'name')),time:text(p.getElementsByTagNameNS('*','when')[0]),
      elevation_m:Number.isFinite(alt)?alt:undefined,description:text(child(p,'description')),...extra});
    if(f)features.push(f);});
  return {collection:{type:'FeatureCollection',features},format:'kml',lines:{tracks,routes:0,shapes}};
}

/** A KMZ is a zip holding a KML, `doc.kml` by convention, or the first `.kml` in it. */
export function readKmz(bytes:Uint8Array):GpsRead{
  let files:Record<string,Uint8Array>;
  try{files=unzipSync(bytes,{filter:f=>f.name.toLowerCase().endsWith('.kml')});}catch{throw new Error('This file is not KMZ: it does not open as a zip.');}
  const name=Object.keys(files).find(n=>n.toLowerCase()==='doc.kml')??Object.keys(files)[0];
  if(!name)throw new Error('This KMZ holds no KML file.');
  return readKml(strFromU8(files[name]!));
}

/** What was read and what was not, in one sentence. */
export function gpsSentence(read:GpsRead,file:string):string{
  const n=read.collection.features.length,{tracks,routes,shapes}=read.lines;
  const lines=[tracks?`${tracks} ${tracks===1?'track':'tracks'}`:'',routes?`${routes} ${routes===1?'route':'routes'}`:'',shapes?`${shapes} ${shapes===1?'shape':'shapes'}`:''].filter(Boolean);
  return `${n.toLocaleString('en')} ${read.format==='gpx'?(n===1?'waypoint':'waypoints'):(n===1?'point':'points')} read from ${file}.`
    +(lines.length?` ${lines.join(', ')} ${tracks+routes+shapes===1?'is a line or an area and was':'are lines or areas and were'} not imported: Point data holds points.`:'');
}
