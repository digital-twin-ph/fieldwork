/** FOUR AREA STEPS SHOWN ON MADE-UP SHAPES (2026-11-20). The practitioner, moving Area around a point, Buffer study area,
 *  Calculate area and Clip polygons to the standard: *"we can also opportunistically include the show me how animation during the
 *  standardization."* The table walkthroughs' player (table-walkthrough.ts) draws each step; here the shapes are fixed in
 *  the code, near the equator so a degree is close to a degree each way, and never read from a port. Each walkthrough's
 *  last step is the result the step's own function makes from these shapes, so it cannot show what the step does not do. */
import type {Boundary,Position,WorkflowNode,PointCollection} from './types.js';
import type {Walkthrough,WalkStep} from './table-walkthrough.js';
import {bufferPoint,BUFFER_POINT_STEPS} from './buffer-point.js';
import {calculateArea,formatArea,AREA_METHOD,AREA_UNITS} from './area-computation.js';
import {clipPolygons,type Polygons} from './catchments.js';
import type {AreaUnit} from './types.js';
import {joinTableToAreas} from './area-join.js';

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
const step=(text:string,shapes:Shape[],final=false,marks:WalkStep['marks']=[]):WalkStep=>({text,marks,figure:draw(shapes,text),...(final?{final:true}:{})});
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

/** JOIN A TABLE TO THE STUDY AREA, on three made-up parts and a table of three rows (2026-11-20). One row matches as it is,
 *  one only once punctuation is set aside, one names no part, and one part has no row; the last step is what the join
 *  itself makes of them, under the matching chosen in the dialog. */
// THE PARTS DRAWN AS ADMINISTRATIVE UNITS (2026-11-21, the practitioner: "Can we make the study area in an example look
// like an admin boundary?"): three districts sharing uneven borders, a river between the two above and Riverside below.
const V:Record<string,Position>={A:[30,-1.002],B:[30.008,-0.999],C:[30.017,-1.001],D:[30.026,-0.998],E:[30.035,-1.003],
  F:[30.041,-1.007],F2:[30.043,-1.011],G:[30.04,-1.014],L:[29.998,-1.007],W:[30.001,-1.012],R1:[30.006,-1.014],R2:[30.011,-1.011],
  M1:[30.019,-1.006],M2:[30.016,-1.01],J:[30.02,-1.013],R3:[30.027,-1.015],R4:[30.033,-1.012],
  S1:[30.042,-1.02],S2:[30.034,-1.026],S3:[30.022,-1.024],S4:[30.012,-1.027],S5:[30.003,-1.023],S6:[29.999,-1.017]};
const at=(...k:string[])=>k.map(x=>V[x]!);
const PARTS:{id:string;name:string;ring:Position[];at:Position}[]=[
  {id:'p1',name:'North',ring:at('A','B','C','M1','M2','J','R2','R1','W','L'),at:[30.002,-1.0085]},
  {id:'p2',name:'St. Mary',ring:at('C','D','E','F','F2','G','R4','R3','J','M2','M1'),at:[30.022,-1.0085]},
  {id:'p3',name:'Riverside',ring:at('W','R1','R2','J','R3','R4','G','S1','S2','S3','S4','S5','S6'),at:[30.006,-1.02]}];
const ROWS:{name:string;cases:number}[]=[{name:'north',cases:12},{name:'St Mary',cases:30},{name:'Lakeside',cases:5}];
export function joinTableWalkthrough(normalisation:'exact'|'fuzzy'):Walkthrough{
  const table={kind:'data-table',keys:['name'],valueField:'cases',rows:ROWS.map(r=>({key:{name:r.name},value:r.cases})),
    rowCount:ROWS.length,missingValueCount:0} as unknown as import('./data-table.js').DataTable;
  const joined=joinTableToAreas(PARTS.map(({id,name})=>({id,name})),table,{keyField:'name',normalisation});
  const part=(name:string)=>joined.parts.find(p=>p.name===name)!;
  const shape=(name:string)=>ring(PARTS.find(p=>p.name===name)!.ring);
  // A part already joined stays drawn as joined, so the join is seen building up step by step (the practitioner,
  // 2026-11-21: "once a row and feature get joined, the shading should remain").
  const filled=(name:string,value:number):Shape=>({kind:'result',rings:shape(name),label:`${name} · ${value}`,at:PARTS.find(p=>p.name===name)!.at});
  const all=(look?:string,kind:Kind='look',done:Shape[]=[]):Shape[]=>[...PARTS.filter(p=>!done.some(d=>d.label?.startsWith(p.name+' ·'))).map(p=>
    ({kind:p.name===look?kind:'input' as Kind,rings:ring(p.ring),label:p.name,at:p.at})),...done];
  const mary=part('St. Mary').matched;
  // THE TWO TABLES JOINED (2026-11-21): the study area's own table of parts, and the table brought to it, each step
  // marking its rows in words. The practitioner: "The study area geometry also has a table which is what is being joined".
  const gets=(row:number,value:number)=>({table:0,row,state:'matched' as const,word:`gets ${value}`});
  const empty=(row:number)=>({table:0,row,state:'unmatched' as const,word:'no row names it'});
  const onto=(row:number,name:string)=>({table:1,row,state:'matched' as const,word:`onto ${name}`});
  const none=(row:number)=>({table:1,row,state:'unmatched' as const,word:'names no part'});
  const maryMarks=mary?[gets(1,30),onto(1,'St. Mary')]:[empty(1),none(1)],northMarks=[gets(0,12),onto(0,'North')];
  const north=[filled('North',12)],both=[...north,...(mary?[filled('St. Mary',30)]:[])];
  return {title:'Join a table to the study area, step by step',
    tables:[{label:"The study area's parts",columns:['id','name'],rows:PARTS.map(p=>[p.id,p.name])},
      {label:'The table',columns:['name','cases'],rows:ROWS.map(r=>[r.name,String(r.cases)])}],resultColumns:[],steps:[
    step('Two tables: the study area\'s three parts, each with its id and name, and a table of three rows: north 12, St Mary 30, Lakeside 5. The join matches the table\'s "name" to each part\'s name.',all()),
    step('"north" names North: the names are compared with capitals set aside, so the row’s 12 goes onto North.',all(undefined,'look',north),false,northMarks),
    step(mary?'"St Mary" names St. Mary once the full stop is set aside, as the matching chosen does: its 30 goes onto St. Mary.'
      :'"St Mary" is not "St. Mary" written exactly, as the matching chosen requires: the row names no part, and St. Mary stays empty.',
      all('St. Mary',mary?'look':'gone',both),false,[...northMarks,...maryMarks]),
    step('"Lakeside" names no part of this area: the row is left out, and listed as naming no part.',all(undefined,'look',both),false,[...northMarks,...maryMarks,none(2)]),
    step('No row names Riverside: it is drawn, and left empty, rather than left out of the map.',all('Riverside','gone',both),false,[...northMarks,...maryMarks,none(2),empty(2)]),
    step(`What the step passes on: ${joined.counts.matchedParts} of 3 parts with a value, ${joined.counts.unmatchedRows} row naming no part.`,
      joined.parts.map(p=>({kind:p.matched?'result' as const:'gone' as const,rings:shape(p.name),label:p.matched?`${p.name} · ${p.value}`:`${p.name} · empty`,at:PARTS.find(x=>x.name===p.name)!.at})),
      true,[...northMarks,...maryMarks,none(2),empty(2)])]};
}
