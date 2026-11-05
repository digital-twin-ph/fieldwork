# Map

_Created 2026-10-14 · Updated 2026-11-05_

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
- **Every symbol carries a dark outline**, so it reads over any basemap — a terrain basemap runs
  through the same colours the palette uses, and a hollow mark over one is hard to pick out. It is
  a neutral, not a seventh colour, and a checkbox turns it off for a pale ground or a printed
  figure.
- **Ordered values use an ordered ramp.** Travel-time bands run light to dark through one hue,
  which is a ColorBrewer sequential scheme. A category palette on an ordered variable invites the
  reader to see difference where there is sequence.

The map's receipt records all of this — which channel carries which variable, the palette and the
authority it comes from, and each layer's mark and colour with whether you chose it or the map
derived it — so a figure in a publication can be attributed.

### Where it goes in the write-up

**In the write-up, under** chooses the part of the Notes write-up this output's figure and its note go in:
Introduction, Methods, Results or Discussion. **Results** is the default. A map of the study area belongs in the
Introduction; a figure that shows how the analysis was done can go in Methods. References is not offered, because it
holds works and not figures. The run's receipt states the section and whether you chose it, and a validation rule
checks that the note describing the figure is filed in that same section.

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

### It states its own shape in the write-up

Every run machines a note into **Results** on the Notes tab stating what this map is made of. The layers bottom to top, their feature counts, and any layer that is connected and **not** drawn — which is a fact about the figure a reader is owed. It is read off the same layer list the figure and the key draw from, so it cannot disagree with the picture.

**The caption is yours.** A caption states the subject, the population, the place and the period
in your words, and none of that can be read off a map. What this writes is what the map
declares about itself — the material you write the caption from, sitting beside it in the same
section.

**And it carries no number.** A figure's number depends on where it sits in the write-up and on
the venue you are preparing — set one figure aside and the ones after it move up — so the number
is worked out when the document is rendered. Nothing here says "Figure 1".

Edit it and it forks into a note of your own, like any machined note; the machined one goes on
being rewritten by every run.

## What it will not do

- **It cannot draw everything at once.** A map with both a raster and polygons connected draws
  the raster. The layers stay connected; only one is drawn. A street network is no longer one of
  these cases: points, a study area and a street network wired to one map are all drawn together,
  on the interactive presentation.
- **The static plot does not draw a street network beside points.** The streets are drawn in a
  frame of their own size, so a map carrying both draws the points in the plot and says where the
  streets are. Set the presentation to interactive to see all of it in one picture.
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

## Playing through frames

Where the layer carries frames, from a join given **Frames from**, the interactive map shows a frame control: a
slider, **Play**, **Pause**, a step each way and a pace. Every frame shares one key, with classes computed across all
of them, so a part darker in one frame than another is higher. **What a frame is** sets a caption such as "Birth
cohort"; the frame keeps the name the data gives it. Play works only while every part is in view, and pauses if one
moves out. The static figure draws the last frame.

## Naming the parts

On an interactive map, **Label parts with** chooses which attribute names a polygon part when it is clicked.
The key it was joined on is shown beneath, so a layer keyed by `ID` can still be read by name. Nigeria's LGAs
are joined on `ID`, because 769 names cover 774 places, and labelled with `shapeName`.

## Tiles imported for this map

On an interactive map, **Import tiles** fetches an OpenStreetMap extract once, while connected, for the area
the map draws, and keeps it on this device. Run the workflow first, because the boundary comes from the run.

The workflow keeps the source, boundary, zoom range and build date, not the tiles. On another device the map
says it holds no tiles, and **Import tiles** fetches what is published then. Nigeria to zoom 10 was 1,344 tiles
and 49.2 MB. The map has no place names, because labels need fonts from a server.

## The basemap is context

No value on a map depends on the tiles under it. They come from an online service and can change or stop
being served, so another machine may show different ground. A map over an online basemap writes this into
Methods as a limitation, by itself. Natural Earth is bundled and writes no such note.
