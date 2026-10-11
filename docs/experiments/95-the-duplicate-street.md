# 95 · The duplicate street

_Created 2026-10-11 · Updated 2026-10-11_

**Status:** validated. Measured, implemented, parity re-checked against the
Validation Lab, and 3.5× faster on the operation it addresses.

## The question asked

[The performance measurement](../research/geometry-engine-performance-2026-10-11.md)
found the JavaScript geometry engine 3.2× slower than GEOS compiled to
WebAssembly, and recorded that adopting GEOS would cost tens of megabytes and
collapse the Lab's independence. That answered *which engine is faster*. It did
not ask the question that actually matters to a practitioner on a slow device:

**Is Fieldwork asking its engine to do work it does not need to do?**

The goal is practitioners where resources and connectivity may be scarce. A
cheaper engine is one way to get them a faster answer. Giving the engine less to
do is another, and it costs no bundle size and no evidence.

## How it was tried

The corridor was profiled by stage rather than as a whole, on the real Soho
network, 8 pumps, a 5-minute band:

| Stage | |
| --- | --- |
| `prepareEdges`, truncating 2064 segments, projecting both ways | **6.0 ms** |
| the Turf/JSTS buffer | **3918 ms** |

So 99.8% of the widget is one call, and the only lever is what that call is
given. Two things turned up in the input.

**The buffer is strongly super-linear in its input.** Handed all 2064 segments
at once it took 19.0 s; handed them in the eight per-origin groups the widget
already uses, 3.9 s in total for the same segments. Five times the work for the
same answer, from one grouping decision.

**And the input is half duplicates.** A street network is directed. Soho's 1619
directed edges are 1027 streets, 581 of them present in both directions. A
street between two reached junctions is therefore offered twice — once from each
end — and both copies were buffered. Coincident geometry is the slowest thing an
overlay can be asked to node and the least well defined.

## What was built

`reachedStreets` in [`src/network-edges.ts`](../../src/network-edges.ts), used by
both `reachable_corridor` and the `isochrone` monolith, so the two cannot drift
apart — as `partial` and `prepareEdges` already are.

It pools by street. Where the two ends' reaches meet, the whole street is
returned once; where they fall short, the piece entered from each end is
returned. This is exact, not an approximation: a buffer distributes over a union,
so the strip around a street entered from both ends *is* the strip around the
street.

**Pooling is keyed by the line, not by its two junctions**, and that distinction
was found by measuring rather than by reasoning. The junction-keyed version
shipped first and lost area — 39 ppm at 5 minutes, 380 ppm at 20. Six of Soho's
581 reverse pairs carry different geometry in their two directions, and three
junction pairs carry more than one street between them. Keying by junction
discarded that ground. Keying by the line recovered it: the areas then agreed
with the originals to **under 0.002 ppm**, which is overlay noise.

That is the lesson worth keeping. A dedup that is *obviously* safe deleted real
reach, and only a before-and-after area caught it. The first version passed every
unit test and the parity check.

## What it measured

Median of nine runs, Node 22, after warm-up. 8 pumps on the Soho network.

| Operation | Before | After | |
| --- | --- | --- | --- |
| `isochrone`, 5 min | 3868 ms | **1090 ms** | 3.5× |
| `isochrone`, 10 min | 15441 ms | **4451 ms** | 3.5× |
| `isochrone`, thresholds 2/5/10 | 20119 ms | **5769 ms** | 3.5× |
| `reachable_corridor`, 5 min | 3840 ms | **1096 ms** | 3.5× |
| `reachable_corridor`, 10 min | 11750 ms | **4405 ms** | 2.7× |
| `reachable_corridor`, 20 min | 13098 ms | **9807 ms** | 1.3× |

And end to end, in Chromium, the shipped worked example a practitioner opens:

| | |
| --- | --- |
| `snow-isochrone`, whole run, before | 2.2 s |
| `snow-isochrone`, whole run, after | **1.4 s** |

The 20-minute corridor gains least and is the noisiest measurement — the long
runs vary by about 30% between samples, so read 1.3× as "some" rather than as a
figure. At 20 minutes nearly every street is covered end to end, so pooling
halves the input but the remaining geometry is the dense, fully-overlapping case
the overlay is worst at.

## Parity, which came first

`validate:parity` re-runs each widget against the result the Lab's notebook
recorded. All six parity-covered widgets still **agree**, including
`reachable_corridor 0.2.0` against `08-corridor`. Nothing was re-pinned: the
widgets were re-run and the answers still match, which is the stronger outcome.
The 331 unit tests pass, with their asserted junction, segment and part-way
counts unchanged.

The receipt counts are deliberately untouched. `fw:enteredSegmentCount` is still
counted per **directed** street entered — 2064 at 5 minutes, as before — because
that is what the Lab's notebook counts. Only the geometry handed to the buffer is
pooled. A performance change that quietly redefined a published count would have
broken parity to look faster.

## Why no version was published

`reachable_corridor` stays at 0.2.0 and `isochrone` at 0.2.0. A release exists so
that a pinned member means fixed behaviour, and the behaviour is fixed: the same
ports, the same parameters, the same receipt facts, the same counts, and areas
agreeing to 0.002 ppm. Publishing 0.2.1 would have reported drift to
`compute_walking_catchment` and required re-pinning it, announcing a change that
did not happen.

This is recorded here rather than left implicit, because the opposite reading is
defensible: the geometry *did* change in its last few significant digits.

## What this does not settle

**It is one shape of work.** Pooling helps because a street network is directed
and the widget buffers lines. Nothing here speeds up a raster clip, a
point-in-polygon sweep or a projection.

**The engine question is untouched.** JSTS is still 3.2× slower than WASM GEOS on
the same corridor. This change means Fieldwork now asks it to do roughly half the
work, which is a larger saving than switching engines would have been, and costs
nothing — but it does not make the JavaScript fast, and the super-linear curve
means the next larger network will hurt again.

**The grouping finding is unexploited.** Eight groups beat one by 5×, and nothing
yet chooses the grouping deliberately: it is a by-product of one corridor per
origin. Splitting a single large corridor into spatially separate chunks,
buffering each and unioning the results is the same exact-union argument, and is
not implemented or measured. That is the next thing to try, and it is where the
remaining 20-minute case lives.

**And nothing here was asked for by a practitioner.** It was found by profiling
after a question about engines. Whether 1.4 s instead of 2.2 s changes anything
for someone working on a phone in the field is not measured, and the run timer
added alongside this change exists so that it can at least be seen.
