# 97 · The browser kernel gate

_Created 2026-10-11 · Updated 2026-10-15_

**Status:** validated — all seven Validation Lab notebooks execute in the browser
kernel with no error cells, in under a minute, and the check blocks publication
as of 2026-10-11. The fix is confirmed by repeated trials in fresh kernels, not
by one green run.

## The question asked

[41](41-validation-lab.md) made the notebooks the instrument that checks
Fieldwork's computations, and [the TODO](../../TODO.md) carried the remaining half
of notebook CI: **does the browser kernel actually run them?** CPython passing is
necessary and not sufficient, because the distribution the kernel loads carries
different package versions from the one a developer has.

On 2026-10-10 the browser check went in reporting but **not blocking**, for one
reason: `02-clip-vs-rasterio` did not complete in twelve minutes, where it takes
1.0 second in CPython, and the cause was unknown. Gating publication on an
unexplained notebook would have stopped the site updating.

So: **why does that notebook not finish, and can the check become a gate?**

## How it was tried

By instrumenting rather than reasoning, after reasoning failed twice (below). A
probe opened the notebook in the kernel, ran every cell, and reported each cell's
execution count and console output on a timer. The answer was in the console
within seconds:

```
RuntimeError: null function
  at wasm://wasm/0138bbc6:wasm-function[4922]
  File "/lib/python3.14/site-packages/rasterio/__init__.py", line 367 in open
  File "/drive/checks/check_02_clip.py", line 134 in run
```

Then a bisect: for each candidate package list, a **fresh kernel**, a
`loadPackage`, and one `rasterio.open` on the lab's 24×18 GeoTIFF.

## What happened

| Requested | Trials | `rasterio.open` |
| --- | --- | --- |
| `pyproj`, `rasterio` — either order | 2 | **fatal** |
| `numpy, rasterio, scipy, shapely` **+ `pyproj`** | 1 | **fatal** |
| the nine the notebook asked for, in order | 4 | **fatal** |
| `fiona` **before** `rasterio` | 1 | **fatal** |
| `numpy, rasterio, scipy, shapely` | 3 | ok |
| the four **+ `fiona` after** `rasterio` | 1 | ok |
| the nine reordered, `rasterio` early and `pyproj` last | 3 | ok |

**Deterministic**: five of five fatal with `pyproj` beside `rasterio`, and every
passing combination passed every trial. That mattered more than the cause —
a flaky wasm fault would have meant the fix was luck and the gate untrustworthy.

**Two defects, one symptom.** The crash is fatal: it takes the kernel down rather
than raising, so **no cell records an error**. The runner was waiting for an
execution count that could never arrive, and reported a timeout. A check whose
only failure mode is a timeout cannot tell a crash from slow work, and that is
why this looked for a day like a slow notebook.

**And the notebook asked for nine packages it did not import.** Not carelessness:
a `piplite` fix on 2026-10-08 replaced per-notebook installs with one working
`loadPackage` list, and that list was copied into every notebook. `02` imports
four of the nine. The notebooks that were already fast are exactly the ones whose
lists were never widened.

## What was decided, and what it changed

**Each notebook requests what it imports.** `02` now asks for
`numpy, rasterio, scipy, shapely` and passes in 12 seconds. `00-kernel-check`
still requests all nine, because reporting what the distribution provides is its
job, and it carries the table above plus a section saying the mechanism is
unexplained. It deliberately does **not** demonstrate the crash: doing so would
take down the kernel and leave that check unable to report anything at all.

**The runner races cell completion against kernel death.** Pyodide reports fatal
errors to the console rather than as page errors, so both are watched, and a dead
kernel is reported in seconds with its message instead of after a timeout that
says nothing.

**The check blocks publication.** `continue-on-error` is gone from the Pages
workflow. Both reasons it was there are resolved: the notebook passes, and a
crash now fails fast with a legible cause.

Timings, all seven notebooks:

| | |
| --- | --- |
| CPython | 6.3 s total |
| Browser kernel | 58 s total, of which 19.7 s is the first notebook paying for Pyodide |

## What changed our minds

**Three explanations, each falsified by the next measurement**, and the record is
more useful than the answer.

**First: CDN download cost.** `01` and `02` requested nine packages including
geopandas, fiona and GDAL; the notebooks that were fast had narrow lists. The
correlation was real and the explanation was wrong — `00-kernel-check` loads all
nine in **15.1 seconds**. The narrowed notebooks were reverted, because a tidier
list justified by a false cause is worse than the original.

**Second: `fiona` and `rasterio` conflict over GDAL.** Both ship GDAL 3.8.3, and
the crashing run had loaded both. Falsified by adding `fiona` back and watching
it pass: `fiona` **after** `rasterio` is fine, `fiona` **before** it is fatal.

**Third: load order decides it.** Falsified immediately: `pyproj` + `rasterio`
crashes in **both** orders, while the nine with `pyproj` last passes three times
out of three — so adding `fiona` and `geopandas` to a crashing pair *fixes* it.

What that leaves is a map and not a mechanism, and the honest thing was to write
it down that way rather than to invent a fourth story. The pattern that holds —
`rasterio` wants `pyproj` out of its kernel — is enough to act on and is stated
as an observation.

**Two self-inflicted delays, both now fixed in the tooling.** The baseline run
was piped through `tail`, which buffers until exit, so 28 minutes passed with no
visible progress; and a wait loop used `pgrep -f zz-bisect`, which matched the
shell command containing that string and could never become true, spinning for
seven minutes. Both were mine, not the lab's, and both were the same mistake:
building an instrument that cannot report what it is doing.

## What this does not establish

**Why the crash happens.** It is a defect in this Pyodide distribution's GDAL,
reproducible in two packages, and nothing here explains it or reports it
upstream. The reproduction is small enough to file, and that is not done.

**That the gate will hold through a Pyodide upgrade.** The kernel loads
**v314.0.6 from a CDN**, pinned by nothing in this repository. A distribution
change can alter the package versions, the crash, or both, and the gate would
find out by failing. Vendoring the distribution would fix that and would also
remove the lab's need for connectivity on first use; it is a much larger change
and is not scheduled.

**That the notebooks are right.** This establishes that they run. Whether they
check what they claim to check is [41](41-validation-lab.md)'s question, and 26
computing widgets still have no check at all — the next urgent item.

**And nothing about Fieldwork's own correctness.** The lab is for contributors
with connectivity. A practitioner in the field relies on the widget being right
and will never run the notebook that checks it.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-11 | Record the browser kernel gate, and what three wrong guesses cost |
