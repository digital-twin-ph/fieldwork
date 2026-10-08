/** Import-time projection change: WGS84 UTM easting/northing to CRS84 longitude/latitude.
 *  One datum only. No datum shift, no resampling. See docs/experiments/40-reprojection-primitives.md. */
import type {PointCollection,PointFeature,Position} from './types.js';
import {metric} from './catchments.js';
export const PROJ4_VERSION='2.19.10';
export const REPROJECT_MAX_RECORDS=2000;
export const ROUND_TRIP_TOLERANCE_M=0.01;
const EASTING=[100_000,900_000] as const,NORTHING=[0,10_000_000] as const;
export interface ReprojectProvenance {
  sourceCRS:string; definition:string; axisOrder:'easting-northing'; units:'metre';
  targetCRS:'OGC:CRS84'; targetAxisOrder:'longitude-latitude'; operation:string;
  library:string; datumShift:'none'; transformed:number; withoutCoordinates:number; maxRoundTripM:number;
}
export interface ReprojectSource {filename:string; bytes:number; sha256:string; format:'csv'|'geojson'; records:number}
export function utmDefinition(zone:number,hemisphere:'north'|'south'){
  if(!Number.isInteger(zone)||zone<1||zone>60||!['north','south'].includes(hemisphere))throw new Error('Choose a UTM zone from 1 to 60 and a hemisphere.');
  return {crs:`EPSG:${hemisphere==='south'?32700+zone:32600+zone}`,definition:`+proj=utm +zone=${zone} ${hemisphere==='south'?'+south ':''}+datum=WGS84 +units=m +no_defs`,centralMeridian:zone*6-183};
}
const round9=(value:number)=>Number(value.toFixed(9));
/** Transforms a collection whose coordinates are easting/northing in the named zone. */
export function reprojectToCRS84(collection:PointCollection,zone:number,hemisphere:'north'|'south'):{collection:PointCollection;provenance:ReprojectProvenance}{
  const {crs,definition}=utmDefinition(zone,hemisphere),m=metric(zone,hemisphere);
  if(!collection?.features||!Array.isArray(collection.features))throw new Error('Supply a point collection to reproject.');
  if(!collection.features.length)throw new Error('The selected file contains no records.');
  if(collection.features.length>REPROJECT_MAX_RECORDS)throw new Error(`Reprojection supports at most ${REPROJECT_MAX_RECORDS.toLocaleString()} records.`);
  let transformed=0,withoutCoordinates=0,maxRoundTripM=0;
  const features:PointFeature[]=collection.features.map((f,i)=>{
    if(!f.geometry){withoutCoordinates++;return {...f,geometry:null};}
    const [easting,northing]=f.geometry.coordinates as Position;
    if(![easting,northing].every(Number.isFinite))throw new Error(`Record ${i+1} has nonnumeric projected coordinates.`);
    if(easting<EASTING[0]||easting>EASTING[1])throw new Error(`Record ${i+1} easting ${easting} is outside the ${EASTING[0].toLocaleString()}–${EASTING[1].toLocaleString()} m UTM range. Check the column mapping and whether these coordinates are already longitude and latitude.`);
    if(northing<NORTHING[0]||northing>NORTHING[1])throw new Error(`Record ${i+1} northing ${northing} is outside the 0–10,000,000 m UTM range.`);
    const geographic=m.inverse([easting,northing]);
    if(!geographic.every(Number.isFinite))throw new Error(`Record ${i+1} could not be converted to longitude and latitude.`);
    // forward() also enforces this zone's ±6° validity guard, so a wrong zone is reported here.
    const back=m.forward(geographic);maxRoundTripM=Math.max(maxRoundTripM,Math.hypot(back[0]-easting,back[1]-northing));
    transformed++;return {...f,geometry:{type:'Point' as const,coordinates:[round9(geographic[0]),round9(geographic[1])]}};
  });
  if(maxRoundTripM>ROUND_TRIP_TOLERANCE_M)throw new Error(`Round-trip check failed: coordinates disagree by up to ${maxRoundTripM.toFixed(3)} m, above the ${ROUND_TRIP_TOLERANCE_M} m tolerance. The declared zone or the source units may be wrong.`);
  return {collection:{type:'FeatureCollection',features},provenance:{sourceCRS:crs,definition,axisOrder:'easting-northing',units:'metre',targetCRS:'OGC:CRS84',targetAxisOrder:'longitude-latitude',operation:'UTM inverse projection to geographic coordinates on the WGS84 datum',library:`proj4 ${PROJ4_VERSION}`,datumShift:'none',transformed,withoutCoordinates,maxRoundTripM:round9(maxRoundTripM)}};
}
/** Reads projected easting/northing from GeoJSON point features without validating them as degrees. */
export function projectedGeoJSONPoints(raw:unknown):PointCollection{
  const source=raw as {type?:string;features?:unknown[]};
  if(source?.type!=='FeatureCollection'||!Array.isArray(source.features))throw new Error('Supply a GeoJSON FeatureCollection of points.');
  return {type:'FeatureCollection',features:source.features.map((item,i)=>{
    const f=item as {id?:unknown;geometry?:{type?:string;coordinates?:unknown[]}|null;properties?:Record<string,unknown>|null};
    const geometry=f.geometry&&f.geometry.type==='Point'&&Array.isArray(f.geometry.coordinates)?{type:'Point' as const,coordinates:[Number(f.geometry.coordinates[0]),Number(f.geometry.coordinates[1])] as Position}:null;
    if(f.geometry&&f.geometry.type!=='Point')throw new Error(`Feature ${i+1} is not a Point. This import accepts projected point features only.`);
    const properties=f.properties&&typeof f.properties==='object'?f.properties:{};
    const name=typeof properties.name==='string'&&properties.name.trim()?properties.name:`Record ${i+1}`;
    return {type:'Feature' as const,id:f.id===undefined||f.id===null?`feature-${i+1}`:String(f.id),properties:{...properties,name} as PointFeature['properties'],geometry};
  })};
}
