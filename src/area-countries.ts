/** THE COUNTRIES OF A STUDY AREA (experiment 204). The practitioner, 2026-11-10: *"We discussed the cross border study
 *  area. In this case we need to be able to either (1) detect the countries based on geometry overlaps or (2) named
 *  explicitly."*
 *
 *  A study area holds a LIST of countries. Named: chosen by the person, or stated by the boundary it was acquired as.
 *  Detected: PROPOSED here and never applied -- Natural Earth's 1:110m outlines suggest candidates, the national
 *  outline each country publishes through geoBoundaries measures the share, and the person confirms. */
import {area as turfArea} from '@turf/area';
import {buffer as turfBuffer} from '@turf/buffer';
import * as polygonClipping from 'polyclip-ts';
import asset from '../assets/natural-earth-110m-countries.json';
import {browserFetchableUrl,countryOfArea} from './boundary-source.js';

type Ring=[number,number][];
type Rings=Ring[][];
interface CountryOutline {iso:string; name:string; polygons:Rings}
interface CountriesAsset {version:string; licence:string; notForFraming:string; countries:CountryOutline[]}
export const NATURAL_EARTH_COUNTRIES=asset as unknown as CountriesAsset;
export const CANDIDATE_MARGIN_KM=10;

const ISO3=/^[A-Z]{3}$/;

/** Every country the study area states, in the order stated. A workflow saved with one `country` reads as a list of
 *  one; an area acquired as administrative units states its boundary's own. */
export function countriesOfArea(params?:{countries?:unknown;country?:string;boundary?:{boundaryID?:string;provenance?:{boundaryID?:string}}}|null):string[]{
  if(Array.isArray(params?.countries)){
    const listed=params!.countries.filter((c):c is string=>typeof c==='string'&&ISO3.test(c));
    if(listed.length)return [...new Set(listed)];
  }
  const one=countryOfArea(params as {country?:string;boundary?:{boundaryID?:string;provenance?:{boundaryID?:string}}});
  return one?[one]:[];
}

/** A Polygon or MultiPolygon as polyclip's rings. */
function ringsOf(geometry:{type:string;coordinates:unknown}):Rings{
  if(geometry.type==='Polygon')return [geometry.coordinates as Ring[]];
  if(geometry.type==='MultiPolygon')return geometry.coordinates as Rings;
  throw new Error('A study area is a polygon.');
}
const square=(rings:Rings)=>turfArea({type:'MultiPolygon',coordinates:rings});
const boxOf=(rings:Rings)=>{let w=180,s=90,e=-180,n=-90;
  for(const poly of rings)for(const [x,y] of poly[0]!){w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);}
  return [w,s,e,n] as const;};

/** The countries Natural Earth's outlines put within `marginKm` of the area: CANDIDATES, never an answer. The outlines
 *  are generalised to about 10 km, so the area is widened by that much before it is compared, and a candidate holding
 *  none of the area is expected and said by `shareOfArea`. */
export function candidateCountries(geometry:{type:string;coordinates:unknown},marginKm=CANDIDATE_MARGIN_KM):{iso:string;name:string}[]{
  const widened=turfBuffer({type:'Feature',properties:{},geometry} as never,marginKm,{units:'kilometers'});
  if(!widened)return [];
  const area=ringsOf(widened.geometry as {type:string;coordinates:unknown});
  const [w,s,e,n]=boxOf(area);
  return NATURAL_EARTH_COUNTRIES.countries.filter(c=>{
    const [cw,cs,ce,cn]=boxOf(c.polygons);
    if(ce<w||cw>e||cn<s||cs>n)return false;
    return polygonClipping.intersection(area as never,c.polygons as never).length>0;
  }).map(c=>({iso:c.iso,name:c.name}));
}

/** The share of the study area inside one country's national outline, 0 to 1: of the AREA as drawn, not of anyone in it. */
export function shareOfArea(geometry:{type:string;coordinates:unknown},outline:{type:string;coordinates:unknown}):number{
  const area=ringsOf(geometry),whole=square(area);
  if(!(whole>0))return 0;
  const inside=polygonClipping.intersection(area as never,ringsOf(outline) as never) as unknown as Rings;
  return inside.length?Math.min(1,square(inside)/whole):0;
}

/** The national outline's file from geoBoundaries' ADM0 record: the simplified one where published, which is ample for a
 *  share and a tenth of the size. */
export function nationalOutlineUrl(payload:unknown):string|null{
  const record=(Array.isArray(payload)?payload[0]:payload) as Record<string,unknown>|undefined;
  if(!record||typeof record!=='object')return null;
  const url=[record.simplifiedGeometryGeoJSON,record.gjDownloadURL].find(u=>typeof u==='string'&&u.startsWith('https://'));
  return typeof url==='string'?browserFetchableUrl(url):null;
}

/** The outline's geometry from a geoBoundaries ADM0 file: its features' polygons, together. */
export function outlineOf(geojson:unknown):{type:'MultiPolygon';coordinates:Rings}|null{
  const features=(geojson as {features?:{geometry?:{type:string;coordinates:unknown}}[]})?.features;
  if(!Array.isArray(features))return null;
  const rings:Rings=[];
  for(const f of features)if(f.geometry&&(f.geometry.type==='Polygon'||f.geometry.type==='MultiPolygon'))rings.push(...ringsOf(f.geometry));
  return rings.length?{type:'MultiPolygon',coordinates:rings}:null;
}
