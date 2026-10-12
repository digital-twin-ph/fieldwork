# OGC and ISO geometry standards, assessed against what Fieldwork already does

_Created 2026-10-12 · Updated 2026-10-12_

A set of recommendations was brought in from an external assistant: adopt OGC Simple Feature
Access as the normative operation contract, ISO 19107 as the conceptual model, GeoSPARQL as the
semantic interface, DE-9IM as the predicate foundation, and build a Rust/WASM geometry kernel on
`geo`/`geos`/`proj` reusable across several projects.

**The standards advice is sound and mostly already adopted. The implementation advice is answered
by a measurement this project already took, and answered the other way.** This note separates the
two and records the gaps that are real.

## Already in place

| Recommendation | State here |
| --- | --- |
| GeoSPARQL as the semantic interface | **Adopted.** `geo:asWKT`, `geo:wktLiteral`, `geo:Geometry`, `geo:hasGeometry`, `geo:Feature`, `geo:FeatureCollection`, `geo:hasMetricArea` are emitted in receipts, with the namespace declared in `ontology/fieldwork.ttl` |
| DE-9IM spatial predicates | **Adopted for the geometry types in use.** `geo:sfWithin`, `geo:sfTouches` and `geo:sfDisjoint` are emitted per record — and those are *exactly* the three DE-9IM predicates that are non-trivial for a **point against a polygon**. A point cannot overlap, cross or contain a polygon, so the vocabulary is complete for what the project holds |
| A declared CRS with axis order | **Adopted.** `SpatialReference` declares datum, geodetic CRS, geometry CRS, axis order and units, and the project's single CRS is an invariant rather than an omission: `reproject` is import-time only, so nothing inside a workflow produces non-CRS84 geometry |
| Distinguish planar from geodesic | **Adopted, and this is the one worth highlighting.** Every measurement family declares its earth model in its receipt: area is *"Turf 7.3.5 spherical polygon area; mean Earth radius 6371008.8 m"*, distance is *"Haversine; sphere radius 6371.0088 km"*, and the buffer is *"Turf/JSTS metre buffer using a local azimuthal equidistant projection"* — which is precisely the fix the warning about a 10 km buffer in degrees asks for. Fieldwork does not buffer in degrees |

The sphere-versus-ellipsoid question has also been measured here rather than assumed: against the
WGS84 ellipsoid the spherical radius differs by 0.06–0.32% at 51.5°N and is direction-dependent,
which is 25× larger than the UTM scale factor at the same place.

## Already answered by measurement, the other way

The Rust/WASM kernel on GEOS and PROJ. `docs/research/geometry-engine-performance-2026-10-11.md`
measured WASM GEOS against the JavaScript engine: **GEOS is 3.2× faster and costs tens of megabytes
against a few hundred kilobytes.** The project chose JavaScript, and then found 3.5× — more than
switching engines would have given — by removing duplicate input from the buffer's workload, at no
bundle cost ([95](../experiments/95-the-duplicate-street.md)).

A second data point arrived the same week from the Validation Lab: `pyproj` and `rasterio` together
in one Pyodide kernel produce a **fatal** `RuntimeError: null function` in GDAL's wasm build, in
both orders, 5 times out of 5, with no error cell to show the practitioner. Heavy geospatial WASM
in a browser is not a neutral choice here.

**Why this matters more for Fieldwork than the recommendation assumes.** The advice is scoped to a
portfolio — it names Camper AI, Epi Info AI and AntennaForge alongside this — and a shared kernel
across several projects is a reasonable thing to want. Fieldwork's constraint is narrower and was
stated by the practitioner as the project's purpose: *field users with limited resources should get
all the boost they need*. Tens of megabytes of kernel is the opposite of that, and the measured
alternative was to give the existing engine less work.

The narrower move the research note already identified stands: compile only what is slow — a
buffer-and-union kernel rather than all of GEOS — which keeps the bundle small and would still
collapse the parity comparison for those operations. That has not been studied.

**OGC API — Features is out of scope by design**, not by omission. Fieldwork precaches and runs
offline; serving features over HTTP with server-side spatial filtering is the opposite constraint.

## The gaps that are real

| Gap | Why it matters here |
| --- | --- |
| **No LineString geometry type** | `Boundary = Polygon \| MultiPolygon`, points are `Point`, and street networks travel as bare `Position[]` arrays. So the `network` carrier sits outside the Simple Features type system and street geometry is never emitted as `geo:asWKT LINESTRING(…)`. A corridor's receipt therefore cannot cite the streets it was built from as geometries — which is a provenance gap, not a computation one |
| **No polygon-against-polygon predicates** | The three predicates in use are complete for points. The moment two-layer set operations arrive ([107](../experiments/107-set-operations-and-the-ruleset.md)), `sfIntersects`, `sfOverlaps`, `sfContains` and `sfCrosses` become meaningful and none is emitted. DE-9IM becomes relevant *then*, and 107 is where it lands |
| **No `isValid` or `isSimple`** | `validateDrawnGeometry` checks the type, a single ring, 3–200 vertices, coordinate ranges and the antimeridian. It does **not** check that the ring is simple, so a practitioner can draw a self-intersecting study area and every downstream area, buffer and containment test will be computed on it |
| **`difference` and `symmetric difference` unexposed** | `polyclip-ts` ships both and nothing uses them ([107](../experiments/107-set-operations-and-the-ruleset.md)) |
| **No centroid** | Worth naming because the recommended list says "centroid" and this project has `mean_center`, which is the **mean of point coordinates** — a different operation from a polygon's centroid, and the names invite confusion |
| **No simplify, triangulate or perimeter** | Nothing has needed them. Recorded so the absence is a measurement rather than an oversight |

## What this suggests

Treat OGC Simple Features and GeoSPARQL as the **vocabulary and contract**, which is already the
practice, and make the adoption *checkable* rather than incidental — nothing today verifies that a
widget emitting a spatial relation emits a DE-9IM predicate for it, and the `validate-ontology`
pass would be the place.

Take ISO 19107 as a conceptual reference for the two gaps that are structural rather than
operational: a LineString type, and predicates between geometries of equal dimension.

Leave the kernel question where the measurement left it, and if it reopens, reopen it as the
narrow version — buffer and union only.

## What this note cannot establish

That any of the missing operations is wanted. `difference` has shipped unused for the project's
whole life, and `isSimple` has no reported defect behind it — a self-intersecting study area is a
reasoned risk, not an observed one. The runbook observation in
[63](../experiments/63-worked-example-runbooks.md) is what would distinguish the two.
