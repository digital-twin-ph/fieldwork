# 83 · Reachable junctions

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. Fourth of the six
primitives [78](78-trying-compositions-on-isochrone.md) needs.

## Competency question

**Which junctions can be reached from here within a time, and how much further
could you go from each one?**

The second half matters as much as the first. "Ten minutes from the clinic" is
a set of places; "and you had four minutes left when you got there" is what
decides where the edge of the ten minutes actually falls.

## The carrier problem, and why there is no new port type

[82](82-snap-to-network.md) stopped building backwards because reached **edges**
have no carrier: `isochrone` truncates them part-way along a street
(`src/catchments.ts:78`) and `validateNetwork` requires every edge endpoint to
be a declared node (`src/catchments.ts:27`), so a cut point cannot be expressed
as a network, and there is no `lines` type. A `lines` type looked unavoidable.

It is avoidable. Reading the truncation again: it consumes
`budget - distances.get(e.from)` — the budget **left over at the edge's start
node**. That is a per-node quantity, and nodes are points.

So this primitive emits the reachable junctions as points, each carrying
`remainingM`. The corridor step that follows truncates each edge by
`remainingM / lengthM` and never needs the budget, the speed or the minutes.
The parameter travels as data on the points instead of being declared again in
a second widget, where the two could drift apart.

This is a better decomposition than the one proposed at the end of
[82](82-snap-to-network.md), which would have added a carrier to move geometry
that did not need moving.

## Where it comes from

`isochrone`, lines 76 to 77: Dijkstra from the snapped origin over edge lengths,
stopping when the cheapest unsettled node exceeds `minutes × speedMPerMin`.
Extracted unchanged, including the direction reversal that makes "who can reach
me" a different question from "where can I get to".

One thing did not survive the extraction. The first draft took a UTM zone, as
the seven metric widgets before it do, and projected the network on the way in.
The projection was then never read: `isochrone` projects in order to snap and to
buffer, and this step does neither. It was removed. A widget asking for a zone
it does not use would have taught every practitioner who configured it that
reachability is a metric operation on geometry, when it is arithmetic over
lengths somebody else measured.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: travel cost from an origin along a network, which neither the network nor the origin holds. Asked for by name constantly — "what is within ten minutes". Primitive, on the palette |
| **D2** | No. `access` filters places by a straight-line distance; nothing traverses a graph. `isochrone` does this inside itself and returns only the polygon |
| **D3** | See the table below |
| **D4** | Ports: points and network in, points out. Minutes, speed and direction are parameters: they are the question being asked, not properties of either input |
| **D4a** | A block, with one honest coupling. The sites input must carry `networkNodeId`, which today only `snap_to_network` produces. The alternative is snapping inside, which is the monolith's mistake and would snap twice in any composition. A missing attribute fails with a message naming the step to add |
| **D5** | **Takes no zone**, unlike the other eight metric widgets. Written with one, then removed: the projection was computed and never used. Dijkstra costs are the network's own `lengthM` values and nothing here re-measures geometry. The qualifier that does matter travels on the input — the network states its own source, and that is asserted in the receipt as `fw:edgeLengthSource` |
| **D7** | `reachable_nodes`. Spatial operation. Not a summary: the row count changes because the question is "which of these", not "what do these add up to" |
| **D9** | Unmeasured. Parity against NetworkX `ego_graph` with `distance='length'` is the obvious check and is not done |
| **D10** | Not yet. It is demonstrable on the Soho network once the corridor step exists |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| Travel time is distance divided by one constant speed | **Limitation**, stated on every result. Nobody walks a hill at their speed on the flat, and the graph carries no gradient |
| The origin must already be on the network | **Validation rule**: `networkNodeId` is required and its absence names `snap_to_network` |
| Reachability is directed | **Parameter**, `outbound` or `inbound`, with the result stating which. Reversing the edges answers a different question and one-way streets make the two differ |
| The graph's edge truncates reachability | **Limitation.** A junction unreached because the download stopped looks the same as one unreached because it is too far |
| The walk from the site to its junction is not charged | **Limitation**, inherited from `snap_to_network` and restated, because it is the first step of every distance reported here |
| Street lengths are taken on trust | **Limitation**, with the network's own source named in the note and in the receipt. This widget re-measures nothing, which is why it needs no projection; the cost is that a wrong `lengthM` is believed |

## What this does not establish

That the reached set is what anyone can actually reach. The cost is street
length over a constant speed: no gradient, no crossings, no waiting, no
one-way restrictions beyond those already in the graph, no closed streets, and
no difference between a person with a wheelchair and a person on a bicycle.
It is a geometry of the street graph, and reporting it in minutes invites it to
be read as a geography of access. The minutes are stated as derived, and the
speed used is reported with them, so the reader can divide back out.
