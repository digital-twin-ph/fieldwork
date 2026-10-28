# 145 — Polygons as a source

_Created 2026-10-27 · Updated 2026-10-27_

**Status:** asked — the question is recorded here and deliberately not answered.

The practitioner, 2026-10-27: *"South London should exercise map_image_input, wide table and water
supply layer."* Two of the three were wired the same day. The third could not be, and this records
why rather than leaving it as a gap somebody rediscovers.

## What cannot be done today

`geo/map2-water-supply-zones.geojson` has shipped in the South London repository since 2026-10-24.
It holds three MultiPolygon features traced from the colour wash on Snow's Map 2:

| supply | wash | parts | vertices |
| --- | --- | --- | --- |
| Southwark and Vauxhall Company | blue | 2 | 153 |
| Lambeth Company | red | 1 | 128 |
| Area in which the pipes of both Companies are intermingled | purple | 1 | 107 |

That third feature is the whole of Snow's design: the zone where neither company can be credited
with the difference, which is what makes the comparison a natural experiment rather than a
correlation between two parts of town.

**No widget can read it.** Seven node types emit `polygons` and every one of them derives polygons
from something else — points aggregated to cells, a table joined to an area, a hull, a corridor, a
stack of other polygon layers. None of them is a source. A polygon layer that exists as a file has
no way into a workflow.

## What was done instead, and what it costs

The plate was wired as ground (experiment 143), so the washes do reach the figure — as ink. The
practitioner chose this explicitly when the alternative was put to them: plate now, vector later.

What the raster cannot do, stated so the limit is not discovered later:

- **Nothing can be joined to a wash.** A sub-district's supplier is carried in the tables, not read
  off the map, and the two are never reconciled by the application.
- **No feature can be selected, styled or counted.** The three territories are one image.
- **The checkbox hides all three together**, because they are one layer, not three.
- **It cannot be measured.** That is a deliberate property of the port type, not a limitation of
  the file.

## The question a polygon source would have to answer

**D1.** Does "bring this polygon layer in" survive decomposition, and would a practitioner ask for
it by name? Probably yes to both — but `study_area` already imports a boundary from a file, and the
honest first question is whether this is a second widget or a missing mode of that one.

**D2.** Does it already exist? `study_area` is the near neighbour and the comparison has not been
made. A study area is **the frame** — one boundary, the thing a workflow is about. A supply
territory is **a layer** — several features, each with attributes, none of them the frame. If that
distinction holds, they are different widgets. If it does not, this is a parameter on `study_area`
and building a second widget would be the duplicate D2 exists to catch.

**D11.** What residual function remains? Drawing and attributing a polygon layer that nothing in
the workflow computed.

## The admission review, 2026-10-28

Asked for by the practitioner, who also settled the question D2 left open: *"Since the Thames and
the sub-districts are the study area, we can revise the study area to be a polygon, like the square
that encloses the map2 that John Snow did. So the subdistricts and the river become layers within
that study area."*

**D1 — what is it, and where does it belong?** A primitive, in Sources. It reads a file and emits a
value; nothing decomposes into it.

**D2 — does it already exist?** No, and the distinction this record posed above is the one that
decides it. A **study area is the frame**: one boundary, the thing a workflow is about, consumed by
27 references to the `area` port. A **polygon layer is many features**, each with attributes, none of
them the frame. The practitioner's revision makes the two coexist rather than compete — the frame
becomes the square enclosing Snow's Map 2, and the sub-districts and the Thames become layers inside
it. A parameter on `study_area` could not express that, because the frame and the layers would be
the same node.

**D3 — is every distinction enforced?** The one that matters is "read as published". Nothing is
clipped, simplified or reprojected on the way in, which is a **run-time check** on the coordinates
(CRS84 degrees, the same `coordinate` guard `catchments.ts` already applies) and a **limitation**
otherwise: a file in another projection is refused rather than converted, because converting it
silently would make the layer a different shape from the one the author published.

**D4 — are the conditions in the right place?** This is where the review found something, and it is
a base-contract problem rather than a detail. `Catchment.siteId` is **required**, because all seven
existing producers of `polygons` derive them from sites. A polygon read from a file belongs to no
site. Two consequences, both verified:

- `catchment-semantics.ts:47` already guards: it emits `fw:sourceSite` only where
  `siteSourceNodeId` is set, so a siteless layer is anticipated there and nothing has to change.
- `catchment-output.ts:13` does not: it puts `siteId` into every table row unconditionally, and
  looks a site's coordinates up with `sites.find(...)` and a `||null` fallback. A file-sourced layer
  would put an empty `siteId` column in a table a practitioner reads.

So admitting this widget requires making `siteId` **optional** on `Catchment` and omitting the
attribute where it is absent. That is a base-contract change, of the same kind and made for the same
reason as `ground` on 2026-10-27: a field that encodes "every polygon comes from a site" is a field
that was true of the producers that existed and is false of this one. Fabricating a site id to
satisfy the type would be the thing this project refuses.

**D4a — block or pre-glued assembly?** A block. One input stud, no composition.

**D5 — does each qualifier live on the input?** Yes, and that is the point of it: the layer's name,
its licence and the attribute that names each feature are declared where the file enters, not at
each consumer.

**D7 — does the name state what was done, including the ports?** `polygon_input` names what it
carries and matches `point_input`, `table_input`, `raster_input` and `map_image_input`. It has no
input ports and emits `polygons`, which is the existing port type and needs no new stud. Noted
against it: `area` remains a port type that names a role rather than its content, which is the same
D7 problem `ground` was admitted with and is still unresolved — this widget does not make it worse.

**D8 — does the evidence test the distinction?** It must test that the layer arrives **as
published**: the same vertex count, the same ring winding, the same attributes, and a refusal for a
file whose coordinates are not CRS84. Counting features would not test anything a reader cares
about.

**D9 — does it lower the practitioner's effort, measured?** `geo/map2-water-supply-zones.geojson`
has been in the South London repository since 2026-10-24 and has reached a workflow **never**. The
effort today is not high, it is infinite: there is no path.

**D10 — does a worked example instantiate it?** South London, immediately: the three territories
Snow drew, of which the purple one — *"Area in which the pipes of both Companies are
intermingled"* — is the zone where a sub-district-level supply attribution misclassifies, which is
the finding experiment 147 records and nothing in the application can currently draw.

**D11 — what residual function remains?** Drawing and attributing a polygon layer that nothing in
the workflow computed. Unchanged from the first reading of this record, and still true.

### The cost, named rather than implied

The widget budget goes to **54 live against a reference of 41**, and `widgets/admission.json`'s
count from 63 to 64. The practitioner has already said what does and does not gate this kind of
decision: *"The reason building footprint got deferred is not the budget. There are more urgent
things to address."* So the budget is recorded as a fact about the set and not offered as an
argument either way.

## What it would cost

The widget budget stands at **53 live widgets against a reference of 41, exceeded by 12**. Another
source widget makes it 13. That is the number the admission review has to be worth, and this record
does not assert that it is.

## What this does not establish

- **That the vector is better than the wash.** For a reader looking at a figure, the traced
  polygons and the plate show the same three territories. The vector buys joining, selection and
  styling, and the example does not currently need any of them.
- **That the tracing is accurate.** The features were traced by hand from a colour wash on a
  georeferenced scan and carry their own note saying the wash is the supply territory rather than
  the course of the pipes. Nothing has measured the tracing against anything.

## What would close it

1. The D2 comparison against `study_area`, written out, deciding widget or parameter.
2. One analysis the example cannot do without the vector. If none can be named, the answer is that
   the plate is enough and this record closes as *out of scope* rather than unbuilt.

## A second case, 2026-10-27

The closing condition above asked for **one** analysis the example cannot express. There are now
two, arrived at independently.

The practitioner, researching why Lambeth's 1852 move mattered: *"Can we delineate the tidal Thames
on the map and show the intakes in relation to that?"*

The tidal limit is the exposure variable — below Teddington the flood tide carries London's sewage
back past an intake twice a day, above it the river runs one way — and the intakes can be shown
**in relation** to it, as a point at Teddington Lock. The reach itself cannot be drawn. Every
widget that emits `polygons` derives them from something else, and the two that accept a second
area *merge* it: `summarize_combined_area` makes "areas become one area", so feeding it the
sub-districts and the river would draw their union, which is a shape that means nothing.

**And it is the same capability, not a second one.** The first reading of this was that a river
needs a *line* source. It does not: the practitioner, 2026-10-27, *"Waterways can be polygons."*
OpenStreetMap carries the Thames as water polygons rather than only a centreline, so the tidal
reach and the water-supply zones want exactly the same thing — a polygon layer read from a file,
with attributes, that is a LAYER and not the frame.

So the same missing capability now blocks two unrelated things in one example: the water-supply
zones traced from the wash, and the tidal reach. That is the evidence this record asked for, and it
narrows **D1** rather than widening it: the question is not polygons versus lines, but whether a
polygon layer is its own source widget or a mode of `study_area` that admits a layer rather than a
frame.
