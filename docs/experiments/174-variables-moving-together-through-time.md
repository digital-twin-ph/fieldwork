# 174 · Variables moving together through time

_Created 2026-11-04 · Updated 2026-11-04_

**Status:** tried — built on Chart 0.9.0 and used by the NYC example, Chromium.

## The task

The practitioner, 2026-11-04: *"How do we show the dependent and independent variables moving together through time?"*,
and on the proposal below: *"Yes 174."*

NYC's question is whether child asthma visits rise with ozone and PM2.5. The chart draws one value against one key on
one axis, so visits and a concentration can only be drawn in separate figures that do not line up, or on one axis
where visits/day and ppb share a scale, which is wrong.

## The design

**Aligned panels on one shared time axis**, the figure environmental epidemiology uses for this:

| Choice | Decision | Why |
| --- | --- | --- |
| Layout | One panel per value of a key column (**One panel per**), stacked, one shared x axis | A reader runs down one date and reads every series; a lag shows as an offset between panels |
| Scales | Each panel its own y scale and title | A count and a concentration have no common scale |
| Two y axes on one plot | **Not offered** | The ratio between the two axes is arbitrary, so it can make any two series look correlated |
| Mark | Bars or a line, chosen per panel; bars by default up to 60 points, a line beyond | A daily count over ten years is unreadable as 3,653 bars |
| Time | A key column whose values are all dates is drawn as time, so its ticks thin themselves | The same `orderOf` rule as experiment 171 |
| A period | **Shade a period** from and to, across every panel | The June 2023 smoke days, marked where every series can be read against them |

The data side exists: Table input's **Wide** shape melts the value columns into a variable column and a value column,
which is what **One panel per** takes. A panel's title is the variable's name as the file spells it; its unit waits for
column metadata (experiment 172), because a wide table states one unit for every variable it melts.

### The distinctions it carries

| Distinction | How it is enforced |
| --- | --- |
| A count and a concentration are not on one scale | **Out-of-scope decision**: no shared y axis, no second y axis |
| Panels show timing, not effect | **Limitation**, stated under the figure's method: aligned series are not an association measure |
| A shaded period is the practitioner's choice | **Receipt**: the period is recorded with the panels and marks |

## Validation it commits to

Unit tests on the summary (panels, temporal axis, unique keys per panel, limits) and the specification (one panel per
variable, independent y scales, shared x, the shaded period in every panel); a third NYC workflow built by the manual,
May to July 2023 with 1 to 14 June shaded, Chromium.

## Validation

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `tests/chart-panels.test.mjs` | 6 of 6: panels in order on a time axis, a gap not a zero, independent y on a shared x with only the bottom axis labelled, marks by count and by choice, the shade in every panel, the refusals |
| 2026-11-04 | NYC manual's third workflow performed against Zenodo, Chromium | Passed: 368 points, 92 days × 4 variables, four panels, 1 to 14 June shaded; the PM2.5 peak (190 µg/m³) on 7 June, the day with the most visits within the shaded weeks (49); the most visits of the three months fall in mid-May, outside them |

WebKit was not run locally; CI runs it.

**Found building it:** the wide read keeps the source file on the node so it can be converted again, and NYC's 92
columns × 3,653 rows did not fit in the saved workflow; the save was refused. The source file is now kept on the device
by its SHA-256, as node data already was. A fetched table's export drops it and its reference, so nothing of the
counts travels.

## Practitioner observation, written before the result

Whether a reader sees the 7 June PM2.5 peak and the visits peak as the same day, and whether anyone reads aligned
panels as evidence that one caused the other.

## What this does not establish

- That the exposure caused the visits. The authors' rate ratio needs regression (experiment 167), not built.
- Units per panel, until column metadata (experiment 172) is built.
- Panels in the HTML renderer and the write-up figure, which draw one series; they say so rather than drawing panels
  wrongly.
