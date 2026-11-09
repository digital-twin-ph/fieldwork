# 198 · A published grid, read at points

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** asked. Designed, not built; the grids' values at the gauges and a first facility count were made in
Python (the research note), for the canvas to reproduce. Manila only for now: the practitioner, 2026-11-09, *"For now
let's stick to Manila"*; the other seven gauges, with Find health facilities near each, are a later workflow.

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

## Proposed

**Extend Raster input and Sample raster at points; add no widget.**

1. **Raster input takes a file at a URL** (GeoTIFF, or a NetCDF latitude–longitude grid with a variable named), kept
   as a reference with its size, and not loaded whole.
2. **Or a file on this device, read in parts**: a large file chosen from the laptop is read by slices of the file, not
   held whole.
3. **"Download the whole file"**, offered wherever a file is read from a URL, with its name, source and size: a plain
   link the person saves to their laptop and can then choose as in 2. A link needs no cross-origin permission, so it is
   also the way to a file a browser cannot read in parts, such as DTU25MSS.
4. **Sample raster at points reads only the cells at the points** where the raster is a reference, and says how many
   requests and bytes it read.
5. Both widgets move to the standard Inspector, as touched widgets do.

**The sea-level example then needs no script:** the gauges, EGM2008 from the PROJ CDN, DTU25MSS from the laptop (or a
Philippine subset published in the example repository with credit), each sampled at the gauges, and the offset as a
computed value.

## Validation it commits to

- A Validation Lab check: values at the eight gauges against h5py (DTU25MSS) and pyproj (EGM2008).
- The gauge values agree with the reads made by hand on 2026-11-09: EGM2008 at Manila 43.009 m.
- Browser, Chromium: a URL raster sampled at points, and a local file read in parts, with the requests and bytes said.

## What this does not establish

That mean sea surface from altimetry is right at the coast, where it is least certain; DTU's `sigma` is carried beside
each value for that reason. That 1993–2012 is 1995–2014: the two-year shift is a stated correction from the gauge's
own trend, not a measurement.
