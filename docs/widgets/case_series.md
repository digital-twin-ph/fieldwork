# Cases by period

_Created 2026-11-07 · Updated 2026-11-12_

**An epidemic curve's counts.** Cases per day, week or month, or by day of the week or month of the year, by a date whose kind you state: onset, report, death,
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
- **a table, each row one case**: a line list that arrives as a table, such as MERS's cases with their recorded
  sources. Each row counts once, and its value column is not read: MERS's is age. Where a case has a row for each
  recorded source, choose **Each case is named in** and each case counts once, at its date; two rows for one case with
  different dates are refused, naming the case.

Changing it disconnects the input, because points and a table are not the same shape.

It gives back a table of periods and counts. **＋ Add epidemic curve** draws it as a Chart.

## How to use it

The step's panel holds its **Name**, its input, one sentence saying what it counts, and **Configure…**, where these are
set and applied with **Apply**:

| Setting | What it decides |
| --- | --- |
| **Records arrive as** | Points, one per record; a table, each row a count; or a table, each row one case |
| **Date column** | The column holding the date, written as an ISO 8601 date (2024-01-07) |
| **Which date is it?** | Onset, report, death, specimen collection, or other. It is written on the chart's axis and caption |
| **Period** | Day; week, starting Monday (ISO 8601); week, starting Sunday (the epidemiological week); month; day of the week; or month of the year |
| **Cases per record** | Points only, optional: a column holding how many cases each record stands for |

**Choose the week your data uses.** Brazil's notification system and the United States count epidemiological weeks
from Sunday, and Brazil's `data_iniSE` is that Sunday. Counted by the Monday week instead, each Sunday falls into the
week of the Monday six days before it, and every bar is labelled a day early. A week is labelled by its first day:
*Week beginning 2024-01-07*.

**By day of the week**, the dates are counted Monday to Sunday, all seven kept, so a weekly rhythm can be seen: a
clinic closed on Sundays, reports filed on Mondays. It is a cycle, not a time axis, and it does not say whether the
differences between days are more than chance. Hagelloch's 188 prodrome dates: Monday 23, Tuesday 21, Wednesday 25,
Thursday 34, Friday 30, Saturday 27, Sunday 28.

**By month of the year**, the dates are counted January to December, every year's January together, all twelve kept: a
season across several years of data. Over less than a year it shows only the months the outbreak lasted, and a month
counted in more years than another holds more cases for that reason alone.

**When the source does not say which date it is**, choose *other*. The chart then says *a date of unstated kind*.
Brazil's weekly counts are notified cases by epidemiological week, and the source does not say whether the week is of
onset or of notification.

The chart's line under the title gives the total and what it was counted from: *423,795 cases from 4,692 records* when
each record carries a count, *188 records* when each record is one case.

### Counted for each value of a column

**Count each value of** names a column of the records, such as a school class. Each period is then counted for each
of its values, every period kept for every value, a blank its own value; the table is keyed by period and the column,
and Chart draws it in panels or, with **Draw** *Stacked bars*, as one bar per period divided by the values. Hagelloch's
*Who fell ill?* counts its cases by week for each school class. For points, and for a table whose rows are each one
case: MERS's curve by generation splits its cases by the `generation` column **Transmission chains** adds. Not for a
table of counts.

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
