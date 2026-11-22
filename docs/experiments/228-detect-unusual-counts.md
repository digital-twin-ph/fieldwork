# 228 · Detect unusual counts: CUSUM, EWMA and the EARS methods

_Created 2026-11-21 · Updated 2026-11-21_

**Status:** validated. Built 2026-11-21, its methods checked against R's `surveillance` package the same day, and by the
Validation Lab's check 53 (Python, numpy) on four series, a seasonal one among them; the syndromic worked example uses
it (0.160.0; its charts, 0.162.0). The practitioner's review of the name is in the TODO. 206 closed into this record
on 2026-11-22; its open questions and the methods not yet offered are [open items](#open-items-2026-11-22).

## The question

The practitioner, 2026-11-21: *"Then let's do CUSUM, EWMA and syndromic surveillance."* Surveillance asks, period by
period, whether a count is more than its own past would lead one to expect. Nothing in Fieldwork asked it.

## What exists (inventory, by input and output)

| Widget | In | Out | Could it set a threshold from a series' past? |
| --- | --- | --- | --- |
| Cases by period | points or a table | a table of counts per period | counts; compares nothing |
| Chart | a table | nothing (an output) | draws a series; tests nothing |
| Apply ruleset | a table | a table | compares a record with a declared number, or the previous row; not with a baseline of several |
| Space-time scan | points | polygons | tests clusters in place and time; not one series' periods against its past |

The retired `alert` was a heat alert, unrelated. No code to reuse: the methods are written from their published
definitions (in `src/aberration.ts`).

## Chosen: one step, Detect unusual counts

### Admission review

| | |
| --- | --- |
| **D1** | Decomposes into: order the periods; take a baseline from the series' own past (a moving window, or the first periods); set a threshold from its mean and spread at a stated false-alarm rate; compare. The baseline and threshold are the residual distinction. **Primitive**, on the palette: a practitioner asks for CUSUM, EWMA or EARS by name. |
| **D2** | Cases by period, Chart, Apply ruleset and Space-time scan, above: none performs it. |
| **D3** | A table, not points: **hard stop** by port type. The periods' column must be named: **validation rule** at run. Two rows for one period in a series, or a count missing: **run-time check**, refused in words. A period with no row: counted as 0 and **said** in the step's sentence. A signal is not an outbreak: **limitation**, said in Show me how and the manual. |
| **D4** | Port type only for kind; columns and method chosen in Configure…; an unconfigured step is a valid draft. |
| **D5** | The method and its settings (baseline, α, k, h, λ, L) live on the step. |
| **D6** | Point data or Tabular data → Cases by period (by day, split by syndrome) → Detect unusual counts → Chart and Table: the syndromic example to come. |
| **D7** | *Detect unusual counts*; port `records` in, `table` out; keys the period's column, the series' column if any, and `measure` (observed, expected, threshold, statistic, signal). |
| **D8** | Unit tests against R's `surveillance` on a series with a known excess; refusals in words; a browser test from a table to its signals, the dialog's chart and Show me how. |
| **D9** | One step where none could do it before. |
| **D10** | The syndromic worked example: built in 0.160.0 ([example-2026-syndromic-surveillance](https://github.com/digital-twin-ph/example-2026-syndromic-surveillance)), charted in 0.162.0. |

## Validation record, 2026-11-21

R 4.4.1 with `surveillance` 1.25.0 (CRAN; 1.26.1 is the source release, not yet built for R 4.4), on 40 made-up days
with five days of excess (days 25 to 29), kept as `tests/fixtures/aberration-r-surveillance.json`:

| Method | Thresholds | Signals |
| --- | --- | --- |
| EARS C1, baseline 7, α 0.001 | within 7e-8 of `earsC` | identical: days 25, 26 |
| EARS C2 | within 7e-8 | identical: days 25, 26, 27 |
| EARS C3, α 0.025 | (see below) | differ on day 25 only |
| CUSUM, k 1.04, h 2.26, baseline the first 7 | bounds identical, sums within 9e-15 of `algo.cusum` | identical |
| EWMA, λ 0.3, L 3 | its formula, computed independently in the test | signals inside the excess only |

**C3 differs by design.** Hutwagner and colleagues define C3 as the sum, over the period and the two before it, of how far
each C2 statistic exceeds 1. R's bound for C3 leaves out the current period's term, so it cannot signal on the first day
of a rise; this step follows the paper and does (day 25). The 7e-8 is the error of the normal quantile here, which
refines an approximation against an erfc good to 1.2e-7.

Platform: Node 22, macOS. Browser test: Chromium.

## Validation record, 2026-11-21: the lab, in Python

The practitioner asked for the lab notebook in Python, not R. Check 53 (`validation-lab`, notebook
`53-detect-unusual-counts-vs-numpy`) writes each method again in numpy from its published definition, with scipy's
normal quantile, reading none of Fieldwork's code. Fixture `detect-unusual-counts-001`, Fieldwork 0.162.0:

| Series | Periods | Runs | Agrees |
| --- | --- | --- | --- |
| 40 made-up days, five of excess | 40 | 5 | all |
| The syndromic example's gastrointestinal days | 175 | 7 (the five at defaults; CUSUM and EWMA as the example runs them) | all |
| Three made-up years, weekly, a winter peak | 156 | 5 (CUSUM and EWMA on the first year) | all |
| A made-up rare condition, most days 0 | 120 | 7, two of them refused alike (a baseline whose mean is 0; one that does not vary) | all |

Expected count, threshold, statistic and limit within 1e-6, every period; the same signals. On the 40 days, R's
recorded values read a third time: C1 and C2 thresholds and CUSUM's the same as Python's, the same signal days; C3
differs on the first day of the rise, as above.

**What the seasonal series shows.** CUSUM on the first year signals for weeks on end in each later winter (50 of 156
weeks); EWMA, whose limit the season's spread widens, in none; the EARS methods on every autumn's rise (C1 7 weeks, C2
15, C3 43). Platform: CPython 3.13.3, numpy 2.5.3, scipy 1.18.1; not yet run in the lab's browser kernel.

## Open items (2026-11-22)

Moved from [206](206-syndromic-surveillance-aberration-detection.md) when it closed into this record, and the methods
not offered yet (the practitioner, 2026-11-22: "Add the above in 228 as open items"). Proposals, not decisions.

**From 206**

| # | Question | State |
| --- | --- | --- |
| 1 | New York's daily series (ten years of emergency-department visits) as the test bed the practitioner chose on 2026-11-14 | open |
| 2 | A seasonal baseline: check 53 showed the methods here have none | open |
| 3 | The day-of-week pattern: a pattern, not an aberration, and nothing here models it | open |
| 4 | Whether a real syndromic feed (counts by syndrome and day) reads in as it is published | open |
| 5 | EWMA's lower limit: whether a fall below it is said, and how | open |

**Methods not yet offered**, ranked as proposed on 2026-11-22

| # | Method | Why |
| --- | --- | --- |
| 6 | Moving Epidemic Method (Vega et al. 2013, open) | a season's start and intensity for ILI, which none of the five methods here can say |
| 7 | Farrington flexible (Noufaily et al. 2013) with day-of-week terms | the seasonal baseline (2) and the weekly pattern (3) |
| 8 | Historical limits: the last four weeks against the same weeks of five earlier years | what weekly notifiable tables used; computable by hand |
| 9 | CUSUM on the count scale (Poisson or negative binomial) | the standardised CUSUM here behaves poorly at counts of 0 to 3, measles' usual range |
| 10 | The regression/EWMA switch ESSENCE uses | a rule for choosing between two methods, mostly covered by 7 |
| 11 | Several syndromes at once | four definitions run daily add up false alarms; at least said, perhaps corrected |
| 12 | Lesser: MCUSUM and MEWMA; the Poisson space-time scan with a population; Holt-Winters or ARIMA; Bayesian methods such as boda | named, not ranked; Bayesian ones sit poorly with one browser tab on a laptop |

Not proposed: machine-learning detectors, which would stand in for the reasoning trainees are to learn.

**What would close these:** each built and checked against an independent implementation, or recorded as not built
with the reason. Which NSSP definition documents recommend which method was not checked.

## What this does not establish

That a signal is an outbreak, or that any threshold suits a given surveillance system: α, h and L are decisions about
false alarms, stated, not findings. Seasonal baselines (Farrington, or a GLM baseline) are not here.
