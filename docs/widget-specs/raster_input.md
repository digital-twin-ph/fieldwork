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
