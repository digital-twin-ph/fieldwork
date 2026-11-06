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
  /** THE CLASS THIS PART BELONGS TO, where the join was told to carry one.
   *
   *  A second thing a table says about a place, and a different KIND of thing from `value`: a
   *  rate is a quantity a reader ranks, a water company is a category a reader cannot. Carried
   *  separately so a renderer cannot mistake one for the other -- colouring categories along a
   *  lightness ramp is the precise misreading the cartographic work of 2026-10-28 was done to
   *  prevent, and it is only avoidable if the two arrive under different names.
   *
   *  Added 2026-10-30 for Snow's exposure map: which company supplied each sub-district, which
   *  is the variable his natural experiment turns on and which no map could draw. */
  category?:string;
  /** True when another part of the boundary carries the same name and therefore the same value. */
  shared:boolean;
  /** ONE VALUE PER FRAME, where the join was given a frame column: `dtp1_2005` to `dtp1_2024`.
   *  `value` is then the last frame's, so a consumer reading one value is unchanged. Experiment 168. */
  frames?:Record<string,number|null>;
}

export interface AreaJoinResult {
  parts:JoinedPart[];
  diagnostics:AreaJoinDiagnostic[];
  counts:{parts:number; rows:number; matchedParts:number; matchedRows:number;
    unmatchedParts:number; unmatchedRows:number; sharedParts:number};
  /** What the join was told to do, carried so the receipt can state it. */
  declared:{keyField:string; valueField:string; normalisation:'exact'|'fuzzy';
    categoryField?:string; frameField?:string};
  /** The frames, in the order the table first gives them. */
  frames?:string[];
}

/** A table cell as a class name, or nothing. A number is a legitimate class label -- a year, a
 *  ward number -- so it is accepted and rendered as text rather than refused. */
const text=(value:unknown):string|undefined=>{
  if(value===null||value===undefined)return undefined;
  const said=String(value).trim();
  return said?said:undefined;
};

export function joinTableToAreas(
  units:{id:string;name:string}[], table:DataTable,
  options:{keyField:string; normalisation?:'exact'|'fuzzy'; categoryField?:string; frameField?:string}
):AreaJoinResult{
  const normalisation=options.normalisation??'fuzzy';
  const keyField=options.keyField;
  const categoryField=options.categoryField?.trim()||undefined;
  const frameField=options.frameField?.trim()||undefined;
  if(frameField&&!table.keys.includes(frameField))
    throw new Error(`The table has no column "${frameField}" to take frames from. It is keyed by ${table.keys.join(', ')||'nothing'}.`);
  if(frameField&&frameField===keyField)
    throw new Error('The column a part is matched on cannot also be the frames: each part would have one frame of its own.');
  const frameOrder:string[]=[];
  if(categoryField&&!table.keys.includes(categoryField))
    throw new Error(`The table has no column "${categoryField}" to classify by. It is keyed by ${table.keys.join(', ')||'nothing'}.`);
  if(categoryField&&categoryField===keyField)
    throw new Error('The column a part is matched on cannot also be the column it is classified by: every part would be its own class.');
  if(!table.keys.includes(keyField))
    throw new Error(`The table has no column "${keyField}". It is keyed by ${table.keys.join(', ')||'nothing'}.`);
  const fold=(value:unknown)=>normaliseName(value,normalisation);
  const diagnostics:AreaJoinDiagnostic[]=[];

  // THE TABLE SIDE, folded once. Two different raw keys landing on one folded key is the hazard
  // the normalisation itself creates, so it is checked before anything is matched rather than
  // discovered as a silently overwritten row.
  const byKey=new Map<string,{raw:string;value:number|null;rows:number;category?:string;
    frames?:Record<string,number|null>}>();
  for(const row of table.rows){
    const raw=row.key[keyField];
    const key=fold(raw);
    if(!key){diagnostics.push({code:'missing-data-key',subject:String(raw??''),
      says:'A row has no value in the key column, so there is nothing to match it on.'});continue;}
    // WITH FRAMES, a key repeats once per frame by design; it is a repeat only within a frame.
    if(frameField){
      const frame=text(row.key[frameField]);
      if(!frame)continue;
      if(!frameOrder.includes(frame))frameOrder.push(frame);
      const held=byKey.get(key)??{raw:String(raw),value:null,rows:0,frames:{}};
      if(Object.hasOwn(held.frames!,frame))diagnostics.push({code:'multiple-data-rows',subject:`${raw} / ${frame}`,
        says:`"${raw}" appears in more than one row for ${frame}, and a part carries one value per frame.`});
      else held.frames![frame]=row.value;
      held.rows++;byKey.set(key,held);continue;
    }
    const held=byKey.get(key);
    if(!held){byKey.set(key,{raw:String(raw),value:row.value,rows:1,
      ...(categoryField?{category:text(row.key[categoryField])}:{})});continue;}
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
  //
  // PARTS OF ONE UNIT ARE NOT A REPEAT. Since 0.30.0 a unit keeps every part, each carrying its unit's id: Angra dos
  // Reis is 14 polygons, its islands, and one municipality. Counting parts called all 14 a duplicate name and buried
  // the map under 30 such notices for Rio de Janeiro state (2026-11-06). Distinct units are counted; a part with no
  // id counts as its own unit, as before.
  const unitsNamed=new Map<string,Set<string>>();
  units.forEach((unit,index)=>{const key=fold(unit.name);if(!key)return;
    const seen=unitsNamed.get(key)??new Set<string>();seen.add(unit.id||`part ${index}`);unitsNamed.set(key,seen);});
  for(const [key,ids] of unitsNamed)
    if(ids.size>1)diagnostics.push({code:'duplicate-boundary-key',subject:key,
      says:`${ids.size} parts of the boundary are named "${key}". Each is given the same value, which is true of a rate and is not true of a count.`});

  const used=new Set<string>();
  const parts:JoinedPart[]=units.map((unit,index)=>{
    const key=fold(unit.name);
    const row=key?byKey.get(key):undefined;
    if(row)used.add(key);
    else diagnostics.push({code:'unmatched-boundary',subject:unit.name,
      says:`No row of the table names "${unit.name}", so this part has no value.`});
    const last=frameOrder.at(-1);
    return {index,id:unit.id,name:unit.name,key,
      value:row?(row.frames&&last!==undefined?row.frames[last]??null:row.value):null,
      matched:!!row,shared:(unitsNamed.get(key)?.size||0)>1,
      ...(frameField?{frames:Object.fromEntries(frameOrder.map(f=>[f,row?.frames?.[f]??null]))}:{}),
      // Absent rather than empty where the row names no class: an unclassified part is drawn in
      // the neutral a renderer keeps for "no data", never in the first class.
      ...(row?.category?{category:row.category}:{})};
  });

  for(const [key,row] of byKey)
    if(!used.has(key))diagnostics.push({code:'unmatched-data-key',subject:row.raw,
      says:`The table names "${row.raw}", which is not a part of this boundary.`});

  const matchedParts=parts.filter(part=>part.matched).length;
  return {parts,diagnostics,
    declared:{keyField,valueField:table.valueField,normalisation,
      ...(categoryField?{categoryField}:{}),...(frameField?{frameField}:{})},
    ...(frameField?{frames:frameOrder}:{}),
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
export function joinedPolygons(boundary:Boundary|undefined,result:AreaJoinResult,label:string,
  geometries?:Boundary[],carried?:Record<string,Scalar>[]):Polygons{
  const rings=!boundary?[]:boundary.type==='MultiPolygon'?boundary.coordinates:[boundary.coordinates];
  const features=result.parts.map((part,index)=>({
    id:part.id,name:part.name,siteId:part.id,
    geometry:geometries?.[index]??{type:'Polygon' as const,coordinates:rings[index]??rings[0]},
    ...(part.value===null?{}:{value:part.value}),
    ...(part.category?{category:part.category}:{}),
    ...(part.frames?{frames:part.frames}:{}),
    // WHAT THE POLYGON ALREADY HELD STAYS, so joining a second table adds a column as a merge on a
    // GeoDataFrame does, and one record can carry coverage and zero-dose for a rule to read.
    properties:{...carried?.[index],[result.declared.valueField]:part.value,
      [result.declared.keyField]:part.name,
      ...(result.declared.categoryField&&part.category
        ?{[result.declared.categoryField]:part.category}:{})} as Record<string,Scalar>,
  }));
  const {counts}=result;
  return {features:features as unknown as Polygons['features'],sites:[],
    ...(boundary?{boundary:structuredClone(boundary)}:{}),
    // The node's own label names the layer: it is what the practitioner called this join, and
    // what they will look for when they toggle it beside the study area.
    layerName:label,
    ...(result.frames?{frames:result.frames}:{}),
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
