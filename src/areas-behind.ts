import type {AreaValue} from './results.js';
import type {Boundary} from './types.js';
import {isPolygonPort} from './polygon-layers.js';
import {geometryBounds} from './study-area.js';

type Edge={from:string;to:string;port:string};
type Node={id:string;type:string;params:{inputMethod?:string;label?:string}};

/** THE STUDY AREAS BEHIND A MAP'S POLYGON LAYERS (the practitioner, 2026-11-22: "The study area is a requirement for the
 *  map unless it can query upstream that in fact two areas are connected"). Followed back from the map's polygon ports
 *  through Polygon layers that read their parts from study areas; nothing else is followed. One area is returned as it
 *  is; several as one area whose outline holds each one's polygons, named by theirs, so a point is inside where it is
 *  inside any of them. Undefined when no study area is found. */
export function areasBehindPolygons(workflow:{nodes:Node[];edges:Edge[]},mapId:string,values:Map<string,unknown>):AreaValue|undefined{
  const areas:AreaValue[]=[],seen=new Set<string>();
  const visit=(id:string)=>{
    if(seen.has(id))return;seen.add(id);
    const node=workflow.nodes.find(n=>n.id===id);if(!node)return;
    const value=values.get(id) as AreaValue|undefined;
    if(node.type==='study_area'){if(value?.boundary)areas.push(value);return;}
    if(node.type==='polygon_input'&&node.params.inputMethod==='areas')
      for(const e of workflow.edges.filter(e=>e.to===id))visit(e.from);
  };
  for(const e of workflow.edges.filter(e=>e.to===mapId&&isPolygonPort(e.port)))visit(e.from);
  if(areas.length<=1)return areas[0];
  const polygons=areas.flatMap(a=>a.boundary.type==='MultiPolygon'?a.boundary.coordinates:[a.boundary.coordinates]);
  const boundary:Boundary={type:'MultiPolygon',coordinates:polygons};
  const label=areas.length===2?`${areas[0].label} and ${areas[1].label}`:`${areas.slice(0,-1).map(a=>a.label).join(', ')} and ${areas.at(-1)!.label}`;
  const areaId=`urn:fieldwork:area:${mapId}:together`;
  const facts=`@prefix prov: <http://www.w3.org/ns/prov#>.\n<${areaId}> prov:wasDerivedFrom ${areas.map(a=>`<${a.areaId}>`).join(', ')}.\n`;
  return {kind:'study-area',areaId,geometryId:`${areaId}:geometry`,boundary,label,bounds:geometryBounds(boundary as never),
    areaFacts:areas.map(a=>a.areaFacts||'').join('')+facts,ready:areas.every(a=>a.ready!==false),
    units:areas.flatMap(a=>a.units??[]),source:'The study areas its polygon layers were read from',rows:[],centers:[]};
}
