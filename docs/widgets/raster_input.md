# Raster input

_Created 2026-11-09 · Updated 2026-11-10_

**A window of a GeoTIFF or NetCDF grid around the study area, kept in the project.** A population surface, a terrain model, a geoid.

## What it does

It reads a single-band GeoTIFF in latitude and longitude (WGS84, EPSG:4326), or one grid from a NetCDF-4 file, and
keeps only the cells around the connected study area, at the file's own resolution. Nothing is resampled or reprojected. What it keeps travels with the
project, so a run needs neither the file nor the connection again.

## What you connect

**Study area**: the window kept is the area's bounding box, with an optional margin of one cell.

## How to use it

**Population from WorldPop, for the study area's country.** Configure… offers the WorldPop population raster of the
country the study area states, a year to choose, and a download link with its size and the time it takes. The country is
set once, on the study area; where the area states none, Configure… asks for it and keeps it there. **Across a
border**, where the study area states several countries, Configure… offers those, one file at a time: this step reads
one file, so the part of the area in another country has no population from it.

The step's panel holds its **Name**, its study area, one sentence saying what it keeps, and **Configure…**:

| In Configure… | What it does |
| --- | --- |
| **GeoTIFF or NetCDF file** | Choose a file on this device. A large file is read in parts: only the window is read |
| **Variable** | Shown for a NetCDF file holding more than one grid: choose which. DTU25MSS, for one, holds the mean sea surface and its uncertainty |
| **Or a GeoTIFF at a URL** | Give its address and press **Read**. Only the header and the window are fetched |
| **Download the whole file** | Offered with a URL, with the file's name, source and size: keep it on this laptop and choose it above to work without the connection |
| **Extra source coverage** | One cell more around the area, for clipping or for reading a value between cells near the edge |
| **Source metadata and citation** | Who made it, its terms, and how to cite it: entered by you, kept with the window |

**A grid whose values sit at nodes**, as a geoid grid's do, is read as the cells around those nodes, half a cell out,
and the panel says so. A NetCDF grid always is: its latitudes and longitudes are where its values sit.

**A NetCDF file** must be NetCDF-4 (HDF5 inside), with one-dimensional coordinates named `latitude` or `lat` and
`longitude` or `lon`, evenly spaced, west to east. Its fill value, scale factor and offset are applied. It works
offline once Fieldwork has been opened online, since its reader is saved with the application.

## What it will not do

- **It will not reproject.** A GeoTIFF in another coordinate system is refused, named.
- **It will not read a file at a URL whose host forbids it.** A browser can read another site's file in parts only if
  that site allows it. Where it does not, **Download the whole file** still works, and the file is then chosen from
  this device.
- **It will not read classic NetCDF-3**, a satellite swath, or a grid on another projection. A NetCDF-3 file can be
  converted with `nccopy -k nc4`. **A NetCDF file at a URL** is not read yet: keep it on this laptop and choose it.
- **It will not keep more than 262,144 cells.** A smaller study area keeps fewer.

## Where it is used

The Old Naledi example (a population surface) and the sea-level example (EGM2008, the mean sea surface and DeltaDTM
around Manila).
