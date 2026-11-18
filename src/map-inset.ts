/** AN INSET IN A MAP (Map's manual, History: the inset; the practitioner, 2026-11-14: "Build 213 now", when it was an experiment).
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
/** The whole extent's name, such as the study area's boundary, written in the locator's frame (the practitioner,
 *  2026-11-15: "We should label the admin boundary for the map inset"). */
export interface InsetLabels {whole?:string;
  /** The name of the boundary unit the focus's centre falls in, where the map has named units (2026-11-18). */
  focus?:string}
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

const escapeText=(t:string)=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/** THE WHOLE'S NAME in the frame's top-left corner, on the page's scale: 15 units of the 850-wide figure, a white
 *  backing so it reads over a boundary line. Its width is estimated, at 0.58 of the size a character. */
function nameIn(frame:Rect,name:string):string{
  const size=15,width=Math.min(frame.w-16,Math.ceil(name.length*size*0.58)+10),x=frame.x+6,y=frame.y+6;
  return `<g data-inset-name><rect x="${x}" y="${y}" width="${width}" height="${size+8}" fill="#ffffff" fill-opacity="0.9"/>`
    +`<text x="${x+5}" y="${y+size+1}" font-size="${size}" font-weight="600" fill="#1f2a24">${escapeText(name)}</text></g>`;
}

/** The two lines from the box to the frame, joining corresponding corners on the sides that face each other. */
function pointer(box:Rect,frame:Rect,corner:Corner):string{
  const pairs=corner==='ne'||corner==='sw'
    ?[[box.x,box.y,frame.x,frame.y],[box.x+box.w,box.y+box.h,frame.x+frame.w,frame.y+frame.h]]
    :[[box.x+box.w,box.y,frame.x+frame.w,frame.y],[box.x,box.y+box.h,frame.x,frame.y+frame.h]];
  return pairs.map(([x1,y1,x2,y2])=>`<line data-inset-line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f2a24" stroke-width="1" stroke-dasharray="4 3"/>`).join('');
}

/** WHAT THE MAP REPRESENTS, in the large drawing's own coordinates: its boundary's rings and its marks. An inset never
 *  covers any of it (the practitioner, 2026-11-18: "insets should never cover the map features being represented"). */
export interface Features {rings:[number,number][][]; points:[number,number][]}
const CELL=5;
/** The map's north arrow, at the top right of every static map (static-map.ts), kept clear like a feature. */
const NORTH_ARROW:Rect={x:805,y:5,w:42,h:28};
/** WHERE THE FEATURES LIE, on a grid of 5-unit cells: rows filled between a boundary's edges, scanline by scanline, and
 *  a margin round each mark. Built once per figure; a candidate frame then asks only its own cells. */
export function occupancy(features:Features,height:number,extra:Rect[]=[]):{cols:number;rows:number;taken:Uint8Array}{
  const cols=Math.ceil(850/CELL),rows=Math.ceil(height/CELL),taken=new Uint8Array(cols*rows);
  // A BOUNDARY THAT ENCLOSES THE WHOLE MAP IS ITS BACKGROUND (the practitioner, 2026-11-18, of Oswego's Lycoming inside New
  // York State: "Corner over area"): its inside is not counted, its lines and the marks still are.
  const inside=(ring:[number,number][],x:number,y:number)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i]!,[xj,yj]=ring[j]!;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
  const filled=features.rings.filter(ring=>![[0,0],[850,0],[0,height],[850,height]].every(([x,y])=>inside(ring,x!,y!)));
  for(let r=0;r<rows;r++){
    const y=(r+0.5)*CELL,xs:number[]=[];
    for(const ring of filled)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [x1,y1]=ring[i]!,[x2,y2]=ring[j]!;
      if((y1>y)!==(y2>y))xs.push(x1+(y-y1)*(x2-x1)/(y2-y1));
    }
    xs.sort((a,b)=>a-b);
    for(let k=0;k+1<xs.length;k+=2){
      const c1=Math.max(0,Math.floor(xs[k]!/CELL)),c2=Math.min(cols-1,Math.floor(xs[k+1]!/CELL));
      for(let c=c1;c<=c2;c++)taken[r*cols+c]=1;
    }
  }
  // A boundary's own line, even where its inside is thin: each edge's cells.
  for(const ring of features.rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [x1,y1]=ring[j]!,[x2,y2]=ring[i]!,n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)/CELL));
    for(let t=0;t<=n;t++){const c=Math.floor((x1+(x2-x1)*t/n)/CELL),r=Math.floor((y1+(y2-y1)*t/n)/CELL);
      if(c>=0&&c<cols&&r>=0&&r<rows)taken[r*cols+c]=1;}
  }
  const mark=(x:number,y:number,m:number)=>{for(let r=Math.floor((y-m)/CELL);r<=Math.floor((y+m)/CELL);r++)
    for(let c=Math.floor((x-m)/CELL);c<=Math.floor((x+m)/CELL);c++)if(c>=0&&c<cols&&r>=0&&r<rows)taken[r*cols+c]=1;};
  for(const [x,y] of features.points)mark(x,y,8);
  for(const e of extra)for(let r=Math.floor(e.y/CELL);r<=Math.floor((e.y+e.h)/CELL);r++)
    for(let c=Math.floor(e.x/CELL);c<=Math.floor((e.x+e.w)/CELL);c++)if(c>=0&&c<cols&&r>=0&&r<rows)taken[r*cols+c]=1;
  return {cols,rows,taken};
}
/** Whether a frame, a circle or a rectangle, covers no feature. */
function isFree(grid:ReturnType<typeof occupancy>,f:Rect,circle:boolean):boolean{
  const cx=f.x+f.w/2,cy=f.y+f.h/2,rr=f.w/2;
  for(let r=Math.floor(f.y/CELL);r<=Math.floor((f.y+f.h)/CELL);r++)for(let c=Math.floor(f.x/CELL);c<=Math.floor((f.x+f.w)/CELL);c++){
    if(c<0||r<0||c>=grid.cols||r>=grid.rows)continue;
    if(circle&&Math.hypot((c+0.5)*CELL-cx,(r+0.5)*CELL-cy)>rr+CELL)continue;
    if(grid.taken[r*grid.cols+c])return false;
  }
  return true;
}
/** WHERE THE FRAME GOES: the corner asked for, if it covers nothing; else the free place nearest the part (a focus) or
 *  nearest a corner (an overview); else, where nothing is free, a band added below the map. */
export function placeFrame(w:number,h:number,height:number,grid:ReturnType<typeof occupancy>|null,circle:boolean,
  prefer?:Corner,near?:[number,number]):{frame:Rect;band:number;corner:Corner;moved:boolean}{
  const cornerOf=(f:Rect):Corner=>`${f.y+f.h/2<height/2?'n':'s'}${f.x+f.w/2>425?'e':'w'}` as Corner;
  if(!grid){const corner=prefer??'ne';return {frame:frameAt(corner,w,h,height),band:0,corner,moved:false};}
  if(prefer){const f=frameAt(prefer,w,h,height);if(isFree(grid,f,circle))return {frame:f,band:0,corner:prefer,moved:false};}
  let best:Rect|null=null,score=Infinity;
  for(let y=PAD;y+h<=height-PAD;y+=10)for(let x=PAD;x+w<=850-PAD;x+=10){
    const f={x,y,w,h};if(!isFree(grid,f,circle))continue;
    const cx=x+w/2,cy=y+h/2;
    const d=near?Math.hypot(cx-near[0],cy-near[1]):Math.min(...CORNERS.map(c=>{const k=frameAt(c,w,h,height);return Math.hypot(k.x-x,k.y-y);}));
    if(d<score){score=d;best=f;}
  }
  if(best)return {frame:best,band:0,corner:cornerOf(best),moved:!!prefer};
  const x=Math.min(850-PAD-w,Math.max(PAD,(near?.[0]??425)-w/2));
  const frame={x,y:height+PAD,w,h};
  return {frame,band:h+2*PAD,corner:cornerOf(frame),moved:!!prefer};
}

/** A FOCUS CIRCLE'S DIAMETER: the width chosen, but never more than 40% of the map's shorter side (the practitioner,
 *  2026-11-18, of MERS's half-width circle: "How can we ensure the size/diameter of the focus inset is not too big").
 *  `limited` says when the limit, not the choice, set it, so Configure… can say so. */
export const FOCUS_LIMIT=0.4;
export function focusDiameter(settings:Pick<InsetSettings,'size'>,height:number):{diameter:number;limited:boolean}{
  const chosen=insetWidth(settings),most=Math.round(FOCUS_LIMIT*Math.min(850,height));
  return chosen>most?{diameter:most,limited:true}:{diameter:chosen,limited:false};
}

/** THE TWO LINES JOINING TWO CIRCLES, along their outer tangents: the circle on the map and the focus inset's frame. */
export function outerTangents(a:{x:number;y:number;r:number},b:{x:number;y:number;r:number}):[number,number,number,number][]{
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d<=Math.abs(a.r-b.r)+1e-9)return [];
  const theta=Math.atan2(dy,dx),gamma=Math.acos((a.r-b.r)/d);
  return [theta+gamma,theta-gamma].map(t=>[a.x+a.r*Math.cos(t),a.y+a.r*Math.sin(t),b.x+b.r*Math.cos(t),b.y+b.r*Math.sin(t)]);
}
/** A name on a white backing, centred at (cx, y): the page's 15 units, its width estimated at 0.58 of the size a character. */
function nameAt(cx:number,y:number,name:string,attr:string):string{
  const size=15,width=Math.ceil(name.length*size*0.58)+10;
  return `<g ${attr}><rect x="${cx-width/2}" y="${y}" width="${width}" height="${size+8}" fill="#ffffff" fill-opacity="0.9"/>`
    +`<text x="${cx}" y="${y+size+1}" text-anchor="middle" font-size="${size}" font-weight="600" fill="#1f2a24">${escapeText(name)}</text></g>`;
}

/** THE FOCUS INSET, A CIRCLE (the practitioner, 2026-11-18: "Square for overview and Circle for focus"). A circle on the
 *  map around the part, the part enlarged in a circular frame in the corner where it covers least, joined by the two
 *  lines along their outer tangents; the scale bar inside the frame's foot, the name of the unit at its centre above. */
function composeFocus(whole:Drawing,part:Drawing,settings:InsetSettings,points:readonly [number,number][],labels:InsetLabels,
  features?:Features):{content:string;height:number;corner:Corner;moved:boolean}{
  const w=focusDiameter(settings,whole.height).diameter;
  const r=rectOf(settings.box,whole.project);
  const ring={x:r.x+r.w/2,y:r.y+r.h/2,r:Math.max(Math.hypot(r.w,r.h)/2,9)};
  const avoid={x:ring.x-ring.r,y:ring.y-ring.r,w:2*ring.r,h:2*ring.r};
  let frame:Rect,corner:Corner,band=0,moved=false;
  if(features){
    const placed=placeFrame(w,w,whole.height,occupancy(features,whole.height,[avoid,NORTH_ARROW]),true,settings.corner,[ring.x,ring.y]);
    ({frame,corner,band,moved}=placed);
  }else{corner=settings.corner??chooseCorner(points.map(p=>whole.project(p)),w,w,whole.height,avoid);frame=frameAt(corner,w,w,whole.height);}
  const big={x:frame.x+w/2,y:frame.y+w/2,r:w/2};
  const id=`focus-${Math.round(frame.x)}-${Math.round(frame.y)}`;
  // The part's drawing fills the circle: its box is drawn 850 wide, so the circle shows its middle, as wide as the box.
  const nested=`<clipPath id="${id}"><circle cx="${big.x}" cy="${big.y}" r="${big.r}"/></clipPath>`
    +`<g clip-path="url(#${id})"><rect x="${frame.x}" y="${frame.y}" width="${w}" height="${w}" fill="#ffffff"/>`
    +`<svg data-inset-frame x="${frame.x}" y="${frame.y}" width="${w}" height="${w}" viewBox="0 0 850 ${part.height}" preserveAspectRatio="xMidYMid slice">${part.content}</svg></g>`;
  const lines=outerTangents(ring,big).map(([x1,y1,x2,y2])=>`<line data-inset-line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1f2a24" stroke-width="1.2"/>`).join('');
  // As enlarged on the page: the frame is filled, so the part is scaled by the larger of the two ratios.
  const k=Math.max(w/850,w/part.height),metresPerPixel=111_320/part.scale/k;
  const metres=niceMetres(metresPerPixel*w/4),length=metres/metresPerPixel;
  const bx=big.x-length/2,by=big.y+big.r*0.72;
  const bar=`<g data-inset-scale><rect x="${bx-4}" y="${by-20}" width="${length+8}" height="26" fill="#ffffff" fill-opacity="0.85"/>`
    +`<path d="M${bx},${by-4}V${by}H${bx+length}V${by-4}" fill="none" stroke="#1f2a24" stroke-width="1.5"/>`
    +`<text x="${bx}" y="${by-8}" font-size="13" fill="#1f2a24">${metresLabel(metres)}</text></g>`;
  const name=labels.focus?.trim()?nameAt(big.x,frame.y+big.r*0.22,labels.focus.trim(),'data-inset-name'):'';
  const height=whole.height+band;
  const content=(band?`<rect width="850" height="${height}" fill="#ffffff"/>`:'')+whole.content
    +`<circle data-inset-box cx="${ring.x}" cy="${ring.y}" r="${ring.r}" fill="none" stroke="#1f2a24" stroke-width="2"/>`
    +lines+nested
    +`<circle data-inset-circle cx="${big.x}" cy="${big.y}" r="${big.r}" fill="none" stroke="#1f2a24" stroke-width="2.5"/>`
    +bar+name;
  return {content,height,corner,moved};
}

/** THE FIGURE. `whole` is drawn over the whole extent, `part` over the box; which is large is the arrangement's. */
export function composeInset(whole:Drawing,part:Drawing,settings:InsetSettings,points:readonly [number,number][]=[],labels:InsetLabels={},
  /** What the large drawing represents, in its own coordinates; given, the inset never covers it. */
  features?:Features):{content:string;height:number;corner:Corner;moved:boolean}{
  const locator=settings.arrange==='locator';
  if(!locator)return composeFocus(whole,part,settings,points,labels,features);
  const large=locator?part:whole,small=locator?whole:part;
  const w=insetWidth(settings),h=Math.round(w*small.height/850);
  const boxOnLarge=locator?undefined:rectOf(settings.box,whole.project);
  let frame:Rect,corner:Corner,band=0,moved=false;
  if(features)({frame,corner,band,moved}=placeFrame(w,h,large.height,occupancy(features,large.height,[NORTH_ARROW]),false,settings.corner));
  else{corner=settings.corner??chooseCorner(locator?points.map(p=>part.project(p)):points.map(p=>whole.project(p)),w,h,large.height,boxOnLarge);
    frame=frameAt(corner,w,h,large.height);}
  // THE BOX IS ALWAYS FINDABLE: drawn in the small frame, a part a few kilometres across in a state is under a pixel, so
  // it is drawn at least 18 px on the page, centred where it is, its outline as thick on the page as on the whole map.
  const box=(r:Rect,scale=1)=>{const least=18*scale,w=Math.max(r.w,least),h=Math.max(r.h,least);
    return `<rect data-inset-box x="${r.x+r.w/2-w/2}" y="${r.y+r.h/2-h/2}" width="${w}" height="${h}" fill="none" stroke="#c0392b" stroke-width="${2*scale}"/>`;};
  // The small drawing in its frame, clipped to it; the box drawn on the whole, wherever the whole is.
  const nested=`<svg data-inset-frame x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" viewBox="0 0 850 ${small.height}" preserveAspectRatio="xMidYMid meet">`
    +small.content+(locator?box(rectOf(settings.box,whole.project),850/w):'')+`</svg>`;
  const content=(band?`<rect width="850" height="${large.height+band}" fill="#ffffff"/>`:'')+large.content+(boxOnLarge?box(boxOnLarge)+pointer(boxOnLarge,frame,corner):'')
    +`<rect x="${frame.x-2}" y="${frame.y-2}" width="${frame.w+4}" height="${frame.h+4}" fill="#ffffff"/>`
    +nested+`<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" fill="none" stroke="#1f2a24" stroke-width="1.5"/>`
    +(locator?'':scaleBar(part,frame))
    +(locator&&labels.whole?.trim()?nameIn(frame,labels.whole.trim()):'');
  return {content,height:large.height+band,corner,moved};
}
