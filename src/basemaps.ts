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
export const BASEMAP_CHOICES=['none','osm','topo','ofm-liberty','ofm-positron','ofm-bright'] as const;
export type BasemapChoice=typeof BASEMAP_CHOICES[number];

/** The styles a static figure cannot bake. */
export const VECTOR_BASEMAP_CHOICES=['ofm-liberty','ofm-positron','ofm-bright'] as const;
export const isVectorBasemapChoice=(choice:BasemapChoice):boolean=>
  (VECTOR_BASEMAP_CHOICES as readonly string[]).includes(choice);

/** What each presentation can draw. Derived, so a basemap added above appears in the right list
 *  without anybody remembering -- the defect `catchment-map.ts` already records from 2026-10-20,
 *  when the Inspector carried its own copy of this list and drifted from the map's toolbar. */
export const basemapsFor=(presentation:'plot'|'interactive'):readonly BasemapChoice[]=>
  BASEMAP_CHOICES.filter(choice=>presentation==='interactive'||!isVectorBasemapChoice(choice));
export const basemapAvailable=(choice:BasemapChoice,presentation:'plot'|'interactive'):boolean=>
  basemapsFor(presentation).includes(choice);

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
};
export const BASEMAP_OPTIONS:readonly {value:BasemapChoice;label:string}[]=
  BASEMAP_CHOICES.map(value=>({value,label:BASEMAP_LABELS[value]}));

/** The options as markup, so no two selects can drift in what they offer or in their labels.
 *
 *  `presentation` filters to what that map type can draw. Omitted, every choice is offered --
 *  which is what the interactive map's own toolbar wants, since that control exists only there. */
export const basemapOptions=(selected:BasemapChoice|undefined,
  presentation?:'plot'|'interactive'):string=>BASEMAP_OPTIONS
  .filter(option=>!presentation||basemapAvailable(option.value,presentation))
  .map(option=>`<option value="${option.value}" ${(selected||'none')===option.value?'selected':''}>${option.label}</option>`)
  .join('');
