# Chart

_Created 2026-10-28 · Updated 2026-11-04_

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

### Variables moving together through time: one panel each

When a table carries several variables in one column — what Table input's **Wide** shape makes of a file with a
column per variable — set **One panel per** to that column. Each variable gets its own panel and its own scale,
stacked on one shared axis, so a reader runs down one date and reads every series, and a lag shows as an offset
between panels.

| Setting | What it decides |
| --- | --- |
| **One panel per** | The key column whose values become panels. *No panels* is one chart, as before |
| **Mark for** each panel | Bars or a line. *Automatic* is bars up to 60 points and a line beyond |
| **Shade a period**, From and To | Dates shaded behind every panel, both days included. Offered when the axis is dates |

A value missing from a panel is a gap in its line, never a zero. Panels draw up to 250,000 points, the same as a
table holds; measured in Chromium, 100,000 points took about 10 seconds to draw and 250,000 about 30 (experiment 175). They are drawn by the Vega-Lite renderer; the plain renderer and the write-up figure say so
instead of drawing them on one scale. Experiment 174.

**Two y axes on one plot are not offered.** The ratio between two axes is arbitrary, so it can make any two series
look correlated. **Aligned panels show timing, not effect**: that visits rose with PM2.5 in the same week is not a
measure of how much PM2.5 raises them.

### It states its own shape in the write-up

Every run machines a note into **Results** on the Notes tab stating what this chart is made of. It carries the line the chart already states rather than writing over it, and adds the number of bars, the column they are one per, and a warning where a bar sits at zero — because a withheld value and a measured zero are drawn the same way.

**The caption is yours.** A caption states the subject, the population, the place and the period
in your words, and none of that can be read off a chart. What this writes is what the chart
declares about itself — the material you write the caption from, sitting beside it in the same
section.

**And it carries no number.** A figure's number depends on where it sits in the write-up and on
the venue you are preparing — set one figure aside and the ones after it move up — so the number
is worked out when the document is rendered. Nothing here says "Figure 1".

Edit it and it forks into a note of your own, like any machined note; the machined one goes on
being rewritten by every run.

## What it will not do

**It will not aggregate.** One bar per row, per category or per polygon — it never adds rows
together. If you want totals, total them upstream with **Total within groups**, where the
arithmetic is visible and ends up in the receipt.

**It will not choose a column for you.** Where a table keys on several columns and you name none,
it uses the first, and says which in the caption. Nothing is guessed from a column's name.

**It will not merge two rows that share a category.** They stay as two bars. Adding them would be a
total nobody asked for, and rates cannot be added at all.

**It will not draw more than 100 bars**, and will not colour more than six categories.

**It will not put a count and a concentration on one scale.** Use panels.

**It is not a time series by itself.** Connect **Cases by period** and the periods come with it; a
plain table of dates is a table, and its rows are drawn in the order they are in.

**It does not filter, weight or reinterpret.** Every record it is given is counted once, and the
receipt records the renderer, its version, the specification and what each bar's number means.

## Worked examples that use it

**NYC child asthma and ozone, 2016 to 2025** draws daily visits, ozone, PM2.5 and temperature as four aligned
panels for May to July 2023, with the June smoke days shaded.

**Snow's South London water supply study, 1854** draws the 32 registration sub-districts as bars of
deaths per 1,000 people, from the rate's own chart, so the figure carries the vintage caveat with
it.
