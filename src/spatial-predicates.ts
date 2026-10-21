import type {Position,Boundary,SpatialRelation} from './types.js';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
export function pointRelation(coordinates:Position|null|undefined,boundary:Boundary):SpatialRelation{
  // A PAIR THAT IS NOT TWO FINITE NUMBERS IS NO LOCATION. `[NaN,NaN]` reaches here from a source
  // whose coordinate column would not parse, and it used to be called Outside -- because
  // `booleanPointInPolygon` answers false for it, as it answers false for anything it cannot
  // place. The record was then carried as an excluded point and handed to Leaflet, which refused
  // it: "Invalid LatLng object: (NaN, NaN)", reported 2026-10-21 on a map of three facility
  // sources. ONE unparseable record stopped the whole run.
  //
  // Outside is a finding about a place. A coordinate that is not a number is a finding about the
  // DATA, and the two must not be confused -- which is the same distinction the clip draws
  // between its `outside` and `missing` counts.
  if(!coordinates||coordinates.length<2||!Number.isFinite(coordinates[0])||!Number.isFinite(coordinates[1]))return 'MissingLocation';
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
