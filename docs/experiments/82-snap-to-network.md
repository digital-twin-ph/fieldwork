# 82 · Snap to street network

_Created 2026-10-10 · Updated 2026-10-14_

**Status:** admission review, written before the code. Third of the six
primitives [78](78-trying-compositions-on-isochrone.md) needs, and the first
taken from the source end rather than the output end.

## Competency question

**Which point on the street network does each site attach to, and how far is
that from the site itself?**

Asked whenever anything is routed from a place that is not itself on a road: a
clinic set back from the street, a pump in a yard, a household centroid. Every
network calculation answers it silently before it answers anything else.

## Why the order changed

[80](80-convex-hull.md) and [81](81-combined-area.md) were built backwards from
the isochrone's output, each one tested against the one before it. Backwards
stops here. The next primitive in that direction buffers the reached edges, and
reached edges cannot travel between widgets: `isochrone` truncates them part-way
along a street at the time budget (`src/catchments.ts:78`), and
`validateNetwork` requires every edge endpoint to be a declared network node
(`src/catchments.ts:27`). A cut point is not a node, so the `network` carrier
cannot hold them and there is no `lines` carrier.

A `lines` carrier is cheap to add — `PortType` is referenced in five places —
but adding it now would produce a widget with no producer, which is the defect
[79](79-emergent-palette-slicing.md) recorded when three widgets shipped with
nothing instantiating them. So the build turns around and starts from the
source end, where both carriers already exist: points in, points out.

## Where it comes from

`isochrone` snaps inside itself: nearest node by straight-line distance in the
metric CRS, refused beyond `maxSnapM`, and the distance recorded in a `snaps`
array. Its own note says what that costs — *"No off-network connectors; snap
distance is reported but not charged"*. (As of 2026-10-14 neither clause holds:
the distance is charged and nothing is refused. See the supersession below.) The walk
from the site to the street is free. Extracting the step puts that admission on
a node of its own, where a practitioner can see the displacement and decide
whether it matters, rather than reading it in a note attached to a polygon.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: the identity of the attachment node, and the distance to it. Neither follows from the site or the network alone. Practitioners ask for it by name once they have been bitten by it — "which road is this clinic on". Primitive, on the palette |
| **D2** | No. `nearest`, `access` and `slr_site_assignment` all find a nearest something with a distance, but all three measure to another **point of interest**. This measures to a **graph node**, and returns the node's identity, which is what later routing consumes |
| **D3** | See the table below. Two sites may snap to the same node; that is reported, not refused |
| **D4** | Ports: points and network in, points out. The snap limit is a parameter because it is a judgment about the data, not a property of either input |
| **D4a** | A block, not a pre-glued assembly. The output is ordinary points: it feeds `map_output`, `table_output`, `buffer_point` or `mean_center` with no adapter, and the displacement travels as a point attribute. Nothing about it fits only the reachability widget |
| **D5** | Needs a metric CRS to measure a distance, so it takes a zone. **That makes eight** |
| **D7** | `snap_to_network`. Spatial operation; not a summary, since one point in gives one point out |
| **D9** | Unmeasured. Parity against OSMnx `nearest_nodes` is the obvious check and is not done |
| **D10** | Demonstrable immediately on the John Snow Soho network, which is already in a worked example. Not yet instantiated by one |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| A site too far from any road is not snapped | **Hard stop.** Beyond `maxSnapM` the run fails and names the site and the distance, as `isochrone` already does |
| The output point is the road node, not the site | **Validation rule** in effect: the geometry is the node's coordinates, and the distance moved is carried on the point as `snapDistanceM` |
| Two sites can snap to one node | **Run-time check**, reported as a distinct-node count. A port type cannot express it: it depends on the two values, not on either one's shape. Refusing it would be wrong — two clinics on the same corner is a fact about the ground |
| The distance to the network is not charged to travel time | **Limitation.** Inherited from `isochrone` and now stated on the node that creates it |
| Nearest is straight-line, not along the network | **Limitation.** A node 20 m away across a railway is still the nearest |

**Two of those rows were superseded on 2026-10-14 by
[experiment 114](114-the-three-segments-of-a-walk.md).** They are left standing
because the reasoning that produced them is what 114 had to argue against.

| Row as written | What it is today |
| --- | --- |
| "A site too far from any road is not snapped — **hard stop**" | **Run-time check that marks, not refuses.** The site is snapped anyway and carries `offNetworkMetres`; nothing is dropped and no run fails on these grounds. The hard stop removed exactly the sites whose streets are unmapped, which is where the question is usually asked |
| "The distance to the network is not charged to travel time — **limitation**" | **Charged.** `isochrone` and `reachable_nodes` both spend `snapDistanceM` out of the budget before any street is walked. The limitation that remains is narrower: the charge is a straight line at street speed, which is a lower bound |

## What this does not establish

That the nearest node is the right attachment. A site's real access point is
where its door meets a road, which the street graph does not record. Snapping
to the nearest node is a convention, and on a sparse graph it can move a site
hundreds of metres to a junction when the street outside it was never a node at
all. The distance is reported so that this is arguable; it is not resolved.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add snap_to_network, and turn the decomposition around |
| 2026-10-14 | Two of the five distinctions superseded by [114](114-the-three-segments-of-a-walk.md): the hard stop past `maxSnapM` became a mark on the point, and the uncharged walk became a charged one |
