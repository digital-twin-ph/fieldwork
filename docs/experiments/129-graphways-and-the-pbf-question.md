# 129 · Graphways, and the question underneath it

_Created 2026-10-22 · Updated 2026-10-22_

**Status:** tried — both halves. Graphways' Rust core runs in WebAssembly and builds a province
graph from a country extract; Ituri fits in driving mode and does not fit in walking. The input
half. A published OSM extract is read in both browsers this project
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

## The second half: Graphways in WebAssembly, 2026-10-22

The practitioner asked for the engine to be swapped so a province could be tested. The feasibility
questions were answered first, because each could have ended it.

**It compiles.** `cargo build --target wasm32-unknown-unknown --no-default-features` against the
git `main` (bf2184f, which calls itself 0.5.0 although crates.io publishes only 0.4.0) builds
clean. Dropping the default `network` feature drops `reqwest` and `tokio`.

**Rayon runs.** This was the expected blocker: `rayon` 1.8 is a thread pool, wasm32 has no threads,
and the usual remedy is SharedArrayBuffer behind COOP/COEP headers, which an offline static
application cannot guarantee. A probe exporting `(0..1000).into_par_iter().sum()` returns **499500**
inside the module. It does not panic; it falls back.

The patch, the probe crate and both runners are kept at
[`docs/spikes/129-graphways-wasm/`](../spikes/129-graphways-wasm/README.md); nothing there is built
by `npm run check` or imported by the application.

**It reads an extract from memory, once it is asked to.** Every PBF entry takes a `Path`, and
wasm32 has no filesystem. `osmpbf::BlobReader` is already generic over `Read + Send`, so a fork adds
`read_pbf_bytes` feeding it a `Cursor` — about ten lines, no change to the scan itself.

| extract | file | mode | junctions | time | wasm memory |
|---|---|---|---|---|---|
| Andorra | 3.5 MB | walk | 145,690 | 0.4 s | 92 MB |
| Rwanda | 68.2 MB | walk | 3,795,541 | 12.7 s | 2,102 MB |
| Rwanda, province-sized bbox | 68.2 MB | walk | 1,425,531 | 6.5 s | 1,438 MB |
| **DRC, Ituri bbox** | **416.3 MB** | **drive** | **1,152,974** | **23.7 s** | **3,587 MB** |
| DRC, Ituri bbox | 416.3 MB | walk | — | — | **out of memory** |

Rwanda cross-validates the reader written for the first half: 3,795,541 against 3,795,630, the
difference being graphways' `Walk` filter against this project's walking filter.

**Ituri is built, in driving mode, by a Rust engine inside a browser's WebAssembly.** 1,152,974
junctions in 23.7 seconds from a published country file. In walking mode the same box fails with
`RuntimeError: unreachable` at `raw_vec::handle_error` — an allocation refused at the 4 GB wasm32
ceiling, with 3,587 MB already in use for the lighter mode.

**So the mode is not a preference at this scale, it is the difference between a graph and a crash.**
The ADM1 default added on 2026-10-21 was argued from download size and from what a province is for.
It turns out to be load-bearing for a reason nobody had measured: walking does not fit.

**The bbox is applied during the parse**, not after: nodes outside the study area are dropped as
they are decoded. On Rwanda that is a third of the memory and half the time. Without it a country
cannot be held at all — Rwanda alone is 2.1 GB of the 4 GB available, and the DRC is six times
Rwanda's file size.

**What is still wasteful.** The whole 416 MB file is copied into wasm memory before the scan
begins, which is 12% of the ceiling spent on bytes that are read once and sequentially. Feeding the
module blob by blob would return most of that, and is the obvious next economy.

## The file belongs on the computer, 2026-10-22

Said while the DRC extract was being weighed:

> *"Perhaps for large downloads we should offer the user download to computer so the whole country
> is available when needed and no need to re-download a whole country again just to get provinces?"*

That is the shape the measurements point at. Geofabrik publishes **no province extracts for the
DRC**, so the file for Ituri is the whole country, and the same 416 MB serves North Kivu, Ituri and
every workflow after them. Fetching it once per province would be absurd; keeping it in the browser
is impossible — 416 MB against a 5.2 MB workspace store, and even the large store would be holding
a copy of a file that already exists on disk.

So the file stays on the practitioner's computer and this application reads it where it is: a file
picker for the extract, the study area's bbox applied during the parse, and only the resulting graph
kept. Nothing is re-downloaded, nothing is duplicated, and an extract downloaded once works offline
forever after — which is what this project claims to be for.

The extracts these measurements were taken from are kept at `~/Downloads/drc.osm.pbf` (397 MB, OSM
data to 2026-10-21), `rwanda.osm.pbf` and `andorra.osm.pbf`, deliberately outside the repository:
they are published files that Geofabrik already hosts, under ODbL, and a copy in git would be a
copy forever. They are where a file picker would find them, which is the point of the direction.

Two things to check before building it. Chromium's File System Access API can keep a handle with
permission across sessions, so "choose it once" is possible there; WebKit has no such API, and a
plain `<input type="file">` means choosing the file again each session, which is a different
experience in each engine and must be said rather than papered over. And the 416 MB is currently
copied into wasm memory whole; reading it blob by blob from the file would return most of that
12% of the ceiling.

## Spike 1: the graph leaves WebAssembly, 2026-10-22

The engine building a graph is not the engine being usable. What crosses the boundary, and what it
costs to turn it into the shape this application's widgets read, is the step that could still end
the approach. Measured on the DRC extract with Ituri's bbox, driving mode, in **both** test
browsers.

The module now exports `(osm id, lon, lat)` per junction and `(from index, to index, metres)` per
directed segment as flat `f64` buffers, and lets the graph go once they are written. Flat on
purpose: one JS object per junction is the thing being measured, so the module must not impose one.

| | Chromium | WebKit |
|---|---|---|
| build the graph | 19.5 s | 17.1 s |
| wasm memory after the build | 3,587 MB | 3,587 MB |
| export both buffers | < 0.1 s | < 0.1 s |
| copy them out of wasm | < 0.1 s | < 0.1 s |
| the buffers themselves | **85 MB** | 85 MB |
| build 1,152,974 nodes and 2,376,576 edges as objects | **0.6 s** | **0.2 s** |
| JS heap, typed arrays only | 544 MB | not reported |
| JS heap, after the objects | **932 MB** | not reported |

**It crosses, and the crossing is nearly free.** 10.6 million doubles move out of wasm in under a
tenth of a second, and the whole graph is 85 MB as typed arrays. Turning it into the objects
`Network` is defined with — `{id, coordinates}` and `{from, to, lengthM}` — costs 0.6 seconds and
**388 MB of JS heap** on top. A sample survives the trip intact: `osm-87737350` at
`[29.4450981, 0.4995544]`, and a 95.1 m segment between two junctions.

**So the wall is not where it was expected.** It is not the export, and it is not object-building
time. It is that the tab holds **3,587 MB of wasm and 932 MB of JS at once**, about 4.5 GB, for one
province in the mode that fits. Three economies are visible and none is built: the 416 MB extract
is copied into wasm whole rather than fed blob by blob; the extract's JS `ArrayBuffer` is still
alive after that copy; and `Network` could hold typed arrays rather than objects, which is 85 MB
instead of 473 MB and a change to every widget that reads a network.

**WebKit matched Chromium throughout** and built the objects three times faster. It reports no
`performance.memory`, so the heap column is empty there rather than guessed.

## Spike 2 and 3: through this application's machinery, 2026-10-22

The same Ituri graph — 1,152,974 junctions, 2,376,576 directed segments — handed to the code that
already exists here. Chromium.

| step | seconds | outcome |
|---|---|---|
| `validateNetwork` | **1.0** | accepted |
| `payloadDigest` (`JSON.stringify` + SHA-256) | **0.9** | `f5d57197e1bb` |
| **the payload store, as this application writes it** | **> 720** | never returned |

The first two are the surprise: the validator walks 1.15 million nodes into a set and checks 2.38
million edges against it in a second, and the whole graph serializes and hashes in under one. The
size refusals removed on 2026-10-21 were the only thing standing between this application and a
province; nothing else in that path objects.

**The store is where it dies, and the reason is the representation.** IndexedDB keeps a value by
the structured clone algorithm, which walks the object graph: `Network` is `{id, coordinates}` per
junction and `{from, to, lengthM}` per segment, so the clone visits **3,529,550 objects**. The 85 MB
of actual numbers is beside the point; the object count is the cost.

Four ways to keep the same graph, measured against each other:

| | write | read |
|---|---|---|
| **A** · typed arrays in IndexedDB | **0.2 s** | 0.1 s |
| **B** · one packed `Blob` in IndexedDB | **< 0.1 s** | < 0.1 s |
| **C** · one file in the origin private file system | **0.1 s** | < 0.1 s |
| **D** · the objects this application uses today | **> 300 s, abandoned** | — |

Eighty-five megabytes move in under a second by any of the three; the current shape does not finish
in five minutes. OPFS is available in both engines and needs no clone at all. A `Blob` is written
out of line and read back as a file.

**So this is not a storage problem.** `Network` became three and a half million objects when a
graph was five thousand junctions, and the choice has been invisible ever since. Changing it to
typed arrays fixes the write, the 388 MB of object heap and the digest together — and costs every
widget that reads a network: the snap, the isochrone, the edges, the preview. That is the next
decision, and it is about this application rather than about Graphways.

## Spike 4: ask the graph instead of handing it over, 2026-10-22

Spikes 2 and 3 showed the cost is in moving a province graph into JavaScript and keeping it there.
This asks whether it has to move at all. Four exports on the probe — `snap_points`, `isochrone`,
`travel_matrix`, and a buffer for the answers — against APIs the crate already has. The graph stays
in the module; only answers cross, a few hundred doubles at a time.

| question | Chromium | WebKit | answer |
|---|---|---|---|
| build the graph | 19.9 s | 18.2 s | 1,152,974 junctions |
| snap 200 sites, 2 km limit | **< 0.01 s** | 0.01 s | 63 on the network, farthest 1,807 m |
| **one 15-minute isochrone** | **0.14 s** | **0.09 s** | a 74-point ring |
| 5 × 20 travel-time matrix | 1.07 s | 0.95 s | 10 of 100 pairs reachable |

**The isochrone is the result.** This application's own implementation is guarded at 2,000
junctions and was measured exhausting a 4 GB heap at 5,249; the message it raises says so. Here one
is drawn over **1,152,974** junctions in **0.14 seconds**, in both engines, with the JS heap holding
no graph at all — the 460 MB Chromium reports is the extract's own `ArrayBuffer`, still alive from
the download.

So the architecture question has an answer. Leaving the graph in WebAssembly and asking it
questions avoids the clone, the object heap and the store together, and brings a capability this
application does not have at any size it cares about. Making `Network` typed arrays would fix the
same three costs and bring nothing new.

**Two numbers in that table need explaining before anyone leans on them.** Only **63 of 200** points
snapped within 2 km, which is what a regular grid over a province does: it lands in forest, on
water, and between roads. And only **10 of 100** origin–destination pairs were reachable, which
says the driving graph of Ituri is not one connected component — or that the grid points snapped
onto isolated stubs. Either is a finding about the data and neither has been looked into. A routing
claim made on this would be wrong.

## What 10 of 100 meant, 2026-10-22

It meant **10 of 10**. Of the 25 grid points the matrix was given, **2 of the 5 origins and 5 of the
20 destinations snapped to a road within 2 km**, so at most ten pairs could have routed, and all ten
did. The other ninety were pairs in which at least one point was not on the network at all.

| | pairs reachable | seconds |
|---|---|---|
| 25 grid points over the province | 10 of 100, **all 10 that could** | 1.1 |
| 25 points taken from the graph itself | **100 of 100** | 2.7 |
| 25 junctions clustered in one corner | **100 of 100**, longest 79 minutes | 2.5 |

So Ituri's driving network is **not** fragmented, and nothing about it was being reported. The
figure was an artefact of dropping a regular grid on a province — forest, water and the gaps
between roads — compounded by a counter of mine that could not tell "no route" from "never reached
the network".

That distinction is one this application already draws and had good reason to: a site too far from
any road is an `OffNetworkSite` and a site that reaches nothing in the budget is an
`UnconnectedSite`, each reported separately, because they are different findings about access.
A spike that collapsed them produced a sentence about a road network from a fact about where points
were put, which is exactly the error the two types exist to prevent.

## Spike 6: Soho, both engines, 2026-10-22

The isochrone this project already ships, computed twice from the Broad Street pump at
`[-0.136668, 51.513341]`. The engine's walking speed was set to the example's own 75 m/min
(4.5 km/h) rather than its 5 km/h default, so the comparison is not about kilometres per hour.

| minutes | this application · 738 junctions | Graphways · 29,777 junctions |
|---|---|---|
| 1 | 7,381 m² · 0.04 s | **8,721 m²** · < 0.01 s |
| 5 | 164,677 m² · 0.33 s | **251,993 m²** · < 0.01 s |
| 10 | 681,266 m² · 1.43 s | **1,064,944 m²** · < 0.01 s |
| 15 | 899,461 m² · 1.62 s | **2,530,999 m²** · 0.01 s |

Graphways built Soho from the 124 MB Greater London extract in 4.4 s, holding 1,068 MB.

**At one minute they agree** — 7,381 against 8,721 m², eighteen per cent apart on an area a few
streets across. **By fifteen they do not**, and the reason is not the algorithm: this application's
example ships a curated 738-junction network covering Soho, so a fifteen-minute walk reaches the
edge of the graph and stops. The widget says so already — *"Graph extent may truncate coverage"* —
and here is that sentence as a number: 899,461 m² against 2,530,999 on a graph that does not end.
The 25 m corridor and the hole-filling this application adds, which Graphways does not, push the
other way and are the likeliest reason it is the larger of the two at one minute.

**The timings are the other half.** 1.6 seconds over 738 junctions against a hundredth of a second
over 29,777 — three orders of magnitude of headroom in an operation this project currently caps at
2,000 junctions on a measured 4 GB failure.

**What this is not.** Not a validation: two engines agreeing or disagreeing on an area says nothing
about which matches a walk in 1854 Soho, and the notebook this example adapts is a third answer
again. It establishes that the two are computing the same kind of thing at the same scale, and that
the difference at large budgets is the extent of a graph rather than a disagreement about walking.

## Spike 7: where the 4 GB goes, 2026-10-22

*"Will we still have the same 4 GB failure?"* Yes — it is wasm32's address space, not a setting —
and the measurement says where it goes and which of the obvious savings is not one.

**Ituri, driving, the extract already in memory:**

| stage | wasm memory | what it added |
|---|---|---|
| the extract copied in | 417 MB | the 416 MB file |
| the scan alone (`read_pbf_bytes`, no graph) | **2,264 MB** | **+1,847 MB** of intermediate |
| the graph built from it | **3,587 MB** | **+1,323 MB** |

So the file is 12% of the ceiling and the other 88% is the two stages between the file and the
graph. Both halves are roughly equal, and the peak is the sum: the intermediate `OsmData` is still
alive while the graph is being built from it.

**The obvious saving is not one.** Every spike before this passed `retain_all = true`, which keeps
every OSM node instead of merging nearby intersections and collapsing chains. Passing `false`:

| | junctions | wasm memory |
|---|---|---|
| `retain_all = true` | 1,152,974 | 3,587 MB |
| `retain_all = false` | **122,061** | **3,587 MB** |

A graph **9.4 times smaller, at exactly the same peak**, because simplification happens after the
expensive part. It is still the right setting — 122,061 junctions is a graph this application could
plausibly hold in its own structures, where 1,152,974 is not — but it buys nothing against the
ceiling.

**Walking still fails, and fails in the build.** At half the province the scan completes at
1,255 MB with 553,001 nodes and the graph construction then traps. Driving at the full province
scans 1,152,974 nodes and builds. So the walking filter's cost is in construction rather than in
reading, which is a fact about how many ways per node a walking network has; nothing here has
looked into why.

**What is left to take, in order of size.** Feeding the module blob by blob instead of copying the
extract whole returns 417 MB. Freeing the intermediate as the graph consumes it would cut the 1,323
MB overlap. Slimming the intermediate itself — it carries owned tag strings per way — is the
largest and the most invasive, since it is graphways' own shape. Together they are most of 2 GB,
and none is built.

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
- **That fieldwork can USE the graph.** It validates, hashes, and can be written and read back as
  typed arrays, a blob or a file. Nothing has drawn it, snapped to it or routed over it, and the
  isochrone still refuses graphs this size by its own measured guard.
- **That routing over this graph is sound.** Every pair whose endpoints were on the network routed,
  across the province and within one corner of it. Nothing has checked a route against ground
  truth, and travel times depend on a speed profile nobody here has read.
- **That the sites are real.** The 200 points are a grid over the bbox, not Ituri's health
  facilities. The snap and matrix figures are about the graph's shape, not about access to care.
- **That A, B or C is the right one.** Three ways each move 85 MB in under a second; which belongs
  in this application depends on what else must hold the graph, which is unmeasured. The timings
  are one run each on one machine, in one engine.
- **That the savings above are achievable.** They are read off where the memory went, not
  prototyped. Streaming the extract through `BlobReader` may cost time it does not currently cost,
  and freeing the intermediate early may not be possible without changing graphways' own flow.
- **That 4.5 GB in a tab is acceptable.** It completed on this machine in both engines. What
  happens on a laptop with less memory, or beside other tabs, is unmeasured, and wasm memory never
  shrinks: the module holds 3,587 MB until it is discarded entirely.
- **That the fork is sound.** `read_pbf_bytes` and the bbox filter are ten-line changes written for
  a measurement, not reviewed against the crate's own tests.
- **That a browser can hold a province graph at all.** 1,837,939 junctions downloaded, parsed and
  normalized once. It has never been drawn, routed over, snapped to or saved.
