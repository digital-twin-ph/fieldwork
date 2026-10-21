import type {SpatialRelation,NodeSpec} from './types.js';
import {pointRelation} from './spatial-predicates.js';
export {pointRelation};

/** What is left of the spatial coverage widget after it was retired on 2026-10-21: the two things
 *  that were never about the widget. `pointRelation` answers where a point stands in relation to
 *  an area, and every map and table says it in these words. The widget itself -- the pass-through
 *  that labelled records and let a reviewer exclude one by judgement -- is gone, replaced for its
 *  spatial half by `clip_points_to_area`. See widgets/releases/coverage_check/0.2.0.json. */
export const relationLabel=(r:SpatialRelation)=>({Inside:'Inside',Boundary:'On boundary',Outside:'Outside study area',MissingLocation:'Missing coordinates'}[r]);
export const newObservations=():NodeSpec<'point_input'>=>({type:'point_input',params:{label:'Point observations',data:{type:'FeatureCollection' as const,features:[]}}});
