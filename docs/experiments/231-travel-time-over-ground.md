# 231 · Travel time over ground, where the streets are not the way people move

_Created 2026-11-24 · Updated 2026-11-24_

**Status:** tried. Built 2026-11-24 as Travel time over ground 0.1.0: it reads a friction surface, the places a walk
starts from and the places to answer for, and writes the minutes to the nearest starting point onto each of those
places. Unit tested 8 of 8 on Node, 3 of 3 in the browser on Chromium. **Not yet in a worked example** — the Nigeria
microplanning example is its intended first use and is not built, so the widget is at zero usage. Its name is
awaiting the practitioner's review. It has never been run against a published friction surface.

## The question

Fieldwork can already answer "how far can somebody get" along streets: **Street network** → **Snap to street
network** → **Reachable junctions** → **Travel time band** or **Reachable corridor**. That chain is the right
model where the streets are how people move and the network is published.

It is the wrong model for a campaign microplan in northern Nigeria. Most of the walk to a settlement is not on
a mapped road, so a street network answers a question nobody asked and answers it over a graph that stops where
OpenStreetMap stops. It is also the expensive model there: GRID3's Nigeria roads are CC BY-SA, so anything derived
from them carries share-alike into a worked example this project wants to keep CC BY.

The published alternative is a **friction surface**: a raster whose cell value is the cost of crossing one metre of
that cell. The Malaria Atlas Project publishes a global walking-only friction surface at about 1 km under CC BY 4.0.
The question this record answers is whether reading one is a widget, and if so which one.

## What exists (inventory, by input and output)

| Widget | In | Out | Could it answer travel time over ground? |
| --- | --- | --- | --- |
| Reachable junctions | sites, a network | points | cheapest path over street lengths at one constant speed. Needs a network; answers at junctions, not at settlements |
| Travel time band | reached junctions | points | narrows an existing answer; computes no travel of its own |
| Reachable corridor | reached junctions, a network | polygons | the strip of ground along the streets; still the streets |
| Snap to street network | sites, a network | points | attaches a site to a junction. Nothing to attach to here |
| Sample a raster at points or over areas | points, areas, a raster | points | reads the cell a point sits in. A friction surface read that way gives the cost of the ground **under the settlement**, which is not a travel time to anywhere |
| Clip raster | an area, a raster | raster | windows the surface, which is what keeps a pass inside the cap |

**Found:** nothing accumulates cost across cells. Every raster step in the tree reads cells independently of each
other; this one is the first whose answer at a cell depends on its neighbours.

## Chosen: one widget, Travel time over ground

### Admission review (D1–D10)

| | |
| --- | --- |
| **D1** | Decomposes into: find the cell each origin stands in; accumulate cost cell to cell; read the accumulated cost at each place. The residual distinction is the accumulation — a cost that depends on the path taken to a cell, which no existing raster step has. **Primitive**, on the palette under Spatial operations: a practitioner asks for "how long does it take to walk to the clinic" by name. |
| **D2** | Reachable junctions is the same algorithm over a different space: a published graph of streets against a published grid of ground. Its cost is one constant speed over supplied lengths; this one's is a per-cell cost read from a file. They are not the same operation and neither reduces to the other. Sample a raster reads one cell and cannot accumulate. |
| **D3** | A travel time is not a route: **limitation**, stated on every result — nobody walks the line the grid implies. A friction surface is not a street network: **hard stop** by port type (`raster`, not `network`). An origin outside the surface, or on a cell with no usable friction, cannot start a walk: **run-time check**, named in `originsSkipped`. A place the walk does not reach: **run-time check**, carried with `minutes: null` and the reason, never dropped and never given a large number. A surface larger than one pass crosses: **run-time check**, refused in words with the figure. The grid is read as EPSG:4326: **validation rule** on the raster contract, which is what licenses computing metres per row from the latitude. |
| **D4** | The port types decide what connects. The attribute name and the optional ceiling are chosen in Configure…; an unconfigured step is a valid draft that writes `minutes`. |
| **D5** | The ceiling, where one is set, lives on the step. There is no speed to choose: the surface states the cost of the ground, which is the point of using one. |
| **D6** | Raster input (MAP friction, clipped to the LGA) → Travel time over ground, with Find health facilities as the origins and GRID3 settlements as the places → Map, marks scaled by minutes; and → Table, for the settlements past 60 minutes. |
| **D7** | *Travel time over ground*; ports `friction` (raster), `origins` (points) and `places` (points) in; `points` out. |
| **D8** | Unit tests (8, passing): zero on the origin; one cell east at a known friction; nearest of several origins in one pass; cheap ground against dear; a no-data wall leaving a place unreached with its reason; an origin on no-data named rather than dropped; the ceiling leaving a place unreached rather than numbered; the cell cap refused with its figure. Browser tests: a run on the canvas, and the Inspector's preview. |
| **D9** | One step where the alternative was a street network that does not describe the walk. |
| **D10** | **None yet.** The Nigeria microplanning example is the intended first use and is not built. |

### Why it answers at points and not as a raster

`RasterGrid` carries the `asset` of the file it came from — its sha256, its bytes, its filename — and `clipRaster`
passes that asset through unchanged, because a clip is still those bytes read over a smaller window. A computed
surface has no file. Returning one would mean carrying the friction raster's digest while the values are no longer
what those bytes produce: a claim in the evidence that does not hold.

So the walk answers at the places asked about. Those places compose with everything that takes points — Map, Table,
Select rows, Total within groups — which is what a microplan needs anyway, because a microplan is a list of
settlements and not a picture of a surface.

## The cell limit, measured

The limit was measured twice, and the first reading was wrong in a way worth recording.

The first implementation found the next-cheapest cell by scanning the queue, which is O(n) a step and makes the whole
pass quadratic. On a 250,000-cell grid that scan was 94% of the time. A cap measured against it would have been a
limit on the queue, not on the ground. The queue is now an ordinary binary heap over two typed arrays, and the
limit was measured again.

Measured 2026-11-24, Chromium on the practitioner's laptop, 12 origins, friction varying cell to cell:

| Cells | Chromium | Node 22 | Minutes array |
| --- | --- | --- | --- |
| 10,000 | 5 ms | — | 0.1 MB |
| 250,000 | 71 ms | — | 2 MB |
| 1,000,000 | 274 ms | 0.30 s | 8 MB |
| 2,250,000 | 555 ms | 0.69 s | 18 MB |
| 4,000,000 | 985 ms | 1.24 s | 32 MB |
| 9,000,000 | — | 2.77 s | 72 MB |
| 16,000,000 | — | 5.12 s | 128 MB |
| 25,000,000 | — | 8.00 s | 200 MB |
| 49,000,000 | — | 16.01 s | 392 MB |

**Found:** the cost is linear in the cells and there is no cliff in it — about 0.25 microseconds a cell in Chromium,
slightly faster than Node. So time is not what binds. What binds is memory: the walk keeps one 8-byte minute per
cell beside the raster's own values, in one browser tab on an ordinary laptop.

`MAX_FRICTION_CELLS` is therefore **16,000,000** — 128 MB of minutes and about four seconds. For scale, at the
Malaria Atlas Project's resolution a Nigerian LGA is a few thousand cells, all of Nigeria about 924,000, and the
whole of sub-Saharan Africa about 24 million, which is past the cap and is what Clip raster is for.

## What this does not establish

The walk has never been run against a real friction surface: every number above is from a synthetic grid, and no
MAP file has been downloaded. Whether the minutes it reports resemble the time a real walk takes in northern
Nigeria is not tested here and is not a question unit tests can answer — it is a question for the worked example and
for whoever knows the ground. The browser timings are Chromium only. The widget has no usage: no example
instantiates it yet.
