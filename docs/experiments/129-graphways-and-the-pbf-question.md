# 129 · Graphways, and the question underneath it

_Created 2026-10-22 · Updated 2026-10-22_

**Status:** asked. Nothing is built and nothing is measured. This records what the library is, what
would have to be true for this application to use it, and the cheaper question it exposes.

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

## What would close it

For the first: one Geofabrik extract read in the browser, with the bytes, the parse time and the
resulting junction count written down beside the 300 MB Overpass figure for the same area.

For the second: `cargo build --target wasm32-unknown-unknown` against graphways 0.5.0, and if it
builds, one province graph loaded in a browser with its memory high-water mark measured. Until that
exists, it is a library that runs somewhere this application does not.

## What this does not establish

- **That Graphways works.** Nothing has been installed or run. Every figure above is the project's
  own claim, and no independent evidence was found.
- **That PBF is smaller here.** It is smaller in general and for the same bounds; nobody has read
  an extract for Ituri and weighed it against the 300 MB measured on 2026-10-21.
- **That a browser can hold a province graph at all.** 1,837,939 junctions downloaded, parsed and
  normalized once. It has never been drawn, routed over, snapped to or saved.
