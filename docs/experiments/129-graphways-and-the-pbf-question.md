# 129 · Graphways, and the question underneath it

_Created 2026-10-22 · Updated 2026-10-22_

**Status:** tried — the input half. A published OSM extract is read in both browsers this project
tests, with no dependency, and weighed below. The compute half is untouched: nothing of Graphways
has been installed, built or run.

## What was asked

The practitioner, 2026-10-22, after a province's street network downloaded at 300 MB and then met
four separate refusals:

> *"Let's look at graphways as an alternative to download and compute street networks."*

## What it is, from its own documentation

[Graphways](https://github.com/kyleloving/graphways) is a Python library with a Rust core, MIT
licensed, for routing and reachability on OpenStreetMap road networks. It builds a reusable
`SpatialGraph` once and queries it in process, with no routing server. It reads **OSM PBF files**
(`from_pbf`, stated as fully offline), Overpass or OSM XML, or a place name through public Overpass
and Nominatim. It computes isochrones as multipolygons, point-to-point routes, reachability,
many-to-many travel-time and distance matrices, accessibility scores, network-time prisms and GTFS
public transport, and exports GeoJSON. A Rust crate is published at 0.5.0.

Its README claims a million matrix cells in about 0.1 seconds on a city graph, routing well under a
millisecond once contraction hierarchies are prepared, and GTFS results within about 4% of r5's
median travel times on Munich. **Those are the project's own figures.** A search found no
independent review, benchmark or adoption record, and the repository's Releases section is empty.
Nothing here has been run.

## The two questions, which are separable

**1. The input format, which is the cheap one.** Graphways reads PBF. This application reads
Overpass JSON, and that is the whole of the practitioner's week: a province is 300 MB of JSON from a
donated public service, paid for in full on every attempt, with a count request standing in for a
size nobody can know in advance. A Geofabrik extract is a file — downloaded once, from a service
that publishes files for exactly this purpose, in a format designed to be compact. Reading PBF is a
parser, not an engine, and it would not need Graphways at all.

**2. The compute engine, which is the expensive one.** This application is a browser with no server
and no Python. A Rust crate is not a browser library: the documentation states no wasm32 target and
no browser use. Compiling it is plausible and unproven, and the things that make it fast — threads,
contraction hierarchies held in memory — are the things that are hardest in a 4 GB wasm32 address
space at province scale. Adopting it would also replace what this project has built and measured:
the isochrone, the snap, the reachable-node walk and the travel-time bands.

## The first half, measured 2026-10-22

A PBF reader written against `DecompressionStream` and typed arrays only — no library, because the
question is what the platform can do unaided — run inside the application's own test browsers.

| extract | file | walkable ways | junctions | fetch | ways pass | nodes pass | heap |
|---|---|---|---|---|---|---|---|
| Andorra | **3.49 MB** | 8,826 | **151,523** | 96 ms | 157 ms | 176 ms | 92 MB |
| Rwanda | **68.2 MB** | 174,424 | **3,795,630** | 1.4 s | 3.1 s | 5.7 s | 894 MB |

Chromium figures; WebKit is within a second of them on both (Andorra 122/211/162 ms, Rwanda
2.3 s/2.9 s/4.3 s) and reports no heap. Two passes: the first keeps the ways whose `highway` tag is
in the walking filter and collects their node references, the second places those nodes.

**What that is beside the Overpass path.** Rwanda's walking network is **3,795,630 junctions —
twice the size of the Ituri graph that cost 300 MB of Overpass JSON** — and it came out of a 68 MB
file in 8.7 seconds in a browser. Per junction: **18 bytes** for Rwanda and 23 for Andorra, against
the **163 bytes per junction** measured on the Ituri response (300 MB over 1,837,939). Seven to nine
times smaller, in a file that also carries every building, boundary and landuse in the country,
while the Overpass figure is one filtered layer.

At the project's own measured 150 bytes per element, the same two areas as Overpass JSON would be
about 24 MB for Andorra and **596 MB for Rwanda** — the second being a request this application
could not make and the service would be unlikely to answer. That comparison is a **projection**: a
direct measurement was attempted and overpass-api.de refused it twice (HTTP 406, then 502), and two
refusals from a donated service is where asking stops.

**What it costs in memory.** 894 MB of heap for 3.8 million junctions is about 235 bytes each, so
Ituri's 1.84 million would be roughly 430 MB. That is affordable and it is not nothing, and it is
measured on a graph held whole with no clipping to the study area — which is the obvious next
economy, since a province is a fraction of a country.

**What this does not touch.** The country extract for the DRC is 397 MB and no province extracts are
published, so the file a practitioner would fetch for Ituri is the whole country. 397 MB downloaded
once, cached offline, serving every province and every future workflow, against 300 MB per province
per attempt from a service that may refuse — but nobody has downloaded it, parsed it, or measured
what clipping it to a province costs.

## What would close it

For the first, now done for Andorra and Rwanda: what remains is the DRC's own 397 MB extract,
parsed with a study-area bbox applied during the parse rather than after, and the memory that
saves.

For the second: `cargo build --target wasm32-unknown-unknown` against graphways 0.5.0, and if it
builds, one province graph loaded in a browser with its memory high-water mark measured. Until that
exists, it is a library that runs somewhere this application does not.

## What this does not establish

- **That Graphways works.** Nothing has been installed or run. Every figure above is the project's
  own claim, and no independent evidence was found.
- **That PBF is smaller for Ituri.** It is 7 to 9 times smaller per junction on two extracts that
  are not the DRC, against a per-junction rate measured once on Ituri. The DRC's extract has not
  been read.
- **That the browser can hold a province graph as a NETWORK.** It holds 3.8 million junctions as a
  map of coordinates. Building edges, snapping, routing and drawing are all still untried at that
  size, and the 894 MB is before any of them.
- **That a browser can hold a province graph at all.** 1,837,939 junctions downloaded, parsed and
  normalized once. It has never been drawn, routed over, snapped to or saved.
