# 86 · The isochrone output stage

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** built, with one gap named at the end.

## What the case study's output actually is

Asked for the output to look like the notebook. Read against NB03 and NB04,
that is four things, not one:

| Output | Notebook | Fieldwork |
| --- | --- | --- |
| **Static map** of nested rings | `matplotlib` patches, one colour per trip time from a rainbow colormap, drawn `sorted(trip_times, reverse=True)` over the street network in light grey (NB03 cells 47–61) | `map_output`, polygons mode, `presentation: 'plot'` |
| **Interactive map** | `folium.Map(tiles='CARTODBPOSITRON')`, each band coloured by the deaths counted inside it — red above 200, orange 40–200, yellow 1–40 (NB04 cell 28) | `map_output`, polygons mode, `presentation: 'interactive'`, OSM or OpenTopoMap basemap |
| **Bar chart** of deaths per band | `plot.bar(x='trip_time')`, black bars, "Death Locations in Isochrone Regions" (NB04 cell 24) | `chart_output`, polygons mode, location-membership count |
| **Point-in-polygon counts** | `deaths_gdf.within(current_poly).sum()` per band (NB04 cell 19) | `summarize_polygons` |

**The output stage was already built.** All four already existed for the
monolith, which returns one polygons value holding four features with `minutes`
set. Nothing new was needed to render; what was missing was a way for four
separate corridor nodes to arrive as one layer.

## What was missing: collecting the bands

Each band's corridor is its own node and its own value. Every output node takes
a single polygons input. `summarize_combined_area` would union them, which gives
one blob the size of the largest band with the walking times gone — the opposite
of the wanted picture.

So `stack_polygons` collects up to six layers with nothing merged, ordered
largest area first so smaller bands draw on top. The notebook achieves the same
order by iterating `sorted(trip_times, reverse=True)`; ordering by extent
generalises it to layers that are not bands.

Two supporting changes carry the band's identity to the polygon, because without
it four rings reach a map indistinguishable from one another: `travel_time_band`
0.2.0 stamps `bandMinutes` on each junction it keeps, and `reachable_corridor`
0.2.0 reads that onto the polygon and refuses junctions from two bands at once.

## Result: the composition reproduces NB04's analysis

One traversal, four bands, four corridors, collected into one layer, with the
example's 250 recorded death locations counted per band:

| Band | Cumulative | In this band alone |
| --- | --- | --- |
| 1 min | 48 | 48 |
| 5 min | 216 | 168 |
| 10 min | 250 | 34 |
| 15 min | 250 | 0 |

Every one of the 250 recorded deaths lies within a ten-minute walk of the Broad
Street pump, and two thirds within five. That is the case study's finding,
arrived at through visible steps.

## The gap: disjoint counts are not an operation

The right-hand column above is computed **in the test**, not by any widget.

`summarize_polygons` counts memberships, and its own note has always said *"Do
not add overlapping catchment counts as a unique total"* — which is exactly the
hazard nested bands present. NB04 resolves it by subtracting in count space:

```python
polys_gdf1.at[index,'points_in_isochrones'] = points_in_isochrone - prev_count
prev_count = points_in_isochrone
```

Its bar chart therefore shows **disjoint** counts while its geometry stays
nested. Fieldwork can produce the nested geometry, the cumulative counts, the
static map, the interactive map and a chart of cumulative counts. It cannot yet
produce the chart NB04 actually prints.

That difference is not cosmetic. A reader seeing 48, 216, 250, 250 concludes the
deaths keep accumulating outward; a reader seeing 48, 168, 34, 0 sees them
concentrated in the first five minutes and absent past ten. The second is the
argument about the pump. So the next primitive is the successive difference
across nested bands — and it is a summary operation on counts, not geometry,
which is worth noting because every other primitive in this decomposition has
been spatial.

## What this does not establish

That nested bands are the clearer presentation. Four translucent rings drawn over
one another show the innermost area four times, and a reader comparing their
widths is comparing areas that contain each other. The notebook hedges the same
way, printing both the stacked grey version and the coloured one.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add stack_polygons, so the four bands reach one map, chart and table |
