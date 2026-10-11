# 98 · The coverage ratchet, and the first of the twenty-six

_Created 2026-10-11 · Updated 2026-10-11_

**Status:** tried — the ratchet is built, gated and verified against four failure modes, and
one of the twenty-six widgets now has a check. The plan for the other twenty-five is written
and untested; calling it `validated` would claim a method that has run once.

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
| Checked | 6 → **7** |
| Awaiting | 26 → **25** |
| Nothing to recompute | 18 |
| Blocked | 1 |
| Total | 51 |

**The ratchet bites in both directions**, verified by breaking it four ways: a widget dropped
from the file, an exemption with no reason, a check claimed that `parity.json` does not
record, and a count left stale. The stale-count message distinguishes the two ways it can
happen, because lowering a count without doing the work claims progress not made.

**And the first check is in.** `summarize_hull` against shapely:

| | |
| --- | --- |
| Hull vertices | 11 on both sides |
| Worst vertex separation | 1.95 × 10⁻⁹ m |
| Area difference | 0.0038 m² of 139,230 m² |
| Span difference | 0.018 m of 498 m |

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
output — a number that fitted the lesson and was invented. It was caught by going back to
check a figure before standing behind it, which is the only reason it is a correction rather
than a published claim. The notebook now states the measured 91% and says that a lower
number would have read better and been no more true.

## What this does not establish

**That the method scales.** One check of the twenty-six is written, and it was deliberately
the easiest: exact, two-dimensional, no tolerance to argue about. The next eight are shapely
geometry with real approximation questions, and `isochrone` is the monolith whose parity is a
harder claim than any primitive's.

**That the 18 exemptions are right.** They are reasoned, not proven. The reasons are there to
be argued with, and the validator will not defend them.

**That a check means a widget is correct.** It means two implementations agree under a stated
criterion. `10-hull` agrees to 10⁻⁹ m on a hull that fills in ground the 1854 outbreak never
crossed — both implementations assert that area identically, and the notebook says so twice.

**And nothing about the 25 that remain.** They are now counted, named and grouped, which is
not the same as done. If the number sits at 25 in a month, the ratchet will say so, and that
is the point of it.
