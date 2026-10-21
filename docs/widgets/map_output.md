# Map

_Created 2026-10-14 · Updated 2026-10-15_

**An output widget.** It draws what your workflow produced. It computes nothing, changes
nothing and decides nothing — if a number looks wrong on the map, the step that produced it is
where to look.

## What it does

A map is a stack of **layers**, drawn in order from the ground up:

1. a **basemap**, if you choose one — streets or terrain, under everything else
2. a **study area**, as the ground your results sit on
3. **polygons** — catchments, hulls, cells or bands
4. **points** — your records, sites, or anything with a location
5. a **raster** or a **street network**, where you have one

You connect what you want drawn. There is no setting that says what kind of map this is.

## What you connect

| Connect | To draw |
| --- | --- |
| a study area | the boundary your work is inside |
| a point layer | records with locations — up to eight separate layers |
| catchment polygons | areas reached, covered or grouped |
| a reasoning result | points coloured by the decision a ruleset reached |
| a coverage check | points marked inside, outside or missing a location |
| a raster | prepared or clipped cells |
| a street network | the streets themselves |

## How to use it

1. **Add the Map** from the palette, under Outputs.
2. **Connect your first layer.** Drag from any step that produced something drawable onto the
   map's **+ Add a layer** port, or pick it from **Add a layer** in the Inspector. The map
   works out which port it belongs to.
3. **Add more layers** the same way. A second point source gets a layer of its own rather than
   replacing the first.
4. **Choose how it is drawn.** *Static plot* exports as an SVG with a scale bar and a north
   arrow. *Interactive map* can be panned and zoomed, and is the only one that can show a
   basemap.
5. **Choose a basemap** if the geography matters — streets or terrain under your results.
   Leaving it at *None* keeps the map working with no connection at all.
6. **Title it**, and write the source note. Both appear on the map and in its export.
7. **Run the workflow.** The map appears as a Results tab.

### Reading what you get

- The **key** names every layer drawn.
- The **scale bar** and **north arrow** appear on a static plot. An interactive map has no
  single scale, so it shows neither.
- The **source note** carries whatever you wrote, plus the licence of anything the map used.

### Symbols and colour

Two things about a point are shown at once, in two separate channels, so neither has to be read
off the other.

- **Colour says which layer the point came from.** Each point layer you connect gets its own hue
  from the categorical palette, so two searches of two different sources are told apart on the map
  and listed separately in the layer control, where either can be switched off.
- **Fill says where the point stands.** Filled inside the study area, hollow outside it, grey when
  the record has no usable location — those are not drawn on the map and are listed instead.
- **Each layer also gets a mark**: circle, square, triangle, star, cross or X. A mark is chosen per
  layer in this widget's settings, and the legend draws the same mark the map draws. Colour alone
  is not readable by every reader, and a figure printed in greyscale has no colour at all.
- **Ordered values use an ordered ramp.** Travel-time bands run light to dark through one hue,
  which is a ColorBrewer sequential scheme. A category palette on an ordered variable invites the
  reader to see difference where there is sequence.

The map's receipt records all of this — which channel carries which variable, the palette and the
authority it comes from, and each layer's mark and colour with whether you chose it or the map
derived it — so a figure in a publication can be attributed.

## Worked examples that use it

| Example | What the map shows |
| --- | --- |
| **John Snow · outbreak extent** | the judged outline over 250 death locations |
| **John Snow · Voronoi catchments** | one catchment per pump, with deaths overlaid |
| **John Snow · walking catchments** | travel-time bands, as a plot and as an interactive map |
| **Old Naledi · diagnostic access** | facilities coloured by the decision a ruleset reached |
| **Old Naledi · raster clipping** | a clipped raster inside its boundary |
| **Manila · coastal exposure** | facilities with their assigned projection site |
| **Geoprivacy** | the same records before and after being moved |

## What it will not do

- **It cannot draw everything at once.** A map with both a raster and polygons connected draws
  the raster. The layers stay connected; only one is drawn.
- **It cannot reorder layers, or choose their colours.** Draw order is fixed, and a layer's hue
  comes from its position in the palette. The mark is the one part of the symbol you choose.
- **A basemap is not included in the SVG export.** The tiles come from an outside service as
  you look at the map, so a figure you export shows your layers on a blank ground.
- **Choosing a basemap sends the area you are viewing to that service.** Everything else about
  this map works offline. For maps of sensitive locations that is worth knowing before you
  switch it on.
- **It cannot tell you whether a map is honest.** Emphasis, framing and colour all change how a
  map reads, and none of them changes a number. See the layers you connected, and say in the
  source note what the map is about.

---

*How this widget is built, what it assumes, and what has been measured about it:
[docs/widget-specs/map_output.md](../widget-specs/map_output.md).*
