/** AN INSET IN A MAP (experiment 213; the practitioner, 2026-11-14: "Build 213 now").
 *
 *  Two drawings of the same layers in the same marks and classes, one over the whole extent and one over a box picked on
 *  the interactive map, composed into one static figure. **Inset**: the whole is the figure, the box drawn on it, the
 *  box's view in a framed corner, two lines from the box to the frame. **Locator**: the box's view is the figure, and the
 *  whole sits small in a corner with the box drawn on it. Marks keep their size in both, so marks that overlap at the
 *  scale of the whole stand apart in the enlarged view: an inset enlarges the distances, never the marks.
 *
 *  Pure: the drawings arrive as SVG content in their own 850-wide coordinates, with the projections that made them. */

export type Box=[west:number,south:number,east:number,north:number];
export type Corner='ne'|'nw'|'se'|'sw';
export interface InsetSettings {box:Box; arrange?:'inset'|'locator'; corner?:Corner; size?:'third'|'half'}
/** How many of the figure's 850 units the small frame is wide, so its marks can be drawn to keep their size on the page. */
export const insetWidth=(settings:Pick<InsetSettings,'size'>):number=>Math.round(850*(settings.size==='half'?0.5:1/3));
export interface Drawing {content:string; height:number; project:(c:[number,number])=>[number,number];
  /** Pixels per degree of latitude, which the scale bar is read from. */ scale:number}

const CORNERS:Corner[]=['ne','nw','se','sw'];
const PAD=12;

/** Whether a box lies inside the whole map's extent, which is the only box an inset of it can show. */
export function boxInside(box:Box,bounds:Box):boolean{
  const [w,s,e,n]=box,[W,S,E,N]=bounds;
  return w<e&&s<n&&w>=W-1e-9&&e<=E+1e-9&&s>=S-1e-9&&n<=N+1e-9;
}

/** A length a reader can say: 1, 2 or 5 times a power of ten metres, the largest not over the target. */
export function niceMetres(target:number):number{
  const power=10**Math.floor(Math.log10(Math.max(target,1)));
  return [5,2,1].map(m=>m*power).find(v=>v<=target)??power;
}
const metresLabel=(m:number)=>m>=1000?`${(m/1000).toLocaleString('en')} km`:`${m.toLocaleString('en')} m`;

type Rect={x:number;y:number;w:number;h:number};
const rectOf=(box:Box,project:Drawing['project']):Rect=>{
  const [x1,y1]=project([box[0],box[3]]),[x2,y2]=project([box[2],box[1]]);
  return {x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};
};
const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
const frameAt=(corner:Corner,w:number,h:number,height:number):Rect=>({
  x:corner.endsWith('e')?850-PAD-w:PAD,y:corner.startsWith('n')?PAD:height-PAD-h,w,h});

/** THE CORNER WHERE IT COVERS LEAST: the fewest drawn points under the frame, never over the box it enlarges. */
export function chooseCorner(points:readonly [number,number][],w:number,h:number,height:number,avoid?:Rect):Corner{
  let best:Corner='ne',fewest=Infinity;
  for(const corner of CORNERS){
    const f=frameAt(corner,w,h,height);
    if(avoid&&overlaps(f,avoid))continue;
    const under=points.filter(([x,y])=>x>=f.x&&x<=f.x+f.w&&y>=f.y&&y<=f.y+f.h).length;
    if(under<fewest){fewest=under;best=corner;}
  }
  return best;
}

/** A scale bar for a drawing shown at `shown` pixels wide, in its frame's bottom-left corner. */
function scaleBar(drawing:Drawing,frame:Rect):string{
  const metresPerPixel=111_320/drawing.scale*(850/frame.w);
  const metres=niceMetres(metresPerPixel*frame.w/4),length=metres/metresPerPixel;
  const x=frame.x+10,y=frame.y+frame.h-10;
  return `<g data-inset-scale><rect x="${x-4}" y="${y-20}" width="${length+8}" height="26" fill="#ffffff" fill-opacity="0.85"/>`
    +`<path d="M${x},${y-4}V${y}H${x+length}V${y-4}" fill="none" stroke="#1f2a24" stroke-width="1.5"/>`
    +`<text x="${x}" y="${y-8}" font-size="13" fill="#1f2a24">${metresLabel(metres)}</text></g>`;
}

/** The two lines from the box to the frame, joining corresponding corners on the sides that face each other. */
function pointer(box:Rect,frame:Rect,corner:Corner):string{
  const pairs=corner==='ne'||corner==='sw'
    ?[[box.x,box.y,frame.x,frame.y],[box.x+box.w,box.y+box.h,frame.x+frame.w,frame.y+frame.h]]
    :[[box.x+box.w,box.y,frame.x+frame.w,frame.y],[box.x,box.y+box.h,frame.x,frame.y+frame.h]];
  return pairs.map(([x1,y1,x2,y2])=>`<line data-inset-line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f2a24" stroke-width="1" stroke-dasharray="4 3"/>`).join('');
}

/** THE FIGURE. `whole` is drawn over the whole extent, `part` over the box; which is large is the arrangement's. */
export function composeInset(whole:Drawing,part:Drawing,settings:InsetSettings,points:readonly [number,number][]=[]):{content:string;height:number;corner:Corner}{
  const locator=settings.arrange==='locator';
  const large=locator?part:whole,small=locator?whole:part;
  const w=insetWidth(settings),h=Math.round(w*small.height/850);
  const boxOnLarge=locator?undefined:rectOf(settings.box,whole.project);
  const corner=settings.corner??chooseCorner(locator?points.map(p=>part.project(p)):points.map(p=>whole.project(p)),w,h,large.height,boxOnLarge);
  const frame=frameAt(corner,w,h,large.height);
  const box=(r:Rect)=>`<rect data-inset-box x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="#c0392b" stroke-width="2"/>`;
  // The small drawing in its frame, clipped to it; the box drawn on the whole, wherever the whole is.
  const nested=`<svg data-inset-frame x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" viewBox="0 0 850 ${small.height}" preserveAspectRatio="xMidYMid meet">`
    +small.content+(locator?box(rectOf(settings.box,whole.project)):'')+`</svg>`;
  const content=large.content+(boxOnLarge?box(boxOnLarge)+pointer(boxOnLarge,frame,corner):'')
    +`<rect x="${frame.x-2}" y="${frame.y-2}" width="${frame.w+4}" height="${frame.h+4}" fill="#ffffff"/>`
    +nested+`<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" fill="none" stroke="#1f2a24" stroke-width="1.5"/>`
    +(locator?'':scaleBar(part,frame));
  return {content,height:large.height,corner};
}
