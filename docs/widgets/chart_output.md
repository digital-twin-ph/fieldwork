# Chart

_Created 2026-10-28 · Updated 2026-10-28_

**An output widget.** It draws bars: a set of labelled categories with a number each. It creates a
named tab in Results and changes nothing about the data it is given.

## What it does

It takes whatever you connect and draws a bar per category.

**A table.** One bar per row. The table already says which column names the categories and which
number goes on the bar, so nothing is asked of you: a rate of deaths per 1,000 people across 32
sub-districts is 32 bars, labelled by sub-district, each as tall as its own rate. Any table works —
a rate, a total within groups, a derived value, a related column, a two-by-two, a case series.

**A reasoning result.** One bar per category, counting records: by decision, by access zone, or by
evidence tier. Categories with no records keep their bars, the order is the one the categories are
defined in rather than alphabetical, and a value the application does not recognise is counted and
shown separately instead of being folded into the others.

**A summarised polygon layer.** One bar per polygon, carrying the count of locations inside it or
the total of a numeric field, whichever the summary holds.

Connect one of them. The chart draws what it is given, so there is no mode to set first and no
question to answer before you have the shape.

**What a bar's number is** travels with the chart. A count of records is a count; a rate is a rate,
printed as the number it is rather than rounded to a whole one, and the axis is titled with the
unit the table declared — "per 1,000 people" — instead of "Recorded count".

**A table's own chart is preferred** where it has one. A rate carries a chart that knows things the
rows alone cannot say: that the numerator and the denominator come from different vintages, and how
many groups had too small a denominator to report. Those appear in the caption.

**Rows with no value are drawn at zero and counted in the caption.** A group whose rate was
suppressed is not a group whose rate is zero, and a chart that quietly dropped it would be shorter
than the table beside it.

## How to use it

1. Add **Chart** and select it.
2. Pick what it should draw on one of the source lists — *Table*, *Reasoning result*, or *Polygon
   summaries*. Only the lists with something to offer are shown.
3. If the table keys on more than one column, choose which one labels the bars. With a single key
   column there is nothing to choose and nothing is asked.
4. Set the mark and the orientation. Bars read best horizontally when the labels are long or there
   are many of them; 32 sub-districts is many.
5. Name the Results tab, give the chart a title, a subtitle and axis titles if you want them in the
   figure, then run the workflow.
6. Optionally turn on the category legend, which colours each bar. It holds at most six categories,
   because the validated palette is six hues; past that, group the tail upstream rather than ask
   for a seventh colour.

## What it will not do

**It will not aggregate.** One bar per row, per category or per polygon — it never adds rows
together. If you want totals, total them upstream with **Total within groups**, where the
arithmetic is visible and ends up in the receipt.

**It will not choose a column for you.** Where a table keys on several columns and you name none,
it uses the first, and says which in the caption. Nothing is guessed from a column's name.

**It will not merge two rows that share a category.** They stay as two bars. Adding them would be a
total nobody asked for, and rates cannot be added at all.

**It will not draw more than 100 bars**, and will not colour more than six categories.

**It is not a time series by itself.** Connect **Cases by period** and the periods come with it; a
plain table of dates is a table, and its rows are drawn in the order they are in.

**It does not filter, weight or reinterpret.** Every record it is given is counted once, and the
receipt records the renderer, its version, the specification and what each bar's number means.

## Worked examples that use it

**Snow's South London water supply study, 1854** draws the 32 registration sub-districts as bars of
deaths per 1,000 people, from the rate's own chart, so the figure carries the vintage caveat with
it.
