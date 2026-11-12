# Raster input

_Created 2026-11-09 · Updated 2026-11-11_

**A window of a GeoTIFF or NetCDF grid around the study area, kept in the project.** A population surface, a terrain model, a geoid.

## What it does

It reads a single-band GeoTIFF in latitude and longitude (WGS84, EPSG:4326), or one grid from a NetCDF-4 file, and
keeps only the cells around the connected study area, at the file's own resolution. Nothing is resampled or reprojected. What it keeps travels with the
project, so a run needs neither the file nor the connection again.

## What you connect

**Study area**: the window kept is the area's bounding box, with an optional margin of one cell.

## How to use it

**Population from WorldPop, for the study area's country.** Configure… offers WorldPop's population raster for the
country the study area states, in either release, under *Population source*:

| Release | Years | What it is |
| --- | --- | --- |
| **Global2 R2025A** | every year, 2015 to 2030 | Constrained to settlements, 100 m, national totals scaled to the UN World Population Prospects 2024. An alpha release (September 2025) that WorldPop says may change. 242 countries. Cite doi:10.5258/SOTON/WP00839 |
| **Global1** | every year, 2000 to 2020 | Unconstrained, 100 m |

Choose the year your project needs; a year chosen in one release stays chosen in the other where both publish it. The
download link gives the file's size, where it is known, and the time it takes. The country is
set once, on the study area; where the area states none, Configure… asks for it and keeps it there. **Across a
border**, where the study area states several countries, Configure… offers those, one file at a time: this step reads
one file, so the part of the area in another country has no population from it.

**Or from GRID3**, under *Population source*: GRID3's 2025 estimates for the 52 countries of sub-Saharan Africa, one file
per country (Botswana's is 11.6 MB, against WorldPop's 293 MB). They are modelled top-down, from national projections
spread over settled areas; they are not official government statistics and carry no uncertainty layer. Where GRID3
publishes nothing for the country, the dialog says so. The download is your browser's, as WorldPop's is.

**Or GHS-POP**, the JRC's global population grid, for any country and every five years from 1975 to 2030 (2025 and
2030 are projections). Choose the year and press **Read the window from JRC's copy**: only the part of the global grid
over your study area is read, from JRC's copy on Amazon Web Services, so nothing is downloaded first, and the area read
is sent to that server. It counts residential population, spread over the volume of residential buildings, so it is
weaker where buildings are hard to see, and should not be set against GHS-BUILT in the same analysis.

The step's panel holds its **Name**, its study area, one sentence saying what it keeps, and **Configure…**, the standard
dialog: **Settings**, then **Preview** (the file's size in cells and the window kept), then **Decisions**. **Apply**
reads the window and keeps it; **Cancel** or × leaves the step as it was.

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

**WorldPop's list of countries and years** is kept with Fieldwork, since WorldPop's site does not let a browser read
it. It is checked against WorldPop's folders every week; a change comes as a pull request to the repository, and a newer
release is reported for a person to read before it is offered.

## What it will not do

- **It will not reproject.** A GeoTIFF in another coordinate system is refused, named.
- **It will not read a file at a URL whose host forbids it.** A browser can read another site's file in parts only if
  that site allows it. Where it does not, **Download the whole file** still works, and the file is then chosen from
  this device.
- **It will not read classic NetCDF-3**, a satellite swath, or a grid on another projection. A NetCDF-3 file can be
  converted with `nccopy -k nc4`. **A NetCDF file at a URL** is not read yet: keep it on this laptop and choose it.
- **It will not keep more than 262,144 cells.** A smaller study area keeps fewer.

## Where it is used

The sea-level example (EGM2008, the mean sea surface and DeltaDTM around Manila).
