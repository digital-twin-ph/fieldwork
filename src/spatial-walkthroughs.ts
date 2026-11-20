/** FOUR AREA STEPS SHOWN ON MADE-UP SHAPES (2026-11-20). The practitioner, moving Area around a point, Buffer study area,
 *  Calculate area and Clip polygons to the standard: *"we can also opportunistically include the show me how animation during the
 *  standardization."* The table walkthroughs' player (table-walkthrough.ts) draws each step; here the shapes are fixed in
 *  the code, near the equator so a degree is close to a degree each way, and never read from a port. Each walkthrough's
 *  last step is the result the step's own function makes from these shapes, so it cannot show what the step does not do. */
import type {Boundary,Position,WorkflowNode,PointCollection} from './types.js';
import type {Walkthrough,WalkStep} from './table-walkthrough.js';
import {bufferPoint,BUFFER_POINT_STEPS} from './buffer-point.js';
import {bufferedBoundary} from './area-buffer.js';
import {calculateArea,formatArea,AREA_METHOD,AREA_UNITS} from './area-computation.js';
import {clipPolygons,type Polygons} from './catchments.js';
import type {AreaUnit} from './types.js';

type Kind='input'|'area'|'look'|'result'|'gone';
interface Shape {kind:Kind;rings?:Position[][][];point?:Position;label?:string;at?:Position}
const KEY:Record<Kind,string>={input:'Grey outline: what the step is given',area:'Dashed outline: the area it works within',
  look:'Thick outline: what this step looks at',result:'Filled: what the step makes',gone:'Faint: left out'};

/** The shapes drawn in a 360 by 240 box, longitude across and latitude up, at the scale of the widest shape. */
function draw(shapes:Shape[],label:string):{svg:string;key:string[]}{
  const all=shapes.flatMap(s=>[...(s.rings??[]).flat(2),...(s.point?[s.point]:[])]);
  const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
  const w=Math.min(...xs),e=Math.max(...xs),south=Math.min(...ys),n=Math.max(...ys);
  const scale=Math.min(320/((e-w)||1e-3),200/((n-south)||1e-3));
  const x=(lon:number)=>20+(lon-w)*scale+(320-(e-w)*scale)/2,y=(lat:number)=>20+(n-lat)*scale+(200-(n-south)*scale)/2;
  const path=(rings:Position[][][])=>rings.map(poly=>poly.map(r=>'M'+r.map(p=>`${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('L')+'Z').join(' ')).join(' ');
  const body=shapes.map(s=>s.rings
    ?`<path class="walk-shape walk-shape-${s.kind}" d="${path(s.rings)}" fill-rule="evenodd"/>`
    :s.point?`<circle class="walk-shape walk-shape-${s.kind} walk-point" cx="${x(s.point[0]).toFixed(1)}" cy="${y(s.point[1]).toFixed(1)}" r="5"/>`:'').join('')
    +shapes.filter(s=>s.label).map(s=>{const at=s.at??s.point??s.rings![0]![0]![0]!;
      return `<text class="walk-shape-label" x="${(x(at[0])+8).toFixed(1)}" y="${(y(at[1])-8).toFixed(1)}">${s.label!.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!))}</text>`;}).join('');
  const kinds=[...new Set(shapes.map(s=>s.kind))];
  return {svg:`<svg class="walk-drawing" viewBox="0 0 360 240" role="img" aria-label="${label}">${body}</svg>`,key:kinds.map(k=>KEY[k])};
}
const ring=(points:Position[]):Position[][][]=>[[[...points,points[0]!]]];
const partsOf=(g:Boundary):Position[][][]=>g.type==='MultiPolygon'?g.coordinates as Position[][][]:[g.coordinates as Position[][]];
const step=(text:string,shapes:Shape[],final=false):WalkStep=>({text,marks:[],figure:draw(shapes,text),...(final?{final:true}:{})});
const metres=(m:number)=>`${m.toLocaleString('en')} m`;
/** The dialog's distance, or 500 m where it is not one a step accepts, said in the walkthrough. */
const usable=(m:number,max:number)=>Number.isFinite(m)&&m>0&&m<=max?m:500;

const WELL:Position=[30,-1];
export function bufferPointWalkthrough(distanceM:number):Walkthrough{
  const d=usable(distanceM,5000);
  const points:PointCollection={type:'FeatureCollection',features:[{type:'Feature',id:'Well A',properties:{name:'Well A'},geometry:{type:'Point',coordinates:WELL}}]};
  const node={id:'walk',type:'buffer_point',x:0,y:0,params:{label:'Walk',pointId:'Well A',distanceM:d}} as WorkflowNode<'buffer_point'>;
  const made=bufferPoint(points,node,'walkthrough').value.boundary;
  const edge:Position=[WELL[0]+d/111320,WELL[1]];
  return {title:'Area around a point, step by step',tables:[],resultColumns:[],steps:[
    step('The point the area is drawn around: Well A, chosen by its name. One point, never several.',[{kind:'look',point:WELL,label:'Well A'}]),
    step(`Everything within ${metres(d)} of it, in every direction${d!==distanceM?' (shown with 500 m, because the distance set is not one the step accepts)':''}.`,
      [{kind:'input',point:WELL,label:'Well A'},{kind:'look',rings:[[[WELL,edge,WELL]]],label:metres(d),at:[(WELL[0]+edge[0])/2,WELL[1]]}]),
    step(`The step draws that as a polygon of ${4*BUFFER_POINT_STEPS} sides, ${BUFFER_POINT_STEPS} to each quarter, and it becomes the study area: `
      +`${formatArea(calculateArea(made,'km2'))}.`,[{kind:'result',rings:partsOf(made)},{kind:'input',point:WELL,label:'Well A'}],true)]};
}

const DISTRICT:Position[]=[[30,-1],[30.02,-0.995],[30.03,-1.01],[30.015,-1.025],[29.998,-1.018]];
export function bufferAreaWalkthrough(distanceM:number):Walkthrough{
  const d=usable(distanceM,50000);
  const district:Boundary={type:'Polygon',coordinates:ring(DISTRICT)[0]!};
  const made=bufferedBoundary(district,d);
  const before=calculateArea(district,'km2'),after=calculateArea(made,'km2');
  return {title:'Buffer study area, step by step',tables:[],resultColumns:[],steps:[
    step('The study area it is given: one made-up district.',[{kind:'look',rings:partsOf(district),label:'District'}]),
    step(`Every place within ${metres(d)} of its edge, outside it${d!==distanceM?' (shown with 500 m, because the distance set is not one the step accepts)':''}. `
      +'The distance is measured in metres on the ground, not in degrees.',[{kind:'area',rings:partsOf(made)},{kind:'look',rings:partsOf(district),label:'District'}]),
    step(`The district and that band together are the new study area: ${formatArea(after)}, against ${formatArea(before)} before.`,
      [{kind:'result',rings:partsOf(made)},{kind:'input',rings:partsOf(district),label:'District'}],true)]};
}

export function measureAreaWalkthrough(unit:AreaUnit):Walkthrough{
  const district:Boundary={type:'Polygon',coordinates:ring(DISTRICT)[0]!};
  const measured=calculateArea(district,unit);
  return {title:'Calculate area, step by step',tables:[],resultColumns:[],steps:[
    step('The study area it is given: one made-up district.',[{kind:'look',rings:partsOf(district),label:'District'}]),
    step(`Its area is measured on the curved Earth, not on the flat map: ${AREA_METHOD}.`,[{kind:'look',rings:partsOf(district),label:'District'}]),
    step(`The step passes the same area on, with its size attached, in ${AREA_UNITS[unit].label}: ${formatArea(measured)}.`,
      [{kind:'result',rings:partsOf(district),label:formatArea(measured)}],true)]};
}

const AREA:Position[]=[[30,-1],[30.04,-1],[30.04,-1.03],[30,-1.03]];
const UNITS:{name:string;ring:Position[]}[]=[
  {name:'Inside',ring:[[30.005,-1.005],[30.015,-1.005],[30.015,-1.015],[30.005,-1.015]]},
  {name:'Across',ring:[[30.03,-1.015],[30.05,-1.015],[30.05,-1.027],[30.03,-1.027]]},
  {name:'Outside',ring:[[30.05,-0.997],[30.06,-0.997],[30.06,-1.007],[30.05,-1.007]]}];
export function clipPolygonsWalkthrough():Walkthrough{
  const area:Boundary={type:'Polygon',coordinates:ring(AREA)[0]!};
  const input={features:UNITS.map(u=>({type:'Feature',properties:{name:u.name},geometry:{type:'Polygon',coordinates:ring(u.ring)[0]!}})),
    sites:[],method:'',crs:'CRS84',notes:[]} as unknown as Polygons;
  const clipped=clipPolygons(input,area);
  const kept=(name:string)=>clipped.features.find(f=>(f.properties as {name?:string}).name===name)?.geometry as Boundary|undefined;
  const shape=(name:string)=>ring(UNITS.find(u=>u.name===name)!.ring);
  const across=kept('Across');
  return {title:'Clip polygons, step by step',tables:[],resultColumns:[],steps:[
    step('Three made-up units and the study area they are clipped to.',[{kind:'area',rings:ring(AREA)},...UNITS.map(u=>({kind:'input' as const,rings:ring(u.ring),label:u.name}))]),
    step(`"Inside" lies wholly within the area: it is kept as it is.`,[{kind:'area',rings:ring(AREA)},{kind:'look',rings:shape('Inside'),label:'Inside'},{kind:'input',rings:shape('Across'),label:'Across'},{kind:'input',rings:shape('Outside'),label:'Outside'}]),
    step(`"Across" crosses the area's edge: it is cut along the edge, and only the part inside is kept.`,[{kind:'area',rings:ring(AREA)},{kind:'look',rings:shape('Across'),label:'Across'},...(across?[{kind:'result' as const,rings:partsOf(across)}]:[])]),
    step(`"Outside" does not meet the area: nothing of it is inside, so it is left out.`,[{kind:'area',rings:ring(AREA)},{kind:'gone',rings:shape('Outside'),label:'Outside'}]),
    step(`What the step passes on: ${clipped.features.length} of 3 units, each cut to the area.`,
      [{kind:'area',rings:ring(AREA)},...clipped.features.map(f=>({kind:'result' as const,rings:partsOf(f.geometry as Boundary),label:(f.properties as {name?:string}).name??''}))],true)]};
}
