# 221 · Large rasters with terrio

_Created 2026-11-18 · Updated 2026-11-21_

**Status:** validated. Adopted 2026-11-18 as Fieldwork's one raster engine; the change is complete: no application code
reads cells with geotiff.js, which stays only as an independent writer of test files. Validated against geotiff.js
(2026-11-18), GDAL (2026-11-21) and in WebKit on CI; live MODIS and Edge on Windows are not established (below).

## The question

The practitioner, 2026-11-18, asked to explore [terrio](https://terrio.dev), a pure-Rust raster, vector and point-cloud
library compiled to WebAssembly (`terrio-js` 0.9.0, MIT with MPL-2.0 and Apache-2.0 parts, opengeos): *"terrio because
we want to optimize large raster handling as much as possible."*

Fieldwork's own kernel reads a GeoTIFF whole and keeps a window of it. DR Congo's WorldPop raster at 100 m took 2.6 GB
of one tab in 0.138.0, against a WebAssembly memory of 4 GB. What could terrio change?

## What is measured, written before the result

| Question | Measured as |
| --- | --- |
| Does terrio read only a window of a large file, by range requests? | bytes fetched, time and peak memory to read DR Congo's window out of GHS-POP's 12 GB global file, served locally with range requests |
| Does its 64-bit memory build hold more than 4 GB? | whether `terrio-js/memory64` loads and opens what the 32-bit build cannot |
| Do its threads speed up decoding on a laptop? | time for the same read, one thread against several |
| Do its zonal sums agree with Fieldwork's? | Rwanda and DR Congo, WorldPop 100 m, summed by province: terrio against Fieldwork's Sample a raster |
| What does it cost to load? | download size of each build: full 30.0 MB, core 16.2 MB, threads 30.5 MB, memory64 51.4 MB |

Measured first in Node.js on this Mac, then in a Chrome tab, since a browser tab is where Fieldwork runs.

**The observation that can come out badly:** that a 16 to 51 MB download costs more, for a practitioner on a field
connection, than the large rasters it helps with save.

## What was measured

On this Mac (14 cores, 36 GB), Node.js 22 and Playwright's Chromium. A local file was read only through `Blob.slice`,
passed to terrio's `openUrl` as its `fetch`, so a tab reads the byte ranges it asks for and no more. Zones: DR Congo's
26 provinces (`tests/fixtures/cod-adm1-2026-10-20.geojson`). Scripts are in the session's scratchpad, not the repository.

**Agreement.** WorldPop 2026, DR Congo, 100 m (22,935 × 22,621 cells, 82 MB file), summed by province: terrio's
`ZonalReducer` and Fieldwork's `totalOver` give the same total and the same number of cells in all 26 provinces,
114,607,817 people over 11,648,199 cells. Both count a cell whose centre is in the province.

**DR Congo by province, in a Chromium tab:**

| Path | Time | Peak memory | Total |
| --- | --- | --- | --- |
| Fieldwork 0.146.0, the whole window read, then each province | 25.5 s | 2.6 GB | 114,607,817 |
| Fieldwork 0.146.0, each province's window read in turn | 46.5 s | 0.79 GB | 114,607,817 |
| terrio, strips of 256 rows streamed into the reducer, one thread | 7.2 s | 0.37 GB | 114,607,817 |
| terrio `core` build, the same | 7.1 s | 0.37 GB | 114,607,817 |
| terrio `threads`, 4 threads | 3.8 s | 0.45 GB | 114,607,817 |
| terrio `threads`, 8 threads | 3.3 s | 0.53 GB | 114,607,817 |
| terrio `memory64`, one thread | 7.9 s | 0.39 GB | 114,607,817 |

Memory is WebAssembly memory plus the JavaScript heap, sampled every 20 ms. In Node.js the threads did the same:
9.5 s with one, 4.5 s with four, 3.8 s with eight. `memory64` needs Node.js 24 and fell back to 32 bits on Node.js 22.

**A window of a very large file.** GHS-POP's global file (12 GB): Rwanda's window in 0.34 s, 27 MB read; all of
DR Congo by province in 8.2 s, 84 MB read, about 0.5 GB of memory, a total of 109,198,776 (a different product from
WorldPop's).

**Terrain and band arithmetic.** On rasters written by Fieldwork's own GeoTIFF writer, whose answers are known: `dem`
slope of a plane rising 1 m per 111 m cell, 0.5156° (expected 0.5156°); `calc` NDVI `(A-B)/(A+B)` of 0.5 and 0.1,
0.6667 (expected 0.6667).

**Where terrio starts to win.** A square centred on 23.5° E, 3° S in the same raster, one zone, summed by each path in
a Chromium tab, terrio's `core` build already loaded (about 55 ms to start, from the disk):

| Square, cells a side | Cells with a value | Fieldwork | terrio | Fieldwork memory | terrio memory |
| --- | --- | --- | --- | --- | --- |
| 1,000 | 24,659 | 0.17 s | 0.10 s | 104 MB | 41 MB |
| 2,000 | 92,801 | 0.50 s | 0.19 s | 131 MB | 74 MB |
| 4,000 | 214,696 | 1.5 s | 0.38 s | 264 MB | 145 MB |
| 8,000 | 1,418,994 | 5.7 s | 1.2 s | 825 MB | 211 MB |
| 12,000 | 3,594,889 | 10.3 s | 2.5 s | 1.3 GB | 302 MB |
| 16,000 | 8,043,281 | 18.2 s | 4.4 s | 1.5 GB | 476 MB |
| 22,000 | 11,301,386 | 23.5 s | 6.9 s | 2.4 GB | 721 MB |

The totals agree at every size. There is no crossover: terrio is faster and lighter from the smallest square up. What
it costs is its first download, not its speed.

**Download size** of the WebAssembly, against Fieldwork's own kernel, 52 KB (21 KB gzip):

| Build | Raw | gzip | Brotli |
| --- | --- | --- | --- |
| `core` (GeoTIFF and the common formats, one thread) | 16.2 MB | 6.1 MB | 4.5 MB |
| full (every format) | 30.0 MB | 10.7 MB | 7.7 MB |
| `threads` | 30.5 MB | 10.8 MB | 7.8 MB |
| `memory64` | 51.4 MB | 12.6 MB | 8.2 MB |

**Threads need a cross-origin isolated page.** The page must be sent with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. GitHub Pages sets neither. Fieldwork's service worker could add them, but
`require-corp` then blocks every cross-origin image and file that does not opt in, which includes basemap tiles and
satellite assets. Measured here with a test server that sent both headers.

## What the result suggests, for the practitioner to decide

- **The `core` build, loaded only when a raster is large**, for Sample a raster's totals: 3.5 to 6.5 times faster
  than Fieldwork's current paths, with half to a seventh of their memory, and the same answer. Fetched once on first
  use and kept, like the NYC package, not in the offline cache every visit downloads.
- **Not the threads build**, while it needs a page that cross-origin tiles cannot reach.
- **Not the memory64 build.** Streaming keeps the largest raster here under 0.6 GB, so the 4 GB limit is not the
  obstacle, and Safari has no 64-bit memory.
- **The observation that could come out badly did, in part.** 4.5 to 6 MB is a real cost on a field connection. It is
  repaid only by rasters larger than a country at 100 m, which is why it would load on demand.

## What it does not establish

- Safari and WebKit, and Edge on a Windows laptop, were not measured. Only Chromium on a Mac was.
- Reads were from a local file. Range requests over a network, and over a field connection, were not measured.
- NDVI from real Sentinel-2 bands through the STAC widget, and slope on a real DEM, were not run. Only the synthetic
  checks above were.
- Agreement holds for the centre-of-cell rule. terrio's other rules (all cells touched, area-weighted) were not compared.
- Fieldwork's own range reads of the 12 GB file were not measured, so that comparison is terrio's alone.
- terrio says of itself that it is "in early development. The API may change before 1.0".

## The decision

The practitioner, 2026-11-18, first chose a hybrid: *"use terrio for large rasters (how to determine is the problem),
then FW for smaller ones."* The sweep above found no size at which Fieldwork's reader wins. The practitioner then named
the cost of a hybrid: *"The problem is two code bases."* On the version: *"That's OK if terrio is not 1.0. This is a DE
project anyway."*

So terrio replaces geotiff.js everywhere Fieldwork decodes a GeoTIFF. Under the remove-now regime (no outside users),
geotiff.js goes in the same release, with no fallback kept beside it.

## The adoption, written before the code

| Today (geotiff.js) | After |
| --- | --- |
| `src/raster.ts`: Raster input's header, window and kept cells | Fieldwork reads the TIFF header itself and asks terrio for the cells |
| `src/georeference-ui.ts`: a scanned map's picture | the same header, and terrio's bands (`paletteToRgb` for a palette) |
| `src/satellite-grid-sample.ts` via `src/core.ts`: MODIS tiles by range | terrio's `openUrl`, behind the `Image` shape the reader already takes |

- **The header stays Fieldwork's.** Its checks run before any cell is read: is it a picture or values, EPSG:4326,
  north-up, point- or area-registered, its no data, block size and compression. They read tags that terrio's `info()`
  does not give: GeoKeys, photometric interpretation, `ModelTransformation`, block size, strip offsets. A small reader of
  TIFF and BigTIFF directories gives them. It reads tags, not cells, so there is still one engine for the cells.
- **terrio's `core` build, fetched the first time a raster is read** and kept in its own cache (`terrio-0.9.0`), which
  the service worker serves offline and does not delete on an update. Projects without a raster never fetch it.
- **The kept window is unchanged**: Fieldwork's own GeoTIFF, by digest. A window read again must give the same bytes,
  so reading again through terrio is itself the test that the two engines agree.
- **Not in this step:** totals streamed straight from a source without keeping its window, which would lift the cell
  cap. That is a separate change, measured when it is made.

**What would show this wrong:** a kept window whose digest changes when read again through terrio; a GeoTIFF that
geotiff.js read and terrio refuses; WebKit, where terrio has not run yet.

## Validation record

**2026-11-18, the new path against geotiff.js, in Node.js 22.** The same window from each file through Fieldwork's new
path (its own header reader, terrio's cells) and through geotiff.js 3.0.5. Metadata is compared field by field, and every
cell after no data becomes NaN:

| File | Window | Cells | Differing | Metadata | New path | geotiff.js |
| --- | --- | --- | --- | --- | --- | --- |
| WorldPop Rwanda 2026, 100 m | whole | 5,254,600 | 0 | same | 0.29 s | 1.43 s |
| WorldPop Botswana 2020, 100 m | 2° × 2° | 5,764,801 | 0 | same | 1.0 s | 8.9 s |
| SSA population Rwanda 2025 | whole | 5,254,600 | 0 | same | 0.21 s | 0.85 s |
| WorldPop DR Congo 2026, 100 m | 3° × 3° | 12,967,201 | 0 | same | 0.39 s | 1.6 s |
| GHS-POP E2025 global, 12 GB BigTIFF, by URL | Rwanda | 5,750,401 | 0 | same | 0.40 s | 0.70 s |

- `Walford2020map.tif` is a JPEG named `.tif`; the header reader refuses it as not a TIFF, which is right.
- **Found on the way:** Node.js 22's `openAsBlob` reports the 12.29 GB file as 3.70 GB (its size modulo 2³²) and reads
  nothing past 4 GB. That is Node's, not terrio's or Fieldwork's: a browser's `File` gives the right size, and the
  Chromium spike read the same file from disk. The 12 GB file was therefore checked by URL from a local server.
- **A test that counted requests failed:** *a connection that stays down* cut the connection from the fifth request,
  which with geotiff.js fell after the first band. terrio makes more requests to open a file, so the cut fell before
  any band and nothing was kept to carry on from. The test now cuts after the first band arrives, which is what it
  means to check.
- Unit suite: 1,807 passed, 0 failed, 4 skipped.

**Not established (2026-11-18):**
- A YCbCr JPEG-compressed picture GeoTIFF. The fixture sheet is uncompressed RGB, and none of the other kind was at hand.
- WebKit and Edge on Windows.
- Live MODIS files through `openImage`. The offline test reads files made in the test.

**2026-11-21, the two that could be closed here** (the practitioner: finish terrio so this closes):

- **A YCbCr JPEG-compressed picture GeoTIFF**, made rather than downloaded: 384 by 256 cells of three gradients, written
  by GDAL 3.12.2 through rasterio 1.5.2 (PHOTOMETRIC=YCBCR, COMPRESS=JPEG, quality 95, 128-cell tiles), 10,348 bytes,
  kept as `tests/fixtures/picture-ycbcr-jpeg.tif`. Fieldwork's header reads it as a picture (photometric 6), and terrio
  decodes it to the same red, green and blue as GDAL, every byte of 294,912; `tests/picture-ycbcr.test.mjs` holds the
  digest of GDAL's bytes.
- **WebKit**: CI's WebKit run of 0.159.1 (GitHub Actions run 44955235026, 2026-11-21) passed every test that reads cells
  through terrio: georeferencing a picture, a NetCDF window, Sample a raster over areas and its arrivals, and satellite
  files read by range.

**Still not established:** live MODIS files through `openImage` (they need an Earthdata sign-in, which is the
practitioner's), and Edge on Windows. Neither is in reach from here; both are named rather than closed.
