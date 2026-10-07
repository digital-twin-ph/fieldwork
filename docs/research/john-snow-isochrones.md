# John Snow case study: isochrone workflow reuse

Reviewed 2026-10-07. Source inspection only; notebooks were not executed. No source code or data files were copied into the Fieldwork runtime.

Repository: [PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1). Inspected main at commit `8bde848d13d71602b2b32c62e5d4b4957e4a45a1`; references below are pinned to that snapshot. Notebook cell numbers are zero-based indices in the notebook JSON.

## What the notebooks implement

[NB03: Isochrone Map](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/NB03-Cholera-Case-Study-Isochrone-Map.ipynb) sets Broad Street pump as the origin, walking mode, thresholds of 1, 5, 10 and 15 minutes, and speed of 4.5 km/hour (cell 10). It requests an OSMnx graph with a 1,200-metre distance parameter (cell 12), snaps the pump to a network node (15), projects the network (28), and assigns each edge time as length divided by speed (41).

NetworkX `ego_graph` extracts the reachable subgraph for each threshold. One visualization uses convex hulls of reachable nodes (56). Another buffers network nodes and edges and unions the buffers (64–67). The active call at cell 67 uses a 25-metre edge buffer, zero node buffer and infill enabled. Polygons are exported as separate shapefiles after transformation back to geographic coordinates (98–105).

[NB04: Isochrone Map](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/NB04-Cholera-Case-Study-Isochrone-Map.ipynb) reads those polygons and the death/pump layers (10–15), tests point containment and subtracts preceding cumulative counts (19), then produces a bar chart and static/interactive maps (22–28). Its chart counts death locations; the map separately uses the `DEATHS` attribute. Counting locations and summing deaths are different aggregation contracts.

## Reusable Fieldwork composition

| Notebook responsibility | Proposed shared primitive | Parameters or evidence to retain |
|---|---|---|
| CSV death/pump records | Input data with explicit schema | Coordinate fields, source IDs, count-field meaning and source snapshot |
| Graph acquisition | Street-network input adapter | Extent, travel mode, source date, graph hash and acquisition method |
| Coordinate transformation | Reproject | Input/output CRS and transformation method |
| Origin matching | Snap points to network | Node/edge policy, maximum distance, unmatched status and off-network cost |
| Edge-time calculation | Compute network costs | Length units, speed and resulting time units |
| Threshold search | Network reachability | Origin, direction, mode, thresholds and cost attribute |
| Polygon construction | Reachability to polygons | Hull/buffer method, edge/node buffers and hole policy |
| Spatial overlay | Point-in-polygon / spatial join | Boundary policy, origin/threshold identity and containment result |
| Summary | Aggregate attribute / count records | Count locations versus sum DEATHS; cumulative versus interval counts |
| Communication | Shared Map, Table and Chart | Layer identity, thresholds, units, method and receipt links |

This decomposition exposes both the numerical network result and its polygon representation. A compact “Isochrone assessment” subworkflow could present a guided interface while retaining the underlying primitives. This remains a proposed Fieldwork workflow; no isochrone node is implemented by this review.

## Method details to resolve before reuse

1. **Historical interpretation.** NB03 requests an OSM walking graph without a historical date override in the inspected configuration. Its code does not establish a reconstructed 1854 street network. Label a replay as historical outbreak locations analyzed against the specified network snapshot, unless a historical reconstruction is supplied and validated.
2. **Polygon approximation.** A convex hull may bridge unreachable space. The [helper function](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/resources/make_iso_polys.py) constructs straight lines between endpoint nodes rather than retaining curved edge geometry. Whole reachable-node subgraphs do not interpolate partially traversable edge segments at the time cutoff. Buffering and hole filling add further modeled area. Preserve these settings in computation evidence and compare against an explicit partial-edge reference.
3. **Multiple helper definitions.** NB03 defines `make_iso_polys` again at cell 94. The later version uses actual edge geometry, sorts thresholds ascending, and applies a convex hull to multipart output when infill is enabled. The earlier call sorts descending and the subsequent export names assume that order. A clean replay must choose one implementation and bind each polygon to an explicit threshold, not list position. Saved notebook state is not sufficient validation.
4. **Direction and snapping.** The demonstrated reachability starts at the pump. Access to a facility may require inbound travel, which can differ on directed networks. Record snap distance and off-network access cost rather than treating snapped origins as exact locations.
5. **Boundary and aggregation.** NB04 uses `within`, excluding polygon-boundary points. Fieldwork's current coverage convention includes them. Preserve this difference in any comparison. Subtracting cumulative counts assumes nested sets; verify nesting or derive interval membership explicitly. Multiple facility isochrones require overlap handling, not simple summed counts.
6. **Network extent.** At the assumed speed, 15 minutes corresponds to 1,125 metres of network cost. The 1,200-metre acquisition parameter does not by itself validate route completeness, graph truncation behavior or snap effects. Test extent sensitivity and retain network-coverage status.

## Browser and licensing evidence

The [root README](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/README.md) describes a JupyterLite template, while the [content README](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/README.md) describes Binder/Docker use. NB03/NB04 declare a Python ipykernel. The [environment file](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/environment.yml) specifies Python 3.11, OSMnx 1.3.0 and additional geospatial dependencies. Those files do not demonstrate successful execution in Pyodide or offline in a browser. Check compatibility and repeat in a clean kernel before claiming runtime reproducibility.

There is an approximately 640 KB `content/outputs/soho.graphml` asset and precomputed isochrone shapefiles. They are candidates for a bounded fixture, but their topology, CRS, units and relationship to this notebook run have not been verified. Importing the graph into Fieldwork would require a defined graph contract. Existing pickle files should not become a portable browser interchange format; use validated explicit records and geometry.

Licensing needs file-specific clarification before copying implementations: the [root LICENSE](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/LICENSE) contains GPLv3, while [content/LICENSE](https://github.com/PHI-Case-Studies/Jupyterlite-1854-Cholera-Outbreak-London-Advanced-1/blob/8bde848d13d71602b2b32c62e5d4b4957e4a45a1/content/LICENSE) contains Apache 2.0 and the content README notes inherited licenses for forked sources. This review records those facts without resolving their scope. Data attribution and source terms also need to accompany any adopted fixture.

## Proposed next experiment

Start with a synthetic directed graph whose reachability is known exactly, then a verified, pinned Soho network snapshot. Compare reachable node/edge costs before comparing polygon overlap. Test curved edges, partial edges, ties, isolated components, holes, multipart outputs, origin snapping, threshold ordering and boundary points. Reproduce both location counts and weighted death totals as deliberately separate outputs. Keep a notebook comparison receipt with code/version, parameters, graph/data hashes and expected tolerances.

The pedagogical comparison is useful even before choosing a routing engine: show the same origins and destinations through Voronoi, reachable network edges, hull polygons and buffered polygons, and ask learners to explain how representation choices affect inferred coverage. Link the resulting design decisions to the [facility-access primitives specification](../experiments/31-facility-access-primitives.md).

Implementation follow-up: [Experiment 32](../experiments/32-john-snow-primitives.md) adds bounded shared catchment primitives and two runnable workspaces. Its methods and runtime evidence are separate from this source-inspection/design record.
