/** LINES (experiment 229; the practitioner, 2026-11-22: *"That's an important gap no line layer"*, then *"Let's start the
 *  line layer"*). Routes, tracks and borders: a team's GPS track in microplanning, a road, the border two study areas
 *  share. Fieldwork held points, areas, rasters and street networks; a street network is a graph for routing, and a
 *  track or a border is not something to route over, so lines are a value of their own.
 *
 *  Read from GPX (tracks and routes), KML or KMZ (LineString and gx:Track), GeoJSON (LineString, MultiLineString), or
 *  made from two study areas: the stretches of the first's outline lying within a stated distance of the second's.
 *  Every format states longitude and latitude on WGS84, so nothing is converted. What a file holds that is not a line
 *  is counted and said, never silently dropped. */
import {unzipSync,strFromU8} from 'fflate';
import type {Boundary} from './types.js';

import type {LineFeature,LineLayer} from './types.js';
export type {LineFeature,LineLayer};
type Position=[number,number];

const child=(el:Element,name:string)=>[...el.children].find(c=>c.localName===name);
const text=(el:Element|undefined)=>el?.textContent?.trim()??'';
const valid=([lon,lat]:number[])=>Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lat!)<=90&&Math.abs(lon!)<=180;
/** A line needs two positions; a part with fewer is dropped, a feature with no part left is not kept. */
function feature(id:string,name:string,parts:Position[][],props:Record<string,string|number>={}):LineFeature|null{
  const kept=parts.map(p=>p.filter(valid)).filter(p=>p.length>=2);
  if(!kept.length)return null;
  const properties:LineFeature['properties']={name:name||id};
  for(const [k,v] of Object.entries(props))if(k!=='name'&&v!=='')properties[k]=v;
  return {type:'Feature',id,properties,geometry:kept.length===1?{type:'LineString',coordinates:kept[0]!}:{type:'MultiLineString',coordinates:kept}};
}

export function readLinesGpx(xml:string):LineLayer{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName!=='gpx')throw new Error('This file is not GPX: its first element is not <gpx>.');
  const top=[...doc.documentElement.children],features:LineFeature[]=[];
  const at=(p:Element):Position=>[Number(p.getAttribute('lon')),Number(p.getAttribute('lat'))];
  top.filter(e=>e.localName==='trk').forEach((t,i)=>{
    const parts=[...t.children].filter(s=>s.localName==='trkseg').map(s=>[...s.children].filter(p=>p.localName==='trkpt').map(at));
    const f=feature(`trk-${i+1}`,text(child(t,'name')),parts,{kind:'track',description:text(child(t,'desc'))});if(f)features.push(f);});
  top.filter(e=>e.localName==='rte').forEach((r,i)=>{
    const f=feature(`rte-${i+1}`,text(child(r,'name')),[[...r.children].filter(p=>p.localName==='rtept').map(at)],{kind:'route',description:text(child(r,'desc'))});
    if(f)features.push(f);});
  return {kind:'lines',features,source:'GPX',notLines:{points:top.filter(e=>e.localName==='wpt').length,areas:0}};
}

export function readLinesKml(xml:string):LineLayer{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.documentElement.localName!=='kml')throw new Error('This file is not KML: its first element is not <kml>.');
  const features:LineFeature[]=[];let points=0,areas=0;
  [...doc.getElementsByTagNameNS('*','Placemark')].forEach((p,i)=>{
    const all=(name:string)=>[...p.getElementsByTagNameNS('*',name)];
    const strings=all('LineString').map(l=>text(l.getElementsByTagNameNS('*','coordinates')[0]).split(/\s+/).filter(Boolean)
      .map(c=>c.split(',').slice(0,2).map(Number) as Position));
    const tracks=all('Track').map(t=>[...t.getElementsByTagNameNS('*','coord')].map(c=>text(c).split(/\s+/).slice(0,2).map(Number) as Position));
    const parts=[...strings,...tracks];
    if(!parts.length){if(all('Polygon').length)areas++;else if(all('Point').length)points++;return;}
    const f=feature(`placemark-${i+1}`,text(child(p,'name')),parts,{description:text(child(p,'description'))});if(f)features.push(f);});
  return {kind:'lines',features,source:'KML',notLines:{points,areas}};
}

export function readLinesKmz(bytes:Uint8Array):LineLayer{
  let files:Record<string,Uint8Array>;
  try{files=unzipSync(bytes,{filter:f=>f.name.toLowerCase().endsWith('.kml')});}catch{throw new Error('This file is not KMZ: it does not open as a zip.');}
  const name=Object.keys(files).find(n=>n.toLowerCase()==='doc.kml')??Object.keys(files)[0];
  if(!name)throw new Error('This KMZ holds no KML file.');
  return {...readLinesKml(strFromU8(files[name]!)),source:'KMZ'};
}

export function readLinesGeoJson(raw:unknown):LineLayer{
  const doc=raw as {type?:string;features?:unknown[];geometry?:unknown};
  const list=doc?.type==='FeatureCollection'&&Array.isArray(doc.features)?doc.features:doc?.type==='Feature'?[doc]:null;
  if(!list)throw new Error('This file is not a GeoJSON Feature or FeatureCollection.');
  const features:LineFeature[]=[];let points=0,areas=0;
  list.forEach((item,i)=>{
    const f=item as {id?:string|number;properties?:Record<string,unknown>;geometry?:{type?:string;coordinates?:unknown}};
    const g=f.geometry,type=g?.type;
    if(type==='LineString'||type==='MultiLineString'){
      const parts=(type==='LineString'?[g!.coordinates]:g!.coordinates) as Position[][];
      const props:Record<string,string|number>={};
      for(const [k,v] of Object.entries(f.properties??{}))if(typeof v==='string'||(typeof v==='number'&&Number.isFinite(v)))props[k]=v;
      const id=String(f.id??`line-${i+1}`),name=typeof f.properties?.name==='string'?f.properties.name:'';
      const made=feature(id,name,parts.map(p=>p.map(c=>[Number(c[0]),Number(c[1])] as Position)),props);if(made)features.push(made);}
    else if(type==='Polygon'||type==='MultiPolygon')areas++;
    else if(type==='Point'||type==='MultiPoint')points++;});
  return {kind:'lines',features,source:'GeoJSON',notLines:{points,areas}};
}

/** THE DEFAULT DISTANCE within which two outlines count as one border, measured, not chosen (experiment 229): Rwanda's
 *  Western Province and DR Congo's Kivus, from two sources, meet in 2 stretches and 201 km at 500 m, 1 stretch at 1 km,
 *  and 206 km at 2 km, so widening it past 500 m takes in no stretch that is not border. */
export const BORDER_TOLERANCE_M=500;

const R=6371008.8,rad=Math.PI/180;
/** Metres along the sphere between two positions. */
export function metres(a:Position,b:Position):number{
  const dl=(b[1]-a[1])*rad,dg=(b[0]-a[0])*rad,h=Math.sin(dl/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dg/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
export const partsOf=(f:LineFeature):Position[][]=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
/** A line's length in km, summed over its parts. */
export function lengthKm(f:LineFeature):number{
  let m=0;for(const p of partsOf(f))for(let i=1;i<p.length;i++)m+=metres(p[i-1]!,p[i]!);return m/1000;
}

const rings=(b:Boundary):Position[][]=>(b.type==='Polygon'?[b.coordinates]:b.coordinates).flat() as Position[][];
/** Metres from a position to a segment, on a plane tangent at the position: exact enough at a border's scale. */
function toSegment(p:Position,a:Position,b:Position):number{
  const k=Math.cos(p[1]*rad)*rad*R,m=rad*R;
  const ax=(a[0]-p[0])*k,ay=(a[1]-p[1])*m,bx=(b[0]-p[0])*k,by=(b[1]-p[1])*m;
  const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/len)):0;
  return Math.hypot(ax+t*dx,ay+t*dy);
}

/** THE BORDER TWO AREAS SHARE: the stretches of `a`'s outline whose every position lies within `toleranceM` of `b`'s
 *  outline, joined in the order `a` draws them. Two countries' outlines, simplified apart, rarely share a vertex, so the
 *  tolerance is what makes them meet; a stretch of a single position is not a line and is left out. `b`'s segments are
 *  held in a grid of cells about the tolerance wide, so each position is measured against the segments near it only. */
export function sharedBorder(a:Boundary,b:Boundary,toleranceM:number):Position[][]{
  if(!(toleranceM>0))throw new Error('The distance within which two outlines count as one border must be more than 0 m.');
  const cell=Math.max(toleranceM/111_000,1e-4),grid=new Map<string,[Position,Position][]>(),wide:[Position,Position][]=[];
  const key=(x:number,y:number)=>`${Math.floor(x/cell)},${Math.floor(y/cell)}`;
  for(const ring of rings(b))for(let i=1;i<ring.length;i++){
    const s=ring[i-1]!,e=ring[i]!,pad=cell;
    const x0=Math.floor((Math.min(s[0],e[0])-pad)/cell),x1=Math.floor((Math.max(s[0],e[0])+pad)/cell);
    const y0=Math.floor((Math.min(s[1],e[1])-pad)/cell),y1=Math.floor((Math.max(s[1],e[1])+pad)/cell);
    // A segment spanning more than 10,000 cells is measured against every position rather than filed in each cell.
    if((x1-x0+1)*(y1-y0+1)>10_000){wide.push([s,e]);continue;}
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const k=`${x},${y}`;(grid.get(k)??grid.set(k,[]).get(k)!).push([s,e]);}
  }
  const near=(p:Position)=>{
    for(const [s,e] of [...(grid.get(key(p[0],p[1]))??[]),...wide])if(toSegment(p,s,e)<=toleranceM)return true;
    return false;};
  const out:Position[][]=[];
  for(const ring of rings(a)){
    const closed=ring.length>1&&ring[0]![0]===ring.at(-1)![0]&&ring[0]![1]===ring.at(-1)![1];
    const pts=closed?ring.slice(0,-1):ring,on=pts.map(near);
    if(on.every(Boolean)){out.push([...pts,pts[0]!]);continue;}
    // Start after a position that is off the border, so a stretch crossing the ring's start is one line.
    const start=closed?on.findIndex(x=>!x):0,n=pts.length;let run:Position[]=[];
    for(let k=0;k<n;k++){const i=(start+k)%n;
      if(on[i])run.push(pts[i]!);else{if(run.length>=2)out.push(run);run=[];}}
    if(run.length>=2)out.push(run);
  }
  return out;
}

/** What was read, in one sentence, with what was not. */
export function lineSentence(layer:LineLayer):string{
  const n=layer.features.length,km=layer.features.reduce((t,f)=>t+lengthKm(f),0);
  const left=layer.notLines,said=[left?.points?`${left.points} ${left.points===1?'point':'points'}`:'',left?.areas?`${left.areas} ${left.areas===1?'area':'areas'}`:''].filter(Boolean);
  return `${n} ${n===1?'line':'lines'}, ${km<10?km.toFixed(2):Math.round(km).toLocaleString('en')} km in all, from ${layer.source}.`
    +(said.length?` ${said.join(' and ')} ${said.length===1&&(left!.points+left!.areas)===1?'is':'are'} not lines and ${said.length===1&&(left!.points+left!.areas)===1?'was':'were'} not imported.`:'');
}
