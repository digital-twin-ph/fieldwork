import {normaliseName} from './deduplicate-points.js';
import type {DataTable} from './data-table.js';
import type {Boundary,Scalar} from './types.js';
import type {WorkflowNode} from './types.js';
import type {Receipt} from './results.js';
import type {Polygons} from './catchments.js';

/** Joining a table to the parts of a study area, on a key that is a name.
 *
 *  The gap this closes, recorded in the catalog entry for Snow's South London since it was
 *  published: *"Nothing joins a table to the parts of a study area, so the 32 mortality rates and
 *  the 32 named boundaries cannot colour one another."* That join is the choropleth, and the
 *  dot-density map and any chart of a measure wait behind it too.
 *
 *  **Not a new matching algorithm.** `normaliseName` already exists, for deciding that two
 *  facility records are one place, and the question here is the same question: are these two
 *  names the same subject? Measured on South London, 2026-10-25: **23 of 32** sub-districts match
 *  on the raw strings, and **32 of 32** after normalisation, because the table writes
 *  `St. George, Camberwell` where the boundaries write `St. George  Camberwell`. A join on raw
 *  keys would silently mishandle 28% of the rows.
 *
 *  **The normalisation is declared, not hidden.** `fuzzy` folds every run of non-alphanumerics to
 *  one space; `exact` only trims and lowercases. A reader of the receipt can see which was used
 *  and disagree with it.
 *
 *  **It is a keyed join and not a linkage.** Every comparison here is equality after
 *  normalisation. There is no similarity, no threshold and no review band — if two names differ
 *  by more than punctuation this says so rather than guessing, and the practitioner fixes the
 *  data or declares a synonym. The graded machinery exists next door in `deduplicate_points` and
 *  is not reached for until an example needs it. */

/** The ways a keyed join fails, as a closed set. Borrowed in shape from the record-linkage
 *  contracts this project already took `deduplicate_points`'s blocking and banding from: a join
 *  that reports only "matched N of M" tells a practitioner nothing they can act on, and each of
 *  these names a different thing to go and fix. */
export type AreaJoinCode=
  |'missing-data-key'       // a row whose key column is empty
  |'unmatched-data-key'     // a row naming a part the boundary does not have
  |'unmatched-boundary'     // a part no row names
  |'duplicate-boundary-key' // two parts of the boundary share one name
  |'ambiguous-data-key'     // two different raw keys normalise to the same key
  |'multiple-data-rows';    // the same key appears in more than one row

export interface AreaJoinDiagnostic {code:AreaJoinCode; subject:string; says:string}

/** One part of the study area, and the value the join put on it. `value` is null where nothing
 *  matched: a part is still drawn, because a boundary with no data is a fact about the data and
 *  not a reason to leave a hole in the map. */
export interface JoinedPart {
  index:number; id:string; name:string; key:string;
  value:number|null; matched:boolean;
  /** True when another part of the boundary carries the same name and therefore the same value. */
  shared:boolean;
}

export interface AreaJoinResult {
  parts:JoinedPart[];
  diagnostics:AreaJoinDiagnostic[];
  counts:{parts:number; rows:number; matchedParts:number; matchedRows:number;
    unmatchedParts:number; unmatchedRows:number; sharedParts:number};
  /** What the join was told to do, carried so the receipt can state it. */
  declared:{keyField:string; valueField:string; normalisation:'exact'|'fuzzy'};
}

export function joinTableToAreas(
  units:{id:string;name:string}[], table:DataTable,
  options:{keyField:string; normalisation?:'exact'|'fuzzy'}
):AreaJoinResult{
  const normalisation=options.normalisation??'fuzzy';
  const keyField=options.keyField;
  if(!table.keys.includes(keyField))
    throw new Error(`The table has no column "${keyField}". It is keyed by ${table.keys.join(', ')||'nothing'}.`);
  const fold=(value:unknown)=>normaliseName(value,normalisation);
  const diagnostics:AreaJoinDiagnostic[]=[];

  // THE TABLE SIDE, folded once. Two different raw keys landing on one folded key is the hazard
  // the normalisation itself creates, so it is checked before anything is matched rather than
  // discovered as a silently overwritten row.
  const byKey=new Map<string,{raw:string;value:number|null;rows:number}>();
  for(const row of table.rows){
    const raw=row.key[keyField];
    const key=fold(raw);
    if(!key){diagnostics.push({code:'missing-data-key',subject:String(raw??''),
      says:'A row has no value in the key column, so there is nothing to match it on.'});continue;}
    const held=byKey.get(key);
    if(!held){byKey.set(key,{raw:String(raw),value:row.value,rows:1});continue;}
    held.rows++;
    if(fold(held.raw)===key&&held.raw!==String(raw))
      diagnostics.push({code:'ambiguous-data-key',subject:`${held.raw} / ${raw}`,
        says:`Two rows differ only in punctuation or spacing and normalise to "${key}", so the join cannot tell which one the boundary means.`});
    else diagnostics.push({code:'multiple-data-rows',subject:String(raw),
      says:`"${raw}" appears in more than one row, and a part of the boundary can carry one value.`});
  }

  // THE BOUNDARY SIDE. A name held by two parts is reported and both parts are given the value:
  // Streatham is two polygons in Snow's South London -- the parish and its detached part -- and a
  // rate is an intensity that is true of both. It would NOT be true of a count, which is why this
  // is reported rather than passed over.
  const timesSeen=new Map<string,number>();
  for(const unit of units){const key=fold(unit.name);if(key)timesSeen.set(key,(timesSeen.get(key)||0)+1);}
  for(const [key,count] of timesSeen)
    if(count>1)diagnostics.push({code:'duplicate-boundary-key',subject:key,
      says:`${count} parts of the boundary are named "${key}". Each is given the same value, which is true of a rate and is not true of a count.`});

  const used=new Set<string>();
  const parts:JoinedPart[]=units.map((unit,index)=>{
    const key=fold(unit.name);
    const row=key?byKey.get(key):undefined;
    if(row)used.add(key);
    else diagnostics.push({code:'unmatched-boundary',subject:unit.name,
      says:`No row of the table names "${unit.name}", so this part has no value.`});
    return {index,id:unit.id,name:unit.name,key,
      value:row?row.value:null,matched:!!row,shared:(timesSeen.get(key)||0)>1};
  });

  for(const [key,row] of byKey)
    if(!used.has(key))diagnostics.push({code:'unmatched-data-key',subject:row.raw,
      says:`The table names "${row.raw}", which is not a part of this boundary.`});

  const matchedParts=parts.filter(part=>part.matched).length;
  return {parts,diagnostics,declared:{keyField,valueField:table.valueField,normalisation},
    counts:{parts:parts.length,rows:table.rows.length,matchedParts,
      matchedRows:used.size,unmatchedParts:parts.length-matchedParts,
      unmatchedRows:byKey.size-used.size,
      sharedParts:parts.filter(part=>part.shared).length}};
}

/** The joined area as polygons a map can draw: one feature per part, carrying its value.
 *
 *  `polygons` rather than an area, because a map already knows how to draw polygons and a value
 *  per feature is what a choropleth is. The parts are not dissolved — a boundary of 33 rings
 *  stays 33 features, and the two that are Streatham each carry the rate, which is the whole
 *  reason the duplicate is reported rather than merged.
 *
 *  A part with no value is still drawn. `properties` carries the joined value under the table's
 *  own field name, and `value` repeats it in a fixed place so a renderer can colour by it
 *  without being told which column to look at. */
export function joinedPolygons(boundary:Boundary,result:AreaJoinResult,label:string):Polygons{
  const rings=boundary.type==='MultiPolygon'?boundary.coordinates:[boundary.coordinates];
  const features=result.parts.map((part,index)=>({
    id:part.id,name:part.name,siteId:part.id,
    geometry:{type:'Polygon' as const,coordinates:rings[index]??rings[0]},
    ...(part.value===null?{}:{value:part.value}),
    properties:{[result.declared.valueField]:part.value,
      [result.declared.keyField]:part.name} as Record<string,Scalar>,
  }));
  const {counts}=result;
  return {features:features as unknown as Polygons['features'],sites:[],boundary:structuredClone(boundary),
    method:`Keyed join on ${result.declared.keyField}, ${result.declared.normalisation} normalisation: `
      +`${counts.matchedParts} of ${counts.parts} parts carry a value from ${counts.matchedRows} of ${counts.rows} rows.`,
    crs:'OGC:CRS84',
    notes:[`${label}. A part with no matching row is drawn and left empty rather than omitted.`,
      ...result.diagnostics.map(d=>`${d.code}: ${d.says}`)]};
}

/** What the join did, as facts rather than as a count.
 *
 *  A receipt saying "32 of 32 matched" is a claim a reader cannot check. This asserts the key
 *  column, the normalisation that was applied, and every condition the join met by name — so a
 *  reader can see that nine parts matched only because punctuation was folded, and disagree. */
export function areaJoinReceipt(node:WorkflowNode<'join_table_to_area'>,result:AreaJoinResult,
  runId:string,tableNodeId:string,areaNodeId:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`;
  const quote=(v:unknown)=>JSON.stringify(String(v));
  const {counts,declared}=result;
  let facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`<${activity}> a fw:KeyedAreaJoin, prov:Activity; `
    +`prov:used <urn:fieldwork:run:${runId}:output:${tableNodeId}>, <urn:fieldwork:run:${runId}:output:${areaNodeId}>; `
    +`fw:joinKeyField ${quote(declared.keyField)}; fw:joinValueField ${quote(declared.valueField)}; `
    +`fw:joinNormalisation ${quote(declared.normalisation)}; `
    +`fw:boundaryPartCount ${counts.parts}; fw:tableRowCount ${counts.rows}; `
    +`fw:matchedPartCount ${counts.matchedParts}; fw:matchedRowCount ${counts.matchedRows}; `
    +`fw:unmatchedPartCount ${counts.unmatchedParts}; fw:unmatchedRowCount ${counts.unmatchedRows}; `
    +`fw:sharedPartCount ${counts.sharedParts}.\n`
    +`<${entity}> a fw:PolygonDataset, prov:Entity; prov:wasGeneratedBy <${activity}>.\n`;
  for(const [index,diagnostic] of result.diagnostics.entries()){
    const node_=`<${entity}:finding:${index}>`;
    facts+=`${node_} a fw:JoinFinding; fw:findingCode ${quote(diagnostic.code)}; `
      +`fw:findingSubject ${quote(diagnostic.subject)}.\n<${activity}> fw:joinFinding ${node_}.\n`;
  }
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`Keyed join of ${quote(declared.valueField)} onto the named parts of the study area, `
      +`matching ${quote(declared.keyField)} by equality after ${declared.normalisation} normalisation. `
      +`${counts.matchedParts} of ${counts.parts} parts carry a value. `
      +`Equality only: no similarity, no threshold, and no part is matched by resemblance.`};
}
