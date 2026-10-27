# Geometry engines: JavaScript against WASM GEOS, measured

_Created 2026-10-11 · Updated 2026-10-26_

Fieldwork does every spatial operation in JavaScript. The Validation Lab runs
GEOS, PROJ and GDAL through Pyodide, which is WebAssembly. The question is
whether the application is paying a performance price for that, and how much.

## What each side uses

| | Fieldwork | Validation Lab |
| --- | --- | --- |
| Buffers | `@turf/buffer` → `@turf/jsts`, a JavaScript port of JTS | GEOS, through Shapely |
| Polygon booleans | `polyclip-ts` | GEOS |
| Projections | `proj4` | PROJ, through pyproj |
| Rasters | `geotiff` | GDAL, through rasterio |
| WebAssembly in the bundle | SQLite (`sql-wasm.wasm`) and the EYE reasoner — **no geometry** | all of the above |

## The measurement

One operation, implemented twice and already known to agree: the five-minute
Soho corridor — 301 street segments truncated by their remaining budget,
buffered 25 m and unioned. The same inputs, the same 8 segments per quadrant,
and outputs that agree to 0.116% ([84](../experiments/84-reachable-corridor.md)).

Twenty runs each after a warm-up, ten in Pyodide.

| Engine | Where | Per corridor |
| --- | --- | --- |
| `@turf/jsts` + `polyclip-ts` | Node 22, V8 | **820.1 ms** |
| GEOS 3.12.1, Shapely 2.1.2 | **Pyodide, WebAssembly** | **253.2 ms** |
| GEOS 3.14.1, Shapely 2.2.0 | CPython, native | 135.4 ms |

**WASM GEOS is 3.2× faster than the JavaScript**, and 1.9× slower than the same
library compiled natively. So the WebAssembly penalty against native is real and
modest, and it is far smaller than the penalty the JavaScript port already pays.

## What the numbers do not say

**One operation on one dataset.** Buffering and unioning many short lines is
JTS-unfriendly work; a different mix — point-in-polygon over many points, a
single large intersection — could land anywhere.

**Steady-state only.** The 253 ms excludes Pyodide's start-up, which is tens of
seconds on a cold cache and dominates anything a practitioner does once. The
JavaScript has no equivalent cost.

**Size is not measured here and is the real counterweight.** `@turf/*` and
`polyclip-ts` are a few hundred kilobytes in a bundle that precaches and reports
*Available offline*. Pyodide with Shapely, PROJ and GDAL is tens of megabytes
fetched from a CDN, which is the constraint
[the goal](../../TODO.md) names: practitioners where connectivity may be scarce.

**And it would cost the parity evidence.** The lab is independent because it
shares no numerical module with the application
([41](../experiments/41-validation-lab.md)). Move Fieldwork onto GEOS and the
corridor check compares GEOS against GEOS: the 0.116% agreement stops being
evidence and becomes a tautology. That is not an argument against the change,
but it is a cost that has to be paid knowingly — the lab would need a third
implementation to mean anything.

## What this suggests

Three times the speed is worth wanting, and the operations where it would pay
are the ones that already take close to a second. But the trade is not
engine-for-engine: it is a few hundred kilobytes against tens of megabytes, and
independent evidence against a tautology.

A narrower move is available and is not studied here: compiling only what is
slow — a buffer-and-union kernel rather than all of GEOS — which would keep the
bundle small, and would still collapse the parity comparison for exactly those
operations.

**Followed up 2026-10-11.** Before changing engines, this asked whether the
engine was being given work it did not need. It was: the corridor is 99.8% one
buffer call, the buffer's input was half duplicate streets, and the buffer is
strongly super-linear in its input. Pooling them made the same operation 3.5×
faster with no bundle cost and parity still agreeing
([95](../experiments/95-the-duplicate-street.md)). That is a larger saving than
switching engines would have been, and it does not change the conclusion above
— JSTS remains 3.2× slower than WASM GEOS — only the order to do things in.
