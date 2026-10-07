# Experiment 38: standalone communication maps

## Admission and scope

Reuse the existing terminal `map_output` primitive. Its input is a typed spatial
result: one study area plus point layers or a reviewed coverage result, one
raster, one reasoning result, or polygons with optional context points. The
Map widget is a **presentation plan and view**, not a geometry transformation,
new classification, analysis result, or general map-composition language.
The upstream operation owns spatial predicates, clipping, catchment thresholds,
counts, CRS and missing-data decisions. A map must preserve those values.

`fw:MapSpecification` is a `prov:Plan` for an exact `fw:MapView`
(`prov:Activity`). It records a title, subtitle, legend visibility, selected
presentation and basemap, source/method note, and upstream result identities.
`dcterms:title`, `dcterms:description`, `prov:wasDerivedFrom` and existing
GeoSPARQL source geometry are reused. The source note is an authored label or
connected-source fallback, **not** a verified citation. Node references remain
separate evidence. The map's visual key is generated from the result kind;
arbitrary symbols, classifications and colors are not admitted in this slice.

The saved parameters are optional for workflow-v1 compatibility. Existing maps
default to the result-tab name, a visible key, a connected-source/method note,
and no basemap. Display geometry is CRS84; a Leaflet basemap is rendered in its
own web-mercator tile scheme. The map does not reproject source data or claim
distance accuracy from screen coordinates. Missing-location records remain in
tables/review lists and are labeled as unplotted in applicable keys. Outside
records are not silently discarded. Raster colors are relative; native values
and units remain in the raster result and GeoTIFF, not the map key.

## Standalone output

Every configured Map result displays its title, optional subtitle, generated
key and source/method note beside the geometry. **Download map (SVG)** embeds
these elements with local geometry. The SVG is a static communication artifact;
it contains no online basemap tiles, Leaflet controls or live popups. When the
source view is interactive, export uses its corresponding local static plot.
The timed isochrone plot retains longitude/latitude axes and its own detailed
legend; the outer map key gives concise cross-view semantics. The output
remains a snapshot of the last run until rerun.

For interactive polygon maps, the basemap selector offers:

| Choice | Request | Attribution and limits |
| --- | --- | --- |
| Local geometry (default) | None | Works offline; no tile download. |
| OpenStreetMap streets | Current viewport only | Visible OpenStreetMap attribution; [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/). |
| OpenTopoMap terrain | Current viewport only | Visible OpenStreetMap, SRTM and OpenTopoMap attribution; [provider usage page](https://www.opentopomap.org/about). |

The selector does not prefetch or package tiles. Switching removes the previous
tile layer and keeps local polygons and points. A failed/offline request shows
a status message and leaves local geometry usable. Basemap choice is saved as
Map presentation configuration; a changed choice requires rerunning to refresh
the N3 receipt. It is intentionally absent from the downloaded SVG. These
public tile services should not be treated as an offline tile source. Online
requests reveal the viewed geographic area to the provider, though the app
does not send its point table as part of tile requests.

## Validation and open questions

`fw:MapSpecificationShape` checks title, upstream linkage, legend Boolean,
supported presentation/basemap identifiers and a nonempty source note. Unit
checks include a conforming direct spatial map, a missing-note violation and
unsupported configuration. Browser checks cover map controls, rendered title,
key and note, SVG export, N3 & evidence view, local default, online tile
switching/attribution, offline replay and fullscreen behavior. These checks
do not establish cartographic suitability, public-health interpretation,
provider availability or research-source accuracy.

The other map-like views (coverage previews, comparison maps and drawing
editors) still have their own presentation contracts. A future shared map
artifact profile should unify them only after their different data and privacy
semantics are audited. Export does not yet include a standalone interactive
HTML package, embedded licensed tiles, scale bar or custom cartographic
styling. User comprehension and accessibility of the map key need evaluation.
