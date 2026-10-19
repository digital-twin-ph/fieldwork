# Cholera case studies, notebook by notebook, against the palette

_Created 2026-10-10 · Updated 2026-10-15_

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
| NB02, final section | **Weighted mean centre** | `mean_center` (weighted, 0.2.0 — built 2026-10-19; **none** when this was written) |

29 code cells against 76 of narrative in NB01. The teaching is most of the file.

## The walking speed, and where it comes from

`travel_speed = 4.5` km/h, Advanced-1 NB03 cell 10, commented `assume walking
speed in km/hour`. It is 75 metres per minute, which is the number Fieldwork's
`isochrone` has defaulted to since it was written, undocumented until now.

**Corrected 2026-10-11, by one of the notebook's authors.** "Undocumented" was
unfair, and the distinction matters. The figure was not assumed: it was
**estimated**, in a back-and-forth between the two co-authors, from period
evidence — photographs of 1854 London, what residents wore, what the streets
were like underfoot. Reasoning was done. What survived into the artifact was
`travel_speed = 4.5 # assume walking speed in km/hour`, and the comment's word
"assume" understates its own provenance.

So the gap here is not between a reasoned number and an unreasoned one. It is
between reasoning **done** and reasoning **recorded**, and the most expensive
thinking is the kind that leaves no trace. A later reader — this project, five
days ago — met a bare constant and treated it as arbitrary, because nothing
distinguished it from one.

The notebook scopes it. Cell 5 asks how far "Soho District residents can walk",
and the learning objective names "walkability assumptions". It is an assumption
about pedestrians in one London district in 1854 — not a general walking speed,
and not a Philippine one. Carrying 75 into a facility catchment in Manila in
2026 imports a Victorian assumption without saying so, which is why
`reachable_nodes` makes the travel mode an explicit parameter and states in
every result that a speed does not transfer between settings
([83](../experiments/83-reachable-junctions.md)).

**Correction, 2026-10-10, twice over.** This document first recorded NB03's
order as "buffer the reached edges, convex hull, union". A commit then restated
it as "buffers, hulls, then unions", and a second correction said the hull is a
conditional infill applied to multipart unions, concluding that Fieldwork's
`fillHoles` and the notebook's `infill` are different operations.

That second correction was also wrong, and wrong from reading dead code.
`make_iso_polys` is **defined at cell 64**, called once at cell 67, and
**redefined at cell 94** with the `convex_hull` form — which is never called
again. The `poly_gdf_dict` built at cells 71–80 and written to
`outputs/isopoly_*.shp` at cells 99–105, the shapefiles NB04 reads, all come
from the cell-64 definition:

```python
new_iso = gpd.GeoSeries(all_gs).unary_union
if infill:
    new_iso = Polygon(new_iso.exterior)
```

So the operative order is: buffer each reached edge and node, union the buffers,
and take the exterior ring when infill is on. That is **exactly** Fieldwork's
`fillHoles`, now extracted as `fill_interior_gaps`
([88](../experiments/88-filling-interior-gaps.md)), which agrees with the
monolith to within 0.01%. The convex-hull variant at cell 94 is unreached code
and should not be treated as the method.

The lesson is the one about dependencies from earlier in the day, in a different
costume: a redefinition later in a notebook is not the version that produced the
outputs, and the call order has to be checked rather than the last definition
read.

## Advanced-1 — street network and reachability

| Notebook | What it does | Primitive |
| --- | --- | --- |
| NB01 OSM / NetworkX | Download the Soho street graph from OpenStreetMap | `network_input` |
| NB02 OSM / NetworkX | Project the graph, snap points to nearest nodes, **shortest path between two points** | partly: snapping is inside `isochrone`; **routing has none** |
| NB03 Isochrone map | Ego graph by travel time, buffer the reached edges and nodes, union the buffers, and replace the union with its convex hull **only when it came out in pieces** | `isochrone` |
| NB04 Isochrone map | Draw catchments over a basemap; point-in-polygon | `map_output`, `coverage_check` |

## Advanced-2 — Voronoi catchments

| Notebook | What it does | Primitive |
| --- | --- | --- |
| NB01 Intro | Narrative only, no code | — |
| NB02 Convex hulls | **Convex hull** of the death locations, buffered, as a boundary for the diagram | **none** |
| NB03 Voronoi polygons | Voronoi from pump locations, clipped to the boundary; spatial join | `voronoi`, `clip_polygons` |
| NB04 Interactive map | Voronoi cells on a Folium map, joined to attributes | `map_output` (interactive) |
| NB05 Buildings in cells | Spatial join of buildings to cells, centroids, counts per cell | `summarize_points_to_polygon` |

## Three gaps, derived rather than asserted

**Weighted mean centre — built 2026-10-19, `mean_center` 0.2.0.** The gap below stood for twelve
days after it was derived, was restated in
[74](../experiments/74-notebook-first-worked-examples.md), and was then declared out of scope by
the ontology audit, which recorded `mean_center` as "not a burden-weighted center". Measured when
it was finally built: on this data the two centres are **2.1 m apart**, so the centre itself was
robust — but the mean distance to the Broad Street pump is **125.9 m per address against 118.0 m
per death**. The gap was real and in a different place than the note below supposed. What follows
is the note as written.

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
