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
| **D9** | **Measured.** Validation Lab check 07 against NetworkX, the implementation the case study itself used. Reached sets identical over 738 junctions, 142 each; worst cost difference 5.000e-03 m, which is the half-step of the two decimals Fieldwork publishes. Recorded in `widgets/parity.json` against release 0.2.0. Covers outbound from one origin; inbound is unexercised |
| **D10** | Not yet. It is demonstrable on the Soho network once the corridor step exists |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| Travel time is distance divided by one constant speed | **Limitation**, stated on every result. Nobody walks a hill at their speed on the flat, and the graph carries no gradient |
| The speed means nothing without the kind of travel | **Parameter**, `travelMode`: walking, cycling, driving or other, asserted beside the number as `fw:travelMode` |
| A mode and a speed can contradict each other | **Validation rule.** Each mode has a plausible band and a speed outside it is refused, naming both in m/min and km/h. 400 m/min labelled walking is 24 km/h and fails |
| A speed belongs to a place and a period | **Limitation**, stated in every result. The mode records what kind of travel the number represents, not where the number came from |
| Public transport is not a speed on a street graph | **Hard stop.** It is not an accepted mode, and the refusal says why: it follows routes and a timetable, not the street network. Supporting it needs a different input, not a different number |
| The origin must already be on the network | **Validation rule**: `networkNodeId` is required and its absence names `snap_to_network` |
| Reachability is directed | **Parameter**, `outbound` or `inbound`, with the result stating which. Reversing the edges answers a different question and one-way streets make the two differ |
| The graph's edge truncates reachability | **Limitation.** A junction unreached because the download stopped looks the same as one unreached because it is too far |
| The walk from the site to its junction is not charged | **Limitation**, inherited from `snap_to_network` and restated, because it is the first step of every distance reported here |
| Street lengths are taken on trust | **Limitation**, with the network's own source named in the note and in the receipt. This widget re-measures nothing, which is why it needs no projection; the cost is that a wrong `lengthM` is believed |

## The speed knob, and the 1854 assumption inside it

Fieldwork has used 75 metres per minute everywhere since `isochrone` was
written, with no recorded reason. It traces to Advanced-1 NB03 cell 10:
`travel_speed = 4.5 # assume walking speed in km/hour`, which is 75 m/min
exactly. The notebook scopes it to how far "Soho District residents can walk" —
pedestrians, one London district, 1854.

That number was then the silent default for every catchment anyone drew in this
application, including Philippine ones. The problem is not that 4.5 km/h is a
bad walking speed. It is that a speed is an assumption about a place and a
period, it was being inherited rather than chosen, and nothing in the result
said so.

So the mode is a parameter and it is checked against the number:

| Mode | Plausible band | In km/h |
| --- | --- | --- |
| `walking` | 30–110 m/min | 1.8–6.6 |
| `cycling` | 100–400 m/min | 6.0–24.0 |
| `driving` | 150–1200 m/min | 9.0–72.0 |
| `other` | 1–1200 m/min | 0.1–72.0 |

The bands are **conventions, not measurements**. They exist to refuse a receipt
that asserts "walking" beside a number only a car could hold, and they certify
nothing about any traveller. They overlap, because a fast cyclist and a slow
driver really do move at the same speed. Nothing in them is a default: a speed
still has to be chosen, and choosing badly inside a band remains possible.

**Public transport is not offered.** It is not a speed on a street graph — it
follows fixed routes between stops on a timetable, waits at them, and is
unavailable at night. Modelling it needs route and schedule data, which is a
different input and a different primitive, so the mode is refused with that
reason rather than accepted as an average speed that would quietly produce a
plausible, wrong answer.

## How far the answer travels with the assumption

The lab notebook runs the same graph and origin at a range of walking speeds.
The budget scales linearly, the reached set does not:

| Speed | Budget | Junctions reached |
| --- | --- | --- |
| 3.0 km/h | 250 m | 69 |
| 4.0 km/h | 333 m | 114 |
| **4.5 km/h** | **375 m** | **142** ← the case study's assumption |
| 5.0 km/h | 417 m | 177 |
| 6.0 km/h | 500 m | 246 |

Nearly a fourfold range across speeds a reasonable person might choose, on one
graph from one origin. The assumption is not a detail of the method; it is most
of the answer. That is the case for the mode being a declared parameter checked
against the number, rather than a default nobody is asked about.

## What this does not establish

That the reached set is what anyone can actually reach. The cost is street
length over a constant speed: no gradient, no crossings, no waiting, no
one-way restrictions beyond those already in the graph, no closed streets, and
no difference between a person with a wheelchair and a person on a bicycle.
It is a geometry of the street graph, and reporting it in minutes invites it to
be read as a geography of access. The minutes are stated as derived, and the
speed used is reported with them, so the reader can divide back out.
