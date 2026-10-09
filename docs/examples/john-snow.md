# John Snow: two catchment worked examples

_Created 2026-10-07 · Updated 2026-10-07_

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
