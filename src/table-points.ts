import type {PointCollection,PointFeature,Position} from './types.js';
import {readCoordinate,coordinateReport,coordinateSentence,type ReadCoordinate,type CoordinateReport} from './coordinates.js';

const feature=(id:string,name:string,coordinates:Position|null):PointFeature=>({type:'Feature',id,properties:{name},geometry:coordinates?{type:'Point',coordinates}:null});
/** POINTS FROM X AND Y IN A TABLE A WORKFLOW COMPUTED, the run-time sibling of `csvPoints` (experiment 178).
 *
 *  `geopandas.points_from_xy(x, y, crs="EPSG:4326")`: x is the longitude and y the latitude, named by column and never
 *  guessed. Degrees only, CRS84. Unlike an import, a run DIAGNOSES rather than refuses: a row whose coordinates are
 *  missing, not numbers, or outside the longitude and latitude range is kept with no geometry and counted, so the
 *  table is never rejected for one bad row. Every column travels as an attribute, spelled as the table spells it. */
export interface TableMapping {x:string; y:string; id?:string; name?:string}
export interface TablePointsResult {
  points:PointCollection;
  /** Rows kept with no geometry, by row number from 1, with why. */
  unplaced:{row:number; reason:string}[];
  /** Distinct positions, and how many placed rows share one with an earlier row. */
  positions:number; sharedPosition:number;
  /** How many values were read as degrees, minutes and seconds, and how many of those stated no hemisphere. */
  coordinates:{x:CoordinateReport;y:CoordinateReport};
}
type TableRows={keys:string[]; valueField:string; rows:{key:Record<string,unknown>; value:unknown}[];
  /** Set where the table was read wide: which key column holds the variable's NAME. See the melt below. */
  wide?:{measureKey?:string}};
export function tablePoints(table:TableRows,mapping:TableMapping):TablePointsResult{
  const columns=[...table.keys,...(table.valueField?[table.valueField]:[])];
  for(const [role,column] of [['x (longitude)',mapping.x],['y (latitude)',mapping.y]] as const)
    if(!column||!columns.includes(column))
      throw new Error(`Choose the column holding ${role}. This table's columns are ${columns.join(', ')}.`);
  if(mapping.x===mapping.y)throw new Error('x (longitude) and y (latitude) must be different columns.');
  for(const [role,column] of [['record ID',mapping.id],['label',mapping.name]] as const)
    if(column&&!columns.includes(column))throw new Error(`This table has no "${column}" column for the ${role}.`);
  const read=(row:TableRows['rows'][number],column:string):string=>{
    const value=column===table.valueField&&!table.keys.includes(column)?row.value:row.key[column];
    return value===null||value===undefined?'':String(value).trim();};
  const unplaced:TablePointsResult['unplaced']=[];
  const seen=new Set<string>();let sharedPosition=0;
  const readX:ReadCoordinate[]=[],readY:ReadCoordinate[]=[];
  const features=table.rows.map((row,i)=>{
    const lon=read(row,mapping.x),lat=read(row,mapping.y);
    // DECIMAL DEGREES, OR DEGREES, MINUTES AND SECONDS converted (2026-11-18): the column keeps its text.
    const rx=readCoordinate(lon,'x'),ry=readCoordinate(lat,'y');readX.push(rx);readY.push(ry);
    const x=rx.value??NaN,y=ry.value??NaN;
    const reason=!lon||!lat?'a coordinate is empty'
      :rx.value===null||ry.value===null?(rx.reason&&rx.value===null?rx.reason:ry.reason)??`(${lon}, ${lat}) is not a pair of coordinates`
      :Math.abs(x)>180||Math.abs(y)>90?`(${lon}, ${lat}) is outside the longitude and latitude range`
      :null;
    if(reason)unplaced.push({row:i+1,reason});
    else{const at=`${x},${y}`;if(seen.has(at))sharedPosition++;else seen.add(at);}
    const id=mapping.id?read(row,mapping.id):'';
    const f=feature(id||`row-${i+1}`,mapping.name?read(row,mapping.name):`Record ${i+1}`,reason?null:[x,y]);
    // THE MELT IS INTERNAL, AND STAYS SO. A table read wide is held long -- one row per subject per variable, the
    // variable's name under a measure key and its value under the value field -- and copying those two columns onto
    // a point put them on the map: a bat record's popup read "measure: Year" and "value: 1952" as though the file
    // had columns called measure and value (reported 2026-11-23, the same misrepresentation docs/audits/
    // melted-counts-audit.md was opened for). The pair is one fact and is carried as one: Year: 1952.
    const measureKey=table.wide?.measureKey;
    const variable=measureKey?String(row.key[measureKey]??'').trim():'';
    const melted=new Set(measureKey&&variable?[measureKey,table.valueField]:[]);
    f.properties={...Object.fromEntries(columns.filter(c=>!melted.has(c)).map(c=>{const v=read(row,c);return [c,v];})),
      ...(variable?{[variable]:read(row,table.valueField)}:{}),
      name:f.properties.name};
    return f;
  });
  return {points:{type:'FeatureCollection',features},unplaced,positions:seen.size,sharedPosition,
    coordinates:{x:coordinateReport(readX),y:coordinateReport(readY)}};
}

/** The sentence a run states about what it placed. */
export const tablePointsSentence=(r:TablePointsResult,mapping:TableMapping):string=>{
  const placed=r.points.features.length-r.unplaced.length;
  return `${placed.toLocaleString('en-US')} of ${r.points.features.length.toLocaleString('en-US')} rows placed as points, `
    +`x (longitude) from "${mapping.x}" and y (latitude) from "${mapping.y}", read as CRS84.`
    +(r.coordinates?coordinateSentence(r.coordinates,mapping.x,mapping.y):'')
    +(r.unplaced.length?` ${r.unplaced.length.toLocaleString('en-US')} not placed: row ${r.unplaced[0].row}, ${r.unplaced[0].reason}`
      +(r.unplaced.length>1?', and others':'')+'.':'')
    +(r.sharedPosition?` ${r.sharedPosition.toLocaleString('en-US')} rows share a position with an earlier row, at `
      +`${r.positions.toLocaleString('en-US')} positions in all; total the table within the columns that name a place first `
      +'if one point per place is meant.':'');
};

/** The receipt's facts: which columns were read as x and y, and what was and was not placed. */
export function tablePointsFacts(entity:string,from:string,mapping:TableMapping,r:TablePointsResult):string{
  const q=(v:string)=>JSON.stringify(v);
  return `@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:PointsFromTable;\n  prov:wasDerivedFrom ${from};\n`
    +`  fw:xAttribute ${q(mapping.x)};\n  fw:yAttribute ${q(mapping.y)};\n`
    +`  fw:placedRecordCount "${r.points.features.length-r.unplaced.length}"^^xsd:integer;\n`
    +`  fw:unplacedRecordCount "${r.unplaced.length}"^^xsd:integer;\n`
    +`  fw:distinctPositionCount "${r.positions}"^^xsd:integer.\n`;
}
