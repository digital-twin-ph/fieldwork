# 212 · Maps side by side, arranged in Configure

_Created 2026-11-13 · Updated 2026-11-13_

**Status:** tried — built 2026-11-13; the population example's shares in four panels; Chromium. The practitioner
observation has not been made.

## The question

The practitioner, 2026-11-13, of the population example ([209](209-three-population-rasters-and-the-census.md)): *"For
the population rasters so we have a map comparison of population densities? Like side by side maps?"* Then, showing
JLT's population comparison viewer: *"Interactive it would look like this. Static it would be a 2x2 map panel. We should
have the capability to arrange the maps in the Configure dialog."*

So: **can one Map step draw several layers as panels side by side, on one shared scale, arranged in its Configure
dialog?**

## What exists

| | Draws | Side by side |
| --- | --- | --- |
| Map | one picture: its layers stacked over each other | no |
| Comparison map | two point layers, original and moved, with their mean centres | yes, for that comparison only |
| Chart | panels, one per value of a column, on one scale (174) | yes, for charts |

Nothing draws two polygon layers or two rasters beside each other.

## The design it adapts

JLT's viewer (`jltobias/JupyterLite-Population-Data-Comparison`, `viewer/index.html`; to be read at a pinned commit
and credited where adapted): four panels in two rows, one per source; **one set of classes shared by all four**
(modified quantiles, people per km²), so a shade means the same number in every panel; each panel titled with its
source and release, its own key and provenance; and **Synchronize map navigation**, so panning one pans all.

## The design

An extension of Map, not a new widget: Map already takes several layers.

1. **Panels.** In Configure…, **Arrange** chooses *one map* (as now) or *panels*, and for panels which layer goes in
   which panel, its title, and the grid: one row, two by two, or a column. Each panel draws one layer and the context
   layers (the study area, a basemap).
2. **One scale.** The panels' values are classed together, one set of breaks over all of them, and the figure has one
   key. A panel's own classes would make a dark district in one panel and the same shade in another mean different
   numbers.
3. **Interactive:** one small map per panel, navigation synchronised (on by default, a box to turn it off), clicking a
   part showing its number in every panel.
4. **Static:** one figure, the panels in their grid, each titled, one key and one source line beneath; downloaded as
   one SVG or PNG.
5. **The first case** is 209's: each district's people per km² from WorldPop, GRID3, GHS-POP and the census, two by
   two. District density comes from Sample a raster's zonal statistics; the census's from its count over the district's
   area.

**Not in this experiment:** raster cells in panels (JLT's viewer draws cells; districts come first), panels of points,
and a difference map.

## Admission review

D1: no new primitive; Map gains an arrangement. The practitioner asks for it by name ("side by side maps").

| Distinction | Enforced as |
| --- | --- |
| Panels on one scale: one shade, one range, in every panel | **hard stop**: one classification over the pooled values |
| A panel is one layer; its title names it | **validation rule**: a panel with no layer is refused in Configure |
| Side by side is not a difference: no panel says which is right | **limitation**, said in the key |

## What it commits to, written before the result

- A unit test: four layers' values pooled into one set of breaks, and each panel's parts classed by them.
- A browser test: the population example's density map, four panels in two by two, one key; moving one interactive
  panel moves the others.
- **Practitioner observation, which can come out badly:** shown the four panels, can the practitioner say which source
  puts more people in a given district, and read the same shade as the same number across panels?

## What it does not establish

That side by side is the best comparison: a difference map or a scatter of one source against another may show
disagreement more plainly.

## Built, 2026-11-13

**First, Collect polygon layers retired into Map** (the practitioner, the same day: *"Retire collect polygon layers then
212"*; docs/audits/collect-polygon-layers-retired.md). A Map takes each polygon layer on its own input, `polygons` to
`polygons_6`, so four sources' districts reach one Map as four layers, each by its join's name.

**Arrange**, in Map's Configure…: one map, or panels in one row, two by two, or one column; each layer the last run drew
can be put in a panel or left out, and given a title. Stored as `arrangement` on the Map (0.29.0).

| Distinction | Enforced as | Built |
| --- | --- | --- |
| Panels on one scale | hard stop | the classes are taken over every panel's features together (`polygonShading` over the pooled features; `classifyOver` for the interactive panels) |
| A panel is one layer; its title names it | validation rule | an arrangement names 1 to 6 layers; a panel is drawn only where its layer was |
| Side by side is not a difference | limitation | said in the key: *one scale for every panel; side by side, not a difference* |

- **Static:** one figure, the panels in their grid on one frame, each titled, one key beneath (`polygonPanelsSvg`).
- **Interactive:** one small map per panel, **Move the panels together** on by default (adapted from JLT's viewer,
  `jltobias/JupyterLite-Population-Data-Comparison`, *Synchronize map navigation*).

**The first case changed, and why.** The design named each district's people per km². The population example computes
each district's **share** of its source's total, which is what experiment 209 compares; the census's density would need
each district's area and a division the workflow does not make. So the panels show the four sources' shares, two by
two: Select rows per source, Join a table to the study area, four layers on one Map.

**Not established:** whether a practitioner reads the same shade as the same number across panels, and can say which
source puts more people in a given district; that side by side shows disagreement better than a difference map would.

## Validation record, 2026-11-13, Chromium

| Check | Result |
| --- | --- |
| `tests/population-example-opens.browser.mjs`: Rwanda's pinned workflow, its windows read again, run; the static map | four panels in order Census, WorldPop, GRID3, GHS-POP; Gasabo the same shade in the first three; one key, saying *one scale for every panel; side by side, not a difference* |
| The same, interactive | four maps; dragging the first moves the fourth; no page error |
| `tests/map-panels.browser.mjs`: two small layers in a row, one titled | two panels, the title shown; interactive, two maps |
| `tests/polygon-layers.test.mjs` | collecting, the ports, the migration and its refusal |

**Found on the way, 2026-11-13:** the first interactive panel was empty in the population example. Moving the panels
together moved maps that were still being laid out (Leaflet: *reading '_leaflet_pos'*). Following now starts once every
panel is drawn. Each panel had also carried the whole map's toolbar, basemap choice and key; a panel is now its map, the
key said once above.

## Grid cells in the panels, 2026-11-13 (design, written before the code)

The practitioner, the same day, after the district panels: *"The example I showed you earlier the maps with the reddish
orange hues actually show the grid cells. And the interactive maps move together as linked maps so if you zoom on one
and move left to right or up and down all the maps move the same."* The panels of JLT's viewer are the rasters
themselves; districts were the part this record had put first and cells the part it had set aside.

1. **Map takes up to four rasters**, `raster` to `raster_4`, as it takes polygon layers. A raster layer is named by the
   step it comes from.
2. **What a panel shows is people per km² in each cell:** the cell's value over the cell's size on the sphere. The
   three grids are 100 m and 3 arc-seconds; per km² is what makes them comparable.
3. **Drawn at no more than 1,000 screen cells on a side.** A drawn cell's density is the people in the source cells it
   covers over their area, of the cells with a value; Botswana's WorldPop window is 123 million cells, which no screen
   shows. Said under the figure, with the size of a drawn cell.
4. **One scale:** quantile classes over every panel's drawn cells together, of those above zero, six classes on
   ColorBrewer's YlOrRd; a cell with no people modelled is left clear. The key gives each class edge.
5. **Linked as they move:** every panel follows the one being panned or zoomed, while it moves.

| Distinction | Enforced as |
| --- | --- |
| One shade, one density, in every panel | **hard stop**: one classification over the pooled drawn cells |
| A drawn cell is an aggregate, not a source cell | **limitation**, said under the figure with its size |
| A cell's density is per km² of its own area, not per cell | **run-time check**: each cell's area from its latitude |

**Not in this:** the census, which has no grid, beside the cells; a difference map.

## Grid cells, built and checked, 2026-11-13, Chromium

Built as designed above (Map 0.29.0, `src/raster-panels.ts`); the population example at 7242e4f adds *Each source's cells,
side by side*, WorldPop, GRID3 and GHS-POP in a row.

| Check | Result |
| --- | --- |
| `tests/raster-panels.test.mjs` | a cell's density per km² of its area on the sphere; drawn cells aggregate people over area, no data adding nothing; one set of classes over every panel |
| `tests/population-example-opens.browser.mjs`, Rwanda, static | three panels in order, three images, one key in people per km²; drawn cells about 278 m |
| The same, interactive | three linked maps; a wheel zoom on the first moves the third; the key once, above; no page error |

**Found on the way:** the line above the figure described the first raster alone (*0 valid*); the single-raster key
(*Relative cell value*) was printed over the panels; a district map's note was left on the next tab; the interactive
panels opened zoomed into the middle, fitted before they had a size. Each fixed and checked in the test above.

**Found by the practitioner, 2026-11-13:** *"How come the static maps did not have a study area?"* The cell panels drew the
cells and nothing else, and GHS-POP's window, cut as a rectangle from a global grid, carried the neighbouring countries'
cells into its panel and into the shared classes, so the scale was not Rwanda's. Now only cells whose centre is inside
or on the study area are drawn or classed, Sample a raster's rule, and each panel draws the study area's outline, thinned
to at most 6,000 points. Rwanda's class edges moved from 122 to 1,521 to 176 to 1,586 people per km². Checked in
`tests/raster-panels.test.mjs` and the population example's test (three outlines, static and interactive); Chromium.
