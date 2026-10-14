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

**A walk has three parts, and this charges for one of them.** From where you
stand to the nearest junction; along the streets; from the last junction to the
door. Only the middle part is counted.

- The walk **onto** the network is measured — you can see it in the run evidence
  as `fw:networkSnaps` — and then not deducted from your budget. The catchment
  reaches slightly further than the minutes say. On the Soho example that is
  10.9 m of a 375 m budget, about 3%.
- The walk **off** the network, from the last junction to a doorway, is not
  modelled. The smooth edge is a fixed corridor width, not a walk.
- A site **further than the snap limit** from any mapped street **stops the
  run**. It is not shown as hard to reach; it produces an error.

## Who this misleads, and in which direction

All three push the same way: **a poorly connected place looks better served than
it is, or disappears from the result.**

Streets and footpaths are mapped unevenly, and informal settlements least of all.
So the places that would show the worst access are the ones most likely to be
excluded altogether. Read a catchment over sparsely mapped ground as optimistic,
and check `fw:networkSnaps` for how far each site had to move to reach a street.

## What it is not

Not a service area, not a catchment anyone agreed to, and not a routed travel
time. The corridor is an approximation of shape, drawn to be read, not measured.

## Going deeper

The lab's [snapping notebook](https://digital-twin-ph.github.io/validation-lab/lab/index.html?path=19-snap-vs-pyproj.ipynb)
measures the displacement on the example data. Experiment 114 records what would
change it.
