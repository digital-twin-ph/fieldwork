# 228 · Detect unusual counts: CUSUM, EWMA and the EARS methods

_Created 2026-11-21 · Updated 2026-11-21_

**Status:** tried. Built 2026-11-21, its methods checked against R's `surveillance` package the same day; the syndromic
worked example that will use it is still to come (TODO).

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
| **D10** | The syndromic worked example, not yet built. |

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

## What this does not establish

That a signal is an outbreak, or that any threshold suits a given surveillance system: α, h and L are decisions about
false alarms, stated, not findings. Seasonal baselines (Farrington, or a GLM baseline) are not here. No lab notebook yet:
the check above is a unit test against R, run on one series.
