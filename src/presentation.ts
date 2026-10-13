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

/** The Okabe--Ito qualitative palette, chosen because it is designed to stay distinguishable for
 *  the common forms of colour blindness and is published for exactly this use, rather than being a
 *  set of colours that looked right to whoever typed them.
 *
 *  Ordered so that the first three carry the most weight in a figure: a reader who can separate
 *  only two hues still separates the first two.
 *
 *  Reference: Okabe M, Ito K, "Color Universal Design", 2008.
 *  https://jfly.uni-koeln.de/color/ */
export const FIGURE_PALETTE=[
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#009E73', // bluish green
  '#CC79A7', // reddish purple
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#F0E442', // yellow
  '#000000', // black
] as const;

/** Roles, so a legend and a chart agree about what a colour MEANS and not merely which colours
 *  exist. A reader who learns that vermillion is the thing being reviewed on the map should not
 *  find it meaning something else on the chart beside it. */
export const FIGURE_ROLE={
  primary:FIGURE_PALETTE[0],
  attention:FIGURE_PALETTE[1],
  agreement:FIGURE_PALETTE[2],
  secondary:FIGURE_PALETTE[3],
  site:FIGURE_PALETTE[4],
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
