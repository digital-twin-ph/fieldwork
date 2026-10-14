# 62 · Tracing a workflow instead of auditing the widgets

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** measurement and lesson record. No mechanism is added here. Two general primitives are
proposed, one claim in [experiment 60](60-from-gis-studio-to-public-health-studio.md) is corrected,
and the lessons of the 0.x series to date are consolidated at a deliberate stopping point.

[Experiment 59](59-pattern-for-engineered-knowledge.md) named the engine: a domain exercise reveals a
missing general primitive, and a thick domain layer means a primitive is missing underneath it.
[Experiment 60](60-from-gis-studio-to-public-health-studio.md) applied it a second time and found a
primitive it had missed — a keyed join, hiding inside `slr_site_assignment` — and classified all 37
widgets by port type to measure which axes exist.

Both diagnostics look at **the widgets that were built**. This record applies a different one: take
the practitioner's question, trace the workflow end to end, and ask at each step whether the
application can perform it. The two diagnostics do not find the same gaps, and the difference is the
finding.

## The workflow, traced

The question the sea-level exercise exists to answer: *which coastal health facilities in a study
area should be reviewed for sea-level exposure by 2100, and under what stated assumptions?*

| # | Step | What it needs | State |
| --- | --- | --- | --- |
| 1 | Bound the question | A coastal study area | `area`, `buffer_area` |
| 2 | Facility locations | Up to 2,000 points | `observations`; the dataset itself is an external problem |
| 3 | **Ground height at each facility** | A raster value sampled at a point | **Missing** |
| 4 | **Height and sea level on one vertical reference** | A vertical datum that can be related to the projection baseline | **Missing** |
| 5 | Projection values for the area | A bounded extract, resolved by site id | External script |
| 6 | Attach a projection to each facility | Nearest site, distance kept | `slr_site_assignment` |
| 7 | Compare | Level against height | `slr_threshold_comparison`, valid only if 4 happened |
| 8 | Present, evidence, limitations | Map, Table, Chart, receipts | Built |

Six of eight steps exist. Neither missing step is a sea-level concept, which is the engine of
experiment 59 working exactly as described — and neither was found by it.

> **Revised by [experiment 66](66-ports-as-schema-binding.md), 2026-10-09.** Where this
> record recommends narrowing port types so a wrong-producer connection becomes a hard stop,
> the aim is right and the means is wrong: three new types named after their producers would
> be three more private wires between two widgets. A connection is a schema binding, and the
> requirement belongs in a declared contract on a general carrier.

## Finding 1 — nothing can put a raster value onto a point

All 26 node types were enumerated. `raster_input` loads a one-band GeoTIFF and `clip_raster` masks it
to a polygon; **no primitive samples a surface at a location.** There is no `sampleRaster`, no zonal
or point-extraction operation anywhere in `src/`.

The consequence is specific and was not visible from the widget inventory: the elevation attribute
that `slr_threshold_comparison` requires **cannot be produced inside the application at all.** It must
arrive pre-joined on the facility file, prepared in QGIS or the Validation Lab. A widget shipped in the
host depends on data the host cannot make, and nothing in the registry, the catalog or the three
experiments that designed it says so.

Extracting values to points is one of the most ordinary operations in GIS and is not domain-specific
in the least. The same primitive serves population density at a facility, rainfall at a sentinel site,
land-surface temperature at a settlement. By the test in experiment 59 it is a general primitive
revealed by a domain exercise, and it belongs in the host.

## Finding 2 — place is built out horizontally and absent vertically

Experiment 60's axes table records **Place: "Built out, with its refusals recorded across experiments
29, 40, 48, 51 and 52."** That is true of the horizontal dimension and false of the vertical one.

| | Horizontal | Vertical |
| --- | --- | --- |
| Representation | `defaultSpatialReference()` — typed `datum`, `geodeticCRS`, `geometryCRS`, `axisOrder`, `units` | an `<input maxlength="80">` of free text |
| Discipline | `reproject.ts`: "One datum only. No datum shift, no resampling" | none |
| Refusal | "Only WGS84 UTM zones are admitted. A file on another datum needs a datum shift this prototype does not implement" | any string is accepted, including an empty-adjacent one |
| Vocabulary | CRS84, EPSG codes, axis order | no geoid, orthometric, ellipsoid or EGM term exists anywhere in `src/` |

The same project refuses an unimplemented horizontal datum shift, explicitly and in the interface,
while accepting any vertical datum as an eighty-character label. The discipline is correct on one axis
and absent on its sibling.

**This is the cause of the defect in `slr_threshold_comparison`, not a separate issue.** The comparison
of a projected change against a supplied elevation is valid only when the elevation is referenced to
the same baseline sea surface as the projection. `tests/sea-level.test.mjs` passes
`verticalDatum: 'MSL 1995-2014'` — the AR6 baseline period — with elevations of 0.9, 0.4 and 2.0 m, so
the fixture satisfies that condition and the suite passes. Real Philippine elevation data is on PRS92,
EGM2008, or mean sea level at a particular tide-gauge epoch, almost never on the AR6 baseline. Supply
any of those and the comparison silently becomes invalid.

Step 4 was never designed, so step 7 absorbed it as a text field. A distinction enforced only as prose
plus a non-empty check is a **limitation**, not the **hard stop** it was described as; the
vocabulary for this is in [the audit procedure](../audits/ontology-audit.md), added the same day as this
record. It is the condition [experiment 48](48-tabular-input.md) named when it insisted that
declaring a unit does not verify it.

This also explains which sites matter. Of the 228 published sites inside a Philippine bounding box,
216 sit at integer degrees — gridded, mostly open water — and 12 are tide gauges, four of them
Malaysian. A tide gauge is where the relationship between local mean sea level and a national datum
physically exists, through benchmark connections. **The gauges are not merely the smaller selection;
they are the only sites where step 4 is resolvable at all.**

## Why the earlier diagnostics could not see either one

Worth stating precisely, because it is the transferable part.

Experiment 59's test asks whether the domain layer is thick. The sea-level domain layer is thin — a
join and a comparison — and 59 read that thinness as the pattern working. But thinness was achieved
in part by **pushing steps 3 and 4 out of the application and not noticing**, and a thin domain layer
over a missing primitive is indistinguishable from a thin domain layer over a complete substrate. The
test detects primitives missing *beneath* widgets that exist. It is blind to primitives missing
*between* them.

Experiment 60's measurement classifies widgets by the port types they declare. That is an inventory of
what was built, and no inventory can report a step nobody implemented. Counting 31 spatial widgets
establishes that place is heavily represented; it cannot establish that place is *complete*, and the
row that concluded it was is the one being corrected here.

A workflow traversal finds a different class of gap because it starts from the practitioner's
obligation rather than the project's output. Both diagnostics are needed. Neither substitutes.

## The fix belongs on the input, following experiment 61

[Experiment 61](61-input-dimensions.md) established the shape: when a value is uninterpretable without
something, declare that something **on the input**, with enumerated values, defaulting to unstated, and
let consumers use it or refuse.

The vertical datum is the same shape and should not get a new mechanism:

- An elevation-bearing input declares its **vertical reference** from an enumerated set, not free text,
  and declares whether that reference is a **sea-surface baseline** or a **geodetic datum**.
- `slr_threshold_comparison` reads the declaration and **refuses** when the elevation's reference and
  the projection's baseline cannot be related, rather than comparing two numbers and stating a margin.
- The declaration defaults to unstated, so no saved workflow changes its result because this landed.
- The receipt records which reference was used, so a reader can tell a valid comparison from an
  arithmetically identical invalid one.

Stated as distinctions, in the form the vocabulary already uses: *an orthometric height is not a height
above mean sea level*; *a change from a baseline is not a level above a datum*; *a datum stated is not
a datum reconciled*.

## A correction to the premise of experiment 47

[Experiment 47](47-sea-level-pack.md) is shaped throughout by the 38.42 GB tide-gauge store and the
1.65 TB gridded store, and concludes that acquisition is impossible here. The conclusion stands; the
premise was the wrong dataset. The quantiles the exercise selects — 0.17, 0.5, 0.83 — are published in
the Zenodo **summary** files, which 47's own table calls "the dataset most users need". The Monte Carlo
sample stores are needed only to compute a quantile AR6 did not publish, which nothing here does.

And constraining an extract to a study area is **site-id resolution, not a spatial slice**, because 47
itself quotes the AR6 FAQ that gridded sites "are not stored in a gridded fashion in the netcdf files".
The order is study area, then site index, then `locations` selection. The middle artifact already
exists: `projection-sites-ph.csv` is a study-area-constrained site index that the extraction script
does not use, since `--site` takes one integer. Eight Philippine gauges across three scenarios, three
years, three quantiles and two families is 432 rows.

## Lessons of the 0.x series, consolidated

Each is drawn from a record in this corpus, with the prevention stated so it can be applied rather
than admired.

| # | What went wrong | Where | How to avoid it |
| --- | --- | --- | --- |
| 1 | **Governance built ahead of the operation it governs.** Admission states, review states, catalog rules and two validators were written before anyone defined what installing a pack is | [59](59-pattern-for-engineered-knowledge.md) | Define the act before the rules about the act. An elaborate apparatus around an undefined act makes the act look impossible by assumption |
| 2 | **Uniform cost for non-uniform risk.** Three equal reviews whatever a pack contains; the only pack that exists was never admitted | [59](59-pattern-for-engineered-knowledge.md) | Match review to what an artifact can do, not to what its category is called |
| 3 | **A conflation defended instead of noticed.** `runtimeFetching: none` was read as "no pack is ever installed" | [59](59-pattern-for-engineered-knowledge.md) | When a rule seems to forbid the goal, re-read the rule before explaining the impossibility |
| 4 | **The inventory audited instead of the journey.** Two diagnostics looked at widgets built; neither traced what a practitioner must do | this record | Trace one real workflow end to end per domain exercise. A gap between widgets is invisible to widget classification |
| 5 | **Discipline applied to one axis and not its sibling.** Horizontal datums typed and refused; vertical datums free text | this record | When an unimplemented transform is refused on one axis, check the analogous axis for the same constraint |
| 6 | **Synthetic fixtures are self-consistent by construction.** The sea-level fixture's elevations and datum label agree with the projection baseline, so the suite cannot see a mismatch between two real sources | this record, [58](58-sea-level-widgets.md) | Where a computation joins two independently sourced quantities, at least one case must use real data from both sources |
| 7 | **A recorded limit hardening into an asserted fact.** 47 recorded that no AR6 file had been read; the extraction script then named its column `value_m`, the provenance asserted `unit: metre`, and the host began throwing unless the unit is metre. **Confirmed 2026-10-09** by reading `total_ssp245_medium_confidence_values.nc`: `sea_level_change` carries `units: 'mm'`. The chain was wrong by a factor of 1000 through three self-consistent layers | this record, [47](47-sea-level-pack.md) | An unverified assumption must travel as uncertainty into every downstream artifact, or be verified before any of them assert it |
| 8 | **A declaration treated as a capability.** A host capability marked `present` in a pack, verified by nobody; a `kind: declaration-only` claim no validator checks | [48](48-tabular-input.md), this record | Every claim an artifact makes about itself needs a checker, or it is prose. Both sides of a cross-repository claim must agree mechanically |
| 9 | **A name claiming unearned work.** `stac_input` became `stac_discovery`; an import is not an acquisition; a consumer is not a model | [39](39-stac-discovery-and-remote-acquisition.md), [47](47-sea-level-pack.md) | The name states what was done, never what was wanted |
| 10 | **A specification shipped in the release format of an implementation.** Three widget contracts released on 2026-10-08 and retired on 2026-10-09, never executable on either day | [58](58-sea-level-widgets.md) | A contract awaiting implementation is a proposal, and belongs in a format that cannot be mistaken for a release |
| 11 | **The evaluation instrument stopped running.** Retiring `contents.widgets` left `check-pack.py` reading a key that no longer exists, so the pack self-checks fail before any check executes | this record | A renamed contract field is a breaking change to its readers. The validator is part of the contract |
| 12 | **Findability treated as separate from delivery.** The catalog was correct and invisible | [59](59-pattern-for-engineered-knowledge.md) | Packaging a practitioner cannot act on has failed regardless of its RDF |
| 13 | **Patching something that needs rebuilding.** The name-keyed facility match in `xpert` was fixed in place — an id-keyed table and two tests — for a widget whose disposition is to be dissolved into a declared ruleset. The defect was also **latent**: the registry is generated from a fixed source and bundled, so names cannot change without a regeneration, and the fix guards an event that has not happened | this record, 2026-10-09 | Before fixing, ask two questions. Does the thing survive the planned rebuild? And can the defect actually fire before that rebuild lands? Two noes mean the patch is cost without benefit, and it adds migration surface to the rebuild. Write the requirement as a test — that survives — and leave the implementation alone |

Two patterns run through more than half of these, and are the compressed form of the series so far.

**A value is uninterpretable without its qualifier, and the qualifier must be checkable.** The key
([48](48-tabular-input.md)), the datum ([58](58-sea-level-widgets.md), corrected here), the vintage
([51](51-dataset-profiles.md)), what one row stands for ([61](61-input-dimensions.md)), the family and
workflow ([47](47-sea-level-pack.md)), the method and limit of detection
([60](60-from-gis-studio-to-public-health-studio.md)). Each was discovered separately. Each has the
same remedy: declare it on the input, enumerate its values, default to unstated, refuse downstream
when it is missing, and record it in the receipt.

**Build the mechanism after the operation, and the general primitive before the domain layer.** Every
instance where this was inverted — governance before installation, review tiers before an admitted
pack, a domain widget over an absent primitive — cost more than the work it was meant to support.

## Validation this commits to

No code changes here, so nothing to test. What the two proposed primitives would commit to, when
designed in their own records:

Point sampling: a value sampled at a point matches an independently computed value from the same
raster; nodata is retained as unknown and never zero; the interpolation method is stated and a
nearest-cell result is not labelled as interpolated; a point outside the raster is unknown rather than
clipped to an edge; a CRS mismatch is refused, since no datum shift exists; and the raster's provenance
and vintage travel onto every sampled value.

Vertical reference: an enumerated reference is required before a comparison runs; a sea-surface
baseline and a geodetic datum are never related implicitly; a comparison across unrelatable references
is refused with its reason; an undeclared input behaves exactly as today; and the receipt names the
reference used.

## What this cannot establish

That the two primitives are the only gaps in the place axis — one workflow was traced, and tracing a
second may find more. That point sampling is implementable within this prototype's resource limits, as
the cap is 2,000 points and a DEM window has not been measured for this purpose. Anything about the
AR6 numbers: no file in the Zenodo datasets has been read for this record either, so the unit question
in lesson 7 is identified, not resolved. And that the lesson table changes behaviour — a consolidated
list of mistakes is a record of what was learned, not evidence that it will not recur, which only the
next exercise can show.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
