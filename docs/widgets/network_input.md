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

It downloads one travel mode at a time. Choose walking or driving before you download, because the
two are different graphs and not two labels on one:

| | Walking keeps | Driving keeps |
| --- | --- | --- |
| Footways, paths, steps, pedestrian ways | yes | no |
| Motorways, trunk roads and their slip roads | no | yes |
| Ordinary streets — residential, unclassified, tertiary to primary | yes | yes |
| One-way restrictions it obeys | the ones that apply on foot | vehicle one-ways, and roundabouts |

A saved graph keeps the mode it was downloaded for, and the widget says which. To change mode,
change it here and download again: the new graph replaces the old one. A widget further down the
workflow that asks for a mode this graph cannot carry refuses the run and says so, rather than
reporting minutes for a journey the streets do not support.

Distances along it are distances on those streets, and a network downloaded today describes the
streets today, not the streets of whatever period your data comes from.

Before anything large is downloaded, the widget asks the service **how much is there**. Overpass
answers that question directly, and an area holding more street data than this widget can take is
refused with the number — after one cheap request rather than after several large ones that fail.
An area so large that the service will not even count it is refused the same way, because that is
what a public instance says when an area is beyond what it will process.

A saved network is kept beside the workflow rather than inside it, in the larger store your
browser offers, so the size of a graph is no longer limited by what a workflow may hold. If that
store is unavailable — private browsing, for instance — the application says "small store only"
when it saves, and a large network may then be refused.

A driving graph carries no speed limits, no junction delay and no congestion. Travel time over it
is one speed applied to every street, which is the same model walking uses and a weaker one for a
car.

## Worked examples that use it

**John Snow network isochrones**, in the 1854 Cholera Outbreak in London project, uses a prepared
Soho network to draw what each pump could be reached from on foot.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/network_input.md](../widget-specs/network_input.md).*
