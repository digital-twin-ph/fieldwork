# 134 · A rate from a table, and what Snow's own column does not say

_Created 2026-10-24 · Updated 2026-10-24_

**Status:** tried — `rate` reads a long table, the Inspector states the kind of input, and the
arithmetic is checked against Snow's Table IX. One of Snow's five printed rates does not follow
from the columns beside it, and Fieldwork does not reproduce it.

## What was asked

The South London example is the first worked example whose point is not spatial. Its figures are
two water companies' houses and deaths — rows, not places. `rate` took points only, so the widget
built for exactly this comparison could not read the data that motivated it. The practitioner's
question was which widgets Snow's original analyses need; this was the first answer that turned out
to be a gap rather than a widget.

## What was built

`fromTable(table, measureKey)` pivots a long table into one record per subject: the named key
column holds the measure names, the remaining key columns name the subject. A table whose only key
is the measure column is refused, because it then has no subject and there is nothing to compute a
rate for. The shape mirrors `case_series`, which had taken a table since the Soho curve.

The port keeps its name — `records` — whichever shape it carries, because what it carries is the
records to divide. Only its type follows the stated kind of input. The Inspector now states that
kind, which it did not before: `case_series` has had a table source since 2026-10-16 and has never
offered a control for it, so table mode was reachable only inside an example workflow. Switching
the kind disconnects what was wired, since points and a table are not the same shape.

## What the external check found

Table IX was published in 1855, outside this project and outside Epi Info AI. It is the
independent reference `rate` has never had. Dividing its own columns:

| | Quotient per 10,000 houses | Snow printed |
| --- | ---: | ---: |
| Southwark and Vauxhall, seven weeks | 315.39 | 315 |
| Lambeth, seven weeks | 37.54 | 37 |
| Rest of London, seven weeks | 55.46 | **59** |
| Southwark and Vauxhall, four weeks | 71.42 | 71 |
| Lambeth, four weeks | 5.36 | 5 |

Four of the five are the quotient with the fraction dropped. Lambeth's 37.54 is the only figure
that distinguishes truncation from rounding, and it was printed as 37, so the column reads as
truncated. **Rest of London is not reproduced under either rule.** 59 per 10,000 houses from 1,422
deaths implies about 241,000 houses, not the 256,423 printed beside it.

The first test written here asserted Snow's three printed figures with `Math.round`. It failed at
Lambeth — 37.54 rounds to 38 — and that failure is the only reason the Rest of London cell was ever
divided, because the assertion aborted before reaching it. **A test written to reproduce a quoted
figure would have been made to pass by rounding down, and the discrepancy would have been built
into the widget.**

## The cost

Two cells, one of which is wrong, cannot be told apart from this table. Fieldwork does not guess:
the transcription keeps both as printed, the widget divides the columns, and the example
repository's README records the discrepancy. Anything computing from that file gets 55.46 and not
59, which means the worked example will not match the figure most often quoted from the source it
cites. That is the cost, and it is the right way round — reproducing 59 would mean reproducing the
error and calling it provenance.

## What this does not establish

- Not that Snow erred rather than his printer or a later transcriber. The 1855 text is the only
  witness consulted; the implied ~241,000 houses is arithmetic, not a second source.
- Not that the discrepancy is unknown. The figure is widely quoted; whether its arithmetic has been
  examined before was not researched here.
- Not that the pivot is right for any table. It is checked on one table with two key columns. A
  table with three keys, or repeated measures per subject, is untested.
- Not that 315 against 37 is in doubt. That contrast is Snow's finding and survives either
  rounding: the ratio is about 8.4 whichever way the rates are read.
- Nothing about whether a denominator is the right population at risk. That is a judgment about
  the data, and division does not make it.
