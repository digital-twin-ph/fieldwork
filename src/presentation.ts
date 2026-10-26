/** Shared figure presentation: one palette, one type scale, and the furniture a map needs before
 *  it can be handed to somebody.
 *
 *  Added 2026-10-13. Before this, every output chose its own colours inline -- `#1f77b4` in the
 *  catchment plot, `#3686a8` and `#598c73` in the map legend, `#176956` for a single-series bar and
 *  a Tableau-flavoured eight in `chart-vega.ts` -- so a map and a chart from the SAME worked example
 *  could not be put on one page without looking like two projects. Typography was `Arial,sans-serif`
 *  in the exported SVG and whatever the page used in the chart.
 *
 *  This module is the single source for both. It changes presentation only: no geometry, no
 *  decision, no number moves because a colour did.
 */

/** The categorical palette: six hues from Okabe--Ito, in an order that passes validation.
 *
 *  Okabe--Ito is published for exactly this purpose -- designed to stay distinguishable for the
 *  common forms of colour blindness -- and the eight-hue set was adopted on that authority alone on
 *  2026-10-13. Run through a palette validator the same day, the eight FAILED:
 *
 *  - the yellow `#F0E442` (L 0.90) and the black `#000000` (L 0) fall outside the usable lightness
 *    band, and the black also reads as grey on the chroma floor, so it competes with the colour
 *    this project reserves for "no data";
 *  - and in the order they were written, the purple and the green sat ADJACENT at ΔE 7.6 under
 *    deuteranopia -- inside the 6-8 band that is only legal with a second encoding.
 *
 *  Both are properties of the set and the ordering rather than of the research. Dropping the two
 *  out-of-band slots and separating the purple from the green with the orange gives six hues that
 *  pass every check, with the worst adjacent pair at ΔE 9.6 (deuteranopia), above the target of 8.
 *
 *  Six is also enough: the chart builder refuses a legend beyond this many categories, and the
 *  honest answer past six is to group the tail rather than invent a seventh hue.
 *
 *  One warning stands and is not dismissable: `#E69F00`, `#CC79A7` and `#56B4E9` fall below 3:1
 *  against a white surface, which obliges visible labels or a table view. Both are present -- every
 *  chart ships beside a Table output, and the exported figure labels its bars directly.
 *
 *  References: Okabe M, Ito K, "Color Universal Design", 2008, https://jfly.uni-koeln.de/color/ */
/** The palette's own name and authority, carried into receipts so a reader can check the claim
 *  rather than take the hexes on trust. */
export const FIGURE_PALETTE_NAME='Okabe-Ito colour-universal set (six of eight)';
export const FIGURE_PALETTE_AUTHORITY='https://jfly.uni-koeln.de/color/';
export const FIGURE_PALETTE=[
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#009E73', // bluish green
  '#E69F00', // orange
  '#CC79A7', // reddish purple
  '#56B4E9', // sky blue
] as const;

/** Roles, so a legend and a chart agree about what a colour MEANS and not merely which colours
 *  exist. A reader who learns that vermillion is the thing being reviewed on the map should not
 *  find it meaning something else on the chart beside it. */
/** The ordered palette: ColorBrewer's YlGnBu, for quantities that have an order.
 *
 *  Added 2026-10-20 on the practitioner's direction -- *"This is where we apply Color Brewer"* --
 *  and it belongs to a different job from the categorical six above. Okabe--Ito answers "which
 *  CATEGORY is this", and nothing in it is ordered: its blue is not less than its vermillion. A
 *  travel-time band, a cell count and a raster value are ORDERED, and until today this project
 *  drew the isochrone bands with six hand-written hex literals -- `#3686a8`, `#c7773b`, `#719d47`
 *  and three more -- a categorical set standing in for a sequence. A reader could not tell five
 *  minutes from twenty-five by hue, because the hues carried no order to read.
 *
 *  ColorBrewer is the published answer to exactly that, and YlGnBu is one of the schemes its own
 *  tool flags as **colourblind safe**, **print friendly** and **photocopy safe** at five classes,
 *  which is the set this application needs: lightness falls monotonically, so the order survives
 *  greyscale and the common colour vision deficiencies alike.
 *
 *  Nine would be available and five is taken deliberately: past five classes a reader stops
 *  ranking hues and starts matching them against the key, which is the moment a choropleth
 *  becomes a lookup table. Where more bands exist than hues, the tail shares the darkest class
 *  and the legend says so rather than inventing a sixth step.
 *
 *  References: Brewer C A, Harrower M and The Pennsylvania State University, ColorBrewer 2.0,
 *  https://colorbrewer2.org/ -- scheme YlGnBu, 5-class sequential. */
export const ORDERED_PALETTE=['#ffffcc','#a1dab4','#41b6c4','#2c7fb8','#253494'] as const;
export const ORDERED_PALETTE_NAME='ColorBrewer YlGnBu (5-class sequential)';
export const ORDERED_PALETTE_AUTHORITY='https://colorbrewer2.org/';
/** `n` steps of the ordered palette, darkest last. Beyond its length the tail repeats the darkest
 *  class, which the legend states: a sequence a reader cannot rank is worse than a shared step. */
export function orderedSteps(n:number):string[]{
  if(n<=0)return [];
  if(n<=ORDERED_PALETTE.length){
    // Spread across the scheme rather than taking the first n, so three bands use light, middle
    // and dark rather than three pale neighbours.
    const last=ORDERED_PALETTE.length-1;
    return Array.from({length:n},(_,i)=>ORDERED_PALETTE[n===1?last:Math.round(i*last/(n-1))]);
  }
  return Array.from({length:n},(_,i)=>ORDERED_PALETTE[Math.min(i,ORDERED_PALETTE.length-1)]);
}

/** One layer, one look: a hue that says WHICH SOURCE, and a shape that says it again.
 *
 *  The practitioner, 2026-10-20, with two facility sources on one map: *"they are both rendered
 *  same color when inside the polygon and there is no layer to check or uncheck to assess which
 *  points come from which source."* Hue had been spent on the spatial relation -- inside, outside,
 *  unplaceable -- leaving provenance with no channel at all.
 *
 *  So hue carries the layer and fill carries the relation, and the shape repeats the layer because
 *  colour alone is not an encoding anybody is obliged to be able to read (WCAG 1.4.1). Six hues
 *  from Okabe--Ito and four shapes give twenty-four distinguishable layers before anything
 *  repeats, and the map refuses more than eight. */
/** The marks, named as OGC Symbology Encoding names them.
 *
 *  SE 1.1 (OGC 05-077r4) publishes a `WellKnownName` set -- square, circle, triangle, star, cross,
 *  x -- and a receipt that says `fw:mark "triangle"` against that vocabulary is a term a reader can
 *  look up, where `"diamond"` would be one this project invented. A first version used diamond,
 *  which is a common extension and not in the standard; swapping it for star costs nothing and
 *  buys the citation. SymCore (18-067r3) is the conceptual model above it and is deliberately NOT
 *  implemented here: it assumes a styling pipeline applying symbolizers to features, and these
 *  maps are drawn by a renderer reading ports. */
export const LAYER_SHAPES=['circle','square','triangle','star','cross','x'] as const;
export type LayerShape=typeof LAYER_SHAPES[number];
export const MARK_VOCABULARY='http://www.opengis.net/se/1.1/WellKnownName';
/** Hue and mark both change with the layer, which is what makes the mark REDUNDANT with the
 *  colour rather than decorative: a reader who cannot separate two hues still has two shapes, and
 *  a figure printed in greyscale keeps one channel.
 *
 *  The mark used to advance only once the palette was exhausted -- `floor(index/6)` -- so the
 *  first six layers were all circles and the redundancy this comment promised did not exist until
 *  a seventh layer appeared. Reported 2026-10-20 on two facility sources that drew identically.
 *
 *  Six hues and six marks advancing together would repeat the PAIR after six, while a map accepts
 *  eight layers, so the mark takes one extra step each time it laps: the pair stays unique across
 *  all eight, and adjacent layers still differ in both channels. */
export const layerSymbol=(index:number):{colour:string;shape:LayerShape}=>({
  colour:FIGURE_PALETTE[index%FIGURE_PALETTE.length],
  shape:LAYER_SHAPES[(index+Math.floor(index/LAYER_SHAPES.length))%LAYER_SHAPES.length]});

export const FIGURE_ROLE={
  primary:FIGURE_PALETTE[0],
  attention:FIGURE_PALETTE[1],
  agreement:FIGURE_PALETTE[2],
  site:FIGURE_PALETTE[3],
  secondary:FIGURE_PALETTE[4],
  context:FIGURE_PALETTE[5],
  /** Not a hue. Absence of data is not a category and must not compete with one. */
  unknown:'#8C8C8C',
  background:'#FFFFFF',
  ink:'#1A1A1A',
  quietInk:'#4D4D4D',
  rule:'#333333',
} as const;

/** One type scale. Sizes are in SVG user units, which for these figures are CSS pixels at 1:1.
 *  The family is a stack rather than a single face, because an exported SVG is opened on machines
 *  this application has never seen and a missing font silently changes every measurement a reader
 *  takes off the figure. */
export const FIGURE_TYPE={
  family:"'Helvetica Neue',Helvetica,Arial,'Liberation Sans',sans-serif",
  title:20,subtitle:12,legend:12,axisTitle:14,tick:12,note:11,
  titleWeight:700,
} as const;

/** A round number for a scale bar: 1, 2 or 5 times a power of ten, at or below the room available.
 *  A bar labelled "1 km" can be measured off a figure with a ruler; one labelled "1.37 km" cannot. */
export function niceDistance(metres:number):number{
  if(!Number.isFinite(metres)||metres<=0)return 0;
  const power=10**Math.floor(Math.log10(metres));
  for(const step of [5,2,1])if(power*step<=metres)return power*step;
  return power;
}

/** Metres on the ground per pixel on the page, from a plot's pixels-per-degree-of-latitude.
 *
 *  One degree of latitude is 110,574 m on the WGS84 ellipsoid at the equator and varies by about
 *  1 part in 200 to the poles, which is finer than a reader can measure off a scale bar. The plots
 *  this serves scale latitude directly and multiply longitude by cos(latitude), so latitude is the
 *  axis a scale bar must be read against; a bar drawn from the longitude axis would be wrong by
 *  that cosine. */
export const METRES_PER_DEGREE_LATITUDE=110574;
export const metresPerPixel=(pixelsPerDegreeLatitude:number):number=>
  pixelsPerDegreeLatitude>0?METRES_PER_DEGREE_LATITUDE/pixelsPerDegreeLatitude:0;

const format=(metres:number):string=>metres>=1000
  ?`${Number((metres/1000).toFixed(metres%1000===0?0:1))} km`
  :`${Math.round(metres)} m`;

/** A scale bar: a round ground distance, the pixels it occupies, and a label.
 *
 *  Returns an empty string when the scale is unknown rather than drawing a bar that means nothing.
 *  A figure with no scale bar is incomplete; a figure with a WRONG scale bar is misleading, and the
 *  second is worse. */
export function scaleBarSvg(options:{x:number;y:number;metresPerPixel:number;maxWidth?:number}):string{
  const {x,y,metresPerPixel:mpp,maxWidth=150}=options;
  if(!(mpp>0))return '';
  const ground=niceDistance(mpp*maxWidth);
  if(!ground)return '';
  const width=ground/mpp;
  if(!Number.isFinite(width)||width<8)return '';
  const t=FIGURE_TYPE,ink=FIGURE_ROLE.ink;
  return `<g data-scale-bar="${ground}" aria-hidden="true">`
    +`<rect x="${x}" y="${y}" width="${width.toFixed(1)}" height="5" fill="${ink}"/>`
    +`<rect x="${x}" y="${y}" width="${(width/2).toFixed(1)}" height="5" fill="${FIGURE_ROLE.background}" stroke="${ink}" stroke-width="1"/>`
    +`<text x="${x}" y="${y-4}" font-size="${t.note}" font-family="${t.family}" fill="${ink}">0</text>`
    +`<text x="${(x+width).toFixed(1)}" y="${y-4}" font-size="${t.note}" font-family="${t.family}" fill="${ink}" text-anchor="end">${format(ground)}</text>`
    +`</g>`;
}

/** A north arrow. Drawn only for a plot whose vertical axis IS north, which is true of the
 *  equirectangular plots here and would not be true of a rotated or projected frame. */
export function northArrowSvg(options:{x:number;y:number;size?:number}):string{
  const {x,y,size=26}=options,t=FIGURE_TYPE;
  return `<g data-north-arrow="true" aria-hidden="true">`
    +`<path d="M${x} ${y+size}L${x+size/2.6} ${y+size}L${x} ${y}L${x-size/2.6} ${y+size}Z" fill="${FIGURE_ROLE.ink}"/>`
    +`<text x="${x}" y="${y+size+13}" font-size="${t.note}" font-family="${t.family}" fill="${FIGURE_ROLE.ink}" text-anchor="middle">N</text>`
    +`</g>`;
}

/** Opinionated defaults, after Tufte and Cairo.
 *
 *  Added 2026-10-13 on the practitioner's direction: be opinionated, following the people who have
 *  argued this out, rather than shipping whatever a library defaults to. The two rules that do the
 *  most work here:
 *
 *  **Tufte: maximise the share of ink that carries data.** Every line that is not the data is a
 *  line a reader has to look past -- a frame around a plot, a tick for every label, a filled
 *  legend swatch beside a single series, a gridline dark enough to compete with a bar. So the
 *  frame goes, the domain line goes, ticks go, and gridlines stay only where a reader has to
 *  compare magnitudes across a gap, drawn light enough to read past.
 *
 *  **Cairo: the figure must be honest before it is beautiful.** A bar chart's baseline is zero and
 *  is not an option; a scale bar is drawn from the projection actually used; a label says which
 *  measure and which unit. Both are enforced elsewhere in this codebase and the config here must
 *  not quietly undo them: `scale:{domainMin:0}` on the quantity, and no `zero:false` anywhere.
 *
 *  Where the two could conflict -- Tufte would strip a gridline that Cairo wants for comparison --
 *  the reading wins. A gridline that helps a reader read a value is data ink doing its job.
 *
 *  References: Edward Tufte, The Visual Display of Quantitative Information, 2nd ed., 2001;
 *  Alberto Cairo, The Truthful Art, 2016. */
export const FIGURE_GRID='#E6E6E6';
export const TUFTE_AXIS={
  /** No line along the axis. The bars already start from a common baseline and a second line
   *  stating it is ink that carries nothing. */
  domain:false,
  /** No tick marks. A label positioned under a bar does not need a mark pointing at it. */
  ticks:false,
  /** Gridlines on the measured axis only, and light. This is the Cairo exception to Tufte's
   *  stripping: comparing a bar at the far right against the axis at the far left is exactly
   *  where a reader needs one. */
  grid:false,
  labelPadding:6,
  titlePadding:10,
} as const;

/** The symbol a layer is drawn with: the practitioner's choice where they made one, and the
 *  derived default where they did not.
 *
 *  Both cases are reported in the receipt, and reported DIFFERENTLY. "Triangle because somebody
 *  chose a triangle" and "triangle because it was the second layer" are different claims, and a
 *  reader auditing a figure needs to know which they are looking at -- the same separation the map
 *  receipt already makes between a design rule and a preference. */
/** HOW BIG A MARK IS, because density is a property of the data and not of the renderer.
 *
 *  The practitioner, 2026-10-25, on Snow's 250 death addresses in a few Soho streets: *"the sizes
 *  of the marks should be adjustable so they do not all merge like a blob on the map"*. They do
 *  merge, and no single default can prevent it: eight pumps across a borough want a mark a reader
 *  can find, and 250 addresses in four streets want one small enough to leave gaps. The same
 *  figure holds both.
 *
 *  So it is a per-layer setting with a default, in the same place hue and mark already live.
 *  Radius in figure units, where the plot is 850 wide. */
export const MARK_RADIUS_DEFAULT=4, MARK_RADIUS_MIN=1, MARK_RADIUS_MAX=12;
export const markRadius=(size:number|undefined):number=>
  typeof size==='number'&&Number.isFinite(size)
    ?Math.min(MARK_RADIUS_MAX,Math.max(MARK_RADIUS_MIN,size)):MARK_RADIUS_DEFAULT;
export interface LayerSymbol {colour:string; shape:LayerShape; size:number; chosen:{colour:boolean;shape:boolean;size:boolean}}
export function resolveLayerSymbol(index:number,
  chosen?:{mark?:LayerShape;colour?:string;size?:number}):LayerSymbol{
  const derived=layerSymbol(index);
  return {
    colour:chosen?.colour||derived.colour,
    shape:chosen?.mark||derived.shape,
    size:markRadius(chosen?.size),
    chosen:{colour:!!chosen?.colour,shape:!!chosen?.mark,size:typeof chosen?.size==='number'}};
}
/** WHAT THE FILL CHANNEL MEANS, as data rather than as code.
 *
 *  The renderer used to decide this itself: it read `row.relation`, `row.status` and `row.excluded`
 *  and chose filled, hollow or grey. That compiled ONE VARIABLE into the drawing code, so the fill
 *  channel could never mean anything but the spatial relation. The practitioner, 2026-10-20:
 *  *"only inside and outside, which is hardcoded in the map, which I think loses abstraction."*
 *
 *  A map now resolves its own rows to a fill class and hands the renderer an encoding that says
 *  which variable it stands for and what each class means. The renderer draws classes. Giving the
 *  fill channel a different variable becomes a change where the semantics live, not in the map. */
/** The dark outline every point mark is drawn over, so a symbol reads on any ground: a terrain
 *  basemap runs through the palette's own values, and a hollow mark over one was nearly invisible.
 *  It is a NEUTRAL rather than a seventh hue, for the same reason absence of data is: it must
 *  separate the symbol from the ground without competing with the layers. Near-black rather than
 *  black, which is the figure ink this project already uses. */
export const MARK_HALO='#1A1A1A';

export type FillClass='solid'|'hollow'|'absent';
export interface FillEncoding {
  /** The variable the channel carries, in words a legend can print. */
  variable:string;
  /** Where the values come from, when they come from somewhere. */
  vocabulary?:string;
  /** One row per value a reader may meet, in legend order. */
  categories:{value:string; fill:FillClass; label:string}[];
}

/** The default encoding: the relation a point has to the study area. It is a DEFAULT, which is a
 *  different thing from a rule -- this is the variable a map carries when nobody has chosen one. */
export const SPATIAL_RELATION_FILL:FillEncoding={
  variable:'spatial relation to the study area',
  vocabulary:'http://www.opengis.net/ont/geosparql#',
  categories:[
    {value:'Inside',fill:'solid',label:'Inside the study area (filled)'},
    {value:'Boundary',fill:'solid',label:'On the boundary (filled)'},
    {value:'Outside',fill:'hollow',label:'Outside the study area (hollow)'},
    {value:'Excluded',fill:'absent',label:'Set aside by a clip (grey)'},
    {value:'MissingLocation',fill:'absent',label:'Missing location (not plotted)'},
  ],
};

/** Which class a value falls in, by the encoding's own table. An unknown value is drawn hollow
 *  rather than filled: a point whose membership nobody established must not look established. */
export function fillClass(encoding:FillEncoding,value:string|undefined):FillClass{
  const matched=encoding.categories.find(c=>c.value===value);
  return matched?matched.fill:'hollow';
}

/** The SVG for one mark, centred on (x,y). Filled when the point is in the area, hollow when it
 *  is not: hue carries WHICH SOURCE and fill carries WHETHER IT IS IN, so neither variable has to
 *  share a channel with the other. */
export function markPath(shape:LayerShape,x:number,y:number,r:number):string{
  const p=(points:number[][])=>`M${points.map(([a,b])=>`${a.toFixed(1)},${b.toFixed(1)}`).join('L')}Z`;
  switch(shape){
    case 'square':return p([[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r]]);
    case 'triangle':return p([[x,y-r*1.2],[x+r*1.1,y+r*0.9],[x-r*1.1,y+r*0.9]]);
    case 'star':{
      const points:number[][]=[];
      for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,d=i%2?r*0.5:r*1.25;
        points.push([x+Math.cos(a)*d,y-Math.sin(a)*d]);}
      return p(points);}
    case 'cross':return p([[x-r/3,y-r],[x+r/3,y-r],[x+r/3,y-r/3],[x+r,y-r/3],[x+r,y+r/3],[x+r/3,y+r/3],
      [x+r/3,y+r],[x-r/3,y+r],[x-r/3,y+r/3],[x-r,y+r/3],[x-r,y-r/3],[x-r/3,y-r/3]]);
    case 'x':{const s=r*0.42;return p([[x-r+s,y-r],[x,y-s*1.4],[x+r-s,y-r],[x+r,y-r+s],[x+s*1.4,y],
      [x+r,y+r-s],[x+r-s,y+r],[x,y+s*1.4],[x-r+s,y+r],[x-r,y+r-s],[x-s*1.4,y],[x-r,y-r+s]]);}
    default:return `M${(x-r).toFixed(1)},${y.toFixed(1)}a${r},${r} 0 1,0 ${2*r},0a${r},${r} 0 1,0 ${-2*r},0Z`;
  }
}

/** CLASSING A MEASURE FOR A CHOROPLETH, and saying which method was used.
 *
 *  The method is not a detail of rendering: it changes what a reader concludes. Quantile classes
 *  hold equal numbers of areas, so they show rank clearly and exaggerate a narrow spread --
 *  five classes look dramatic even when the highest rate is barely above the lowest. Equal
 *  intervals preserve magnitude, so a genuine outlier stays visible, and leave classes empty when
 *  the distribution is skewed, which most disease rates are.
 *
 *  Neither is correct in general, so neither is chosen in general: the figure states the method
 *  and the breaks, and a reader who disagrees can see what to disagree with. Brewer's rule of
 *  thumb is that five classes is the practical ceiling for reading a sequential scheme, which is
 *  why `ORDERED_PALETTE` has five.
 *
 *  References: Brewer C A, *Designing Better Maps*, on class count and sequential schemes;
 *  Slocum et al, *Thematic Cartography and Geovisualization*, on the choice of method. */
export type ClassMethod='quantile'|'equal-interval';
export interface ValueClasses {
  method:ClassMethod; classes:number;
  /** Upper bound of each class, ascending. One per class. */
  breaks:number[];
  /** How many values fell in each class, so an empty class is visible rather than implied. */
  counts:number[];
  colours:string[];
  /** The class a value falls in, or null where there is no value: absent is not a class. */
  classOf:(value:number|null|undefined)=>number|null;
}
export function classifyValues(values:(number|null|undefined)[],
  options:{method?:ClassMethod; classes?:number}={}):ValueClasses|null{
  const method=options.method??'quantile';
  const present=values.filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)).sort((a,b)=>a-b);
  if(!present.length)return null;
  const classes=Math.max(1,Math.min(options.classes??ORDERED_PALETTE.length,present.length));
  const lowest=present[0],highest=present[present.length-1];
  const breaks=method==='equal-interval'
    ? Array.from({length:classes},(_,i)=>lowest+(highest-lowest)*(i+1)/classes)
    // The value at each quantile position, taken from the data rather than interpolated, so every
    // break is a number that actually occurs and a reader can find it in the table.
    : Array.from({length:classes},(_,i)=>present[Math.min(present.length-1,
        Math.ceil((i+1)*present.length/classes)-1)]);
  const colours=orderedSteps(classes);
  const classOf=(value:number|null|undefined)=>{
    if(typeof value!=='number'||!Number.isFinite(value))return null;
    for(let i=0;i<breaks.length;i++)if(value<=breaks[i])return i;
    return breaks.length-1;
  };
  const counts=Array.from({length:classes},()=>0);
  for(const value of present){const at=classOf(value);if(at!==null)counts[at]++;}
  return {method,classes,breaks,counts,colours,classOf};
}
