# Experiment 33: NB04-style isochrone outputs and primitive recognition

_Created 2026-10-07 · Updated 2026-10-07_

Date: 2026-10-07. Status: local prototype. Extends [experiment 32](32-john-snow-primitives.md).

## Visual reference

The requested source is [Advanced-1 NB04](https://github.com/PHI-Case-Studies/1854-Cholera-Outbreak-London-Advanced-1/blob/97a1d13dfb23032387ed23804e3d6f4dbc99aec7/NB04-Cholera-Case-Study-Isochrone-Map.ipynb), revision `97a1d13dfb23032387ed23804e3d6f4dbc99aec7`. Inspected source and embedded PNG on 2026-10-07. **Executed Cell 15** (JSON cell index 22) draws 1/5/10/15-minute polygons with blue alpha 0.2, gray death locations, red pumps, longitude/latitude axes and a title. Executed Cell 18 supplies a Folium map with popups, red mortality circles, blue square pumps and fullscreen. JSON cell index 15 instead loads polygon files; it is not the requested plot.

The reference motivates the presentation, not numerical equivalence. Fieldwork uses its already attributed modern Soho graph and historical point subset, partial directed edges and Turf/JSTS buffers. It does not execute or copy notebook code or substitute its saved polygons. Original pins and licenses remain in `examples/john-snow`.

## Architecture and parameters

Network isochrone accepts an optional ordered list of up to six unique thresholds (0.1–60 minutes). Empty/absent list uses the existing single-time parameter. Each feature retains site identity and its threshold. A worker computes these once upstream; plot and interactive map consume the same polygon object. Summarize and Clip polygons preserve threshold attributes. `fw:travelTimeMinutes`, GeoSPARQL geometry and PROV receipts retain the interpretation; processing parameters are included in the activity receipt.

An explicit **Fill interior holes** option approximates the notebook's filled regions; it is enabled in the revised Snow example and defaults off for existing workflows. Infill may include unreachable off-network locations. It never asserts actual pump attendance or exact travel-time surfaces. The example reporting rectangle is enlarged to avoid cutting off the displayed outer contours; a fixed graph may still truncate reachability. Changing an acquisition boundary does not expand that graph.

Shared Map has two polygon presentations: static plot and interactive map. Two Map instances produce independent named Results tabs. An optional `context` point connector displays all eight pumps without making them travel origins. Both source edges appear in presentation provenance. Output widgets do not recompute or summarize data. Map 0.7.0 and Network isochrone 0.2.0 record these changes; older configuration defaults remain valid. Registry versions remain catalog metadata, not runtime version dispatch.

Plot provides a standalone SVG download with axes, nested blue polygons, gray locations and red sites. Interactive Leaflet provides pan/zoom, fit, layer toggles, site/polygon/location popups and fullscreen. Death-marker radius uses DEATHS with a 2–20 pixel cap for legibility. Nested polygons remain cumulative and use blue rather than the notebook's count-based choropleth: **the notebook subtracts counts into time bands, whereas Fieldwork retains cumulative memberships**. Tables/charts must not sum overlapping thresholds into a unique population. Disjoint band computation remains a future separate processing primitive.

The optional online basemap uses OpenStreetMap, disabled initially. CARTO Positron is the notebook's original basemap, but its [current service instructions](https://github.com/CartoDB/basemap-styles) require an API key. The prototype does not silently introduce that dependency. OSM tiles are viewport-only, with attribution, normal HTTP caching and origin referrer; no tile prefetch/archive or offline tile export. See [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/). Local polygons/points and the plot work offline. The existing one-request/60-second Overpass acquisition pacing is unchanged. Tests mock basemap failures; no live OSM graph downloads are necessary for this slice.

## Linking the canvas to the primitive library

Selecting a canvas widget highlights the matching `node.type` in the left library with a blue outline, background and “Selected primitive” text; `aria-current` supplies a non-color signal. Selection clears the search filter and scrolls that primitive into view. Multiple instances share one source primitive. Clearing selection removes the highlight. The click does not create a new widget. Imported workflow types are included in the library even if absent from the example template.

Developmental evaluation prompt: can a practitioner identify the reusable primitive behind an instance, distinguish processing from presentation, change thresholds upstream, and explain why eight displayed pumps do not mean eight travel origins? Observe task completion and explanations; visual correspondence and automated tests are not evidence of learning effectiveness.

## Verification contract

Regression tests cover four shared thresholds, unchanged legacy single-time behavior, point totals, source identities, parseable N3 and context provenance, identical polygon inputs in both views, SVG download, map popups/layers/disposal, offline replay and primitive selection without adding nodes. The pinned prototype produces cumulative location counts 48/216/250/250 and DEATHS totals 110/433/489/489. These are implementation baselines, not independent scientific validation or notebook parity. Chromium visual/runtime checks do not establish Firefox/Safari support.

Existing saved examples are preserved. Use **Restore example** to load the revised template (export personal changes first); Undo can restore the previous workflow.

Validation on 2026-10-07: TypeScript build, 90 unit tests, registry (27 identities / 53 releases), ontology checks and the full 55-test Chromium suite passed. After final rendering/lifecycle changes, all five catchment browser scenarios passed again, including fullscreen, mocked tile failures, offline zoom and immediate workspace switching. That last sequence exposed a delayed Leaflet zoom callback after removal; this view now disables transition animations and guards its resize observer during disposal. Screenshots were inspected against the embedded NB04 plot. Static Pages staging succeeded; this slice was not published.
