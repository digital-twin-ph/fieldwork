# 185 · One step for every lag: Relate and Regression over a declared list

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** validated, 2026-11-07. Relate takes a list of shifts, Regression fits one model per column with an
adjustment that can follow the shift, and the fourth and fifth Brazil workflows are rebuilt with them. Checks that
passed: the unit tests, which fail if a lag is fitted on another lag's rows; Validation Lab **check 38**, against pandas
lags and statsmodels, in CPython 3.13.3 and in Pyodide; the old manual against the new on synthetic satellite files;
and the live MODIS run, which reproduces 182's figures. All in Chromium for the browser parts. Check 36, named in the
close criteria below, tests the Append rows chain these workflows no longer use; it still holds for Append rows.

| Stage | What | State, 2026-11-07 |
| --- | --- | --- |
| 1 | Relate takes a list of shifts, one column each, every row kept (`relateAtShifts`) | Built (45f4f42), and settable in Relate's dialog since 0.47.0 |
| 2 | Regression fits one model per exposure column, each on its own rows, in one table | Built, 0.48.0 (Regression 0.4.0) |
| 3 | Brazil W4 and W5 rebuilt; an adjustment that follows the shift for W5 | Built, 0.49.0 (Regression 0.5.0, Relate 0.8.2); example commit 2540889 |
| — | Live MODIS figures of 182 | Reproduced, 2026-11-07 |
| — | A Validation Lab check of the several-model table; strata counts back in its sentence; a measured shift limit | Done, 0.50.0: check 38; each model's strata and dispersion; no cap (below) |

## Stage 2, as built

- **One setting**, `exposureColumns`, as the two-by-two's several exposures have: the first is the exposure, and each
  further one gets the same model with only the exposure swapped. One column, or none listed, is the single model,
  unchanged, so no saved workflow changes.
- **Each model on its own rows** is `fitRegression` run once per column, which already leaves out per model the rows
  its own variables are missing on. A test holds each model's estimates equal to that column's Regression alone and its
  rows equal to the rows its column has a value on, more than the rows common to every column
  (`tests/regression-per-exposure.test.mjs`, synthetic data in `tests/fixtures/lag-weeks.mjs`).
- **One table**, keyed by exposure, `shift_days` (from the shifts Relate records on its table, declared a number in
  days), role (exposure or adjusted for), term and statistic. Append rows is no longer needed to stack the models.
  Select rows by value on role still is, to chart one point per lag.
- **No limit on the number of columns** is set in Regression: the list is bounded by the table's columns, and the
  measured limit is stage 3's.
- **A column that cannot be fitted is a row saying why**; the step stops only when none can be. The receipt holds one
  `fw:RegressionModel` per fitted model, and conforms to the shapes.

**Found while building it, 2026-11-07:** with several shifts, Relate told the next step's Inspector that its output had
the single shift's columns (the brought column and the period helpers), which the run does not make, and not the
shift columns it does. So no Inspector downstream of a several-shift Relate could offer a shift column. Stage 1's tests
checked the run and not what the next step is offered. Fixed in Relate 0.8.1; found by the stage 2 browser check.

**Found at the start of stage 3, 2026-11-07: the design does not fit the fifth workflow.** Each of its seven models
is adjusted for **rainfall at the same lag**: the model of the temperature 2 weeks before is adjusted for the rain 2
weeks before (`precip_total_semana` brought by its own Relate at −14 days), and so on. Stage 2 swaps only the
exposure; every model keeps the same adjustment. So W4 can be rebuilt as designed and W5 cannot, without fitting a
different model from the one 182 recorded. Not noticed when 185 was written: the step count was read off the canvas,
not the models' settings.

Proposed the same day, and built after the practitioner's *"Let's do as you recommend"*: an adjustment variable may
**follow the shift**, given as a list beside the exposure columns, so
model *k* is adjusted for the *k*-th rain column. A second Relate with the rain shifts brings that list. Whether this
is explainable in one Inspector sentence (*"each model is adjusted for the rain at its own lag"*) is the test 185's
`retired` clause sets.

## Stage 3, as built and measured, 2026-11-07

| Workflow | Nodes before | Nodes after | Manual steps before | after |
| --- | --- | --- | --- | --- |
| 4, 2024 | 31 | 14 | 343 | 136 |
| 5, 2010–2025 | 43 | 18 | 502 | 216 |

Both 185's estimates, about 8 and about 10 nodes, were low: inputs, sources, satellite steps and the table output were
not counted. W5 has two Relates, temperature and rain, each with seven shifts.

**Every model equals the separate models' it replaced**, played back from an empty canvas in Chromium with the
synthetic satellite files the playback serves (`tests/brazil-dengue-from-scratch.browser.mjs`), old manual against new:

- W5: all 28 exposure values (rate ratio, both limits and p for each of seven models) equal as printed to full
  precision; rows used and dispersions equal.
- W4: the seven rate ratios, limits, rows used and dispersions equal to the digits printed; the first model's 40
  values, every term, equal to full precision. The table view shows 40 rows, so the other six models' adjustment
  terms were not read.

**Two defects found by rebuilding**, both fixed, neither caught by stage 1 or 2's tests:

1. **The chart was not offered `shift_days`.** A second place in the Inspector code declares each widget's output
   columns, and still said Regression's were term and statistic. Both now read one function.
2. **A second several-shift Relate dropped the first's shifts**: the rain Relate replaced the table's record of the
   temperature's shifts with its own, so the run had no `shift_days` while the Inspector, reading the columns' names,
   offered it. The run failed, naming the column. Relate 0.8.2 keeps both; a test chains two.

**Played back live, 2026-11-07**, at the practitioner's *"MODIS first"*: all five workflows from an empty canvas in
Chromium, MODIS read from Planetary Computer, **35.4 minutes** (182's: 44.2). The rebuilt fifth workflow's seven models
equal [182](182-brazil-across-years.md)'s recorded live figures in every rate ratio, both limits and rows used, to the
three decimals 182 records:

| Weeks | Rate ratio per 1 °C (95%), 182 | Rebuilt | Rows, both |
| --- | --- | --- | --- |
| 4 after | 1.005 (1.003–1.007) | 1.005 (1.003–1.007) | 69,816 |
| 2 after | 1.005 (1.003–1.007) | 1.005 (1.003–1.007) | 69,988 |
| 0 | 1.004 (1.002–1.006) | 1.004 (1.002–1.006) | 71,338 |
| 2 before | 1.003 (1.001–1.005) | 1.003 (1.001–1.005) | 70,110 |
| 4 before | 0.989 (0.987–0.991) | 0.989 (0.987–0.991) | 69,810 |
| 6 before | 1.021 (1.019–1.023) | 1.021 (1.019–1.023) | 69,725 |
| 8 before | 1.020 (1.018–1.021) | 1.020 (1.018–1.021) | 69,718 |

The first model's dispersion is 5.003, against 182's 5.00; the others are not in the several-model sentence. Nor are
the strata used and dropped, which a single model's sentence gives: a loss of information in the result, to be put
back, and the reason the strata counts were not compared.

Check 36 tests the Append rows chain the workflows no longer
use; check 37 tests the stratified fit and is unaffected. No Validation Lab check covers the several-model table.

## Closing, 2026-11-07

**Each model's own counts.** The several-model sentence gave no strata, and gave the first model's dispersion as if it
were every model's. Each model's line now has its rows, strata used and dropped, and dispersion; the heading names the
method, "scaled by each model's Pearson dispersion".

**Validation Lab check 38** (`validation-lab` a565590). Check 37's two municipalities and weeks; the dataset's weekly
temperature and rainfall each brought at 0, −14, −28 and +14 days by Relate; one Regression, each model adjusted for the
rain at its own shift. pandas builds the lags with a merge on the shifted date and statsmodels fits each lag on its own
complete rows. Every row count, strata count, coefficient (1e-6) and standard error (1e-5) agrees, in CPython 3.13.3 and
in Pyodide (CPython 3.14.2 on wasm32, statsmodels 0.14.6). Each model uses 1,581 to 1,613 rows; 1,499 are complete at
every lag, so no model rests on the others' rows. The shift-0 model is check 37's case, and gives its numbers.

**The limit, measured.** `MAX_SHIFTS = 24` was a chosen number. At the sixteen-year size, 92 municipalities × 845 weeks
(77,740 rows) against MODIS 8-day periods, in Node (the V8 engine Chromium runs), Relate then Regression:

| Shifts | Relate | Regression, all models | Per model |
| --- | --- | --- | --- |
| 1 | 0.8 s | 0.1 s | 0.09 s |
| 7 | 3.6 s | 0.5 s | 0.07 s |
| 24 | 11.7 s | 1.6 s | 0.07 s |
| 96 | 46 s | 7.3 s | 0.08 s |
| 384 | 185 s | 27.3 s | 0.07 s |

Linear, and nothing failed or ran out of memory within 4 GB at 384. No limit was found, so the cap is removed: a list
is bounded by its days, whole, distinct and within ten years either way. Not measured in a browser tab, whose memory
can be less than Node's.

**Found while measuring:** a shift at which no row matches stops the step ("nothing could be related") instead of
giving an empty column. With every other shift a row without a value is kept and counted; at a shift where all rows
are without one, it stops. The practitioner, 2026-11-07: *"That's OK for now"*. Kept as it is; to be revisited if a
workflow meets it, for example a lead past the end of the satellite search.

**What a shift is**, as explained to the practitioner the same day: the number of days each row's date is moved before
Relate looks in the other table. A Brazil case week starts on a Sunday; +3 days is its Wednesday (0 weeks before),
−11 the Wednesday 2 weeks earlier, +17 the Wednesday 2 weeks later (a lead). Each shift brings one column, named for it,
`LST_Day_1km_-11d`, and Regression fits one model per column. Lag 0 is +3 so a week is matched by its middle day.

**Open for stage 3:** the lag chart today reads Append rows' `lag` column, in weeks before (0, 2, 4…). The models'
`shift_days` is the shift as Relate recorded it (3, −11, −25… in W4), in days and with the opposite sign. Whether the
chart shows days shifted, or a column in weeks is derived for it, is not decided. The practitioner, 2026-11-07: *"why not try both?"* So
both are built and looked at side by side: **days**, the rebuilt W4 charting `shift_days` as Relate recorded it, in
stage 3; and **weeks before**, a column `weeks_before = (3 − shift_days) ÷ 7` computed by Apply ruleset once
[188](188-rules-that-compute-and-show-their-table.md)'s computed conclusion is built. Derive a value cannot make it: it
computes between values, not from a key column. Which one reads better is the practitioner's observation, written here
when made.

## The question

The practitioner, 2026-11-07, looking at the Brazil lag workflow at the canvas's smallest zoom: *"Does that Brazil
canvas look like an optimization opportunity?"* Then: *"Yes 185 and should we look at Epi Info AI LOOP command?"*

The fourth Brazil workflow, *Did warmer ground weeks earlier go with more cases?*, has **31 steps**; the fifth, over
sixteen years, has **43**. Most of them are one chain copied once per lag and lead:

| On the canvas | Count in the fourth workflow |
| --- | --- |
| Relate a column from another table, one per shift | 7 |
| Regression, one per shift | 7 |
| A table output per model | 7 |
| Append rows, chart, sources, satellite steps | about 10 |

That is the shape [181](181-lag-response-figure.md) ruled against for the figure, in the practitioner's words of
2026-11-06: *"we do not want too many widgets of the same kind chained when 1 will do."* It was applied to the chart
and not to the models. And since every word was made readable ([184](184-heuristic-evaluation-in-the-lab.md), TODO
item 0), 31 steps no longer fit the canvas at its smallest zoom: the build could no longer be followed by dragging
between ports, which is how this was noticed.

**Searched first**: `docs/` for *loop*, *repeat*, *for each*, *lags*; [181](181-lag-response-figure.md) and
[182](182-brazil-across-years.md) build the lag models one step each and say so; micro-workflows
([92](92-micro-workflow-on-the-canvas.md)) group steps but do not repeat them.

## What Epi Info AI says about loops

Read 2026-11-07 in `epi-info-ai` (`wasm/docs/design/legacy-capability-register.md`, REG-0104, and
`wasm/docs/architecture.md`). There is no LOOP to borrow. The Classic language's grammar retains `REPEAT … UNTIL`, but
the inspected Epi Info 7 Analysis interpreter builds no executable rule for it, and no `FOR`, `FOREACH` or `WHILE`
production exists. Epi Info AI records it as a TODO "revival", not legacy parity, on conditions: typed, **bounded**
iteration; the body and condition validated **before** anything runs; iteration, time and output limits; cancellation;
effects that land together or not at all; and fixtures for zero, one and many iterations and for a runaway loop.

Those conditions argue for **repetition over a declared list, inside a widget**, rather than a general loop step on
the canvas. A list of shifts is bounded by its length, can be checked whole before the run, and leaves each item's
rows on the record. It answers the lag case and opens nothing open-ended.

## The design

Two existing widgets extended; no new widget.

**Relate a column from another table** takes a **list of shifts** where it now takes one (`shiftDays`): for
example 0, −14, −28, −42, −56 days and the two leads. It brings one column per shift, named for its shift
(`LST_Day_1km_shift_-14d` …, the exact form decided in the build), each matched as today's single shift is, with its
own unmatched rows counted and its own gap decision.

**Regression** fits **one model per exposure column** when it is given several, and returns one table of estimates,
one row per model and term, with the exposure column as a key — the long shape [181](181-lag-response-figure.md)'s
chart already reads, so Append rows and the seven table outputs go. **Each model is fitted on its own rows**: a week
with no clear-sky value at one shift may have one at another, and the seven separate models drop rows independently
today. Fitting them on the rows common to all would change the numbers silently, so it is refused as a default and,
if ever offered, would be named as a different analysis.

The fourth workflow would go from **31 steps to about 8**, the fifth from **43 to about 10**.

**Bounded, as Epi Info AI asks.** The list is part of the step's settings, validated whole before the run: a shift
that is not a whole number of days, a repeated shift, or more shifts than a stated limit stops the step with the
reason. The limit is measured, not chosen: the largest list the browser fits within the run's time on the sixteen-year
data, recorded here when taken. Zero shifts is refused; one shift behaves exactly as the widget does today.

## Admission

Not a new primitive: two widgets gain a list where they took a single value. D2 (does it already exist?): Append rows
stacks tables but repeats nothing; a micro-workflow groups steps but runs them once. Neither iterates. D11 (what
residual function remains?): none is added; Append rows and the per-model outputs stay available for their other uses.

## What would close it

**`tried`** when both widgets take a list, the fourth and fifth Brazil workflows are rebuilt with them, and their
manuals play back from an empty canvas.

**`validated`** when every model's estimates in the rebuilt workflows equal the current ones — Validation Lab checks
36 and 37, and the live 2010–2025 figures recorded in [182](182-brazil-across-years.md) — to the same tolerance, and a
test fails if a lag is fitted on another lag's rows.

**`retired`** if one model per column cannot keep each model's own rows without a design the Inspector cannot explain
in a sentence, recorded with what was tried.

## What this does not establish

That a list inside a widget is the right general answer to repeated chains: it answers lags. A repeated group of steps
over a list — a micro-workflow run once per item — would be the general form, and would carry every one of Epi Info
AI's conditions; it is not proposed here. That fewer steps are easier to understand is the expectation, not a finding.
