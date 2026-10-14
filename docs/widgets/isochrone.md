# Network isochrone

_Created 2026-10-14 · Updated 2026-10-14_

Draws the area reachable within a stated walking time along a street network,
from one or more sites.

## What you connect

| Port | What it expects |
| --- | --- |
| `sites` | the points to walk from — pumps, clinics, depots |
| `network` | a street network, from **Street network** |

It produces polygons, one per site, which a map can draw and
**Summarize points in polygons** can count into.

## What you set

- **Minutes** and **metres per minute** — together these are the distance budget.
  5 minutes at 75 m/min is 375 m of street.
- **Corridor width** — how wide a band to draw around the reachable streets.
- **Snap limit** — how far a site may be from the nearest junction before the
  run stops.
- **UTM zone and hemisphere** — the projection it measures in. Every widget in a
  workflow that measures must agree on this one, and the run is refused by name
  if they disagree.

## What it assumes

**A walk has three parts, and this charges for all three.** From where you stand
to the nearest junction; along the streets; from the last junction to the door.
The region drawn is that whole route, buffered by the final leg.

- The walk **onto** the network is measured — you can see it in the run evidence
  as `fw:networkSnaps` — and deducted from your budget before any street is
  walked. On the Soho example that is 10.9 m of a 375 m budget. It is charged as
  a straight line at street speed, which is a lower bound on the real walk.
  Until 2026-10-14 it was free, and the catchment reached about 3% further than
  the minutes said.
- The walk **off** the network, from the last junction to a doorway, is the
  **final walk off the street** setting, and it is charged: it is that wide where
  the budget allows and narrower where it does not, so the region ends at its own
  time rather than 25 m beyond it. It assumes that ground can be walked, at street
  speed, which near the edge of the budget is where the catchment is most generous.
- A site **further than the snap limit** from any mapped street is **routed
  anyway**, with the straight line to the nearest junction charged against the
  budget. Its catchment carries `fw:offNetworkMetres`, the widget glows red and
  the Inspector names the leg. The line is a lower bound on that walk — it
  assumes you can cross whatever lies between — so the catchment reaches further
  than the ground allows. Before 2026-10-14 such a site stopped the run outright,
  taking every other site's catchment with it.
- A site whose walk to the nearest street would **spend the whole budget** gets
  **no catchment at all**. It reaches nothing in the stated time, which is the
  answer; there is no polygon, because the only shape available is a corridor-width
  disc around a junction the site cannot even get to. It is named in the alert and
  in `fw:unconnectedSites`, and the note on the result says the counts are over the
  sites that reached something.

## Who this misleads, and in which direction

All of them push the same way: **a poorly connected place looks better served
than it is.**

Streets and footpaths are mapped unevenly, and informal settlements least of all.
Nothing is now excluded for being far from a street, but a site reached across an
assumed straight line is still read as if that line were a footpath. Read a
catchment over sparsely mapped ground as optimistic, check the widget's alert for
sites routed off-network, and check `fw:networkSnaps` for how far each site had to
go to reach a street.

## What it is not

Not a service area, not a catchment anyone agreed to, and not a routed travel
time. The corridor is an approximation of shape, drawn to be read, not measured.

## Going deeper

The lab's [snapping notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=19-snap-vs-pyproj.ipynb)
measures the displacement on the example data. Experiment 114 records what would
change it.
