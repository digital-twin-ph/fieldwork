import type {Position,Boundary,SpatialRelation} from './types.js';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
export function pointRelation(coordinates:Position|null|undefined,boundary:Boundary):SpatialRelation{
  if(!coordinates)return 'MissingLocation';
  if(!booleanPointInPolygon(coordinates,boundary))return 'Outside';
  return booleanPointInPolygon(coordinates,boundary,{ignoreBoundary:true})?'Inside':'Boundary';
}

/** The standard name for each relation this project computes, stated once.
 *
 *  `SpatialRelation` is this project's vocabulary — `Inside`, `Boundary`, `Outside` — and OGC
 *  Simple Features named those first: `within`, `touches`, `disjoint`, as the DE-9IM predicates
 *  GeoSPARQL exposes. So one fact travels in two vocabularies, `fw:spatialRelation` for the rules
 *  to read and `geo:sf*` for a reader to audit, and the dictionary between them was **written
 *  twice** — in `spatial-coverage.ts` and `map-output.ts`. A duplicated dictionary is the
 *  measurable cost of having invented a parallel name, so it lives here, once.
 *
 *  `MissingLocation` has no entry, and cannot: DE-9IM has no predicate for an absent geometry,
 *  which is independent evidence for what was argued separately — a missing geometry is not a
 *  spatial relation and does not belong in this vocabulary.
 *
 *  Why the parallel vocabulary exists at all is not laziness: the standard predicate is **binary**,
 *  `?record geo:sfWithin ?area`, and the rule builder's authored condition is a subject attribute.
 *  Until that form admits relational conditions, the rules need the attribute form.
 *  See docs/research/ogc-standards-assessment-2026-10-12.md. */
export const GEOSPARQL_PREDICATE:Readonly<Record<Exclude<SpatialRelation,'MissingLocation'>,string>>=
  Object.freeze({Inside:'sfWithin',Boundary:'sfTouches',Outside:'sfDisjoint'});
