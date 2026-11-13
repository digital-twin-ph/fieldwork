# Chart

_Created 2026-10-28 · Updated 2026-11-13_

**An output widget.** It draws bars: a set of labelled categories with a number each. It creates a
named tab in Results and changes nothing about the data it is given.

## What it does

It takes whatever you connect and draws a bar per category, or an estimate with its interval.

**A table**, on the **Table** port. One bar per row. The table already says which column names the categories and which
number goes on the bar, so nothing is asked of you: a rate of deaths per 1,000 people across 32
sub-districts is 32 bars, labelled by sub-district, each as tall as its own rate. Any table works —
a rate, a total within groups, a derived value, a related column, a two-by-two, a case series. A case series is
drawn as a curve over its periods.

**A summarised polygon layer**, on the **Polygon summaries** port. One bar per polygon, carrying the count of locations inside it or
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

1. Add **Chart** and select it. Name the Results tab under **Name**, and choose where it goes in the write-up.
2. Under **Inputs**, pick what it should draw: *Table* or *Polygon summaries*.
3. Press **Configure…**. Everything else is set there, and **Apply** writes it:
   - **Draw**: what to draw, listed by the question each form answers. Once the workflow has run, the forms that suit
     the data come first, under *Suits these data*, and the reason for the one chosen is written beneath it: *Who
     infected whom? Transmission tree* is offered first for a table with a column naming each case, one naming its
     source and a date. Forms that need other data follow, with what they need. The choice is yours; nothing is drawn
     until you pick.
   - If the table keys on more than one column, which one labels the bars.
   - The mark: bars, dots, or a **line**, which runs along the categories in their order, upright, with a dot at each
     value. And the orientation, for bars and dots. Bars read best horizontally when the labels are long or there are many of them;
     32 sub-districts is many.
   - A title, a subtitle, axis titles and a source note, if you want them in the figure.
   - Optionally the category legend, which colours each bar. It holds at most six categories, because the validated
     palette is six hues; past that, group the tail upstream rather than ask for a seventh colour.
4. Run the workflow. Afterwards, **Configure…** shows a **Preview** at the bottom: the last run drawn with the
   settings as you change them, before **Apply**. Nothing is run again.

### Who infected whom: a transmission tree

Connect a table, or a point layer, with one row per case: a column naming the case, one naming its infector, and a
date. In **Configure…**, set **Draw** to *Who infected whom? Transmission tree* and name the three columns.

Each case is a dot at its date, on a row of its own. A line runs from its infector's date down to its row and across
to its own date, so the length across is the **serial interval**. A case naming no infector starts a chain; its
children are drawn beneath it, earliest first, so generations read left to right and chains top to bottom.
**Colour is the generation**: the first case in a chain is darkest, and each generation after it lighter, from deep
violet to coral. The same colours mark generations on Map's lines between records, so generation 3 is one colour in
both. **Shape is what the case is**: a circle for a case whose infector is listed, a square for no infector recorded,
and so on, named in the key.

Drawn by Vega-Lite, as other charts are, so it exports as SVG with its title and source note; hover a point for the
case, its date, its infector and its generation, and a line for its serial interval.

Nothing is dropped, and each is counted and said:

| A case that | is drawn |
| --- | --- |
| names no infector | starting a chain |
| names an infector the table does not hold | starting a chain, counted apart |
| sits in a loop (A infected by B, B by A) | starting a chain, counted as in a loop, which no chain can be |
| has no readable date | at its infector's date, outlined |
| records more than one source, one row per source | under the first source listed, each other recorded link dashed, counted |

**More than one recorded source.** A table may hold a case in several rows, one per source recorded for it, as
Relate's *keep one row per match* makes from MERS's contacts. The case is drawn once, under the first source listed;
each other recorded link is drawn as a dashed line, and the cases and links are counted. **Written where no source is
recorded** names a value, such as *none recorded*, that means no source; an empty cell always does.

Hagelloch, 1861: 188 cases in 4 chains, 184 links; the largest chain starts with case 184 and holds 173 cases over 6
generations. The tree draws the reconstruction of who infected whom that the table holds; it does not estimate one.

### A date marked on the curve

Where the chart's axis is dates, as an epidemic curve's is, **Configure…** has **Marked dates**: a day and a label in
your own words, such as *Pump handle removed*, and **+ Add a date** for more. Each is drawn as a dashed line at the day,
in the bar that holds it for a weekly or monthly curve, with its label beside it, by the enhanced renderer; the classic
bars do not draw them. A day of the week or a month of the year is a cycle, not a date, and is not offered. The run's
receipt records each date and its label. John Snow's *When did people die?* marks 8 September 1854.

### A curve divided by a column: stacked bars

Where Cases by period counts each value of a column, as Hagelloch's school classes, **Draw** *When, and of which kind? Stacked epidemic curve* gives one
bar per period, its height the total, divided by those values in one colour each, the first at the bottom, with a key.
More values than the six colours that can be told apart is refused, naming how many; draw panels instead, which is
what the chart does where Draw is left at bars. Hagelloch's *Who fell ill?* stacks its curve by school class.

### What the columns were declared to be

Where a column was described at its source, in Tabular data's or Point data's **Describe columns…**, Chart reads that
before the values, for any column that reaches it under the same name. A column declared as **categories in an order**
draws its bars, and the panels or stack of a curve divided by it, in that order, and each code with its meaning beside
it: *0 preschool*, *1 1st class*. One declared **in no order** is never offered as a pyramid's bands, however much its
values look like ages. A column a step computes, such as a count, carries nothing from the source. Only accepted
descriptions are read, never a dictionary's proposals.

### Two groups back to back: a population pyramid

In **Configure…**, **Draw** *How are two groups spread across ages? Population pyramid*, then name the column whose two values
sit left and right, such as gender. Each band of the category column, such as age, is a row, the youngest at the
bottom; one group's counts run left and the other's right, and the axis reads as a count on both sides. Rows where the
column is blank are not drawn, and the subtitle says how many. A column with other than two values is refused, naming
them. Hagelloch's *Who fell ill?* draws its cases by age and gender this way.

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

### An estimate with its interval: a lag-response or forest plot

A table that declares an interval, as every **Regression** table does, is drawn as a point at each estimate with a
whisker from the lower to the upper limit. Choose the **Category column** the estimates are placed at. Keep one term
upstream with **Select rows by value**; a table holding several terms gets one point per term, labelled with it.

**For a ratio, a log scale and a dashed line at 1 are on by default.** On a log scale a ratio and its inverse, 0.5
and 2, sit equally far from 1, and the line marks no association. The figure says both on its subtitle, with the
interval's level. **Log scale** and **A dashed line at 1** in the Inspector turn them off.

**A category declared a number is placed as one.** Append rows can declare its labels numbers in a unit, so lags of
0, 1, 2, 4 and 8 weeks sit at their distances and the axis is titled with the unit. Otherwise the categories are
evenly spaced, in the table's order.

The Brazil dengue example's fourth workflow draws its five lag models this way: five Regression tables stacked by
**Append rows**, the temperature term kept, one point per lag. Validation Lab check 36 rebuilds the stack and the
points with pandas and agrees with every number. Experiment 181.

**Each point is what the table holds, and no more.** Five points from five separate models are not adjusted for each
other, and a figure cannot add what the models left out.

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

### Where it goes in the write-up

**In the write-up, under**, just below **Results tab name** in the Inspector, chooses the part of the Notes write-up this output's figure and its note go in:
Introduction, Methods, Results or Discussion. **Results** is the default. A map of the study area belongs in the
Introduction; a figure that shows how the analysis was done can go in Methods. References is not offered, because it
holds works and not figures. The run's receipt states the section and whether you chose it, and a validation rule
checks that the note describing the figure is filed in that same section.

## What it will not do

**It will not aggregate.** One bar per row, per category or per polygon — it never adds rows
together. If you want totals, total them upstream with **Total within groups**, where the
arithmetic is visible and ends up in the receipt.

**It will not choose a column for you.** Where a table keys on several columns and you name none,
it uses the first, and says which in the caption. Nothing is guessed from a column's name.

**It will not merge two rows that share a category.** They stay as two bars. Adding them would be a
total nobody asked for, and rates cannot be added at all.

**It will not draw more than 100 bars or estimates**, and will not colour more than six categories.

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
