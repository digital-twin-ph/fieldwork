# 111 — Splitting `reproject` into ingest and transform

_Created 2026-10-13 · Updated 2026-10-14_

**Status:** validated

The practitioner's decision of 2026-10-13, confirming the analysis already in
[todo.md](../todo.md): `reproject` is **split, not retired**. The source widgets
gain an output CRS so the common case needs no second node, and `reproject`
becomes a true `points → points` transform under Spatial operations.

This record is the design and its admission review, written before the
implementation, as [AGENTS.md](../../AGENTS.md) requires.

## Why not retirement

Three facts, measured 2026-10-13, that an argument for retirement has to answer.

**It is the only UTM ingest path.** [`src/input-data.ts`](../../src/input-data.ts)
records that the ordinary import reads degrees and `reproject-ui` reads easting
and northing in metres. The same file records what happens when a UTM CSV goes
through the ordinary path: `[500000, 7800000]` is accepted as a longitude and
latitude with no error, every point then reads as Outside the study area — a
finding about geography rather than an error — and haversine on
metres-read-as-degrees returns a finite nonsense distance. Retiring the widget
today removes the only path that does not do that.

**"Zero example uses" is not an argument.** It was offered as one earlier in the
session and it does not distinguish anything: `npm run usage:widgets` reports
**16** widgets never instantiated by an example, including `summarize_hull`,
`snap_to_network` and `reachable_corridor`. Correcting that here because it was
stated as a reason.

**The practitioner named the case the knob cannot serve**, on 2026-10-13: a user
may want a mid-workflow translation, or two versions of the same data in
different CRSs side by side. A source knob has one output and cannot express the
second.

## The two halves

| | Half A — ingest | Half B — transform |
| --- | --- | --- |
| Where | the source widgets | `reproject` |
| Contract | file in, **CRS84 points** out | **points in, points out** |
| Change | declare the file's units and zone | lose the file dialog, gain an input port |
| Group | Sources | Spatial operations |
| Risk | additive; nothing existing changes meaning | the output port's meaning changes |

Half A is purely additive and removes the dependency that makes retirement
unsafe. **It goes first**, and after it lands the retirement question could be
asked again honestly — which is the point of sequencing it this way rather than
doing the interesting half first.

## What Half B costs, and the decision it forces

A `points` value is CRS84 by contract. Every consumer assumes degrees:
`SpatialReference` in [`src/types.ts`](../../src/types.ts) is frozen to
`datum:'WGS84'; geodeticCRS:'EPSG:4326'; geometryCRS:'OGC:CRS84';
axisOrder:'longitude-latitude'; units:'degree'` — five literal types, no variance.
So a `points → points` reprojection has nowhere to put its answer today.

Measured: **19 references across 9 files** — `area-buffer`, `buffer-point`,
`core`, `network-snap`, `results`, `reachable-nodes`, `table-output`,
`travel-time-band`, `types` — most of them `structuredClone` pass-through.

Widening those literals is the small diff and the **dangerous** one: it lets a
projected value reach a widget that assumes degrees, which is precisely the
failure `input-data.ts` documents, moved from import time to mid-workflow where
there is no file to re-read. The distinction has to be enforced, not declared:
**projected points are not geographic points**, as a hard stop in
`validateWorkflow`, refusing the connection by name rather than at run time.

Which direction the transform runs is an open question this record does not
settle. CRS84 → UTM composes with the existing sources and serves "two versions
of the same data in different CRSs", whose consumer is the table and the export
rather than a spatial operation. UTM → CRS84 is what the code does today and has
no upstream producer once Half A exists. **Half B is not started until this is
answered**, because it determines whether anything can consume the output.

## Half A, implemented 2026-10-13

The ordinary CSV import now declares the frame its coordinates are in, beside the
columns it describes. `degree` stays the default; `metre` reveals a zone and
hemisphere, relabels the two column pickers **Easting** and **Northing**, names
the source CRS and its central meridian, and converts with the existing
`reprojectToCRS84` before the points leave the dialog. The column aliases gained
`easting`/`east` and `northing`/`north`, so the right columns are found without
being told.

Verified on both engines: a CSV of `698687.800, 5710773.830` imported as zone 30
north lands at `-0.1365, 51.5131`, matching proj4 computed outside the browser to
1e-6 degrees, and the node's `sourceInfo` carries `sourceCRS: EPSG:32630` with the
full reprojection provenance. **UTM ingest no longer depends on `reproject`.**

### A guard that cannot exist

The second test was written as *"a wrong zone is refused"*. It failed, and it was
the test that was wrong.

The same easting and northing are a valid location in **every** zone. Declaring
zone 1 instead of zone 30 for these points moves them 174 degrees west into the
Pacific, **leaves the latitude untouched**, round-trips exactly, and passes the
six-degree validity guard — because they genuinely are a location in zone 1. Only
the longitude moves, by exactly the difference between the two central meridians.

| Declared zone | Reading | Central meridian |
| --- | --- | --- |
| 30 (correct) | −0.13650, 51.51310 | −3° |
| 29 | −6.13650, 51.51310 | −9° |
| 1 | −174.13650, 51.51310 | −177° |

This is a **limitation**, in the five-category sense the audit procedure uses, not
an enforced distinction, and the test now records it as one. Nothing in a file of
bare easting and northing can establish its zone; only context can. That is what
`suggestUTM` compares against and what the projection explainer added in
[110](110-one-projection-per-workflow.md) exists to tell the practitioner *before*
they choose. The parity notebook's own closing paragraph said this about the
declared zone; here it is, measured.

## What changed our minds

Half A first landed on the CSV import alone. The practitioner's question, the same
day — ***why should the ordinary CSV import read UTM?*** — found that it had
broken the application's own rule, and the rule was already written down in code.

**A GeoPackage declares its CRS in `gpkg_spatial_ref_sys`, and the importer read
that declaration only in order to refuse it:**

> `No supported 2D POINT layers in EPSG:4326. Reproject or convert the layer before importing.`

So for the one format that actually states its CRS, the answer was *sources do not
project — bring it in CRS84*. Adding conversion to CSV put two incompatible rules
in one dialog, and left the format that knows its own CRS as the one that gets
turned away.

Worse, it reproduced the defect the split exists to remove. `reproject` is flagged
because it imports its own data and transforms it in one step; moving that
behaviour into the source widget moves the conflation rather than ending it.

Two problems had been solved with one change, and only one of them was mine to
solve this way:

| | |
| --- | --- |
| A CSV carries **no** CRS, and the import silently assumed degrees | the real defect — making it **declare** is unambiguously right |
| Whether the import should then **convert** | a separate question, answered "yes" because it made UTM ingest survive, not because the design supported it |

### The rule now, applied to all three formats

**Every source states the CRS of what it read and emits CRS84.** That is the
geopandas analogy the practitioner invoked — `read_file()` then `to_crs()`, the CRS
a property of the data rather than a separate node — applied consistently instead
of to one format.

| Format | Declares its CRS? | Before | Now |
| --- | --- | --- | --- |
| CSV | no | assumed degrees silently | declares degrees or a UTM zone; converts |
| GeoPackage | yes, `gpkg_spatial_ref_sys` | refused anything but 4326 | honours it: 4326 read as it stands, WGS84 UTM converted, anything else refused **by its code** |
| GeoJSON | fixed at CRS84 by RFC 7946 | recorded no CRS at all | states CRS84; refuses a legacy 2008 `crs` member that names something else |

The GeoPackage change makes that importer strictly better: it had been rejecting
layers it could read, and the refusal it now gives names what it found
(`EPSG:3857`) rather than only what it wanted. Verified: a point layer in
EPSG:32735 imports and returns 25.9, −24.69 to the eighth decimal.

The limit on all three is the same and is stated in each refusal. Only WGS84 UTM
can be honoured, because `+proj=utm +zone=N` is constructible without a PROJ
registry in the browser. Another datum needs a shift this prototype does not
implement, and guessing at one would misplace every point.

## Half B, implemented 2026-10-13

### The direction question, answered

The record said Half B would not start until the direction was settled, because it
determines whether anything can consume the output. **Forward: CRS84 → UTM.**

It is the only direction that composes. After Half A every source emits CRS84, so
nothing upstream produces projected points for an inverse transform to consume —
the inverse had a producer only while `reproject` imported its own file, which is
the contract being removed. Forward has a producer in every source and a consumer
in the table view, which is the case the practitioner named: two versions of the
same data in different frames, one to hand to someone else.

### What changed

`reproject` takes `points` and returns `points`, in Spatial operations, titled
**Reproject points**. The file dialog is gone — `src/reproject-ui.ts` was deleted,
since acquisition now belongs to the sources. Released as **0.2.0**, breaking.

Both naming violations cleared with the contract rather than by renaming, which is
what the ledger had said to wait for: *the title should not be fixed while the
contract still makes it true*. The ceiling went **6 → 4**.

### Projected points are not geographic points

A `points` value was CRS84 by contract and 23 of its 24 consumers assume degrees.
`SpatialReference` is widened by a separate `ProjectedReference`, and deliberately
**not** admitted in a saved node's params: `validateSpatialReference` still accepts
the geographic one only, so a hand-edited workflow cannot declare its points
projected and be believed. The projected frame exists on the run-time value, written
by the step that computed the coordinates matching it.

The distinction is a **hard stop** in `executionPlan`, refusing by name:

> Voronoi catchments needs longitude and latitude, and Reproject points gives it
> easting and northing in metres. Connect it to the source points instead; Table
> can show projected coordinates. Every widget that measures projects for itself
> and states the zone it used.

At plan time rather than run time, because the practitioner can still change the
connection. `table_output` is the single allowed consumer.

### The last place CRS84 was hardcoded

`table-output.ts` wrote `<CRS84> POINT (...)` into every geometry literal. That was
true while nothing could project; with this change it would have labelled metres as
degrees — the defect [110](110-one-projection-per-workflow.md) cleared from the
receipts, reintroduced at the final step of the chain. It now states the frame the
coordinates are actually in, verified as `EPSG/0/32630` with Soho eastings.

### Three casts refused

Writing this produced three places where a cast would have made the types compile
and the record lie, and each was fixed in the type instead:

| Cast | What it would have said | Instead |
| --- | --- | --- |
| `targetCRS:crs as 'OGC:CRS84'` | the forward projection outputs CRS84 | `ReprojectProvenance` describes both directions, with units and axis order on each side |
| `inputs.points` as a layer | — | the port's declared type carries the frame, because the value always did |
| `fromType:'reproject' as RetiredNodeType` | the type was retired | `RecontractedNodeType`: a third kind of migration, where a type stays and its contract changes |

### Migration

A node saved under 0.1.0 holds `params.data` — points the old widget had **already**
converted to CRS84 at import. It becomes the `point_input` it effectively was,
keeping records, label, connections and provenance, stamped
`sourceMigration.fromType: 'reproject'`. `params.data` is the discriminator, and the
new contract never writes it.

### What the gate caught

Three checks fired on this change and all three were right. The **blocker ratchet**:
clearing the naming violation left `sources-group-does-not-mean-acquisition` with
nothing waiting on it, so it was narrowed to `slr_extract_import`, which still earns
it. The **name-review gate**: the palette row changed, so the pinned review went
stale; re-pinned as still `pending`, since it was never accepted under the old name
either. The **registry**: port contract drift, a missing change history, an ontology
status contradicting its own empty mappings — three separate ways a release can
describe a widget that no longer exists.

### The forward projection has no parity evidence

The catalog said so before anyone noticed, and a browser test failed on it:

> Independent check: **agrees · earlier release** — maximum separation 6.70e-5 m
> over 9 points, against pyproj 3.8.0, PROJ 9.8.1. **Covers release 0.1.0.**

The lab's check 01 recomputes the **inverse** transform, which is what 0.1.0 did.
0.2.0 projects **forward**, and no notebook checks it. The round-trip in
`tests/reproject-transform.test.mjs` shows the two directions agree with each
other to 1e-9 m, which is a self-consistency check and **not parity**: both
directions come from the same proj4 build, so a fault in proj4's UTM would pass it.

**Closed 2026-10-14** by lab check 24, `24-project-vs-pyproj.ipynb`, against pyproj
3.8.0 / PROJ 9.8.1 over nine points spread across zone 30 north — on the central
meridian, at both edges of the six-degree band, and from 0.5° to 70° of latitude.

> **agrees** · maximum separation **0.623 mm** against a stated 1 mm tolerance.

The residual is the storage precision, not the projection. Fieldwork keeps
projected coordinates to three decimals, whose combined rounding bound is
0.707 mm, and the notebook computes that bound rather than asserting it: the worst
separation is **below** it, so the two implementations agree as finely as the file
can record. The catalog now reports plain `agrees`, and the test asserts that,
with the suffix's meaning kept in a comment — if it returns, a release has
outrun its check.

### The check the coordinates alone could not make

Fieldwork builds two things from the same zone and hemisphere: the proj4 string it
projects with, and the `EPSG:326xx` label its receipts carry. They are constructed
separately, so they can disagree — and **no comparison of coordinates would
notice**, because every point would agree with the definition actually used while
the receipts named a different frame to everyone downstream.

So the check recomputes from the declared *definition* and then asks PROJ whether
the declared *code* is the same frame. Lift-tested by mutating the fixture:

| Fixture altered | Separation | Code matches | Verdict |
| --- | --- | --- | --- |
| nothing | 0.62 mm | yes | agrees |
| one easting moved 2 mm | 2.13 mm | yes | disagrees |
| definition's zone 30 → 31 | 671,519 m | no | disagrees |
| **code `EPSG:32630` → `EPSG:32631`** | **0.62 mm** | **no** | **disagrees** |
| definition made southern | 10,000,000 m | no | disagrees |

The fourth row is why that clause is in the criterion. The coordinates are
untouched and agree to the same 0.62 mm; only the label is wrong. Without the frame
comparison the check would have passed a widget that misnames the projection in
every receipt it writes.

### A default that migrated itself away

Adding `reproject` from the palette produced a **`point_input`**. The palette's
default params still carried `data:{type:'FeatureCollection',features:[]}` from the
old contract, and `params.data` is the migration discriminator — so every new node
was migrated to the input it was never meant to be, immediately, before anyone
could connect it.

TypeScript could not see it: the field is legitimately optional so that saved
workflows still parse, and an empty collection is a valid value. Only the browser
test that opened the Inspector and read what it said caught it.

## Admission review (D1–D9)

**D1 — does the distinction survive decomposition, and would a practitioner ask
for it by name?** Yes to both, but only after the split. Today the widget answers
two questions at once — *where did this file come from* and *what frame is it
in* — and a practitioner asking the second does not have a file. That is the
defect, not the name.

**D2 — compared against existing primitives.** `reprojectToCRS84` in
[`src/reproject.ts`](../../src/reproject.ts) is already a pure collection-in,
collection-out function with a round-trip check at 0.01 m. Half B is a shell
change around code that is already the right shape; Half A is new UI over the
same function.

**D10 — some example must instantiate it.** Unsatisfied when this was written, and
**satisfied 2026-10-14**: the John Snow examples now project the pump locations
into the zone the analysis measures in and show them in a table.

The use is not decoration, which is the trap D10 invites — bolting a widget into an
example to move a counter is a rule binding harmfully rather than usefully. The
Voronoi measures in EPSG:32630 and never shows it: every catchment boundary, every
area and every distance comes out of that projected frame, and a reader sees
degrees going in and polygons coming out. The two added nodes make the frame
visible, and give a colleague reproducing the work in desktop GIS the coordinates
the analysis actually used.

It also puts the one-projection rule to work for the first time. `reproject` is a
metric widget, so this is the first worked example with **two** widgets declaring a
projection, and [110](110-one-projection-per-workflow.md)'s refusal now holds
something real together. Changing either zone refuses the run by name:

> This workflow computes in 2 different projections: projected (reproject) in
> EPSG:32631, catchments (voronoi) in EPSG:32630.

Before this the rule was exercised only by its own tests. The widgets never
instantiated by an example went from 16 to 15.

## What this does not establish

It does not establish that Half B should be built at all. It establishes that
retirement is unsafe before Half A, and that Half B's cost is a variance in
`SpatialReference` plus a hard stop that does not exist yet. If the direction
question has no good answer, the honest outcome is Half A alone and `reproject`
retired after it — a possibility this record deliberately leaves open rather than
designing around.

It does not establish that the rule belongs on every source. It is applied to the
three formats that read coordinate files; `find_health_facilities` and `places`
acquire from services that state their own CRS, and nothing about them is changed.
Whether a service response should be checked the same way is untested.

It does not establish that WGS84 UTM is enough coverage. It is what can be
constructed without a PROJ registry in the browser, which is a fact about the
implementation and not about what practitioners hold. Data on a national grid or a
regional datum is refused by name, and how often that happens here is unmeasured.

## What would close it

Both halves are implemented, the direction is answered, the forward projection has
parity evidence (lab check 24) and a worked example instantiates it. Nothing
measurable is outstanding, which is why this sat open on something no gate can
produce.

What can close it here is a disposition, and the honest options are two: keep the
widget on the argument this document already makes — that a second frame is a real
need and separability is the reason to serve it as its own step — or retire it as a
widget that exists because it was separable rather than because anything asked for
it. The project's own rule for that choice is in
[103](103-duplicates-should-merge.md): a criterion that detects without deciding
leaves the thing it found in place. This document detected and did not decide.

_Restated 2026-10-15. This section had required one practitioner saying what they did with
it, which needs field testing, a phase this project has not reached. Kept as a
[field question](../field-questions.md#would-a-practitioner-reach-for-a-second-frame-and-reach-for-this-widget)._

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-13 | Every source states the CRS of what it read |
| 2026-10-13 | Split reproject: a transform, not a source |
| 2026-10-14 | Record parity for the forward projection |
| 2026-10-14 | Instantiate reproject in the John Snow examples |
