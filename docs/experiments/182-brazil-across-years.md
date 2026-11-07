# 182 · Brazil across sixteen years: weeks compared within a municipality, month and year

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. The design, the data and the three open questions are decided; nothing is built.

## The question

The lead models in [180](180-brazil-dengue-and-area-exposures.md) failed their falsification test. The temperature 2
weeks after a case week went with cases as strongly as the temperature 8 weeks before it, 1.061 against 1.063 per
1 °C. One year and one epidemic wave cannot separate temperature from season. The practitioner, 2026-11-06:
*"Widen the design"*. They then chose, after the options were set out:

| Choice | Decided |
| --- | --- |
| The comparison | **Municipality × year × month strata**: weeks compared only within the same municipality, month and year, so each year's wave timing is held fixed |
| The years | **2010–2025, all sixteen** in the file |
| Rainfall | **At the same lag as the temperature**, as an adjustment |

Searched `docs/` for *strata*, *several years*, *multi-year*, *time-stratified* and *CHIRPS*. Only experiment 180's
plan and the research note name CHIRPS. Nothing prior.

## The data, read 2026-11-06

`dataset_multimodal_v8.parquet`, already on this computer (180), read by hyparquet in Node. Rio de Janeiro state:

| | Found |
| --- | --- |
| Rows | 77,740 for 2010–2025, 92 municipalities, 4,692 to 4,968 a year |
| Cases | 5,476 (2021) to 426,479 (2024); epidemics in 2011–13, 2016, 2023 and 2024 |
| **Doubled weeks** | **12 weeks, each at a year's edge, twice for all 92 municipalities: 1,104 rows.** The two rows agree on cases and differ in rainfall, sometimes one of them 0. 2024's was found in 180; there are eleven more |
| **A missing week** | The week starting 2014-12-28 has no row, for any municipality |
| Rainfall | No missing values in any year |

**Where the rainfall comes from**, read from the dataset's repository
(`jssanchez-garreta/dataset-multimodal-dengue-brazil`, `metadata/dataset_multimodal_metadata.md` and
`scripts/data_construction/03_build_dataset_precipitacion_chirps_anual.py`), not from the Zenodo record, which does not
say. Read by a fetching agent; the code read is the repository's, which may not be what built the shipped file:

- **CHIRPS v2.0 daily, in mm, at the one grid cell nearest each municipality's coordinates.** It is not an average
  over the municipality.
- **A missing day is filled with 0** before summing.
- **Weeks are ISO weeks**, Monday to Sunday. The case weeks (`data_iniSE`) start on Sunday.
- The repository's code checks that no municipality-week repeats, and stops if one does. The shipped file has 12
  repeats, so **the file does not match that code**.

## Open questions

1. **The doubled weeks.** Relating rainfall by municipality and date meets two rows, with different rainfall, and
   stops, naming them. Which row is right cannot be told from the file. One option: leave out those 12 weeks
   (1,104 rows, 1.4%), stating it. Another: keep them and relate temperature only. The choice is the practitioner's.
2. **Which rainfall.** The dataset's value is one cell, ISO weeks, with missing days as 0. The alternative is to read
   CHIRPS over each municipality the way MODIS is read, by the cells whose centre is inside, for the case weeks. That
   needs a CHIRPS route and its access checked: open, CORS, no sign-in.
3. **Speed.** The practitioner, 2026-11-06: *"I am wondering if WebGPU and Web Worker can speed up the computation"*.
   See below.

## Decided, 2026-11-06

After the choices were set out, the practitioner chose:

1. **The doubled weeks are left out of the models**, all 12, 1,104 rows. The data file keeps them untouched, and the
   evidence and the README say so.
2. **Rainfall is read from CHIRPS over each municipality by Fieldwork**, the way MODIS is: the cells whose centre is
   inside, summed over the case week, Sunday to Saturday, with a gap said rather than zeroed. The dataset's column is
   not used. A CHIRPS route has to be checked first: open, readable from a browser, no sign-in.
3. **All four speed changes**: several files at once, with the number measured; each file read once per session; a
   failed file retried, then named; decoding in a worker pool. WebGPU is not built.

## Speed: where the time goes

`readGridFiles` in `src/satellite-grid-sample.ts` reads **one file at a time**. For each it fetches three layers
together, waits for the response, then sums a small window. That work is a sum over a few thousand cells. So the 4
minutes a year are mostly **waiting on the network**, one request after another, not computing.

| Idea | What it would do here |
| --- | --- |
| **Several files at once** | Up to *n* files in flight instead of one. Likely the largest gain, because the time is waiting. *n* is to be measured, not chosen; Planetary Computer may throttle |
| **Read each file once per session** | The fourth workflow reads every file twice: once to run, then again after the joins are set. A cache by URL halves that run |
| **A Web Worker** | Moves decompression off the page's thread, so the page stays responsive. geotiff.js can decode in a pool of workers. The gain in time is likely small, because decoding is not the wait |
| **WebGPU** | Speeds up arithmetic over large arrays. The arithmetic here is small: the sums per file, and a Poisson model of about 78,000 rows whose strata are absorbed. Not proposed. Measure first if a model is ever slow |

**And a failure stops everything.** On 2026-11-06 one *Failed to fetch* among 180 files stopped a live run, and the
message named no file. Sixteen years is about 750 Terra files. A retry, and naming the file, belong with the
concurrency.

## Speed, built and measured, 2026-11-06

| Reader | Measurement, Chromium unless stated | Default |
| --- | --- | --- |
| MODIS over areas, 48 files of Jan–Mar 2024, 92 municipalities | **70.3 s one at a time; 25.6 s at 2; 23.2–23.7 s at 3 to 24.** Node: 75.0 s, then 25.0, 13.3, 7.7, 4.9 and 3.6 s at 3, 6, 12, 24 and 48 | 6 files |
| Sentinel-5P NO₂, 10 NYC overpasses, 5–8 June 2023 | **46.9 s one at a time, 21.8 s at 3, 18.3 s at 6** | 3 files |
| Decoding in geotiff.js's worker pool, MODIS at 6 | 24.1 s against 23.2 s. The page's main thread was blocked 0.1 s in all with or without it; the longest stall was 74–81 ms without and 55–62 ms with | Not used |

Every measurement gave the same readings, compared whole, at every level.

**Why the browser stops at 3.** The MODIS files' server, `modiseuwest.blob.core.windows.net`, answered over HTTP/1.1;
the catalogue answered over HTTP/2. Chrome opens at most 6 connections to an HTTP/1.1 host, and each file is three
layers, so 2 or 3 files fill them. Node has no such limit and kept gaining to 48. **That gain is not available to a
browser**, and the default does not pretend otherwise.

**Worker decoding is not built, against the practitioner's choice, on the measurement.** It was chosen before it was
measured. Decoding these windows blocks the page for a tenth of a second over a whole run, so a pool adds workers and
a code path and buys nothing measurable. Recorded here so the decision can be reversed with its evidence in view.

**Built**, `src/satellite-grid-sample.ts` and `src/satellite-sample-reader.ts`:

- **Lanes.** Files are read in lanes and merged in the items' order, so the table is the same at any concurrency.
- **Retry.** A failed file is tried three times, 1.5 s then 3 s apart. A file that keeps failing stops the run,
  naming it. A file stating the wrong unit is not retried.
- **Cache.** A MODIS file is read once per session for the same layer, rule and places; Sentinel-5P already was.

## What would close it

**It closes as validated when** the widened workflow runs from the manual, live, over 2010–2025. Its lag and lead
models must use municipality × year × month strata, with rainfall at the same lag. The several-strata Regression must
agree with statsmodels in a Validation Lab check. The leads' result, whatever it is, must be recorded beside the
lags'. **It closes as retired** if the strata leave too little within-month temperature variation to estimate
anything, recorded with the numbers.

## What this does not establish

Any result. Whether CHIRPS can be read in a browser. That several files at once is faster, or by how much. Whether the
dataset's other columns have the doubled weeks' kind of fault.
