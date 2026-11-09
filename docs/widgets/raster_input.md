# Raster input

_Created 2026-11-09 · Updated 2026-11-09_

**A window of a GeoTIFF around the study area, kept in the project.** A population surface, a terrain model, a geoid.

## What it does

It reads a single-band GeoTIFF in latitude and longitude (WGS84, EPSG:4326) and keeps only the cells around the
connected study area, at the file's own resolution. Nothing is resampled or reprojected. What it keeps travels with the
project, so a run needs neither the file nor the connection again.

## What you connect

**Study area**: the window kept is the area's bounding box, with an optional margin of one cell.

## How to use it

The step's panel holds its **Name**, its study area, one sentence saying what it keeps, and **Configure…**:

| In Configure… | What it does |
| --- | --- |
| **GeoTIFF file** | Choose a file on this device. A large file is read in parts: only the window is read |
| **Or a GeoTIFF at a URL** | Give its address and press **Read**. Only the header and the window are fetched |
| **Download the whole file** | Offered with a URL, with the file's name, source and size: keep it on this laptop and choose it above to work without the connection |
| **Extra source coverage** | One cell more around the area, for clipping or for reading a value between cells near the edge |
| **Source metadata and citation** | Who made it, its terms, and how to cite it: entered by you, kept with the window |

**A grid whose values sit at nodes**, as a geoid grid's do, is read as the cells around those nodes, half a cell out,
and the panel says so.

## What it will not do

- **It will not reproject.** A GeoTIFF in another coordinate system is refused, named.
- **It will not read a file at a URL whose host forbids it.** A browser can read another site's file in parts only if
  that site allows it. Where it does not, **Download the whole file** still works, and the file is then chosen from
  this device.
- **It will not keep more than 262,144 cells.** A smaller study area keeps fewer.

## Where it is used

The Old Naledi example (a population surface) and the sea-level example (EGM2008, the mean sea surface and DeltaDTM
around Manila).
