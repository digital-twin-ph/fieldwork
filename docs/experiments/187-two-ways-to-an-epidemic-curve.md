# 187 · Two ways to an epidemic curve

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** validated, 2026-11-07 (Fieldwork 0.51.0). Cases by period has a week starting Sunday, the Brazil curve is
rebuilt with it (example commit 51902ca), and its manual plays back from an empty canvas in Chromium. Checks that
passed: the rebuilt curve's **51** weekly totals equal the old route's exactly, from the same 4,692 rows; and
`tests/case-series.test.mjs` fails if a Sunday date lands in a week labelled with any other day.

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

## Built and measured, 2026-11-07

| | Before | After |
| --- | --- | --- |
| Route | Select rows → Total within groups → Chart | Select rows → Cases by period → Chart |
| Nodes in the workflow | 4 | 4 |
| Weeks, first and last | 51, 2024-01-07 to 2024-12-22 | the same |
| Total | 423,795 notified cases | the same; every week equal |
| Kind of date | in the subtitle only | declared: *a date of unstated kind* |
| Unit | notified cases/week | the same, kept (it was lost at first; fixed) |

**Two of the design's expectations were wrong.** The route is **not one step fewer**: Cases by period replaces Total
within groups one for one, so the workflow keeps 4 nodes. And the check was to be **52** weekly totals; the source has
51, because week 1 is not in it.

**Found while building it:**

1. **Nothing could choose a table as Cases by period's input.** The run has read a table since Snow's daily deaths, and
   Snow's workflow is built from a fixture that sets it; the Inspector had no control. So this route could not be built
   from an empty canvas until the Inspector gained *Records arrive as*, as Rate has.
2. **The count line was wrong for a weighted series.** It said *616 records* for Snow's 616 deaths in 43 rows, and
   would have said *423795 input records* for Brazil's 4,692 rows. It now says *616 cases from 43 records*.
3. **A series read from a table lost the table's unit.** It now keeps it.
4. **The kind of date had to be chosen, and the source does not say it.** The counts are notified cases by
   epidemiological week; whether a week is of onset or of notification is not stated. The step's *other* reads *a date
   of unstated kind*, which is what the source supports. The old route never had to say.

**Cases by period had no manual page.** Written: `docs/widgets/case_series.md`.

## What this does not establish

That these are the only two routes. The repository examples were read for every chart, the built-in ones only
for Cases by period; NYC's time series are not case counts and were left out, and no other workflow was compared
step by step. That one route is
better in general: Total within groups is right for a table whose dates are not the point. And that fewer steps are
easier to follow, which is the expectation, not a finding.
