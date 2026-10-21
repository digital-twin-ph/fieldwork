import type {PointCollection,PointFeature,Scalar,Position,Boundary} from './types.js';
import {pointRelation} from './spatial-predicates.js';

/** Turning source records into a point layer, for every shape the health-facility sources use.
 *
 *  Three shapes carry the same thing. Overpass returns elements with `tags` and either `lat`/`lon`
 *  or a `center`; an ordinary GeoJSON FeatureCollection carries `properties` and `geometry`; the
 *  healthsites API returns `attributes` and a `centroid`. One parser reads all three, because they
 *  differ in spelling rather than in content, and two parsers would be two places for the same
 *  decisions about what to drop to drift apart.
 *
 *  Records are dropped, and counted by reason, when they carry no coordinates, no name, or a kind
 *  that was not asked for. A facility with no location is not a facility this can place, and
 *  keeping it would overstate coverage. Nothing is invented: no centroid is guessed and no kind
 *  inferred from a name. */

export interface FacilityDropCounts {kind:number; coordinates:number; name:number;
  /** Records the source returned that fall OUTSIDE the study area's own outline. Counted rather
   *  than silently kept: the widget says it finds facilities inside the study area, and a
   *  practitioner is owed the number it had to set aside to make that true. */
  outside:number}
export interface ParsedFacilities {collection:PointCollection; kept:number; dropped:FacilityDropCounts}

/** Which field states the kind, in precedence order.
 *
 *  `kind` comes first and is this application's own vocabulary, not a source tag: a source whose
 *  categories are not OpenStreetMap's — Overture, for one — maps them to a facility kind in its own
 *  adapter, where the mapping can be stated and audited, and hands the resolved kind over. Letting
 *  this parser re-derive the kind from OSM tags that such a record never had is how every Overture
 *  place came to be dropped as "of another kind" the first time this ran.
 *
 *  `healthcare` is the specific OSM tag and `amenity` the older general one; an OSM record may
 *  carry either or both. */
const KIND_TAGS=['kind','healthcare','amenity'] as const;
/** Carried through when present, because each changes how a facility should be read. Everything
 *  else in the source is left behind rather than copied blindly into attributes. */
const CARRIED:Record<string,string>={'healthcare:speciality':'speciality','operator:type':'operator',
  'addr:city':'city','addr:full':'address','capacity:persons':'beds','source':'tagSource','completeness':'completeness',
  // Already in this application's names, from an adapter that resolved them: a per-place quality
  // score and the source's own category, kept so a declared mapping can be checked rather than
  // trusted.
  'confidence':'confidence','sourceCategory':'sourceCategory'};

function tagsOf(record:Record<string,unknown>):Record<string,unknown>{
  for(const key of ['tags','properties','attributes'] as const){
    const value=record[key];
    if(value&&typeof value==='object')return value as Record<string,unknown>;
  }
  return {};
}

function coordinatesOf(record:Record<string,unknown>):[number,number]|null {
  // Overpass gives lat/lon on a node and a center on a way or relation; GeoJSON and the
  // healthsites API both give a geometry object. A pair is used only if both numbers are finite.
  const pair=(longitude:unknown,latitude:unknown):[number,number]|null=>{
    const x=Number(longitude),y=Number(latitude);
    return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:null;
  };
  if(record.lon!==undefined||record.lat!==undefined)return pair(record.lon,record.lat);
  const centre=record.center as {lat?:unknown;lon?:unknown}|undefined;
  if(centre&&(centre.lat!==undefined||centre.lon!==undefined))return pair(centre.lon,centre.lat);
  const geometry=(record.geometry??record.centroid) as {coordinates?:unknown}|undefined;
  const coordinates=geometry&&Array.isArray(geometry.coordinates)?geometry.coordinates:null;
  return coordinates&&coordinates.length>=2?pair(coordinates[0],coordinates[1]):null;
}

/** Overpass names the element kind in `type`; the HOT export spells the same thing `osm_type`,
 *  and pluralises it. GeoJSON also uses `type`, for the string 'Feature', so the kinds are named
 *  here rather than inferred from the field being present. */
const OSM_ELEMENT_KINDS=['node','way','relation'] as const;

function identityOf(record:Record<string,unknown>,tags:Record<string,unknown>,ordinal:number):string {
  // OSM identity is kept where the source states it, so the same facility carries the same
  // identifier whichever source it arrived from. A positional identifier is a last resort and
  // says so, because it is not stable across downloads.
  const declared=String(record.osm_type??tags.osm_type??record.type??'').replace(/s$/,'');
  const type=(OSM_ELEMENT_KINDS as readonly string[]).includes(declared)?declared:'';
  const id=record.osm_id??tags.osm_id??record.id;
  // Joined with a hyphen, not the slash OpenStreetMap writes. A feature identifier must match the
  // application's own rule — letters, digits, hyphen and underscore — or the layer cannot be moved
  // into an Input data node, saved and reopened. Building the Manila example found this: the
  // facilities widget stores to its own parameters and never met the shared point validator, so a
  // slash passed everywhere until the same points were put somewhere else.
  const clean=(value:unknown)=>String(value).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80);
  if(type&&id!==undefined&&id!==null)return `${type}-${clean(id)}`;
  if(id!==undefined&&id!==null&&String(id).trim())return clean(id);
  return `record-${ordinal}`;
}

export interface ParseOptions {
  /** Kinds to keep. Empty keeps every kind. */
  kinds:readonly string[];
  /** Drop records with no name. A facility nobody can name is still a facility, so this is a
   *  choice the caller states rather than one made here. */
  requireName?:boolean;
  /** Keep only records inside this bounding box, as [west, south, east, north]. A whole-country
   *  export needs clipping to the study area; a bounded query does not. */
  within?:readonly number[];
  /** Keep only records inside this OUTLINE, decided by `pointRelation`. Every source this application has is bounded by a
   *  BOX -- Overpass takes one, Overture is read by extent, the country export is clipped to one
   *  -- and a box is not a jurisdiction. The practitioner, 2026-10-20, on North Kivu: *"I also
   *  noticed that the health facilities retrieved despite the study area boundary many were
   *  outside the boundary."* They were: 526 of 961, in Uganda and Rwanda, because the province is
   *  long and curved and its bounding box covers both. The widget's own words are "facilities
   *  inside the study area", so the outline decides. */
  boundary?:{type:string;coordinates:unknown};
}

export function parseFacilityRecords(records:readonly unknown[],options:ParseOptions):ParsedFacilities {
  const wanted=new Set(options.kinds);
  const requireName=options.requireName!==false;
  const box=options.within&&options.within.length===4&&options.within.every(Number.isFinite)
    ?options.within as readonly [number,number,number,number]:null;
  const dropped:FacilityDropCounts={kind:0,coordinates:0,name:0,outside:0};
  const features:PointFeature[]=[];
  for(const entry of records){
    if(!entry||typeof entry!=='object')continue;
    const record=entry as Record<string,unknown>;
    const tags=tagsOf(record);
    let kind='';
    for(const tag of KIND_TAGS){const value=tags[tag];if(typeof value==='string'&&value.trim()){kind=value.trim();break;}}
    if(wanted.size&&!wanted.has(kind)){dropped.kind++;continue;}
    const coordinates=coordinatesOf(record);
    if(!coordinates){dropped.coordinates++;continue;}
    if(box&&(coordinates[0]<box[0]||coordinates[0]>box[2]||coordinates[1]<box[1]||coordinates[1]>box[3])){dropped.coordinates++;continue;}
    // The outline, after the box, through THE PROJECT'S OWN PREDICATE.
    //
    // A first version hand-rolled ray casting here, which was a sixth implementation of something
    // this repository already decided once -- the practitioner: *"We do not have a point in
    // polygon process."* It has one: `pointRelation` in spatial-predicates.ts, used by
    // catchments, the map, input data, the raster mask and the coverage check, and mapped to the
    // OGC predicates GeoSPARQL exposes. Writing a sixth also threw away the distinction that
    // module exists to make: a point exactly ON the border is `Boundary`, not inside or outside,
    // and hand-rolled ray casting decides it arbitrarily.
    //
    // A facility on the border IS in the jurisdiction's edge, so Boundary is kept and only
    // Outside is set aside.
    if(options.boundary&&pointRelation(coordinates as Position,options.boundary as Boundary)==='Outside'){
      dropped.outside++;continue;}
    const name=typeof tags.name==='string'?tags.name.trim():'';
    if(!name&&requireName){dropped.name++;continue;}
    const properties:Record<string,Scalar>&{name:string}={name:name||'(unnamed)',kind};
    for(const [tag,attribute] of Object.entries(CARRIED)){
      const value=tags[tag];
      if(typeof value==='string'&&value.trim())properties[attribute]=value.trim();
      else if(typeof value==='number'&&Number.isFinite(value))properties[attribute]=value;
    }
    features.push({type:'Feature',id:identityOf(record,tags,features.length+1),properties,
      geometry:{type:'Point',coordinates}});
  }
  return {collection:{type:'FeatureCollection',features},kept:features.length,dropped};
}

/** The records inside a payload, for a source that wraps them and one that does not. */
export function facilityRecordsIn(payload:unknown):readonly unknown[] {
  if(Array.isArray(payload))return payload;
  if(payload&&typeof payload==='object'){
    for(const key of ['elements','features'] as const){
      const value=(payload as Record<string,unknown>)[key];
      if(Array.isArray(value))return value;
    }
  }
  return [];
}
