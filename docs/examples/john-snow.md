# John Snow: two catchment worked examples

_Created 2026-10-07 · Updated 2026-10-08_

Open **05 · John Snow Voronoi catchments** or **06 · John Snow network isochrones** in Workspace. Local links: [Voronoi](http://127.0.0.1:4173/?example=snow-voronoi) and [Isochrones](http://127.0.0.1:4173/?example=snow-isochrone). Each workspace saves separately. Source data are bundled; initial execution and subsequent replay need no data-service request.

The revised isochrone example has **Isochrone plot** (downloadable SVG) and **Interactive isochrone map**, modeled on NB04's executed Cell 15 and later Folium map. Use Expand Results for more room. The map supports layer toggles, clickable points/polygons and an optional online street basemap. Local layers work offline. Use Restore example if your saved workspace still has the earlier single-time template; export personal changes first.

Set **Time thresholds** to `1, 5, 10, 15`, or clear it to use the single travel time. **Fill interior holes** is explicit and enabled for this illustrative template. The two Map nodes share the same results and a separate context input showing all eight pumps; only Broad Street drives travel times. Counts are cumulative, not disjoint bands. See [experiment 33](../experiments/33-isochrone-plot-and-interactive-map.md) for method differences and evaluation. Clicking any canvas widget highlights its source primitive in the left library.

1. Inspect **Input data** for pumps and death locations. The source subset contains eight pumps and 250 locations with 489 recorded deaths. These counts are different quantities.
2. Select **Voronoi catchments** to inspect UTM zone 30N, or **Network isochrone** to set minutes, metres/minute, corridor width, snap limit and direction. Run after changing a parameter.
3. Follow **Clip polygons** to the original reporting Study area. The default rectangle is illustrative, not an official historical boundary.
4. Select **Summarize points in polygons**. Leave the field empty to chart location counts; enter `DEATHS` to chart death totals. Table always retains both counts and missing-value counts. Inspect the diagnostics for unmatched and multiple memberships.
5. Switch among the shared **Map**, **Table** and **Chart** tabs. Inspect **N3 & evidence** for computation settings, GeoSPARQL geometries and pinned source references. These are computation receipts, not a proof of historical causation.

For acquisition, connect **Study area → Buffer study area → Street network**. Change the buffer in metres; keep the original Study area connected to Clip polygons. Street network offers **Upload network file** or **Download from OpenStreetMap**. Download uses the supplied boundary's envelope plus an optional extra margin. Changing the study area or buffer does not automatically replace an existing network. Download again or upload a broader network when needed. OSM attribution and request metadata are saved with the graph.

OSM downloads are paced: one request at a time, a visible pause of at least one minute between attempts, and longer pauses when requested by the server. There are no automatic retries or background refreshes. Reloading preserves the cooldown; saved networks remain usable offline.

Upload directed WGS84 OSMnx `.graphml`, Overpass JSON, or graph JSON of this form:

```json
{
  "source": "Describe provider, date, licence and travel-mode filtering",
  "nodes": [
    {"id": "a", "coordinates": [-0.136, 51.513]},
    {"id": "b", "coordinates": [-0.135, 51.513]}
  ],
  "edges": [{"from": "a", "to": "b", "lengthM": 70}]
}
```

Edges are directed; include a reverse edge for reverse travel. Optional edge `geometry` is an array of longitude/latitude coordinates. Geometry must match its endpoints within two metres. Files are limited to 2 MB, 2,000 nodes and 5,000 edges. Uploading a line-only GeoJSON, CSV or GeoPackage does not yet construct network topology. Attach a supporting URL/PDF to the input using References. Project exports retain the normalized graph and original-file hash, not the original uploaded file bytes.

For a sized boundary, open Study area → **Select area on map** → **Configure a square or rectangle**. Set centre, width and height in metres, choose **Use sized boundary**, then **Apply study area**. You can also draw a free box or polygon, or enter explicit bounding coordinates. Ground dimensions are approximate at the centre. A separate buffer expands the acquisition geometry while preserving this reporting boundary.

The saved Soho graph is a modern OSM snapshot of unknown extraction date, not reconstructed 1854 streets. Network corridors model reachability under assumptions; Voronoi models nearest-site allocation. Neither establishes actual pump use. See [design and validation boundaries](../experiments/32-john-snow-primitives.md) and [data attribution](../../examples/john-snow/NOTICE.txt).

## Place and time in one workspace, deliberately unjoined

Both John Snow workspaces now carry the time axis beside the spatial one. **Snow 1855 Table 1 · deaths
by date** imports his own daily table, **Deaths by day** turns it into a series declared as a series of
*dates of death*, and **Epidemic curve** draws it: 43 daily bins totalling 616 deaths, peaking on 2
September 1854. The catchment map and the curve are results of the same workspace and the same
outbreak.

They are **not connected**, and the gap is the lesson rather than an omission. The death locations
carry no date and the daily table carries no place, so nothing in the workflow links a case in one to a
case in the other. The 45 attacks Snow recorded without a date are excluded by the import, because a
keyed table cannot hold an empty key, and the node's reference says so.

The GPL-licensed house file bundled at `examples/snow-gboh/` is not used by these workspaces: its
coordinates are OSGB 1936 and bringing them onto the map would need a datum shift this application
does not perform. It is included for reference and for analysis that needs a denominator, as described
below.

## Person, place and time in the Snow data — what exists and what does not

A recurring question is whether a case-level Snow dataset exists carrying **both** a location and a
date, which is what space-time analysis would need. Checked rather than assumed, 2026-10-09:

**No such dataset exists.** The HistData documentation for `Snow.deaths` states plainly that the dates
of the deaths are not individually recorded, and that this prevents analysis of the time course of the
outbreak. The University of Chicago Center for Spatial Data Science compilation —
[eight documented Snow datasets](https://geodacenter.github.io/data-and-lab//snow/), version 5 of
September 2023 — carries no date field in any of them: its variables are counts, distances,
coordinates and dummies.

Three findings worth keeping, because each one is a trap:

1. **The 578 "individual deaths" points are not individual locations.** Snow's 1855 map stacked
   multiple deaths beside a house, like a histogram, so that deaths in one building stayed visible.
   Tobler digitised those stacked positions, which means the points are displaced from the houses they
   belong to. The Chicago team **removed that dataset** from later versions of their compilation as
   misleading for spatial analysis, replacing it with deaths aggregated by building. Anyone reaching
   for "case-level Snow data" will reach for those 578 points first.
2. **What this project bundles is the aggregated form**, which is the sounder one:
   `cholera_deaths.csv` is 250 buildings with death counts, shared by Wilson (2011) and the same data
   as the Chicago compilation's `deaths_by_bldg`. Their overview table records its licence as
   **unknown**, which is worth stating rather than assuming permissive.
3. **A denominator exists, and we do not use it yet.** The Chicago team digitised the 1855 General
   Board of Health map for the first time as `deaths_nd_by_house`: 1,852 houses with deaths of
   residents, deaths of non-residents, total deaths and distances — that is, **deaths and non-deaths**.
   It is the person axis in the form that matters, because it supports a mortality *rate* per house
   rather than a count, and it is licensed GPL.

**On space-time clustering.** The serious attempt is Shiode and colleagues,
[*The mortality rates and the space-time patterns of John Snow's cholera epidemic map*](https://doi.org/10.1186/s12942-015-0011-y)
(International Journal of Health Geographics, 2015), which reconstructed per-victim space and time by
merging historical documents. It found high mortality rates close to the Broad Street pump and **no
distinctive space-time pattern** in the victims' locations — which the authors read as consistent with
waterborne rather than airborne transmission. So the one published reconstruction reports a negative
result for clustering, and its merged dataset is not distributed with this project's examples.

What this means for workflows here: the curve from `snow_dates.csv` and the maps from
`cholera_deaths.csv` are both honest, and they cannot be joined case by case. A space-time cluster
statistic on Snow's data would require assigning dates to addresses that the historical record does not
assign, which would be fabrication with a citation attached.
