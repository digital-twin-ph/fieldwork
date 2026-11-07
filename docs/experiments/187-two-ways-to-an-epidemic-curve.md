# 187 · Two ways to an epidemic curve

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. Nothing is built; this is the comparison, read from the workflows and the code, and a design.

## The question

The practitioner, 2026-11-07, retiring micro-workflows ([92](92-micro-workflow-on-the-canvas.md)): *"The lesson in
microworkflows is that we have functions that can potentially be reused under the hood by other widgets, without
necessarily making visible things more complicated."* Then: *"Also the lesson in microworkflows is also applicable
to macro-workflows. For example, I discovered that we have two case examples that arrive at epidemic curves
differently using different widgets, and it's worth discovering how the two workflows are similar or different."*

## The two routes

Read 2026-11-07 from the shipped templates (`src/john-snow.ts`, `src/hagelloch-example.ts`) and the published
project of `example-2024-brazil-dengue`, workflow *How did the 2024 epidemic unfold across the state?*

| | Snow, Hagelloch | Brazil |
| --- | --- | --- |
| **Steps** | Cases by period → Chart | Select rows (a date range) → Total within groups (by `data_iniSE`) → Chart |
| **Input** | Snow: a table of deaths by date. Hagelloch: 188 case points | A table of notified cases, one row per municipality and week (92 × 53 = 4,876 rows) |
| **Period** | Day | Epidemiological week, starting on a **Sunday** |
| **Kind of date** | Declared on the step (death; onset) and written on the axis | Written only in the chart's subtitle |
| **Periods with no cases** | Kept as zero bars | Absent if no row exists |
| **Records without a usable date** | Counted, listed, and named in the caption | Not reported |
| **Restricting to a period** | Not offered by the step | Select rows, by range |

Both add up counts per date. They differ in what the step knows about the date.

## Why Brazil took the longer route

`case-series.ts` offers day, week and month, and its week **starts on a Monday** (ISO 8601). Brazil's epidemiological
weeks start on a Sunday, as `data_iniSE` records. On that data Cases by period would mislabel or scatter the curve:

- **by week**, each Sunday falls into the week of the Monday six days before it, so every bar would carry the right
  count under a date one day earlier than the week the source names;
- **by day**, every week would be one bar followed by six empty days.

So Total within groups was the only step that kept the source's weeks as they are. It does that by not knowing the
values are dates.

## The design

**Cases by period** gains a fourth period, **week starting Sunday** (the epidemiological week used in Brazil's
notification system and in the United States), beside the Monday week it already has. No new widget.

Brazil's curve would then be **Select rows → Cases by period → Chart**: one step fewer, and with the date kind
declared on the step, any empty week kept as a zero bar, and undated rows counted. Select rows stays, because Cases by
period does not restrict to a date range, and adding that to it would duplicate a step that already does it.

On this data the bars should not change: every municipality has a row for every week, so no week is empty, and the
sum per week is the same sum. That is the check.

## What would close it

**`tried`** when Cases by period offers a Sunday week, and the Brazil workflow is rebuilt with it and its manual plays
back from an empty canvas.

**`validated`** when the rebuilt curve's 52 weekly totals equal the current ones exactly, and a test fails if a Sunday
date lands in a week labelled with any other day.

**`retired`** if a Sunday week cannot be added without the Inspector needing more than one plain choice to explain
it, recorded with what was tried.

## What this does not establish

That these are the only two routes. The repository examples were read for every chart, the built-in ones only
for Cases by period; NYC's time series are not case counts and were left out, and no other workflow was compared
step by step. That one route is
better in general: Total within groups is right for a table whose dates are not the point. And that fewer steps are
easier to follow, which is the expectation, not a finding.
