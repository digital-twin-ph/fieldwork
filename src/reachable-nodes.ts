import type {PointCollection,PointFeature,Position,WorkflowNode} from './types.js';
import type {Network} from './catchments.js';
import type {OffNetworkSite,UnconnectedSite} from './catchments.js';
import {validateNetwork} from './catchments.js';
import {defaultSpatialReference} from './spatial-reference.js';
import type {Receipt} from './results.js';

/** Which network junctions lie within a travel budget of an origin, and how much
 *  budget is left at each one.
 *
 *  Extracted from `isochrone` (`src/catchments.ts:76`), which runs this Dijkstra and
 *  then keeps the result to itself. The leftover budget is the part worth carrying:
 *  the corridor step that follows truncates each street by
 *  `remainingM / lengthM`, so it never needs the minutes or the speed, and the two
 *  widgets cannot disagree about what the budget was.
 *
 *  Cost is street length divided by one constant speed. The graph holds no gradient,
 *  no crossings and no waiting, so the minutes are a restatement of metres and are
 *  reported alongside the speed used, not instead of it.
 *
 *  A speed is an assumption about a particular place in a particular period, and it
 *  does not travel. The 75 m/min this project has used everywhere is 4.5 km/h from
 *  Advanced-1 NB03 cell 10, where it is written `assume walking speed in km/hour` and
 *  the surrounding narrative scopes it to how far "Soho District residents can walk"
 *  in 1854. Carrying that number into a Philippine facility catchment in 2026 exports
 *  a Victorian London pedestrian assumption without saying so. The mode is therefore
 *  declared rather than implied, and it is checked against the speed.
 *
 *  Takes no UTM zone, unlike the other eight metric widgets. The costs are the
 *  network's own `lengthM` values, supplied by whatever produced the network; nothing
 *  here re-measures geometry, so there is nothing to project. The trade is that those
 *  lengths are taken entirely on trust. */

export const MAX_ORIGINS=10;

/** Plausible speed for each mode, in metres per minute, with the equivalent in km/h.
 *
 *  These are **conventions, not measurements**. They exist to refuse an obvious
 *  mismatch — a receipt that says "walking" beside a number only a car could hold —
 *  and they certify nothing about any actual traveller. The bands overlap, because a
 *  fast cyclist and a slow driver really do move at the same speed.
 *
 *  Nothing here is a default. A speed has to be chosen for the place and period being
 *  studied, and the band is wide enough that choosing badly inside it is still
 *  possible. */
export const MODE_SPEED_BANDS={
  walking:{minMPerMin:30,maxMPerMin:110},
  cycling:{minMPerMin:100,maxMPerMin:400},
  driving:{minMPerMin:150,maxMPerMin:1200},
  other:{minMPerMin:1,maxMPerMin:1200},
} as const;

export type TravelMode=keyof typeof MODE_SPEED_BANDS;

const kmh=(mPerMin:number)=>(mPerMin*60/1000).toFixed(1);

export function validateReachNode(node:WorkflowNode<'reachable_nodes'>):void{
  const {minutes,speedMPerMin,direction,travelMode}=node.params;
  if(!Number.isFinite(minutes)||minutes<0.1||minutes>60)
    throw new Error('Use a travel time from 0.1 to 60 minutes.');
  if(!Object.hasOwn(MODE_SPEED_BANDS,travelMode))
    throw new Error(`Choose how people travel: ${Object.keys(MODE_SPEED_BANDS).join(', ')}. Public transport is not a mode here, because it does not follow the street network \u2014 it follows routes and a timetable.`);
  const band=MODE_SPEED_BANDS[travelMode as TravelMode];
  if(!Number.isFinite(speedMPerMin))throw new Error('Use a speed in metres per minute.');
  if(speedMPerMin<band.minMPerMin||speedMPerMin>band.maxMPerMin)
    throw new Error(`${speedMPerMin} m/min is ${kmh(speedMPerMin)} km/h, which is outside the plausible range for ${travelMode}: ${band.minMPerMin} to ${band.maxMPerMin} m/min, or ${kmh(band.minMPerMin)} to ${kmh(band.maxMPerMin)} km/h. Change the speed, or change the mode to match it.`);
  if(!['outbound','inbound'].includes(direction))
    throw new Error('Choose outbound travel from the site or inbound travel to it.');
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the step using 1–60 characters.');
}

/** Cheapest cost to every node within the budget, by settled-set Dijkstra over edge
 *  lengths. Identical in behaviour to the loop inside `isochrone`: a node is settled
 *  only once, and the search stops at the first unsettled node that exceeds the
 *  budget, so nothing beyond it is explored. */
export function costsWithin(
  adjacency:Map<string,{to:string;lengthM:number}[]>, originId:string, budgetM:number,
  spentM=0,
):Map<string,number>{
  const costs=new Map<string,number>([[originId,spentM]]),settled=new Set<string>();
  for(;;){
    let current:string|undefined,best=Infinity;
    for(const [id,c] of costs)if(!settled.has(id)&&c<best){current=id;best=c;}
    if(!current||best>budgetM)break;
    settled.add(current);
    for(const e of adjacency.get(current)||[]){
      const cost=best+e.lengthM;
      if(cost<(costs.get(e.to)??Infinity))costs.set(e.to,cost);
    }
  }
  // Nodes discovered but beyond the budget were never settled and are not reached.
  return new Map([...costs].filter(([,c])=>c<=budgetM));
}

export function reachableNodes(
  input:PointCollection, network:Network, node:WorkflowNode<'reachable_nodes'>,
  runId:string, sourceNodeId:string,
):{value:PointCollection&{sourceNodeId:string};receipt:Receipt}{
  validateReachNode(node);
  validateNetwork(network);
  const {minutes,speedMPerMin,direction,travelMode}=node.params;
  const origins=input.features.filter(f=>f.geometry);
  if(!origins.length)throw new Error('Reachability needs at least one origin with a known location.');
  if(origins.length>MAX_ORIGINS)
    throw new Error(`Reachability handles up to ${MAX_ORIGINS} origins; this layer has ${origins.length}.`);
  const known=new Set(network.nodes.map(n=>n.id));
  for(const f of origins){
    const id=f.properties.networkNodeId;
    if(typeof id!=='string'||!id)
      throw new Error(`${f.properties.name}: this origin is not on the network. Add a Snap to street network step before this one.`);
    if(!known.has(id))
      throw new Error(`${f.properties.name}: network node ${id} is not in this network. The sites were snapped to a different network.`);
  }
  const nodeAt=new Map(network.nodes.map(n=>[n.id,n.coordinates]));
  // Inbound reverses every edge, which answers "who can reach me" rather than
  // "where can I get to". On one-way streets the two sets differ.
  const adjacency=new Map<string,{to:string;lengthM:number}[]>();
  for(const e of network.edges){
    const [from,to]=direction==='inbound'?[e.to,e.from]:[e.from,e.to];
    const list=adjacency.get(from)||[];list.push({to,lengthM:e.lengthM});adjacency.set(from,list);
  }
  const budgetM=minutes*speedMPerMin;
  const features:PointFeature[]=[];
  const reachedPerOrigin:number[]=[];
  // What this run could not answer, and what it answered across unmapped ground. Both are
  // findings about access rather than failures of the run, and both reach the practitioner as an
  // alert on the widget. Experiment 114.
  const unconnected:UnconnectedSite[]=[],offNetwork:OffNetworkSite[]=[];
  for(const origin of origins){
    const originNode=origin.properties.networkNodeId as string;
    // D1 is charged here too, so this chain and the monolithic isochrone agree. `snap_to_network`
    // attaches `snapDistanceM` to every point it moves -- the walk from where the site stood to
    // the junction it was snapped to -- and the budget pays for it before any street is walked.
    //
    // Seeding the origin at 0 was the same defect catchments.ts carried: the displacement was
    // measured, attached and published, and then nothing spent it. The parity tests between this
    // chain and the monolith are what caught it, by failing when only one of the two was fixed.
    // A site that moved further than the whole budget reaches nothing, which is the honest answer
    // rather than a negative remainder. Experiment 114.
    const d1=Number(origin.properties.snapDistanceM);
    const spent=Number.isFinite(d1)&&d1>0?d1:0;
    const costs=spent>=budgetM?new Map<string,number>():costsWithin(adjacency,originNode,budgetM,spent);
    if(!costs.size)unconnected.push({siteId:String(origin.id),name:String(origin.properties.name),
      distanceM:Number(spent.toFixed(2)),budgetM:Number(budgetM.toFixed(2))});
    const offNetworkMetres=Number(origin.properties.offNetworkMetres);
    if(Number.isFinite(offNetworkMetres)&&offNetworkMetres>0)
      offNetwork.push({siteId:String(origin.id),name:String(origin.properties.name),
        distanceM:offNetworkMetres,limitM:offNetworkMetres});
    reachedPerOrigin.push(costs.size);
    for(const [nodeId,costM] of [...costs].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))){
      const travelled=Number(costM.toFixed(2));
      features.push({type:'Feature',id:`${origin.id}-${nodeId}`,
        properties:{name:`${origin.properties.name} → ${nodeId}`,
          originSiteId:String(origin.id),networkNodeId:nodeId,travelDirection:direction,
          speedMPerMin,travelMode,
          // Where the origin SITE stands, and how far it is from its junction: the first segment
          // of the route, carried so that whatever draws the corridor can draw that leg too.
          // Absent when the points were not snapped by `snap_to_network`, in which case the leg
          // is unknown rather than zero.
          ...(Number.isFinite(Number(origin.properties.siteLongitude))?{
            originLongitude:Number(origin.properties.siteLongitude),
            originLatitude:Number(origin.properties.siteLatitude),
            originSnapDistanceM:spent}:{}),
          travelMetres:travelled,
          travelMinutes:Number((costM/speedMPerMin).toFixed(2)),
          remainingM:Number((budgetM-travelled).toFixed(2))},
        geometry:{type:'Point',coordinates:[...nodeAt.get(nodeId)!] as Position}});
    }
  }
  const fewest=Math.min(...reachedPerOrigin),most=Math.max(...reachedPerOrigin);
  const notes=[
    `${features.length} reachable junction${features.length===1?'':'s'} from ${origins.length} origin${origins.length===1?'':'s'} within ${minutes} minute${minutes===1?'':'s'} ${direction==='inbound'?'inbound to':'outbound from'} each, measured along the network.`,
    `Budget ${budgetM.toFixed(0)} m, derived as ${minutes} minutes × ${speedMPerMin} m per minute (${kmh(speedMPerMin)} km/h, ${travelMode}). Every time reported here is a street length divided by that one speed: there is no gradient, no crossing, no waiting and no difference between travellers in this graph.`,
    'A speed is an assumption about a particular place in a particular period. It does not transfer between settings, and the mode above records only what kind of travel the number is meant to represent, not where the number came from.',
    'Each junction carries remainingM, the budget left on arrival, and travelDirection. Those are what fix where the edge of the time falls between junctions, so a corridor drawn from these points cannot disagree with the budget or the direction used here.',
    origins.length===1?`This origin reached ${most} junction${most===1?'':'s'}.`:`Origins reached between ${fewest} and ${most} junctions each.`,
    'A junction can be unreached because it is too far or because the downloaded network stops short of it. The two look the same here.',
    'The walk from the site to its own junction (snapDistanceM, charged since 2026-10-14) comes out of the budget before any street is walked, so a site set back from the road reaches less of the network than one on it. An origin whose walk exceeds the whole budget reaches nothing.',
    `Street lengths come from the network as supplied (${network.source}) and are not re-measured here. If they are wrong, every distance and time above is wrong with them.`,
  ];
  if(offNetwork.length)notes.unshift(`${offNetwork.length} origin${offNetwork.length===1?'':'s'} reached the network across ground no street covers (`
    +offNetwork.map(u=>`${u.name}, ${Math.round(u.distanceM)} m`).join('; ')
    +`), charged as a straight line at the street speed. ${offNetwork.length===1?'That distance is':'Those distances are'} a lower bound on the real walk, so ${offNetwork.length===1?'this origin reaches':'these origins reach'} further here than on the ground.`);
  if(unconnected.length)notes.unshift(`${unconnected.length} origin${unconnected.length===1?'':'s'} reached NO junction: the walk to the network alone spends the ${budgetM.toFixed(0)} m budget (`
    +unconnected.map(u=>`${u.name}, ${Math.round(u.distanceM)} m`).join('; ')
    +`). ${unconnected.length===1?'It is':'They are'} absent from the result, and any count below is over the origins that reached something.`);
  if(input.features.length>origins.length)
    notes.push(`${input.features.length-origins.length} origin${input.features.length-origins.length===1?' without coordinates was':'s without coordinates were'} skipped.`);
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:reach>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:NetworkReachability, prov:Activity; `
    +`fw:originCount ${origins.length}; `
    +`fw:reachedNodeCount ${features.length}; `
    +`fw:travelBudgetMetres ${budgetM.toFixed(2)}; `
    +(unconnected.length?`fw:unconnectedSiteCount ${unconnected.length}; fw:unconnectedSites ${JSON.stringify(JSON.stringify(unconnected))}; `:'')
    +(offNetwork.length?`fw:offNetworkSiteCount ${offNetwork.length}; fw:offNetworkSites ${JSON.stringify(JSON.stringify(offNetwork))}; `:'')
    +`fw:travelBudgetMinutes ${minutes}; `
    +`fw:assumedSpeedMetresPerMinute ${speedMPerMin}; `
    +`fw:travelMode ${JSON.stringify(travelMode)}; `
    +`fw:travelDirection ${JSON.stringify(direction)}; `
    +`fw:edgeLengthSource ${JSON.stringify(network.source)}; `
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{type:'FeatureCollection',features,sourceNodeId:node.id,unconnected,offNetwork,
    sourceKind:'input-points',spatialReference:defaultSpatialReference(),
    sourceInfo:{format:'reachable-network-nodes',network:network.source,notes}} as PointCollection&{sourceNodeId:string},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Dijkstra over street lengths, ${direction}; budget ${budgetM.toFixed(0)} m from ${minutes} min at ${speedMPerMin} m/min (${travelMode}) over supplied street lengths. ${notes.slice(1).join(' ')}`}};
}
