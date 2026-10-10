import type {Boundary,PointCollection,Position,WorkflowNode} from './types.js';
import type {Catchment,Polygons} from './catchments.js';
import {metric} from './catchments.js';
import type {Receipt} from './results.js';

/** The smallest convex outline containing a set of points.
 *
 *  Computed in metres, not degrees. A hull built on longitude and latitude is
 *  wrong by the cosine of the latitude, and both case studies this is derived from
 *  project first. The zone is a parameter for the same reason five other widgets
 *  take one: a layer cannot state the coordinate system it is in.
 *
 *  Monotone chain, which is O(n log n) and deterministic. Collinear points on an
 *  edge are dropped, so the ring carries corners only. */

export const MIN_HULL_POINTS=3;

/** Shoelace area of a closed projected ring, in square metres. Reported rather
 *  than thresholded: points that lie on one meridian are collinear in degrees and
 *  not in metres, so they yield a correct hull of a few square metres spanning
 *  kilometres. Measured 2026-10-10: three points 2.2 km apart on one meridian give
 *  3.6 m². Refusing that would need a cutoff, and a genuinely thin distribution —
 *  cases along a road, facilities along a coast — would be refused with it. The
 *  area is stated instead, so a reader can see a sliver for what it is. */
export function ringAreaM2(ring:Position[]):number{
  let twice=0;
  for(let i=0;i<ring.length-1;i++)twice+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];
  return Math.abs(twice/2);
}

const cross=(o:Position,a:Position,b:Position)=>
  (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);

/** Returns the hull ring, closed, counter-clockwise, or null when the points are
 *  collinear — a line has no area and is not a hull. */
export function hullOf(projected:Position[]):Position[]|null{
  const points=[...projected].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const unique=points.filter((p,i)=>i===0||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
  if(unique.length<MIN_HULL_POINTS)return null;
  const half=(source:Position[])=>{
    const out:Position[]=[];
    for(const p of source){
      while(out.length>=2&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const ring=[...half(unique),...half([...unique].reverse())];
  if(ring.length<MIN_HULL_POINTS)return null;
  return [...ring,ring[0]];
}

export function validateHullNode(node:WorkflowNode<'summarize_hull'>):void{
  const {zone,hemisphere}=node.params;
  if(!Number.isInteger(zone)||zone<1||zone>60||!['north','south'].includes(hemisphere))
    throw new Error('Choose a UTM zone from 1 to 60 and a hemisphere.');
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the hull using 1–60 characters.');
}

export function convexHull(
  input:PointCollection, node:WorkflowNode<'summarize_hull'>, runId:string, sourceNodeId:string,
):{value:Polygons;receipt:Receipt}{
  validateHullNode(node);
  const {zone,hemisphere}=node.params;
  const located=input.features.filter(f=>f.geometry);
  const unlocated=input.features.length-located.length;
  if(located.length<MIN_HULL_POINTS)
    throw new Error(`A hull needs at least ${MIN_HULL_POINTS} located points; this layer has ${located.length}.`);
  const projection=metric(zone,hemisphere);
  const ring=hullOf(located.map(f=>projection.forward(f.geometry!.coordinates as Position)));
  if(!ring)throw new Error('These points are collinear, so they enclose no area. A line is not a hull.');
  const areaM2=ringAreaM2(ring);
  const spanM=Math.max(...ring.flatMap((a,i)=>ring.slice(i+1).map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))));
  const geometry:Boundary={type:'Polygon',coordinates:[ring.map(p=>projection.inverse(p))]};
  const feature:Catchment={id:'hull',name:node.params.label,siteId:'hull',geometry};
  const notes=[
    `Convex hull of ${located.length} located points, computed in ${projection.crs} and returned as longitude and latitude.`,
    `Encloses ${areaM2.toFixed(1)} m\u00b2 across ${spanM.toFixed(0)} m at its widest. A hull far longer than it is wide is a line the projection did not quite flatten, and should be read as one.`,
    'A hull is convex. A distribution that is not — cases along a river, facilities along a coast — is filled in, so the hull asserts area where nothing was observed.',
    'It is an outline of what was observed, not a service area, a catchment or a boundary anyone agreed to.',
  ];
  if(unlocated)notes.push(`${unlocated} record${unlocated===1?'':'s'} without coordinates took no part in the hull.`);
  const value:Polygons={features:[feature],sites:[],method:`Convex hull (monotone chain) in ${projection.crs}`,
    crs:projection.crs,notes,siteSourceNodeId:sourceNodeId};
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:hull>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:ConvexHull, prov:Activity; `
    +`fw:recordCount ${located.length}; `
    +`fw:hullVertexCount ${ring.length-1}; `
    +`fw:hullAreaSquareMetres ${areaM2.toFixed(2)}; `
    +`fw:hullSpanMetres ${spanM.toFixed(1)}; `
    +`fw:metricCRS ${JSON.stringify(projection.crs)}; `
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value,receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`${value.method}. ${notes.slice(1).join(' ')}`}};
}
