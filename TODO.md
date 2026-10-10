# TODO

_Created 2026-10-09 · Updated 2026-10-09_

Deferred work, in rough priority order. An item here is a decision to do it later, not a
decision to do it — anything abandoned should be struck with a reason rather than deleted,
so the record of what was declined survives. Items that are design questions rather than
tasks say so, and name the record that would settle them.

## In progress

- **Act on [the widget design audit](docs/audits/widget_audit.md)**, run 2026-10-09 against
  all 39 widgets. Complete on D1, D2, D7 and D10; sampled on D3, where the first sample
  found an unenforced distinction, so the exhaustive D3 pass is the next step. Its six
  ordered actions are the near-term work.

## What is actually blocked

Two things. Everything else in this file is waiting on one of them, or is a defect that
nothing is waiting on.

1. **No widget can put a raster value onto a point.** This blocks completing the sea-level
   worked example with real facility elevations, which blocks the pack's three reviews, which
   blocks admission. Designed in
   [67](docs/experiments/67-sample-raster-at-points.md); not built.
2. **There is no typed field schema beyond point attributes.** This blocks the ruleset widget
   ([65](docs/experiments/65-ruleset-as-data.md)), the `xpert` reconstitution, and the port
   contracts ([66](docs/experiments/66-ports-as-schema-binding.md)), all three of which need to
   ask an input what fields it has and what they mean. `src/attribute-schema.ts` does this for
   `PointCollection` only; table, raster and network have nothing.

## Known defects, not blocking

Recorded because they are real, ordered by nothing in particular. Each says what it waits on.
A defect is not a blocker unless something is waiting on it — filing them as "correctness,
highest first" overstated every one of them, and led to patching two things that need
rebuilding (lesson 13 in [62](docs/experiments/62-workflow-traversal.md)).

- **`slr_threshold_comparison` compares a projected change to an elevation on an unchecked
  datum.** Valid only when the elevation is referenced to the projection's baseline sea
  surface; the field is free text checked for non-emptiness, and the unit fixtures satisfy
  the condition implicitly so the suite cannot see a mismatch.
  [62](docs/experiments/62-workflow-traversal.md) ·
  [58](docs/experiments/58-sea-level-widgets.md)
- **Postponed, deliberately: all sea-level pack work.** The exercise's major gap is that no
  widget can put a raster value onto a point, so the worked example cannot be completed with
  real facility elevations however good the extraction script is. The script's *interface* is
  also wrong, not only its internals — it is shaped around the 38 GB sample store rather than
  the summary files, and takes one `--site` where it should resolve a site set from a study area
  against the Philippine index the pack already ships
  ([62](docs/experiments/62-workflow-traversal.md)). Patching it in place would cost a pack
  version bump and a catalog re-pin to ship a patched version of something due for rebuild, which
  is lesson 13. **Build the sampling primitive first** — now done.

  **Measured from the real data, 2026-10-09.** The first AR6 file this project has ever read:
  `total_ssp245_medium_confidence_values.nc`, pulled from the Zenodo archive by range request
  without downloading the 9.24 GB zip.

  | Fact | Value |
  | --- | --- |
  | `sea_level_change` units | **`mm`** — so `value_m`, the provenance's `unit: metre` and the host's throw-unless-metre are wrong by 1000× |
  | Dimensions | `(quantiles: 107, years: 14, locations: 66190)`; years 2020–2150 by decade; the 66,190 locations match what 47 records |
  | Quantiles 0.17 / 0.5 / 0.83 | Present as **exact** float64 matches, so selecting on them directly is sound |
  | Manila, location 145 | Present at 14.58 N, 120.97 E, matching the bundled site index |
  | Manila ssp245 2100 | 963 / **1124** / 1366 mm at q0.17 / q0.5 / q0.83 — a median change of 1.124 m |
  | Baseline period | **No global attribute carries it.** The script's warn-and-refuse-to-assume fallback is correct and is vindicated |
  | `source` attribute | `pboxes/pb_1f/ssp245/total-workflow.nc` and `pb_1e` — the medium-confidence file is a **p-box across workflows 1e and 1f**, not a single-workflow output |

  **A real extract now exists.** `validation-lab/content/results/ar6-philippines-gauges-extract.csv`
  — 288 rows, 0 missing, keyed `site_id, scenario, confidence, family, year, quantile, value_mm`
  over the 8 published Philippine tide gauges, three scenarios, 2050 and 2100, the median and the
  likely range, both dataset families. Produced by `validation-lab/scripts/extract_ar6_philippines.py`
  from 447 MB of archive members fetched by HTTP range rather than 18 GB of zips.

  **The two dataset families differ by up to 87%, and in both directions.** ssp245, 2100, median,
  in millimetres:

  | Gauge | with VLM | without | difference | ratio |
  | --- | --- | --- | --- | --- |
  | **MANILA** | **1124** | **602** | **+522** | **1.87** |
  | SAN_JOSE | 857 | 604 | +253 | 1.42 |
  | LEGASPI | 778 | 612 | +166 | 1.27 |
  | DAVAO | 605 | 598 | +7 | 1.01 |
  | TACLOBAN | 603 | 614 | −11 | 0.98 |
  | CEBU | 578 | 608 | −30 | 0.95 |
  | SURIGAO | 586 | 614 | −28 | 0.95 |
  | JOLO | 542 | 600 | −58 | 0.90 |

  Without vertical land motion every gauge clusters at 598–614 mm, because the ocean and ice
  contribution is near-uniform across the archipelago: **all of the spatial variation is land
  motion.** Manila is subsiding hard enough to double its projection, while Jolo's land is rising
  enough to reduce it. A practitioner who did not know which family they held would be wrong by
  half a metre in Manila and wrong in the *opposite direction* in Jolo.

  **The land-motion term is linear in time, measured from the data.** The ratio of the
  with-minus-without difference at 2100 to the same at 2050 is 2.10–2.11 at every gauge carrying
  a meaningful signal, against 2.11 for a term strictly linear from the baseline midpoint of
  2005; the implied rate is constant to two decimals (Manila 5.51 mm/yr at 2050, 5.49 at 2100).
  Gauges whose difference is only 4–11 mm scatter, which is integer-millimetre rounding at that
  magnitude.

  That matters for how the example must describe the number. A linear term **extrapolates an
  observed trend** and represents no future change in groundwater policy, so it can show neither
  a crackdown on extraction nor an acceleration. And Manila's implied 5.5 mm/yr is roughly
  **half** the ≈10.1 mm/yr subsidence measured at the Port of Manila from tide-gauge and
  satellite records, with Bulacan extraction hotspots reaching 109–124 mm/yr. The with-VLM
  figure is therefore likely to **understate** Manila's subsidence rather than overstate it —
  the opposite of what a reader might assume about the "higher" family.

  [Experiment 47](docs/experiments/47-sea-level-pack.md) predicted exactly this — "where land is
  subsiding appreciably, the two answers can differ enough that a reader who did not know which
  they were looking at would reach a different conclusion" — before anyone had opened a file. It
  is now measured.

  The known defects, now including one only the real data could reveal:

  - **The `workflow` label is wrong for these files.** The script defaults `--workflow wf_1e`
    and records it as the workflow. The medium-confidence file is a p-box combining `pb_1e` and
    `pb_1f`, so labelling it `wf_1e` asserts a single workflow the data is not — and the pack's
    own vocabulary says *a quantile is not a p-box bound*. The extract must carry the p-box
    identity, not a workflow id, or carry a workflow id only for files that have one.
  - **The unit must be read, not assumed.** `units: 'mm'` is in the file. Read it, and either
    convert explicitly with the conversion recorded in provenance, or refuse when it is not the
    expected unit. Do not keep a column named `value_m` fed by millimetres. `scripts/extract-projection.py` in the
  pack repository loops over scenarios but never selects on scenario, so one file yields
  identical values under three scenario labels; `workflow` and `family` are likewise
  unverified CLI labels; the output column is `value_m` and the provenance asserts
  `unit: metre` while AR6 publishes millimetres and nothing reads the file's `units`
  attribute; and the input is hashed with a whole-file read despite the stated 38 GB
  source sizes.
- **`check-pack.py` fails before any check runs.** Retiring `contents.widgets` to
  `retiredWidgets` left the validator reading a key that no longer exists, so pack CI is
  red. The validator is part of the contract.
- The three sea-level widget release files still say `implementationStatus: blocked` /
  `proposed`, `definition: "not implemented"` and "No implementation exists", with no
  retirement marker pointing at the host widgets that now implement them.

## Primitives and ports

- **Settle [66](docs/experiments/66-ports-as-schema-binding.md) before any port work.** A
  connection is a schema binding: eight of fifteen port types are private wires between two
  named widgets, tracing the Old Naledi and heat pipelines, and `mean-center` has no consumer
  at all. Fifteen types resolve into roughly four carrier kinds plus declared contracts. This
  supersedes the port advice in [62](docs/experiments/62-workflow-traversal.md) and Phase 4 of
  [64](docs/experiments/64-widget-streamlining.md), and shares one mechanism with
  [61](docs/experiments/61-input-dimensions.md) and
  [65](docs/experiments/65-ruleset-as-data.md).

- **A ruleset widget, with the ruleset as declared data.** Designed in
  [65](docs/experiments/65-ruleset-as-data.md): replaces `policy`, `xpert` and
  `access_policy`, puts the configuration knobs on the ruleset rather than the widget so
  each declares its own parameters with units, and retires `gradedFacilities` — one of the
  six producer-named port types — onto the general `decisions` stud.

- **A primitive that samples a raster at a point.** Nothing in the application can put a
  raster value onto a point, so the elevation attribute `slr_threshold_comparison` requires
  cannot be produced here at all. Generic: serves population density, rainfall, temperature
  at a location. [62](docs/experiments/62-workflow-traversal.md)
- **Move the vertical reference from the comparison node to the input.** The enforcement is
  done — `slr_threshold_comparison` now refuses an undeclared or non-baseline reference instead
  of silently comparing incommensurable numbers, with three tests — but the declaration sits on
  the comparison node as a parameter, and this item and
  [62](docs/experiments/62-workflow-traversal.md) both say it belongs **on the input**, so the
  elevation-bearing layer declares its reference once and every consumer reads it. The
  behaviour is durable; the location is interim and moves with the typed field schema.
- **A vertical reference as an enumerated declaration on the input**, following
  [61](docs/experiments/61-input-dimensions.md)'s pattern, with the comparison refusing when
  the elevation's reference and the projection's baseline cannot be related.
- **Narrow the port types for the four wrong-producer run-time checks** — `assignments`,
  `series`, `projection-extract` — so a plain table cannot be connected where a specific
  producer is required. Makes those checks unreachable. The other eight `Connect …` checks
  are presence, arity or graph-shape conditions and belong in `validateWorkflow`, not in
  port types. [62](docs/experiments/62-workflow-traversal.md)
- **A keyed join as an internal primitive**, replacing three separate implementations of
  nearest-neighbour-with-distance and underpinning the six composites that currently carry
  their own copy. Internal only: not a palette entry.
  [60](docs/experiments/60-from-gis-studio-to-public-health-studio.md)
- Move the example-specific nodes off the palette into templates. Reduces what a
  practitioner must scan and stops `xpert`, `facilities` and `alert` reading as general
  tools.

## Reconstitute `xpert`

Not a blocker and not a bug to patch: `xpert` is one sound operation welded to one example at
every joint, and the disposition is to dissolve it rather than fix it. The name-keyed facility
match **was** a defect and is fixed (id-keyed, with two tests), but that is interim protection
for the current shape, not the destination.

What reconstitution means, from [65](docs/experiments/65-ruleset-as-data.md) and the bottom-up
derivation below:

- The operation is **rule application with a declared ruleset** — the general primitive. There
  is no `xpert` afterwards, only that widget plus a ruleset named for what it is.
- The NB06 hierarchy becomes a **declared ruleset**: its seven rules, its citations (Baik 2019,
  Mokomane 2024, Dickinson 2017 — from source notebook `06-Gaborone-Health-Facilities.ipynb`,
  not a published standard), and its declared output vocabulary of four evidence levels and
  four service categories.
- The named-evidence claims become **an attribute on the facility records**, bound to a declared
  role. The interim `NB06_NAMED_EVIDENCE` table in `src/old-naledi.ts` disappears with them.
- Input becomes the general features carrier with declared roles — ownership, facility kind,
  named-evidence status — replacing the private `facilities` port.
- Output becomes the general `decisions` carrier with the ruleset's declared vocabulary, which
  **retires `gradedFacilities`**, one of the six producer-named port types.
- Zero parameters becomes the ruleset's own declared knobs, bound per
  [66](docs/experiments/66-ports-as-schema-binding.md).

This needs the typed field schema that [61](docs/experiments/61-input-dimensions.md),
[65](docs/experiments/65-ruleset-as-data.md) and
[66](docs/experiments/66-ports-as-schema-binding.md) all converge on, so it follows that work
rather than leading it.

## Primitives derived bottom-up from NB06 / Old Naledi

Traced from the actual 12-node workflow on 2026-10-09, asking of each node what the general
operation inside it is. The workflow uses three primitives that exist — point import, study
area, the three outputs — and four example-welded nodes that contain **six general operations
between them**. That is the thick-domain-layer test from
[59](docs/experiments/59-pattern-for-engineered-knowledge.md) with a number attached.

| Needed by the workflow | Currently welded inside | Exists? |
| --- | --- | --- |
| **Select features by spatial relation to a polygon**, returning a filtered layer | `facilities` | **No.** `coverage_check` does point-in-polygon but returns a check, not a layer |
| **Representative point of an area** (a geometric centroid) | `facilities` | **No.** `mean_center` is the statistical mean centre of a point set, with its own refusal — a different operation |
| **Buffer a point by a radius** to form a selection region | `facilities` | Partly: `buffer_area` is area → area only |
| **Filter records by an attribute predicate** | `access` ("meeting your evidence criteria") | **No** |
| **Nearest join with distance** | `access`, and separately `nearest` and `slr_site_assignment` | **No** — already identified in [60](docs/experiments/60-from-gis-studio-to-public-health-studio.md) |
| **Rule application with a declared ruleset** | `xpert`, `access_policy`, `policy` | **No** — designed in [65](docs/experiments/65-ruleset-as-data.md) |

Two observations worth keeping. This workflow touches no table, raster or network — it is pure
vector — so every gap it reveals is **basic vector GIS**: select by location, select by
attribute, centroid, buffer, nearest. That is the core of any GIS toolbox, and it is absent
because each example that needed it received a welded widget instead. And `samples` is framed
as generating "demonstration points", which undersells it: sampling locations within a boundary
is a general operation and should be named and documented as one.

Four of the six are new findings from this derivation; the join and the ruleset were already
known. Doing the derivation on a second example — the heat workflow, or John Snow — would show
whether the same four recur, which is the test of whether they are general or particular to
this one.

## Seven widgets could not be added from the palette

Found 2026-10-09 by clicking Find healthsites facilities and watching nothing happen. The cause
is the one [experiment 48](docs/experiments/48-tabular-input.md) already recorded: **an
unconfigured node must be a valid draft.** `validateWorkflow` runs on every edit, so a validator
that demands a node's full contract makes that node impossible to add — `change()` rolls the
workflow back, and the canvas appears to ignore the click.

**Fixed:** `healthsites_discovery`, `buffer_point` and `sample_raster`, all added this session and
all repeating the recorded mistake. Each now has draft validation — what is wrong whenever it is
present — separated from a `requireRunnable…` check called at execution.

**Also fixed:** the add handler announced "*X* added" regardless of whether the add succeeded, so a
rollback looked like success. It now returns early when `change()` reports failure, leaving the
rollback's own message visible.

**Still broken, and pre-existing:** `slr_extract_import`, `slr_threshold_comparison`, `rate` and
`case_series`. They are reachable only from a template that already contains them, which is why
nobody noticed. Two of them I made worse today by adding required parameters — `basisKind` and
`elevationReference` — to validators that already ran on every edit. Each needs the same split.

`tests/palette-add.browser.mjs` now clicks every palette entry on a blank canvas and pins that
set, so it can shrink but never grow.

## The study area is Botswana-shaped

Found 2026-10-09 by adding the healthsites node to a blank canvas and trying to scope it to the
Philippines. The node correctly demanded a study area; supplying one was the problem.

- **Fixed.** Every Study area node described itself as "Old Naledi · Gaborone" regardless of its
  parameters, because `describe()` hardcoded that string for the type. A newly added node is
  `source:'drawn'` with no geometry, so the label was simply untrue. It now reports what the node
  holds: a drawn box or polygon, the dataset name, or "No boundary selected yet".
- **No point-and-radius option.** `AreaParams` admits a drawn bbox or polygon, or a named dataset
  — nothing else. `buffer_point` exists but takes a `points` input, so on a blank canvas a scope
  around a place needs a point layer imported first, which is a lot of work for "five kilometres
  around here". Either the Study area node gains a point-and-radius mode, or `buffer_point` gains
  a way to name a coordinate without a layer. The second keeps one scope-making operation; the
  first puts it where a practitioner looks.
- **No way to get to a place.** The map is interactive but has no search or navigation, so
  drawing a study area in Manila means panning from Gaborone. A geocoder is a remote service and
  [39](docs/experiments/39-stac-discovery-and-remote-acquisition.md) measured what that costs in a
  browser; the cheap alternatives are typed coordinates, a bounded gazetteer of the places the
  worked examples use, or accepting a bounding box as text.
- **The examples are the default world.** The blank canvas starts empty but every affordance
  around it assumes Gaborone. This is the same finding as the widget audit's example nodes, in the
  map rather than the palette: one demonstration's content presenting itself as the general case.

## Three widgets built 2026-10-09, none in a worked example

`npm run usage:widgets` after adding the Manila example:

```
never instantiated by any example (7):
  buffer_point, centers, find_health_facilities, places, rate, reproject, sample_raster
```

The first, third and seventh were built that day. D1 passed for each — experiments
67 and 68 argued the admission before the code, as the rule requires. D10 fails
for all three.

**D10 does not measure whether a widget was necessary, and it was read as if it
did.** The audit says what it measures: a widget no example instantiates "has
never been *shown composing* with the rest". It is a question about demonstration
to a newcomer. The practitioner used `buffer_point` and
`find_health_facilities` from a blank canvas on the day they were built — real
use, invisible to a check that only reads the shipped examples and frozen
fixtures. Reporting "zero instantiated" as "were they necessary" was an
over-claim from a tool that answers a narrower question.

The reasons the three are absent from examples still differ, and are worth
keeping.

- **`sample_raster`** has no consumer anywhere. It was called "real blocker #1"
  for reading elevation at facilities, and elevation is increment 2 of the
  sea-level example, which is not built. It should be demonstrated there or not
  kept.
- **`buffer_point`** derives a study area from a named point in a layer. The
  study-area editor gained a hand-drawn circle tool the same day. The two are not
  duplicates — one is derived from data and reproducible, the other is drawn, and
  the project already distinguishes drawn from derived areas — but the derived
  one has never been used, so the distinction is asserted rather than shown.
  Increment 2 would use it: a study area from the Manila gauge rather than a
  hand-drawn box.
- **`find_health_facilities`** was listed here too, with the claim that a
  retrieval widget *cannot* be demonstrated by a bundled example because such an
  example must run offline. **That was wrong and is fixed.** A bundled example can
  hold a network-dependent widget carrying what it retrieved, which is exactly the
  state a workflow is in after one online retrieval. What it cannot do is reach
  the network when it runs. The Manila example now holds the widget with 194
  facilities and its own retrieval record, fetched through the widget's retrieval
  path so the provenance is real, and `npm run usage:widgets` no longer lists it.

  The mistake was reaching for an absolute instead of looking at the online-to-
  offline model already implemented and already covered by a passing test named
  "a stored retrieval replays with the network off, and asks no source for
  anything".

Also fixed: `scripts/widget-coverage.mjs` did not know about the Manila example,
so D10's mechanised check was under-reporting. A check that silently misses an
example is worse than no check for the widgets inside it.

## Widget use tracking

Proposed by the practitioner during the widget audit, raised again on 2026-10-10,
and not recorded until now — which is itself the kind of lapse experiment 73
describes.

`npm run usage:widgets` counts nodes across shipped examples and frozen fixtures.
It cannot see a widget a practitioner adds to a blank canvas, so a widget in daily
use and a widget nobody has ever added look identical to it. That is the evidence
missing when asking whether a widget earns its place.

What would need deciding first:

- **What is counted.** Adding a node is not using it; a node that never runs is
  not evidence. The existing vocabulary already separates these — a **widget** is
  the contract, a **node** an instance, a **workflow step** one execution — so
  the count should say which it means.
- **Where it is kept.** Workflows are in browser `localStorage` and nothing is
  sent anywhere. Any count stays local, and should be readable by the practitioner
  rather than only by the project.
- **What it must not become.** A usage count is not a quality measure. The least
  used widget may be the one that carries the hardest-won distinction, and a
  number that invites pruning by popularity would delete exactly those.

Not started.

## Gap: spatial statistics

Named 2026-10-10 while decomposing the process stages. The studio computes the
mean centre of a point layer and compares two of them. That is the whole of its
spatial statistics.

Absent: clustering, spatial autocorrelation, kernel density, hot-spot detection,
nearest-neighbour index. For a GIS studio serving public health, hot spots are
the obvious one — "where is this concentrated, and more than chance would
explain" is a question practitioners ask constantly and this cannot answer.

Worth settling before building any of it:

- **What question each answers, in a practitioner's words.** `mean_center` passed
  that test; a Moran's I widget that reports a coefficient and a p-value may not.
- **What the result must not be read as.** A hot spot is not an outbreak, and a
  cluster of reports is not a cluster of cases — reporting effort varies by
  place. This is the same shape as the sea-level limitation, and a statistic that
  arrives without it will be over-read faster than a map is.
- **Whether it needs a new carrier.** A global statistic over a layer is a value
  with a significance, not a point layer, and nothing today carries that. A local
  statistic gives every feature its own score and fits the existing points
  carrier, so the two are not one piece of work.
- **The zone problem.** Any cell- or area-based statistic changes with the
  zoning. The glossary now warns about this for summaries; a statistic makes it
  sharper, because the number looks more authoritative.

Not started.

## Proposed: a data quality widget, with an editable table

Asked for 2026-10-10. One widget that reports on the quality of whatever is connected to it —
duplicates, missing values, and the rest — and an editable table beside it where a row can be
inspected and corrected.

Why it fits now rather than being a nice extra: every input this application has gained lately
hands over data whose faults are real and currently invisible. The facility sources drop records
and count them by reason, but what survives still holds duplicate facilities under slightly
different names, missing kinds, and coordinates that are precise and wrong. A practitioner can see
the drop counts and has nothing to act on them with.

What it would need to settle first, because these are the decisions that make or break it:

- **What it reports, per carrier kind.** Duplicates mean something different for a point layer
  (same facility, two records) than for a table (repeated key tuple, which `table_input` already
  refuses). The report has to adapt to the input the way the ruleset widget was argued to in
  [65](docs/experiments/65-ruleset-as-data.md), and that argument should be reused rather than
  redone.
- **Whether editing is an edit or a correction.** A changed value is a new claim about the world,
  and the provenance has to say who changed what and why, or the output is a dataset nobody can
  defend. The evidence and receipt machinery already exists for this; what is missing is the
  decision that an edit is recorded rather than applied silently.
- **Whether it is one widget or two.** Reporting is a check and belongs with the comparisons and
  checks group; editing produces a derived layer and is an operation on data. The naming convention
  says the name states the operation, and "data quality" names a category, not an operation — the
  same defect the audit found in `policy` and `access`. Likely `check_data_quality` plus
  `correct_records`, or a single `review_records` if the two cannot usefully be separated.
- **Where the editable table lives.** There is already a table editor for `table_input` and a pushpin
  editor for points; a third editing surface would be the third place the same decisions about
  validation and attribute schemas could drift apart.

Not started. Recorded in full because the question "what should it report" is the design, and
answering it in passing while building something else is how a category noun becomes a widget.

## Closed: health facilities come from sources a browser can read

**Resolved 2026-10-09.** This section previously argued about whether to split healthsites
discovery from acquisition, then recorded the decision to combine them. Both arguments are moot:
`healthsites_discovery` is gone. Kept as a short note because the sequence is instructive.

The widget was built against healthsites.io, which needs an API key and — measured in
[69](docs/experiments/69-healthsites-acquisition.md) — sends no cross-origin header, so the
application could not read its response at all. Acquisition therefore required the practitioner to
download a file themselves and hand it back. Two alternatives were then measured and both answer
with `access-control-allow-origin: *`, with no account: Overpass, and the Humanitarian
OpenStreetMap Team country export on HDX. Both are OpenStreetMap-derived, as healthsites.io itself
is, and both are ODbL. `find_health_facilities` 0.1.0 uses them, always requires a study area, and
is recorded in [71](docs/experiments/71-health-facility-sources.md).

The uncomfortable part is worth keeping: **the project had been downloading from Overpass since
the street-network widget**, with pacing, provenance and a licence record already in place. A
credentialed source was reached for before the open one already wired into the application was
checked. The general lesson is to measure what the application can actually reach before designing
around a source, not after.

What survived: the licence treatment, which was the good part. ODbL is share-alike, so the licence
travels in the ontology as a resolvable IRI attached to the data rather than only to the request,
the attribution travels with it, and the links are shown before anything is downloaded.

Done 2026-10-10: **Overture Maps Places** is the third source, at `find_health_facilities` 0.2.0.
Independent of OpenStreetMap, CDLA Permissive 2.0 rather than share-alike, and it states a
confidence per place. A Manila study area reads 55,649 of 81,455,423 rows — 3 row groups of 1 of 16
parts — in about 1.5 s. The important finding is that it **counts differently**: 1,120 health
places unfiltered against 47 from OpenStreetMap, because it catalogues commercial places including
individual practitioners and wellness businesses. Hence a 0.70 confidence default and a
deliberately conservative category mapping that leaves the generic buckets unmapped. Numbers in
[71](docs/experiments/71-health-facility-sources.md).

Still open and unblocked: a **general licence gate**, since those terms, links and the acceptance
step are not source-specific and any licensed source needs the same. It is a refactor of one
dialog, not a port change.

## A licence declaration on imported data

Prompted by the proposal for a healthsites.io input widget. Three measurements shape it.

**A person can download it in a browser; the application cannot fetch it.** Two different
things, measured 2026-10-09 and worth keeping apart.

- `/api/v3/shapefile/Philippines` with a key returns **200, `application/zip`, 52.5 MB,
  `content-disposition: attachment`** — so pasting that URL into a browser downloads the file.
  Without a key it is 403. CORS does not apply to a user-initiated download, because no script
  reads the response.
- The same API returns **no `access-control-allow-origin` header**, so the Fieldwork page cannot
  `fetch()` it and read the result. That is the WorldPop finding of
  [39](docs/experiments/39-stac-discovery-and-remote-acquisition.md) again, and a proxy is out by
  precedent: [32](docs/experiments/32-john-snow-primitives.md) records that "no proxy or browser
  security bypass was introduced".

So the practitioner path is the one the project already uses everywhere: **download outside,
import bounded, record provenance.** What is built is an import of a prepared extract, not an
acquisition, and must not be named as one ([47](docs/experiments/47-sea-level-pack.md)'s naming
rule). The API key is a credential and belongs to
[experiment 30](docs/experiments/30-local-credential-files.md)'s subject, not inside a widget.

**The licence obligation is general, not healthsites-specific.** An imported layer needs to carry
its source, licence, attribution and share-alike status whatever the source is: ODbL for
healthsites, CC BY 4.0 for geoBoundaries and the AR6 extract, open for OCHA COD-AB, and
redistribution-prohibited for GADM, which is why the pack excludes it. So the capability belongs
on `observations` as a **declaration from an enumerated set of licences**, each carrying its
obligations — not as free text, which would let someone type "open" and lose a share-alike
requirement, and not as a source-specific widget, which would need rebuilding per source.

**The filters are a missing general primitive.** Selecting records by an attribute predicate —
`healthcare in (hospital, clinic)`, `completeness >= n` — is one of the six primitives the
bottom-up NB06 derivation named. Baking a healthcare-kind filter into a healthsites widget would
be a thick domain layer over a primitive that does not exist, which is
[59](docs/experiments/59-pattern-for-engineered-knowledge.md)'s engine firing for the fourth time
this session. Filtering should be visible and adjustable in the workflow rather than fixed in a
script or a source-specific node.

So: an enumerated licence declaration on imported data, plus select-by-attribute, rather than a
healthsites widget. What is genuinely source-specific — the osm_type/osm_id identity and the
recorded selection — travels as provenance in the extract, which
`validation-lab/scripts/fetch_healthsites.py` already writes.

## Worked examples

- **A service-coverage rate example.** `rate` and `reproject` are in the registry and in no
  worked example (`npm run usage:widgets`). The rate example is also the second-domain test
  that [59](docs/experiments/59-pattern-for-engineered-knowledge.md) and
  [60](docs/experiments/60-from-gis-studio-to-public-health-studio.md) both propose, and it
  forces the vintage-bearing denominator [51](docs/experiments/51-dataset-profiles.md)
  identified as the most common serious error.
- **Runbooks: a guided tour of a worked example from the `?` button.** Designed in
  [63](docs/experiments/63-worked-example-runbooks.md); deferred. Two decisions must be
  settled in that record before code: how a step names its node, and what a tour does on a
  modified workflow.
- Complete the sea-level worked example with a real extract. Needs the AR6 summary files,
  not the 38 GB sample store, and site-id resolution from the Philippine site index the pack
  already ships.

## Registry format

- **Per-port evidence in widget metadata**, per
  [66](docs/experiments/66-ports-as-schema-binding.md): each port records its carrier, roles,
  fitness conditions, how each is enforced and which test covers it. `validate:widgets` must
  resolve every named test and fail on a missing one, or the field becomes a place to make
  claims. The widget-level `validationStatus` then becomes **derived** from the weakest level
  across its ports, like `classification.json`, which also raises the ceiling that currently
  forces all 39 releases to declare `application-only`.
- **A generated connection matrix.** 1,700 candidate producer-to-input pairs, 200 allowed,
  1,500 refused, and one unit test asserting a refusal. The matrix is a pure function of the
  declarations, so it can be computed and frozen as a fixture where a contract change shows up
  as a diff.

## Records and vocabulary

- Add the ten sea-level competency questions to
  [44](docs/experiments/44-ontology-competency-questions.md), including the four the design
  refuses to answer. [47](docs/experiments/47-sea-level-pack.md) committed to this.
- Correct the stale navigation in [47](docs/experiments/47-sea-level-pack.md): its header
  still says the host lacks the tabular port, and it claims eight pinned file digests where
  the catalog pins five.
- **Done 2026-10-10**, and the answer was not the one this item expected. The pack manifest's
  two `excluded` stages were to be split into a decision and a capability limit. Measuring the
  capability limit showed there wasn't one: Zenodo sends `access-control-allow-origin: *`,
  honours Range, and one AR6 summary file is 71.7 MB inside the 9.24 GB archive. Both stages are
  decisions, and acquisition is now recorded as `out-of-scope` with the measurement attached.
  The general lesson is cheap and was skipped: this item asked for a *category* to be applied to
  a claim nobody had tested. Measure first, then classify.
- The same conflation sat in the glossary, where "we cannot read 38 GB of data in a browser" was
  the worked example of a capability limit. A store's size is not the bytes a reader transfers.
  Corrected in place rather than deleted, because a rule that failed on its own illustration is
  worth keeping visible.
- **Decision:** rename `parity` to `concordance`. In public health, parity is the number of
  births a woman has had. Touches [57](docs/experiments/57-parity-evidence.md) and
  `validate-widgets.mjs` output.
- **Decision:** whether the design audit should be ten checks or fewer. A ten-check gate
  with its own vocabulary is a real barrier to contribution, but it is what caught the
  defects above.
- Rename the node types that the [naming convention](docs/audits/ontology-audit.md) would not
  choose, each riding with the work that touches that widget rather than as a renaming pass:
  `xpert` (names a diagnostic product; the operation classifies facility evidence), `policy`,
  `access_policy`, `access`, `nearest`, and `output`. Renaming is a migration and uses the
  experiment 18 adapter. Listed in
  [the widget audit](docs/audits/widget_audit.md).
- Drop "internal primitive" as a term — it is a sentence pretending to be a term.
- Link [the glossary](docs/glossary.md) from the README.
- Add a term rule to AGENTS.md: a new term must be explainable in one plain sentence with
  an example, or it is not ready to be named.

## Browser coverage

**Resolved 2026-10-09: WebKit is at 84 passed, 0 failed, 1 skipped — the same as Chromium.**
Full account in [70](docs/experiments/70-webkit-parity.md). The position had been unchanged
since the 0.5.x CHANGELOG, at 42 passed and 37 failed, with the failures untriaged.

Three causes, in the order they were found:

- **Playwright 1.63.0 could not navigate while offline in WebKit.** 23 of the 37 failures were
  this one message. Four workarounds were measured and all four failed before the dependency
  itself was suspected; upgrading to 1.64.0 fixed it and recovered 24 tests. The dependency
  should have been the first suspect, not the last.
- **WebKit cannot store a Blob or a File in IndexedDB.** `storePDFs` wrapped every value in a
  Blob, so in Safari no attached PDF and no retained raster window could be stored at all —
  a shipped feature that did not work, found only because a second engine ran. Fixed by storing
  bytes. It was hidden for as long as it was because the abort handler asserted a full disk and
  discarded `tx.error`.
- **A controlling service worker hides requests from Playwright in WebKit.** The last two
  failures were tests whose simulated network conditions silently did not apply, so the app was
  correct and the tests were wrong. Behavioural claims now use `setOffline`, which works in both
  engines; the one test that substitutes a fixture uses `serviceWorkers: 'block'`.

Remaining here:

- **Decide whether WebKit joins the gate.** The stated condition — "add WebKit once the reload
  fault is resolved, so a red run means the application rather than the harness" — is now met,
  and the engine has already paid for itself once. Against it: the run costs about four minutes
  and `FIELDWORK_BROWSERS` already makes it one command. The honest argument for adding it is
  that Chromium-only was green throughout the entire period in which Safari could not store a
  single PDF.
- **Firefox has never been run.** `playwright.config.mjs` supports it and nothing is claimed
  for it.
- `tx.error` was not the only place a failure path asserts a cause it has not observed. Worth
  a sweep: an error message that guesses is believed.

## Toolchain

- Four of 39 widgets have parity evidence recorded; `clip_raster` is partial, where
  all-touched with a one-pixel margin differs from the reference on 61 cells because the
  reference models the margin as a 3×3 dilation.
