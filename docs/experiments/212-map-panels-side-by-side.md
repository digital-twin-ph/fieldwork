# 212 · Maps side by side, arranged in Configure

_Created 2026-11-13 · Updated 2026-11-13_

**Status:** asked — design and admission review, written before the code.

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
