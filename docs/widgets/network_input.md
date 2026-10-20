# Street network

_Created 2026-10-19 · Updated 2026-10-19_

**An input widget.** It supplies the streets that walking-distance work is measured along: a graph
of points joined by segments, each with a length.

## What it does

It gives the workflow a walkable street network, either downloaded from OpenStreetMap for your
study area or uploaded from a file you prepared elsewhere.

A downloaded network keeps the ways people can walk on — residential streets, footways, paths,
steps, tracks, service roads and the ordinary road classes — and leaves out anything tagged as
closed to pedestrians. Each way becomes a run of segments between the points it was drawn with.

**Graph limit.** The limit counts every point in the graph, including each bend a street was drawn
with, not only the places two streets meet. A town can hold three points for every real
intersection and a road following a coastline can hold seventeen, so the same limit allows very
different amounts of street in different places. The download size allowed follows this number, so
raising it raises what can be fetched.

## What you connect

It takes an `area` — the study area that says where to download — and emits a `network`, which the
isochrone, the junction reachability step, the corridor and the snapping step all accept. A map can
draw one directly.

## How to use it

1. Connect a **Study area**, then open the Street network node.
2. Leave **Input method** on *Download from OpenStreetMap*, or switch to upload if you have a file.
3. Press **Check endpoint status** if you want to know what the servers can do right now: it reports
   free slots and, when there are none, when the next one frees.
4. Press **Download and save OSM network**. This is a separate action — running the workflow does
   not start a download.
5. If the area is large or the streets dense, raise the graph limit and download again.

Downloads are paced: one at a time, with a pause afterwards that grows with the size of what you
received. A busy server is waited for rather than treated as a failure. A network you have already
downloaded is kept, so asking the same question again costs no request at all.

## What it will not do

It does not download while you run the workflow. Acquisition is always something you ask for.

It does not guess your area. Without a connected study area there is nothing to bound the request.

It is a walking network. Distances along it are walking distances, and a network downloaded today
describes the streets today, not the streets of whatever period your data comes from.

## Worked examples that use it

**John Snow network isochrones**, in the 1854 Cholera Outbreak in London project, uses a prepared
Soho network to draw what each pump could be reached from on foot.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/network_input.md](../widget-specs/network_input.md).*
