# Cases by period

_Created 2026-11-07 · Updated 2026-11-11_

**An epidemic curve's counts.** Cases per day, week or month, or by day of the week, by a date whose kind you state: onset, report, death,
specimen collection, or a date of unstated kind.

## What it does

It counts the records in each period, or adds up a count each record carries, and keeps every period between the first
and the last, empty ones as zero. A gap in a curve is a fact about the outbreak, so it is not closed up.

## What you connect

**Records arrive as** decides the input:

- **points, one per record**: a line list with a date, such as Hagelloch's 188 measles cases. Each record is one case,
  or carries its count in **Cases per record**.
- **a table, each row a count**: a table with a date key column, such as Snow's deaths by day or Brazil's notified
  cases by municipality and week. Each row adds its value column to its period.

Changing it disconnects the input, because points and a table are not the same shape.

It gives back a table of periods and counts. **＋ Add epidemic curve** draws it as a Chart.

## How to use it

The step's panel holds its **Name**, its input, one sentence saying what it counts, and **Configure…**, where these are
set and applied with **Apply**:

| Setting | What it decides |
| --- | --- |
| **Records arrive as** | Points, one per record, or a table, each row a count |
| **Date column** | The column holding the date, written as an ISO 8601 date (2024-01-07) |
| **Which date is it?** | Onset, report, death, specimen collection, or other. It is written on the chart's axis and caption |
| **Period** | Day; week, starting Monday (ISO 8601); week, starting Sunday (the epidemiological week); month; or day of the week |
| **Cases per record** | Points only, optional: a column holding how many cases each record stands for |

**Choose the week your data uses.** Brazil's notification system and the United States count epidemiological weeks
from Sunday, and Brazil's `data_iniSE` is that Sunday. Counted by the Monday week instead, each Sunday falls into the
week of the Monday six days before it, and every bar is labelled a day early. A week is labelled by its first day:
*Week beginning 2024-01-07*.

**By day of the week**, the dates are counted Monday to Sunday, all seven kept, so a weekly rhythm can be seen: a
clinic closed on Sundays, reports filed on Mondays. It is a cycle, not a time axis, and it does not say whether the
differences between days are more than chance. Hagelloch's 188 prodrome dates: Monday 23, Tuesday 21, Wednesday 25,
Thursday 34, Friday 30, Saturday 27, Sunday 28.

**When the source does not say which date it is**, choose *other*. The chart then says *a date of unstated kind*.
Brazil's weekly counts are notified cases by epidemiological week, and the source does not say whether the week is of
onset or of notification.

The chart's line under the title gives the total and what it was counted from: *423,795 cases from 4,692 records* when
each record carries a count, *188 records* when each record is one case.

## What it will not do

**It will not treat one kind of date as another.** A curve by date of death is not a curve by date of onset, so the
kind of date is required and is written on the chart.

**It will not guess a date.** A value that is not an ISO 8601 date is left out and counted, never read as day-first
or month-first.

**It will not restrict the curve to a period.** Use **Select rows by value**, a range of dates, before it.

**It will not join places to dates.** Snow's map has places and no dates, and his table has dates and no places.

## What this does not establish

That the kind of date chosen is the one the counts were made by: that is the source's to say. And that a weekly
count is complete: late notifications reach the last weeks after the data were taken.
