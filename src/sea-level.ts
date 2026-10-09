import type {DataTable} from './data-table.js';
import type {PointCollection,Position,Scalar,WorkflowNode} from './types.js';
import type {DisplayRow,Receipt,Status} from './results.js';
import {distanceKm} from './core.js';

/** Sea-level projections, implemented in the host from the declaration-only pack at
 *  widget-pack-sea-level-rise. The vocabulary stays the pack's: this file mints no term and maps to
 *  slr: classes, vendored into ontology/packs/sea-level.ttl at the digest widgets/packs.json pins.
 *  See docs/experiments/58-sea-level-widgets.md for the three contract deviations.
 *
 *  Nothing here models sea level. It selects published values, joins them to points by distance,
 *  and compares two numbers. */
const SLR='https://digital-twin-ph.github.io/widget-pack-sea-level-rise/ns#';
export const PROJECTION_KEYS=['site_id','scenario','workflow','family','year','quantile'] as const;

export interface FamilyValues {withVerticalLandMotion:string; withoutVerticalLandMotion:string}
export interface ExtractProvenance {
  datasetIRI:string; datasetVersion:string; baselinePeriod:string; citations:string[]; familyValues:FamilyValues;
}
export interface ProjectionExtract {
  kind:'projection-extract'; table:DataTable; provenance:ExtractProvenance; siteIds:string[];
}
export interface ProjectionSelection {scenario:string; workflow:string; family:string; year:string; quantile:string}

const text=(value:unknown)=>typeof value==='string'?value.trim():'';

/** An extract is admissible only with the whole key and the obligatory citations: a projected value
 *  without its scenario, workflow, family, year and quantile cannot be interpreted at all. */
export function projectionExtract(table:DataTable,provenance:ExtractProvenance):ProjectionExtract{
  if(table?.kind!=='data-table')throw new Error('Import a long-format projection extract first.');
  const missing=PROJECTION_KEYS.filter(key=>!table.keys.includes(key));
  if(missing.length)throw new Error(`The extract is missing key columns: ${missing.join(', ')}. A projected value without its full key cannot be interpreted.`);
  if(table.unit!=='metre')throw new Error('State the value unit as metre: a projection is a change in relative sea level in metres.');
  if(!text(provenance.datasetIRI))throw new Error('Name the published dataset this extract came from.');
  if(!text(provenance.datasetVersion))throw new Error('State the dataset version: values are not comparable across versions.');
  if(!/\d{4}/.test(text(provenance.baselinePeriod)))throw new Error('State the baseline period the change is measured against; it is read from the dataset documentation and never assumed.');
  const citations=(provenance.citations||[]).map(text).filter(Boolean);
  if(citations.length<3)throw new Error('The licence makes three citations obligatory: the chapter, the FACTS paper and the dataset version.');
  const {withVerticalLandMotion:withVLM,withoutVerticalLandMotion:withoutVLM}=provenance.familyValues;
  if(!text(withVLM)||!text(withoutVLM))throw new Error('State which family value in the file includes vertical land motion and which excludes it; a value is uninterpretable without it.');
  if(text(withVLM)===text(withoutVLM))throw new Error('The two family values must differ.');
  const allowed=new Set([text(withVLM),text(withoutVLM)]);
  for(const row of table.rows)if(!allowed.has(row.key.family))
    throw new Error(`Row family "${row.key.family}" is neither of the declared families. Families that include and exclude vertical land motion are not comparable.`);
  return {kind:'projection-extract',table,provenance:{...provenance,citations},
    siteIds:[...new Set(table.rows.map(row=>row.key.site_id))].sort()};
}

/** The distinct values of each key, so a selection is chosen from what the extract contains. */
/** The value carried on a table port: a data table a Table output can display unchanged, with the
 *  extract's provenance annotated on it rather than replacing it. */
export type ProjectionTable=DataTable&{projection:{provenance:ExtractProvenance;siteIds:string[]}};
export const projectionTable=(extract:ProjectionExtract):ProjectionTable=>
  ({...extract.table,projection:{provenance:extract.provenance,siteIds:extract.siteIds}});
export function readExtract(value:ProjectionTable):ProjectionExtract{
  if(!value?.projection)throw new Error('Connect a Sea-level projection extract, not a plain table: the dataset, baseline and citations must be declared first.');
  const {projection,...table}=value;
  return {kind:'projection-extract',table:table as DataTable,provenance:projection.provenance,siteIds:projection.siteIds};
}

/** Assignments travel as a table of distances, so the join itself can be displayed and checked. */
export type AssignmentTable=DataTable&{assignments:Assignments};
export function assignmentTable(assignments:Assignments):AssignmentTable{
  return {kind:'data-table',keys:['point_id','projection_site'],valueField:'distance_m',unit:'metre',
    rows:assignments.rows.map(row=>({key:{point_id:row.id,projection_site:row.siteId??'none'},value:row.distanceM})),
    rowCount:assignments.rows.length,missingValueCount:assignments.unassigned,assignments};
}

export function selectionDomains(extract:ProjectionExtract):Record<string,string[]>{
  const domains:Record<string,Set<string>>={};
  for(const row of extract.table.rows)for(const key of PROJECTION_KEYS)(domains[key]??=new Set()).add(row.key[key]);
  return Object.fromEntries(Object.entries(domains).map(([key,values])=>[key,[...values].sort()]));
}

export function projectedValue(extract:ProjectionExtract,siteId:string,selection:ProjectionSelection):number|null{
  const row=extract.table.rows.find(r=>r.key.site_id===siteId&&r.key.scenario===selection.scenario
    &&r.key.workflow===selection.workflow&&r.key.family===selection.family
    &&r.key.year===selection.year&&r.key.quantile===selection.quantile);
  return row?row.value:null;
}

export interface AssignmentRow {
  id:string; name:string; coordinates:Position|null; attributes:Record<string,Scalar>;
  siteId:string|null; siteName:string|null; distanceM:number|null; reason?:string;
}
export interface Assignments {kind:'site-assignments'; rows:AssignmentRow[]; extract:ProjectionExtract; assigned:number; unassigned:number; maxDistanceM:number}

/** Nearest published site to each point, with the distance kept as part of the result: a projection
 *  at a site is not a value for an arbitrary point, and the distance is how a reader judges that. */
export function assignSites(points:PointCollection,sites:PointCollection,extract:ProjectionExtract):Assignments{
  const located=sites.features.filter(site=>site.geometry);
  if(!located.length)throw new Error('The projection site layer has no located sites.');
  const known=new Set(extract.siteIds);
  const siteId=(properties:Record<string,Scalar>)=>text(properties.site_id??properties.siteId??properties.id);
  const usable=located.filter(site=>known.has(siteId(site.properties)));
  if(!usable.length)throw new Error('No site in the layer carries a site_id present in the extract. The site list and the extract must come from the same published dataset.');
  const rows=points.features.map((feature):AssignmentRow=>{
    const base={id:String(feature.id),name:feature.properties.name,attributes:{...feature.properties} as Record<string,Scalar>};
    if(!feature.geometry)return {...base,coordinates:null,siteId:null,siteName:null,distanceM:null,reason:'No coordinates, so no site can be assigned.'};
    const coordinates=feature.geometry.coordinates as Position;
    let best=usable[0],bestKm=distanceKm(coordinates,usable[0].geometry!.coordinates as Position);
    for(const site of usable.slice(1)){
      const km=distanceKm(coordinates,site.geometry!.coordinates as Position);
      if(km<bestKm){best=site;bestKm=km;}
    }
    return {...base,coordinates,siteId:siteId(best.properties),siteName:text(best.properties.name)||siteId(best.properties),
      distanceM:Math.round(bestKm*1000)};
  });
  const assigned=rows.filter(row=>row.siteId);
  return {kind:'site-assignments',rows,extract,assigned:assigned.length,unassigned:rows.length-assigned.length,
    maxDistanceM:assigned.reduce((max,row)=>Math.max(max,row.distanceM??0),0)};
}

export interface ComparisonOptions {selection:ProjectionSelection; elevationField:string; verticalDatum:string}
export interface Comparison {kind:undefined|'spatial-map'; rows:DisplayRow[]; centers:never[]; method:string;
  selection:ProjectionSelection; verticalDatum:string; elevationField:string; exceeded:number; below:number; unknown:number}

/** A comparison of two numbers. It accounts for no hydrodynamics, defences, drainage or waves, and
 *  equality is stated rather than assumed: a projected change equal to the elevation counts as
 *  reaching it. */
export function compareToElevation(assignments:Assignments,options:ComparisonOptions):Comparison{
  const {selection,elevationField,verticalDatum}=options;
  if(!text(verticalDatum))throw new Error('State the vertical datum of the supplied elevations. A comparison against an unstated datum is not interpretable.');
  if(!text(elevationField))throw new Error('Name the point attribute holding the supplied elevation. This widget derives no elevation and reads no terrain model.');
  for(const key of ['scenario','workflow','family','year','quantile'] as const)
    if(!text(selection[key]))throw new Error(`Choose one ${key}: a projected value without its full key cannot be compared.`);
  const rows=assignments.rows.map((row):DisplayRow=>{
    const level=row.siteId?projectedValue(assignments.extract,row.siteId,selection):null;
    const raw=row.attributes[elevationField];
    const elevation=typeof raw==='number'?raw:raw===''||raw===null||raw===undefined?null:Number(raw);
    const elevationKnown=elevation!==null&&Number.isFinite(elevation);
    const status:Status=level===null||!elevationKnown?'Unknown':level>=elevation!?'Review':'NoFlag';
    const explanation=level===null
      ?row.siteId?`No value for ${selection.scenario} ${selection.year} at site ${row.siteId}.`:row.reason||'No assigned site.'
      :!elevationKnown?`No numeric "${elevationField}" for this record, so no comparison was made.`
      :`Projected change ${level.toFixed(3)} m ${level>=elevation!?'reaches or exceeds':'stays below'} the supplied elevation ${elevation!.toFixed(3)} m on ${verticalDatum}. Margin ${(elevation!-level).toFixed(3)} m. A comparison of two numbers, not an inundation estimate.`;
    return {id:row.id,name:row.name,coordinates:row.coordinates,status,explanation,
      attributes:{...row.attributes,projection_site:row.siteId??'none',site_distance_m:row.distanceM??'unknown',
        projected_change_m:level??'unknown',supplied_elevation_m:elevationKnown?elevation!:'unknown',
        vertical_datum:verticalDatum},
      distanceKm:row.distanceM===null?null:row.distanceM/1000,center:null};
  });
  return {kind:undefined,rows,centers:[],selection,verticalDatum,elevationField,
    method:`Projected relative sea-level change compared with a supplied elevation on ${verticalDatum}. Equality counts as reaching the elevation. No hydrodynamics, defences, drainage or wave action are represented.`,
    exceeded:rows.filter(r=>r.status==='Review').length,below:rows.filter(r=>r.status==='NoFlag').length,
    unknown:rows.filter(r=>r.status==='Unknown').length};
}

const quote=(value:string)=>JSON.stringify(value);
const prefixes=`@prefix slr: <${SLR}>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`;

export function extractReceipt(node:{id:string},extract:ProjectionExtract,runId:string):Receipt{
  const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const facts=prefixes
    +`${entity} a slr:ProjectionExtract, prov:Entity; slr:sourceDataset <${extract.provenance.datasetIRI}>; `
    +`slr:baselinePeriod ${quote(extract.provenance.baselinePeriod)}; dcterms:hasVersion ${quote(extract.provenance.datasetVersion)}; `
    +extract.provenance.citations.map(citation=>`dcterms:bibliographicCitation ${quote(citation)}`).join('; ')
    +`; slr:projectionSiteCount "${extract.siteIds.length}"^^xsd:integer.\n`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:'Imported a bounded extract of published projections. Imports; does not acquire, and produces no projection.'};
}

export function assignmentReceipt(node:{id:string},assignments:Assignments,runId:string,sources:{points:string;sites:string;projections:string}):Receipt{
  const base=`urn:fieldwork:run:${runId}:`,activity=`<${base}output:${node.id}:activity>`;
  let facts=prefixes+`${activity} a prov:Activity; prov:used <${base}output:${sources.points}>, <${base}output:${sources.sites}>, <${base}output:${sources.projections}>.\n`;
  for(const row of assignments.rows.filter(r=>r.siteId)){
    const site=`<${base}output:${node.id}:site:${encodeURIComponent(row.siteId!)}>`;
    const assignment=`<${base}output:${node.id}:assignment:${encodeURIComponent(row.id)}>`;
    facts+=`${site} a slr:ProjectionSite, geo:Feature; dcterms:identifier ${quote(row.siteId!)}; dcterms:title ${quote(row.siteName||row.siteId!)}.\n`
      +`${assignment} a slr:SiteAssignment, prov:Activity; slr:assignedSite ${site}; `
      +`slr:assignmentDistance "${row.distanceM}"^^xsd:decimal; prov:used <${base}output:${sources.points}>, ${site}.\n`;
  }
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:'Nearest published site by straight-line distance. The distance is part of the result: a projection at a site is not a value for an arbitrary point.'};
}

export function comparisonReceipt(node:{id:string},comparison:Comparison,assignments:Assignments,runId:string,source:string):Receipt{
  const base=`urn:fieldwork:run:${runId}:`;
  const family=comparison.selection.family===assignments.extract.provenance.familyValues.withVerticalLandMotion
    ?'WithVerticalLandMotion':'WithoutVerticalLandMotion';
  let facts=prefixes;
  const sites=[...new Set(assignments.rows.filter(r=>r.siteId).map(r=>r.siteId!))];
  for(const siteId of sites){
    const level=projectedValue(assignments.extract,siteId,comparison.selection);
    if(level===null)continue;
    const site=`<${base}output:${source}:site:${encodeURIComponent(siteId)}>`;
    facts+=`<${base}output:${node.id}:value:${encodeURIComponent(siteId)}> a slr:ProjectionValue, qudt:QuantityValue; `
      +`qudt:numericValue "${level}"^^xsd:decimal; qudt:unit <http://qudt.org/vocab/unit/M>; `
      +`slr:scenario ${quote(comparison.selection.scenario)}; slr:workflow ${quote(comparison.selection.workflow)}; `
      +`slr:datasetFamily slr:${family}; slr:targetYear "${comparison.selection.year}"^^xsd:gYear; `
      +`slr:quantile "${comparison.selection.quantile}"^^xsd:decimal; slr:projectionSite ${site}.\n`;
  }
  for(const row of comparison.rows){
    const elevation=row.attributes?.supplied_elevation_m;
    if(typeof elevation!=='number')continue;
    const siteId=String(row.attributes?.projection_site??'');
    facts+=`<${base}output:${node.id}:comparison:${encodeURIComponent(row.id)}> a slr:ThresholdComparison, prov:Activity; `
      +`slr:suppliedElevation "${elevation}"^^xsd:decimal; slr:elevationDatum ${quote(comparison.verticalDatum)}; `
      +`prov:used <${base}output:${node.id}:value:${encodeURIComponent(siteId)}>, <${base}output:${source}:assignment:${encodeURIComponent(row.id)}>.\n`;
  }
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:comparison.method};
}

export function validateSeaLevelNode(node:WorkflowNode):void{
  if(node.type==='slr_extract_import'){
    const p=node.params;
    if(!text(p.datasetIRI))throw new Error('Name the published dataset for Sea-level projection extract.');
    if(!text(p.datasetVersion))throw new Error('State the dataset version for Sea-level projection extract.');
    if(!/\d{4}/.test(text(p.baselinePeriod)))throw new Error('State the baseline period for Sea-level projection extract.');
    if((p.citations||[]).filter(c=>text(c)).length<3)throw new Error('Sea-level projection extract needs three citations: the chapter, the FACTS paper and the dataset version.');
    if(!text(p.familyValues?.withVerticalLandMotion)||!text(p.familyValues?.withoutVerticalLandMotion))
      throw new Error('State which family value includes vertical land motion and which excludes it.');
  }
  if(node.type==='slr_threshold_comparison'){
    const p=node.params;
    if(!text(p.verticalDatum))throw new Error('State the vertical datum for Compare level to elevation.');
    if(!text(p.elevationField))throw new Error('Name the elevation attribute for Compare level to elevation.');
  }
}
