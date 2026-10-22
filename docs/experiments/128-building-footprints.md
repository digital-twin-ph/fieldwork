# 128 · Building footprints

_Created 2026-10-21 · Updated 2026-10-21_

**Status:** asked. Nothing is built, and nothing has been downloaded. This records a direction and
what it would have to answer, so the work is chosen from a ledger rather than from memory.

## What was asked

The practitioner, 2026-10-21, immediately after the graph-limit ceiling was raised so a province
could be attempted at all:

> *"We have not even downloaded building footprints yet. And that should be an upcoming widget."*

Two statements. The second is a direction — a widget that acquires building footprints. The first
is the more pointed one, and it belongs with [experiment 125](125-caps-below-the-limit-we-are-testing.md):
footprints are the heaviest vector data this application could plausibly ask for, and the project
has never tried. Every limit it would meet is currently a guess.

## Why this is the limit test, not another source

A street network is topology: junctions and segments, measured here at 270 bytes per junction. A
building layer is polygons, and there is one per building rather than one per intersection. For the
same extent the feature count is the question, and nothing in this repository has measured it. The
numbers that exist are for streets: 7.39 MB and 50,791 features over the isochrone extent, which is
a neighbourhood. A province of footprints is a different order and nobody here knows which one.

So this widget is not simply another acquisition. It is the first thing that would make the
application's real ceiling visible: the response size, the parse, the payload store, the renderer's
feature count, and whether a map in a browser draws a quarter of a million polygons at all.

## What it would have to answer

- **Which source, and is the source a setting?** Find health facilities already treats "ask
  OpenStreetMap / ask Overture / ask HDX" as a setting a template keeps. The same shape applies
  here. The candidates to check — none of them verified in this repository yet — are OpenStreetMap
  via Overpass, Overture Maps buildings, the Google–Microsoft open-buildings releases, and HDX
  country exports. Coverage differs by source and by country, and the DRC is exactly the case where
  that difference decides whether the widget is usable; that is a measurement to make, not a claim
  to repeat.
- **What a footprint IS, downstream.** Polygons with attributes is the easy answer and the wrong
  place to stop: a footprint used as a denominator, a settlement mask, or a point-in-polygon
  subject is three different ports. What already exists — Clip points to area, Summarize points to
  polygon, Zone — would take them unchanged if the output is an ordinary polygon layer.
- **What its provenance record says.** Every acquiring widget here carries a retrieval record and
  refuses to hold records without one. An ML-derived footprint layer has a confidence per building
  and a model version; those are provenance, and dropping them would make the layer look like
  surveyed data.
- **What it costs, and where that is refused.** The street-network widget derives its byte cap from
  a measured bytes-per-junction. The equivalent number for footprints does not exist. Until one is
  measured the cap should be stated as underived rather than invented, which is the finding of
  experiment 125 applied before the fact instead of after.
- **Whether the widget budget admits it.** `widgets/budget.json` stands at 46 live against a target
  of 41, and experiment 64 names the retirements that would close the gap. A new widget is not
  free, and this one should be weighed against that target rather than added beside it.

## What this does not establish

- **That footprints can be downloaded at all in this application.** Nothing has been attempted. The
  sizes above are for street data, and the feature counts for buildings are unknown here.
- **Which source is right.** Four are named as candidates because they exist, not because their
  coverage, licence or terms have been read for this use.
- **That the application can draw what it would acquire.** The map has never been given a layer of
  this size, and the renderer's limit is as unmeasured as the download's.

## What would close it

A single extent downloaded, measured and written down: the source, the response size, the feature
count, the parse time, whether the payload store kept it, and whether the map drew it. One
neighbourhood first, because the point of the measurement is the slope — and then the province that
started this, which is the one the practitioner actually wants.
