# 111 — Splitting `reproject` into ingest and transform

_Created 2026-10-13 · Updated 2026-10-13_

**Status:** tried

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

**D10 — some example must instantiate it.** Unsatisfied today and not fixed by
this design. No example reprojects, which is why the widget's naming violations
have been gated rather than cleared.

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

Half A implemented, and the direction question answered with a named consumer
for the transform's output.
