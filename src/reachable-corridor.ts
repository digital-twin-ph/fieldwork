import {buffer as turfBuffer} from '@turf/buffer';
import type {Boundary,PointCollection,Position,WorkflowNode} from './types.js';
import type {Catchment,Network,Polygons} from './catchments.js';
import {metric,validateNetwork} from './catchments.js';
import {partial,prepareEdges} from './network-edges.js';
import type {Receipt} from './results.js';

/** The strip of ground along the streets a traveller can actually get down.
 *
 *  The second half of `isochrone`. Takes the junctions `reachable_nodes` reached,
 *  walks each street leaving a reached junction as far as the budget left there
 *  allows, and buffers the result. A street is entered part-way when the budget runs
 *  out mid-block, which is what puts the edge of the time between junctions rather
 *  than at them.
 *
 *  Nothing here restates the budget, the speed or the direction: `remainingM` and
 *  `travelDirection` arrive on the points, so this cannot disagree with the
 *  traversal that produced them.
 *
 *  The corridor half-width is a claim, not a detail. At 25 metres — the figure
 *  Advanced-1 NB03 passes as `edge_buff`, with no reason recorded — anywhere within
 *  25 m of a reachable street counts as reached, which is a 50 m wide strip and
 *  includes the insides of buildings, locked yards and the far side of walls. */

export const BUFFER_QUADRANT_SEGMENTS=8;

export function validateCorridorNode(node:WorkflowNode<'reachable_corridor'>):void{
  const {zone,hemisphere,bufferM}=node.params;
  if(!Number.isInteger(zone)||zone<1||zone>60||!['north','south'].includes(hemisphere))
    throw new Error('Choose a UTM zone from 1 to 60 and a hemisphere.');
  if(!Number.isFinite(bufferM)||bufferM<1||bufferM>100)
    throw new Error('Use a corridor half-width from 1 to 100 metres.');
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the step using 1–60 characters.');
}

export function reachableCorridor(
  input:PointCollection, network:Network, node:WorkflowNode<'reachable_corridor'>,
  runId:string, sourceNodeId:string,
):{value:Polygons;receipt:Receipt}{
  validateCorridorNode(node);
  validateNetwork(network);
  const {bufferM,zone,hemisphere}=node.params;
  if(!input.features.length)throw new Error('A corridor needs reachable junctions. Add a Reachable junctions step before this one.');
  const directions=new Set(input.features.map(f=>f.properties.travelDirection));
  if(directions.size!==1||!['outbound','inbound'].includes([...directions][0] as string))
    throw new Error('These junctions do not come from a single Reachable junctions step. Each must carry one travelDirection of outbound or inbound.');
  const direction=[...directions][0] as 'outbound'|'inbound';
  for(const f of input.features)
    if(typeof f.properties.networkNodeId!=='string'||!Number.isFinite(f.properties.remainingM))
      throw new Error(`${f.properties.name}: this point is not a reachable junction. It must carry networkNodeId and remainingM, which Reachable junctions adds.`);
  const projection=metric(zone,hemisphere);
  const edges=prepareEdges(network,direction,projection.forward);
  const fromNode=new Map<string,typeof edges>();
  for(const e of edges){const list=fromNode.get(e.from)||[];list.push(e);fromNode.set(e.from,list);}
  // One corridor per origin, so two clinics' catchments stay separable.
  const origins=new Map<string,{remaining:Map<string,number>;name:string}>();
  for(const f of input.features){
    const originId=String(f.properties.originSiteId??'origin');
    const group=origins.get(originId)||{remaining:new Map<string,number>(),
      name:String(f.properties.originSiteId??f.properties.name)};
    group.remaining.set(f.properties.networkNodeId as string,f.properties.remainingM as number);
    origins.set(originId,group);
  }
  const features:Catchment[]=[];
  let entered=0,trimmed=0,unreachedJunctions=0;
  for(const [originId,group] of origins){
    const lines:Position[][]=[];
    for(const [nodeId,remainingM] of group.remaining)
      for(const e of fromNode.get(nodeId)||[]){
        if(remainingM<=0)continue;
        const fraction=Math.min(1,remainingM/e.lengthM);
        if(fraction<1)trimmed++;
        const line=partial(e.line,fraction);
        if(line.length>1){lines.push(line.map(projection.inverse));entered++;}
      }
    if(!lines.length){unreachedJunctions++;continue;}
    const buffered=turfBuffer({type:'MultiLineString',coordinates:lines},bufferM,
      {units:'meters',steps:BUFFER_QUADRANT_SEGMENTS});
    if(!buffered||buffered.type!=='Feature')throw new Error('The corridor buffer did not produce a polygon.');
    features.push({id:`corridor-${originId}`,name:`${group.name} corridor`,siteId:originId,
      geometry:buffered.geometry as Boundary});
  }
  if(!features.length)
    throw new Error('No street could be entered from any reachable junction, so there is no corridor. Every junction had nothing left of its budget.');
  const notes=[
    `${features.length} corridor${features.length===1?'':'s'} from ${origins.size} origin${origins.size===1?'':'s'}, ${bufferM} m either side of ${entered} reachable street segment${entered===1?'':'s'}, buffered in ${projection.crs} and returned as longitude and latitude.`,
    `${bufferM} m either side is a ${bufferM*2} m wide strip, and it is a claim: anywhere within it counts as reached. That includes the insides of buildings, locked yards and the far side of walls, none of which this knows about.`,
    `${trimmed} segment${trimmed===1?' was':'s were'} entered part-way, where the budget ran out mid-block. That is what puts the edge of the time between junctions rather than at them.`,
    `Travel was ${direction}. The budget and the direction came from the junctions themselves, so this corridor cannot disagree with the traversal that produced them.`,
    'Holes are kept. A gap inside a corridor is ground no street reaches, not an error, and filling it would assert reach where none was computed.',
    `Buffered with ${BUFFER_QUADRANT_SEGMENTS} segments per quadrant, so a corner is an eight-sided approximation of a curve, not a curve.`,
  ];
  if(unreachedJunctions)
    notes.push(`${unreachedJunctions} origin${unreachedJunctions===1?' had':'s had'} no street to enter and produced no corridor.`);
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:corridor>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:ReachableCorridor, prov:Activity; `
    +`fw:originCount ${origins.size}; `
    +`fw:corridorCount ${features.length}; `
    +`fw:enteredSegmentCount ${entered}; `
    +`fw:partialSegmentCount ${trimmed}; `
    +`fw:corridorHalfWidthMetres ${bufferM}; `
    +`fw:travelDirection ${JSON.stringify(direction)}; `
    +`fw:metricCRS ${JSON.stringify(projection.crs)}; `
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{features,sites:[],method:`Street corridor: reachable segments truncated by remaining budget, buffered ${bufferM} m in ${projection.crs}`,
    crs:projection.crs,notes,siteSourceNodeId:sourceNodeId},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Reachable street corridor, ${direction}, ${bufferM} m either side, ${BUFFER_QUADRANT_SEGMENTS} segments per quadrant. ${notes.slice(1).join(' ')}`}};
}
