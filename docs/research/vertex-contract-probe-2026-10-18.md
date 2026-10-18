# The 3-200 vertex contract, measured against real jurisdictions

_Created 2026-10-18 · Updated 2026-10-18_

The practitioner, 2026-10-18: *"Well it's a contract not based on reality..."* — on finding that
a geoBoundaries unit had to be simplified to fit decision A03 in
[01](../experiments/01-study-area.md). This note measures the contract against the boundaries it
now has to admit, because the number 200 was never measured against any of them.

## Where 200 came from

A03 says so itself: *"outside this **drawing** contract"*, rationale *"Drawing validation is a
geometry operation."* No performance, receipt-size or reasoner rationale is recorded for the
figure anywhere in `docs/`. A07 adds that `fw:readyForSpatialAnalysis` *"does not mean the shape
is an official administrative boundary"* — written when geometry could only arrive from a mouse.
Acquisition, built 2026-10-17, is the first producer of geometry the bound was never sized for.

## What the boundaries actually look like

DRC ADM2, gbOpen, 189 units, 6,386,010 bytes of GeoJSON.

| | vertices |
|---|---|
| min | 15 |
| median | 725 |
| mean | 773 |
| max (Shabunda) | 4,395 |

- **147 of 189 units (77%) exceed the 200-vertex contract.** 42 (22%) fit.
- **0 units are MultiPolygon.** The multi-part handling in `simplifyForStudyArea` has no subject
  at this level.
- **22 of 189 units carry interior rings.** A03 forbids holes outright, so these cannot be
  represented at any vertex budget — simplification does not reach them.
- Bunia, the unit that prompted the report, is **33 vertices**. It was always inside the
  contract. Its square came from the bounding-box path, not the vertex bound.

## What full fidelity costs the reasoner

`vendor/eye-21.1.24.js` loaded in Node, the study-area facts and rule from `studyAreaN3`,
5 reps after a warm-up, median reported.

| unit | vertices | N3 input | reason | quads | `fw:readyForSpatialAnalysis` |
|---|---|---|---|---|---|
| Bunia | 33 | 1.8 KB | 40 ms | 1 | true |
| Aru | 420 | 15.9 KB | 62 ms | 1 | true |
| Kinshasa | 3,392 | 127.2 KB | 209 ms | 1 | true |
| Shabunda | 4,395 | 166.1 KB | 258 ms | 1 | true |

The largest unit in the country costs **218 ms more than the smallest** and yields the same
single quad with the same conclusion. The reason is structural: the rule matches
`?shape geo:asWKT ?wkt` and never parses the literal, so a polygon is one atom to EYE whatever
its length. The 200-vertex bound is not protecting the reasoner.

## What simplifying to 200 costs instead

Douglas-Peucker to 200 vertices, tolerance bisected, against the full ring. Membership sampled on
a 260x260 grid over the unit's envelope, counting only points inside either ring.

| unit | full | simplified | area change | points | reclassified |
|---|---|---|---|---|---|
| Aru | 420 | 200 | +0.03% | 35,769 | 99 (0.28%) |
| Kinshasa | 3,392 | 200 | +0.01% | 38,018 | 148 (0.39%) |
| Shabunda | 4,395 | 200 | -0.05% | 43,006 | 352 (0.82%) |

This is the finding worth having. **Area survives simplification; membership does not.** Area
agrees to within 0.05%, which reads as negligible, while up to 0.82% of the unit's own area
changes side. Every reclassified point is at the edge, because that is where the discarded
vertices were. `coverage_check` and `summarize_polygons` decide inside and outside from this
ring, so for the cross-border case A03's sibling `fw:AreaBuffer` was restated for — Ebola moving
between DRC and Uganda — simplification perturbs exactly the band the question is about.

`simplificationNote` currently reports a deviation in metres and the vertex counts. Both are
true and neither is this. A practitioner reading "within about 400 m of the published outline"
is not told that membership near the edge may differ.

## What this does not establish

- One country, one level, one date. ADM1 and ADM2 elsewhere were not measured; the geoBoundaries
  probe recorded COD ADM2 mean 774 / max 4,400, which this run reproduces, but no other country
  was opened.
- Reasoner timings are Node over the vendored bundle, not the browser Web Worker the application
  uses, and not a full workflow — one source node, one rule, nothing downstream consuming the
  geometry.
- Nothing was measured about **rendering** a 4,395-vertex ring in Leaflet or MapLibre, about
  `localStorage` limits across many saved revisions, or about the cost to widgets that *do* read
  coordinates rather than pass the literal through.
- The membership grid measures area reclassified, not cases reclassified. No case dataset was
  tested against a simplified boundary.
- It does not establish what the bound should become. 200 is shown to be unmotivated for
  acquired geometry; no measurement here identifies a replacement ceiling.

## What would close it

Measure a 4,395-vertex study area end to end in the browser — worker reasoning, map render,
save and reload — and measure Hagelloch's 188 cases, or the DRC case points, against both the
full and the simplified ring to convert "0.82% of area" into "n cases". Then decide whether the
contract splits by provenance (drawn vs acquired), and whether interior rings are admitted, which
is a change to what a study area is and so the practitioner's call.

## What this changed

Acted on the same day. The practitioner, 2026-10-18: *"Simply put, we want to admit polygons as
long as they do not overrun memory."* Decision A03 in [01](../experiments/01-study-area.md) is
restated: the 3-200 vertex ceiling and the refusal of holes are withdrawn, the size limit is a
byte budget measured against the 5,226,496-byte `localStorage` ceiling this probe found, interior
rings are admitted, and `simplifyForStudyArea` is replaced by `publishedRings` — an outline is
admitted whole or refused with its size named, never thinned.

Two things the probe did not set out to find turned up in the code it sent me to:

- **`geometryBounds` used `Math.min(...points)`.** Spreading an array of tens of thousands of
  coordinates into a call throws `RangeError`, so the function would have failed before any budget
  applied. The same pattern was in the picker's multi-unit path. Both now accumulate in a loop.
- **The crossing check was O(n²).** Measured at 240 ms for Shabunda's 4,395 vertices and 12.2 s
  at 32,000, so *time* was the real ceiling and memory was never the binding constraint the
  instruction assumed. Admitting large polygons without fixing this would have frozen the editor
  instead of refusing. Edges now go into a uniform grid of about one edge per cell.

A third finding is about the records rather than the code: the row "No `isValid` or `isSimple`" in
[the OGC assessment](ogc-standards-assessment-2026-10-12.md) claimed `validateDrawnGeometry` did
not check that a ring is simple. It has checked since 2026-10-06, six days before that assessment
was written. The row is corrected in place and dated.
