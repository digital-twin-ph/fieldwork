# 181 · A lag–response figure for the Brazil lag models

_Created 2026-11-06 · Updated 2026-11-06_

**Status:** asked. The figure is chosen and the widgets are examined; nothing is built.

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

## What would close it

**It closes as validated when** Chart draws the lag–response plot from the Brazil workflow's own five Regression
tables. Each point and whisker must equal the regression's numbers to the digits the table carries. The parity check
is a Validation Lab notebook that draws the same plot from the same estimates and reports those numbers.

**It closes as retired** if building it shows the figure is better made outside Fieldwork, from an exported table.
The reasons go in this document.

## What this does not establish

That the figure says more than the table. That any lag has an effect, since the cautions in 180 stand. That a
distributed lag model would change the shape. Nor which of the design choices above is right: each is a proposal,
not a decision.
