import type {PointCollection,PointFeature,Position} from './types.js';

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
}
type TableRows={keys:string[]; valueField:string; rows:{key:Record<string,unknown>; value:unknown}[]};
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
  const features=table.rows.map((row,i)=>{
    const lon=read(row,mapping.x),lat=read(row,mapping.y);
    const x=Number(lon),y=Number(lat);
    const reason=!lon||!lat?'a coordinate is empty'
      :!Number.isFinite(x)||!Number.isFinite(y)?`(${lon}, ${lat}) is not a pair of numbers`
      :Math.abs(x)>180||Math.abs(y)>90?`(${lon}, ${lat}) is outside the longitude and latitude range`
      :null;
    if(reason)unplaced.push({row:i+1,reason});
    else{const at=`${x},${y}`;if(seen.has(at))sharedPosition++;else seen.add(at);}
    const id=mapping.id?read(row,mapping.id):'';
    const f=feature(id||`row-${i+1}`,mapping.name?read(row,mapping.name):`Record ${i+1}`,reason?null:[x,y]);
    f.properties={...Object.fromEntries(columns.map(c=>{const v=read(row,c);return [c,v];})),name:f.properties.name};
    return f;
  });
  return {points:{type:'FeatureCollection',features},unplaced,positions:seen.size,sharedPosition};
}

/** The sentence a run states about what it placed. */
export const tablePointsSentence=(r:TablePointsResult,mapping:TableMapping):string=>{
  const placed=r.points.features.length-r.unplaced.length;
  return `${placed.toLocaleString('en-US')} of ${r.points.features.length.toLocaleString('en-US')} rows placed as points, `
    +`x (longitude) from "${mapping.x}" and y (latitude) from "${mapping.y}", read as CRS84.`
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
