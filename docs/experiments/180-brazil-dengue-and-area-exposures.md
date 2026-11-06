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

## What this does not establish

Any design. Whether InfoDengue's data may be redistributed; how the Zenodo file's exposures were computed, or
whether a browser can read the 565 MB file, rather than Node; whether MODIS can be read or reprojected in a browser; whether 5,570
municipalities can be a study area; whether InfoDengue's and IBGE's geocodes agree with geoBoundaries' units.
