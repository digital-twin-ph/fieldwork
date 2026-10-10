import type {PointCollection,PointFeature,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';

/** The junctions within a shorter time than the traversal that found them, with the
 *  budget left at each one recomputed against the shorter time.
 *
 *  Nested bands — the 1, 5, 10 and 15 minute rings the case study draws — are not four
 *  traversals. They are one traversal filtered four ways, because a cumulative band is a
 *  subset: the notebook's own note says nested thresholds are cumulative, not disjoint.
 *  `isochrone` recomputes the whole Dijkstra per threshold (`src/catchments.ts:70`),
 *  including the snap, which is four times the work for the Soho example.
 *
 *  Filtering alone would be wrong, and silently. `reachable_corridor` truncates each
 *  street by `remainingM / lengthM`, and `remainingM` is the budget left over for *the
 *  traversal that produced it*. Keep the 5-minute subset of a 15-minute traversal without
 *  touching it and every junction still carries leftover from the 1,125 m budget, so the
 *  corridor runs streets out past the band and nothing says so. That is why this is a
 *  primitive rather than a generic attribute filter: the two operations have to happen
 *  together or not at all. */

export const BUDGET_TOLERANCE_M=0.05;

export function validateBandNode(node:WorkflowNode<'travel_time_band'>):void{
  const {minutes}=node.params;
  if(!Number.isFinite(minutes)||minutes<0.1||minutes>60)
    throw new Error('Use a band from 0.1 to 60 minutes.');
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the band using 1–60 characters.');
}

/** Reads the one speed every junction of a traversal agrees on, refusing a mixture. */
function speedOf(features:PointFeature[]):number{
  const speeds=new Set(features.map(f=>f.properties.speedMPerMin));
  if(speeds.size!==1)
    throw new Error('These junctions carry more than one speed, so they come from different traversals. Band each one separately.');
  const speed=[...speeds][0];
  if(typeof speed!=='number'||!Number.isFinite(speed)||speed<=0)
    throw new Error('These points are not reachable junctions. They must carry the speed the traversal used, which Reachable junctions adds.');
  return speed;
}

export function travelTimeBand(
  input:PointCollection, node:WorkflowNode<'travel_time_band'>, runId:string, sourceNodeId:string,
):{value:PointCollection&{sourceNodeId:string};receipt:Receipt}{
  validateBandNode(node);
  const {minutes}=node.params;
  if(!input.features.length)
    throw new Error('A band needs reachable junctions. Add a Reachable junctions step before this one.');
  for(const f of input.features)
    if(typeof f.properties.networkNodeId!=='string'
      ||!Number.isFinite(f.properties.travelMetres)||!Number.isFinite(f.properties.remainingM))
      throw new Error(`${f.properties.name}: this point is not a reachable junction. It must carry networkNodeId, travelMetres and remainingM.`);
  const speedMPerMin=speedOf(input.features);
  // The traversal's budget, recovered from the junctions themselves rather than restated.
  const budgets=input.features.map(f=>
    (f.properties.travelMetres as number)+(f.properties.remainingM as number));
  const traversalBudgetM=Math.max(...budgets);
  if(traversalBudgetM-Math.min(...budgets)>BUDGET_TOLERANCE_M)
    throw new Error('These junctions do not share one travel budget, so they come from different traversals. Band each one separately.');
  const bandBudgetM=minutes*speedMPerMin;
  if(bandBudgetM>traversalBudgetM+BUDGET_TOLERANCE_M){
    const traversalMinutes=traversalBudgetM/speedMPerMin;
    throw new Error(`A ${minutes} minute band is longer than the ${traversalMinutes.toFixed(1)} minute traversal it narrows. Widening is not narrowing: run the traversal at ${minutes} minutes instead.`);
  }
  const features:PointFeature[]=input.features
    .filter(f=>(f.properties.travelMetres as number)<=bandBudgetM+BUDGET_TOLERANCE_M)
    .map(f=>({...f,id:`${f.id}-t${minutes}`,
      properties:{...f.properties,
        remainingM:Number((bandBudgetM-(f.properties.travelMetres as number)).toFixed(2))}}));
  if(!features.length)
    throw new Error(`No junction is within ${minutes} minutes. The nearest is ${(Math.min(...input.features.map(f=>f.properties.travelMetres as number))/speedMPerMin).toFixed(1)} minutes away.`);
  const dropped=input.features.length-features.length;
  const notes=[
    `${features.length} of ${input.features.length} junctions are within ${minutes} minute${minutes===1?'':'s'}, a ${bandBudgetM.toFixed(0)} m budget at ${speedMPerMin} m per minute.`,
    `Narrowed from a ${(traversalBudgetM/speedMPerMin).toFixed(1)} minute traversal. One traversal bands into as many rings as are wanted, which is what the rings of an isochrone map are.`,
    'The budget left at each junction was recomputed against this band. Filtering without that would leave the longer traversal’s leftovers in place, and a corridor drawn from it would run past the band.',
    'Bands from one traversal are cumulative, not disjoint: a 5 minute band contains the 1 minute band. Subtracting one from another is not done here.',
  ];
  if(dropped)notes.push(`${dropped} junction${dropped===1?' lies':'s lie'} beyond this band and ${dropped===1?'is':'are'} not in the result.`);
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:band>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:TravelTimeBand, prov:Activity; `
    +`fw:bandMinutes ${minutes}; `
    +`fw:bandBudgetMetres ${bandBudgetM.toFixed(2)}; `
    +`fw:traversalBudgetMetres ${traversalBudgetM.toFixed(2)}; `
    +`fw:assumedSpeedMetresPerMinute ${speedMPerMin}; `
    +`fw:junctionsOffered ${input.features.length}; `
    +`fw:junctionsInBand ${features.length}; `
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{type:'FeatureCollection',features,sourceNodeId:node.id,
    sourceKind:'input-points',spatialReference:(input as {spatialReference?:unknown}).spatialReference,
    sourceInfo:{format:'travel-time-band',bandMinutes:minutes,notes}} as unknown as PointCollection&{sourceNodeId:string},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Travel time band: junctions within ${minutes} min (${bandBudgetM.toFixed(0)} m at ${speedMPerMin} m/min), narrowed from ${(traversalBudgetM/speedMPerMin).toFixed(1)} min, with the remaining budget recomputed. ${notes.slice(2).join(' ')}`}};
}
