# 209 · Three population rasters and the census, Botswana

_Created 2026-11-12 · Updated 2026-11-13_

**Status:** tried — built and run for Botswana and Rwanda, 2026-11-13, every district's share equal to rasterio's;
Chromium. Validation Lab check 50 agrees, 2026-11-13. The practitioner, 2026-11-12, asking when a raster worked example
would come, then of Botswana's population by district: *"For #1 we should compare the three sources of population
rasters"*; 2026-11-13: *"Let's finish 209 as it helps refine raster input."* Chosen on 2026-11-12, from
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

## The 28 census districts, matched by name, 2026-11-12

The practitioner chose the census's own 28 districts if the boundaries match. geoBoundaries' gbHumanitarian ADM2 for
Botswana (UNFPA via HDX, 2021, CC BY 3.0 IGO; `geoBoundaries-BWA-ADM2.geojson`, 1,383,000 bytes, release 9469f09) has
28 units, and each census district names exactly one of them. Six are spelled differently:

| Census, Table 1 | Boundary `shapeName` |
| --- | --- |
| Central Serowe /Palapye | Serowe Palapye |
| Central Mahalapye, Central Bobonong, Central Boteti, Central Tutume | Mahalapye, Bobonong, Boteti, Tutume |
| Delta | Ngamiland Delta |
| CKGR | Central Kgalagadi Game Reserve |
| Sowa | Sowa Town |

The other 22 match as written. **So the comparison is at the 28 census districts**, and the ten ADM1 districts are not
needed. **Not established:** that the outlines are the ones the census counted within. The census publishes no
boundaries, so the match is by name, and the boundaries represent 2021 against a census of August 2022.

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
| Shares side by side, and on a map | Chart; Map, as a classed choropleth, the form [210](210-proposing-a-chart-or-a-map-from-the-data.md) proposes for a share on areas |

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

## Rwanda as a second case, 2026-11-13

The practitioner: *"Can Rwanda also be included in the raster comparison example?"* Yes: the opposite of Botswana, small
and densely settled. Its census (NISR, PHC5, 16 to 30 August 2022, *Main Indicators*, Table 1) gives 30 districts adding
to 13,246,394, and geoBoundaries' gbOpen ADM2 (from Open Data Rwanda, 2012, CC BY 4.0) has 30 units whose names match
all 30 as written. NISR's terms could not be read (its site returned server errors); the practitioner chose to use the 30
district counts, credited to NISR, stating that no terms were found. The workbook `PHC5-2022_Main_Indicators.xlsx`, 581,274
bytes, matches the 568 KB file NISR lists, updated 4 February 2025.

**Found on the way:** the workbook in the example repository's `source/`, named as Botswana's census in this record's first
draft, is Rwanda's. Botswana's 28 counts are Statistics Botswana's report, read and transcribed 2026-11-12; their total is
2,359,609.

## First result, 2026-11-13: two of the three sources agree with the census by construction

Computed with rasterio (`rasterio.mask`, `all_touched=False`, each source's no-data excluded) over the same boundaries,
before any Fieldwork step was built:

| | Census 2022 | WorldPop 2025 | GRID3 2025 | GHS-POP 2025 |
| --- | --- | --- | --- | --- |
| Botswana, people | 2,359,609 | 2,541,726 | 2,541,726 | 2,764,784 |
| Largest district gap from the census share | | 0.02 points | 0.02 points | 4.09 points |
| Rwanda, people | 13,246,394 | 14,403,490 | 14,403,921 | 14,711,409 |
| Largest district gap from the census share | | 0.01 points | 0.01 points | 1.77 points |

WorldPop's and GRID3's district shares equal the census's because both spread projected census counts by district over
settlements: at the districts, agreement with the census is their input coming back. GRID3's grid is largely WorldPop's:
same size and shape, 98 % of Botswana's cells and 63 % of Rwanda's identical. GHS-POP, built by the JRC its own way, is
the independent comparison. **Decided, the practitioner, the same day:** keep the comparison at the census districts and
say why: the near-identical shares are the lesson, stated in the example's README and the chart's caption. A comparison
below the districts, where the models must place people themselves, is not built.

## Built, 2026-11-13

Each country is one workflow of 16 steps in the example repository `example-population-models-census` (6a3140f):

| Step | Widget |
| --- | --- |
| The census districts | Study area: Rwanda's 30 from the picker (gbOpen ADM2); Botswana's 28 from the file (gbHumanitarian ADM2) |
| Each source over the country | Raster input, three times: WorldPop and GRID3 from the downloaded file, GHS-POP read by range from the JRC's copy |
| Each district's total | Sample a raster over the study area's districts, three times |
| The census | Tabular data, from the example's CSV |
| One table | Append rows, four tables, a `source` column naming each |
| Each district's share of the country, by source | Total within groups by source and district, shares within source |
| The shares | Select rows; Table; Chart, one panel per source |
| GHS-POP's shares on the map | Select rows; Join a table to the study area; Map |

**What refining Raster input took, found by building it.** Each was found by running a country, and each is in 0.111.0:

| Found | Changed |
| --- | --- |
| A window's bytes went into every export: three national windows would not travel | A window read from a web address or a file whose digest is kept travels as its source, window and digest; on another device it is read again and refused if either differs |
| Rwanda's Ngoma refused for a 1 m² sliver in its outline | A part with no area at all is refused; a very small one is not |
| Sample a raster totalled each part of a district apart, so Ngoma's sliver had no total and every share of the country was unknown | Each named district totalled over all its parts |
| GHS-POP's global file refused: 432,002 columns reach 180.0012° | Two cells beyond the world's edge allowed |
| GRID3's file not recognised by its name | GRID3's names recognised, as WorldPop's are |
| Botswana's three windows stalled the run at step 6 of 16 | Cells as typed arrays; a raster let go once read; a kept window read in place, not through the browser's FileReader, which refused 1 GB. The caps measured again: 123.3 million cells, 1.1 GB of blocks |
| Sample a raster's areas could not reach a table step | A polygon layer arrives at a table input as a table, one row per area |

Zonal statistics as chosen above are in Sample a raster's option: the mean, median, population standard deviation,
smallest and largest of the cells with a value, cells above zero and their share, the area's size in km² on the sphere and
the total per km².

## Validation record, 2026-11-13, Chromium

| Check | Result |
| --- | --- |
| `tests/population-models-from-scratch.browser.mjs`, Rwanda: 30 districts × 4 sources, each share against rasterio's totals over the same files, rounded as the step rounds | 120 of 120 equal, 46 s |
| The same, Botswana | 112 of 112 equal, 1.2 min |
| `tests/population-example-opens.browser.mjs`: the pinned example opened, Rwanda's three windows read again (two files, one by range) and checked, then run | passes; Gasabo 6.6 % in the census, WorldPop and GRID3 |
| `tests/raster-reread.browser.mjs`: a window exported without its bytes, a different file refused, the right one read again | passes |
| `tests/raster-areas-scanline.test.mjs`, `tests/sample-raster-areas.browser.mjs` (zonal statistics by hand) | pass |
| Validation Lab check 50 (lab 4e04d1b): every district's cells, total and share recomputed with rasterio and GDAL's rasterizer from the same files, read by digest | agrees: 174 cell counts equal, totals within 8e-14 relative, 232 shares within 4e-15; CPython only, as the browser kernel cannot hold the rasters |

**The practitioner observation above has not been made.**

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
