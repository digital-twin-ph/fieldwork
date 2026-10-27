# 82 · Snap to street network

_Created 2026-10-10 · Updated 2026-10-19_
_Uses a term this project withdrew on 2026-10-12, named in [the withdrawn-vocabulary ledger](../withdrawn-vocabulary.json). The text stands as written — it is evidence of what was thought then, and rewording a dated record would falsify it. Live text says **port type** for what a connection is checked against._


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
| **D2** | No. `nearest`, `access` and `slr_site_assignment` all find a nearest something with a distance, but all three measure to another **point of interest**. This measures to a **graph node**, and returns the node's identity, which is what later routing consumes — **this answer was revisited on 2026-10-17 and does not survive; see below** |
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

## D2, revisited — the answer above does not survive 103's rule

_Added 2026-10-17. The practitioner, having read OSMnx's `nearest_nodes` in the Cholera Advanced
1 notebooks: "If there is already a function that obtains D1 and D3 distances that is a duplicate
and needs to be removed … so the snap_to_network is a 103 problem and needs to be retired if it
is a duplicate."_

**Note on the token.** In those notebooks **D is distance** — D1 origin to the network, D2 along
it, D3 network to destination. In *this* document D1–D10 are the primitive design audit checks.
Same token, two subjects; the [glossary](../glossary.md#route-distance-legs) records both and
this section writes the distance legs out.

The D2 answer in the table above was given on the audit's own terms, and those terms changed
afterwards. [103](103-duplicates-should-merge.md), on 2026-10-12, gave D2 a **follow-through**:
when a duplicate operation is found, name the general implementation, then classify what each
other one adds as either an **operation** or a **domain** — and *"if what it adds is domain, it
merges. Only a distinct operation earns a widget."*

Against that rule the two grounds above both fail:

- *"This measures to a graph node, not a point of interest."* A graph node **is** a point. This
  describes **what the other input is**, which is domain, not what the operation does. 103
  classifies domain as merging.
- *"…and returns the node's identity."* The general implementation already does. 103 states its
  operation as *"for each point in A the nearest in B, with the distance, **which one won**"* —
  the identity is part of the general operation, not an addition to it.

So snap_to_network is a **fourth** implementation of nearest-neighbour-with-distance, where
[the widget audit](../audits/widget_audit.md) recorded three. Its own source says as much:
*"Same nearest-node search isochrone performs, kept identical so the two agree."*

**What was really distinct, and why it should go anyway.** Relocating the geometry onto the node.
OSMnx's `nearest_nodes` moves nothing — it returns the node and the distance, and the first
distance leg is then an explicit term. Here that leg is already carried as `snapDistanceM` and
the node as `networkNodeId`, so the move states nothing the attributes do not, and costs the
site's own position. It was being worked around within three days: `siteLongitude` and
`siteLatitude` were added on 2026-10-14 *"kept on the point that no longer stands there"*, because
`reachable_corridor` needed the original back.

**This is not a reproach of the original answer.** It was consistent with the check as written;
the check acquired its follow-through two days later. That is exactly 103's point — a D2 without
one turns "N implementations exist" into a fact rather than a decision, and this widget was
admitted inside that window.

**Disposition:** merges. The blocker is recorded in [the widget
audit](../audits/widget_audit.md), and it is smaller than it first looked: **no worked example
uses this widget**. Its consumers are `reachable_nodes` and `reachable_corridor`, and both read
**attributes** — `networkNodeId`, and the first-leg distance which the corridor already treats as
optional — rather than the widget. So the general operation gains those two attributes with the
geometry left alone, the consumers are satisfied unchanged, and only then can the retirement flag
be set: a retired widget never runs and the loader refuses it, so a saved workflow holding one
stops loading the moment the flag goes on.

## What changed our minds

**The dependency was one error message, and the fix was smaller than the plan for it.**

This widget existed because `reachable_nodes` threw *"this origin is not on the network. Add a
Snap to street network step before this one."* The audit's plan for removing that line ran to
four steps and predicted a widget release, Inspector controls and a migration. Steps 1 and 2
landed together on 2026-10-17 and needed **no release and no migration**, because the parameters
were added as optional rather than required — which is not a shortcut but the honest reading of
this widget's own argument: nothing in the Dijkstra re-measures geometry, so a run that attaches
nothing has nothing to project and should not be asked for a zone.

What the plan under-estimated instead was the interface. `reachable_nodes` had **no Inspector
panel at all**, for any of its parameters, since experiment 83. The estimate said "Inspector
controls" meaning controls for the two new fields; the work was the widget's first panel.

## What this does not establish

That `snap_to_network` can be retired. Step 3 is untouched: `reachable_corridor` still reads the
`siteLongitude` / `siteLatitude` shadow attributes that exist only because snapping overwrites a
point's geometry. Until that reader is dealt with, the widget has a consumer, and a retirement
flag set now would break it.

Nor does it establish that the two attachment paths will stay in agreement. They agree today
because they call the same function over the same projection, and a test asserts it junction for
junction. Nothing prevents a future change to one path alone; what exists is a test that would
fail if one were made.
