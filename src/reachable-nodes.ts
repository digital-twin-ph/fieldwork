import type {PointCollection,PointFeature,Position,WorkflowNode} from './types.js';
import type {Network} from './catchments.js';
import type {OffNetworkSite,UnconnectedSite} from './catchments.js';
import {validateNetwork,metric,nearestNetworkNode} from './catchments.js';
import {defaultSpatialReference} from './spatial-reference.js';
import type {Receipt} from './results.js';
import {metricCRSAssertion} from './metric-crs.js';

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
 *  Takes no UTM zone WHILE IT IS ONLY ROUTING. The costs are the network's own `lengthM`
 *  values, supplied by whatever produced the network; nothing in the Dijkstra re-measures
 *  geometry, so there is nothing to project. The trade is that those lengths are taken
 *  entirely on trust.
 *
 *  **It also attaches origins to the network now, and that part does re-measure geometry.**
 *  Until 2026-10-17 this widget refused any origin without a `networkNodeId` and told the
 *  practitioner to add a `snap_to_network` step. That made a whole widget a prerequisite for
 *  one line of arithmetic, which is what the practitioner's D1 + D2 + D3 reading found:
 *  *"The snap to network is actually not needed if we follow the D1 + D2 + D3."*
 *
 *  So `zone`, `hemisphere` and `maxSnapM` are declared here, and they are **optional**. A
 *  degree of longitude is not a degree of latitude, so finding the nearest junction needs a
 *  metric frame -- but only for origins this widget has to attach itself. An origin arriving
 *  with a `networkNodeId` is used exactly as it arrives, no projection happens, and demanding a
 *  zone for a run that never projects anything would be asking for a figure the widget does not
 *  use. The zone is therefore refused at RUN time, naming the origins that needed it, rather
 *  than required at edit time. That is also why no migration rewrites saved workflows: a saved
 *  `reachable_nodes` node is fed snapped points, and nothing about it changed.
 *
 *  Attaching here does NOT move the point. `snap_to_network` overwrites the geometry with the
 *  junction's and carries the site's real position in shadow attributes; this reads the nearest
 *  junction, charges the distance, and leaves the origin where it stands. */

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
  // Optional, and each checked ONLY ON ITS OWN. An unset zone is not an error here, and neither
  // is half a pair: the Inspector sets one field at a time, so demanding both together made the
  // pair unsettable through the UI -- the first edit was refused and rolled back before the
  // second could be made. Found by the browser test on 2026-10-17. Completeness is a run-time
  // question, asked only when an origin turns up that this step has to attach itself, and the
  // run names those origins. What is checked here is that a declared value is a usable one.
  const {zone,hemisphere,maxSnapM}=node.params;
  if(zone!==undefined&&(!Number.isInteger(zone)||zone<1||zone>60))
    throw new Error('Choose a UTM zone from 1 to 60, or leave it unset and snap the sites before this step.');
  if(hemisphere!==undefined&&!['north','south'].includes(hemisphere))
    throw new Error('Choose a hemisphere, north or south, or leave it unset.');
  if(maxSnapM!==undefined&&(!Number.isFinite(maxSnapM)||maxSnapM<0||maxSnapM>1000))
    throw new Error('Use a snap limit from 0 to 1,000 metres.');
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
  const {zone,hemisphere,maxSnapM}=node.params;

  /** Where each origin joins the network, and what the first leg costs.
   *
   *  Two ways in, and they must not disagree. An origin that arrives with a `networkNodeId` was
   *  attached by `snap_to_network` and is taken exactly as it arrives -- the same junction, the
   *  same `snapDistanceM`, the same `offNetworkMetres`. One that does not is attached here, by
   *  the same `nearestNetworkNode` search over the same projection, so the two paths agree by
   *  construction rather than by two implementations being kept alike. */
  const unsnapped=origins.filter(f=>typeof f.properties.networkNodeId!=='string'||!f.properties.networkNodeId);
  if(unsnapped.length&&(zone===undefined||hemisphere===undefined))
    throw new Error(`${unsnapped.length} origin${unsnapped.length===1?'':'s'} ${unsnapped.length===1?'is':'are'} not on the network yet: `
      +unsnapped.slice(0,3).map(f=>String(f.properties.name)).join(', ')+(unsnapped.length>3?`, and ${unsnapped.length-3} more`:'')
      +'. Set this step\u2019s UTM zone and hemisphere so it can find the nearest junction, or snap the sites before this step. '
      +'Nearest has to be measured in metres: a degree of longitude is not a degree of latitude, and nearest-in-degrees picks the wrong junction away from the equator.');
  const projection=unsnapped.length?metric(zone as number,hemisphere as 'north'|'south'):null;
  const projected=projection?new Map(network.nodes.map(n=>[n.id,projection.forward(n.coordinates)])):null;
  // Absent limit means no limit: every origin attaches, and none is marked as having crossed
  // unmapped ground. The same degrading assumption snap_to_network settled on -- a site beyond
  // the limit is attached anyway and MARKED, never dropped, because the sites furthest from a
  // mapped road are where OSM coverage is thinnest and where access analysis is most needed.
  const limitM=Number.isFinite(maxSnapM)?maxSnapM as number:Infinity;

  interface Attachment {nodeId:string; spentM:number; offNetworkMetres?:number; site?:Position; attachedHere:boolean}
  const attachment=new Map<PointFeature,Attachment>();
  for(const f of origins){
    const id=f.properties.networkNodeId;
    if(typeof id==='string'&&id){
      if(!known.has(id))
        throw new Error(`${f.properties.name}: network node ${id} is not in this network. The sites were snapped to a different network.`);
      const d1=Number(f.properties.snapDistanceM),off=Number(f.properties.offNetworkMetres);
      const site=Number.isFinite(Number(f.properties.siteLongitude))
        ?[Number(f.properties.siteLongitude),Number(f.properties.siteLatitude)] as Position:undefined;
      attachment.set(f,{nodeId:id,spentM:Number.isFinite(d1)&&d1>0?d1:0,
        ...(Number.isFinite(off)&&off>0?{offNetworkMetres:off}:{}),...(site?{site}:{}),attachedHere:false});
      continue;
    }
    const here=f.geometry!.coordinates as Position;
    const {node:nearest,distanceM}=nearestNetworkNode(network.nodes,projected!,projection!.forward(here));
    const metres=Number(distanceM.toFixed(2));
    attachment.set(f,{nodeId:nearest.id,spentM:metres,
      ...(metres>limitM?{offNetworkMetres:metres}:{}),site:[...here] as Position,attachedHere:true});
  }
  const attachedHere=origins.filter(f=>attachment.get(f)!.attachedHere);
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
    const joined=attachment.get(origin)!;
    const originNode=joined.nodeId;
    // D1 is charged here too, so this chain and the monolithic isochrone agree. `snap_to_network`
    // attaches `snapDistanceM` to every point it moves -- the walk from where the site stood to
    // the junction it was snapped to -- and the budget pays for it before any street is walked.
    //
    // Seeding the origin at 0 was the same defect catchments.ts carried: the displacement was
    // measured, attached and published, and then nothing spent it. The parity tests between this
    // chain and the monolith are what caught it, by failing when only one of the two was fixed.
    // A site that moved further than the whole budget reaches nothing, which is the honest answer
    // rather than a negative remainder. Experiment 114.
    const spent=joined.spentM;
    const costs=spent>=budgetM?new Map<string,number>():costsWithin(adjacency,originNode,budgetM,spent);
    if(!costs.size)unconnected.push({siteId:String(origin.id),name:String(origin.properties.name),
      distanceM:Number(spent.toFixed(2)),budgetM:Number(budgetM.toFixed(2))});
    const offNetworkMetres=joined.offNetworkMetres;
    if(offNetworkMetres!==undefined)
      offNetwork.push({siteId:String(origin.id),name:String(origin.properties.name),
        distanceM:offNetworkMetres,limitM:Number.isFinite(limitM)?limitM:offNetworkMetres});
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
          ...(joined.site?{
            originLongitude:joined.site[0],
            originLatitude:joined.site[1],
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
  // Which origins this step attached itself, and in what frame. A reader has to be able to tell
  // a junction chosen upstream from one chosen here, because the two were chosen by the same
  // search but under different parameters, and only one of them is recorded on this node.
  if(attachedHere.length)notes.unshift(`${attachedHere.length} of ${origins.length} origin${origins.length===1?'':'s'} `
    +`${attachedHere.length===1?'was':'were'} attached to the network by this step, nearest junction by straight-line distance in ${projection!.crs}`
    +`${Number.isFinite(limitM)?`, snap limit ${limitM} m`:', with no snap limit set, so none is marked as having crossed unmapped ground'}. `
    +`Nearest is straight-line, not along the network: a junction across a railway or a river can be the nearest one. `
    +`The point is not moved \u2014 it keeps its own position, and the distance to its junction is charged against the budget.`);
  if(origins.length>attachedHere.length&&attachedHere.length)
    notes.unshift(`${origins.length-attachedHere.length} origin${origins.length-attachedHere.length===1?'':'s'} arrived already snapped and ${origins.length-attachedHere.length===1?'was':'were'} used as supplied, so this result mixes two attachments made under different settings.`);
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
    // Deliberately NOT the snap widget's site-count and snap-limit properties. Both are domained
    // to that widget's own activity class, so asserting them here would cross a declared domain,
    // and its site count means every site it moved where this means only the origins attached
    // HERE. The coupling gate caught the undeclared pair on 2026-10-17, which is what it is for;
    // writing the other widget's class name in this comment then failed the gate a second time,
    // because it reads asserted terms out of the source text and a prefixed name in prose looks
    // exactly like one. Named without the prefix for that reason.
    +(attachedHere.length?`fw:attachedOriginCount ${attachedHere.length}; `
      +(Number.isFinite(limitM)?`fw:attachmentLimitMetres ${limitM}; `:'')
      +metricCRSAssertion(projection!.crs):'')
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{type:'FeatureCollection',features,sourceNodeId:node.id,unconnected,offNetwork,
    sourceKind:'input-points',spatialReference:defaultSpatialReference(),
    sourceInfo:{format:'reachable-network-nodes',network:network.source,notes}} as PointCollection&{sourceNodeId:string},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Dijkstra over street lengths, ${direction}; budget ${budgetM.toFixed(0)} m from ${minutes} min at ${speedMPerMin} m/min (${travelMode}) over supplied street lengths. ${notes.slice(1).join(' ')}`}};
}
