# Cholera case studies, notebook by notebook, against the palette

_Created 2026-10-10 · Updated 2026-10-10_

Source inspection only. No notebook was executed and no upstream implementation
was copied. The Basic and Advanced studies are Apache-2.0; the JupyterLite
adaptations are GPL-3.0, so the boundary matters.

Method in [74](../experiments/74-notebook-first-worked-examples.md): list what
each notebook does, map each operation to a primitive, and treat anything
unmatched as a candidate derived from a real analysis.

## Basic — mapping and centrography

| Notebook | What it does | Primitive |
| --- | --- | --- |
| NB01 Folium map, part 1 | Read death and pump locations from CSV; draw a Soho basemap; add mortality as circle markers | `observations`, `map_output` |
| NB02 Folium map, part 2 | Compute the mean centre of mortality locations; add it to the map | `mean_center` |
| NB02, final section | **Weighted mean centre** | **none** |

29 code cells against 76 of narrative in NB01. The teaching is most of the file.

## Advanced-1 — street network and reachability

| Notebook | What it does | Primitive |
| --- | --- | --- |
| NB01 OSM / NetworkX | Download the Soho street graph from OpenStreetMap | `network_input` |
| NB02 OSM / NetworkX | Project the graph, snap points to nearest nodes, **shortest path between two points** | partly: snapping is inside `isochrone`; **routing has none** |
| NB03 Isochrone map | Ego graph by travel time, buffer the reached edges, convex hull, union | `isochrone` |
| NB04 Isochrone map | Draw catchments over a basemap; point-in-polygon | `map_output`, `coverage_check` |

## Advanced-2 — Voronoi catchments

| Notebook | What it does | Primitive |
| --- | --- | --- |
| NB01 Intro | Narrative only, no code | — |
| NB02 Convex hulls | **Convex hull** of the death locations, buffered, as a boundary for the diagram | **none** |
| NB03 Voronoi polygons | Voronoi from pump locations, clipped to the boundary; spatial join | `voronoi`, `clip_polygons` |
| NB04 Interactive map | Voronoi cells on a Folium map, joined to attributes | `map_output` (interactive) |
| NB05 Buildings in cells | Spatial join of buildings to cells, centroids, counts per cell | `summarize_polygons` |

## Three gaps, derived rather than asserted

**Weighted mean centre.** `mean_center` records its method as "Unweighted
arithmetic". The Snow data is 250 locations carrying 489 deaths, so the centre of
the locations is not the centre of the deaths. The project already treats this
pair as a distinction a reader must not miss — one of its own practitioner
questions is whether someone can tell 250 locations from 489 deaths — and
`case_series` already takes a weight field, so weighting is a concept the
application has and this widget lacks.

**Convex hull.** Used in both Advanced studies to derive a boundary from the data
rather than drawing one. [`john-snow-voronoi.md`](john-snow-voronoi.md) already
said hull and buffer "should not be hidden inside Voronoi". They still are. A
hull is also the honest way to show the extent of what was observed.

**Routing between two points.** Advanced-1 NB02 computes a shortest path.
`isochrone` answers "what is reachable within a time", which is a different
question from "how do you get from here to there, and how far is it".

That the method re-derived a gap already recorded in this directory, without
being pointed at it, is some evidence it works.

## What a one-to-one mapping would mean

A notebook in the validation lab for each of these, and a palette able to express
what each notebook does. Today: Basic needs one widget it does not have,
Advanced-1 one, Advanced-2 one. Everything else maps.

The lab holds no worked-example notebooks yet — its five are parity checks — so
the notebooks are the work, and the three widgets are what the notebooks would
prove necessary.
