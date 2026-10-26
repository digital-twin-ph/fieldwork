import type {DataTable} from './data-table.js';
import type {PointCollection,Position,Scalar,WorkflowNode} from './types.js';
import type {DeclarationGap,DisplayRow,Receipt,Status} from './results.js';
import {nearestOf} from './nearest-neighbour.js';

/** Sea-level projections, implemented in the host from the declaration-only pack at
 *  widget-pack-sea-level-rise. The vocabulary stays the pack's: this file mints no term and maps to
 *  slr: classes, vendored into ontology/packs/sea-level.ttl at the digest widgets/packs.json pins.
 *  See docs/experiments/58-sea-level-widgets.md for the three contract deviations.
 *
 *  Nothing here models sea level. It selects published values, joins them to points by distance,
 *  and compares two numbers. */
const SLR='https://digital-twin-ph.github.io/widget-pack-sea-level-rise/ns#';
/** The key a projected value needs to be interpretable. `basis` names which published derivation
 *  the value came from and `basisKind` says what that name is — a single workflow, or a
 *  confidence level whose file is a p-box over several. Measured 2026-10-09: the AR6 confidence
 *  output files carry no workflow dimension, so a key assuming one could not describe them. */
export const PROJECTION_KEYS=['site_id','scenario','basis','family','year','quantile'] as const;
export const BASIS_KINDS=['workflow','confidence-pbox'] as const;
export type BasisKind=''|typeof BASIS_KINDS[number];

export interface FamilyValues {withVerticalLandMotion:string; withoutVerticalLandMotion:string}
export interface ExtractProvenance {
  datasetIRI:string; datasetVersion:string; baselinePeriod:string; citations:string[]; familyValues:FamilyValues;
  basisKind:BasisKind;
  /** Where the file came from, in the practitioner's own words, for a source with no IRI. A note
   *  is not a citation and does not satisfy the licence; it is better than nothing, and nothing is
   *  what an IRI field offers somebody who was emailed a CSV. */
  sourceNote?:string;
}
export interface ProjectionExtract {
  kind:'projection-extract'; table:DataTable; provenance:ExtractProvenance; siteIds:string[];
  /** Provenance the practitioner has not declared. Reported, never fatal. */
  gaps?:DeclarationGap[];
}
export interface ProjectionSelection {scenario:string; basis:string; family:string; year:string; quantile:string}

const text=(value:unknown)=>typeof value==='string'?value.trim():'';

/** An extract is admissible only with the whole key and the obligatory citations: a projected value
 *  without its scenario, workflow, family, year and quantile cannot be interpreted at all. */
/** Units a projection extract may state, and the factor that brings each to metres. A
 *  comparison is made in metres because a supplied elevation is; the factor travels into the
 *  receipt so a reader can tell a converted value from an as-published one. */
export const VALUE_UNITS:Record<string,number>={metre:1,millimetre:0.001};
const UNIT_IRIS:Record<string,string>={metre:'http://qudt.org/vocab/unit/M',millimetre:'http://qudt.org/vocab/unit/MilliM'};

export function projectionExtract(table:DataTable,provenance:ExtractProvenance):ProjectionExtract{
  if(table?.kind!=='data-table')throw new Error('Import a long-format projection extract first.');
  const missing=PROJECTION_KEYS.filter(key=>!table.keys.includes(key));
  if(missing.length)throw new Error(`The extract is missing key columns: ${missing.join(', ')}. A projected value without its full key cannot be interpreted.`);
  // AR6 publishes sea_level_change in millimetres: the confidence output files carry
  // units: 'mm'. Measured 2026-10-09 from total_ssp245_medium_confidence_values.nc. Requiring
  // metres here was an assumption nobody had checked, so both are admitted and the conversion
  // to metres is recorded rather than performed silently. Anything else is refused: a unit this
  // widget cannot interpret is not a unit it should guess at.
  if(!Object.hasOwn(VALUE_UNITS,table.unit as string))
    throw new Error(`The extract states its values are in "${table.unit??'an unstated unit'}". `
      +`Sea-level projections are published in millimetres and compared in metres, so state `
      +`${Object.keys(VALUE_UNITS).join(' or ')}.`);
  if(!/\d{4}/.test(text(provenance.baselinePeriod)))throw new Error('State the baseline period the change is measured against; it is read from the dataset documentation and never assumed.');
  // A basis identifier is uninterpretable without the kind of identifier it is: wf_1e is one
  // workflow, "medium" is a p-box over several, and a p-box bound is not a quantile of one
  // distribution. The kind is declared rather than guessed from the identifier's spelling.
  if(!(BASIS_KINDS as readonly string[]).includes(text(provenance.basisKind)))
    throw new Error('Declare what the basis column names: "workflow" for values from one published '
      +'workflow, or "confidence-pbox" for values read from a confidence output file, which is a '
      +'p-box combining workflow p-boxes.');
  const citations=(provenance.citations||[]).map(text).filter(Boolean);
  const {withVerticalLandMotion:withVLM,withoutVerticalLandMotion:withoutVLM}=provenance.familyValues;
  if(!text(withVLM)||!text(withoutVLM))throw new Error('State which family value in the file includes vertical land motion and which excludes it; a value is uninterpretable without it.');
  if(text(withVLM)===text(withoutVLM))throw new Error('The two family values must differ.');
  const allowed=new Set([text(withVLM),text(withoutVLM)]);
  for(const row of table.rows)if(!allowed.has(row.key.family))
    throw new Error(`Row family "${row.key.family}" is neither of the declared families. Families that include and exclude vertical land motion are not comparable.`);
  return {kind:'projection-extract',table,provenance:{...provenance,citations},
    gaps:provenanceGaps({...provenance,citations}),
    siteIds:[...new Set(table.rows.map(row=>row.key.site_id))].sort()};
}

/** Where the data came from, and whether the practitioner has said.
 *
 *  Reported, never fatal, on the practitioner's decision of 2026-10-15: "Provenance is something
 *  we can check if uploaded or not and can be flagged as an alert, not a blocker." Until then a
 *  missing dataset IRI, version or third citation stopped the run -- and no provenance field
 *  changes a single computed number, so refusing to compute was a punishment for an unfilled form.
 *
 *  The split between what is reported here and what still refuses follows one question: does the
 *  field say WHERE THE DATA CAME FROM, or HOW TO INTERPRET THE NUMBERS? The baseline period, the
 *  basis kind, the value unit, the key columns and the declared families are all the second kind
 *  -- a change of +0.5 m means nothing without the baseline it is measured from -- so they stay
 *  fatal and belong to the ruleset contract of P1 in experiment 115. These three are the first
 *  kind. It is a judgement, and the dataset version is the arguable one: it identifies the source,
 *  and values are also not comparable across versions.
 *
 *  The honest consequence of the change: a workflow can now publish a result from an extract whose
 *  source is undeclared. The alert is what makes that visible rather than silent. */
export function provenanceGaps(provenance:ExtractProvenance):DeclarationGap[]{
  const gaps:DeclarationGap[]=[];
  if(!text(provenance.datasetIRI))gaps.push({field:'Published dataset',
    says:'No dataset IRI or DOI is named, so a reader cannot get to the source these numbers came from.'});
  if(!text(provenance.datasetVersion))gaps.push({field:'Dataset version',
    says:'No version is stated. Values are not comparable across dataset versions, so a reader cannot tell whether these agree with another extract.'});
  const cited=(provenance.citations||[]).map(text).filter(Boolean).length;
  if(cited<3)gaps.push({field:'Citations',
    says:`${cited} of the three citations the licence makes obligatory are given: the chapter, the FACTS paper and the dataset version. This is a licence obligation and not a preference.`});
  if(!text(provenance.sourceNote)&&!text(provenance.datasetIRI))gaps.push({field:'Source note',
    says:'Nothing says where this file came from in words either. A note is not a citation, and it is better than nothing.'});
  return gaps;
}

/** The distinct values of each key, so a selection is chosen from what the extract contains. */
/** The value carried on a table port: a data table a Table output can display unchanged, with the
 *  extract's provenance annotated on it rather than replacing it. */
export type ProjectionTable=DataTable&{projection:{provenance:ExtractProvenance;siteIds:string[];gaps?:DeclarationGap[]}};
export const projectionTable=(extract:ProjectionExtract):ProjectionTable=>
  ({...extract.table,projection:{provenance:extract.provenance,siteIds:extract.siteIds,
    ...(extract.gaps?.length?{gaps:extract.gaps}:{})}});
export function readExtract(value:ProjectionTable):ProjectionExtract{
  if(!value?.projection)throw new Error('Connect a Sea-level projection extract, not a plain table: the dataset, baseline and citations must be declared first.');
  const {projection,...table}=value;
  return {kind:'projection-extract',table:table as DataTable,provenance:projection.provenance,siteIds:projection.siteIds};
}

/** Assignments travel as a table of distances, so the join itself can be displayed and checked. */
export type AssignmentTable=DataTable&{assignments:Assignments};
/** The key columns a site-assignment table carries. See RATE_TABLE_KEYS. */
export const SITE_ASSIGNMENT_TABLE_KEYS=['point_id','projection_site'] as const;

export function assignmentTable(assignments:Assignments):AssignmentTable{
  return {kind:'data-table',keys:[...SITE_ASSIGNMENT_TABLE_KEYS],valueField:'distance_m',unit:'metre',
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
    &&r.key.basis===selection.basis&&r.key.family===selection.family
    &&r.key.year===selection.year&&r.key.quantile===selection.quantile);
  // A missing value stays unknown; it is never scaled into a number.
  if(!row||row.value===null||!Number.isFinite(row.value))return null;
  return row.value*(VALUE_UNITS[extract.table.unit as string]??1);
}

/** The factor applied to published values to reach metres, for the receipt. */
export const valueScale=(extract:ProjectionExtract):number=>VALUE_UNITS[extract.table.unit as string]??1;

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
    // One shared search, three callers: see src/nearest-neighbour.ts. What stays here is the
    // domain -- `usable` is already narrowed to sites the extract can answer for.
    const match=nearestOf(coordinates,usable,site=>site.geometry?.coordinates as Position|undefined)!;
    const best=match.candidate,bestKm=match.kilometres;
    return {...base,coordinates,siteId:siteId(best.properties),siteName:text(best.properties.name)||siteId(best.properties),
      distanceM:Math.round(bestKm*1000)};
  });
  const assigned=rows.filter(row=>row.siteId);
  return {kind:'site-assignments',rows,extract,assigned:assigned.length,unassigned:rows.length-assigned.length,
    maxDistanceM:assigned.reduce((max,row)=>Math.max(max,row.distanceM??0),0)};
}

export type ElevationReference=''|'baseline-sea-surface'|'other-datum';
export interface ComparisonOptions {selection:ProjectionSelection; elevationField:string; verticalDatum:string; elevationReference:ElevationReference}
export interface Comparison {kind:undefined|'spatial-map'; rows:DisplayRow[]; centers:never[]; method:string;
  selection:ProjectionSelection; verticalDatum:string; elevationField:string; elevationReference:ElevationReference;
  exceeded:number; below:number; unknown:number}

/** A comparison of two numbers. It accounts for no hydrodynamics, defences, drainage or waves, and
 *  equality is stated rather than assumed: a projected change equal to the elevation counts as
 *  reaching it. */
export function compareToElevation(assignments:Assignments,options:ComparisonOptions):Comparison{
  const {selection,elevationField,verticalDatum,elevationReference}=options;
  if(!text(verticalDatum))throw new Error('State the vertical datum of the supplied elevations. A comparison against an unstated datum is not interpretable.');
  // A projected value is a CHANGE measured from the dataset's baseline sea surface. Comparing it
  // to an elevation is meaningful only when that elevation is measured from the same surface.
  // Stating a datum does not establish that; the reference has to be declared.
  if(!text(elevationReference))throw new Error(
    'Declare what the supplied elevations are measured from. A projected value is a change from the '
    +`dataset's baseline (${text(assignments.extract.provenance.baselinePeriod)||'unstated'}), so it can only be `
    +'compared with an elevation measured from that same sea surface.');
  if(elevationReference!=='baseline-sea-surface')throw new Error(
    'These elevations are on a geodetic or other datum, so the comparison is refused: a change from a '
    +'baseline sea surface and a height above another datum are not commensurable. Relating the two '
    +'needs the local mean sea level on that datum, which this widget does not derive.');
  if(!text(elevationField))throw new Error('Name the point attribute holding the supplied elevation. This widget derives no elevation and reads no terrain model.');
  for(const key of ['scenario','basis','family','year','quantile'] as const)
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
      distance:row.distanceM===null?null:row.distanceM/1000,unit:'kilometres',center:null};
  });
  return {kind:undefined,rows,centers:[],selection,verticalDatum,elevationField,elevationReference,
    method:`Projected relative sea-level change compared with a supplied elevation on ${verticalDatum}, declared as measured from the dataset's baseline sea surface. Equality counts as reaching the elevation. No hydrodynamics, defences, drainage or wave action are represented.`,
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
    // The published unit and its factor to metres are not sea-level concepts, and experiment 58
    // settled that the host mints no sea-level term, so QUDT carries them: the pack's vocabulary
    // is vendored at a pinned digest and cannot gain terms here.
    +`qudt:unit <${UNIT_IRIS[String(extract.table.unit)]??'http://qudt.org/vocab/unit/UNITLESS'}>; `
    +`qudt:conversionMultiplier "${valueScale(extract)}"^^xsd:decimal; `
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
      +`slr:scenario ${quote(comparison.selection.scenario)}; `
      +`slr:basis ${quote(comparison.selection.basis)}; slr:basisKind ${quote(assignments.extract.provenance.basisKind)}; `
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
    if(!text(p.elevationReference))throw new Error('Declare what the elevations are measured from for Compare level to elevation: the dataset baseline sea surface, or another datum.');
  }
}
