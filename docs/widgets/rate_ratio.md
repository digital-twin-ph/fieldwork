# Rate ratio with an interval

_Created 2026-10-26 · Updated 2026-10-26_

**A comparison.** It takes a rate with several groups, divides one group's rate by another's, and
reports the ratio with an interval and the counts behind it.

## What it does

A rate tells you how common something was in one group. It does not tell you whether that is more
or less common than somewhere else, and a reader comparing two rates by eye is doing arithmetic
without an interval.

John Snow's argument is the example. Houses supplied by the Southwark and Vauxhall Company had
1,263 cholera deaths among 40,046 houses; houses supplied by the Lambeth Company had 98 among
26,107. Those are two rates. The **rate ratio is 8.40**, with a 95% interval of **6.84 to 10.32**,
and that sentence is the finding — not the two rates side by side.

## What you connect

**rates** — a *Rate with a denominator*, not a plain table. Only a rate declares what its numbers
are per, and that declaration is what makes the division meaningful. A table of numbers connected
here is refused by name.

The rate must have at least two groups, which means it needs a **group by** column.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Exposed group** | Whose rate goes on top. |
| **Compared to** | The reference group, on the bottom. |
| **Interval level** | 90%, 95% or 99%. |
| **Interval method** | Log-normal, which is the only one implemented. |

### Which group goes on top

This is a question about the sentence you intend, not about the data. A ratio of 8.40 and a ratio
of 0.12 are the same finding written two ways, and only one of them is the sentence you meant. Put
the group you are making a claim about on top, and the group you are comparing it with underneath.

### The interval level

A 90% interval and a 95% interval are different claims, so the level is carried on the result
rather than assumed. Widening the level widens the interval; it does not make the finding stronger.

## Reading what you get

A one-row table carrying the ratio, and a receipt carrying everything behind it: both counts, both
denominators, what the denominator counts, the bounds, the level and the method by name.

**There is no multiplier.** A rate ratio is dimensionless — deaths per 1,000 divided by deaths per
1,000 cancels the per-1,000 — so "8.40 per 10,000" is not a quantity, and there is deliberately
nowhere to write one. Change the rate's multiplier and the ratio does not move.

## What it will not do

- **It will not divide by zero events.** A group with no events has no ratio and no interval.
  Dulwich recorded 0 cholera deaths in Snow's seven weeks; the usual repair is to add half an event
  to every cell, which is a choice somebody made and not a fact about Dulwich. This refuses and
  says so.
- **It will not hide a small count.** Putney's single death produces an interval spanning more than
  twentyfold. The ratio is reported with a warning naming the count, because the number is not
  wrong — it is just carrying almost no information, and only the count shows that.
- **It will not compare two different quantities.** Both rates come from one rate node, so they
  share a denominator unit by construction. Deaths per house over deaths per person is not a ratio
  of anything.
- **It will not give you a p-value, and it is not a causal claim.** An interval is a range
  compatible with the data. The ratio is a contrast between two populations as they were supplied,
  and nothing here adjusts for anything the two groups did not share.
