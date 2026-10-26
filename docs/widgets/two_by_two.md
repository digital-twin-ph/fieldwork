# Two-by-two table

_Created 2026-10-26 · Updated 2026-10-26_

**The analysis under the table.** It takes four counts — two groups by two outcomes — and reports
the risk in each group, the risk ratio, the odds ratio and the risk difference, each naming the
method that produced it.

## What it does

A two-by-two is the central table of field epidemiology, and this application could draw one for
months before it could analyse one: it showed the four counts and their margins and stopped there.

On Snow's South London people, built inside the application from two of his tables:

| | died | survived | |
| --- | --- | --- | --- |
| **Southwark and Vauxhall only** | 844 | 166,810 | 167,654 |
| **Lambeth only** | 18 | 19,115 | 19,133 |

| | | |
| --- | --- | --- |
| Risk, exposed | 5.03 per 1,000 | |
| Risk, unexposed | 0.94 per 1,000 | |
| **Risk ratio** | **5.35** | 3.36 to 8.53 · Katz log |
| **Odds ratio** | **5.37** | 3.37 to 8.57 · Wald log |
| **Risk difference** | **4.09 per 1,000** | Wald unpooled |

## Why this exists, and the number to be careful about

The same project carries a **rate ratio of 8.40** on Snow's houses. The risk ratio here, on his
people, is **5.35**. Both are correct and they are 57% apart.

It is tempting to say that is because one is a rate ratio and the other a risk ratio. **It is
not.** A risk ratio over the same houses is **8.401853429780243** — the rate ratio's value exactly,
bit for bit. Deaths per house *is* a risk when a house can hold at most one death, so the two are
the same division. Only the intervals differ, and only in the second decimal: **6.84 to 10.32**
from the rate ratio against **6.85 to 10.31** here.

So what moves the number from 8.40 to 5.35 is the **subject being counted**: a house, or a person.
And that is the one thing the familiar layout does not show. A reader who takes 8.40 for the risk
ratio beside the houses table is right — and is thereby taught that the substitution is always
safe, which it is not. Make the outcome common instead of rare and the two part company.

This widget supplies the estimate. **Reading the denominator is still yours.**

## What you connect

**records** — a table holding **one row per combination** of the exposure and the outcome. Total it
first with *Total within groups*: a cell matching more than one row is refused rather than added up
here, because summing silently is how a two-by-two acquires subjects nobody counted.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Exposure column** | the column holding the groups |
| **Exposed** / **Unexposed** | which two of its values are being compared |
| **Outcome column** | the column holding the outcome |
| **Case** / **Non-case** | which value is the case |
| **Interval level** | 90%, 95% or 99% |

### Why you name the two groups

Because a table may hold more than two. Snow's people-denominated table has **three** supply
categories: 16 of his 32 sub-districts were supplied by *both* companies. That stratum is not an
exposure group, and it is the reason Snow's sub-district comparison could not settle the question
and he went to the house level.

Whatever you leave out is **named on the result**, and the totals are of the two groups you chose
rather than of the table. A stratum silently excluded is the commonest way a two-by-two misleads.

## Reading what you get

The four cells as a table, with the estimates carried on it, and a receipt holding each estimate's
value, bounds, level and **method by name**.

**Each estimate also has a field for what Epi Info calls the same quantity, and it is empty.**
Nobody here has verified Epi Info's displayed labels — the CDC user guide states the statistics in
prose and the layout itself is an image — and filling them in from memory is how a wrong label
enters a teaching context. The field exists so the gap is visible rather than silent.

## What it will not do

- **It will not claim agreement with Epi Info.** These are standard methods, named honestly. A
  parity claim needs a parity suite nobody has written.
- **It will not treat an empty cell as a zero.** An empty cell is unknown, and a two-by-two
  computed as though it were zero would understate that group.
- **It will not add half a case to make a ratio computable.** A group with no cases has no risk
  ratio, and this says so. The usual repair is an assumption, not a measurement.
- **It will not withhold the estimates it can still compute.** A zero cell removes the odds ratio
  and leaves the risk difference perfectly well defined, so each estimate reports its own
  availability and its own reason.
- **It will not accept a table of rates or percentages.** These estimates count subjects. A
  non-whole number is refused.
- **It will not adjust for anything.** This is a contrast between two groups as they were supplied.
  The stratum you left out is excluded, not controlled for, and no estimate here is an effect.
- **It will not test a hypothesis.** Chi-square, Mantel-Haenszel, Yates, Fisher exact and mid-P are
  not built. They are a larger piece and were not started to meet a date.

## Where it is used

The South London example: *Died or survived, by water supply*.
