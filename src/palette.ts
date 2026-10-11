/** Which node types the palette offers, and in what order.
 *
 *  Extracted from `renderLibrary` so it can be checked without a DOM. A widget that is
 *  registered, implemented and tested is still unreachable unless it appears here, and nothing
 *  else in the gate notices: `usage:widgets` counts worked examples, not palette entries. The
 *  test beside this file asserts that every node type is either addable or deliberately not.
 */

/** Group headings, in the order the palette shows them. A group missing here sorts to the front,
 *  which is how "Comparisons and checks" briefly jumped the queue. */
export const PALETTE_GROUPS=['Sources','Spatial operations','Comparisons and checks','Semantic reasoning','Summaries','Micro-workflows','Outputs'] as const;

/** Offered whatever example is loaded, because they apply to any workflow. Adding a general
 *  widget means adding it here; forgetting is what makes one invisible. */
export const ALWAYS_ADDABLE=[
  'buffer_area','buffer_point','reproject','table_input','raster_input','clip_raster','sample_raster',
  'find_health_facilities','summarize_hull','summarize_combined_area','snap_to_network','reachable_nodes','travel_time_band','reachable_corridor','stack_polygons','fill_interior_gaps',

  'rate','case_series','slr_extract_import','slr_site_assignment',
  'slr_threshold_comparison','donut_geomask','hex_aggregate','mean_center','compare_point_sets',
  'comparison_map','chart_output','map_output','table_output',
] as const;

/** Offered on the two teaching canvases, which start with almost nothing. */
export const STARTER_TYPES=['area','observations','measure_area','coverage_check','map_output'] as const;

/** Superseded by map_output, table_output and chart_output; kept executable for saved work but
 *  never offered again. */
export const RETIRED_FROM_PALETTE=['output'] as const;

/** Addable, but not by choosing the type: the palette shows one entry per bundled
 *  composition and each adds a `micro_workflow` node already carrying that composition's
 *  pinned contract and defaults. A generic entry would add a node with no composition, which
 *  has no ports and cannot run, so the type is kept out of `ALWAYS_ADDABLE` on purpose. */
export const ADDABLE_VIA_COMPOSITION=['micro_workflow'] as const;

export function addableTypes(options:{
  exampleKey:string; templateTypes:readonly string[]; workflowTypes:readonly string[];
  catchmentTypes:readonly string[];
}):Set<string>{
  const {exampleKey,templateTypes,workflowTypes,catchmentTypes}=options;
  const starter=['blank','coverage'].includes(exampleKey);
  const allowed=new Set<string>(starter?STARTER_TYPES:templateTypes);
  if(exampleKey==='old-naledi')for(const type of ['measure_area','observations','coverage_check','map_output'])allowed.add(type);
  for(const type of catchmentTypes)allowed.add(type);
  for(const type of ALWAYS_ADDABLE)allowed.add(type);
  // Whatever is already on the canvas stays addable, so a deleted node can be put back.
  for(const type of workflowTypes)allowed.add(type);
  for(const type of RETIRED_FROM_PALETTE)allowed.delete(type);
  return allowed;
}
