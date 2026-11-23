# Raster input

_Created 2026-11-09 · Updated 2026-11-20_

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

**A window travels as its source, not its cells.** A country's window is hundreds of megabytes, so a workflow file or
project carries where the window came from, which part was kept, and its digest, not the cells. A GeoTIFF chosen on
this computer keeps the file's digest too. Opened on another computer, the step's Result says the window is not on this
device yet. **Configure…** then opens on **The kept window**: **Read the window again** for one read at a web address, or
a file chooser naming the same file, which is not the chooser for a new file below it.
The file is checked against the digest first, and the window read again against the window that was kept; either
differing is refused, and nothing is kept.

**The kept window is in the dialog.** Once it is on this device, **Configure…** shows its record (where it came from,
the part kept, its digest) and **Download GeoTIFF**, the kept window at native resolution with its georeferencing and
source metadata.

**The WorldPop or GRID3 file you were pointed to is recognised.** Chosen from disk under the name WorldPop gave it, its source
record fills in: the country and year, the release, WorldPop as provider, its licence, and its units, *people per
pixel*, which WorldPop's files do not carry themselves. Change any of it that says otherwise. A file under any other
name is not guessed at.

**Or GHS-POP**, the JRC's global population grid, for any country and every five years from 1975 to 2030 (2025 and
2030 are projections). Choose the year and press **Read the window from JRC's copy**: only the part of the global grid
over your study area is read, from JRC's copy on Amazon Web Services, so nothing is downloaded first, and the area read
is sent to that server. It counts residential population, spread over the volume of residential buildings, so it is
weaker where buildings are hard to see, and should not be set against GHS-BUILT in the same analysis.

The step's panel holds its **Name**, its study area, one sentence saying what it keeps, and **Configure…**, the standard
dialog: **Settings**, then **Preview** (the file's size in cells and the window kept), then **Decisions**. **Apply**
reads the window and keeps it, with a bar showing how much of the window has been read, then how much of a chosen file
has been checked; **Cancel** or × leaves the step as it was. A NetCDF file shows the words without the bar.

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

**A file at a URL is read in about twenty parts**, and the dialog says how far it has got. A part whose connection
drops is tried again, up to four times, with a longer pause each time. If the connection stays down, the dialog says
where it stopped; what was read is kept while the page is open, and **Apply** again carries on from there.

**A study area reaching past the raster** keeps the part the raster covers. The dialog says how far past which edge,
and the run records it as a data issue, *Area beyond the raster*. Two outlines of one country rarely agree at the
border: Botswana's provinces from geoBoundaries reach a little past WorldPop's file for Botswana. Only an area that
does not overlap the raster at all is refused.

## What it will not do

- **It will not reproject.** A GeoTIFF in another coordinate system is refused, named.
- **It will not read a picture.** A GeoTIFF of colour bands, such as a scanned map, is named as one and sent to
  Georeferenced map image, which draws it as ground; its colours are ink, not values to measure.
- **It will not read a file at a URL whose host forbids it.** A browser can read another site's file in parts only if
  that site allows it. Where it does not, **Download the whole file** still works, and the file is then chosen from
  this device.
- **It will not read classic NetCDF-3**, a satellite swath, or a grid on another projection. A NetCDF-3 file can be
  converted with `nccopy -k nc4`. **A NetCDF file at a URL** is not read yet: keep it on this laptop and choose it.
- **It will not keep more than 166.4 million cells**, nor a window of more than 1.1 GB. Past either, the raster is
  **streamed**: what is kept, and drawn on a map, is a copy in blocks (10 by 10 cells for a country at 100 m), each block
  summed for a count such as people and averaged for a value such as elevation. Sample a raster reads the full cells
  from the source at each run, a strip at a time. Read from an address, that works on any device; read from a file on
  this computer, the file is chosen again in each new session, from the run's stop message or here, and checked against
  the file first chosen; Chrome and Edge remember it, and ask only to allow reading it again. A NetCDF file is not
  streamed yet.

## Where it is used

The sea-level example (EGM2008, the mean sea surface and DeltaDTM around Manila).

## History

### 2026-11-23 · The picker starts at what the step holds (0.14.1)

**Configure…** offers where to get a population file. On a step that already held a window, it started at WorldPop's
newest year, whatever the step held: a GRID3 2025 step's dialog read *Population (WorldPop)*, with 2026 offered. It now
starts at the step's own source and year. Nothing the step held was changed by it.

### 2026-11-19 · A window too large to keep is streamed (0.13.0)

GHS-POP over DR Congo was refused: about 519 million cells of 8 bytes, 4.2 GB, past the 2.1 GB a tab decodes at once
(found running the population rasters example). WorldPop's 4-byte cells fit; GHS-POP's did not. Chosen
over holding GHS-POP's cells in 4 bytes, which would have changed its values in the eighth figure. A window past either limit is now kept as a copy in blocks and read from its source in strips by Sample
a raster. Checked on a small GeoTIFF read by terrio (`tests/raster-stream.test.mjs`): the blocks equal their cells'
sums and means. On DR Congo in Node.js, the copy in blocks of 10 took 6.3 s (Sample a raster's manual, History). **Not yet
measured in a browser tab.**

### 2026-11-20 · Streamed by file or by address; chosen again from the stop message (0.14.0)

A window past what a tab holds, 166.4 million cells or 1.1 GB, is streamed rather than refused, by file or by address:
GHS-POP's 12.3 GB global file over DR Congo's provinces is applied in about a minute and a half. A window saved before
under the old limit is still read and drawn. When a run needs a streamed file again, its stop message offers to choose
it; Chrome and Edge remember the file across sessions. **Configure…** always opens, even where the kept bytes cannot be
read on this device.

---

*How this widget is built, what it assumes, and what has been measured about it:
[docs/widget-specs/raster_input.md](../widget-specs/raster_input.md).*
