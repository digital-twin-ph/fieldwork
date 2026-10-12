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

_Restructured 2026-10-12, after the practitioner said there should only be two kinds of widget:
primitive and composite._

That is right, and the earlier version of this table had it wrong. It listed four quadrants as
four kinds, where [D1](ontology-audit.md) actually has **two axes**: one decides the kind, the
other decides where the widget belongs. "Example node" and "internal primitive" are not kinds —
they are a composite or a primitive in the wrong place. "Superseded" is a lifecycle state, and a
superseded widget still has a kind.

So the kind is one of two, and placement is reported beside it.

| Kind | Count | Widgets |
| --- | --- | --- |
| **Primitive** — a distinction remains that does not follow from its parts | 20 | `area`, `observations`, `table_input`, `raster_input`, `network_input`, `reproject`, `clip_raster`, `voronoi`, `isochrone`, `mean_center`, `donut_geomask`, `hex_aggregate`, `measure_area`, `rate`, `slr_extract_import`, `map_output`, `table_output`, `alert`, `samples`, `xpert` |
| **Composite** — no residual distinction; it is its parts arranged | 19 | `summarize_polygons`, `case_series`, `slr_site_assignment`, `nearest`, `access`, `clip_polygons`, `buffer_area`, `compare_point_sets`, `coverage_check`, `facility_audit`, `slr_threshold_comparison`, `places`, `centers`, `facilities`, `policy`, `access_policy`, `comparison_map`, `output`, `chart_output` |

And the placements that are wrong, which is what the old "example node" row was really reporting:

| Placement problem | Widgets | What it is |
| --- | --- | --- |
| **Bakes in one demonstration's specifics** | `places`, `centers`, `alert`, `facilities`, `samples`, `xpert`, `policy`, `access_policy`, `comparison_map` | Nine widgets whose *kind* is fine and whose *name or data* belongs to a worked example. Two — `places`, `centers` — already migrate into `observations` |
| **Superseded, kept for compatibility** | `output`, `chart_output` | A lifecycle state, not a kind. Both are composites |

**Where the eleven went, and why**, since assigning a kind to them is a judgement and not a
lookup:

| Widget | Kind | Reasoning |
| --- | --- | --- |
| `alert` | primitive | Declaring an external condition and the date it applies to is irreducible: nothing in the application derives it. The name bakes in "heat", which is a naming problem, not a kind problem |
| `samples` | primitive | Generating a regular grid at a stated spacing is residual. Its defaults are Old Naledi's |
| `xpert` | primitive | Grading evidence against a declared hierarchy is residual knowledge the reasoner applies; the hierarchy is NB06's and the name is a product's |
| `places`, `centers` | composite | `observations` with one example's data baked in. Already superseded by it, with adapters |
| `facilities` | composite | A radius filter over a bundled registry: nearest-neighbour-with-distance plus data |
| `policy`, `access_policy` | composite | Rule applications. The rules are data; the widget arranges a reasoner call |
| `comparison_map` | composite | Displays a comparison another widget computed |
| `output`, `chart_output` | composite | Presentation, and superseded |

**This audit covers 39 of 51 widgets.** Twelve have been added since it ran on 2026-10-09 and
have never been through D1: `buffer_point`, `fill_interior_gaps`, `find_health_facilities`,
`micro_workflow`, `reachable_corridor`, `reachable_nodes`, `sample_raster`, `snap_to_network`,
`stack_polygons`, `summarize_combined_area`, `summarize_hull`, `travel_time_band`. Each had an
admission review at the time, which states a kind, so the gap is in this table and not in the
record — but the counts above are of 39 and should not be read as current.

The nine with a placement problem are all classified `standard` in `classification.json`, which means
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

## The way out is already paved

_Added 2026-10-12, after the practitioner restated the principle: no widget should be
name-attached to a worked example._

The nine example-bound widgets above are a naming problem with a known remedy, and this codebase has
already applied it. Six widgets carry `migrationFrom` adapters that rename a node type and
migrate saved workflows across it:

| From | To |
| --- | --- |
| `places`, `centers` | `observations` |
| `output` | `map_output`, `table_output`, `chart_output` |
| `healthsites_discovery` | `find_health_facilities` |
| `facilities` | itself, for a source change |

So two of the nine — `places` and `centers` — have *already* been superseded by a general name,
with a migration. The principle and the mechanism are both established; what is missing is
having applied them to the other seven.

What a rename costs, recorded so the scope is a choice and not a surprise: `type` is persisted
in saved workflows and needs an adapter; `urn:fieldwork:widget:<nodeType>` is identity, so a
rename supersedes rather than edits and release files stay immutable; `widgets/parity.json` keys
on that IRI, and of the nine example-bound widgets only `samples` is awaiting a check and none has one,
so renaming them costs no evidence; compositions pin a `nodeType`, and
`compute_walking_catchment` pins none of them.

The cheapest order is therefore the nine example-bound widgets first: no parity evidence to re-point, no
composition pins to update, and two of them already done.

**And the sea-level three are a separate decision**, not a fourth group. Pack work is postponed
([67](../experiments/67-sample-raster-at-points.md) — the missing raster-sampling primitive "is
the gap that postpones the pack work rather than the other way round"), so their `domain`
classification is not an active programme. Their genericity differs:
`slr_site_assignment` is a one-off of nearest-neighbour-with-distance, as the next section
establishes; `slr_extract_import` is general in shape while its keys and its three obligatory
citations are AR6's; and `slr_threshold_comparison` is genuinely domain-bound, because refusing
an elevation not measured from the baseline sea surface is the knowledge it exists to carry.

## D2, sharpened — what is left of `slr_site_assignment`

_Added 2026-10-10, after a practitioner asked what the essence of this widget is
and whether it is a one-off._

It is a one-off of **nearest-neighbour with distance**, which the table above
already records as having three implementations. This entry says what remains
when that operation is taken away.

The widget has three inputs: `points`, `sites`, `projections`. The third is used
in one place — `const known=new Set(extract.siteIds)` — to drop sites the extract
carries no values for, and to refuse when none match. Nothing else about the
operation is sea-level-specific. The distance is computed the same way `nearest`
and `access` compute it.

So the residue is a single validity rule: **do not offer an assignment to a site
the extract cannot answer for.** That rule can also be satisfied by the data. The
Manila example restricts its site layer to the eight gauges the extract covers,
for exactly this reason, and with that restriction the third input does nothing.

Which leaves a choice rather than an obvious answer:

- **Keep the input** and the widget enforces the rule itself, so a practitioner
  cannot assemble a wrong workflow. The widget stays domain-specific.
- **Drop the input** and the rule moves to the data, where it is satisfied by
  preparing the site layer. The widget becomes a general nearest join, and the
  rule becomes a convention nothing enforces.

The classification above already answers the composite question: keep the palette
entry, because a practitioner asks for "assign each facility its nearest gauge" by
name, and build it over a shared join. That is item 5 of this audit's plan and has
not been done. What is new here is that the sharing is cheaper than it looked —
the domain part is one filter, not an algorithm.

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
4. **Move the nine example-bound widgets to templates.** Shrinks the palette and stops them reading
   as general tools. Needs a migration path, since saved workflows reference them.
5. **Factor the keyed join**, replacing three nearest implementations, with the composites
   keeping their palette entries and no worked example growing a node (D9).
6. **A `rate` worked example**, which closes the only D10 gap that matters.

## What this cannot establish

That the D1 kinds and placements are right: each is a judgment from declared ports and a one-line
description, and an author who knows a widget's history may reclassify it — the audit asks
the author to state both for exactly that reason. That the unsampled 33 release
files pass D3, since they were not read. That any of this improves a practitioner's
experience, which only the observation in
[experiment 63](../experiments/63-worked-example-runbooks.md) and a usability review would show. And it
establishes nothing about the correctness of any widget's computation: this is an audit of
design alignment, not of results.
