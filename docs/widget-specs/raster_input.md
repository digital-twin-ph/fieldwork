# Raster input · specification

_Created 2026-11-17 · Updated 2026-11-17_

What Raster input assumes, what has been measured about it, and what changed when. The manual is
[../widgets/raster_input.md](../widgets/raster_input.md).

## History

### A dropped connection is tried again (2026-11-17)

The practitioner read GHS-POP 2025 over Botswana from the JRC's copy, in Edge, on 0.132.0. The read stopped at 37% with
the browser's bare "Failed to fetch", and the 37% was lost. Each part of a remote read is now tried again after a
dropped connection, on a fresh connection, after pauses of 1.5, 3 and 6 seconds. A part that fails four times stops the
read with a sentence naming the host, the percentage and the rows; the parts already read stay in the page, so Apply
again starts where it stopped. A file on this device is not retried. Tested against a served copy that drops requests
(`tests/raster.test.mjs`); not yet tried against the JRC's copy with a real outage.

### Out of memory in Chrome on Windows (2026-11-17)

JLT ran the Botswana WorldPop workflow in Chrome on Windows on 0.133.0 and the tab died with "Out of Memory". Which
step it died in is not known. The window is about 11,000 x 11,000 cells, kept at 4 bytes a cell, so about half a
gigabyte a copy. Two places held several copies at once:

- **Drawing it.** The Results map, the catchment map and the study-area preview drew the window one pixel a cell: an
  image buffer, a canvas, a PNG and the browser's decoded copy of that PNG, for a map 850 pixels wide. A window is now
  drawn at no more than 2,048 pixels a side, each pixel the mean of the cells with data in its block, and the caption
  says so. The panels of Map were already reduced, to 1,000 cells a side.
- **Reading and saving it.** The banded read held the bands, their join and the converted copy: three windows' worth.
  It now fills one array a band at a time. Saving copied the cells before writing them; cells already at the right
  precision are now written as they are.

The cells, and everything computed from them, are unchanged. The cell cap of 123,300,000 was measured in a Chromium tab
on a Mac and is not changed here: whether a Windows laptop reaches it is the next measurement, with JLT.

### Measured: where the memory goes (2026-11-17)

JLT's laptop has 64 GB, so the tab did not run short of the computer's memory: it reached Chrome's own limit for one
tab. His workflow was three steps: Study area (Botswana, ADM0), Raster input (WorldPop 2026, R2025A, 100 m,
constrained, 16 MB as published), and Map. It died near the end of the run.

Measured on 0.134.0 in headless Chromium on a Mac, one run: the tab's resident memory at the peak of each step, with the
steps called directly rather than through the dialogs. The window is the whole file, 11,248 x 10,953 cells, 4 bytes a
cell: 493 MB.

| Step | Tab at its peak |
| --- | --- |
| Page open | 319 MB |
| Read the window, in bands | 1,063 MB |
| Write it as Fieldwork's GeoTIFF | 1,363 MB |
| Its digest | 1,834 MB |
| Read the kept window back, in place | 1,362 MB |
| Draw it reduced, 1,875 x 1,826 pixels (0.134.0) | 1,405 MB |
| Draw it one pixel a cell, 11,248 x 10,953 (0.133.0) | 2,822 MB |

Drawing one pixel a cell added about 1.4 GB on top of everything else, more than any other step; drawn reduced, it adds
about 40 MB. The digest is next, at about 470 MB: a copy taken to hash. Not established: Chrome's limit on Windows, and
whether 0.134.0 runs JLT's workflow there. The reading path of 0.133.0 was not measured.

### The cause: counting the valid cells (2026-11-17)

Reproduced on the Mac: Study area of 40,744 vertices across Botswana, Raster input with the WorldPop 2026 file, and a
Map with the raster wired to it. The tab died about two seconds after Run, on 0.134.0 as well, so the drawing was not
the cause. Probes showed the three steps finish in under two seconds; the tab died after, in the Results view, on the
line that wrote "N valid": `raster.values.filter(v=>v!==null).length`. Filtering a typed array of 123,199,344 cells
gathers every kept value as a separate number before building the result, past what V8 lets one tab hold. The count was
also wrong: no data is NaN, never null, so every cell was counted.

Counted with a loop now, and only cells holding a number. The same workflow then completes in about three seconds, the
tab at about 2.2 GB at its peak. The run stopping at "1 of 3" in Edge on Windows is likely the same line: the page
freezes while it runs, and the step counter is not redrawn. Not established until it is tried there.

The reductions made earlier the same day, the drawing at 2,048 pixels a side and fewer copies when reading and saving,
stay: the drawing at one pixel a cell measured 1.4 GB on its own.
