# Detect unusual counts

_Created 2026-11-21 · Updated 2026-11-21_

**An epidemiology widget.** It reads a table of counts per period, such as Cases by period gives, and flags each period
whose count passes a threshold set from the series' own past. A signal says a count passed a threshold set for few
false alarms; whether it is an outbreak is for the person who looks at the cases behind it.

## What it does

For each period it takes a baseline from the same series' past, either the periods just before it or the first
periods of the series, and sets a threshold from the baseline's mean and spread. A period whose count passes the
threshold signals. CUSUM adds up small excesses so that a modest rise that persists signals; EWMA smooths the series
so that a slow shift signals; the EARS methods react to a sudden rise within days.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | a table of counts: one row per period, or per period and series |

Its output is a table: for each period (and series), six rows under a `measure` column: **observed**, **expected**,
**threshold** (in counts), **statistic** and **limit** (on the method's own scale), and **signal** (1 where the period
signals, 0 where it does not, empty before there is a baseline). A Chart draws it; a Table lists it; Select rows keeps the signals.

## How to use it

In **Configure…**:

1. **Column holding each period**: dates, weeks or numbers; periods are put in order.
2. **A series for each** (optional): a column such as syndrome or district, each value its own series.
3. **Method**, and its settings. **After** draws the counts as bars, the threshold as a dashed line and the periods that
   signal as dark bars, and lists every period, before anything is applied.

| Method | Compares each period with | Settings |
| --- | --- | --- |
| **EARS C1** | the mean of the 7 periods before it | baseline, α (0.001), least standard deviation |
| **EARS C2** | the 7 periods ending 3 before it, so a rise does not lift its own threshold | as C1 |
| **EARS C3** | C2's excess over the period and the 2 before it, added | as C1, α 0.025 |
| **CUSUM** | the mean of the first periods; each period's excess over it is added up | baseline periods (7), slack k (1.04), signal at h (2.26), start again after a signal |
| **EWMA** | the mean and spread of the first periods; a weighted average leaning on recent periods | baseline periods (7), λ (0.3), L (3) |

Beneath it, **the method's own computation**: its statistic over time as a solid line, its decision limit dashed, and a
triangle on each day that signals. For CUSUM the line is the running sum against h; for EWMA the smoothed level against
a limit that widens from narrow; for the EARS methods the day's count in standard deviations against z(1−α).

**Show me how it works** walks the chosen method through ten made-up days.

## What it will not do

- **It will not say a signal is an outbreak.** α, h and L are decisions about how many false alarms to accept.
- **It will not guess missing periods.** A period a series has no row for is counted as 0, and the step's sentence says
  how many were.
- **It will not read two counts for one period.** A series with two rows for a period is refused: choose the column that
  splits the series, or select one measure first.
- **It has no seasonal baseline.** A series with a yearly cycle needs a baseline from the same weeks of past years
  (Farrington), which is not here.

## How it was checked

Against R's `surveillance` package (1.25.0) on a series with five days of excess: EARS C1 and C2 thresholds within 7e-8
and the same signals; CUSUM's sums, bounds and signals the same. EARS C3 follows the published definition, which
counts the current period; R's bound does not, so this step can signal a day earlier. EWMA is checked against its
formula. Sources: Hutwagner and colleagues, J Urban Health 2003 (EARS, open at PubMed Central); Page, Biometrika 1954
(CUSUM); Roberts, Technometrics 1959 (EWMA).

## History

### 2026-11-21 · The method's computation drawn (0.2.0)

A `limit` measure, the decision limit on the statistic's own scale, and a chart of the statistic against it in
Configure…; Show me how for each method.

### 2026-11-21 · First release (0.1.0)

EARS C1, C2 and C3, CUSUM and EWMA, on one series or one per value of a column, with the counts and threshold drawn in
Configure… and Show me how. See experiment 228.
