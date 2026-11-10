/** A LINE FROM EACH POINT TO THE POINT IT NAMES (experiment 200, step 4).
 *
 *  The practitioner, 2026-11-09, asking whether a map draws a contact tracing network. No map in Fieldwork drew a line
 *  between two records. This one does, per point layer: each record names another record of the same layer in one
 *  column (Hagelloch's `infector`), found by another column (`case_ID`), and a line runs from the named record to the
 *  one naming it. So the direction reads as transmission does: infector to case.
 *
 *  Both columns are nominated; neither is guessed from its name. Nothing is dropped silently. Every record of the layer
 *  is one of these, and each is counted:
 *
 *  - drawn: both ends found and placed, at different places;
 *  - at the same place: both ends found and placed at one point, so the line has no length. Hagelloch's houses hold
 *    several children each, and 90 of its 184 links join two children of one house. They are counted and said, never
 *    drawn as a line nobody can see;
 *  - names nothing: the column is blank;
 *  - names a record the layer does not hold;
 *  - names itself;
 *  - names an id that more than one record holds, so which one is meant cannot be read;
 *  - names a record that has no location, or has none itself. */
import type {Position} from 'geojson';
import {generationColours} from './presentation.js';

export interface LinkSetting {column:string; matches:string}
/** `from` is the named record's row id, `to` the naming one's: the line runs from → to. */
export interface MapLink {sourceNodeId:string; from:string; to:string;
  /** The generation of the record naming, the tree's count: 1 for a record that starts a chain. Absent in a loop. */
  generation?:number}
export interface LinkCounts {column:string; matches:string; records:number; drawn:number; sameLocation:number;
  noValue:number; notFound:number; self:number; ambiguous:number; unlocated:number}

interface LinkRow {id:string; sourceNodeId:string; coordinates:Position|null; attributes:Record<string,unknown>}

const text=(v:unknown)=>v===null||v===undefined?'':String(v).trim();

export function mapLinks(rows:readonly LinkRow[],settings:Record<string,LinkSetting>):{links:MapLink[];counts:Record<string,LinkCounts>}{
  const links:MapLink[]=[],counts:Record<string,LinkCounts>={};
  for(const [source,setting] of Object.entries(settings)){
    if(!setting?.column||!setting.matches)continue;
    const layer=rows.filter(r=>r.sourceNodeId===source);
    const byId=new Map<string,LinkRow[]>();
    for(const r of layer){const id=text(r.attributes[setting.matches]);if(id)(byId.get(id)??byId.set(id,[]).get(id)!).push(r);}
    const c:LinkCounts={column:setting.column,matches:setting.matches,records:layer.length,
      drawn:0,sameLocation:0,noValue:0,notFound:0,self:0,ambiguous:0,unlocated:0};
    for(const r of layer){
      const named=text(r.attributes[setting.column]);
      if(!named){c.noValue++;continue;}
      const found=byId.get(named);
      if(!found){c.notFound++;continue;}
      if(found.length>1){c.ambiguous++;continue;}
      const target=found[0]!;
      if(target.id===r.id){c.self++;continue;}
      if(!target.coordinates||!r.coordinates){c.unlocated++;continue;}
      if(target.coordinates[0]===r.coordinates[0]&&target.coordinates[1]===r.coordinates[1]){c.sameLocation++;continue;}
      c.drawn++;links.push({sourceNodeId:source,from:target.id,to:r.id});
    }
    // THE GENERATION OF EACH RECORD, counted as the transmission tree counts it: 1 where the chain starts (a record
    // naming nothing, itself, or one the layer cannot tell), one more than the record named otherwise. A record in a
    // loop has none. So a line here and the tree's line into the same case are one colour.
    const parentOf=new Map<string,string>();
    for(const r of layer){const named=text(r.attributes[setting.column]);const found=named?byId.get(named):undefined;
      if(found&&found.length===1&&found[0]!.id!==r.id)parentOf.set(r.id,found[0]!.id);}
    const generation=new Map<string,number|null>();
    const generationOf=(id:string,seen=new Set<string>()):number|null=>{
      if(generation.has(id))return generation.get(id)!;
      if(seen.has(id))return null;seen.add(id);
      const parent=parentOf.get(id);
      const g=parent===undefined?1:(()=>{const up=generationOf(parent,seen);return up===null?null:up+1;})();
      generation.set(id,g);return g;
    };
    for(const link of links)if(link.sourceNodeId===source){const g=generationOf(link.to);if(g!==null)link.generation=g;}
    counts[source]=c;
  }
  return {links,counts};
}

const n=(v:number,one:string,many=one+'s')=>`${v.toLocaleString('en-US')} ${v===1?one:many}`;

/** What the lines on one layer show, and what they leave out, in one sentence. */
export function linkSentence(c:LinkCounts,layer:string):string{
  const linked=c.drawn+c.sameLocation;
  const rest=[
    c.sameLocation?`${n(c.sameLocation,'link')} ${c.sameLocation===1?'joins':'join'} two records at the same place, so ${c.sameLocation===1?'it has':'they have'} no length and ${c.sameLocation===1?'is':'are'} counted rather than drawn`:'',
    c.noValue?`${n(c.noValue,'record')} ${c.noValue===1?'names':'name'} nothing in ${c.column}`:'',
    c.notFound?`${n(c.notFound,'record')} ${c.notFound===1?'names':'name'} a ${c.matches} the layer does not hold`:'',
    c.self?`${n(c.self,'record')} ${c.self===1?'names itself':'name themselves'}`:'',
    c.ambiguous?`${n(c.ambiguous,'record')} ${c.ambiguous===1?'names':'name'} a ${c.matches} held by more than one record`:'',
    c.unlocated?`${n(c.unlocated,'link')} ${c.unlocated===1?'has an end':'have an end'} with no location`:'',
  ].filter(Boolean);
  return `${layer}: ${n(c.drawn,'line')} from the record named in ${c.column}, found by ${c.matches}, to the record naming it`
    +` (${n(linked,'link')} found among ${n(c.records,'record')})`
    +(rest.length?`. ${rest.join('; ')}.`:'.');
}

/** The lines as SVG, under the marks. `project` is the figure's own; a hidden layer hides its lines. */
export function linkLinesSvg(links:readonly MapLink[],rows:readonly {id:string;coordinates:Position|null}[],
  project:(c:Position)=>[number,number]|number[],hidden?:ReadonlySet<string>,markRadius=4):string{
  if(!links.length)return '';
  const at=new Map(rows.map(r=>[r.id,r.coordinates]));
  const deepest=Math.max(1,...links.map(l=>l.generation??1));
  const colours=generationColours(deepest);
  const colourOf=(l:MapLink)=>l.generation?colours[l.generation-1]!:'#3d4a45';
  const lines=links.map(l=>{
    const a=at.get(l.from),b=at.get(l.to);
    if(!a||!b)return '';
    const [x1,y1]=project(a) as [number,number],[x0,y0]=project(b) as [number,number];
    // Stopped short of the case's mark, by its radius and a little, so the arrowhead is not drawn under it.
    const length=Math.hypot(x0-x1,y0-y1),trim=length>2*(markRadius+2)?(markRadius+2)/length:0;
    const x2=x0-(x0-x1)*trim,y2=y0-(y0-y1)*trim;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="map-link"`
      +` data-layer-link="${l.sourceNodeId.replace(/[^\w:.-]/g,'')}" stroke="${colourOf(l)}" marker-end="url(#map-link-arrow-${l.generation??0})"`
      +`${hidden?.has(l.sourceNodeId)?' style="display:none"':''}/>`;
  }).join('');
  // One arrowhead per colour: an SVG marker cannot take the colour of the line it ends.
  const marker=(g:number,colour:string)=>`<marker id="map-link-arrow-${g}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`
    +`<path d="M0 0L10 5L0 10z" fill="${colour}"/></marker>`;
  return `<defs>${marker(0,'#3d4a45')}${colours.map((c,i)=>marker(i+1,c)).join('')}</defs><g class="map-links" stroke-width="1.5" stroke-opacity="0.85" fill="none">${lines}</g>`;
}
