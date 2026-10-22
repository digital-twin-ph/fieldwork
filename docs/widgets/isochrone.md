# Network isochrone

_Created 2026-10-14 · Updated 2026-10-15_

**A process widget.** It draws the area you can reach on foot within a stated time, walking
along real streets, from one or more sites.

## What it does

From each site it walks outward along the street network until the time runs out, then draws a
band around every street it reached. The result is one region per site — not a circle, because
streets are not straight and do not go everywhere.

A walk has three parts and this charges for all three: **to** the nearest junction, **along**
the streets, and **off** the street at the end to reach a door.

## What you connect

| Connect | What it needs |
| --- | --- |
| your sites | the points to walk from — pumps, clinics, depots |
| a street network | from the **Street network** widget |

Out come polygons, one per site. Draw them on a Map, or count your records into them with
**Summarize points in polygons**.

## How to use it

1. **Add it** from the palette, under Catchments.
2. **Connect your sites and a street network.**
3. **Set the budget.** *Minutes* × *metres per minute* is how far someone can walk — 5 minutes
   at 75 m/min is 375 m of street.
4. **Set the final walk off the street** — how far from a street someone can get to a door.
   The band is this wide where there is time left and narrower where there is not.
5. **Set the snap limit** — how far a site may be from the nearest street before the result
   says so.
6. **Check the zone.** Measuring happens in metres, so the UTM zone is part of the answer, and
   every measuring step in one workflow must agree on it. The run is refused by name if they
   disagree.
7. **Run the workflow**, then read the regions on a map and the alert in the Inspector.

## How the travel time is spent

Shortest paths are Dijkstra over the network's directed edges and the metre lengths it supplies,
including the partial length of a curved edge where the budget runs out part-way along it.

All three legs of the journey are charged against the same budget:

| Leg | What it costs |
| --- | --- |
| the straight walk from the site onto the network | distance to the snapped street, at walking speed |
| the streets | the shortest path, by directed edge and supplied length |
| the final walk off the street to a door | the band width where time allows it, narrower where it does not |

Charging the last leg rather than adding it is what stops a region overshooting the time it is
drawn for. The off-street band is an approximation of coverage beside the streets, and holes
inside it remain unless infill is enabled.

Two cases are marked rather than dropped, and the widget names both:

- **A site further from a street than the snap limit** is routed anyway and marked off-network.
- **A site whose walk onto the network alone spends the budget** gets no catchment at all.

Coverage can also be cut short by the graph itself: a region stops where the downloaded network
stops, which is a property of the extent that was downloaded and not of the travel time.

## Worked examples that use it

| Example | What it does there |
| --- | --- |
| **John Snow · walking catchments** | five-minute walking regions around the eight Soho pumps, drawn as a plot and as an interactive map, with the 1854 deaths counted into them |

## What it will not do

- **It is not a service area or a routed travel time.** It is an approximation of shape, drawn
  to be read. Nobody agreed to it and no router produced it.
- **It assumes the ground beside a street can be walked**, at walking speed, in any direction.
  Near the edge of the budget that is where the region is most generous.
- **It does not drop a site that is far from the streets.** Such a site is routed anyway, with
  the straight line to the nearest junction charged against its budget. Its region is marked,
  the widget glows red, and the Inspector names the leg. That straight line assumes you can
  cross whatever lies between, so the region reaches further than the ground allows.
- **A site whose walk to the street would spend the whole budget gets no region at all.** It
  reaches nothing in the stated time, which is the answer. It is named in the alert, and the
  note on the result says the counts are over the sites that reached something.

### The direction it misleads

All of the above push the same way: **a poorly connected place looks better served than it
is.** Streets and footpaths are mapped unevenly, and informal settlements least of all. Read a
region over sparsely mapped ground as optimistic, check the alert for sites routed off the
network, and check how far each site had to go to reach a street.

## Checking it yourself

The lab's [snapping notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=19-snap-vs-pyproj.ipynb)
measures the displacement on the example data, and the corridor check rebuilds the region from
the stated rule with Shapely.
