# 156 · Does the picture say what the figure claims?

_Created 2026-10-31 · Updated 2026-10-31_

**Status:** tried — built for charts, and the check was shown to catch the defect it was built for by
restoring that defect and watching it fail. Maps are NOT built and are the larger half.

## The task

The practitioner, 2026-10-31: *"I think we need some form of automated chart and map validation."*

The evidence was the day it was raised. Every defect in the chart thread was found by **looking**
— a node labelled "ranked" over alphabetical bars, a category with neither a bar nor a number —
and the suite saw none of them through 1,295 unit tests and 740 browser tests. What was testable
before this was **that** a chart rendered.

Then, the same day and after this was sequenced, the strongest case arrived on its own.

## The defect that arrived while the experiment was being sequenced

South London's 1849/1854 figure was opened to check it before re-pinning. Its chart node asked for
`barOrder: 'smallest'` and the figure drew largest-first.

`orderBins` was called in `chartMarkup` and **nowhere else**. The Vega renderer — which draws the
Results tab and the SVG a reader exports, which is to say the figure anyone actually sees — never
called it. The order was composed correctly and dropped before the picture: the **eighth**
instance of the dropped-layer family in this codebase, and the first found by looking at a figure
rather than by a test.

It had been published in that state. Nothing was red.

## What was built

`src/figure-check.ts` · `checkDrawnBars(chart, drawn, tolerance?)` → `FigureFault[]`.

It takes the bins a figure was built from and the bars as drawn — each a label and a length — and
reports where they disagree:

| check | what it asserts |
| --- | --- |
| `coverage` | every category with a value has a bar, and every bar has a category |
| `order` | the drawn order is the order the figure asked for |
| `length` | a bar's length is its value, as a share of the range, within a stated tolerance |

**It reports and does not grade.** Every check returns what it found and a caller decides what is
a failure, because a figure is allowed to be odd on purpose.

Three decisions worth keeping:

- **Paired by position in screen space, never by index.** Pairing a bar to the label at the same
  index asks the renderer whether it agrees with itself, which is the question being begged.
- **Measured against the longest bar, from the figure's own low point.** A figure never shows its
  scale and a reader compares bars to each other. The baseline handles diverging bars, which
  arrived the same week.
- **A truncated axis label is still its category.** Vega writes `Southwark and Vauxhall Comp…`
  where the column is narrow. Read literally, the check would be noisiest on exactly the figures
  it was built to watch. Resolved by prefix, and only when the prefix picks out ONE bin — an
  ambiguous truncation is reported, because then the figure genuinely cannot be read.

`tests/a-drawn-figure-matches-its-claim.browser.mjs` runs it against the real renderer, on the
South London numbers, in all three orders.

## It was shown to work by breaking it again

The fix in `chart-vega.ts` was reverted, the application rebuilt, and the browser test re-run.
It failed, naming the fault:

> order: The figure asks for smallest and draws a different one. Asked: Lambeth only, Jointly
> supplied, Southwark and Vauxhall. Drawn: Southwark and Vauxhall, Jointly supplied, Lambeth only.

**And only ONE of the three orders failed**, which is the finding inside the finding. `largest`
passed because the data happens to arrive largest-first. `category` passed because Vega's nominal
axis sorts alphabetically of its own accord, which is the asked-for order by coincidence. A check
written against a single order would have been written, passed, and seen nothing.

The fix was then restored and all three pass.

## What this does not establish

- **Nothing about maps**, which is half of what was asked for and the harder half. A bar has one
  length; a choropleth has a class, a colour, a boundary, a projection and a legend, and "the
  drawn layers are the layers it composed" needs `fw:layerDrawn` to be read back rather than
  measured off an SVG.
- **That the three checks are the right three.** They are the three that the defects of
  2026-10-31 would have caught. A figure can mislead in ways none of them sees: a truncated axis
  that starts above zero, a colour that implies an order the data does not have, a caption that
  contradicts the bars.
- **That any figure other than a vertical bar chart is covered.** The reader in the browser test
  finds marks by Vega's own class names and pairs on the horizontal axis. A horizontal chart, a
  curve or a band difference would each need their own reader.
- **That a passing check means an honest figure.** It means the picture agrees with the numbers
  it was given. Whether those numbers answer the question is what the receipt and the write-up
  are for.

## What would close it

A map's drawn layers, classes and legend entries are checked against what it composed, the way a
chart's bars now are — and a check runs over the worked examples rather than over fixtures, so a
figure that is published is a figure that was read.
