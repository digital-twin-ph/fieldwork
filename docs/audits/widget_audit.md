# Widget design audit

_Created 2026-10-10 · Updated 2026-10-15_

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

**Completed to 51 on 2026-10-12**, after the practitioner directed that the audit work finish
before any validation work. The twelve added since 2026-10-09 each stated a kind in their own
admission review, so this is a transcription and not a fresh judgement:

| Widget | Kind | Stated in |
| --- | --- | --- |
| `summarize_hull` | primitive | [80](../experiments/80-convex-hull.md) |
| `summarize_combined_area` | primitive | [81](../experiments/81-combined-area.md) |
| `snap_to_network` | primitive | [82](../experiments/82-snap-to-network.md) |
| `reachable_nodes` | primitive | [83](../experiments/83-reachable-junctions.md) |
| `reachable_corridor` | primitive | [84](../experiments/84-reachable-corridor.md) |
| `travel_time_band` | primitive | [85](../experiments/85-travel-time-bands.md) |
| `stack_polygons` | primitive | [86](../experiments/86-isochrone-output-stage.md) |
| `fill_interior_gaps` | primitive | [88](../experiments/88-filling-interior-gaps.md) |
| `buffer_point` | primitive | [68](../experiments/68-area-around-a-point.md) |
| `sample_raster` | primitive | [67](../experiments/67-sample-raster-at-points.md) |
| `find_health_facilities` | primitive | its admission review |
| **`micro_workflow`** | **composite** | see below |

`micro_workflow` is the one that needed deciding rather than transcribing.
[75](../experiments/75-compositions-as-nodes.md) says *"D1 and D7 are about primitives. A
composition is not one"* — true, and under the two-kind rule it still has a kind. A
micro-workflow **is** its members arranged, with nothing residual, and it asserts
`fw:claimsNoComputation` in every run's provenance to say so. That is the definition of a
composite, and the purest instance in the registry.

**So the current counts are 31 primitive and 20 composite, of 51.** The placement problems are
unchanged: nine example-bound, two superseded.

### D7, swept across all 51 — four port names encode a use

_Added 2026-10-12. D7 had been applied to titles and descriptions, and to one port name
opportunistically. This is the first sweep of every declared port._

| Widget | Port | Carries | |
| --- | --- | --- | --- |
| `nearest` | `places` | `points` | the heat demo's vocabulary in a general contract |
| `nearest` | `centers` | `points` | likewise — and these two are why the merge in the next section was not obvious |
| `access` | `samples` | `points` | named after the widget that happens to feed it in Old Naledi |
| `compare_point_sets` | `pumps` | `points` | named after John Snow's pumps; it carries any context layer |

Everything else passes, and two patterns are worth recording as passing deliberately. **Role
names are not uses**: `original`/`moved` on `compare_point_sets`, `reached` on
`travel_time_band` and `reachable_corridor`, `sites` on `snap_to_network` — each distinguishes
same-typed inputs by the part they play, which is what a port name is for. And **numbered
inputs** — `polygons_2` to `polygons_6` on `stack_polygons` — carry no claim at all.

The separate problem is **port types** that are custom studs: `gradedFacilities`, `access`,
`distances`, `alert`, `facilities`, `point-comparison`, `coverage-check`. Those are D4a, not D7,
and they are the reason the three nearest-neighbour implementations cannot merge by rename.

### D2 followed through on the second duplicate — and it does not merge

The table above records a second duplicate: **count into groups**, implemented by
`summarize_polygons`, `hex_aggregate` and `case_series`. Run through the follow-through
[103](../experiments/103-duplicates-should-merge.md) added:

1. **Which is general?** **None of them.** The shared operation is "group records by a key and
   aggregate", and not one of the three implements it generically — each *is* a grouping key.
2. **What does each add?** `summarize_polygons` adds spatial containment with a boundary policy;
   `hex_aggregate` adds H3 indexing at a resolution plus a sparse-cell rule; `case_series` adds
   calendar binning with empty periods retained and a declared date kind.
3. **Operation or domain?** **Operation, all three.** Containment, hex indexing and calendar
   arithmetic are different computations, not different subject matter.

So they stay. This is the follow-through working as intended rather than failing to fire: it is
not a merge machine, and its value is that it now produces a *reasoned* no as readily as a yes.
What remains is the Phase 3 code factoring — one group-and-aggregate implementation behind three
keys — which changes no palette entry.

**This audit covered 39 of 51 widgets when it ran.** Twelve have been added since it ran on 2026-10-09 and
have never been through D1: `buffer_point`, `fill_interior_gaps`, `find_health_facilities`,
`micro_workflow`, `reachable_corridor`, `reachable_nodes`, `sample_raster`, `snap_to_network`,
`stack_polygons`, `summarize_combined_area`, `summarize_hull`, `travel_time_band`. Each had an admission review at the time stating a
kind, so the gap was in this table and not in the record.

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

A practitioner on Old Naledi cannot add Mean center or Aggregate points in hexagons; one on the
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

## D2, followed through — `nearest` is the general one

_Added 2026-10-12, after the practitioner observed that this audit should have found the merge
and did not. The procedure gap is recorded in
[103](../experiments/103-duplicates-should-merge.md) and D2 now requires this follow-through._

The table above records three implementations of nearest-neighbour-with-distance and stops. Under
the extended D2 it has to name which is general and what each other adds:

| | |
| --- | --- |
| **`nearest` — the general one** | For each point in A, the nearest in B: the distance, which one won, and `distanceKm: null` with a stated reason when a point has no geometry or B is empty. That last part is load-bearing — it is what lets `policy` answer `Unknown` instead of defaulting |
| `access` | Adds a speed, turning distance into a proxy travel time, plus a service and evidence grading. **Domain** |
| `slr_site_assignment` | Adds one validity rule — do not assign a site the extract cannot answer for — which the next section shows is satisfiable by preparing the site layer. **Domain** |

Both additions are domain rather than operation, so **both merge into `nearest`**.

**What blocks it is not the operation.** `nearest` is general inside and example-bound outside:

```
inputs: [['places','points'], ['centers','points']]
output: 'distances'
```

Both inputs carry the general type `points`; the **names** are the heat demo's, so wiring a
facility layer to a tide-gauge layer means connecting "places" to "centers". And the three
implementations carry three different carriers out — `distances`, `access`, `table` — so
collapsing them is a base-contract change, blocked on
[66](../experiments/66-ports-as-schema-binding.md) with the rest of the port work, not a rename.

So the order is: make `nearest` general first — port names, title, and the ontology mapping
Phase 1 flagged it as missing — and the other two then have something to merge into. A
retirement-first plan has this dependency inverted.

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

## The sea-level three, audited against the primitives

_Added 2026-10-13, after the practitioner asked for these two next on the grounds that
postponing the worked example makes their decomposition the open question rather than a
deferred one._

**First, a correction to the premise.** These were not unaudited: `slr_extract_import` and
`slr_site_assignment` are classified under D1 above, `slr_site_assignment` has its own
D2 section, and `slr_threshold_comparison` has its own D7 section. What was deferred was the
*decision* — "the sea-level three are a separate decision", on the grounds that pack work is
postponed. Deferring a decision and never auditing are different states, and the earlier text
let them read alike. This section makes the decision.

**What changed since that deferral is a knob.** `nearest` gained
`candidateFilter?:CandidateCondition[]` on 2026-10-12 — `in`/`notIn` over a declared set of
values — because that was what `access` added over the general search
([107](../experiments/107-knobs-and-contracts.md)). That knob is the same shape as the whole
domain residue of `slr_site_assignment`, which the D2 section above had already reduced to
"one filter, not an algorithm". The reduction was recorded and then the machinery to carry it
arrived for an unrelated widget. Nothing re-read the earlier finding against it, which is the
procedure gap [103](../experiments/103-duplicates-should-merge.md) exists to close.

### Measured, not argued

Run against the one worked example (`src/sea-level-example.ts`, 194 Manila facilities, 8 AR6
sites, 288 projection rows) on 2026-10-13:

| Claim | Measurement |
| --- | --- |
| The extract's site ids and the site layer's site ids | Identical sets: `145, 260, 394, 522, 537, 664, 1708, 1711` |
| Sites the extract cannot answer for | **None.** The validity rule that is this widget's entire domain residue excludes nothing in the only workflow that runs it |
| `slr_threshold_comparison` in the worked example | **Absent.** The example ends at `slr_site_assignment` → `map_output`/`table_output` |

`widgets/evidence.json` already carried the third row and it was not read: the widget's rung is
**`declared only`** — no example use, no lab check, no field use. It is registered, in the
palette and in the catalog's counts, and nothing anywhere exercises it. That is the state the
practitioner exempted from the numbers rule on 2026-10-12 ("pending, not developed, not used"),
and the exemption is sound; what is not sound is that it reads as a shipped widget.

### `slr_site_assignment` — a composition of two primitives and a gap

```
nearest(points, sites, candidateFilter:[{field:'site_id', comparator:'in', values:[…]}])
```

That is the whole operation. The search is already the shared one — `assignSites` calls
`nearestOf` from `src/nearest-neighbour.ts`, the same function `nearest` and the retired
`access` called — so there is no algorithm to merge, only a contract to retire. Two things
genuinely do not fit, and both are gaps rather than reasons to keep the widget:

**Gap 1 — the filter's values are computed, not authored.** `candidateFilter` holds literal
values a person typed. Here they are `extract.siteIds`, read from a connected port at run time.
Authoring the eight ids would duplicate the extract in the workflow and go stale against it
silently, which is worse than the widget. So the knob needs a second binding form: *values from
a column of a connected input*. This is the same need [61](../experiments/61-role-binding.md)
raises for role binding and [106](../experiments/106-rule-builder-ui.md) for authored
conditions — a third caller for one form, which is the argument for building it.

**Gap 2 — the output carrier.** `nearest` emits `distances`; this widget emits `table` with an
`assignments` rider, because `slr_threshold_comparison` reads `table.assignments`. Riding
structured data on a general port is the same move `slr_extract_import` makes with its
`projection` rider, and both are what [66](../experiments/66-ports-as-schema-binding.md)
blocks on. Two widgets smuggling a private shape through a shared port is a carrier question,
not a sea-level question.

**Decision: retire it into `nearest` once Gap 1 is closed.** Not before — with the filter
authored by hand the workflow would be wrong in a way nothing catches, and the no-op
measurement above is a property of this example's data, not a guarantee. Recorded as a blocker
so it is revisited rather than remembered.

### `slr_extract_import` — not a source, and the obligations are a ruleset

Its contract is `inputs:[['projections','table']] → table`. **It acquires nothing.** The table
arrives from `table_input`; this widget validates it and annotates provenance onto it. Yet it
is grouped under **Sources**, which is the same defect as `reproject` filed there — a widget
whose group states a stage its contract does not occupy. The naming ratchet added today does not
catch it, because its `transform-in-sources` rule keys on transform verbs and this type opens
with `slr`. The rule is too narrow: what it should ask is whether a widget in Sources acquires
anything, which is checkable — a source has no inputs, or carries acquired data in its params as
`find_health_facilities` does.

Taking the operation away leaves eight refusals, every one of them a declared obligation with a
citable basis:

| Refusal | Basis |
| --- | --- |
| Key columns must be complete | A projected value without its full key cannot be interpreted |
| Values in `millimetre` or `metre`, never guessed | AR6 publishes mm; measured 2026-10-09 from the confidence file |
| Dataset IRI, version and baseline period stated | Values are not comparable across versions or baselines |
| `basisKind` declared as workflow or confidence-pbox | A p-box bound is not a quantile of one distribution |
| At least three citations | The dataset licence makes them obligatory |
| Two distinct family values, and every row in one of them | Values including and excluding vertical land motion are not comparable |

This is exactly the form [65](../experiments/65-ruleset-as-data.md) built: declared rules
carrying `basis.evidence`, which the three shipped rulesets already use, and the licence and the
AR6 chapter are the evidence references. The residual function under **D11** is real — nobody
else refuses an unstated vertical-land-motion family — but it is a residual *ruleset*, not a
residual widget. The general shape is "admit a connected table as a bounded extract of a
published dataset, under stated obligations", which is not sea-level-specific at all; only the
obligations are.

**Decision: keep the widget for now, move it out of Sources, and express the obligations as a
declared admission ruleset.** The move is free. The ruleset is the real work and it is the
fourth caller for the ruleset machinery, which strengthens rather than complicates it.

### `slr_threshold_comparison` — hold, and say so

Genuinely domain-bound, as the deferral said: refusing an elevation not measured from the
baseline sea surface is the knowledge it exists to carry. But at rung `declared only` it has
never run in any workflow, so there is nothing to audit against — D8 cannot be applied to a
widget no evidence touches. It should not be in the palette while that is true, which is the
same argument as the domain-widget gate: offered means claimed.

### What this means for the worked example

If the sea-level example is kept, the workflow becomes `table_input` → extract admission →
`nearest` with a bound candidate filter → outputs, and the two gaps above are what stands
between that and today's three widgets. Neither gap is sea-level knowledge. Both are general
mechanism the project already wants for other reasons, which is the strongest available argument
that these widgets are a composition and not a domain.

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

## D2, a fourth implementation — `snap_to_network`

_Added 2026-10-17, after the practitioner observed that OSMnx's `nearest_nodes` is what computes
the first and last **distance legs** either side of a network traversal, and asked whether a
widget that obtains those distances separately is a duplicate: "If there is already a function
that obtains D1 and D3 distances that is a duplicate and needs to be removed."_

> **A collision, stated before it causes one.** In the practitioner's usage — taken from the
> [Cholera Advanced 1 notebooks](../glossary.md#route-distance-legs), which use OSMnx and are the
> same upstream work that produced the street network this project ships — **D stands for
> distance**: D1 origin to the network, D2 along the network, D3 network to destination. In *this
> document* D1–D10 are the **primitive design audit checks**, and D2 is the duplicate-operation
> check. Same token, two meanings, both already in this repository. Below, the audit checks keep
> the bare form and the distance legs are written out.

It is. D2's table records **three** implementations of nearest-neighbour-with-distance; this is a
fourth, and the evidence is in its own source rather than inferred.

`src/network-snap.ts` opens: *"Which network node each site attaches to, and how far that is from
the site"* — the operation, stated. Inside, above the search: *"Same nearest-node search isochrone
performs, kept identical so the two agree."* And the header records where it came from:
*"Extracted from `isochrone`, which does this before it does anything else."* So the computation
exists twice by design, and a third time in `measure_distance`'s general form.

**The determination D2 now requires:**

1. **The general implementation** is `measure_distance` — for each point in A, the nearest in B
   with the distance.
2. **What `snap_to_network` adds** is two things, and they classify differently.
   - *Nearest over a network's nodes rather than a point layer.* A network node is a point; this
     is a port-type matter, not an operation. **Domain.**
   - *Relocating the geometry to the chosen node.* A distinct act — and one this project should
     not want. OSMnx's `nearest_nodes` returns the node and the distance and moves nothing; the
     **first distance leg** is then an explicit component rather than a displacement. Here the
     node is already carried as `networkNodeId` and that leg as `snapDistanceM`, so the move adds
     nothing the attributes do not already say, and costs the site's own position.
3. **Disposition: it merges.** What it adds that is real is domain; what it adds that is an
   operation is a lossy encoding of facts it already records.

**The move is already being worked around.** On 2026-10-14 the widget gained `siteLongitude` and
`siteLatitude` as properties, with the comment *"Where the site actually is, kept on the point
that no longer stands there … snapping overwrites the geometry with the junction's, so until now
the only trace of the site's own position was a distance"*. `reachable_corridor` needed the
original back to draw the first leg. A widget that overwrites a value and then carries a shadow
copy so consumers can undo it is describing its own merge — and it is the same pattern a
practitioner named on 2026-10-16 about data repairs: *keep the original, work on a copy.*

**What blocks the retirement — smaller than first written here.** This section claimed on
2026-10-17 that "the John Snow catchment examples wire it explicitly". **They do not.** No
example module references `snap_to_network`; the only "snap" in `src/john-snow.ts` is the word
*snapshot* in a layer label. The claim was asserted without being checked, and is corrected in
place rather than quietly deleted: an audit that is wrong about what depends on a widget is
worse than one that says nothing.

What actually depends on it:

| | How |
| --- | --- |
| `reachable_nodes` | reads `networkNodeId` from the points it is given |
| `reachable_corridor` | reads `networkNodeId`, and `siteLongitude`/`siteLatitude`/`snapDistanceM` **when present** — `src/reachable-corridor.ts` says *"when the junctions came through `snap_to_network`"* |
| four test files | `network-snap`, `reachable-nodes`, `stack-polygons`, `micro-workflow` |

Both consumers read **attributes**, not the widget, and the corridor already treats the first-leg
distance as optional. So whatever emits `networkNodeId` and that distance satisfies them, and the
merge is smaller than a base-contract rewrite: the general operation gains those two attributes,
leaves the geometry alone, and `snap_to_network` becomes declarable as retired.

The order still matters. A retired widget never runs and the loader refuses it, so the general
operation must emit the attributes **before** the flag is set, or a saved workflow holding the
widget stops loading.

### Worked further, 2026-10-17 — what the retirement actually costs

**Done: the search is now one function.** It existed twice, character for character, in
`isochrone` and in `snap_to_network`, the latter carrying the comment *"Same nearest-node search
isochrone performs, kept identical so the two agree"* — a duplication admitting itself and
relying on care. `nearestNetworkNode` in `src/catchments.ts` is the single implementation and
both call it. The parity tests between the chain and the monolith pass unchanged, which is what
makes the factoring safe to claim.

That is D2's duplication resolved **in the code**. The widget question is separate and the
blocker is sharper than this entry first recorded:

**`reachable_nodes` cannot do the search itself, because it has no metric CRS.** Its parameters
are `minutes`, `speedMPerMin`, `direction`, `travelMode` — no zone, no hemisphere — and it never
calls `metric()`. `snap_to_network` takes a zone precisely because *it* does the metric work. So
`reachable_nodes` throws today when an origin lacks `networkNodeId`: *"this origin is not on the
network. Add a Snap to street network step before this one."* That line is the dependency.

So retiring the widget is not two attributes on a general operation. In order:

1. `reachable_nodes` gains a zone and hemisphere — **a parameter contract change**, needing a new
   widget release, Inspector controls, and a migration for saved nodes that carry neither.
2. It snaps internally via `nearestNetworkNode` when an origin arrives un-snapped, and keeps
   reading `networkNodeId` when one is already there, so both orders of workflow keep working.
3. The geometry overwrite goes. A point keeps its own position; the junction is derived from the
   network by the id the point carries, and `siteLongitude`/`siteLatitude` — the shadow
   attributes added on 2026-10-14 so `reachable_corridor` could undo the move — are no longer
   needed by anything.
4. Only then can the flag be set.

**The capability this seemed to protect, decomposed — and it was never there.**

[114](../experiments/114-the-three-segments-of-a-walk.md) extracted this widget from `isochrone`
so a displacement could be *"mapped, sorted and argued with"*, and this entry first treated
"which clinic is furthest from a road" as a capability retirement would lose. The practitioner
decomposed the question instead, 2026-10-17:

> *"first which network is closest to a group of clinics in an area or jurisdiction, then ask the
> second, when the road is identified which clinic when nearest nodes are ranked is farthest from
> nearest node to those clinics?"*

Three steps, and only one is in dispute:

| | | Exists |
| --- | --- | --- |
| 1 | scope a network to the sites' area or jurisdiction | **yes** — `street_network` takes a study area and a margin |
| 2 | nearest node and its distance, per site | **yes** — `nearestNetworkNode`, now one implementation |
| 3 | **rank the sites by that distance** | **no** — and not in `snap_to_network` either |

**Step 3 does not exist anywhere in this application.** Result tables offer a filter box and no
column sort; `snap_to_network` computes `greatest=Math.max(...)` for one sentence of its receipt
note and ranks nothing. Its header has claimed sortability since 2026-10-14 that the application
has never provided.

So retiring the widget loses a **claimed** capability rather than a working one, and the
decomposition names what delivering it would take: a way to rank records by an attribute, which
is a `table_output` concern and not a spatial primitive. That removes the objection standing
against step 4 and replaces it with a smaller, clearer piece of work in a different widget.
