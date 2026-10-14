import type {Workflow,WorkflowNode} from './types.js';

/** One projection per run, stated once and queryable.
 *
 *  Nine widgets compute in metres and each carries its own `zone` and `hemisphere`:
 *  mean_center, compare_point_sets, summarize_combined_area, summarize_hull, snap_to_network,
 *  reachable_corridor, voronoi, isochrone and reproject. Projecting inside the operation is the
 *  right design -- the choice is part of that computation's method and belongs in its receipt --
 *  but nothing required the choices to agree.
 *
 *  Measured 2026-10-13 on four corners around Gaborone, which sits near the 34/35 boundary so both
 *  zones pass the six-degree guard. **The same four points enclose 0.58% more area in EPSG:32734
 *  than in EPSG:32735.** A workflow could use one in the hull and the other in the mean centre, and
 *  a figure could report both. A grossly wrong zone is refused at run time by the metric guard; a
 *  plausible one is not.
 *
 *  Corrected 2026-10-13: this comment first gave the absolute areas -- 40,578,765 m² against
 *  40,341,592 m² -- without saying which four corners they were measured on, so the figure could
 *  not be reproduced. Re-measured on a stated 6.35 km square centred on the city, corners
 *  [25.888448 -24.6597], [25.957752 -24.6597], [25.957752 -24.5967], [25.888448 -24.5967]:
 *  49,230,606 m² against 48,943,698 m², a difference of 286,908 m². The RATIO is what is worth
 *  quoting and is roughly stable -- 0.58% on a 40 km² hull, 0.59% on this 49 km² square, 0.576% on
 *  a 284 km² box -- because it comes from the two zones' scale factors, not from the extent. The
 *  absolute difference scales with the area and means nothing without the box. The notebook this
 *  links to recomputes all of it with pyproj.
 */

/** Widgets that project to metres and declare which projection they used. */
export const METRIC_NODE_TYPES=['mean_center','compare_point_sets','summarize_combined_area',
  'summarize_hull','snap_to_network','reachable_corridor','voronoi','isochrone','reproject'] as const;

export interface MetricChoice {zone:number; hemisphere:'north'|'south'}

export const epsgCode=({zone,hemisphere}:MetricChoice):number=>
  (hemisphere==='south'?32700:32600)+zone;
/** The project's own short form, which five widgets already write. */
export const epsgName=(choice:MetricChoice):string=>`EPSG:${epsgCode(choice)}`;
/** The OGC register's identifier for the same thing: a standard IRI a reader outside this project
 *  can resolve, which a bare "EPSG:32734" literal is not. Written alongside rather than instead,
 *  the same align-do-not-rename rule this project applies everywhere else. */
export const crsIRI=(choice:MetricChoice):string=>
  `http://www.opengis.net/def/crs/EPSG/0/${epsgCode(choice)}`;

/** The OGC identifier for CRS84, for an operation that computes in degrees and projects nothing.
 *  `clip_polygons` and `summarize_polygons` do: they intersect and count on longitude and latitude
 *  directly, which their parity note states rather than hides. */
export const CRS84_IRI='http://www.opengis.net/def/crs/OGC/1.3/CRS84';

/** The OGC IRI for a CRS a widget carries as a short name. Receipts state the IRI rather than the
 *  short name so a query can join on it: "CRS84", "OGC:CRS84" and "EPSG:4326" are the same frame
 *  written three ways, and three spellings answer a SPARQL query as three different projections. */
export function crsIRIFromName(name:string):string|null{
  const trimmed=name.trim();
  if(!trimmed)return null;
  if(/^(OGC:)?CRS84$/i.test(trimmed))return CRS84_IRI;
  const epsg=/^EPSG:(\d{4,5})$/i.exec(trimmed);
  if(!epsg)return null;
  // EPSG:4326 is the same datum as CRS84 with the axes in the other order; GeoJSON coordinates are
  // longitude-first, so a receipt for GeoJSON means CRS84 whichever of the two the widget wrote.
  return epsg[1]==='4326'?CRS84_IRI:`http://www.opengis.net/def/crs/EPSG/0/${epsg[1]}`;
}

/** Every metric choice a workflow declares, by node. */
export function metricChoices(workflow:Workflow):{node:WorkflowNode;choice:MetricChoice}[]{
  return workflow.nodes
    .filter((n):n is WorkflowNode=>!!n&&(METRIC_NODE_TYPES as readonly string[]).includes(n.type))
    .flatMap(node=>{
      const {zone,hemisphere}=node.params as Partial<MetricChoice>;
      return Number.isInteger(zone)&&(hemisphere==='north'||hemisphere==='south')
        ? [{node,choice:{zone:zone as number,hemisphere}}] : [];
    });
}

/** The run's single projection, or null when nothing projects. Throws when they disagree. */
export function workflowMetricCRS(workflow:Workflow):MetricChoice|null{
  const declared=metricChoices(workflow);
  if(!declared.length)return null;
  const distinct=new Map(declared.map(({choice})=>[epsgName(choice),choice]));
  if(distinct.size>1){
    const where=declared.map(({node,choice})=>`${node.id} (${node.type}) in ${epsgName(choice)}`);
    throw new Error(`This workflow computes in ${distinct.size} different projections: `
      +`${where.join(', ')}. Results from different projections are not comparable -- measured on `
      +`four corners near a zone boundary, the same convex hull is 0.58% larger in one than in the `
      +`other -- and a figure reporting both would be stating two answers as one. Set every metric `
      +`step to the same UTM zone and hemisphere, or split them into separate workflows.`);
  }
  return [...distinct.values()][0];
}

/** The run's projection as facts. Stated once on the run, so a reader can ask what a run computed
 *  in without walking every activity, and stated with the OGC identifier so the question can be
 *  asked from outside this vocabulary. */
export function metricCRSFacts(runId:string,choice:MetricChoice|null):string{
  if(!choice)return '';
  const run=`<urn:fieldwork:run:${runId}>`;
  return '@prefix fw: <urn:fieldwork:>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n'
    +`${run} fw:metricCRS ${JSON.stringify(epsgName(choice))}; `
    +`dcterms:conformsTo <${crsIRI(choice)}>.\n`;
}

/** The two facts that together state what frame a computation worked in, for every widget that
 *  works in metres. Single-sourced because they had drifted once already: the project's own short
 *  name says which UTM zone, and the OGC IRI says the same thing in a form a reader outside this
 *  vocabulary can resolve. A site that emitted only one of them left a run half-answerable. */
export function metricCRSAssertion(crs:string):string{
  const iri=crsIRIFromName(crs);
  if(!iri)throw new Error(`A receipt cannot state ${JSON.stringify(crs)} as the projection it computed in: no CRS of that name is registered.`);
  return `fw:metricCRS ${JSON.stringify(crs)}; dcterms:conformsTo <${iri}>; `;
}

/** The Dive Deeper notebook that explains projections, linked from every widget that projects.
 *  The practitioner's rule of 2026-10-13: a widget may embed a CRS choice only if the person
 *  making that choice can reach an explanation of what they are choosing. Nine widgets take a
 *  zone and hemisphere; before this, none of them said anywhere what a zone is or what picking
 *  the wrong-but-plausible one costs. */
export const PROJECTION_NOTEBOOK={
  check:'01-reproject',
  notebook:'01-reproject-vs-pyproj.ipynb',
  section:'Dive deeper · what a projection is, and what the zone choice costs',
  url:'https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=01-reproject-vs-pyproj.ipynb',
} as const;

/** The explanation link for a widget that projects, or '' for one that does not. Derived from
 *  METRIC_NODE_TYPES rather than written out per widget, so a tenth metric widget gets the link
 *  by being added to that list and cannot ship without it. */
export function projectionExplainer(nodeType:string):string{
  if(!(METRIC_NODE_TYPES as readonly string[]).includes(nodeType))return '';
  return '<details class="explainer"><summary>What does the UTM zone do?</summary>'
    +'<p>This widget measures in metres, so it projects the coordinates first, and the zone you '
    +'pick is part of how the answer is computed. Near a zone boundary two different zones can '
    +'both be defensible and give areas that differ by about half a percent &mdash; small, but '
    +'systematic across every length in the workflow. Every metric widget in one workflow must '
    +'declare the same zone.</p>'
    +`<p>The <a href="${PROJECTION_NOTEBOOK.url}" target="_blank" rel="noopener noreferrer">`
    +'projection notebook</a> explains what a projection is and recomputes that difference with '
    +'PROJ, outside this browser.</p></details>';
}

/** The UTM zone an EPSG code names, or null when the code is not a WGS84 UTM zone. Used where a
 *  file declares its own CRS as a code -- a GeoPackage's `gpkg_spatial_ref_sys` does -- and the
 *  reader has to decide whether it can be honoured rather than refused. */
export function utmFromEPSGCode(code:number):MetricChoice|null{
  const hemisphere=code>=32601&&code<=32660?'north':code>=32701&&code<=32760?'south':null;
  return hemisphere?{zone:code%100,hemisphere}:null;
}

/** Whether a source can read a file declaring this EPSG code. CRS84/4326 is read as it stands;
 *  a WGS84 UTM zone is converted on import. Everything else needs a datum shift or a projection
 *  definition this prototype does not carry, and is refused by name rather than guessed at. */
export const READABLE_SOURCE_EPSG=(code:number):boolean=>code===4326||utmFromEPSGCode(code)!==null;
