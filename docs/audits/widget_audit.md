# Widget design audit

_Created 2026-10-09 · Updated 2026-10-09_

**Audit run 2026-10-09 against 39 widgets.** The primitive design audit D1–D10 in
[the audit procedure](ontology-audit.md) was written from the lessons consolidated in
[experiment 62](../experiments/62-workflow-traversal.md) and had never been run against what already
exists. This runs it. No code changes here; the findings are ordered for
[TODO](../../TODO.md).

A new gate applied only to new work leaves the existing set unexamined, and the existing
set is where the practitioner actually is. Several checks confirm what earlier records
already found, which is expected — the value is in the four that did not.

## Method

D1, D2 and D7 are judgment applied to every widget's declared ports, group, title and
description. D10 is mechanical (`npm run usage:widgets`). D3 and D4 were sampled rather
than applied exhaustively: naming each distinction in 39 release files is the work the
audit asks of an author at the time, and doing it retroactively for all of them is a
separate task. D5, D6, D8 and D9 are not applicable retroactively — they govern how a
primitive is designed, not what can be measured about one already built.

So this is a complete pass on four checks and a sampled pass on two. Where a finding rests
on a sample, it says so.

## D1 — what the 39 actually are

| Quadrant | Count | Widgets |
| --- | --- | --- |
| **Primitive** — residual knowledge, enforced, asked for by name | 17 | `area`, `observations`, `table_input`, `raster_input`, `network_input`, `reproject`, `clip_raster`, `voronoi`, `isochrone`, `mean_center`, `donut_geomask`, `hex_aggregate`, `measure_area`, `rate`, `slr_extract_import`, `map_output`, `table_output` |
| **Composite** — nothing residual, but asked for by name. Keep on the palette, build over shared parts | 11 | `summarize_polygons`, `case_series`, `slr_site_assignment`, `nearest`, `access`, `clip_polygons`, `buffer_area`, `compare_point_sets`, `coverage_check`, `facility_audit`, `slr_threshold_comparison` |
| **Example node** — bakes in one demonstration's specifics. Belongs in a template | 9 | `places`, `centers`, `alert`, `facilities`, `samples`, `xpert`, `policy`, `access_policy`, `comparison_map` |
| **Superseded** — a duplicate kept for compatibility | 2 | `output`, `chart_output` (see D2) |

The nine example nodes are all classified `standard` in `classification.json`, which means
*ships with the application* and is read as *applies to any domain*. `xpert` applies the
NB06 evidence hierarchy; `facilities` selects from a 214-point historical registry; `alert`
is a heat alert. That is the labelling problem
[experiment 60](../experiments/60-from-gis-studio-to-public-health-studio.md) identified,
now counted.

**Corrected 2026-10-09, after reading `renderLibrary`.** An earlier draft of this audit said
a practitioner sees all of these on the palette beside `Study area`. They do not. The
add-palette is filtered per example: `allowed` is the set of node types in the loaded
example's template, plus a hand-maintained list of general types. So `xpert` and `facilities`
appear only on Old Naledi, which is defensible.

The real finding is the inverse, and it is worse. Because the general list is maintained by
hand rather than derived from the classification, **general operations are unreachable from
examples that do not already use them**:

| Example | Addable | Not addable, though general |
| --- | --- | --- |
| old-naledi | 29 of 39 | `mean_center`, `compare_point_sets`, `hex_aggregate` |
| heat | 22 of 39 | the above, plus `area`, `measure_area`, `coverage_check`, `chart_output` |
| snow-voronoi | 21 of 39 | the above, plus `measure_area`, `coverage_check` |
| snow-geoprivacy | 24 of 39 | `measure_area`, `coverage_check`, `chart_output` |

A practitioner on Old Naledi cannot add Mean center or Group points in H3 cells; one on the
heat example cannot add a Study area or a Chart. Nothing marks these as unavailable — they
are simply absent. This is the same defect
[experiment 60](../experiments/60-from-gis-studio-to-public-health-studio.md) named one level
up: a mechanism that measures who ships a widget standing in for which domain it serves. The
palette's generality should be derived, not listed.

Eleven composites is the more important number. By the test in
[experiment 59](../experiments/59-pattern-for-engineered-knowledge.md) — a thick layer means a primitive is
missing underneath — eleven composites over a keyed join that is not itself a primitive says
the join is the missing primitive, which
[experiment 60](../experiments/60-from-gis-studio-to-public-health-studio.md) already concluded and nothing
has acted on. **None of these should leave the palette.** Factoring them is an
implementation change and must not lengthen any worked example's canvas (D9).

## D2 — four operations implemented more than once

| Operation | Implementations | Note |
| --- | --- | --- |
| Nearest-neighbour with distance | `nearest`, `access`, `slr_site_assignment` | Three. One is labelled a domain widget, two are standard |
| Generic result display | `output` against `map_output`, `table_output`, `chart_output` | `output` offers "map, table, or bar chart" in one node; the other three do it properly. Legacy, retained for saved workflows |
| Intersect a polygon with a boundary | `clip_polygons`, `clip_raster` | Not a true duplicate: the closed port-type union forces one widget per data kind. Recorded so it is not mistaken for one |
| Count into groups | `summarize_polygons`, `hex_aggregate`, `case_series` | The same group-and-aggregate over three different grouping keys — polygon, hex cell, time period |

## D3 — a distinction declared and enforced nowhere

Sampled, and the first sample found one. `buffer_area` exists to carry a distinction the
project considers important enough to have minted a term for: an **acquisition boundary** is
not a **reporting area**, so enlarging the download window must not enlarge the population
being reported on. Its own description says so.

`fw:AcquisitionBoundary` is declared in the vocabulary. `src/area-buffer.ts` types the
buffered output `fw:StudyArea`. The audit procedure's own term table admits this —
"`fw:AcquisitionBoundary` is declared but not yet emitted" — so the distinction exists as a
term, is stated in prose, and is enforced at no level. In the vocabulary of
[the glossary](../glossary.md) it is a **limitation** presented as though it were a term with
teeth. [Experiment 32](../experiments/32-john-snow-primitives.md) pins a regression expectation that a
larger download buffer must not enlarge the reporting population, so the behaviour is
checked by a test; the semantics are not checked by anything.

This is the same shape as the vertical datum in
[experiment 62](../experiments/62-workflow-traversal.md), and finding it on the first sample suggests the
exhaustive D3 pass is worth running rather than assumed clean.

## D3 — the registry format has a validation ceiling

Every one of the 39 release files declares `configuration.validationStatus:
"application-only"` with an empty `shaclShapes` array, and `evidence.status:
"not-individually-certified"`. That is not 39 independent judgments:
`scripts/validate-widgets.mjs` **requires** those exact values and rejects anything else
with "This registry version supports application validation only" and "Unsupported
certification claim".

So a widget cannot currently record that its contract is validated beyond the application
level, even where it is. `reproject` is the case that shows the cost: it has independent
numerical agreement recorded against pyproj in the Validation Lab, and its release file is
obliged to say its validation is application-only and it is not individually certified.
The evidence exists in `widgets/parity.json` instead, which is the right place for
post-release evidence — but the release file cannot point at it.

Raising the ceiling is a registry-format change, not a widget change, and it should be
argued in its own record before any widget tries to claim more.

## D4 — unchanged from experiment 62

Twelve run-time `Connect …` checks, of which four are wrong-producer conditions that a
narrowed port type would make unreachable, and eight are presence, arity or graph-shape
conditions that belong in `validateWorkflow`. Recorded there; not re-derived here.

## D7 — one name claims more than the operation does

`raster_input` is titled "Raster input" and described as "**Acquire** a GeoTIFF window
around the study area". Nothing in `src/raster.ts` or `src/raster-workflow.ts` fetches
anything: it reads a local file the practitioner already obtained.

By the project's own rule — established when `stac_input` became `stac_discovery`
([39](../experiments/39-stac-discovery-and-remote-acquisition.md)) and restated as a naming rule in
[47](../experiments/47-sea-level-pack.md) — an operation that reads a file somebody else produced is an
**import**, not an acquisition, and the import carries the heavier provenance duty of the
two. The widget does carry raster source metadata and citation
([26](../experiments/26-raster-source-provenance.md)), so the duty is discharged; only the word is wrong.
The title is right and the description is not.

`network_input` says "Download OSM by study area or upload a directed graph", which is
accurate: it does fetch, and [experiment 32](../experiments/32-john-snow-primitives.md) records a live
download. No finding there.

## Palette groups do not survive the audit

Not one of the ten checks, but visible while running them, and it affects every
practitioner. The four groups are Sources, Spatial operations, Summaries and Semantic
reasoning. **Semantic reasoning** currently holds two unlike kinds of thing:

- N3 rule applications, where a reasoner evaluates stated rules: `policy`, `xpert`,
  `access_policy`
- plain predicates with no reasoning at all: `coverage_check` is a point-in-polygon test,
  `slr_threshold_comparison` compares two numbers

Calling a numeric comparison "semantic reasoning" overstates it in exactly the way the
naming rule forbids, and it is the group a newcomer is most likely to misread.

## D7 — a port name that claims more than the port carries

_Added 2026-10-10._ Found while decomposing the workflow stages, after a
practitioner pointed out that Fieldwork cannot judge.

The output port of `slr_threshold_comparison` is called **`decisions`**. What it
carries is records labelled against a criterion the practitioner supplied — the
threshold, the vertical datum, the elevation field. The software compares two
numbers and applies the label. Nobody decided anything.

The name matters because it is the one a reader meets when wiring a workflow, and
a port called `decisions` invites the reading that the application reached them.
`classifications` would say what travels. The widget's own title is honest —
"Compare level to elevation" — so the overclaim is in the port alone.

**Not fixed.** Renaming a port type is a base-contract change, blocked on
[66](../experiments/66-ports-as-schema-binding.md) along with the rest of the port
work. Recorded here so the rename rides with that work rather than becoming a
separate migration.

The same reading applies to `policy`, already recorded below as a category noun.
A widget typed `policy` that emits `decisions` reads as though the software set
the policy and then decided. It applies a rule somebody wrote.

## D7, continued — the names, against the convention

The [naming convention](ontology-audit.md) was written after this audit's first pass. Applied to
the 39, it finds one clear defect already fixed and eight names that would not be chosen today.

| Node type | Problem | Would be |
| --- | --- | --- |
| `xpert` | Names a **diagnostic product**; the operation classifies facility evidence against a hierarchy from a source notebook, and nothing in it concerns that product. Its title, "Diagnostic evidence", does not match the identifier either | `tb_facility_evidence`, or a declared ruleset under the general rule widget ([65](../experiments/65-ruleset-as-data.md)) |
| `policy`, `access_policy` | Category nouns. Which policy? | `heat_outreach_rule`, `facility_access_rule`, or rulesets |
| `access` | Names a category, and the same word as its port | `nearest_eligible_facility` |
| `alert` | An example's parameter, not an operation | not a node at all ([64](../experiments/64-widget-streamlining.md), Phase 2) |
| `places`, `centers`, `facilities` | Name the content of one demonstration | retired or domain-prefixed |
| `nearest` | A bare adjective | `measure_distance` |
| `output` | The plainest name, held by the superseded node, while `map_output` and friends are the real ones | retired from the palette |

`voronoi` and `isochrone` stay as they are: the method name is the practitioner's term, which
the convention admits as an explicit exception.

None of these is urgent on its own, and renaming is a migration, so they should ride with the
work that touches each widget anyway rather than becoming a renaming pass. The one worth
recording as a finding rather than a preference is `xpert`, because a product name on an
operation that does not concern that product will mislead every new reader.

## D10 — four widgets no example exercises

`npm run usage:widgets`: 35 of 39 instantiated across eight shipped examples and four frozen
fixtures. The four at zero are `places` and `centers`, which are retired legacy identities
and correctly unexercised, and **`rate` and `reproject`**, which are current, implemented and
undemonstrated. `rate` is the widget
[experiments 59](../experiments/59-pattern-for-engineered-knowledge.md) and
[60](../experiments/60-from-gis-studio-to-public-health-studio.md) both nominate as the next domain
exercise, and whose refusal — a denominator whose vintage disagrees with the numerator
period — [experiment 51](../experiments/51-dataset-profiles.md) calls the most common serious error in the
field.

## What follows, in order

1. **Exhaustive D3 pass.** One sample found one unenforced distinction. Either the rest are
   clean, which is worth knowing, or they are not, which is worth knowing more. Cheapest
   high-value item here.
2. **Correct the `raster_input` description.** One word, and it is the project's own rule.
3. **Split the Semantic reasoning group**, separating rule application from plain predicates.
4. **Move the nine example nodes to templates.** Shrinks the palette and stops them reading
   as general tools. Needs a migration path, since saved workflows reference them.
5. **Factor the keyed join**, replacing three nearest implementations, with the composites
   keeping their palette entries and no worked example growing a node (D9).
6. **A `rate` worked example**, which closes the only D10 gap that matters.

## What this cannot establish

That the D1 quadrants are right: each is a judgment from declared ports and a one-line
description, and an author who knows a widget's history may reclassify it — the audit asks
the author to state the quadrant for exactly that reason. That the unsampled 33 release
files pass D3, since they were not read. That any of this improves a practitioner's
experience, which only the observation in
[experiment 63](../experiments/63-worked-example-runbooks.md) and a usability review would show. And it
establishes nothing about the correctness of any widget's computation: this is an audit of
design alignment, not of results.
