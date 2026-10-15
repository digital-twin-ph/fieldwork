# 115 — A map is layers, not modes

_Created 2026-10-14 · Updated 2026-10-14_

**Status:** asked — the defect is measured; nothing is built.

Raised by the practitioner on 2026-10-14, correcting an explanation of mine:

> I think we have a misunderstanding of maps. A map has layers, whether static or
> dynamic. If the widget before it emits points, that becomes a layer when it reaches the
> map input port. When another widget before it emits polygons, it becomes another layer
> when it reaches the map input port. So there is no such thing as mode, only layers.

## What the code does

`map_output` carries a parameter `inputMode` with five values, and the value decides which
ports the node draws:

| `inputMode` | What it can show at once |
| --- | --- |
| `spatial` | `area`, `points`, `coverage`, `raster` |
| `polygons` | `polygons` |
| `polygons` + `contextPoints` | `polygons`, `context` (one points layer) |
| `decisions` | `decisions` |
| `raster` | `raster` |
| `network` | `network` |

So a map is declared to be **a map of one kind of thing**, with two exceptions that were
added when that proved false.

## The exceptions are the evidence

Two mechanisms already exist whose only purpose is to put more than one layer on a map,
and neither generalises.

**`pointInputCount`,  1 to 8.** A map in `spatial` mode draws `points`, `points_2` …
`points_8`. Eight layers — of points only.

**`contextPoints`, a boolean.** A map in `polygons` mode draws one extra port, named
`context`, which takes points. One layer — of points only, beside polygons only.

A model that needs two special cases to show a point layer beside something else is
describing layers in a vocabulary that cannot say "layer".

## What the shipped examples ask for

| Example | Map | Mode | Layers wired |
| --- | --- | --- | --- |
| snow-voronoi | Voronoi catchment map | polygons | 1 |
| snow-isochrone | Isochrone plot | polygons | **2** — polygons + context |
| snow-isochrone | Interactive isochrone map | polygons | **2** |
| snow-extent | Observed extent | polygons | **2** |
| snow-geoprivacy | BEFORE · private source | spatial | **2** — area + points |
| snow-geoprivacy | AFTER · moved points | spatial | **2** |
| snow-geoprivacy | AFTER · H3 cells | polygons | 1 |
| old-naledi | Access map | decisions | 1 |
| raster | Clipped population raster | raster | 1 |
| sea-level | Facilities and projection sites | spatial | **3** — area + 2 point layers |

**Six of the ten shipped maps already show more than one layer**, and every one of those
six gets there through `pointInputCount` or `contextPoints` rather than through anything
the model calls a layer.

Nothing in the shipped set asks for polygons beside a raster, or two polygon layers, or a
network beside points — not because those are unwanted, but because **no port exists to ask
with**. `stack_polygons` was built to put several polygon layers into one value, which is
the same need solved one type at a time.

## What the correction implies

A map input port is a **layer slot**. Whatever arrives at one is drawn as a layer, with its
own symbology and legend entry, over or under the others. The kind of thing it is decides
how it is drawn, not whether it may be there.

Consequences, stated before anything is built:

1. **`inputMode` stops being a question.** It exists only because the map must be told what
   kind of map it is. With layers it is told by what is connected.
2. **`contextPoints` and `pointInputCount` collapse into it.** Both are "one more layer",
   restricted to points.
3. **Draw order becomes a real question**, and it is a practitioner's to answer: polygons
   under points is usually right and is not always right. `stack_polygons` already orders
   layers largest first and says so.
4. **The legend becomes derived**, one entry per layer, instead of per mode.
5. **The renderer has to compose**, where today it branches: `catchmentPlot` for polygons
   with optional context, `polygonSvg` for plain polygons, a spatial renderer for area and
   points, a raster renderer, a network renderer. Composition is the work; the ports are
   the easy half.

## What this does not establish

That every type should be drawable as a layer. `decisions` carries rows that may have no
coordinates, and a `coverage-check` is a review state rather than a geometry — both are
drawn today by their own renderer, and whether they are layers or something else is a
question this record does not answer.

Nor does it establish that the modes should be removed rather than derived. A saved
workflow holds `inputMode`, and a migration that silently reinterprets one is a change to
somebody's work.

It also does not establish the cost. The renderer branches in at least five places and the
interactive map is a separate implementation from the plot, so "compose layers" is a
rewrite of the display path rather than a port change.

## What would close it

A map that takes N layer inputs of mixed types, draws them in a stated order with a legend
derived from the layers, and reproduces all ten shipped maps — including the sea-level map
with three layers and the isochrone map with polygons and context points — with no
`inputMode`, no `contextPoints` and no numbered point ports.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-14 | A map has layers, not modes — the correction, and the measurement that supports it: 6 of 10 shipped maps already show more than one layer, through two special-case mechanisms that each handle points only |
