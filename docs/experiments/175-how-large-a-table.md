# 175 · How large a table: finding the limit rather than choosing it

_Created 2026-11-04 · Updated 2026-11-04_

**Status:** tried — tables moved to the dataset store (0.22.0); measured to 1,000,000 rows; caps set from the measurement (0.23.0).

## The task

The remote sensing plan for NYC ([research note](../research/eo-stac-nyc-architecture-and-plan-2026-11-04.md)) needs a
table of seven measures over 3,653 days, 25,571 rows; Fieldwork caps a table at 20,000. The practitioner, 2026-11-04:
*"That means we have to increase the cap"*, *"We need to move tables to IndexedDB"*, and *"That is why this is a DE
project. It's not about limits. It's about discovering what those are."*

So this does not choose a new number. It removes what made the old one necessary, then measures where the
application stops coping, and the cap follows from that.

## What held the cap: rows stored inside the saved workflow

A Table input kept its rows in its parameters, and the workflow is saved to the browser's local storage, about 5 MB
for everything. Every other input's data was already kept once in the dataset store (IndexedDB) by digest, with the
workflow holding a reference (`dataRef`); Table input never was. The same day, NYC's 92-column wide read failed to
save for this reason.

**Done:** a table's rows are now kept in the dataset store under a content key, `table-<rows>-<64-bit hash>`, set on
every save. The key is synchronous because a save is; it is recomputed every save rather than cached by object, since a
table edited in place would otherwise keep a key that no longer describes it. A fetched table with no rows on the device
has nothing to keep and no reference. Exports are unchanged: they carry the table inline, as before.

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `tests/table-in-dataset-store.browser.mjs`, Chromium | 5,000 rows: the saved workflow holds `table-5000-…` and no rows, under 20 KB; after a reload the table is whole and runs |
| 2026-11-04 | `tests/measure-table-size.browser.mjs`, Chromium, lifted build | 25,571 to 1,000,000 rows; the table above |
| 2026-11-04 | the same, `MEASURE_ROWS=250000`, on the 0.23.0 build with the caps set | every step completed; panel chart 26 s |

## What was measured

`tests/measure-table-size.browser.mjs`, skipped unless `MEASURE_ROWS` is set, against a local build with every row
ceiling lifted. Two tables at each size: a long one (date, variable, site, value; seven variables a day) and a wide one
for the regression (date, site, o3, tmean, stratum, holiday, count). Each step is run on its own and timed from the
click to the page saying it is done. Chromium, on the development Mac, 2026-11-04. Times in seconds.

| Step | 25,571 | 100,000 | 250,000 | 500,000 | 1,000,000 |
| --- | --- | --- | --- | --- | --- |
| Import long: read, save | 0.06, 0.25 | 0.20, 0.87 | 0.43, 2.3 | 0.82, 4.8 | 1.7, 10.7 |
| Import wide: read, save | 0.19, 0.30 | 0.69, 1.2 | 1.1–1.8, 2.8 | 3.9, 5.7 | 10.4, 13.2 |
| Reload, both tables back whole | 0.9 | 3.1 | 7.5–7.9 | 12.9 | 17.6, then the page did not answer a click within 15 s |
| Whole table to a table | 0.9 | 3.3 | 8.3–8.5 | 27.3 | 36.5 |
| Select a date range | 0.2 | 0.6 | 1.5 | 10.9 | 17.5 |
| Panel chart, every row | 2.7 | 10.3 | 26.0–31.7 | 52, then the page did not answer a click within 15 s | **the tab crashed** |
| Inspector, the dates listed | 0.15 | 0.44 | 1.0 | 3.0 | not reached |
| Poisson regression, strata, HAC | 0.23 | 0.79 | 2.0–2.1 | the page did not answer a click within 15 s | not reached |
| Export (file size) | 0.4 MB | 1.7 MB | 4.3 MB | 8.5 MB | not reached |

The saved workflow was 1.3 KB at every size: the rows were in the dataset store, as intended.

**The first failure is the tab crashing at 1,000,000 rows** while drawing the panel chart. At 500,000 the page stopped
answering for over 15 s twice. At 250,000 every step completed; the slowest is the panel chart, about 30 s.

### Caps set from it (0.23.0)

| Cap | Was | Now | Basis |
| --- | --- | --- | --- |
| Table rows (`MAX_TABLE_ROWS`) | 20,000 | 250,000 | the largest size at which every step completed |
| Regression kernel rows (`MAX_ROWS`, Rust) | 20,000 | 250,000 | the same; 2 s at 250,000 |
| Panel points (`PANEL_POINT_LIMIT`) | 20,000 | 250,000 | the table's limit, so a table that can be read can be drawn |
| Table file (`MAX_TABLE_FILE_BYTES`) | 5 MB | 40 MB | rows, not bytes, are where it stopped; a 42 MB file read in 10 s |

All four are in `widgets/caps.json` and the ontology as `measured` discovery caps.

### Found on the way

- **A second 5 MB ceiling, in the CSV reader** (`parseCSV`), separate from the dialog's file check and never listed. It
  refused the 250,000-row file as "CSV exceeds the 5 MB prototype limit." The reader now takes the caller's limit.
- **The kernel's stratum buffer started filled with a marker value**, so the compiler wrote the whole buffer into the
  binary: 80 KB at 20,000 rows, and it would have been 1 MB at 250,000. `glm_reset` marks every row it uses, so the
  starting value never mattered; it now starts at zero, and the kernel is 37 KB, down from 117 KB.
- **The measuring harness was wrong four times before it measured anything**: a wait that matched a hidden alert, a row
  count written with a comma, a chart looked for before its tab was opened, and test data whose dates repeated within a
  panel — which the panel chart correctly refused. Each cost a 10-minute timeout before the step timeouts were made
  short while the harness was being written.

## Practitioner observation, written before the result

Whether a practitioner meeting a slow step reads it as the application failing or as the data being large, and whether
the message they get says which.

## What this does not establish

- That a table of 250,000 rows is usable in every widget. The measurements cover the steps the NYC plan uses.
- WebKit, Edge on another machine, or a computer with less memory. One Chromium run on one Mac; memory was not
  measured, because Chromium's reported heap did not change between sizes and is not a usable reading.
- A wide file with many columns: the wide table here had seven. NYC's 92-column read is a different shape.
- Whether 30 seconds for a chart is acceptable. That is the practitioner observation above, not something a timing
  can answer.
