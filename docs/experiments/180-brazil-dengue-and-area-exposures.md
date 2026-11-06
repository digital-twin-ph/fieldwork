# 180 · Brazil dengue, and satellite exposures over areas

_Created 2026-11-06 · Updated 2026-11-06_

**Status:** tried. The data are checked and the outcome half is built: two workflows in the example repository, played
back in Chromium. The satellite half is not designed yet.

## The task

The practitioner, 2026-11-05: *"Let's do NYC worked example for satellite, then Brazil."* Then, 2026-11-06: *"After
this start the dengue work."* The worked example is the primary one in the practitioner's
[research note](../research/remote-sensing-epidemiology-worked-examples.md.txt): *"Do satellite-derived temperature
and vegetation measures improve prediction of municipal dengue incidence beyond seasonal patterns and historical
notifications?"* Its repository is `digital-twin-ph/example-2024-brazil-dengue`, created by the practitioner on
2026-11-06 and empty. The year is 2024, Brazil's largest dengue epidemic on record.

The note's own first step, adopted here: *"Verify Brazil source URLs, actual files, licenses, geographic identifiers,
time coverage, and missingness."*

## The widgets, examined first

Inventoried by port on 2026-11-06, before proposing anything. Nothing summarises a raster or a satellite file over
polygons. The closest:

| Need | Closest widget | What it has | What it lacks |
| --- | --- | --- | --- |
| Which cells fall in a municipality | Clip raster | `rasterCellPredicate`: cell centre or all-touched, lab check 02 against rasterio | Clips to one area; produces a raster, not a value per polygon |
| One value per polygon | Summarize points to polygons | Polygons in, polygons with a value out | Counts points, not cells |
| A time series from satellite files | Sample satellite files at points | Files × points → one row per point per date, gaps named; lab check 35 | Points, not areas; reads Sentinel-5P NetCDF only |
| Values from a raster | Sample raster at points | Reads a raster | Points; EPSG:4326 only |
| Municipal boundaries | Study area (geoBoundaries) | ADM levels by country, kept whole since 0.30.0 | Not tried at 5,570 units |
| Weekly counts | Cases by period, Group table | Weeks | Epidemiological weeks as Brazil numbers them, not checked |

The gaps the note already named in [179](179-eo-and-stac-for-the-nyc-monitors.md) stand: area exposures, MODIS's
sinusoidal projection, lags, negative binomial.

## Data readiness, 2026-11-06 (metadata and a few rows only)

| Source | Found | For a browser |
| --- | --- | --- |
| InfoDengue API, `alertcity` | Answers anonymously, per municipality (IBGE geocode) per epidemiological week: cases, estimated cases, population, incidence per 100,000, Rt, temperature and humidity. Rio de Janeiro, 2024 weeks 1–3, read | **No CORS header**, with or without an `Origin`, so a page on GitHub Pages cannot read it. Licence and terms not yet found |
| Zenodo 22029053, DATASET_MULTIMODAL_V8 | CC BY 4.0, 2010–2025; `dataset_benchmark_v1.parquet` 157.3 MB, `dataset_multimodal_v8.parquet` 564.9 MB, a README | **CORS open** (`access-control-allow-origin: *`). The size has not been tried in a browser; contents not read |
| Planetary Computer `modis-11A2-061` | 8-day land surface temperature from 2000, `LST_Day_1km`, `LST_Night_1km`, `QC_Day`, `QC_Night`; licence "other" | Not opened. MODIS sinusoidal, which Raster input refuses (179) |
| geoBoundaries `BRA/ADM2` | 5,570 units, IBGE via OCHA ROLAC, 2020, CC BY 3.0 IGO | Not tried at this size |

**Pilot: one state.** The practitioner, 2026-11-06, choosing among one state, one metro region and all of Brazil:
*"One state"*.

## The benchmark file, read 2026-11-06

Downloaded with the practitioner's approval to their Downloads folder, outside every repository:
`dataset_benchmark_v1.parquet`, 157,256,402 bytes, MD5 `7e9b2a0788850c726c1b3947a857acf4` as Zenodo states it,
SHA-256 `c174960e20c890cc6c3f7f4cdcab01714c498324ed7b5a3590d70c937f49ee93`. Read with hyparquet in Node, the
reader Fieldwork uses in the browser. The README (464 bytes) says only that it is the benchmark for machine-learning
experiments, target `p_inc100k`.

| Found | |
| --- | --- |
| Shape | 800,000 rows, 87 columns, one row group, Snappy. Written by Arrow 18.1.0 |
| **A sample, not a series** | Exactly 50,000 rows for every year 2010–2025. In 2024 Minas Gerais has 7,674 rows for 853 municipalities: about 9 of 52 weeks each. **No lags, epidemic curves or weekly models can be built from it** |
| Columns | InfoDengue's own (cases, estimated cases, Rt, incidence, population, temperature, humidity), weekly rainfall, NDVI and EVI, LST day and night with standard deviations, `n_pixels`, `n_tiles`, land cover shares, census variables, ENSO indices, and precomputed lags and rolling means |
| Missing in 2024 | `LST_Day_mean`: Minas Gerais 316 of 7,674 rows, São Paulo 30 of 5,735, Rio de Janeiro 3 of 805. `NDVI_mean`: none in any state, which for a satellite index suggests it was filled or composited; not established |

So the exposures are already computed per municipality-week by the dataset's authors, by a method this file does not
state. Fieldwork computing them itself from MODIS, and comparing, is the satellite half of the example. The full
file, 564.9 MB, is needed for the weekly series.

**State: Rio de Janeiro.** The practitioner, 2026-11-06: *"Rio de Janeiro"*, of Rio de Janeiro, Minas Gerais and
São Paulo.

## The full file, Rio de Janeiro 2024, read 2026-11-06

Downloaded with the practitioner's approval to their Downloads folder: `dataset_multimodal_v8.parquet`, 564,861,145
bytes, MD5 `776662f065ea4580c91a255abe1d78f8` as Zenodo states it, SHA-256
`9de15d8291e7d301f21641232e014110c8a31d89993dbfcd397897181925a3b8`. 4,701,298 rows in 5 row groups; 14 columns of
every row read by hyparquet in Node in 4.4 s.

| Found | |
| --- | --- |
| Coverage | `anio` 2024, `estado` RJ: 4,876 rows, all 92 municipalities, 53 rows each. No missing cases, population, NDVI, EVI or rainfall; LST day missing in 20 rows, LST night in 128. 426,479 cases |
| **Exposures are monthly, repeated weekly** | Across 2024's weeks each municipality has exactly 12 distinct LST day values, 11–12 LST night, 12 NDVI. Weekly rainfall varies (34–45 distinct). A weekly model on these columns treats four copies of one month as four observations |
| **Epidemiological weeks** | `SE` 202401 is absent. `SE` 202501, the week starting 2024-12-29, appears twice per municipality, labelled `semana` 1 and `anio` 2024: 92 municipality-week keys repeat. `anio` follows the calendar year of the week's start, not the epidemiological year |
| **`n_pixels` is not MODIS's** | Rio de Janeiro city: 1,200.3 km² and 2,738,692 pixels, about 438 m² a pixel, a ~20 m product. MODIS LST is 1 km. Which layer it counts is not stated |

Each is a finding about the source, to be shown, not cleaned away: the example reads the file as published, and
Fieldwork's data-quality tab is where these belong.

## The outcome half, built 2026-11-06

**The practitioner, 2026-11-06:** *"Yes"*, to building the outcome workflows with existing widgets first.

**The example repository** (`example-2024-brazil-dengue`) holds `data/dengue-rj-2024.csv`, the Rio de Janeiro rows
for 2024 with 18 of 87 columns as published (4,876 rows, SHA-256 `ce3ff323…`), and `geo/rj-municipalities.geojson`.
The boundaries come from geoBoundaries' Brazil ADM2, 41.5 MB, downloaded with the practitioner's approval. IBGE's own
boundary API timed out from here twice. All 92 names match the dataset's exactly; seven also name municipalities in
other states, and for each the one at Rio's border was kept. geoBoundaries' state file spells the state "Rio de
Jeneiro". The two rows of the doubled week differ only in rainfall, one of them 0.

| Workflow | Nodes | Result, checked against the CSV in Python |
| --- | --- | --- |
| How did the 2024 epidemic unfold across the state? | 4 | 51 weeks; peak in the week starting 2024-02-18 |
| Where was incidence highest? | 10 | 92 of 92 rows joined to 155 parts; 54.6 (Nilópolis) to 15,081 (Resende) per 100,000; 2,550.6 for the state, 423,795 cases among 16,615,526 |

Both keep to epidemiological year 2024 (2023-12-31 to 2024-12-28), which leaves out the doubled week.

**Five problems met by building it,** four of them defects, one already on record:

| Found | Gap in | Fix |
| --- | --- | --- |
| Rate with a denominator and Cases by period could not be added from the library: saving refused their empty fields. **Already known**: recorded in TODO and in `palette-add.browser.mjs` since October, which I missed until the gate failed on the shrunken list | Implementation: the save check required what only the run needs | Save refuses only a wrong value; the run refuses an empty one |
| A study area refused Quatis (a hole meeting its outline at one point) and Rio de Janeiro city (islands meeting at points), which shapely calls valid | Design: stricter than the OGC rule | A single-point touch between rings is accepted; a shared run of edge or a crossing is not |
| Reading the file wide was blocked by the 92 repeated municipality-weeks | Design: advice was enforced as a refusal, against *"diagnose, never refuse data"* | The advice stays; the wide read keeps every row and reports the repeats |
| Append rows refused cases and population together | Not a defect: they measure different things, and the wide read is the right route | None; the manual takes the wide read |
| Join a table to the study area reported each island of a municipality as a repeated name, about 30 notices | Implementation: parts counted, not units, since 0.30.0 kept every part | Distinct units counted |

**The practitioner observation, written before it is made:** whether a reader takes 15,081 per 100,000 in Resende,
about one resident in seven, as notified cases rather than infections, and whether the map's shading by rank reads as
a statement about risk.

## M1: what a MODIS land surface temperature file is, read 2026-11-06

The practitioner asked what MODIS would be read for; nothing had been opened. One file was then opened by range reads
only: `MOD11A2.A2024049.h13v11.061.2024061080931_LST_Day_1km.tif`, Terra, 18–25 February 2024, from Planetary
Computer's `modis-11A2-061`. It was read with rasterio and with geotiff.js 3.0.5, the library Fieldwork already ships.

| Question | Found |
| --- | --- |
| Products per period | **Two satellites**: MOD11A2 (Terra, mid-morning pass) and MYD11A2 (Aqua, early-afternoon pass), each an 8-day composite. Like Sentinel-5P's two streams, except these are different measurements, not two versions of one |
| Tiles for Rio de Janeiro state | Two: h13v11 and h14v11. 20 items for February 2024 (5 periods × 2 satellites × 2 tiles) |
| Format | Cloud-Optimized GeoTIFF, 1,200 × 1,200 cells of 1 km, 512 × 512 internal blocks, deflate, overviews at 2 and 4. One file per layer: `LST_Day_1km` 1,871,724 bytes, `QC_Day` 234,559 |
| Values | uint16, `scale_factor` 0.02, `units` K, fill 0, valid range 7,500–65,535, as the file's tags and the catalogue's `raster:bands` both state |
| Projection | MODIS sinusoidal, a sphere of radius 6,371,007.181 m, cells as areas. The forward formula is two lines, so a municipality can be projected into the grid rather than the grid warped |
| Quality | `QC_Day` and `QC_Night`, separate uint8 layers. The file's own summary for this tile and period: 45% good quality, 23% other quality, 11% not produced for cloud, 21% not produced for other reasons |
| Browser | CORS open on the files and on the token endpoint; range reads answer 206; the preflight allows `range`. The token is per storage container (`modiseuwest/modis-061-cogs`): a collection token is refused with 403 |
| Cost | A window over Rio de Janeiro city, about 43 × 91 cells: 10 requests, 73,578 bytes with geotiff.js in Node |
| A first reading | Over that window, 1,268 of 3,913 cells held a value; 19.5 °C to 38.2 °C at the surface. Both readers agree on those extremes (raw 14,632 and 15,566); their windows differed slightly, so this is not a cell-for-cell comparison |
| Citation | The file carries `identifier_product_doi` 10.5067/MODIS/MOD11A2.061 |

**Read the same day:**

| | Found | Source |
| --- | --- | --- |
| `QC_Day`, `QC_Night` bits 0–1 | 00 *"LST produced, good quality"*; 01 produced, other quality, *"recommend examination of more detailed QA"*; 10 not produced, cloud; 11 not produced, other reasons | [LAADS file specification, MOD11A2 v61](https://ladsweb.modaps.eosdis.nasa.gov/filespec/MODIS/61/MOD11A2) |
| Bits 2–3 | data quality: 00 good, 01 other | same |
| Bits 4–5 | average emissivity error: ≤ 0.01, ≤ 0.02, ≤ 0.04, > 0.04 | same |
| Bits 6–7 | average LST error: ≤ 1 K, ≤ 2 K, ≤ 3 K, > 3 K | same |
| Terms | Open without restriction; NASA mission data are CC0 unless marked otherwise, and citation is *"very strongly urged"* | [Earthdata data use guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance), [MOD11A2 catalogue page](https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11a2-061) |
| Citation | Wan Z, Hook S, Hulley G (2021). MODIS/Terra Land Surface Temperature/Emissivity 8-Day L3 Global 1km SIN Grid V061. NASA LP DAAC. doi:10.5067/MODIS/MOD11A2.061 | catalogue page |

The [user guide](https://lpdaac.usgs.gov/documents/715/MOD11_User_Guide_V61.pdf) (Wan, June 2019, for C6; the C61
cover says the science algorithm is unchanged) was read on its pages as images. Its Table 18 gives the same bit layout
for MOD11A2. Section 4: *"LST over eight days is the averaged LSTs of the MOD11A1 product over eight days"*, by *"a
simple average method"*, and `Clear_sky_days` and `Clear_sky_nights` count the days that went into it. So an 8-day
value is a mean of clear days only: a week of cloud is a missing value, and a value from one clear day looks the same
as one from eight unless `Clear_sky_days` is read beside it.

Neither the guide nor the pages above recommend which QC values to keep, or state the product's accuracy; the ATBD
was not read. So a quality rule, unlike Sentinel-5P's `qa_value` ≥ 0.75, has no stated basis yet. The QC bits do
carry their own error bands (≤ 1 K to > 3 K), which a rule could quote.

**Not read yet:** NDVI and EVI, which come from `modis-13A1-061` or `modis-13Q1-061`, 16-day
composites; how many of a municipality's cells are clear in a given period. Land surface temperature is the ground's
skin temperature where the sky was clear, not the air temperature a person or a mosquito is in.

## Admission review: satellite files over areas, 2026-11-06 (admitted, not built)

The practitioner, 2026-11-06: *"I thought we already have the sample satellite files over area?"* Not yet: Sample
satellite files at points reads one pixel per point, from Sentinel-5P NetCDF; Search a satellite catalog takes an
area only to choose files. Nothing reads a satellite file's values over a polygon.

**The current widgets, examined first.**

| Widget | What it shares with the need | What it lacks |
| --- | --- | --- |
| Sample satellite files at points | Files × places → a long table, one row per place per file and per day without one, gaps named, quality on every row, read by range in a worker | Places are points; one reader, Sentinel-5P NetCDF swaths |
| Clip raster | Which cells fall in a polygon: `rasterCellPredicate`, cell centre or all-touched, lab check 02 | One local raster in EPSG:4326, one area, a raster out |
| Summarize points to polygons | One value per polygon | Counts points |

**The near miss is the point sampler, and its output already fits.** The practitioner chose a new widget over
extending Sample raster at points because the output would have changed type, a layer for one input and a table for
the other. That does not arise here: points or areas, the result is the same long table, keyed by place and period.
So the proposal is **to extend Sample satellite files at points with an `areas` input**, not to add a widget, with
the title changed to match. Decision 1 below.

| | |
| --- | --- |
| Inputs | `points` **or** `areas` (`polygons`, from Join a table to the study area, Polygon layer, or a study area's units), and `files` |
| Output | the same long table: one row per place per file read, and per day with no file. For an area: cells in it, cells with a value, cells that passed the quality rule, the mean of those, and the gap kind where none passed |
| Reading | geotiff.js in the worker, by range, only the 512 × 512 blocks an area's box touches; a second reader beside h5wasm, chosen by the product |
| Geometry | each polygon projected into the file's grid (the sinusoidal formula, M1), cells tested by centre with the predicate lab check 02 already holds against rasterio. The grid is never warped |

- **D1.** Asked for by name: the mean land surface temperature in each municipality, per period.
- **D2.** The point sampler, as above. Clip raster's predicate is reused, not reimplemented.
- **D4.** No new port type. `polygons` and `table` exist.
- **D11.** The residual function: a satellite file's values over a polygon, with the cells counted.

| Distinction | Enforced as |
| --- | --- |
| A cell counts if its centre is in the area; not area-weighted | the method, stated on the result; a municipality with no cell centre in it is a gap named as such, not dropped |
| No file, no clear cell, and below the quality rule are different gaps | the gap column, as for points |
| How many cells the mean rests on | on every row: cells in the area, with a value, passing. A mean of 3 cells of 400 is not hidden |
| Terra and Aqua are different measurements | a `platform` column, never pooled |
| Day and night are different variables | one variable per read; both are offered |
| Land surface temperature is not air temperature | the measured quantity on every row, from the product |
| An 8-day value is a mean of clear days only | `Clear_sky_days` read beside it where the product has it |
| No population weighting | out of scope for this slice: it needs a population raster, and is said |
| No imputation | out of scope, as for points |

**Decisions for the practitioner:**

1. Extend the point sampler, renamed for both, or a separate widget? **Settled, 2026-11-06:** *"Sample satellite files
   over geometry? Can do points or polygons?"* One widget, points or polygons; the title is decision 3.
2. The quality rule. MODIS documents its bits and no rule (M1). **Settled, 2026-11-06:** *"Produced, error ≤ 2 K"*:
   bits 0–1 = 00 or 01, and bits 6–7 (average LST error) 00 or 01. The default, stated on every row and changeable per
   node; good quality only, and everything produced, are the alternatives offered.
3. The title. **Settled, 2026-11-06:** *"Sample satellite files at points or over areas"*. The node type
   `sample_satellite_files_at_points` is kept, since workflows already hold it; only the title changes.

**Cost, estimated from file sizes, not measured:** Rio de Janeiro state spans two tiles. Whole files are 1.87 MB for
a day temperature and 0.23 MB for its quality layer, so about 4.2 MB per period per satellite for daytime, 46 periods
a year: about 190 MB per satellite per year, less where the state covers only part of a tile's blocks.

**Then:** compare the result with the dataset's `LST_Day_mean` for the same municipalities and months; and the lab
parity check, against rasterio and rasterstats, before it is called done.

## M2: the 92 municipalities read in Node, February 2024, against the dataset

`src/satellite-areas.ts`, the reading core the widget will use, run in Node with geotiff.js on the real files: Terra
(MOD11A2) daytime land surface temperature, the four periods starting 2, 10, 18 and 26 February 2024, both tiles, the
92 municipalities from the example. Rule: produced, LST error ≤ 2 K (decision 2).

| Measured | |
| --- | --- |
| Files | 8 (4 periods × 2 tiles), 3 layers each: `LST_Day_1km`, `QC_Day`, `Clear_sky_days` |
| Cost | Reading each municipality's window separately: 63 s, 1,428 requests, 49.8 MB, because the same blocks were fetched again for each. One window per file over all municipalities: 11 s, 240 requests, 1.0 MB (the sum of response sizes the server reported) |
| Cells per municipality per period | 21 (smallest) to 4,715; median 443 |
| Passing | every municipality had passing cells in February |
| **Clear days per value** | median 2.3 of 8 per passing cell: each 8-day value over Rio de Janeiro in February rests on about two clear days |

**`Clear_sky_days` is a bitmask, not a count.** Its values averaged 100 to 137 "days" for an 8-day period on the first
run. The guide calls it *"the days in clear-sky conditions and with validate LSTs"*; the values only make sense as
one bit per day. Fixed by counting set bits; recorded so the next reader does not make the same mistake.

**Against the dataset's `LST_Day_mean` for February** (one value per municipality for the month; 90 of 92, since
Laje do Muriaé and Miracema have none): Fieldwork's mean of the four Terra periods minus the dataset's is +0.14 °C on
average, median −0.32 °C, from −3.00 to +7.04 °C; correlation across municipalities 0.78. Rio de Janeiro city 31.01
against 30.83 °C.

The largest differences are where the dataset's values look unlike a summer daytime surface: Areal 18.54 °C
(Fieldwork 25.58), Duas Barras 21.24 (25.54), São Francisco de Itabapoana 25.13 (32.12). **Not established:** which is
nearer the truth. The dataset does not say whether it used Terra, Aqua or both, which days make its month (the
period starting 26 February runs to 4 March), how it chose cells, or what quality rule it applied.

## Built: over areas, 2026-11-06 (0.34.0)

Sample satellite files at points or over areas, as admitted: an `areas` input beside `points`, either one; the reader
chosen by the product. `src/satellite-areas.ts` (projection, cells, quality rules, sums) and
`src/satellite-grid-sample.ts` (reading with geotiff.js, one window per file, masks once per tile grid, the table, the
sentence and the receipt `fw:SatelliteAreaSample`).

**Run end to end in Node on the real files** (the module the run uses, not a copy): February 2024, 92 municipalities,
daytime, both satellites: 20 files in 30 s, 602 requests, 2.6 MB; 920 rows, 886 with a mean, 3 with values none of
which passed, 31 with no retrieval; the receipt conforms to its shape. Rio de Janeiro city, Aqua, 25 January to
1 February: 26 of 1,400 cells passed, from about one clear day.

**Found building it:** geotiff.js's writer replaces a GeoTIFF's tie point with −180, 90 unless a coordinate system
is declared, which made the test's first fixture read every area as off the grid. The fixture now declares a
user-defined projected system, as MODIS files do.

**Validation, Chromium:** 6 unit tests (`satellite-areas.test.mjs`); an offline browser test with three areas, one
per outcome, read by range from GeoTIFFs written in the test (`sample-satellite-areas-offline.browser.mjs`).
**Not yet:** a lab parity check against rasterio and rasterstats; a live browser run; the worked example's workflow;
night-time and Aqua compared with the dataset.

## The satellite workflow, played back live, 2026-11-06 (0.35.0)

**The practitioner, 2026-11-06,** choosing where the satellite steps go: *"Let the sampler take a study area"*, over
extending the incidence workflow or rebuilding it. So the sampler gained a third input, `area`, and the example's
third workflow, *How hot was the ground in each municipality?*, takes the incidence workflow's study area through the
dialog's existing *Use a study area from this project*, not by picking 92 units again.

**Played back live** in Chromium (`BRAZIL_SATELLITE_LIVE=1`), all three workflows in 4.6 minutes; the satellite run
217 s. 180 files: 45 periods × 2 satellites × 2 tiles. 8,188 rows: 92 municipalities × 89 period-satellite pairs (one
of the 90 had no file). 8,064 with a mean of passing cells; 17 with values none of which passed; 107 with no
retrieval; 0 with no cell.

**Found by the first live run:** 2,044 of 8,280 rows read "no cell in the area". Planetary Computer leaves
`platform` off some MODIS items of 2024, mostly Terra's h14v11 tile; the sampler grouped them as a third satellite,
each half of the state, so every municipality on the other tile had no cell. The satellite is now taken from the
product's name where the item does not state it (MOD11A2 Terra, MYD11A2 Aqua). Gap: implementation, found by the
first run over a full year; the February runs had their platforms.

**Found following the manual:** the study area dialog is built once and reused, and a section opened in the second
workflow was still open in the third, so the click that opens it closed it. Every section now starts closed.

**Not established:** whether these values agree with the dataset's beyond February (M2); the night layer; and
anything about dengue. Relating temperature to incidence, with lags, is the next workflow.

## What this does not establish

Any design. Whether InfoDengue's data may be redistributed; how the Zenodo file's exposures were computed, or
whether a browser can read the 565 MB file, rather than Node; whether MODIS can be read or reprojected in a browser; whether 5,570
municipalities can be a study area; whether InfoDengue's and IBGE's geocodes agree with geoBoundaries' units.
