import {metricCRSAssertion} from './metric-crs.js';
import type {PointCollection,PointFeature,Position,WorkflowNode} from './types.js';
import type {Network} from './catchments.js';
import {metric,validateNetwork} from './catchments.js';
import {defaultSpatialReference} from './spatial-reference.js';
import type {Receipt} from './results.js';

/** Which network node each site attaches to, and how far that is from the site.
 *
 *  Extracted from `isochrone`, which does this before it does anything else
 *  (`src/catchments.ts:75`) and then says in a note that the distance is "reported
 *  but not charged". The walk from a clinic's door to the road is free in every
 *  network calculation this project performs. On a node of its own the displacement
 *  is a point attribute a practitioner can map, sort and argue with.
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
  const features:PointFeature[]=located.map(f=>{
    const origin=projection.forward(f.geometry!.coordinates as Position);
    // Same nearest-node search isochrone performs, kept identical so the two agree.
    const nearest=network.nodes.reduce((a,b)=>
      dist(coords.get(a.id)!,origin)<=dist(coords.get(b.id)!,origin)?a:b);
    const distanceM=dist(coords.get(nearest.id)!,origin);
    if(distanceM>node.params.maxSnapM)
      throw new Error(`${f.properties.name}: the nearest network node is ${Math.round(distanceM)} m away, beyond the ${node.params.maxSnapM} m snap limit.`);
    return {...f,properties:{...f.properties,networkNodeId:nearest.id,
      snapDistanceM:Number(distanceM.toFixed(2))},
      geometry:{type:'Point',coordinates:[...nearest.coordinates] as Position}};
  });
  const distances=features.map(f=>f.properties.snapDistanceM as number);
  const greatest=Math.max(...distances);
  const distinct=new Set(features.map(f=>f.properties.networkNodeId as string)).size;
  const notes=[
    `${features.length} site${features.length===1?'':'s'} snapped to ${distinct} network node${distinct===1?'':'s'}, measured in ${projection.crs}.`,
    `Each point now sits on the network, up to ${greatest.toFixed(1)} m from where the site actually is; the distance travels on the point as snapDistanceM.`,
    'That distance is not charged to any later travel time. A site 200 m from the road is treated as if it were on it.',
    'Nearest is straight-line, not along the network: a node across a railway or a river can be the nearest one.',
  ];
  const shared=features.length-distinct;
  if(shared)notes.push(`${shared} site${shared===1?' shares':'s share'} a node with another, so they are indistinguishable to anything routed from here.`);
  if(unlocated)notes.push(`${unlocated} record${unlocated===1?' without coordinates was':'s without coordinates were'} not snapped and ${unlocated===1?'is':'are'} not in the result.`);
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:snap>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n`
    +`${activity} a fw:NetworkSnap, prov:Activity; `
    +`fw:siteCount ${features.length}; `
    +`fw:snappedNodeCount ${distinct}; `
    +`fw:greatestSnapDistanceMetres ${greatest.toFixed(2)}; `
    +`fw:snapLimitMetres ${node.params.maxSnapM}; `
    +metricCRSAssertion(projection.crs)
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{type:'FeatureCollection',features,sourceNodeId:node.id,
    sourceKind:'input-points',spatialReference:defaultSpatialReference(),
    sourceInfo:{format:'network-snapped-points',network:network.source,notes}} as PointCollection&{sourceNodeId:string},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Nearest network node by straight-line distance in ${projection.crs}; limit ${node.params.maxSnapM} m. ${notes.slice(1).join(' ')}`}};
}
