/** A POLYGON LAYER OF THE CONNECTED STUDY AREAS' PARTS (the practitioner, 2026-11-21: South Sudan and DR Congo on one map,
 *  then *"Can polygon connect 2 study areas? Thinking here of cross country epidemics like Ebola now"*). Each part of each
 *  study area becomes a feature: named, with its geoBoundaries ID, and with the country and level its area's boundary
 *  states (COD-ADM2-…). One layer across a border, which a table of cases by unit can then be joined to on the IDs. */
import type {AreaValue} from './results.js';
import type {Boundary,Position,Scalar} from './types.js';

export interface AreaPart {id:string;name:string;geometry:Boundary;properties:Record<string,Scalar>}
export interface ConnectedArea {value:AreaValue;boundaryID?:string}

/** `COD-ADM2-1234` as its country and level; undefined where the ID states neither. */
export function boundaryLevel(boundaryID:string|undefined):{country:string;level:string}|undefined{
  const said=boundaryID?.match(/^([A-Z]{3})-(ADM\d)\b/);
  return said?{country:said[1]!,level:said[2]!}:undefined;
}

/** The parts of each area, in order. A study area keeps one name and ID per polygon of its boundary, and a unit drawn as
 *  several polygons (a country's islands) repeats its ID, so the polygons of one ID are one feature. An area with no
 *  named parts is one feature, called what the area is called. */
export function areaParts(areas:readonly ConnectedArea[]):{features:AreaPart[];levels:string[]}{
  const features:AreaPart[]=[],levels:string[]=[],seen=new Set<string>();
  areas.forEach(({value,boundaryID},a)=>{
    const where=boundaryLevel(boundaryID);
    const said=where?`${where.country} ${where.level}`:'level not stated';
    if(!levels.includes(said))levels.push(said);
    const rings:Position[][][]=value.boundary.type==='MultiPolygon'?value.boundary.coordinates:[value.boundary.coordinates];
    const units=value.units?.length===rings.length?value.units:undefined;
    const groups=new Map<string,{name:string;polygons:Position[][][]}>();
    if(units)rings.forEach((polygon,i)=>{const u=units[i]!;const g=groups.get(u.id)??{name:u.name,polygons:[]};g.polygons.push(polygon);groups.set(u.id,g);});
    else groups.set(value.areaId||`area-${a+1}`,{name:value.label,polygons:rings});
    for(const [unitId,{name,polygons}] of groups){
      // IDS UNIQUE ACROSS THE LAYER: geoBoundaries' are; anything else is numbered by its area.
      const id=seen.has(unitId)?`${a+1}:${unitId}`:unitId;seen.add(id);
      features.push({id,name,
        geometry:polygons.length===1?{type:'Polygon',coordinates:polygons[0]!}:{type:'MultiPolygon',coordinates:polygons},
        properties:{name,id:unitId,...(where?{country:where.country,level:where.level}:{}),study_area:value.label}});
    }
  });
  return {features,levels};
}
