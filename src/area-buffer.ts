import {buffer} from '@turf/buffer';
import type {Polygon,Position} from './types.js';
import {bboxPolygon} from './study-area.js';
/** The buffer distance is a knob, and its range was a second number with no reason behind it.
 *
 *  It capped at 5,000 m while the geometry helpers in this same module accept 50,000 — `circleAround`
 *  and the bbox dimensions both say 1 to 50,000 metres. So a practitioner could ask for a 50 km
 *  circle around a point and not a 6 km margin around a boundary, and nothing explained the
 *  difference. The substantive guards are separate and unchanged: a boundary spanning at most one
 *  degree, below 80° latitude. Buffer study area, which used this range for a margin around a boundary, was retired
 *  2026-11-06 and its code removed 2026-11-21 (0.158.0); Area around a point keeps it.
 *
 *  Raised to 50,000 on 2026-10-12 after the Old Naledi facility selection turned out to need 6 km.
 *  That selection is a 6 km circle at the boundary's bounding-box centre, and a 6 km margin around
 *  the boundary itself is what it was approximating — which this cap made impossible to express. */
/** The furthest a buffer may reach, in metres. The dialog offered 5,000 of this until 2026-11-23 while the rule
 *  allowed 50,000, so a radius the step would have accepted could not be typed; the practitioner's 50 km question
 *  about a mine is what made that bite. One number, read by the rule and by the dialog. */
export const MAX_BUFFER_M=50_000;
export function validateBuffer(distanceM:number){if(!Number.isFinite(distanceM)||distanceM<0||distanceM>MAX_BUFFER_M)throw new Error(`Study-area buffer must be 0\u2013${MAX_BUFFER_M.toLocaleString('en')} metres.`);}
/** A circle of a stated radius around a centre, as a polygon.
 *
 *  The same construction `buffer_point` uses, and the same measured step count: Turf's `steps`
 *  is per quadrant, and 32 gives 128 vertices covering 99.96% of the true circle, against 99.36%
 *  at 8. A scope's edge decides membership, so the finer setting is used here too. */
export function circleAround(centre:Position,radiusM:number):Polygon{
  if(centre.length!==2||!centre.every(Number.isFinite)||Math.abs(centre[1])>80)
    throw new Error('Use a centre below 80\u00b0 latitude.');
  if(!Number.isFinite(radiusM)||radiusM<1||radiusM>50000)
    throw new Error('Use a radius from 1 to 50,000 metres.');
  const result=buffer({type:'Feature',properties:{},geometry:{type:'Point',coordinates:centre}},
    radiusM,{units:'meters',steps:32});
  if(!result||result.type!=='Feature')throw new Error('The radius did not produce a valid boundary.');
  const geometry=result.geometry;
  if(geometry.type!=='Polygon')throw new Error('A radius must produce a single polygon.');
  return geometry;
}

/** Axis-aligned CRS84 box; dimensions approximate ground distances at its centre. */
export function dimensionedBox(center:Position,widthM:number,heightM:number){
  if(center.length!==2||!center.every(Number.isFinite)||Math.abs(center[1])>80||![widthM,heightM].every(v=>Number.isFinite(v)&&v>=1&&v<=50000))throw new Error('Use a centre below 80° latitude and dimensions from 1 to 50,000 metres.');
  const dy=heightM/111195/2,dx=widthM/(111195*Math.cos(center[1]*Math.PI/180))/2;return bboxPolygon(center[0]-dx,center[1]-dy,center[0]+dx,center[1]+dy);
}
