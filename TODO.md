# TODO

_Created 2026-10-10 · Updated 2026-10-25_

Deferred work, in rough priority order. An item here is a decision to do it later, not a
decision to do it — anything abandoned should be struck with a reason rather than deleted,
so the record of what was declined survives. Items that are design questions rather than
tasks say so, and name the record that would settle them.

## In progress

- **Act on [the widget design audit](docs/audits/widget_audit.md)**, run 2026-10-09 against
  all 39 widgets. Complete on D1, D2, D7 and D10; sampled on D3, where the first sample
  found an unenforced distinction, so the exhaustive D3 pass is the next step. Its six
  ordered actions are the near-term work.

## A 2x2 that became commensurable shows no margins

_Found 2026-10-26, building South London's contingency table in the application._ Totals are
drawn only where a table states a unit — "a table that states its unit is saying its values count
the same thing; one that does not gets no totals rather than a wrong one". Snow's Table IX states
none, correctly: as imported it holds houses beside deaths, and a total across those is
meaningless.

But `select_rows` leaves `deaths` beside `houses without a death`, and those **both count houses**.
The table is now commensurable and nothing in it records that, so the figure an epidemiologist
reads loses exactly the margins they read first. The rule is right in general and wrong here.

Three candidate answers, none chosen: a step that states a unit on a table it passes through;
a unit per measure rather than per table, which is a change to `DataTable` and reaches every
consumer; or letting the output state its own margins where a reader has asserted the cells are
commensurable. The first is smallest and the second is the one that is actually true of long
tables, where each measure may count something different.

## Revisit the Manila sea-level example, which reports no sea level

_Raised 2026-10-26 by the practitioner: **"that is a useless worked example if titled sea level
rise."** Checked, and the criticism holds._ `assignSites` reads the AR6 extract **only to narrow
which gauges are usable** — `usable` is the set of sites whose `site_id` appears in the extract —
so the 288 projected values are imported, contract-checked, carried through a ruleset with three
obligatory AR6 citations, and never read. The output is facility → gauge → distance. As a
sea-level example it delivers no sea level, and its title claims the one thing it does not do.
This is the D7 overclaim failure applied to a worked example rather than to a widget.

Refusing to model inundation stays right, and [the answer given on 2026-10-26](experiments/)
dressed the gap up as that virtue, which it is not: not claiming inundation and never computing
a projection are different omissions.

**What it should report**, and can report honestly: the projected change at each facility's
assigned gauge, with scenario, year, quantile and vertical-land-motion family named in the
output — "+X mm by 2100 under SSP2-4.5, median, with VLM". Real, uses the data it ships, and
still not an inundation model.

**What blocks it is one named limit.** The extract is keyed `site_id, scenario, basis, family,
year, quantile`; the assignment is keyed `point_id, projection_site`. Carrying the value across
is a join of two tables on a shared column, which the 0.12.0 release notes already record as
missing. Slicing the extract to one scenario, year, quantile and family is `select_rows`. The
example stops exactly where the application stops.

Until it reports a value, the note should say the projections are validated but not reported —
today it says what it will not claim and is silent about what it never computed.

**Check the two remaining sea-level widgets in the same pass**, which the practitioner has
flagged to review: `slr_site_assignment` is listed in the Duplicates row as a one-off of
nearest-neighbour-with-distance, and `slr_threshold_comparison` this file has called *"genuinely
domain-bound"*, which under the domain-agnostic direction is a question rather than a settled
exemption. Both are still classified `domain` in `widgets/classification.json`.

## Snow's denominator: wire up `snow-gboh`, then South London

**Raised in priority 2026-10-23 at the practitioner's direction**, on the day they met the same
lesson in their own work: a WorldPop raster is a denominator for health zones in Ituri, and a
case count without one is the Soho map again. This is that lesson on data where the answer is
known.

Two steps, deliberately in this order. Both came out of the practitioner asking, 2026-10-19,
*"what other epidemiological computations are possible with Cholera Outbreak data aside from
epidemic curve?"*

### 1. Wire up the data already in the repository

`examples/snow-gboh/` has been present since 2026-10-09, with a `provenance.json` that records the
source digest, the four limits and the licence reasoning — and **no file in `src/` references it.**
It holds `deaths_nd_by_house.csv`: 1,852 houses from the 1855 General Board of Health map,
**including the 1,483 where nobody died**, 706 deaths (661 residents, 45 non-residents), and
precomputed distances to the Broad Street pump, the former pest field and the nearest sewer grate.

Those zero-death houses are a denominator, which is what the 250 mapped death locations do not
have. The difference it makes, measured 2026-10-19:

| band from the pump | houses | deaths | deaths/house | % houses affected |
|---|---|---|---|---|
| 0–50 m | 45 | 84 | **1.867** | 55.6% |
| 50–100 m | 140 | 186 | 1.329 | 59.3% |
| 100–150 m | 283 | 204 | 0.721 | 41.3% |
| 150–200 m | 429 | 150 | 0.350 | 20.3% |
| 200–300 m | 724 | 78 | 0.108 | 7.5% |
| 300 m+ | 231 | 4 | 0.017 | 1.3% |

Monotone across a 110-fold range. The same gradient computed from the 250 mapped points — which
condition on a house having had a death — runs 3.33 down to 1.00 and is barely a gradient at all.
**Same outbreak, same pump, and the selection decides the finding.** That contrast is a better
teaching artifact than either table, and it is this project's "a number needs a denominator" lesson
in its own data.

Three things this makes possible that no workflow does today:

- A rate with a real denominator. `validate:evidence` reports `rate` as one of four widgets at the
  **weakest evidence rung**, and this is the example where `minimumDenominator` and `rateKind` do
  actual work.
- The competing 1854 hypotheses tested against each other. `dis_pestf` and `dis_sewers` are the
  miasma explanation's own candidate exposures, sitting in the same file as `dis_bspump`.
- Resident against non-resident deaths. 661 and 45, and the file's own limits note warns that
  `deaths` "mixes a numerator that includes visitors with a denominator of dwellings".

**Two constraints, both already recorded in that `provenance.json` and neither to be worked
around.** The coordinates are OSGB 1936 / Airy 1830 and this application deliberately performs no
datum shift, so the analysis is tabular and uses the distance columns — there is no map. And the
licence is *"GPL, version not stated by the publisher"*: redistribution verbatim is aggregation and
does not affect this repository's Apache-2.0 licence, but **"a reprojected, filtered or otherwise
modified copy would be a modified work and would have to carry the GPL and be marked as
modified"**. So a workflow reads these columns; it does not ship a transformed copy of them.

### 2. South London, as its own repository, imported as a bundle

Snow's other 1854 investigation — Southwark & Vauxhall against Lambeth, two companies whose mains
ran down the same streets, one drawing from the sewage-laden tidal Thames and one from Thames
Ditton after the Metropolis Water Act of 1852. Roughly 315 deaths per 10,000 houses against 37, a
risk ratio near 8.5, with exposure assigned by a chloride test because residents often did not know
their supplier. It is the study with the denominator, and the ancestor of the cohort design.

It is **not** in this repository, and adding it as a worked example is the expensive route: example
data is imported at build time, and a new `exampleId` touches the closed union in `types.ts`, the
`template()` dispatch, `NAMED_WORKSPACES` twice, the static picker options in `index.html`, the
deep-link allowlist and `loadExample`'s per-example selection — the *"examples are the default
world"* problem in the one place it is least visible.

So: a separate repository, imported as a `fieldwork/bundle/1` workflow into the **1854 Cholera
Outbreak in London** project ([122](docs/experiments/122-a-project-holds-many-workflows.md)). A
project holding imported workflows is the practitioner's own request from the same day — *"create
project, import workflows into project"* — and a South London table is kilobytes against a 500 MB
bundle ceiling (20 MB when this was written; raised 2026-10-22 and again 2026-10-23). The separate repository earns its keep on licensing rather than architecture: it
isolates third-party data and lets a derived copy carry the source's own licence without touching
Fieldwork's.

**Settled 2026-10-23: it does.** `geodacenter.github.io` answers `access-control-allow-origin: *`
for HTML and for a `.zip` asset, `pages.github.com` the same, and `raw.githubusercontent.com` the
same on GET. So runtime loading from another repository does not hit the DHIS2 and geoBoundaries
wall and vendoring is not forced. One trap recorded with it: **HEAD on `raw.githubusercontent.com`
returns no such header and GET does**, so a HEAD-only probe would have sent this the other way.

**A caution worth keeping in view.** The South London study's power is not spatial — it is a 2x2
contrast of two intermingled populations. A worked example in a semantic GIS studio whose central
computation is a table with no map is defensible, and it is a departure. Mapping it needs 1850s
sub-district boundaries, which is the hard acquisition; the table is the easy part.

**Neither started.** Step 1 needs no acquisition, no new repository and no licence manoeuvre — only
a workflow — which is why it comes first.

## A workflow keeps being called the example it started as

The practitioner, 2026-10-23, looking at a canvas holding a study area, a WorldPop raster, a
clipped raster, a street network, health facilities and a map, under a caption instructing them to
draw and run a rule:

> *"The text 'Experiment 01 · draw → inspect facts → run the rule' before the Reset Layout button
> seems to be stale content."*

It is, and not in one place. `exampleKey` resolves to `blank` and the `blank` branch of `render`
sets **four** captions unconditionally: `#example-note` ("Experiment 01 · draw → inspect facts →
run the rule"), `#canvas-example` ("STUDY AREA · EXPERIMENT 01"), `#project-description` and
`#footer-context`. All four are pinned to the example IDENTITY and none to the content.

**There is no divergence check anywhere.** The application knows a worked example ships and stays,
and offers Reset example to discard edits to it, and nothing compares a canvas to the template it
came from. So the one workspace designed to be built in is the one that goes on describing itself
as a scripted exercise.

It compounds through the project level: `exampleKey` returns `blank` for ANY workflow carrying a
`projectId`, so a workflow inherits Experiment 01's captions the moment it joins a project --
which is the thing [131](docs/experiments/131-project-and-workflow-lifecycles.md) is encouraging.

**What it would take.** `template(key)` already exists and is what Reset example restores, so
divergence is computable by comparing the canvas against it. When they differ the note stops
asserting a recipe and the eyebrow stops claiming EXPERIMENT 01. The test is a canvas built on the
blank workspace that is no longer called Experiment 01.

**Where it belongs.** With 131 rather than beside it. "No longer the example it started as" is a
lifecycle fact about a workflow, and Draft, Run, Stale and Refused have no word for it. Whether it
needs one, or whether the captions should simply fall silent, is the design question -- and by the
rule this project already has, the word goes in the glossary before it goes in a panel.

## Parity is keyed to a version, so a cosmetic release invalidates real evidence

Found 2026-10-23 by the gate, not by reading. `clip_raster` was bumped 1.0.0 -> 1.1.0 for a node
label field, and the widget catalog immediately began reading **`partial · earlier release`**: its
parity entry carries `coversRelease: 1.0.0`, and `src/catalog-ui.ts` marks any entry whose covered
release is not the current one.

The ledger is right and the cost is real. **The bump could not have changed the clipping the
parity run measured** -- a label field is not a raster mask -- and the evidence was still
invalidated, because parity is pinned to a version string rather than to what the release changed.
`validate:widgets` now lists clip_raster beside `access_policy` and `xpert`, which are stale for
the same reason, and parity is recorded for 23 of 55 widgets, so the pool this erodes is already
small.

**What it would take.** Either parity entries say which release range they still cover, or a
release declares whether it touched the computation parity measured -- `changes[].kind` already
distinguishes `fix` from `changed`, so the information is half there. Re-establishing parity needs
a run in the validation lab and cannot be edited into the ledger, which is the right constraint
and also why the stale list only grows.

**Not a reason to stop bumping.** The alternative is a release note that does not exist for a
control a practitioner can see, which is the fault paid off earlier the same day.

## The planning stage: where a note about the world goes

Raised 2026-10-24, reading Snow's chloride measurements: *"The tide part is interesting because
Cholera vibrio survives inside copepods."* ... *"we do not have a dive deeper class for historical
notes. Perhaps we can now incorporate it in the planning part of the workflow (that's pre-workflow
and undeveloped) as we have planned earlier? That way we can capture Snow's narratives, and with
the historical notes we can then create our story map."*

There are three places a sentence can go today and none of them fits. `provenance.json` is for
claims about the DATASET; Dive Deeper notebooks are keyed to a `nodeType` and are about a widget's
method; Inspector prose is scored per explanation against a 240-character limit and is where a
control is explained. A note about the world the data came from has no home.

[Experiment 27](docs/experiments/27-workflow-learning-and-gamification.md) already proposed one --
a side notepad to plan, prototype and reflect, with dated iteration notes and a stated boundary
against source citations -- and it has never been built.

**The task is not the filing.** Sharpened the same day: *"The elegant part comes in if we include
story map structure as the frame for both the historical notes and the workflow. How to combine
them is a genuine DE question."* So
[133](docs/experiments/133-the-planning-stage-and-historical-notes.md) asks whether a story map's
structure can be the frame a workflow is PLANNED in rather than a presentation applied to one
afterwards -- sections written first, each binding a claim, the context that motivates it, and
the outputs that evidence it. That binding is what would make assurance expressible: a reader
asking "was this made under conditions I would accept?" asks it of a claim, and this application
has no object that is a claim.

**And the danger is the question.** Writing the story first is how evidence gets fitted to a
narrative. The discipline that makes it honest is 27's own prompt -- *What do I predict?* -- and
the test is whether a section contradicted by its run survives and says so.

**Why it is more than tidiness.** [119](docs/experiments/119-can-this-tell-a-story.md) found the
three measurable conditions for a good story already present and *scattered*, with assurance
missing; [17](docs/experiments/17-workflow-publication-products.md) wants a story map as an end
product. A story map needs the sentences between the layers, and there is nowhere to write one
that belongs to the investigation rather than to a widget, a dataset or a control.

**First subject if built**: the copepod note on the South London example, which must read as
modern knowledge about the world Snow worked in and not as something his 1855 text claims.

## What is actually blocked

Everything else in this file is waiting on one of these, or is a defect that nothing is waiting on.

**Both of the two blockers recorded here were wrong when re-derived on 2026-10-12**, which is
why they now live in `widgets/blockers.json` with a liftTest and a revisit clock rather than in
prose. The practitioner's rule: even blockers are not permanent, and each should be revisited in
DE mode.

1. ~~**No widget can put a raster value onto a point.**~~ **Lifted.** `sample_raster` 0.1.0 is
   registered, implemented and executable — points + raster → points — and has been since
   2026-10-12. This entry still read "Designed in
   [67](docs/experiments/67-sample-raster-at-points.md); not built" while `docs/todo.md` had
   already noted "now done" in the middle of a paragraph about something else, so the project
   held the stale claim and its refutation at the same time.
2. **There is no typed field schema beyond point attributes.** True, and **narrowed**: it was
   recorded as blocking the ruleset widget outright and it blocks only the *general* form of it,
   where any field of any input binds to a declared role. It does not block the merge that
   reduces the widget count, because the three fact generators take typed carriers rather than
   attribute tables — `makeN3(NearestRow[])`, `accessN3(AccessRow[])`, `facilityN3(Facility[])`.
   A blocker stated one size too large had been stopping work it did not block.
   `src/attribute-schema.ts` still covers `PointCollection` only; table, raster and network have
   nothing, and that is what remains true.

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

- **A street network from a CSV edge list** (raised 2026-10-14, not an experiment yet —
  investigate first). `network_input` takes OSM or a GeoJSON-shaped file today. A network is
  also, commonly, two CSV columns: `node1` and `node2` (or `connects_to_node`), one row per
  edge. That is how a network arrives from a field survey, a spreadsheet of paths between
  settlements, or any system that never held geometry. Questions to settle before designing it:
  where do node *coordinates* come from (a second CSV of node id, lon, lat? a join to a point
  layer already in the workflow?); where does `lengthM` come from when the CSV carries no
  geometry — computed straight-line between node coordinates, which makes every edge a lower
  bound, or taken from a column the surveyor measured; and whether an undirected edge list
  means one row or two, since `prepareEdges` works on directed edges. Reuses the CSV import
  this project already has. It would let a network be *authored*, not only downloaded, which
  matters where OSM is thin — the same places experiment 114's off-network leg is about.

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

## Reprojection goes one way only, because a layer cannot say where it is

Raised 2026-10-10 from the Inspector: reprojection is useful in more than one
direction and to more than one projection. The widget does WGS84 UTM to CRS84, at
import, and nothing else.

The obstacle is the carrier. `SpatialReference` is a type whose every field is a
fixed literal — datum `WGS84`, geometry CRS `OGC:CRS84`, units `degree` — so a
layer cannot state that it is in anything else. Reprojection can only happen on
the way in, or temporarily inside a widget.

The cost is countable: **five widgets each ask the practitioner for a UTM zone**
(`mean_center`, `compare_point_sets`, `reproject`, `voronoi`, `isochrone`), and
`catchments.ts` carries its own `metric()` helper. The same question is asked
five times because the data cannot answer it. That is D5 firing for the first
time — a qualifier living in every consumer instead of on the input.

Three steps, in order, and the first is a carrier change:

1. A spatial reference that can describe a projected CRS. Belongs with the port
   work in [66](docs/experiments/66-ports-as-schema-binding.md).
2. Reprojection as a Compute widget: a layer in, a layer out, a stated target.
   The present node sits in Sources because it reads a file, conflating input
   with process.
3. Metric widgets reading the CRS of the layer they are given, and refusing one
   in degrees rather than assuming a zone.

Two limits stay whatever is built. A datum shift needs a grid this prototype does
not carry, and a clean conversion does not confirm the declared zone was right —
both already stated in the widget and worth keeping stated.

Full reasoning in [40](docs/experiments/40-reprojection-primitives.md).

## "Junction" counts every point in the graph, not every intersection

`networkFromOSM` adds both endpoints of every consecutive pair in every accepted way, so a network
node is each VERTEX a street is drawn with. The application calls these junctions throughout.

Measured 2026-10-19 on Buvuma Island, Lake Victoria: **11,359 network nodes against 661 places
where two streets actually meet — seventeen to one.** The practitioner met it as a download
refused by a "Graph limit (junctions)" of 2,000, believing that allowed a 2,000-junction network;
on that terrain it allows about 116 intersections. The 2,000 default was measured on Soho, where a
dense grid makes the two counts nearly equal, which is why nobody noticed and why the word is most
misleading exactly where the default binds.

**Not renamed, deliberately.** A first attempt changed the eleven places that COUNT network nodes
and left the term everywhere else, which gave one quantity two nouns. The word is load-bearing in
more than prose:

- **Ontology predicates** — `fw:junctionsInBand`, `fw:junctionsOffered`, asserted in receipts
  and checked by `validate:ontology-coupling`.
- **A widget title** — `reachable_nodes` is "Reachable junctions", so a rename needs a name
  review entry and a release, and its refusals quote it ("Add a Reachable junctions step").
- **A results field** — `coverage.junctions`, which the map caption and its tests read.
- Roughly sixty test assertions.

**Defining it is not available.** The practitioner, 2026-10-19: *"junction versus intersection,
that's a large discrepancy for two terms that mean nearly the same."* That is the whole problem.
`carrier` was an INVENTED term with no standard behind it, so withdrawing it was clean — nobody
had a prior meaning to unlearn. "Junction" is an ordinary English word for where roads meet, used
here to mean something seventeen times larger. A reader has no way to notice the redefinition,
because the ordinary meaning reasserts itself every time. A glossary entry would be read once and
overridden by the language thereafter.

So the resolution is to align the prose to the identifiers rather than the reverse, and the code
has already chosen: `Network.nodes`, `NETWORK_NODE_LIMIT`, and the node type `reachable_nodes`.
Only the human-facing text says junction. **That is this morning's `summarize_polygons` problem
inverted** — there the title was right and the identifier wrong; here the identifiers are right
and the titles wrong.

So this is a vocabulary decision of the same kind as `carrier`, not a find-and-replace: withdraw
the term with a ledger entry and a ceiling. What shipped on 2026-10-19 is
the Inspector saying what the number counts, with the Buvuma measurement, so the limit can be set
knowingly in the meantime.

**Also unmeasured:** whether 2,000 is the right default. It was measured against vertices; nobody
has asked what it should be as a limit on the thing that exhausted a 4 GB heap.

## Demonstrate Fieldwork importing from DHIS2

Requested by the practitioner, 2026-10-19: *"Spin up a DHIS2 instance with data and demonstrate
FW connecting to DHIS2 and importing data into a workflow."*

Three pieces, and the order matters because the second is the one that can fail on grounds nothing
in this repository controls:

1. **An instance with data.** DHIS2 publishes a demo database and a containerised stack, so this is
   a setup task rather than a research one. It has to hold organisation units with coordinates and
   at least one aggregate or event dataset, or there is nothing a spatial workflow can do with it.
2. **Reaching it from a browser.** Fieldwork runs entirely in the page and acquires over `fetch`,
   so a DHIS2 import depends on that instance sending CORS headers and on an authentication method
   a browser can use without storing a password in a workflow — the Web API supports personal
   access tokens, which is the shape that fits how credentials are already handled here. This is
   the same wall the geoBoundaries acquisition hit, and the resolution there was to rewrite the URL
   rather than proxy, **because a proxy would put this project between a practitioner and their
   source.** A DHIS2 server holding real programme data makes that principle sharper, not softer.
3. **An import that records where it came from.** `## Input — getting the data` in the glossary is
   explicit that **an import is not an acquisition**: an acquisition replays from its request, an
   import can only be trusted if it records where it came from. So a DHIS2 import needs the server,
   the API version, the org-unit level, the dataset and period, and the time of retrieval — not
   just the rows.

**What it would establish, and what it would not.** It would establish that Fieldwork can take
data from the system most national health programmes actually keep theirs in, which is a claim
about reach that no worked example currently supports: every example ships its data in the repository.
It would not establish anything about *analysis* — the widgets downstream are unchanged — and a demo
instance is not evidence that a ministry's production instance will permit a browser to read it,
which is the question that decides whether this is useful or a demonstration. Worth recording as a
separate field question when it gets that far.

**Not started.** No experiment record yet; this is the note that precedes one.

## Stress-test the remaining caps, and find the examples that do it

[125](docs/experiments/125-caps-below-the-limit-we-are-testing.md) separated the caps that are
measurements from the caps that are guesses. Two of the guesses were corrected on 2026-10-20 — the
street-network graph limit, which measured isochrone memory and was applied to downloads, and the
download byte floor, which refused an extent this project ships. The rest are listed here with what
would actually stress them, because the practitioner's reason for wanting them loosened is the
project's reason for existing: *"we are here to develop a framework that tests the limits of the
browser — how are we going to make progress if we don't reach the limits?"*

A cap raised without a measurement trades a clean refusal for a hung tab, which is the one failure
worse than a refusal. So each of these wants a real artifact that reaches it, not a bigger number.

| cap | now | what would reach it |
|---|---|---|
| `MAX_TABLE_ROWS` | 2,000 | A real surveillance line list. Hagelloch is 188 rows; a national weekly series or a Project Tycho extract is tens of thousands. The table view, the data-quality profile and `case_series` all walk it. |
| `MAX_RASTER_CELLS` | 262,144 (512×512) | A WorldPop 100 m population raster for a district. The Old Naledi raster example already carries one; a province-sized window is the stress. |
| `GEOMETRY_BYTE_BUDGET` / `AREA_BYTE_BUDGET` | 1 MiB / 1.5 MiB | **Philippines ADM2.** An archipelago is the worst case for vertex count, it is this project's own domain, and DRC ADM2 at 6,386,010 bytes already shows a single level can exceed the whole store. Measured against `localStorage` when IndexedDB reports 200–2,000× more ([121](docs/experiments/121-storage-beyond-localstorage.md)). |
| workflow size | 50 nodes, 100 edges | An inline literal in `validateWorkflow` with no constant and no comment. A bundled composition explodes into its members, so exploding two or three in one canvas reaches it; the rulesets example is already four workflows on one canvas. |
| `MAX_POINT_LAYERS` / `MAX_POLYGON_LAYERS` | 8 / 6 | A map carrying every layer a cholera workflow produces — deaths, pumps, catchments, hull, network, reachable nodes, corridor. |
| `MAX_FACILITY_RECORDS` | 20,000 | Measured on Metro Manila. A country-level `find_health_facilities` query is the stress, and is also the courtesy question: whether this application should ever ask for one. |
| `OSM_PAUSE_MS` | 60,000 | Superseded rather than stressed: `/api/status` now reports the pause the service wants, so the fixed floor should become the fallback for when that read fails, which is what OSMnx uses it for. |

**What closing this looks like.** For each row, an artifact in `examples/` or a recorded acquisition,
the measurement of where the browser actually fails, and then a number — or a declaration in the
code that the number is a guess, which is honest and revisitable where an unexplained constant is
neither.

**Not started.** The two corrected on 2026-10-20 are the pattern: both turned out to be a downstream
widget's constraint applied upstream, which is worth checking for in each of these before assuming
the number itself is the problem.

## Let practitioners compose their own routine primitives

Four experiments: [78](docs/experiments/78-trying-compositions-on-isochrone.md) is the trial, on the isochrone case, where a control exists. Three admission reviews behind it: [75](docs/experiments/75-compositions-as-nodes.md) proposes the mechanism, [76](docs/experiments/76-composition-governance.md) the governance, and [77](docs/experiments/77-composition-drift-detection.md) drift detection. The notes below are what they were built from.

Proposed 2026-10-10. The project ships **core primitives**; a practitioner wires
the sequence they keep repeating and saves it as a reusable node of their own —
a routine primitive. A composite stays expandable, so opening it shows the steps.

Already specified twice and never built:

- [31](docs/experiments/31-facility-access-primitives.md): "Common tasks may be
  presented as a reusable subworkflow with an expandable internal graph, rather
  than requiring a beginner to configure every step."
- [prior art](docs/research/prior-art.md), on the QGIS Model Designer: "Future
  reusable subworkflows should expose a small public parameter set and retain the
  internal graph."

What is new in this proposal is **who composes**. The prior art reads as though
the project ships the subworkflows. If practitioners make them, the project can
stop guessing which composites are worth shipping — and the audit's nine example
nodes, which bake one demonstration's specifics into a palette entry, are the
case for it. Those should have been somebody's saved composition.

It also dissolves the teaching tension above without a tier scheme: one node for
whoever wants the answer, an open graph for whoever wants to learn.

### Governance is inherited, because a composition is closed over the registry

A composition may contain **only widgets in the registry**. That single rule
makes most of the governance free rather than new.

The application already enforces it. `core.ts` rejects any node whose type is not
in `TYPES`, so every workflow is already closed over the registry and a
composition built as a workflow fragment inherits the check without new code.

What that closure buys:

| Property | Where it comes from |
| --- | --- |
| Every member is versioned and digested | the widget registry |
| Every member passed the design audit | D1–D10, at admission |
| Every member emits a receipt | the execution contract |
| Every edge type-checks | `validateWorkflow` already does this |

So a composition needs no audit of its parts. What is genuinely new to govern is
small: its **name**, its **public parameter set**, and its **claim** — what it
says it does, which is where D7 applies and where a composition can mislead.

### Levels of governance, which already exist at both ends

A **widget** has a registry entry, a version, a digest, a release file and an
audit. A **pack** has a repository, a commit SHA, an admission status, named
reviews and a curated owner. A composition sits between them and can move up:

1. **Private.** Saved in one browser. Governed by nothing, which is correct —
   nobody else is relying on it.
2. **Shared.** Exported and sent to a colleague. Needs a name that does not claim
   more than it does, and the versions it was built against.
3. **Published.** In a composition repository. Pack-shaped: owner, commit, review
   state, admission.

The naming convention for compositions is the one piece with no prior art. The
widget convention governs node types the project controls. A practitioner naming
their own routine primitive is not bound by it, and should not be while the
composition is private — but a published one read as equivalent to a reviewed
widget is exactly the `xpert` problem with more authors.

### Version drift is not hypothetical. It already happens, silently

Not designed for. Forced instead, and measured, on 2026-10-10 —
`tests/composition-drift.test.mjs` with a fixture holding a widget removed the day
before.

**Fieldwork already floats.** A saved workflow names widget *types*, never
versions: every node is `id, params, type, x, y`, and all 76 release files declare
`versionPersistence: "not-yet-persisted"`. There is no field in which a version
could be recorded, so nothing can be compared and nothing can go stale. A workflow
opened after a widget changes gets the new widget, whatever it now does.

What a workflow saved on 2026-10-08 does today, when the widget it used was
removed on the 9th:

| | |
| --- | --- |
| Does it open? | Yes |
| Is the node rewritten? | Yes, to `find_health_facilities` |
| Is the practitioner told? | **No.** No warning, no note on the node, nothing in a receipt |
| Does any trace of the old type survive? | No |
| Its stored facilities? | Dropped, correctly — their provenance could not be carried — and **silently** |
| `country: "Philippines"` | Became `"PHL"`, a value nobody typed |

The dropping is right: that data's provenance was a hand-back of a file this
application never saw, and relabelling it would be a false record. The finding is
not the drop. It is that **everything above happens with no notification at all**,
and a practitioner reopening the workflow would see a configured node, a changed
country and no facilities, with nothing to explain any of it.

So the question for compositions is not how to prevent drift. It is what a
practitioner should be told when it happens, which can now be argued from a case
rather than from a hypothetical. The tests record today's behaviour; if loud
failure is introduced, they fail, and the change becomes visible.

## Label the worked examples with their public health scenario

Smallest step toward [79](docs/experiments/79-emergent-palette-slicing.md), and
the only one needed before the rest can be computed rather than argued.

Worked examples are named for their case — "heat outreach", "old naledi access",
"snow voronoi" — not for the kind of work they are. Adding one field, the public
health scenario, makes widget-to-scenario a computation over data that already
exists, the same way `usage:widgets` computes widget-to-example.

The structure is already visible without it. Measured across seven examples:
`observations`, `map_output`, `table_output` and `area` appear in six or seven;
`clip_polygons` and `summarize_polygons` appear together in the two catchment
cases and nowhere else. Nobody declared those four core. They emerged.

Two cautions, both recorded in 79. "Appears once" conflates scenario-specific
with newly added — `voronoi` and `find_health_facilities` are both at one, for
opposite reasons. And a filter that hides rarely used widgets is a quiet deletion:
the least used may carry the hardest-won distinction.

## GIS workflows 101: is there a teaching tier in the palette?

Raised 2026-10-10. Voronoi and isochrone hide their steps deliberately, because
composing them from parts asks a non-GIS public health professional to make too
many leaps at once. Taking a workflow apart is also how skill advances. Both are
true, so this is a question to observe rather than settle by argument.

The audit cannot express it. Both widgets are classified **Primitive** on D1's
axes — residual knowledge, asked for by name — and D1 has no axis for whether a
learner should see inside. `classification.json` has two values, `standard` and
`domain`, and no notion of a tier; the primitive-versus-composite judgement sits
in an audit the application never shows anyone.

Suggestive: **the three gaps the cholera notebooks exposed are all steps those
notebooks teach and the palette collapses** — weighted mean centre, convex hull,
routing. That is what you would expect if the palette were optimised for reaching
an answer rather than for learning how it is made.

Two things would settle it, and both are observations rather than designs:

- Does a learner who only used composites later compose something new?
  [27](docs/experiments/27-workflow-learning-and-gamification.md) already has the
  progression vocabulary and an exercise sequence; that is where to look.
- Does showing a composite's steps, without requiring anyone to wire them, reduce
  the leaps or add to them? The obvious risk is a palette that looks harder.

Not started, and deliberately not turned into a tier scheme. Reasoning in
[74](docs/experiments/74-notebook-first-worked-examples.md).

## Three primitives the cholera notebooks ask for

Derived 2026-10-10 by reading eleven notebooks across the Basic, Advanced-1 and
Advanced-2 case studies and mapping each operation to the palette. Full table in
[cholera-notebooks-to-primitives.md](docs/research/cholera-notebooks-to-primitives.md),
method in [74](docs/experiments/74-notebook-first-worked-examples.md).

These are wanted because an analysis performs them, not because they seemed like
good ideas.

- **Weighted mean centre.** `mean_center` records its method as "Unweighted
  arithmetic". Snow's data is 250 locations carrying 489 deaths; the centre of
  the locations is not the centre of the deaths, and one of this project's own
  practitioner questions is whether a reader can tell those apart. `case_series`
  already takes a weight field, so the concept exists and this widget lacks it.
  Smallest of the three, and it sharpens a distinction already being taught.
- **Convex hull.** Both Advanced studies derive a boundary from the data rather
  than drawing one. Already recorded in `docs/research/john-snow-voronoi.md` —
  hull and buffer "should not be hidden inside Voronoi" — and still hidden.
- **Routing between two points.** Advanced-1 NB02 computes a shortest path.
  `isochrone` answers what is reachable within a time, which is a different
  question from how to get from here to there and how far it is.

Before building any of them, write the notebook in the lab. That is the point of
the method: the notebook is the evidence the primitive is needed, and three
widgets were built this week without one.

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

## A WASM geometry kernel, instead of the JavaScript one

Raised 2026-10-14, **not urgent** and not an experiment yet. The question was which
widgets could use a Rust/WASM GIS kernel — `geo`, `geos-wasm` or similar.

The split is between the widgets that *compute geometry* and the widgets that do graph
or table work. Only the first group would gain anything.

| Would use it | Would not |
| --- | --- |
| `isochrone`, `reachable_corridor` — buffering and unioning the route; this is where the time goes | `reachable_nodes`, `snap_to_network` — Dijkstra and a nearest-point search over arrays |
| `clip_polygons`, `fill_interior_gaps`, `summarize_combined_area`, `buffer_area`, `buffer_point` — polygon clipping | `travel_time_band`, `rate`, `case_series`, `table_input` — table work |
| `voronoi`, `summarize_hull`, `hex_aggregate`, `summarize_polygons` — half-plane intersection, hulls, point-in-polygon | the ruleset and reasoning widgets — already WASM, through EYE-JS |
| `clip_raster`, `sample_raster` — masks and sampling | the import, output and presentation widgets |

**Why it might be worth it.** The measured cost of a catchment is almost entirely
`polygon-clipping` and `turf`'s buffer: 4.1 s of the 4.7 s a four-band Snow isochrone
takes, and the 4 GB heap exhaustion recorded at London scale was a single buffer call
([experiment 114](docs/experiments/114-the-three-segments-of-a-walk.md), the blocker
`isochrone-does-not-scale`). Those calls are already behind a handful of functions —
`taperedCorridor`, `clipPolygons`, the area helpers — so the surface to swap is small.

**What would have to be settled first.**

- **Offline.** The studio precaches and reports *Available offline*. A kernel is another
  WASM payload beside EYE-JS, and the service worker has to carry it.
- **Every pinned number moves.** A different engine gives different vertices, so every
  pinned area, gap count and death count in the suite shifts, exactly as today's work
  shifted them. That is measure-and-repin, not a regression, but it has to be planned as
  one exercise rather than discovered.
- **Which engine, and whether it is the same one the Validation Lab checks against.**
  The lab uses Shapely/GEOS. A GEOS-based WASM kernel would make the two agree by
  construction, which is either reassuring or circular depending on what the check is for.
  That question belongs in the experiment, not in the swap.
- **Is it a kernel or a widget?** Nothing here needs a new palette entry; this is an
  implementation swap underneath existing widgets, so it is not a primitive admission.

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

## Dashboards

- **chartgpu.io** — practitioner's note, 2026-10-23: worth looking at when dashboards come up.
  Nothing has been read or measured yet, so nothing is claimed for it. The question to put to it
  when we get there is whether a GPU chart renderer answers the volume problem the 1,011,401
  polylines already demonstrated for Leaflet (769 ms to add, 824 ms to zoom), or only moves it.
