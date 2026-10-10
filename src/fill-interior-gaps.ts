import type {Boundary,Position,WorkflowNode} from './types.js';
import type {Catchment,Polygons} from './catchments.js';
import {metric} from './catchments.js';
import {ringAreaM2} from './convex-hull.js';
import type {Receipt} from './results.js';

/** Each polygon replaced by its outer ring, so interior gaps become solid ground.
 *
 *  This is `isochrone`'s `fillHoles` as a step of its own, and it is what Advanced-1 NB03
 *  does: `new_iso = Polygon(new_iso.exterior)` (cell 64, the definition that produced the
 *  shapefiles NB04 reads — cell 94 redefines the function with a convex hull and never
 *  calls it).
 *
 *  **It makes the area larger, and the added ground was never computed as reached.** That
 *  is the whole operation, not a side effect, so both areas and the gap count are reported
 *  and the limitation travels in the notes. The monolith's own interface says it plainly:
 *  "Keep off for corridor coverage."
 *
 *  What a gap means depends on where the polygons came from, and this cannot know. In a
 *  corridor it is ground no street reached, and filling it is a cartographic choice. In an
 *  administrative boundary it would be a real enclave, and filling it would be a
 *  falsification. The carrier limits the damage: `donut_geomask` emits points, not
 *  polygons, so the one case where a hole *is* the operation cannot reach this port.
 *
 *  Takes no UTM zone, unlike the nine widgets that do. The input states the metric CRS its
 *  upstream used, so this reads it rather than asking again — a zone asked for twice is a
 *  zone that can be answered twice. */

export function utmFromCRS(crs:string):{zone:number;hemisphere:'north'|'south'}{
  const match=/^EPSG:(326|327)(\d\d)$/.exec(crs);
  if(!match)throw new Error(`These polygons state their coordinate system as ${crs||'nothing'}, which is not a UTM zone, so there is no metric basis for measuring what filling would add.`);
  const zone=Number(match[2]);
  if(zone<1||zone>60)throw new Error(`${crs} names UTM zone ${zone}, which does not exist.`);
  return {zone,hemisphere:match[1]==='326'?'north':'south'};
}

export function validateFillNode(node:WorkflowNode<'fill_interior_gaps'>):void{
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the step using 1–60 characters.');
}

const ringsOf=(geometry:Boundary):Position[][][]=>
  geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];

export function fillInteriorGaps(
  input:Polygons, node:WorkflowNode<'fill_interior_gaps'>, runId:string, sourceNodeId:string,
):{value:Polygons;receipt:Receipt}{
  validateFillNode(node);
  const parts=input.features.filter(f=>f.geometry);
  if(!parts.length)throw new Error('There are no polygons to fill.');
  const {zone,hemisphere}=utmFromCRS(input.crs);
  const projection=metric(zone,hemisphere);
  let gapsFilled=0,areaBefore=0,areaAfter=0;
  const features:Catchment[]=parts.map(f=>{
    const kept:Position[][][]=[];
    for(const rings of ringsOf(f.geometry)){
      const projected=rings.map(r=>r.map(p=>projection.forward(p)));
      areaBefore+=projected.reduce((net,ring,i)=>net+(i===0?ringAreaM2(ring):-ringAreaM2(ring)),0);
      areaAfter+=ringAreaM2(projected[0]);
      gapsFilled+=rings.length-1;
      kept.push([rings[0]]);
    }
    return {...structuredClone(f),
      geometry:{type:'MultiPolygon',coordinates:kept.map(rings=>rings.map(r=>[...r]))} as Boundary};
  });
  const addedM2=areaAfter-areaBefore;
  const notes=[
    gapsFilled
      ?`${gapsFilled} interior gap${gapsFilled===1?'':'s'} filled across ${parts.length} polygon${parts.length===1?'':'s'}, in ${projection.crs}.`
      :`No interior gaps to fill across ${parts.length} polygon${parts.length===1?'':'s'}; the geometry is unchanged apart from being returned as multipolygons.`,
    `The area went from ${areaBefore.toFixed(0)} m² to ${areaAfter.toFixed(0)} m², so ${addedM2.toFixed(0)} m² is now claimed that was not claimed before.`,
    'That added ground was never computed as covered. Whatever the gaps meant upstream — streets no route reached, land outside every radius — this asserts the opposite of it.',
    'Anything measuring or summarising these polygons afterwards counts the filled ground too. Use the unfilled polygons for coverage and these for a map that should read solid.',
    'Separate polygons stay separate. Gaps between polygons are not interior, so they are untouched: this fills enclosed space, it does not join things up.',
  ];
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:fill>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${activity} a fw:InteriorGapFill, prov:Activity; `
    +`fw:polygonCount ${parts.length}; `
    +`fw:gapsFilled ${gapsFilled}; `
    +`fw:areaBeforeSquareMetres ${areaBefore.toFixed(2)}; `
    +`fw:areaAfterSquareMetres ${areaAfter.toFixed(2)}; `
    +`fw:areaAddedSquareMetres ${addedM2.toFixed(2)}; `
    +`fw:metricCRS ${JSON.stringify(projection.crs)}; `
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value:{...structuredClone(input),features,
    method:`${input.method}; interior gaps filled by keeping outer rings`,
    notes:[...input.notes,...notes]},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Interior gap fill: outer rings kept, ${gapsFilled} gaps filled, ${addedM2.toFixed(0)} m² added in ${projection.crs}. ${notes.slice(2).join(' ')}`}};
}
