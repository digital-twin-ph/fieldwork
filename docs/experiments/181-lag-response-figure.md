# 181 · A lag–response figure for the Brazil lag models

_Created 2026-11-06 · Updated 2026-11-06_

**Status:** validated. Built in 0.39.0; the Brazil workflow draws the figure from its own five models, played back live, and Validation Lab check 36 agrees with every number in CPython and Pyodide.

## The question

The practitioner, 2026-11-06, on the fourth Brazil workflow, *Did warmer ground weeks earlier go with more cases?*
([180](180-brazil-dengue-and-area-exposures.md)): *"what is the best way to visualize the relationship between ground
warming lag times and dengue cases?"* Then: *"Let's record the above as an experiment before we build it."*

Searched `docs/` for *forest plot*, *lag-response*, *error bar*, *distributed lag* and *dlnm*. Nothing prior was
designed or built. Two research documents name the need. The practitioner's
[worked-examples note](../research/remote-sensing-epidemiology-worked-examples.md.txt) lists *lag-response plots* among
the Brazil deliverables. [The study designs note](../research/fieldwork-study-designs-v1.1.md) lists `epi.dlnm` with
the output *lag-response estimates*, citing Gasparrini, Armstrong and Kenward 2010 (R12).

## The figure

A **lag–response plot**, the conventional figure for this question:

- **Horizontal axis:** the lag in weeks, at 0, 2, 4, 6 and 8, spaced as numbers rather than as categories.
- **Vertical axis:** the rate ratio per 1 °C, on a log scale. A log scale puts 0.95 and 1.05 the same distance from 1.
- **Marks:** each lag is a point with its 95% interval drawn as a vertical whisker.
- **Reference line:** a horizontal line at 1, meaning no association.

With the live results in 180, the figure would show the ratio below 1 at 2 and 4 weeks and above 1 at 8 weeks. The
intervals at 0 and 6 weeks cross 1. The figure shows nothing the table cannot, but it shows it at a glance, and the
line at 1 shows how close every ratio is to it.

**The caption has to carry two cautions.** First, each point comes from a separate model. The five lags were fitted
one at a time, so no point is adjusted for the others, and week-to-week temperatures are strongly correlated. Second,
the intervals are probably too narrow. They are scaled for a Pearson dispersion of 18 to 28, but allow nothing for
correlation from week to week within a municipality.

**The method that fits all lags at once is the distributed lag model.** It fits a single model over every lag and
draws one curve with one band. The reference is Gasparrini A, Armstrong B, Kenward MG, *Distributed lag non-linear
models*, Statistics in Medicine 2010;29:2224–2234, open at https://pmc.ncbi.nlm.nih.gov/articles/PMC2998707/. Regression
does not fit one. That figure is a separate question, and it is out of scope here.

**A companion figure needs nothing new.** Weekly cases and land surface temperature through 2024, in one panel each
on a shared time axis, show the seasonal shape that the month strata absorb. Chart already draws this
([manual](../widgets/chart_output.md), *Variables moving together through time: one panel each*).

## The widgets, examined first

Inventoried by port on 2026-11-06, before proposing anything:

| Need | Closest widget | What it has | What it lacks |
| --- | --- | --- | --- |
| The estimates, per lag | Regression | A table keyed on `term` and `statistic`, with one row per statistic: the ratio, `lower 95%`, `upper 95%` and `p` (`regressionTable` in `src/regression.ts`) | Which lag a model is. Each of the five is its own table, and each holds the month terms beside the exposure |
| One table of five | Append rows | Stacks two tables. **Name the source of each row** adds a label column | Takes two tables, so five need four in a chain. The label is text, so a lag of `2` is a word, not a number |
| The exposure term only | Select rows by value | Keeps the rows whose `term` is the exposure | Nothing |
| The figure | Chart | Bar, point and line marks (`src/chart-vega.ts`); the axis titled with the table's unit | Interval whiskers, a log scale and a reference line. It reads one value per row, while Regression's table holds a ratio and its limits as three rows |

So no new widget is needed. Chart is the closest, and the open part is how a table's interval reaches it.

## Design choices to settle before building

1. **How Chart reads an interval.** It could read Regression's long shape directly. For each row label, Chart would
   take the rows whose `statistic` is the measure, `lower …%` and `upper …%`. That shape is the one Regression
   declares, so Chart would recognise it rather than guess from column names. Or it could ask Regression for a
   wide table. The first changes one widget; the second changes the table the NYC and Hagelloch examples read.
2. **How the lag becomes a number.** Append rows' source label could be read as a number when every label is one,
   with the run saying so. Or the lag could come from a Derive value. A label that fails to read as a number would be
   a finding, and the figure would still draw.
3. **Five tables into one.** The figure needs four Append rows in a chain. Append rows could instead take any number
   of tables, measured against the workflow it saves.
4. **The scale and the line.** These would be on by default for a table whose measure is a ratio, and stated on the
   figure and in its receipt. A ratio's axis then never starts at zero.

## Decided, 2026-11-06

The practitioner chose after the pros and cons of each were set out.

1. **Regression stays long inside; Chart reads the interval from it.** The practitioner first asked for a wide
   Regression table, *"so we have consistent Chart input"*, recalling an earlier discussion of long and wide. That
   discussion is the direction *a table must be able to leave as a table* (2026-10-27): *"However we represent the
   data inside FW to do computations, as long as we are able to give them CSV, JSON, or GeoJSON exports we are
   fine."* Inside, every table holds one number per row under key columns, which is what every Chart input already
   is, so a long Regression table is the consistent one. A wide one would mean either the limits as text key
   columns or several numbers per row, a change to the table every widget reads. The practitioner: *"OK with your #1
   recommendation."* Where a person reads it, in the table viewer and when it leaves as CSV, the table is wide.
2. **The lag becomes a number by declaration.** Append rows gains a setting saying its labels are numbers, with a
   unit. A label that is not a number is a data quality finding, not a refusal. Nothing is guessed from the labels.
   Derive value, proposed above, cannot do this: it combines two existing values, and cannot make a constant or read
   a label.
3. **One Append rows, not a chain.** The practitioner: *"we do not want too many widgets of the same kind chained
   when 1 will do."* Append rows takes as many tables as are connected, and a workflow saved with `records` and
   `records_2` still loads.
4. **For a ratio, a log scale and a line at 1, on by default.** Ticks read as ratios, never as logarithms. The
   caption says *log scale; the line marks no association*, and why. The Inspector can turn both off.

## Built, 2026-11-06 (0.39.0)

| Widget | Release | What changed |
| --- | --- | --- |
| Regression | 0.2.1 | Its table declares its interval: which `statistic` is the estimate, which are the limits, the level, and that it is a ratio (`interval` on the table, `src/data-table.ts`) |
| Append rows | 0.2.0 | Any number of tables, one port each (`records`, `records_2`, `records_3`, ...), added with **＋ Add a table**, as Map adds point layers. A label per table. **The labels are numbers**, with a unit, recorded as `numericKeys` on the table. A declared interval survives when every table declares it the same way |
| Chart | 0.11.0 | A table with a declared interval is drawn as a point and a whisker per group of rows. For a ratio, a log scale and a dashed line at 1 unless turned off, said on the subtitle with the level. A category declared numeric is placed on a quantitative axis. The receipt adds `fw:chartIntervalLevel`, `fw:chartScale` and `fw:chartReferenceLine` |

The Brazil example's fourth workflow gains three nodes: one Append rows taking the five models, one Select rows keeping
`LST_Day_1km`, and one Chart, 27 nodes in all.

**Found building it:**

- Select rows offered no `term` column after Append rows. The canvas knew a Regression table's columns only after a
  run, so a step below it had nothing to choose from. Regression now declares `term` and `statistic` before it runs,
  and the terms of its numeric variables.
- Chart's *Chart enhancement* read *Classic bars* while Vega-Lite drew every chart. The option was marked chosen
  only when someone had picked it, and Vega-Lite has been the default since 2026-10-13.
- **Variable ports already existed.** Map, Table and Deduplicate grow point ports with `pointInputCount`. Append rows
  follows the same pattern, but without the cap of 8, since no limit has been measured.

**Validation, 2026-11-06:**

| Check | Result |
| --- | --- |
| Unit tests, `tests/append-rows.test.mjs` and `tests/chart-intervals.test.mjs` | 14 pass. The five live estimates, written by hand, are drawn to every digit |
| Brazil playback from an empty canvas, offline satellite fixture, Chromium | Passes: the figure built from the manual, its subtitle stating the log scale, points drawn |
| Brazil playback, live MODIS from Planetary Computer, Chromium | The figure drawn from the workflow's own five models, the ratios unchanged from 180 to the digit. The test's body passed; Playwright then failed closing the browser, because a second test run in the same folder had removed its trace file. Not re-run |
| Validation Lab check 36, pandas `concat` and `pivot` | **Agrees**: the same 40 rows in order, every point equal, lags on a quantitative axis, a log scale holding every limit and 1, the line at 1. CPython 3.13.3 (pandas 2.3.3) and Pyodide (pandas 3.0.2) |

## What would close it

**It closes as validated when** Chart draws the lag–response plot from the Brazil workflow's own five Regression
tables. Each point and whisker must equal the regression's numbers to the digits the table carries. The parity check
is a Validation Lab notebook that draws the same plot from the same estimates and reports those numbers.

**It closes as retired** if building it shows the figure is better made outside Fieldwork, from an exported table.
The reasons go in this document.

## What this does not establish

That the figure says more than the table. That any lag has an effect, since the cautions in 180 stand. That a
distributed lag model would change the shape.
