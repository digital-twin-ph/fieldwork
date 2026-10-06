import type {Position,Boundary,SpatialRelation} from './types.js';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
export function pointRelation(coordinates:Position|null|undefined,boundary:Boundary):SpatialRelation{
  if(!coordinates)return 'MissingLocation';
  if(!booleanPointInPolygon(coordinates,boundary))return 'Outside';
  return booleanPointInPolygon(coordinates,boundary,{ignoreBoundary:true})?'Inside':'Boundary';
}
