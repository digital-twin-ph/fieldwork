# 209 · Three population rasters and the census, Botswana

_Created 2026-11-12 · Updated 2026-11-12_

**Status:** asked. The practitioner, 2026-11-12, asking when a raster worked example would come, then of Botswana's
population by district: *"For #1 we should compare the three sources of population rasters"*. Chosen the same day, from
options: Botswana's 2022 census as the reference, districts (ADM1), and each source's **share of the country**.

## The question

Where do WorldPop, GRID3 and GHS-POP put Botswana's people, district by district, and how does each compare with where
the 2022 census counted them?

## The sources

| Source | For Botswana | Grid | Licence |
| --- | --- | --- | --- |
| WorldPop Global2 R2025A, constrained | 2025 | 100 m; 11,248 × 10,953 cells, 16.2 MB | CC BY 4.0 |
| GRID3 SSA 2025 v1.0 | 2025 | about 100 m; 11.6 MB | CC BY 4.0 |
| GHS-POP R2023A | 2025, a projection | about 90 m, from one global file read by range | CC BY 4.0 |
| Population and Housing Census 2022 | 28 census districts, 2,359,609 in all (Statistics Botswana, *Population Distribution, Structure and Density in Botswana*, March 2024, Table 1) | none | No open licence: free to use if Statistics Botswana is acknowledged as the source and the analysis is said to be the user's own processing (its terms of use) |

**Not independent.** WorldPop and GRID3 are both made by WorldPop at Southampton; GHS-POP by the European Commission's
Joint Research Centre. Two sources agreeing is weaker evidence than it looks when they share their methods. All three
spread a national total over cells; none counts people.

## Why shares

A share of the country separates where a source puts people from how many it counts in all. The census is three years
older than the rasters, and the three rasters start from different national totals, so totals would mostly compare those
starting points.

## The workflow, from widgets that exist

| Step | Widget |
| --- | --- |
| Botswana's districts | Study area, picked from geoBoundaries: ADM1, gbOpen, 10 units, 2017, **CC BY-SA 2.0** (from OpenStreetMap; corrected 2026-11-12, first written here as CC BY 4.0), into which the 28 census districts fall whole; or ADM2 of gbHumanitarian, 28 units, 2021, CC BY 3.0 IGO, if its units are the census districts |
| Each raster, its window over the country | Raster input, three times |
| Each district's total | Sample a raster over the study area's units, three times |
| The census by district | Table input, fetched from where it is published |
| One table: a district, each source's total | Relate, three times |
| Each source's share of the country | Total within groups, shares (experiment 191) |
| Shares side by side, and on a map | Chart; Map |

Whether shares by column fit Total within groups as it stands, or need a step of their own, is to be checked before any
widget is proposed.

## Zonal statistics, per district and source

The practitioner, the same day: *"Then compute zonal statistics."* Sample a raster over areas already gives the sum (the
total), the cells added, the cells with no data and those beyond the raster, and, when asked, the mean, smallest and
largest cell. Chosen from options, to be added in the same way, when asked for:

| Column | Definition |
| --- | --- |
| `density_km2` | the total over the area's size on the ground, in km², the size computed as Calculate area does, on the sphere its manual states (Validation Lab check 05: within 0.6 % of the geodesic size between the equator and 60°) |
| `cell_median` | the middle value of the cells with a value; of two middle values, their mean |
| `cell_sd` | the standard deviation of the cells with a value, of those cells as the whole population (divided by n, as rasterstats and numpy give by default) |
| `cells_populated`, `share_populated` | cells with a value above zero, and their share of the cells with a value |

A median and a standard deviation of cells are per cell, as the mean is: on a latitude-longitude grid cells shrink
towards the poles, which in Botswana (18 to 27° S) makes a cell about 6 % smaller in the south than in the north. The lab check
recomputes each, with rasterio and numpy, per district and source.

## What must exist first: a raster fetched from where it is published

A kept window travels inside the project, as bytes. Botswana's whole window is up to 493 MB a source (measured
2026-11-12), so three cannot go in an example repository or a workflow file (at most about 177 MB of files, measured
the same day). A table already solves this: one fetched from where it is published keeps its address and digest, is
read again on another device, and is refused if its digest differs. Raster input can read a window from a URL by range,
but keeps the bytes. **Proposed:** a window read from a URL keeps the address, the window and the digest of the kept
bytes; a project leaving the device carries those without the bytes; on another device the window is read again, by
range, and refused if its digest differs.

**Downloaded to the computer, first.** The practitioner, the same day: *"The example should allow download to computer
as these files tend to be big."* So the example's way in is to download each source file once, with its name, size and
host stated before the download, and choose it on the computer, where it is read in parts and works without a
connection; reading by range from the host stays the alternative. Each step keeps the source file's digest as well as
the window's, so a file chosen on the computer is checked as the one the example was built from before its window is
read, and a window read by range is checked against the kept window's digest. The manual lists the three downloads,
each with its file name, size and licence.

**Open: GHS-POP's download.** WorldPop's and GRID3's Botswana files are 16.2 and 11.6 MB. GHS-POP is published as one
global file per epoch, several gigabytes at 3 arc-seconds, which no one should download for one country. The JRC also
publishes it in tiles; whether the tiles covering Botswana are in the same grid, and how large, is to be checked before
building.

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| A share is not a count: a district's share says nothing about how many people a source puts there | Limitation, said in the chart's caption and the step's sentence |
| A modelled grid is not a census | Limitation, in each Raster input's provenance and the example's README |
| 2022 is not 2025 | Limitation, said where the census is compared |
| A window read again is the window read before | Run-time check: its digest |
| A file chosen on the computer is the file the example was built from | Run-time check: the source file's digest, before its window is read |

## Validation it commits to

- A lab check: each district's total from each raster, recomputed with rasterio from the same files and boundaries, and
  each share.
- The window read again on another device has the digest of the one kept.
- **Practitioner observation, before it is known:** whether "share of the country" is read as a share and not as a
  population, on the chart and the map.

## What this does not establish

That any source is right. The census is the closest thing to a count here, and it is three years older and reported by
census district, which may not match the boundaries' units one for one.
