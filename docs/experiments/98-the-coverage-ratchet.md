# 98 · The coverage ratchet, and the first of the twenty-six

_Created 2026-10-11 · Updated 2026-10-11_

**Status:** tried — the ratchet is built, gated and verified against four failure modes, and
eleven of the twenty-six widgets now have one, and the whole isochrone decomposition is among
them. The plan for the other fifteen is written and only partly tested, and two checks have
failed on their first run against criteria that turned out to be wrong — which is the plan
working, not the plan failing.

## The question asked

[The TODO](../todo.md) carried this as *"the 26 computing widgets with no lab check"*, with
an instruction attached: **plan and test the work, do not simply start writing notebooks.** A
coverage ratchet should come first so the number is visible in every run and can only fall.

Behind it, two questions:

1. **How many widgets actually owe a check, and which?** The figure 26 came from a hand
   count that nothing reproduced.
2. **What does one of these checks cost**, end to end, so twenty-five more can be planned
   rather than guessed at?

## How it was tried

**The classification could not be derived, and that is a finding.** The intention was to read
the computing/presentational line off the registry. It is not there:
`implementation.definition` names `src/core.ts#TYPES` — a declaration table, not an
implementation — for **39 of 51 widgets**. Only the twelve newest primitives name their own
module. So the registry does not record where most widgets are implemented, and a mechanical
derivation would have been a guess wearing a script.

So [`widgets/check-coverage.json`](../../widgets/check-coverage.json) is hand written and
reviewed, one entry per widget, with three expectations:

| | |
| --- | --- |
| **parity** | Computes a value an independent implementation could recompute. Owes a check; `check` names it once it exists |
| **none** | An input, a presentation, or a rule node whose conclusions are the reasoner's. `reason` says which |
| **blocked** | Owes a check and cannot have a meaningful one yet. `reason` names the obstacle |

[`scripts/validate-check-coverage.mjs`](../../scripts/validate-check-coverage.mjs) enforces
**completeness and the ratchet, not the judgement**. Whether `facility_audit` really derives
no value is a reading of the widget, written in its `reason` for someone to disagree with. A
validator deciding that would assert something it cannot know.

## What happened

**The count reproduces.** Classifying all 51 independently gave **exactly 26** awaiting a
check, which is what the hand count said. One widget is `blocked`:
`find_health_facilities` does compute — a confidence threshold, a kind filter, a name
requirement — but its input is a live external source, so a recomputation cannot be pinned to
a fixture until a response is frozen. Counting it as exempt would have hidden it.

| | |
| --- | --- |
| Checked | 6 → **17** |
| Awaiting | 26 → **15** |
| Nothing to recompute | 18 |
| Blocked | 1 |
| Total | 51 |

**The ratchet bites in both directions**, verified by breaking it four ways: a widget dropped
from the file, an exemption with no reason, a check claimed that `parity.json` does not
record, and a count left stale. The stale-count message distinguishes the two ways it can
happen, because lowering a count without doing the work claims progress not made.

**Eleven checks are in**, all agreeing, chosen to get progressively less comfortable rather
than to pile up easy wins. Three of them recompute what the John Snow example actually does —
the pump cells, their clip to the reporting rectangle, and the deaths counted inside them — so
**that example is now independently recomputed end to end**.

`summarize_hull` against shapely:

| | |
| --- | --- |
| Hull vertices | 11 on both sides |
| Worst vertex separation | 1.95 × 10⁻⁹ m |
| Area difference | 0.0038 m² of 139,230 m² |
| Span difference | 0.018 m of 498 m |

`fill_interior_gaps` against shapely, on the 5 and 10 minute corridors — the only layer in
this project carrying interior holes:

| | |
| --- | --- |
| Interior rings dropped | 69 on both sides, none left in the output |
| Symmetric difference of the filled geometry | **0.0 m²** |
| Areas before, after, added | agreeing to 3.5 × 10⁻³ m² |
| What the fill claimed | 37,293 m² of 938,166 m² |

`summarize_combined_area` against shapely, on three nested bands:

| | |
| --- | --- |
| Combined area | 701,662.61 m² against 701,662.61 m², a difference of 3.4 × 10⁻³ m² |
| Symmetric difference of the union | **0.0 m²** |
| Summed parts, net of holes | agreeing to 1.4 × 10⁻³ m² |
| Overlap not double counted | 240,717 m², 26% of the sum |

**That third one is the most independent check in the lab.** Fieldwork unions with
`polyclip-ts` and measures with a shoelace sum; the reference unions with GEOS and measures
with GEOS. A union is where two libraries most plausibly differ, because it is where
coincident edges and near-degenerate intersections get decided — and the symmetric
difference is zero.

`clip_polygons` and `summarize_polygons` against shapely, on the example's own chain:

| | |
| --- | --- |
| Polygons surviving the clip | 8 of 8 on both sides, none escaping the boundary |
| Worst symmetric difference | 5.8 × 10⁻¹⁸ square degrees |
| Per-polygon counts and totals | **exact** over 250 locations in 8 polygons |
| Summary: records, matched, unmatched, unlocated, multiple | exact |

**And the second of those found a gap in its own fixture.** No location in the data lies on a
polygon edge and none belongs to two polygons, so the `include`/`exclude` boundary policy —
GEOS `covers` against `contains`, the part of this widget most likely to be got wrong — is
declared and **not exercised** by the comparison. A green result would have implied otherwise.
The notebook constructs the missing case: two cells meeting on a line, with a location
exactly on it, where `include` counts it for *both* cells and `exclude` for *neither*.

That is a shape of finding worth naming, because it will recur across the remaining twenty-one:
**a parity check passes on the data it was given, and the data may not contain the hard case.**
Reporting the count of boundary-lying and multiply-assigned locations, zero though both are
here, is what makes that visible instead of invisible.

`voronoi` against shapely is the strongest comparison the lab has made, because the two
methods share nothing: Fieldwork clips a rectangle with one half-plane per other site, and the
reference asks GEOS for the Voronoi diagram of the same projected points.

| | |
| --- | --- |
| Worst cell, by symmetric difference | 2.5 × 10⁻⁶ m² over 8 cells |
| Cells tiling the recomputed envelope | to 2.1 × 10⁻⁶ m² |
| Pairwise overlap | 6.0 × 10⁻⁷ m² |
| Every cell holding its own site | yes |

Its envelope is recomputed from the boundary by the declared rule rather than read from the
fixture, so the derivation is checked and not assumed.

`stack_polygons` against an independent sort is the opposite kind of check, and it is worth
naming as a kind: **there is no geometry to compare at all.** The widget concatenates layers
and orders them, so what is checked is a *rule*. Pinning that rule down was the work — extent
is the sum of every ring's absolute shoelace area in **square degrees**, unprojected, with
holes added rather than subtracted. It is a sort key and not a measurement, and the notebook
measures the gap on the real bands: extent exceeds the net area by 0.6%, 10.8% and 7.6% for
the 2, 5 and 10 minute corridors.

That check also reports something a passing result would otherwise hide: **ties.** Two
polygons of equal extent leave the order ambiguous, a sort is not required to be stable, and
the check would still pass while the drawn output varied between runs. There are none here,
which is why the expected order is the only order — and that is a fact about the data, not
about the widget.

**Two checks have now failed on their first run, both because the criterion was wrong rather
than the widget, and both failures were worth more than the passes.**

The second was simpler and is the more embarrassing: `19-snap` asked for the snap distance to
within 1 mm and got 3.7 mm. The widget reports `snapDistanceM` as `Number(d.toFixed(2))` — it
computes in full precision and *publishes centimetres*. 5 mm is half of its last reported digit.
The criterion had not read what the widget says it reports, which took one line of source to
check and was not checked.

The first is the one with a finding in it. `buffer_point` draws a 500 m circle; the criterion, fixed in advance,
asked that every vertex be within 1 m of 500 m measured as a geodesic distance on the WGS84
ellipsoid. The worst was **1.589 m**.

Investigating instead of widening the tolerance found that **Turf buffers on a sphere of
radius 6,371,008.8 m, and does so exactly** — the measured spread of vertex distances on that
sphere is **0.0000 m**. On the ellipsoid the same ring runs 500.28 to 501.59 m from the centre,
varying with direction. The widget was right and the criterion had the wrong earth model.

So a 500 m buffer is 500 m on a sphere and **up to 1.59 m more on the ground** — 0.32%, about
16 m on a 5 km scope. Nothing in this project recorded that before, and it was found only
because a criterion fixed in advance failed and was investigated rather than relaxed. A
tolerance chosen after seeing the answer would have been 2 m, would have passed, and would
have found nothing.

The two buffer widgets are also the first that **cannot** agree exactly with a reference, and
their criteria say so: Turf buffers in a local azimuthal equidistant projection and a
reference buffers in UTM, so the area comparison is relative at 0.5% with the quadrant count
declared. What *can* be checked exactly is the approximation itself, against the closed form
for a regular polygon inscribed in a circle — `(n/2π)·sin(2π/n)`, which reproduces the 0.99359
and 0.99960 this project had measured by hand at 32 and 128 vertices.

**`validate:parity` also caught a mistake in how the evidence was filed.** Both widgets were
first recorded against a single combined result, and the validator refused it: a parity result
declares the operation it recomputed, and one result cannot name two widgets. Split into
`17-buffer-point` and `18-buffer-area`. That is the ratchet working on the person operating
it, which is what it is for.

**The whole isochrone decomposition is now checked**, which was not a stated goal and is the
most useful structural consequence so far. `snap_to_network`, `reachable_nodes`,
`travel_time_band` and `reachable_corridor` each have an independent check, so the four steps
[80](80-network-snap.md)–[84](84-reachable-corridor.md) built out of the monolith are verified
separately. That makes `isochrone` itself checkable **against its own decomposition** rather
than against a new reference, which is a cheaper and stronger comparison than the plan assumed.

Those two checks also each found something the parity result alone would not have said.

**`19-snap` reports the margin to the second-nearest node, and one site's is 0.43 m.** No tie,
so the answer is unambiguous — but the choice is decided by less than a pavement's width, and a
different datum or node position would flip it. A check reporting only "the nodes agree" would
imply a robustness this data does not have.

**`20-band` tests a design claim rather than arithmetic.** The widget restates neither the
speed nor the direction, reading both from the junctions, so a band cannot disagree with the
traversal that produced it — and the reference recomputes the budget from the speed *carried on
the junctions* rather than from a parameter of its own. It also checks the part most likely to
be got wrong: a junction's remaining budget is recomputed against the band, not carried over.
Here the traversal was 1,125 m and the band 375 m, so carrying it over would put fifteen
minutes of reach at the edge of a five-minute corridor.

A convex hull was chosen first because it is **exact** — no tolerance to pick, no curve to
approximate, no iteration to converge — so a disagreement would have been real rather than a
question about allowances. The reference projects the points itself with pyproj instead of
using Fieldwork's projected metres, so the projection and the hull are checked together.

**Each notebook now has two parts**, as [94](94-where-explanation-belongs.md) requires.
Parity recomputes for a reviewer. **Dive deeper** varies the assumption the widget inherits:
here the projection, since the widget's own comment says a hull in degrees is "wrong by the
cosine of the latitude". Varying it produced a better lesson than expected — at Soho's
latitude, changing UTM zone barely moves the area, because the site sits near the 30N/31N
boundary. **The parameter a practitioner is most likely to get wrong is, here, the one that
matters least**, and that is not general: a site mid-zone would be distorted far more.

## What was decided, and what it changed

`validate:check-coverage` runs inside `npm run check`, so the number is in CI. The plan for
the remaining twenty-five groups them by the external implementation that would check them,
because the cost is dominated by the reference and the fixture, not by the widget:

| Reference | Widgets |
| --- | --- |
| **shapely / GEOS** | `clip_polygons`, `fill_interior_gaps`, `summarize_combined_area`, `summarize_polygons`, `buffer_area`, `buffer_point`, `stack_polygons`, `voronoi` |
| **numpy, plain arithmetic** | `nearest`, `access`, `facilities`, `coverage_check`, `compare_point_sets`, `rate`, `slr_threshold_comparison`, `slr_extract_import`, `slr_site_assignment` |
| **pandas** | `case_series` |
| **h3-py** | `hex_aggregate` |
| **networkx / shapely** | `snap_to_network`, `travel_time_band`, `isochrone` |
| **rasterio** | `sample_raster` |
| **scipy / statistics** | `donut_geomask` |
| **pyproj** | `samples` |

Two constraints the grouping has to respect, both learned the hard way:

**`sample_raster` cannot share a notebook with a pyproj check.** Requesting `rasterio`
alongside `pyproj` kills this Pyodide kernel ([97](97-the-browser-kernel-gate.md)), so a
raster check is its own notebook with its own narrow package list, as `02-clip` now is.

**`buffer_area` and `buffer_point` will not agree exactly and must not claim to.** Turf
buffers with 8 segments per quadrant; shapely's default is different. The criterion has to be
stated as an area tolerance with the quadrant count declared, the way `08-corridor` already
does, or the check will report a divergence that is a difference in declared approximation.

## What changed our minds

**The registry was supposed to answer question 1, and could not.** The plan was to derive the
classification from `implementation.definition`. Finding `src/core.ts#TYPES` in 39 of 51
releases changed the approach from derivation to declaration — and that is the better
outcome, because the valuable part turned out to be *writing the reason*. Deciding that
`network_input` validates rather than computes, or that `stack_polygons` orders by area and
therefore does compute, is a judgement that was never written down anywhere before.

**`find_health_facilities` nearly disappeared into "none".** It was classified as exempt
because its data is external, which is true and is not the same as having nothing to check.
Giving `blocked` its own expectation and its own count keeps it visible. An exemption and an
obstacle look identical in a total and are not the same thing.

**And the Dive Deeper section changed what it was for, twice.** It was conceived as "vary
the assumption and show the consequence". The hull's projection variation showed a *small*
consequence, and the honest lesson was that it is small **here** and would not be elsewhere.
A section built to demonstrate that assumptions matter has to be able to report that one
doesn't.

Then the same thing happened to the convexity warning, less comfortably. The notebook asks
how much of the hull is empty, expecting to illustrate that a convex hull asserts area
nobody observed. **91% of the hull is within 25 m of an observed death**: the deaths nearly
fill their own hull, and the warning, while true in general, is not what is happening here.

Worse, this project's first write-up of that cell asserted 23% without having read the
output — a number that fitted the lesson and was invented. The notebook now states the
measured 91% and says that a lower number would have read better and been no more true.

**And it happened again two checks later**, which makes it a pattern rather than a slip. The
parity note for `13-clip-polygons` claimed that clipping in degrees and in metres agree to
1e-7 relative. The measured figure is **5.9e-5** — 59 parts per million, three orders of
magnitude larger, still small enough for the conclusion to stand and not the number that was
written. Both were caught the same way: by going back to read the output before letting the
claim stand.

The rule this produces, and it is about writing rather than about geometry: **a number in
prose is a measurement or it is nothing.** Where a notebook computes a figure, the prose
around it should name what the figure means and let the cell print the value, rather than
restating a value from memory. Both errors were in hand-written prose beside a cell that had
the right answer in it.

## What this does not establish

**That the method scales.** Eleven of the twenty-six are written. Seven came out of the same
shapely group, reusing two fixture helpers — one for the Soho corridors and one for the
Voronoi chain. The cheap part was
cheap because the second and third checks shared a reference library and a data source with
the first. The groups that have neither — `case_series` against pandas, `donut_geomask`
against a distribution, `isochrone` as a whole — will not be three in an afternoon, and
`isochrone` is the monolith whose parity is a harder claim than any primitive's.

**That zero symmetric difference means more than it does.** It means the two unions covered
the same ground to the precision shapely reports, on this input. It is strong evidence about
`polyclip-ts` against GEOS here and not a general statement about either.

**That the 18 exemptions are right.** They are reasoned, not proven. The reasons are there to
be argued with, and the validator will not defend them.

**That a check means a widget is correct.** It means two implementations agree under a stated
criterion. `10-hull` agrees to 10⁻⁹ m on a hull that fills in ground the 1854 outbreak never
crossed — both implementations assert that area identically, and the notebook says so twice.

**And nothing about the 15 that remain.** They are now counted, named and grouped, which is
not the same as done. If the number sits at 25 in a month, the ratchet will say so, and that
is the point of it.
