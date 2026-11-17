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
