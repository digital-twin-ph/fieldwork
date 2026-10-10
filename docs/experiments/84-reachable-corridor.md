# 84 · Reachable corridor

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** built and parity-checked. Fifth of the six primitives
[78](78-trying-compositions-on-isochrone.md) needs, and the one that makes the
chain produce a polygon.

## Competency question

**Which ground can a traveller actually get to, going along the streets, within
the time?**

## Result: the decomposition reproduces the monolith

snap → reachable junctions → corridor, against `isochrone` itself, on the
738-node Soho network at the John Snow example's own parameters — 5 minutes,
75 m/min, 25 m corridor, outbound, holes kept:

| | Area |
| --- | --- |
| `isochrone` (one node, nine knobs) | 198,432 m² |
| Three primitives composed | 198,433 m² |
| Difference | **3.8 parts per million** |

The residual is `remainingM` being rounded to two decimals on its way between
widgets, which moves a truncation point by at most 5 mm.

**This is consistency, not parity.** Both numbers come from this repository, so
the check establishes that the decomposition did not change the answer — not
that either answer is right. Parity needs an external implementation, which
`widgets/parity.json` requires and which OSMnx would supply; that is still
undone.

This is the first measured answer to the question [78](78-trying-compositions-on-isochrone.md)
asked: whether a composition of visible steps can do what the monolith does.
It can, and the parts are now separately inspectable — the junctions with their
travel times are a layer you can map, and so is the displacement from snapping.
It does **not** establish that the composition is easier to understand, which
is the claim that matters and still needs a practitioner, not a test.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: the ground along the reachable streets, including the part-way stop mid-block. Practitioners ask for it as "the area within ten minutes". Primitive, on the palette |
| **D2** | No. `buffer_area` buffers one study-area boundary and `buffer_point` buffers points; neither takes lines, and neither truncates anything |
| **D3** | See the table below |
| **D4** | Ports: points and network in, polygons out. The half-width is a parameter because it is a judgment about how far off a street counts as reached |
| **D4a** | A block with the same honest coupling as [83](83-reachable-junctions.md): the points must carry `networkNodeId`, `remainingM` and `travelDirection`. Output is ordinary polygons, so `map_output`, `clip_polygons`, `summarize_combined_area` and `summarize_polygons` all take it with no adapter |
| **D5** | Needs a metric CRS to buffer, because buffering in degrees is wrong by the cosine of the latitude. **That makes nine** |
| **D7** | `reachable_corridor`. Spatial operation |
| **D9** | **Internally measured, not parity-checked.** 3.8 parts per million against `isochrone` on a real network — but that is agreement with another widget in this repository, which is consistency, not independent evidence. `widgets/parity.json` requires a named external implementation and a result file in the validation lab, so no entry is claimed. OSMnx remains unchecked |
| **D10** | Not yet in a worked example. The Soho example still uses the monolith, and replacing it is the next question, not a side effect of this |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| The corridor is not the reachable streets | **Limitation.** The half-width is a claim that anywhere within it is reached, which includes the insides of buildings, locked yards and the far side of walls. Stated in every result, with the strip width spelled out |
| A street can be entered part-way | **Validation rule** in effect, and counted: `fw:partialSegmentCount`. This is what puts the edge of the time between junctions rather than at them |
| The corridor cannot contradict the traversal | **Hard stop.** The budget and direction arrive on the points. Junctions carrying two different directions are refused, not mixed |
| Points that are not reachable junctions | **Hard stop**, naming the step to add |
| Holes are kept | **Validation rule** in effect: nothing fills them. A gap inside a corridor is ground no street reaches, and filling it would assert reach where none was computed |
| A buffered corner is an approximation | **Limitation**, with the segment count stated: eight per quadrant, as `isochrone` uses |

## The 25 metres, and what is behind it

`edge_buff=25` in Advanced-1 NB03, in two call sites and the function default.
Unlike the 4.5 km/h walking speed, which [83](83-reachable-junctions.md)
traces to an assumption about 1854 Soho pedestrians, **no reasoning is recorded
for 25 metres anywhere in the three cholera repositories.** The first version of
the notebook's function also carries `node_buff=50`, then calls it with
`node_buff=0`, so isolated junctions contribute nothing.

So the corridor width is an undocumented convention, and the reached area scales
with it: at 25 m a 375 m corridor is a 50 m wide ribbon, and doubling the width
roughly doubles the area credited as reached. It is a parameter with a stated
meaning and a reported value, and that is as far as the evidence goes.

One judgment in the notebook is worth recording, because it bears on the
decomposition. Cell 62: *"plot isochrones as buffers to get more faithful
isochrones than convex hulls can offer"*. The authors hold the buffered corridor
to be the faithful product and the hull to be the coarser fallback, used only as
infill when the union comes out in pieces. That is why the corridor is the fifth
primitive and `summarize_hull` is not on the critical path.

## What this does not establish

That a corridor is a service area, or that 25 metres is right for anywhere. It
is the ground near the streets a graph says you can enter within a budget
derived from one speed. Nobody checked whether the streets exist, whether they
are passable, or whether anyone would walk them.
