# 206 · Syndromic surveillance: detecting an aberration in a count over time

_Created 2026-11-11 · Updated 2026-11-11_

**Status:** asked. An analysis the practitioner brought on 2026-11-11, checked here against the palette as it stands;
nothing built, and nothing placed in the order of work yet.

## The question

Can a practitioner flag a day or week whose count of a syndrome is higher than expected, the way syndromic
surveillance systems do, from steps Fieldwork already has? And where it cannot, what is the smallest addition?

The analysis the practitioner pasted, in short: chaining existing steps covers space-time clustering (**Space-time
scan**) and a fixed threshold (**Cases by period**, then **Apply ruleset**); what is missing is statistical
time-series aberration detection, a moving baseline, CUSUM or EWMA, or Farrington. It recommends one processing step
under Epidemiology, such as *Rolling baseline / Z-score* or *Expected count*, that appends `expected`, `std_dev` and
`z_score` columns to the output of Cases by period, so the alert stays in Apply ruleset where it is declared and
versioned; and a dedicated monitor output only if an interactive view with sensitivity sliders is wanted.

## What exists, checked against the code on 2026-11-11

| Step | In → out | What it does for this question |
| --- | --- | --- |
| Cases by period | points, or a table of dated rows → table | Counts per day, week or month by a declared kind of date. Reads a table too (Snow's Table 1), so a feed already counted by day can enter here |
| Rate with a denominator | records → table | A rate per period, with a stated population |
| Apply ruleset | table → table | Rules over each row, including a value computed for every record; a computed value may read the same field in **the previous row of its group**, in a stated order: the row before, or a day, a week or a month earlier (188, stage 4) |
| Regression | table → table | Logistic or Poisson regression of an outcome on an exposure, one model per lag if asked (185) |
| Space-time scan | points → clusters | Kulldorff-style space-time scan, permutation p-values, a day-by-day replay (200) |
| Chart | table → figure | Bars or a curve; its band difference is the only cross-row arithmetic, and it is drawing, not data |

Searched for and absent: any rolling window, moving baseline, standard deviation over a window, CUSUM, EWMA, EARS
C1–C3 or Farrington, in `src/`.

## Three corrections to the analysis, from that check

1. **Apply ruleset reaches one period back, not a window.** Corrected the same day: this record first said Apply
   ruleset never reads across rows, which was wrong (found while removing other text, in `src/authored-rules.ts`). A
   computed value can read the previous row of its group, a day, week or month earlier. EWMA and CUSUM are recursions
   on the previous period (z = λx + (1−λ)·z₋₁; S = max(0, S₋₁ + x − k)), so they may already be writable as rules,
   **if** "previous" can read a value computed in the same step: not yet checked. A mean or a standard deviation over
   several periods (EARS C1–C3) cannot be written that way. The alert stays in Apply ruleset either way.
2. **Regression is the closest existing primitive for the model-based methods.** Farrington is a quasi-Poisson
   regression on the same weeks of earlier years; the Regression step already fits Poisson models in the kernel. What
   it lacks is an expected count per period with its prediction interval, rather than a rate ratio. Extending it may
   cover Farrington; it does not cover the window-based methods (EARS, CUSUM).
3. **An open test bed is already pinned.** The New York example carries ten years of daily emergency visits for asthma
   among children; a window method can be run on a real daily series without new data.

## Options, closest existing step first

| Option | What it adds | Covers |
| --- | --- | --- |
| F · Apply ruleset reads a window of earlier periods | a mean, standard deviation, sum, minimum or maximum of a field over the last *k* periods of its group, after a stated guard band; too few periods give no value, never zero | EARS C1–C3, and with E, CUSUM and EWMA, all as declared rules |
| E · EWMA or CUSUM written as rules in Apply ruleset | nothing new, if "previous" reads a computed column | stateful methods, one lag deep |
| A · Cases by period gains baseline columns | `expected`, `sd`, `z` per period, from a stated window and lag | EARS C1–C3 style |
| B · One new step after Cases by period, *Expected count* | the same columns, from a stated method: window mean and sd, CUSUM, EWMA | window and stateful methods; the analysis' recommendation |
| C · Regression gains expected counts per period | fitted expected count and prediction interval per row | Farrington-style |
| D · An aberration view in Chart | the curve with the expected band and flagged periods | display only |

**Preferred (the practitioner, 2026-11-11: *"Can we modify ruleset to read previous rows?"*): F**, a general feature of
written rules, open to any ruleset and not code for one, so it keeps to the rule of no bespoke ruleset code. E is
checked first, since it may need nothing built; Farrington still wants C. A and B differ in whether the baseline is a setting of counting or a step of its own; examine-before-
proposing points to A or C first, B only if neither carries it without a mode.

## Distinctions, and how each would be enforced

| Distinction | Enforced as |
| --- | --- |
| An aberration is a signal to look, not an outbreak | Limitation, said on the step and in the receipt |
| A baseline window may not include the period it judges, nor the guard band before it | Run-time: the window is stated and checked |
| Too few baseline periods gives no expected value, not zero | Run-time: counted and said |
| A day-of-week pattern is a pattern, not an aberration | Limitation until a method that models it is chosen |

## Validation it would commit to

- Lab: each method against an independent implementation on the same series. The R `surveillance` package implements
  EARS, CUSUM and Farrington (its licence to be stated before use); the method definitions cited from open copies,
  with the gap stated where only a paywalled paper exists.
- Unit: hand-computed baselines on a short series, the guard band, too few periods.
- Browser: the New York daily series, flagged days on the curve.
- **Practitioner observation, before it is known:** whether a flagged period is read as a finding or as a prompt to
  look.

## What this does not establish

Which methods to offer first, which data to show them on, and whether a syndromic feed (counts by syndrome and day
from emergency departments) can be read into Fieldwork as it is published. Nothing is built.
