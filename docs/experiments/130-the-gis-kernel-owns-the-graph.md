# 130 · The GIS kernel owns the graph

_Created 2026-10-22 · Updated 2026-10-22_

**Status:** asked — the decision is taken and the evidence for it is in this repository, but the
graph is still JavaScript objects on both paths. Nothing here has been built. What follows is the
measurement that settled it and the sequence proposed, not a result.

## What was asked

The practitioner, 2026-10-22, at the end of a day spent moving a province through this
application:

> *"Would using Rust as a GIS kernel instead of Typescript have helped?"*

and then, on being shown that the answer was already half-built here:

> *"It's the approach we decided to pursue with that other project -- Epi Info AI -- in designing
> the GIS kernel."*

> *"Let's move to Rust GIS kernel."*

## The experiment had already been run

Nothing needed to be constructed to answer the first question. On 2026-10-22 the same province,
in the same browsers, on the same afternoon, went through this application two ways.

| Path | What it is | Ituri, driving |
| --- | --- | --- |
| Published extract | Rust engine reads a 416 MB `.osm.pbf`, clips to the polygon during decode | read, 113,485 junctions, Chrome |
| Overpass download | TypeScript reads the response and builds the graph in V8 | 200 MB arrived; Chrome died, Safari held it |

The Rust path reached province scale in the browser that the TypeScript path could not survive.
That is not an argument about languages; it is the same input, twice, with one difference.

## Where it actually goes wrong, which is narrower than "TypeScript"

The kernel already owns the graph. `street-engine.ts` receives `flatNodes` and `flatEdges` --
packed `Float64Array` views straight out of wasm linear memory -- and discards them at the
boundary:

```ts
nodes[j]={id:'osm-'+flatNodes[i],coordinates:[flatNodes[i+1],flatNodes[i+2]]};
edges[j]={from:'osm-'+flatNodes[flatEdges[i]*3],to:'osm-'+flatNodes[flatEdges[i+1]*3],lengthM:flatEdges[i+2]};
```

For Ituri that is 984,906 strings and objects for the junctions, and **four million string
concatenations** for the segments. The compact representation exists for a few milliseconds.

Everything measured that day is downstream of those two lines.

| Measured 2026-10-22, Chromium tab | Result |
| --- | --- |
| Build a graph from 100,000 junctions | 324 ms |
| 500,000 junctions | 4,396 ms |
| 1,000,000 junctions | 20,873 ms |
| `structuredClone` of a 984,906-junction graph | 2,028 ms |
| Run a workflow at 500,000 junctions | fails: `Invalid string length` |
| Keep a graph in IndexedDB as objects (measured earlier, experiment 121) | >300 s |
| The same as typed arrays | 0.2 s |

The build cost is superlinear by a factor of sixty-four across a factor of ten in size. That is a
garbage collector under pressure, not an algorithm.

## What the representation would be

What Rust already hands over, kept rather than converted:

| Array | Type | Ituri |
| --- | --- | --- |
| `ids` | `Float64Array` | 7.9 MB |
| `lon`, `lat` | `Float64Array` | 15.8 MB |
| `edgeFrom`, `edgeTo` | `Uint32Array` | 16.2 MB |
| `edgeLength` | `Float64Array` | 16.2 MB |
| | | **≈ 56 MB** |

against several hundred megabytes of objects and strings for the same graph. Segments reference
junction *indices* rather than identifiers, so the string work does not shrink -- it disappears.

## The sequence

Smallest provable step first, each one measurable against the province that is now known to
arrive.

1. **Keep what the kernel gives.** A typed-array graph beside the object one, produced by the
   extract path with no conversion, with an adapter so existing readers keep working. Measure the
   same province through both.
2. **Move the hot readers** -- the polygon clip, the map draw, the payload store. The store is
   where experiment 121's 300 s against 0.2 s already points.
3. **Then the download path**, parsing in the kernel rather than in V8, which is where
   `Invalid string length` lives.

## Why, which is not the reason that first suggests itself

The performance case is real and it is the weaker one. The Epi Info AI architecture gives the
stronger reason for its own kernel: *"one implementation shared by browser, notebook,
command-line"*, so that the canonical calculation cannot drift.

This project today has **two implementations of what a street graph is**. The extract path builds
one in Rust, clipping to a polygon during decode with a latitude-band ring index. The download
path builds another in TypeScript, clipping afterwards with a different latitude-band ring index
written the same day. They agree now because they were written hours apart by the same hand. They
will not agree in six months about one-way handling, junction identity, or what counts as inside
a border. The parity ledger exists because that drift is expected.

A kernel is how there comes to be one answer.

## What it would not fix, recorded so it is not asked to

Most of what cost the practitioner two days was not a language problem, and a kernel would have
carried every one of these unchanged:

- a 180-second response timeout borrowed from OSMnx and applied to a transfer that was working
- `MAX_RASTER_CELLS` at 262,144, undeclared, refusing a province-sized population window
- a 20 MB import limit that refused a backup taken because the application would not open
- published extract links rendered only inside a mode named for the file you must already have
- the project export behind a storage readout in the header

A kernel raises a ceiling. It does not make a number measured or a door visible.

## What would say this was wrong

- The typed-array graph is built and the province still will not run in Chrome, which would mean
  the ceiling is somewhere this does not reach.
- `Invalid string length` turns out to be one avoidable `JSON.stringify` on a path that has no
  business serialising a graph, in which case step 3 is a line of code and not a kernel.
- The adapter in step 1 costs more than the conversion it replaces, because every reader goes
  through it.

## See also

- Experiment 129 · Graphways, and the question underneath it -- where the Rust engine came from
- Experiment 121 · Storage beyond localStorage -- the typed-array measurement
- Experiment 125 · Caps below the limit we are testing -- what a kernel does not fix
- `docs/directions.json` · `the-gis-kernel-owns-the-graph`
- Epi Info AI, `docs/architecture.md` -- the Epi kernel this follows
