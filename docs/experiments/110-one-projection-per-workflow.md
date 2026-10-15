# 110 — One projection per workflow, stated where a reader can query it

_Created 2026-10-13 · Updated 2026-10-13_

**Status:** validated

Asked by the practitioner on 2026-10-13, in three steps: *can we embed CRS
translation in the processing widget when required?* — then *make the embedded
CRS choices consistent in a way that is also represented and queryable in the
underlying N3 receipts* — then *each widget that uses a reproject operation must
link to a Deeper Dive notebook that explains projections.*

## What was already true

Nine widgets project to metres and each takes its own zone and hemisphere:
`mean_center`, `compare_point_sets`, `summarize_combined_area`, `summarize_hull`,
`snap_to_network`, `reachable_corridor`, `voronoi`, `isochrone`, `reproject`.
Projecting inside the operation is the right design — the choice is part of that
computation's method and belongs in its receipt — but **nothing required the nine
choices to agree with each other**.

Measured on four corners around Gaborone, which sits near the 34/35 boundary so
both zones pass the existing six-degree guard: the same four points enclose
**0.58% more area in EPSG:32734 than in EPSG:32735**. A workflow could use one
zone in the hull and the other in the mean centre, and a figure could report both
as though they were commensurable. A grossly wrong zone was already refused; a
plausible one was not.

`workflowMetricCRS` now refuses the mixture and names what it found:

> This workflow computes in 2 different projections: hull (summarize_hull) in
> EPSG:32734, centre (mean_center) in EPSG:32735.

## Making it queryable found a defect in it

The predicate was duplicated — `fw:computationCRS` on three widgets,
`fw:metricCRS` on five — so the facts were consolidated onto `fw:metricCRS` and
the duplicate retired with the standard trio.

Then the query the practitioner asked for was actually run, against the three
examples that execute. Asking the receipts what a run measured in returned
`OGC:CRS84` for two steps. **That is not a measurement; degrees measure no
distance.**

The cause was the consolidation, one day old and mine. `clip_polygons` and
`summarize_polygons` compute in longitude and latitude without projecting, which
their parity notes state rather than hide, and they had been using
`fw:computationCRS` — the *general* term — honestly. Merging the general term into
the specific one left a geographic CRS asserted under a predicate meaning
projected.

The obvious repair was to mint `fw:geographicCRS` for the other case. That was not
done: it would put the CRS of a run behind two project predicates and make the
query that found the defect need to know both. Instead every operation states its
frame with **`dcterms:conformsTo`** and a resolvable OGC IRI, and `fw:metricCRS`
keeps its narrow meaning. Its **absence is now a fact** — nothing was projected —
which it could not be while every operation asserted it.

Three spellings of one frame had also been reaching the receipts verbatim:
`CRS84`, `OGC:CRS84` and `EPSG:4326`. A query joining on the CRS saw three
projections where there is one. `crsIRIFromName` maps all three to the single OGC
IRI, which is the reason to state an IRI rather than a short name.

What a reader now gets, on all three executable examples:

| | |
| --- | --- |
| What did this run measure in? | `EPSG:32630` |
| Stated at run level | `EPSG:32630` |
| Every frame any step worked in | `EPSG/0/32630`, `OGC/1.3/CRS84` |
| Retired term still present | 0 |

## The explanation the knob never had

Nine widgets carried a zone field. **None of them said anywhere what a zone is**,
or what picking the wrong-but-plausible one costs. A Dive Deeper section was
added to [`01-reproject-vs-pyproj.ipynb`](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=01-reproject-vs-pyproj.ipynb),
answering the sentence that notebook already ended on — that it does not establish
the declared zone is the right one.

The section explains why a projection is needed at all, varies the governing
assumption, and recomputes the Gaborone comparison with pyproj. Run here under
PROJ 9.8.1, it agrees with the application's proj4 to the square metre:
49,230,606 m² in EPSG:32734 against 48,943,698 m² in EPSG:32735 on a stated
6.35 km square.

The Inspector link is generated from `METRIC_NODE_TYPES` in one place rather than
written into each widget's branch, so a tenth metric widget acquires the
explanation by being added to that list and cannot ship without it.

## A figure that could not be reproduced

The first record of this comparison gave absolute areas — 40,578,765 m² against
40,341,592 m² — **without saying which four corners they came from**. The
percentage could be checked; the square metres could not. Re-measured on a stated
box, and the comment corrected to say that the **ratio** is the quantity worth
quoting and is roughly stable with extent (0.58% on a 40 km² hull, 0.59% on a
49 km² square, 0.576% on a 284 km² box) because it comes from the two zones' scale
factors, while the absolute difference scales with the area and means nothing
without the box.

## Checks that could not have failed, and two that now can

The consolidation had been committed without running the full gate. Two tests
still asserted the retired term and a runtime SHACL shape still required it; the
shape caught the drift as soon as the gate ran, which is what it is for.

Added in `tests/metric-crs.test.mjs`, each verified by restoring the defect and
watching it name the failure:

- No receipt in any executable example may assert `fw:metricCRS` with anything but
  a UTM zone. Restoring the defect: *snow-voronoi/clip claims fw:metricCRS
  "OGC:CRS84", which measures no distance.*
- A receipt classed `PolygonClipping` or `PolygonPointSummary` must state CRS84
  and must **not** assert `fw:metricCRS`.
- The list of widgets taking a zone, read from the params type in `src/types.ts`,
  must equal `METRIC_NODE_TYPES`. Removing `isochrone` from the list fails it.
- The notebook exists and carries the promised section. When `validation-lab` is
  not checked out beside this repository the check **says so and fails** rather
  than passing quietly, unless `FIELDWORK_LAB_OPTIONAL=1` is set.

A browser test on both engines covers the one line of Inspector wiring, which
TypeScript cannot see: this project has twice shipped Inspector markup that
compiled and was wrong.

One assertion was withdrawn before it was committed. `owl:propertyDisjointWith
dcterms:conformsTo` was added to `fw:metricCRS`, passed SHACL vacuously — SHACL
does not check OWL disjointness — and is **false**: a run that measures distance
asserts both properties, as the vocabulary record written minutes earlier says.

## The refusal was in the wrong layer

Put in `validateWorkflow`, the refusal ran **on every edit**, and that made all
eight metric widgets impossible to add to a canvas. An unconfigured draft carries
whatever default zone its branch supplies, so the second metric widget added
disagreed with the first, validation threw, `change()` rolled the workflow back,
and the canvas appeared to ignore the click.

That is exactly the failure [experiment 48](48-tabular-input.md) recorded and that
`tests/palette-add.browser.mjs` exists to catch — *"validating a node's full
contract on every edit makes it impossible to add at all"* — and it caught it, on
both engines, in the same run that proved the facts were queryable. The two-engine
gate paid for itself twice in one session.

Moved to `executionPlan`, beside *"Select a study area on the map before
running"*, and narrowed from the whole workflow to **the nodes in the plan**: a
draft sitting unconnected on the canvas is not part of this run and has no
business refusing it. One run, one projection — the claim was always about a run.

Two checks now hold the move in place, because relocating a refusal is an easy way
to disable one: a run whose executing widgets disagree is still rejected by name,
and a run with an unconnected disagreeing draft on the canvas still completes.

## What this does not establish

It does not establish that 0.58% matters for any question. It is far below the
uncertainty in most population denominators and far above the precision implied by
reporting an area to the square metre; the honest reading is small but systematic,
and whether that is tolerable is the practitioner's call, not the gate's.

It does not establish that one projection per workflow is the right rule for a
study area genuinely straddling a boundary. There UTM is the wrong instrument
rather than a badly-set one, and an equal-area projection chosen for the region is
the better tool. No widget here offers one.

It does not establish that the explanation lands. That is the open condition on
[94](94-where-explanation-belongs.md), and this adds an eleventh Dive Deeper
section to the ten already waiting on the same evidence.

It says nothing about `reproject`'s retirement, which is the next question and is
not answered by any of this.

## What would close it

A decision between the two instruments this document has already built the case
for: an explanation the practitioner may read, or a refusal of a zone the
application can measure as wrong. The measurement that would settle which is
affordable is in [100](100-choosing-the-metric-crs.md) — the cost of a
disagreeing zone is stated in numbers for the shipped data — so what remains is
the choice of instrument, not more evidence about zones.

_Restated 2026-10-15. This section had required a practitioner who did not write it to
report what they concluded, which needs field testing, a phase this project has not
reached. Kept as a [field question](../field-questions.md#does-the-projection-section-change-what-a-practitioner-does-about-their-zone)._

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-13 | One projection per run, stated where a reader can query it |
