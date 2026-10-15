# Map

_Created 2026-10-14 · Updated 2026-10-14_

Draws what the workflow produced: boundaries, points, polygons, rasters and street
networks, one layer over another.

## What you connect

**Ports receive or transmit. Layers are displayed.** They do not correspond one to one, and
the difference is the thing to understand about this widget.

| Port | What it expects |
| --- | --- |
| `area` | a study area, drawn as the ground the rest sits on |
| `points` … `points_8` | point layers, one per connected source |
| `polygons` | catchments, hulls, cells or bands |
| `context` | points drawn beside polygons |
| `raster` | a prepared or clipped raster |
| `network` | a street network, drawn as itself |
| `coverage` | a spatial coverage review |

Which of these the node offers depends on its **Input mode**, and that is the part a
practitioner meets as friction: a map in the default *spatial* mode draws the ports `area`,
`points`, `coverage` and `raster`, and nothing else. Connect catchments to it and there is
no port to aim at — not an error, nothing to drop onto. Change **Input mode** to *Catchment
polygons / summaries* and the node redraws with a `polygons` port.

## What it assumes

**That a map is a map of one kind of thing.** It is not, and the application works around
its own assumption in three places: `pointInputCount` gives up to eight point layers,
`contextPoints` gives one points layer beside polygons, and `stack_polygons` is an entire
widget that collects up to six polygon layers into one value *ordered largest first so the
smaller draw on top*. Each handles one type. None of them is allowed to say "layer".

Six of the ten maps in the shipped worked examples already draw more than one layer, and
every one of the six gets there through one of those three.

**That a layer which arrived at no port is not worth mentioning.** The isochrone map has
two ports and draws **four** layers — a boundary, four time bands, 250 death locations and
eight pumps. The deaths were never wired to it: `summarize_polygons` keeps the points it
counted on the value it returns, so they reach the map by travelling inside the polygons.
The run evidence records this honestly — `fw:layerCount 4`, with `fw:layerWithin "polygons"`
on the layer that has no port of its own — but nothing in the interface says it, and a
reorder control listing the node's ports would not mention the layer you most want to move.

**That the computation's roles are the map's emphasis.** They are not. For a Voronoi
catchment the pumps make the tessellation and the deaths are overlaid to show which
catchment held the most; for an isochrone the pump and the network make the bands and the
deaths are overlaid to show their distribution within them. In both, the pumps are the
**input** and the deaths are the **subject**. The plot renderer draws sites red at radius
3.5 and observations gray at 2.7, so **the thing each map exists to show is smaller and
duller than the thing that produced the shape**, and the legend reads *"Gray: observations ·
red: sites"*.

`fw:layerRole` records which is which, so a reader can see which way round a map was built.
Nothing yet lets a practitioner set it.

## What the run evidence records, and what it does not

Everything that changes the **numbers** is recorded as a term: `corridorWidth`, `snapLimit`,
`walkingSpeed`, `travelTime`, `travelDirection`, `fillInteriorHoles`, `metricCRS`,
`countSemantics`, the caveats each step stated, and — for the map itself — `layerCount`,
`layerKind`, `layerFeatureCount`, `layerRole`, `layerIndex`, `layerPort`, `layerWithin`,
`mapLegend`, `mapBasemap`, `mapPresentation`, the title, subtitle and source note.

Nothing records what changes the **reading** while leaving every number intact: there is no
term for a layer's colour or size, for which layer the map is about, for what was cropped
out of the frame, or for class breaks. A map can be read many ways and can be built to
mislead, and this application's provenance would not catch it, because the provenance
records computation and the misleading lives in presentation.

## Who this misleads, and in which direction

A reader who takes visual weight as importance will read the pumps as the finding and the
deaths as background, in both John Snow maps. That is the opposite of what each map was
made to show.

## What is not built

- A map does not take layers of mixed types freely; it takes what its mode allows.
- Draw order is the order the ports are declared, except inside `stack_polygons`, where it
  is largest-area-first — a heuristic that suits nested bands and has no reason to suit a
  raster under points.
- A practitioner cannot reorder layers, set a layer's role, or restyle one.
