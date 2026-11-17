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

Confirmed on 0.135.0 the same day: the practitioner's workflow, Study area of 40,744 vertices (Botswana, from
geoBoundaries), Raster input of 11,248 x 10,950 cells and Map, ran to "Run complete" in Edge on Windows, where on
0.133.0 it had stopped at "1 of 3". JLT's run in Chrome on Windows is still to report.

### The limit raised to Nigeria; DR Congo dies saving (2026-11-17)

The practitioner, with Nigeria and then DR Congo refused at 123.3 million cells: *"We reached the cap again I think we
increase to double"*, then, offered a measurement first, *"See COD also"* and *"You should still run DR Congo"*.

Measured in headless Chromium on a Mac, the limits raised in a local build only, with Study area across each file's
whole extent, Raster input through its own dialog, and Map:

| WorldPop 2026, 100 m | Window | Apply | Run |
| --- | --- | --- | --- |
| Botswana | 123.2 M cells, 0.49 GB | | 2.2 GB peak |
| Nigeria | 166.4 M cells, 0.67 GB | 73 s, 2.3 GB peak | 2 s, 3.2 GB peak |
| DR Congo | 518.8 M cells, 2.07 GB | read in 15 s; died saving, at 4.35 GB | not reached |

The limit is now Nigeria's window, 166.4 million cells. The decoding limit, 1.1 GB, is unchanged, so GHS-POP over
Nigeria, 8 bytes a cell, is still refused: never run. Doubling the cell limit, as first asked, would have admitted
it. Not established: Nigeria in Edge or Chrome on Windows, which the practitioner is to try.

Above Nigeria the obstacle is saving: the window is written out as a second whole copy, then stored. Writing and
storing it in parts, and reading it band by band in the steps that use it, is the change DR Congo needs; not begun.

### Two copies removed; the workflow's peak not measurably lower (2026-11-17)

Two places held a second copy of a window for a moment. The digest of the saved window went through SubtleCrypto,
which takes its own copy of the bytes. Map's presentation step deep-copied its input, raster cells included. Above
64 MB the digest is now taken over slices of the same bytes, and the presentation shares the cells and copies the
rest. Nothing writes to a grid's cells once read.

Measured on Nigeria, the same file and the same Mac:

| | Before | After |
| --- | --- | --- |
| Digest step alone (read, encode, digest) | 2.33 GB peak | 1.71 GB peak, the same digest |
| Apply, the whole dialog, two runs | 2.1 GB, 2.3 GB | 2.3 GB, 2.2 GB |
| Run of the workflow, two runs | 3.6 GB, 3.1 GB | 2.9 GB, 3.1 GB |

The digest step is 0.6 GB lighter. The workflow's peaks are within the spread between runs, so a lower peak for
Apply or Run is not established. Apply's peak comes from somewhere other than the digest. The cost: hashing in place
is about ten times slower than SubtleCrypto (260 against 2,450 MB/s in Node), about 2.5 s on Nigeria's 0.67 GB window.
The copies were removed for the change DR Congo needs, where the window is saved in parts and no step may hold two.

### DR Congo whole, at one window and a half (2026-11-17)

The practitioner, with DR Congo refused: *"Let's address the limit as this country is in the middle of an Ebola
crisis"*. Fieldwork is not in use in the field, so this was the limit lifted, not a stopgap.

Where the memory went, found by measuring each stage on Nigeria, then DR Congo, in headless Chromium on a Mac:

- **Saving held the window twice over.** The cells as read, the file they were written into, a Blob copy of that file
  made only to read its header back, and the digest's copy. Now the window is read straight into the place the saved
  file keeps its cells, so the cells and the file are one buffer; the header is read from the bytes; the digest is
  taken over them in place.
- **A run read the stored window back twice.** Its 64 MB parts were all asked for at once, so every part arrived before
  the first was copied into the whole. Now each is asked for when the last is copied. The header check made a Blob copy
  here too; now it reads the bytes.
- **Opening a project runs it, and Run pressed again ran beside the last run's raster.** The Results and the Notes tab's
  record of the last run both kept it. Both let it go when the next run starts.

| WorldPop 2026, 100 m | Apply | Run on opening | Run again |
| --- | --- | --- | --- |
| Nigeria, before | 2.1 to 2.3 GB | 1.82 GB | 3.0 to 3.6 GB |
| Nigeria, after | 1.59 to 1.60 GB | 1.30 to 1.35 GB | 1.30 to 2.19 GB |
| DR Congo, before | died saving, about 6 GB | not reached | not reached |
| DR Congo, after (two runs) | 75 s, 2.58 to 2.63 GB | 2.53 to 2.66 GB | 2.88 to 3.01 GB |

DR Congo's window is 518,812,635 cells of 4 bytes (2.07 GB) over 2,123,366,400 bytes of TIFF blocks. The cell limit is
now 518.9 million and the decoding limit 2.124 GB, both rounded up from it.

Not established: DR Congo, or Nigeria, in Edge or Chrome on Windows, where a tab may hold less than on a Mac. GHS-POP over
Nigeria, 8 bytes a cell and 1.33 GB, is now admitted and has not been run. A window past 2^31 bytes would pass the largest
single array some browsers allow; the decoding limit sits just under it.
