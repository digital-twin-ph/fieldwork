# 198 · A published grid, read at points

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** validated. Step 1 (0.71.0) and step 2, NetCDF from this device (0.72.0), built and run in Chromium; the
third sea-level workflow's heights and its 16 of 194 recomputed independently by Validation Lab check 42, in CPython
and in the browser kernel. Manila only: the practitioner, 2026-11-09, *"For now let's stick to Manila"*; the other
seven gauges, with Find health facilities near each, are a later workflow.

## The question

The sea-level example needs two published grids read at its tide gauges: EGM2008, the geoid open terrain models
measure from, and DTU25MSS, the mean sea surface of 1993–2012 above the WGS84 ellipsoid (DTU Space, CC BY 4.0). Their
difference at a gauge puts local mean sea level in a terrain model's frame, with no national datum and so no unstated
period ([the research note](../research/terrain-models-vertical-datum-2026-11-07.md)). The practitioner, 2026-11-09,
asked whether this *"can be done by hand on an empty canvas"*, chose to make it so, and added: *"For large files let's
also give the user the option to download the large files to his laptop so it's available for future use."*

## What exists

| Widget | What it does today | What it lacks here |
| --- | --- | --- |
| Raster input | Reads a GeoTIFF you choose from this device, whole | A file at a URL; a file too large to hold whole |
| Sample raster at points | The raster's value at each point | Reading only the cells at the points |
| Sample satellite files | Reads Sentinel-5P NetCDF (h5wasm) and MODIS GeoTIFF (geotiff.js) by HTTP range, in a worker | Anything not found through a satellite catalogue |

The machinery for reading in parts exists; it is tied to the satellite catalogue.

## What was measured, 2026-11-09

| File | Size | Read by range from a browser? |
| --- | --- | --- |
| `us_nga_egm08_25.tif`, cdn.proj.org | 80,585,622 bytes | **Yes**: any origin allowed, ranges served |
| `DTU25MSS_WGS84.nc`, data.dtu.dk | 2,947,503,242 bytes | **No**: figshare's redirect allows it, DTU's storage server sends no `Access-Control-Allow-Origin` and refuses the preflight |

DTU25MSS is NetCDF-4: `mss` and `sigma`, 18,001 × 36,000 float64, gzip, in blocks of 1001 × 2000. The Philippines,
4–22° N and 116–128° E, spans 6 blocks: 30.0 MB compressed for `mss`, 32.7 MB for `sigma`.

## Proposed, revised 2026-11-09 after reading the code

Raster input already imports a **window around the study area** from a GeoTIFF and keeps it in the project, and
geotiff.js reads a local file in slices, so a large GeoTIFF on the laptop is already read in parts. Sample raster
samples the kept window. So, in two steps, adding no widget:

**Step 1, GeoTIFF:**

1. **A GeoTIFF at a URL**: Raster input reads only the window around the study area, by HTTP range, and keeps it as a
   local import is kept.
2. **Point-registered grids**: a grid whose values sit at nodes (`PixelIsPoint`), as EGM2008 is published, is read
   with its window shifted half a cell, and the registration is recorded.
3. **"Download the whole file"**, offered with a URL source, with its name, source and size: a plain link, so the
   person keeps the file on the laptop and can choose it as a local file.
4. Raster input and Sample raster move to the standard Inspector.

**Step 2, NetCDF** (the practitioner, 2026-11-09: *"Can NetCDF be an input for raster input?"*): a latitude–longitude
NetCDF grid as a local file, read in parts by h5wasm, which Fieldwork already ships for Sentinel-5P: the variable
named, the grid checked to be regular, and the window around the study area kept as a GeoTIFF window is. A NetCDF at a
URL works only where its host allows cross-origin reads, which DTU's does not.

**Measured for step 1:** EGM2008 on cdn.proj.org states `GeographicTypeGeoKey` 4326, `GTRasterTypeGeoKey` 2
(`PixelIsPoint`) and a vertical key 4979, origin −180, 90 at 2.5′: Raster input refused it. DeltaDTM's tiles are
EPSG:4326, area cells, zstd-compressed. The subsets published in the example are written EPSG:4326, area cells,
deflate.

## What was built, 0.71.0

- **Raster input reads a GeoTIFF at a URL** (Or a GeoTIFF at a URL, Read): only the window around the study area, by
  HTTP range, kept in the project as a local import is. Beside it, **Download the whole file**, with its size from
  the server, so the person can keep it on the laptop and choose it as a local file later.
- **Point-registered grids** (`PixelIsPoint`) are read with the origin shifted half a cell, and
  `sourceRegistration: PixelIsPoint` is recorded.
- **Sample raster** offers **bilinear between the four nearest cell centres** beside the containing cell, chosen in
  Configure… and stated in the receipt. A missing value among the four gives no value.
- Raster input and Sample raster are on the standard Inspector and dialog (186).
- The worked example's third workflow, built from its manual: EGM2008 read from cdn.proj.org; DeltaDTM and DTU25MSS as
  subsets the example publishes, cut on the sources' own cells by `scripts/make_grid_subsets.py`, because neither
  publisher's server allows a browser to read by range.

## What was built, 0.72.0

- **Raster input reads a NetCDF-4 grid from this device**, in parts: the file is mounted in a worker (WORKERFS) and
  h5wasm decompresses only the chunks the window touches. One variable, chosen where there are several; the fill value,
  scale factor and offset applied; read as point-registered; a file stored south first, as DTU25MSS is, turned over.
  The file's chunks are its blocks, so the 64 MB decoding budget a GeoTIFF's tiles meet applies to it too.
- **h5wasm is saved for offline use** (5.7 MB), at the practitioner's word, 2026-11-09: *"Pre cache h5wasm"*. A file
  kept on the laptop is the case offline reading is for.
- Not built: a NetCDF at a URL. DTU's host forbids a browser's range reads anyway.

## What was run, 2026-11-09

- The manual's third workflow, by hand in Chromium on an empty canvas (`tests/sea-level-from-scratch.browser.mjs`):
  **16 of 194** facilities read Reaches. Python on the source tiles (rasterio, pyproj) gives the same 16; 0 of 194
  heights differ.
- Found on the way: a first subset cut at bounds between DeltaDTM's cells was resampled, and one facility read its
  neighbour's height (17, not 16). The script now cuts on the source grid and asserts it.
- NetCDF, in Chromium (`tests/netcdf-raster.browser.mjs`): a 121 × 101 grid shaped like DTU25MSS (south first, gzip
  chunks, packed integers, a fill value, a second variable), made by `tests/fixtures/make-netcdf-grid.py`. Both
  variables offered; every cell kept within 0.6 mm of the value the grid was made from, the fill value
  kept as missing, the window starting on the right node.
- **EGM2008 at the Manila gauge**, 14°35′ N 120°58′ E, read bilinearly by Fieldwork's own code from a cut of PROJ's
  grid: **43.0092 m**, against pyproj's 43.009 m. A unit test now holds it.
- **Validation Lab check 42**: the third workflow's chain, composed from Fieldwork's own functions, against rasterio,
  SciPy and NumPy. EGM2008 and DTU25MSS at the sites within 1e-9 m, every ground height exactly rasterio's cell,
  every height within 1e-9 m, **16 of 194** Reaches on both sides; no facility within 1 mm of the line.
- **DTU25MSS's own file, 2,947,503,242 bytes, read in parts on this laptop**, Chromium, 2026-11-09
  (`tests/netcdf-large-local.browser.mjs`, run where `DTU25MSS` names a local copy): header and variables in 0.3 s, the
  13 × 17 window around Manila read and kept in 0.4 s; all 221 nodes **identical** to the example's subset cut by h5py.
  The first run reported 4.4 cm: the test took the subset's tie point, a node, for a cell corner, and compared
  neighbouring nodes. The test was wrong, not the reader. Bytes read were not measured: a file read through WORKERFS
  makes no requests to count.
- WebKit runs in CI, not here.

## Validation it commits to

- A Validation Lab check: values at the eight gauges against h5py (DTU25MSS) and pyproj (EGM2008).
- The gauge values agree with the reads made by hand on 2026-11-09: EGM2008 at Manila 43.009 m.
- Browser, Chromium: a URL raster sampled at points, and a local file read in parts, with the requests and bytes said.

## What this does not establish

That mean sea surface from altimetry is right at the coast, where it is least certain; DTU's `sigma` is carried beside
each value for that reason. That 1993–2012 is 1995–2014: the two-year shift is a stated correction from the gauge's
own trend, not a measurement.
