import type {Boundary,Position,Workflow,WorkflowNode} from './types.js';

/** Which UTM zone a place is in, and what it costs to get it wrong.
 *
 *  Nine widgets take a `zone` and a `hemisphere` by hand, and the palette defaulted every one
 *  of them to 30/north — Soho — so a practitioner working anywhere else started from the wrong
 *  projection with nothing saying so. Measured 2026-10-11
 *  ([100](../docs/experiments/100-choosing-the-metric-crs.md)): one zone out costs +0.172% in
 *  distance at London's latitude and +0.471% at 15°N, which is where the Philippines is.
 *
 *  This derives a suggestion. It does not remove the parameter, because a study area
 *  straddling a boundary has no single correct zone and the practitioner has to be able to
 *  choose a side. */

export interface UTMChoice {zone:number; hemisphere:'north'|'south'}

/** The zone a single position falls in. Longitude is wrapped, so 180° and −180° agree. */
export function utmZoneFor(position:Position):UTMChoice{
  const longitude=((position[0]+180)%360+360)%360-180;
  return {zone:Math.min(60,Math.max(1,Math.floor((longitude+180)/6)+1)),
    hemisphere:position[1]<0?'south':'north'};
}

/** The scale factor UTM applies at a position in a given zone: how much longer a ground
 *  distance measures on the grid. 0.9996 on the central meridian, rising away from it.
 *
 *  Reported rather than thresholded. A practitioner near a zone boundary may deliberately
 *  choose one side to keep a study area in one projection, and a rule forbidding it would
 *  refuse a legitimate choice. */
export function utmScaleFactor(position:Position,choice:UTMChoice):number{
  const a=6378137,f=1/298.257223563,e2=2*f-f*f;
  const latitude=position[1]*Math.PI/180;
  const primeVertical=a/Math.sqrt(1-e2*Math.sin(latitude)**2);
  const central=choice.zone*6-183;
  const east=(position[0]-central)*111320*Math.cos(latitude);
  return 0.9996*(1+east*east/(2*primeVertical*primeVertical));
}

const ringsOf=(geometry:Boundary):Position[][]=>
  geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat();

/** Every coordinate a workflow already holds, from the inputs a practitioner has configured.
 *
 *  Read from the authored parameters rather than from a run, so a zone can be suggested before
 *  anything has been executed — which is when the widget is added and the default matters. */
export function workflowPositions(workflow:Workflow):Position[]{
  const found:Position[]=[];
  for(const node of workflow.nodes as WorkflowNode[]){
    const params=node.params as Record<string,unknown>;
    const data=params.data as {features?:{geometry?:{coordinates?:unknown}}[];nodes?:{coordinates:Position}[]}|undefined;
    for(const feature of data?.features??[])
      if(Array.isArray(feature.geometry?.coordinates)&&typeof feature.geometry!.coordinates[0]==='number')
        found.push(feature.geometry!.coordinates as Position);
    for(const graphNode of data?.nodes??[])found.push(graphNode.coordinates);
    const geometry=params.geometry as Boundary|undefined;
    if(geometry?.type==='Polygon'||geometry?.type==='MultiPolygon')
      for(const ring of ringsOf(geometry))found.push(...ring);
  }
  return found.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
}

/** The zone to suggest for a workflow, and whether its data is of one mind about it.
 *
 *  The suggestion comes from the mean longitude, not from the first point: a study area
 *  straddling a boundary should land on the side holding most of it. `straddles` says when the
 *  data spans more than one zone, which is the case where no answer is right and the
 *  practitioner has to decide. */
export function suggestUTM(workflow:Workflow):{choice:UTMChoice;positions:number;straddles:number[]}|null{
  const positions=workflowPositions(workflow);
  if(!positions.length)return null;
  const mean:Position=[positions.reduce((t,p)=>t+p[0],0)/positions.length,
    positions.reduce((t,p)=>t+p[1],0)/positions.length];
  const zones=[...new Set(positions.map(p=>utmZoneFor(p).zone))].sort((a,b)=>a-b);
  return {choice:utmZoneFor(mean),positions:positions.length,straddles:zones.length>1?zones:[]};
}
