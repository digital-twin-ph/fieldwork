# 185 · One step for every lag: Relate and Regression over a declared list

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked, two of three stages built. Corrected 2026-11-07: this line said nothing was built after stage 1
had landed. Not `tried` until the Brazil workflows are rebuilt and their manuals play back.

| Stage | What | State, 2026-11-07 |
| --- | --- | --- |
| 1 | Relate takes a list of shifts, one column each, every row kept (`relateAtShifts`, at most 24) | Built (45f4f42), and settable in Relate's dialog since 0.47.0 |
| 2 | Regression fits one model per exposure column, each on its own rows, in one table | Built, 0.48.0 (Regression 0.4.0) |
| 3 | Brazil W4 and W5 rebuilt with one Relate and one Regression; manuals; checks 36 and 37; the 182 figures; a measured limit | Not started |

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

**Open for stage 3:** the lag chart today reads Append rows' `lag` column, in weeks before (0, 2, 4…). The models'
`shift_days` is the shift as Relate recorded it (3, −11, −25… in W4), in days and with the opposite sign. Whether the
chart shows days shifted, or a column in weeks is derived for it, is not decided.

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
