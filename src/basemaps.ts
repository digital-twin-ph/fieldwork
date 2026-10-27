/** WHICH BASEMAPS EXIST, AND WHICH EACH MAP TYPE CAN ACTUALLY DRAW.
 *
 *  Its own module for two reasons, both of which bit while this was being built.
 *
 *  LEAFLET. The style URLs live in `catchment-map.ts`, which imports Leaflet; the workers build
 *  compiles without it, and `map-communication.ts` has to decide what a static figure credits
 *  without taking that dependency. The format question -- raster or vector -- is not a Leaflet
 *  question, so it does not belong beside the renderer.
 *
 *  AND IT HAS TO BE TESTABLE. `types.ts` was the first home and is not a build entry point: it is
 *  bundled into chunks, so there is no output a test can import, and neither is `catchment-map.ts`.
 *  A rule about what the interface may offer, with no test, is the kind of rule this project has
 *  learned to distrust.
 *
 *  THE DISTINCTION. A raster basemap arrives a tile at a time and can be drawn into an SVG -- the
 *  figure then carries its own ground, which is what makes a static figure reproducible. A vector
 *  style is a stylesheet a renderer applies, and a static figure carries no renderer. That is a
 *  property of the format, not of the provider, which is why this list is not "OpenFreeMap".
 */
export const BASEMAP_CHOICES=['none','osm','topo','natural-earth-110m','ofm-liberty','ofm-positron','ofm-bright'] as const;
export type BasemapChoice=typeof BASEMAP_CHOICES[number];

/** The styles a static figure cannot bake. */
export const VECTOR_BASEMAP_CHOICES=['ofm-liberty','ofm-positron','ofm-bright'] as const;
export const isVectorBasemapChoice=(choice:BasemapChoice):boolean=>
  (VECTOR_BASEMAP_CHOICES as readonly string[]).includes(choice);

/** What each presentation can draw. Derived, so a basemap added above appears in the right list
 *  without anybody remembering -- the defect `catchment-map.ts` already records from 2026-10-20,
 *  when the Inspector carried its own copy of this list and drifted from the map's toolbar. */
export const NATURAL_EARTH_MIN_SPAN_KM=50;
export const basemapsFor=(presentation:'plot'|'interactive',spanKm?:number):readonly BasemapChoice[]=>
  BASEMAP_CHOICES.filter(choice=>{
    // A static figure bakes raster tiles and cannot bake a vector style.
    if(presentation!=='interactive'&&isVectorBasemapChoice(choice))return false;
    if(choice==='natural-earth-110m'){
      // Bundled for static figures, which is the job experiment 52 assigned it. An interactive
      // map reaches live tiles and has no use for a 1:110m outline.
      if(presentation==='interactive')return false;
      return spanKm===undefined||spanKm>=NATURAL_EARTH_MIN_SPAN_KM;
    }
    return true;
  });
export const basemapAvailable=(choice:BasemapChoice,presentation:'plot'|'interactive',
  spanKm?:number):boolean=>basemapsFor(presentation,spanKm).includes(choice);

/** The ground breadth of a lon/lat extent, in kilometres: the longer of its two sides.
 *
 *  A degree of latitude is near enough constant; a degree of longitude shrinks with the cosine of
 *  latitude, taken at the middle of the extent. Good to a few per cent, which is far inside what
 *  this decides -- it chooses between "a city" and "a country", not between 49 and 51. */
export function extentSpanKm(bounds:[number,number,number,number]):number{
  const [west,south,east,north]=bounds;
  const mid=(south+north)/2*Math.PI/180;
  return Math.max(Math.abs(east-west)*111.32*Math.cos(mid),Math.abs(north-south)*110.57);
}

/** THE LABEL FOR EACH CHOICE, here with the ids rather than beside the tile URLs.
 *
 *  The practitioner, 2026-10-20: *"I also still do not see why we do not yet have OpenFreeMap as
 *  a Basemap option in the Map widget."* It was drawing in the map's own toolbar and absent from
 *  the widget's Inspector, which carried a hand-written list written before the vector styles
 *  existed. One source fixed that; this module is now that source, and `catchment-map.ts` holds
 *  the URLs and the renderer it needs them for.
 *
 *  A label is vocabulary, not rendering: it is what a reader of a receipt or a conformance report
 *  is shown for `fw:mapBasemap`, so it must be readable where Leaflet is not. */
export const BASEMAP_LABELS:Record<BasemapChoice,string>={
  none:'None \u00b7 works offline',
  osm:'OpenStreetMap streets',
  topo:'OpenTopoMap terrain',
  'ofm-liberty':'OpenFreeMap Liberty',
  'ofm-positron':'OpenFreeMap Positron (muted)',
  'ofm-bright':'OpenFreeMap Bright',
  // THE SCALE IS IN THE NAME, because experiment 52 says a profile that names a static context
  // layer must name its scale, and because 1:110m is a limit rather than a setting: these lines
  // are displaced by kilometres and a reader has to see which generalisation they are looking at
  // without opening a receipt.
  'natural-earth-110m':'Natural Earth 1:110m \u00b7 bundled, works offline',
};
export const BASEMAP_OPTIONS:readonly {value:BasemapChoice;label:string}[]=
  BASEMAP_CHOICES.map(value=>({value,label:BASEMAP_LABELS[value]}));

/** The options as markup, so no two selects can drift in what they offer or in their labels.
 *
 *  `presentation` filters to what that map type can draw. Omitted, every choice is offered --
 *  which is what the interactive map's own toolbar wants, since that control exists only there. */
export const basemapOptions=(selected:BasemapChoice|undefined,
  presentation?:'plot'|'interactive',spanKm?:number):string=>BASEMAP_OPTIONS
  .filter(option=>!presentation||basemapAvailable(option.value,presentation,spanKm))
  .map(option=>`<option value="${option.value}" ${(selected||'none')===option.value?'selected':''}>${option.label}</option>`)
  .join('');
