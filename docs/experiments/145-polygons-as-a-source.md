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
