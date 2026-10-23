# Map · specification

_Created 2026-10-14 · Updated 2026-10-15_

**This is the record, not the manual.** The manual a practitioner reads is
[../widgets/map_output.md](../widgets/map_output.md); this is what the widget assumes, what has
been measured about it, and what changed when. Moved here on 2026-10-15 when the two were
separated — until then this content was the manual, and a practitioner opening *Manual for this
widget* met dated removals, blocker names and measurement tables.

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

**There is no input mode.** Removed 2026-10-15. A map declares every one of these ports, the
renderer is chosen from what is wired (`src/core.ts#drawnMode`), and a saved workflow's stored
`inputMode` is read only as a fallback for a map with nothing connected.

*This page said that for eight days before the code did.* `drawnMode` was written and the
`network` and `polygons` branches were converted to it; the `raster` and `decisions` branches
were left reading `node.params.inputMode`, which a map created by dragging or from the palette
does not have. Those two renderers were therefore unreachable, and a raster wired to a Map was
stored, listed in the layer picker, reported as `fw:RasterLayer` in the run evidence, and never
drawn -- with no error, because the map fell through to the spatial branch and refused for want
of a study area instead. Reported 2026-10-23 by a practitioner connecting a WorldPop raster:
*"So WorldPop raster does not show up on a map"*. Fixed the same day; both branches now read
`mode`. Every raster test reached its map through the Clip raster node's `Add raster map`
button, which still writes `inputMode:'raster'`, and the one test that wires by dragging
asserts the EDGE and not a pixel -- which is why a two-engine gate stayed green throughout.
`tests/raster.browser.mjs` now has a map with no stored mode that must draw.

On the canvas a map shows **the layers it draws, plus one port to add another**. Drop any
drawable result on that port and it binds to the port its type belongs to — a second point
source opens the next point slot by itself rather than replacing the first. The Inspector is
the same thing in a panel: one picker per layer, and one *Add a layer* picker listing every
result on the canvas this map could draw.

*What this replaced, and why it is recorded rather than quietly deleted:* the ports used to
depend on an **Input mode** selector, so a map in the default *spatial* mode had `area`,
`points`, `coverage` and `raster` and nothing else. Connect catchments to it and there was no
port to aim at — not an error, nothing to drop onto. The mode also decided whether a
presentation could be chosen and whether a basemap was on offer, which is why removing it
answered four separate reports at once. Connecting a raster additionally **deleted every other
connection**, because a raster map could show nothing else; a raster is now a layer and the
others stay.

## What it assumes

**That a map is a map of one kind of thing.** *Was* — removed 2026-10-15; the section stands
because the three workarounds it describes are still what the application has, and they are
what the next piece of work is about. The three remain because the RENDERERS are still one
picture at a time: a map with polygons and a raster wired draws the raster. That is now a
limit of the drawing code rather than a question put to the practitioner.

The application works around the old assumption in three places: `pointInputCount` gives up to eight point layers,
`contextPoints` gives one points layer beside polygons, and `stack_polygons` is an entire
widget that collects up to six polygon layers into one value *ordered largest first so the
smaller draw on top*. Each handles one type. None of them is allowed to say "layer".

Six of the ten maps in the shipped worked examples already draw more than one layer, and
every one of the six gets there through one of those three.

**That a layer which arrived at no port is not worth mentioning.** The isochrone map has
two ports and draws **four** layers — a boundary, four time bands, 250 death locations and
eight pumps. The deaths were never wired to it: `summarize_points_to_polygon` keeps the points it
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

## There is almost never a basemap under the data

Measured 2026-10-14, across every `map_output` node in the ten published worked examples:

| example | map | input | presentation | basemap |
| --- | --- | --- | --- | --- |
| snow-extent | `map` | polygons | plot | no control |
| snow-voronoi | `map` | polygons | plot | no control |
| snow-isochrone | `map` | polygons | plot | no control |
| snow-isochrone | `interactive` | polygons | interactive | offered, ships off |
| old-naledi | `access-map` | decisions | — | no control |
| sea-level | `map` | spatial | — | no control |
| snow-geoprivacy | `before-map` | spatial | — | no control |
| snow-geoprivacy | `after-move-map` | spatial | — | no control |
| snow-geoprivacy | `after-group-map` | polygons | plot | no control |
| raster | `raster-map` | raster | — | no control |

**One of ten can be given a basemap, and it ships with none.** So a reader of any published
example sees geometry on blank ground: a corridor with no streets beneath it, deaths with no
Soho around them, Manila facilities with no coastline.

The cause is not a policy about tiles. The basemap control is rendered only when the input is
`polygons` **and** the presentation is `interactive` (`src/app.ts:94`), because tiles are
Leaflet's, and `interactive` is the only presentation that mounts Leaflet. Every other map is
a local SVG, and an SVG cannot hold a tile without fetching and embedding it. The gate is a
renderer boundary wearing the clothes of a setting — the same shape as mode, found again.

What a basemap costs, which is why this is not a free fix:

- It sends the viewed extent to a third party on every pan, from a tool whose other maps
  work offline and make no request. For maps of case locations that is a disclosure.
- Tiles are excluded from **the SVG export**, so a figure exported from a basemap-backed map
  is not the figure the practitioner was looking at. The receipt now says which provider was
  on, so the gap is at least recorded rather than silent.

  *Corrected 2026-10-15, by the practitioner:* "excluded" was written as though it were a
  property of static maps, and it is a property of SVG. A static **image** map can carry a
  basemap — Python's `contextily` composites tiles into a matplotlib figure, which is exactly
  this case — and **PMTiles** serves tiles from a single file for an interactive map with no
  network at all. So the real option set is three, not two: tiles in a static raster export,
  PMTiles for offline interactive, or no basemap. The offline one is the interesting one here,
  because it removes the disclosure objection above rather than trading against it.
- OpenTopoMap's style is CC-BY-SA, not ODbL. Until 2026-10-14 both providers were credited
  as OpenStreetMap alone, which under-credited the style; fixed.

**The decision is the practitioner's.** Two ways to close it, and they are not equivalent:

1. **Let the plot presentation carry a basemap** — one static tile composite fetched at the
   plot's own extent, embedded in a raster export (as `contextily` does) rather than in the SVG. The figure then matches what was on screen and
   stays self-contained, at the cost of a request per render and an embedded raster in every
   export. Recommended if the point is that published figures should be legible as geography.
2. **Make more maps interactive** — cheaper, since the machinery exists, but it changes what a
   map *is* in this application: an interactive view has no scale bar (no single ground scale)
   and exports without its ground.

Neither is started. What is done is the recording: a basemap in use is now a layer.

## What the run evidence records, and what it does not

Everything that changes the **numbers** is recorded as a term: `corridorWidth`, `snapLimit`,
`walkingSpeed`, `travelTime`, `travelDirection`, `fillInteriorHoles`, `metricCRS`,
`countSemantics`, the caveats each step stated, and — for the map itself — `layerCount`,
`layerKind`, `layerFeatureCount`, `layerRole`, `layerIndex`, `layerPort`, `layerWithin`,
`mapLegend`, `mapBasemap`, `mapPresentation`, the title, subtitle and source note.

A basemap in use is layer 0, with `fw:layerKind fw:BasemapLayer` and `fw:layerTileProvider`
naming the service — a third layer origin beside `fw:layerPort` and `fw:layerWithin`, for a
layer that comes from neither the workflow nor another layer's value. Before 2026-10-14 the
basemap was recorded only as `fw:mapBasemap`, a property of the specification, so the layer
carrying all the geographic context did not appear in `fw:layerCount` at all.

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
- Nine of the ten published maps have no basemap control, and none can embed one in an
  export. See above for the two ways out and what each costs.
