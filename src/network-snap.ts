import {metricCRSAssertion} from './metric-crs.js';
import type {PointCollection,PointFeature,Position,WorkflowNode} from './types.js';
import type {Network} from './catchments.js';
import {metric,validateNetwork,nearestNetworkNode} from './catchments.js';
import type {OffNetworkSite} from './catchments.js';
import {defaultSpatialReference} from './spatial-reference.js';
import type {Receipt} from './results.js';

/** Which network node each site attaches to, and how far that is from the site.
 *
 *  Extracted from `isochrone`, which does this before it does anything else and, until
 *  2026-10-14, threw the distance away: the walk from a clinic's door to the road was
 *  free in every network calculation this project performed. It is charged now, in both
 *  `isochrone` and `reachable_nodes`, and this node is where the displacement becomes a
 *  point attribute a practitioner can map, sort and argue with. Experiment 114.
 *
 *  That sentence was written on 2026-10-14 and was not TRUE until 2026-10-17: nothing in this
 *  application sorted a result table, so the attribute could be mapped and argued with and not
 *  ranked. `table_output` sorts now. The claim is kept because it is what this widget is for,
 *  with the date it became accurate recorded beside it.
 *
 *  Measured in metres, not degrees, for the reason the other seven widgets take a
 *  zone: a degree of longitude is not a degree of latitude, and nearest-in-degrees
 *  picks the wrong node away from the equator. */

export const MAX_SNAP_SITES=100;

const dist=(a:Position,b:Position)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

export function validateSnapNode(node:WorkflowNode<'snap_to_network'>):void{
  const {zone,hemisphere,maxSnapM}=node.params;
  if(!Number.isInteger(zone)||zone<1||zone>60||!['north','south'].includes(hemisphere))
    throw new Error('Choose a UTM zone from 1 to 60 and a hemisphere.');
  if(!Number.isFinite(maxSnapM)||maxSnapM<0||maxSnapM>1000)
    throw new Error('Use a snap limit from 0 to 1,000 metres.');
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the step using 1–60 characters.');
}

export function snapToNetwork(
  input:PointCollection, network:Network, node:WorkflowNode<'snap_to_network'>,
  runId:string, sourceNodeId:string,
):{value:PointCollection&{sourceNodeId:string};receipt:Receipt}{
  validateSnapNode(node);
  validateNetwork(network);
  const located=input.features.filter(f=>f.geometry);
  const unlocated=input.features.length-located.length;
  if(!located.length)throw new Error('Snapping needs at least one site with a known location.');
  if(located.length>MAX_SNAP_SITES)
    throw new Error(`Snapping handles up to ${MAX_SNAP_SITES} sites; this layer has ${located.length}.`);
  const projection=metric(node.params.zone,node.params.hemisphere);
  const coords=new Map(network.nodes.map(n=>[n.id,projection.forward(n.coordinates)]));
  const offNetwork:OffNetworkSite[]=[];
  const features:PointFeature[]=located.map((f):PointFeature=>{
    const origin=projection.forward(f.geometry!.coordinates as Position);
    // The same nearest-node search isochrone performs -- now literally the same function rather
    // than a copy kept identical by care. Factored 2026-10-17; see nearestNetworkNode.
    const {node:nearest,distanceM}=nearestNetworkNode(network.nodes,coords,origin);
    // ASSUMPTION, DEGRADING: see src/catchments.ts and experiment 114. A site beyond the limit
    // is snapped anyway and MARKED, not dropped. It threw until 2026-10-14 and was dropped for
    // the hours after that; both removed the sites furthest from a mapped road, which is where
    // OSM coverage is thinnest and where an access analysis is most often needed. What the limit
    // decides now is whether the point says its first leg crosses no street -- `offNetworkMetres`,
    // which travels with the point so a widget routing from here can repeat the caveat.
    const offNetworkMetres=distanceM>node.params.maxSnapM?Number(distanceM.toFixed(2)):undefined;
    if(offNetworkMetres!==undefined)offNetwork.push({siteId:String(f.id),name:String(f.properties.name),
      distanceM:offNetworkMetres,limitM:node.params.maxSnapM});
    // Where the site actually is, kept on the point that no longer stands there.
    //
    // Added 2026-10-14: snapping overwrites the geometry with the junction's, so until now the
    // only trace of the site's own position was a distance -- enough to say how far it moved,
    // not enough for anything downstream to draw the leg or undo the move. `reachable_corridor`
    // needs it to buffer the first segment of the route, which is what made the loss visible.
    const [siteLongitude,siteLatitude]=f.geometry!.coordinates as Position;
    return {...f,properties:{...f.properties,networkNodeId:nearest.id,
      snapDistanceM:Number(distanceM.toFixed(2)),siteLongitude,siteLatitude,
      ...(offNetworkMetres!==undefined?{offNetworkMetres}:{})},
      geometry:{type:'Point',coordinates:[...nearest.coordinates] as Position}};
  });
  const distances=features.map(f=>f.properties.snapDistanceM as number);
  const greatest=Math.max(...distances);
  const distinct=new Set(features.map(f=>f.properties.networkNodeId as string)).size;
  const notes=[
    `${features.length} site${features.length===1?'':'s'} snapped to ${distinct} network node${distinct===1?'':'s'}, measured in ${projection.crs}.`,
    `Each point now sits on the network, up to ${greatest.toFixed(1)} m from where the site actually is; the distance travels on the point as snapDistanceM.`,
    'The widgets that route from here charge that distance against their budget. Anything that reads these points without reading snapDistanceM treats a site 200 m from the road as if it were on it.',
    'Nearest is straight-line, not along the network: a node across a railway or a river can be the nearest one.',
  ];
  const shared=features.length-distinct;
  if(shared)notes.push(`${shared} site${shared===1?' shares':'s share'} a node with another, so they are indistinguishable to anything routed from here.`);
  if(offNetwork.length)notes.unshift(`${offNetwork.length} of ${located.length} site${located.length===1?'':'s'} ${offNetwork.length===1?'is':'are'} further than the ${node.params.maxSnapM} m snap limit from any node and reached the network across ground no street covers: `
    +offNetwork.map(u=>`${u.name} (${Math.round(u.distanceM)} m)`).join(', ')
    +`. ${offNetwork.length===1?'It carries':'They carry'} offNetworkMetres, and a straight line there assumes a walk that may not exist.`);
  if(unlocated)notes.push(`${unlocated} record${unlocated===1?' without coordinates was':'s without coordinates were'} not snapped and ${unlocated===1?'is':'are'} not in the result.`);
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:snap>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n`
    +`${activity} a fw:NetworkSnap, prov:Activity; `
    +`fw:siteCount ${features.length}; `
    +`fw:snappedNodeCount ${distinct}; `
    +`fw:greatestSnapDistanceMetres ${greatest.toFixed(2)}; `
    +`fw:snapLimitMetres ${node.params.maxSnapM}; `
    +(offNetwork.length?`fw:offNetworkSiteCount ${offNetwork.length}; fw:offNetworkSites ${JSON.stringify(JSON.stringify(offNetwork))}; `:'')
    +metricCRSAssertion(projection.crs)
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{type:'FeatureCollection',features,sourceNodeId:node.id,offNetwork,
    sourceKind:'input-points',spatialReference:defaultSpatialReference(),
    sourceInfo:{format:'network-snapped-points',network:network.source,notes}} as PointCollection&{sourceNodeId:string},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Nearest network node by straight-line distance in ${projection.crs}; limit ${node.params.maxSnapM} m. ${notes.slice(1).join(' ')}`}};
}
