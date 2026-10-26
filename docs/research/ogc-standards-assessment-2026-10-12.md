# OGC and ISO geometry standards, assessed against what Fieldwork already does

_Created 2026-10-12 · Updated 2026-10-19_
_Uses a term this project withdrew on 2026-10-12, named in [the withdrawn-vocabulary ledger](../withdrawn-vocabulary.json). The text stands as written — it is evidence of what was thought then, and rewording a dated record would falsify it. Live text says **port type** for what a connection is checked against._


A set of recommendations was brought in from an external assistant, pitched at **Epi Info AI**,
which the practitioner says is close in structure to this project: adopt OGC Simple Feature
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

**Corrected on the practitioner's clarification.** This note first read the advice as pitched at a
portfolio and treated that as a scope mismatch. It is pitched at **Epi Info AI**, which the
practitioner says is close in structure to this project. That makes the advice aimed at a sibling
rather than mis-aimed, and it inverts what this section is for: Fieldwork's measurements are not an
objection to the recommendation, they are **evidence available to it**, already paid for.

Four findings transfer, with numbers rather than opinions:

| Finding | Number |
| --- | --- |
| WASM GEOS against a JavaScript engine | 3.2× faster, tens of megabytes against a few hundred kilobytes |
| Giving the existing engine less work instead | 3.5×, at no bundle cost, by removing duplicate input |
| `pyproj` + `rasterio` in one Pyodide kernel | fatal GDAL wasm crash, both orders, 5 of 5, no error cell |
| Spherical radius against the WGS84 ellipsoid | 0.06–0.32% at 51.5°N, direction-dependent, 25× the UTM scale factor there |

And if the two projects are structurally close, the **shared kernel argument gets stronger, not
weaker**, because a narrow kernel — buffer and union, not all of GEOS — would amortise across two
callers. That is a better case for it than this note first gave.

**What decides it is a question about the sibling, not about the standards.** Fieldwork's constraint
is the practitioner's own statement of its purpose: *field users with limited resources should get
all the boost they need*, which makes tens of megabytes the wrong trade **here**. Whether it is the
wrong trade for Epi Info AI depends on how its users receive it — bandwidth, offline requirement,
first-load budget — and this note cannot answer that.

**The cheapest thing to copy is not the kernel.** It is the discipline: emitting GeoSPARQL in
receipts, declaring each measurement's earth model in the receipt that carries the measurement, and
treating a unit as part of a value rather than a label. That is vocabulary and habit, it costs no
bundle, and it is what makes the rest of this note possible to write at all.

The narrower move the research note already identified stands: compile only what is slow — a
buffer-and-union kernel rather than all of GEOS — which keeps the bundle small and would still
collapse the parity comparison for those operations. That has not been studied.

**OGC API — Features is out of scope by design**, not by omission. Fieldwork precaches and runs
offline; serving features over HTTP with server-side spatial filtering is the opposite constraint.

## The point that matters most: the vocabulary is already written

The practitioner's reading of why the recommendation is worth having: **we do not have to reinvent
the wheel as far as terminology and vocabulary are concerned.** That is the strongest claim in it,
and this project supplies its own evidence.

`SpatialRelation` is `'Inside' | 'Boundary' | 'Outside' | 'MissingLocation'`. Three of those four
already have standard names — `within`, `touches`, `disjoint` — and the project knows it, because
the dictionary between them is **written twice**:

    const relation = {Inside:'sfWithin', Boundary:'sfTouches', Outside:'sfDisjoint'}[r.relation];
    // src/spatial-coverage.ts:34  and  src/map-output.ts:20

So one fact travels in two vocabularies: `fw:spatialRelation fw:Inside` in the facts the rules read,
and `geo:sfWithin` in the provenance a reader audits. A translation table duplicated across two
files is the cost of having invented a parallel name, and it is exactly the cost the recommendation
says is avoidable.

### Why the parallel vocabulary exists, which is not laziness

The standard form is a **binary relation** — `?record geo:sfWithin ?area` — and the invented form is
a **subject attribute** — `?record fw:spatialRelation fw:Inside`. The rule builder's authored
condition is `{field, comparator, value}` over one subject
([106](../experiments/106-rule-builder-ui.md)), which cannot express a relation to another feature.

**So the invented vocabulary is downstream of the authoring form's shape.** Adopting the standard
predicate in the premises needs the form to admit relational conditions — and that makes three
extensions now required of it, each found by examining something nobody had counted:

| Extension | Found by |
| --- | --- |
| set-level conclusions | `coverage_check` concluding `?activity fw:requiresReview true` |
| field-to-field comparison | `slr_threshold_comparison` comparing a projection against each row's own elevation |
| **relational conditions** | the standard spatial predicates being binary |

### Especially the operations, where the standard name is already in the code

The practitioner sharpened the point to **geospatial geometry operations**, and that is where the
evidence is strongest: for three operations the implementation and the receipt already use the
standard name, and only the widget does not.

| Widget | Implementation calls | Receipt says | OGC Simple Features |
| --- | --- | --- | --- |
| `clip_polygons` | `polygonClipping.intersection` | *"Polygon **intersection** in CRS84"* | `intersection` |
| `summarize_combined_area` | `polygonClipping.union` | *"**Union** of N areas in {crs}"* | `union` |
| `summarize_hull` | `convexHull(…)` | — | `convexHull` |

So a practitioner places a node called **Clip polygons**, and the receipt they audit says
*intersection*. One operation, two names, and the standard one was written first — in the library
call and in the provenance. "Clip" is an ArcGIS and QGIS idiom, not an OGC operation; `summarize_`
is this project's own grouping prefix.

**The exception proves the rule is being applied with judgement.** `mean_center` is *not* called
`centroid`, and should not be: it is the mean of point coordinates, which is a different operation
from a polygon's centroid. Declining a standard name because the operation is not the standard
operation is the correct move, and it is the opposite error from inventing a name for one that is.

**What this buys the housecleaning.** [107](../experiments/107-set-operations-and-the-ruleset.md)
proposes one two-layer set-operations widget with an operation knob. If the knob's values are the
Simple Features names — intersection, union, difference, symmetric difference — then `clip_polygons`
and `summarize_combined_area` become *modes* of it, which is a reduction and a standardisation in
one move. That argument is independent of the carrier question that record leaves open, and
stronger than the case it made.

Renaming is still a migration, with D7 and saved workflows in scope. But the names should be the
standard's whether or not the merge happens, and that is cheap.

### Where this applies beyond geometry

The same test — *is there already a name for this?* — is worth running on the project's other
invented terms, and the answers differ. `fw:distanceKm` welds a unit into a predicate where QUDT
supplies units and GeoSPARQL 1.1 supplies `geof:distance`; that one is a reinvention, and a ruleset
2.0.0 is already recorded as what fixes it. `fw:GridSampleGeneration` and
`fw:SpatialCoverageCheck` are PROV activity classes describing what *this application* did, and no
standard names those; they are not reinventions. `geo:hasMetricArea` is already the GeoSPARQL term
and is already used.

The distinction worth keeping: **a standard names the domain, and the project names its own
conduct.** Geometry, relations, units and coordinate reference systems are the domain, and inventing
there costs a dictionary. Activities, plans and receipts are the project's conduct, and naming
there is the work.

## The gaps that are real

| Gap | Why it matters here |
| --- | --- |
| **No LineString geometry type** | `Boundary = Polygon \| MultiPolygon`, points are `Point`, and street networks travel as bare `Position[]` arrays. So the `network` carrier sits outside the Simple Features type system and street geometry is never emitted as `geo:asWKT LINESTRING(…)`. A corridor's receipt therefore cannot cite the streets it was built from as geometries — which is a provenance gap, not a computation one |
| **No polygon-against-polygon predicates** | The three predicates in use are complete for points. The moment two-layer set operations arrive ([107](../experiments/107-set-operations-and-the-ruleset.md)), `sfIntersects`, `sfOverlaps`, `sfContains` and `sfCrosses` become meaningful and none is emitted. DE-9IM becomes relevant *then*, and 107 is where it lands |
| **No `isValid` or `isSimple`** | ~~`validateDrawnGeometry` checks the type, a single ring, 3–200 vertices, coordinate ranges and the antimeridian. It does **not** check that the ring is simple, so a practitioner can draw a self-intersecting study area and every downstream area, buffer and containment test will be computed on it~~ **Corrected 2026-10-18: this row was wrong when written.** `validateDrawnGeometry` has refused self-intersecting and self-touching rings since 2026-10-06, six days before this assessment — the error is "Polygon edges must not cross or touch each other." What is absent is the *GeoSPARQL function* `geof:isSimple` as something a rule can call; the check exists, in JavaScript, and the reasoner consumes its result as `fw:geometryValidated`. The contract itself was restated 2026-10-18 (decision A03): the vertex ceiling is gone, interior rings are admitted, the size limit is a byte budget, and the crossing check is now near-linear rather than O(n²) |
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
