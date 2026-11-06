# 180 · Brazil dengue, and satellite exposures over areas

_Created 2026-11-06 · Updated 2026-11-06_

**Status:** asked. The widget inventory and the first data-readiness probes are recorded; nothing is designed or
built yet.

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

## What this does not establish

Any design. Whether InfoDengue's data may be redistributed; how the Zenodo file's exposures were computed, or
whether a browser can read the 565 MB file, rather than Node; whether MODIS can be read or reprojected in a browser; whether 5,570
municipalities can be a study area; whether InfoDengue's and IBGE's geocodes agree with geoBoundaries' units.
