/** EVERY STEP TYPE'S FUNCTION, by type (code review, 2026-11-25). `executeWorkflow` looks a step up here rather
 *  than in a switch of 1,400 lines. A type with no entry is refused by name, as the switch's default did. */
import type {NodeType} from './types.js';
import type {StepRunner} from './core.js';
import {runLineInput,runMapImageInput,runPointInput,runPolygonInput,runStudyArea,runTableInput} from './run-inputs.js';
import {runBufferPoint,runCatchmentSteps,runClipPointsToArea,runComparePointSets,runFillInteriorGaps,runFindHealthFacilities,runGeomask,runJoinTableToArea,runMeanCenter,runMeasureArea,runMeasureDistance,runPointGrid,runReachableCorridor,runReachableNodes,runSnapToNetwork,runSummarizeCombinedArea,runSummarizeHull,runTravelOverGround,runTravelTimeBand} from './run-spatial.js';
import {runClipRaster,runFindSatelliteProducts,runRasterInput,runSampleRaster,runSearchSatelliteCatalog} from './run-raster.js';
import {runAppendRows,runDeduplicatePoints,runGroupTable,runMapTermsToVocabulary,runRelateTable,runSelectRows} from './run-tables.js';
import {runApplyRuleset} from './run-ruleset.js';
import {runCaseSeries,runDetectUnusualCounts,runRate,runRegression,runSpaceTimeScan,runStudyDesign,runTransmissionChains,runTwoByTwo} from './run-epidemiology.js';
import {runChartOutput,runMapOutput,runTableOutput} from './run-outputs.js';

export const STEP_RUNNERS:{[T in NodeType]?:StepRunner<T>}={
  point_input:runPointInput,
  polygon_input:runPolygonInput,
  line_input:runLineInput,
  map_image_input:runMapImageInput,
  table_input:runTableInput,
  study_area:runStudyArea,
  mean_center:runMeanCenter,
  compare_point_sets:runComparePointSets,
  donut_geomask:runGeomask,
  aggregate_points_to_h3_cell:runGeomask,
  fill_interior_gaps:runFillInteriorGaps,
  travel_time_band:runTravelTimeBand,
  reachable_corridor:runReachableCorridor,
  reachable_nodes:runReachableNodes,
  snap_to_network:runSnapToNetwork,
  travel_over_ground:runTravelOverGround,
  summarize_combined_area:runSummarizeCombinedArea,
  summarize_hull:runSummarizeHull,
  find_health_facilities:runFindHealthFacilities,
  buffer_point:runBufferPoint,
  network_input:runCatchmentSteps,
  voronoi:runCatchmentSteps,
  isochrone:runCatchmentSteps,
  clip_polygons:runCatchmentSteps,
  summarize_points_to_polygon:runCatchmentSteps,
  join_table_to_area:runJoinTableToArea,
  clip_points_to_area:runClipPointsToArea,
  measure_distance:runMeasureDistance,
  measure_area:runMeasureArea,
  point_grid:runPointGrid,
  sample_raster:runSampleRaster,
  raster_input:runRasterInput,
  clip_raster:runClipRaster,
  find_satellite_products:runFindSatelliteProducts,
  search_satellite_catalog:runSearchSatelliteCatalog,
  map_terms_to_vocabulary:runMapTermsToVocabulary,
  relate_table:runRelateTable,
  group_table:runGroupTable,
  append_rows:runAppendRows,
  select_rows:runSelectRows,
  deduplicate_points:runDeduplicatePoints,
  apply_ruleset:runApplyRuleset,
  space_time_scan:runSpaceTimeScan,
  transmission_chains:runTransmissionChains,
  study_design:runStudyDesign,
  two_by_two:runTwoByTwo,
  regression:runRegression,
  detect_unusual_counts:runDetectUnusualCounts,
  rate:runRate,
  case_series:runCaseSeries,
  chart_output:runChartOutput,
  map_output:runMapOutput,
  table_output:runTableOutput,
};
