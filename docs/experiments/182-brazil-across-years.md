# 182 · Brazil across sixteen years: weeks compared within a municipality, month and year

_Created 2026-11-06 · Updated 2026-11-07_

**Status:** validated. Built in 0.41.0; the fifth workflow played back live from its manual, and Validation Lab check 37 agrees with statsmodels on the several-strata model in CPython and Pyodide.

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

1. **The doubled weeks are left out of the models**, all 12. Both copies go, 2,208 rows of 77,740 (2.8%); the 1,104
   first written here counted one copy each, corrected 2026-11-07. The data file keeps them untouched, and the
   evidence and the README say so.
2. **Rainfall is read from CHIRPS over each municipality by Fieldwork**, the way MODIS is: the cells whose centre is
   inside, summed over the case week, Sunday to Saturday, with a gap said rather than zeroed. The dataset's column is
   not used. A CHIRPS route has to be checked first: open, readable from a browser, no sign-in.
3. **All four speed changes**: several files at once, with the number measured; each file read once per session; a
   failed file retried, then named; decoding in a worker pool. WebGPU is not built.

**Rainfall, revised the same day.** CHIRPS daily files exist for 1981–2026 at
`data.chc.ucsb.edu/products/CHIRPS/v2.0/global_daily/cogs/p05/`, 8.3 MB each, with range requests answered. **The
server sends no `access-control-allow-origin` header**, so a web page cannot read them. Planetary Computer has no
CHIRPS; it has GPM IMERG half-hourly, about 280,000 files for sixteen years, and ERA5, which needs a reader Fieldwork
does not have. CHIRPS's README gives a citation, Funk et al. 2014, USGS Data Series 832, and no licence. Offered
reading CHIRPS in Node and publishing a table, the practitioner chose: *"Use the dataset's column after all."* Its
three limits are stated on every model: one grid cell per municipality, ISO weeks starting a day after the case weeks,
and missing days counted as 0.

## Built, 2026-11-06 and 07 (0.41.0)

| What | Where | Why |
| --- | --- | --- |
| **Select rows leaves values out** (0.3.0) | `selectRows(..., leaveOut)` in `src/derive-value.ts` | Twelve ticks instead of 821 |
| **Relate relates a table to itself, shifted** (0.6.0) | `matchedStart`, `shiftedName` in `src/relate-table.ts` | Rainfall *k* weeks earlier is the weekly table's own column; the matched week is `data_iniSE_matched`, a second shift `data_iniSE_shifted_2` |
| **Regression takes several strata columns** (0.3.0) | `strataOf` in `src/regression.ts`; **Together with** in the Inspector | One stratum per municipality × year × month |
| **A search reads every page and keeps the files read** (0.4.0) | `searchCatalog(..., keep)`, `filesRead` | 2,891 items in 29 pages, 19 s, 5.90 MB stored instead of about 14 MB |
| **A search is saved in the payload store** | `searchRef`, `searchPayloadKey` in `src/project.ts` | 5.9 MB is more than local storage holds |
| **A run computes steps under construction** | `openEnds` in `src/core.ts`; `unfinished` on the run | A join chained after a join could not be set up |
| **A join decision is signed with a digest** | `gapSignature`, `legacyGapSignature`, `decisionMatches` | The written-out signature was 1.75 MB per join |

**Found building it, each by the fifth workflow's playback failing:**

1. **The 16-year search could not be saved.** Its items were held in the node, 5.9 MB, and local storage holds 5.2 MB.
   The next node appeared on the canvas and was never saved. Now kept in IndexedDB by content, as tables already are.
2. **The stand-in MODIS files overlapped at a year's end.** Their last period ran seven days into January, where the
   real catalogue's ends on 31 December (read 2026-11-07). A fault of the test, not of the application.
3. **A table read only by a join had no run output,** because a run computed only what an output needs. Relate now
   offers the second table's value column from its declaration. The manual shows the rainfall table in its own tab.
4. **A join chained after another join could not be previewed,** for the same reason, one step further on. A run now
   also computes each step that leads to no output yet, when every input it needs is connected. One that fails is
   marked and named in its Inspector, and the run goes on. The Inspector now names which table is missing.
5. **A second shifted relate on one table was refused,** since the first had taken `data_iniSE_shifted`.
6. **The join decisions were lost on save.** Each was signed with every unmatched key written out, 58,401 keys and
   1.75 MB for one join. Now a 16-character digest; a decision signed the old way still holds.
7. **The manual asked for a decision where there was none**: rainfall in the same week matches every row.
8. **The playback outgrew its time limit**: 14.0 minutes offline for five workflows, against 10.

**A limit met and not changed:** a workflow holds at most 50 nodes and 100 connections. The fifth workflow uses 43 and
61. The number was chosen, not measured.

## Played back live, 2026-11-07

All five workflows from an empty canvas in Chromium, MODIS read live from Planetary Computer: **44.2 minutes**. Seven
Poisson models over 2010–2025, weeks compared within municipality × year × month, adjusted for that week's rainfall as a
spline, intervals scaled by the Pearson dispersion:

| Weeks | Rate ratio per 1 °C (95%) | Rows | Strata used, without events dropped | Dispersion |
| --- | --- | --- | --- | --- |
| 4 after | 1.005 (1.003–1.007) | 69,816 | 11,534, 5,756 | 5.12 |
| 2 after | 1.005 (1.003–1.007) | 69,988 | 11,511, 5,778 | 5.11 |
| 0 | 1.004 (1.002–1.006) | 71,338 | 11,590, 5,700 | 5.00 |
| 2 before | 1.003 (1.001–1.005) | 70,110 | 11,548, 5,746 | 5.06 |
| 4 before | 0.989 (0.987–0.991) | 69,810 | 11,511, 5,778 | 5.06 |
| 6 before | 1.021 (1.019–1.023) | 69,725 | 11,477, 5,681 | 4.90 |
| 8 before | 1.020 (1.018–1.021) | 69,718 | 11,501, 5,695 | 4.83 |

**The leads shrink, and do not vanish.** In 2024 alone the temperature 2 weeks after went with cases as strongly as 8
weeks before (1.061 against 1.063). Here the leads are 1.005 and the 6- and 8-week lags about 1.02, four times larger.
Holding municipality, month and year fixed removes most of what made the 2024 leads large. But 1.005 is still not 1.

**Not established.** The intervals allow nothing for correlation between neighbouring weeks, so they are too narrow,
and the leads' exclusion of 1 may be that. The dip at 4 weeks before has no mechanism. Rainfall is one grid cell per
municipality, ISO weeks, missing days as 0. Land surface temperature is the ground's on clear days. Each point is its
own model, not adjusted for the other lags. Nothing here is causal.

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

## What the variables stand in for, 2026-11-07

The practitioner, after check 37 was reported: *"Are there papers that confirm variables that mosquitoes meet?"*
And then: *"include drought too"*.

**No paper confirms that a station, reanalysis or satellite temperature is what a mosquito meets.** A first search
(four queries, summaries read, not full texts) found the opposite: where loggers were put at resting sites or across
urban land cover, the temperature there differed from the weather station's by enough to change modelled
transmission. Athens, Georgia, *Ae. albopictus*: station temperature consistently over-predicted vectorial capacity
against the measured microclimate ([PMC7529312](https://pmc.ncbi.nlm.nih.gov/articles/PMC7529312)). Germany, several
genera: resting-site temperature moved the extrinsic incubation estimate by 2 to 4 days
([Parasites & Vectors 2022](https://doi.org/10.1186/s13071-022-05505-2)). Larvae meet water, not air: in Delhi
container water was cooler than the air by an amount set by the container
([Geospatial Health 2018](https://geospatialhealth.net/gh/article/view/707)), and in Rio de Janeiro adult size rose
with larval-habitat temperature ([Frontiers 2021](https://doi.org/10.3389/fevo.2021.626757)).

**What that means for these models.** Their exposure is `LST_Day_1km`: MODIS daytime land-surface temperature,
8-day clear-sky composites, read by Fieldwork over each municipality. That is the skin temperature of roofs, roads and
canopy at the daily peak, the furthest of the available proxies from the air where *Ae. aegypti* rests, mostly
indoors. The evidence suggests the error is not random: it plausibly differs between hot and cool places, and a week
with no clear-sky value is dropped, so cloudy wet-season weeks leave the model more often. `tempmed`, which check 37
fits, is InfoDengue's weekly air temperature, a different proxy. Rainfall reaches a mosquito only through containers, and stored household
water, which drought increases, does not depend on rain at all. The ratios in the fifth workflow are associations
with the dataset's columns, as the workflow already says; this is the evidence for why that wording is required, not
a change to the models.

**What check 37 covers and does not.** It fits 2 of the 92 municipalities (1,613 rows, 364 strata). The sixteen-year
run's roughly 11,500 strata are the same code path and have not been compared with statsmodels at that size, and the
lead models have no check of their own.

**Recorded as notes on the example.** A fuller search (open copies only, five strands: resting-site microclimate,
larval habitats and rainfall, drought, thermal biology, and the provenance of the dataset's climate columns) is in the
example repository as `notes/what-aedes-mosquitoes-meet.md`, and its conclusions are written into the Brazil project
as authored notes, each saying whether it is a précis, paraphrase or summary of the works it cites, so the write-up
carries its limitations and its references. Nothing in the models changes on it; the options it lists (night LST or
air temperature as a comparison exposure, errors allowing for correlation, a non-linear lag model, a drought index)
are open, not chosen.

**The form of a literature note.** The practitioner, as the notes were written: *"Our notes that cite literature can
take the form of a precis, paraphrase or summary."* Then, on where the three are explained: *"Should be in add
notes"*, and *"give a few examples of each in the manual"*. Built: authored notes carry an optional `form`, offered in
the Add note dialog with a line saying what each means and an Examples button opening a new Notes page of the manual
(`docs/surfaces/notes.md`, the first manual page for a surface rather than a widget).

Asked whether literature belongs in notes in these forms at all, the answer given was yes, with limits: each form holds
only as far as the source was read (a précis needs the whole work; the Brazil précis are of works read in full, its
summaries partly of abstracts), a paraphrase sits closest to copying, and a note earns its place by saying something
about this study rather than reviewing the field. The practitioner: *"Include the implications of precis, summary and
paraphrase in the notes manual. I think those are good points. And what about if notes do not belong to any of the
three"*. The manual page now says what each form commits the writer to, and that most notes are none of the three: a
note on the data or a step leaves the form unstated, a word-for-word sentence is a quoted note, and a note adding the
author's own reading writes the cited part first and makes the turn visible.

## What would close it

**It closes as validated when** the widened workflow runs from the manual, live, over 2010–2025. Its lag and lead
models must use municipality × year × month strata, with rainfall at the same lag. The several-strata Regression must
agree with statsmodels in a Validation Lab check. The leads' result, whatever it is, must be recorded beside the
lags'. **It closes as retired** if the strata leave too little within-month temperature variation to estimate
anything, recorded with the numbers.

## What this does not establish

Any result. Whether CHIRPS can be read in a browser. That several files at once is faster, or by how much. Whether the
dataset's other columns have the doubled weeks' kind of fault.
