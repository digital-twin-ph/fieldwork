/** ROUTES AND FLOWS DRAWN ON A MAP, as pushpins are placed (2026-11-24).
 *
 *  The practitioner: *"we should add a feature like pushpins to point data. Users should be able to draw flows and
 *  routes on a map as they observe events on the ground"*, and, settling its shape: *"Pushpins are points, Routes
 *  and flows are lines."*
 *
 *  That symmetry is the specification, and it leaves almost nothing to invent. A pushpin is one click; a line is a
 *  sequence of them with an end. Everything else the pin editor already does — the map, the basemap, finding a
 *  place, full screen, undo — is reused rather than rebuilt.
 *
 *  DIRECTION IS THE ONE THING THAT IS NEW, and it costs nothing: a LineString is an ORDERED sequence, so the order
 *  of clicking already is the direction. It only has to be shown and reversible. This matters because a flow is
 *  defined by it — people moving from A to B, a referral, a transfer — and a flow drawn A→B that cannot be told
 *  from B→A is wrong half the time. `map-links.ts` gets direction for nothing, because infector-to-case is implied
 *  by the data it reads; a hand-drawn line has no data to imply it, so the editor carries it.
 *
 *  This module is the drawing itself, kept apart from the dialog so it can be checked without a browser. */
import type {LineLayer} from './types.js';

export type Vertex=[number,number];

/** A line while it is being drawn or after it is finished. `name` is the practitioner's. */
export interface DrawnLine {
  id:string;
  name:string;
  vertices:Vertex[];
}

/** The fewest positions a line can have. One click is a place, not a route. */
export const LINE_MINIMUM=2;
/** How many lines one layer drawn by hand will hold. Past this the map is the wrong instrument: a file is. */
export const DRAWN_LINE_LIMIT=200;

/** The next unused name of the form "Route 1", so a drawn line is never nameless and never collides. */
export function nextLineName(lines:readonly DrawnLine[],stem='Route'):string{
  const taken=new Set(lines.map(l=>l.name.trim()));
  for(let n=lines.length+1;;n++){const name=`${stem} ${n}`;if(!taken.has(name))return name;}
}

/** A vertex added to the line being drawn. Returns a new array: nothing is mutated under the caller. */
export function addVertex(vertices:readonly Vertex[],at:Vertex):Vertex[]{
  const last=vertices[vertices.length-1];
  // THE SAME PLACE TWICE IS ONE PLACE. A double click finishing a line would otherwise leave a zero-length
  // segment in it, which draws as nothing and counts as a position.
  if(last&&last[0]===at[0]&&last[1]===at[1])return [...vertices];
  return [...vertices,at];
}

/** FINISHING A LINE, or saying why it cannot be finished. A line of one position is refused rather than kept as a
 *  degenerate thing downstream has to handle. */
export function finishLine(lines:readonly DrawnLine[],vertices:readonly Vertex[],name?:string):
  {lines:DrawnLine[]}|{refused:string}{
  if(vertices.length<LINE_MINIMUM)
    return {refused:`A line needs ${LINE_MINIMUM} positions; this one has ${vertices.length}. Click the map again to continue it.`};
  if(lines.length>=DRAWN_LINE_LIMIT)
    return {refused:`This layer holds ${DRAWN_LINE_LIMIT} lines, which is as many as drawing one by one is good for. `
      +'Read the rest from a file instead.'};
  const given=name?.trim();
  return {lines:[...lines,{id:`drawn-${Date.now().toString(36)}-${lines.length+1}`,
    name:given||nextLineName(lines),vertices:[...vertices]}]};
}

/** THE SAME LINE, THE OTHER WAY ROUND. A flow drawn from the wrong end is reversed rather than drawn again. */
export const reverseLine=(line:DrawnLine):DrawnLine=>({...line,vertices:[...line.vertices].reverse()});

/** Where a line starts and where it ends, which is what the editor draws so the direction can be seen. */
export const endsOf=(line:DrawnLine):{from:Vertex;to:Vertex}|undefined=>
  line.vertices.length>=LINE_MINIMUM?{from:line.vertices[0]!,to:line.vertices[line.vertices.length-1]!}:undefined;

/** The drawn lines as the layer every other step takes. `source` says they were drawn, not read: a reader of the
 *  receipt must be able to tell an observation someone made from a file somebody published. */
export function drawnLayer(lines:readonly DrawnLine[]):LineLayer{
  return {kind:'lines',source:'drawn',
    features:lines.filter(l=>l.vertices.length>=LINE_MINIMUM).map(l=>({
      type:'Feature',id:l.id,properties:{name:l.name},
      geometry:{type:'LineString',coordinates:l.vertices.map(v=>[...v] as Vertex)}}))} as LineLayer;
}

/** The lines a saved layer holds, so a drawn layer can be opened and added to rather than started again. */
export function linesFromLayer(layer:LineLayer|undefined):DrawnLine[]{
  const out:DrawnLine[]=[];
  for(const f of layer?.features??[]){
    if(f.geometry.type!=='LineString')continue;
    out.push({id:String(f.id??`drawn-${out.length+1}`),name:String(f.properties?.name??nextLineName(out)),
      vertices:(f.geometry.coordinates as Vertex[]).map(v=>[v[0],v[1]] as Vertex)});
  }
  return out;
}
