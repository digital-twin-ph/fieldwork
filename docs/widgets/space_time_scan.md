# Space-time scan

_Created 2026-11-10 · Updated 2026-11-10_

Looks for places where cases came closer together in time than the rest of the line list would lead you to expect.
It is the space-time permutation scan that SaTScan runs, for a line list of cases with a date and a place, and no
population.

## What it does

The scan tries every circle around every place, and every run of days or weeks. For each circle and run it counts the
cases in both, and compares that with how many would be expected if when a case happened had nothing to do with where:

> expected = the circle's cases over the whole period × the run's cases everywhere ÷ all cases

The circle and run that are most unusual, by the likelihood ratio, is the **most likely cluster**. To test it, the
scan shuffles the dates across the places many times and, each time, finds the highest score anywhere. The p-value is
how often a shuffle scored as high, plus one, over the shuffles plus one.

**Secondary clusters** follow, in order of score. Each shares no place with a cluster before it, and each is tested
against the same shuffles, which is conservative.

## What you connect

- **Cases, with a date and a place**: a point layer. Each record needs a date and a location.

## How to use it

1. Connect a point layer of cases.
2. Press **Configure…** and choose **Each case's date**.
3. Choose **Count by**: day or week.
4. Leave the limits at SaTScan's defaults, or change them:
   - **Largest circle**: a share of all cases, at most 0.5;
   - **Largest radius**, in km, if any;
   - **Longest run**: a share of the study period, at most 0.5;
   - **Study period**: blank means the first to the last date.
5. **Shuffles of the dates** is 999 by default. The **seed** is shown, so the same run gives the same p-values.
6. Press **Apply**, then **Run**. A progress bar shows the shuffles.

Connect the scan to **Map** to draw the clusters as circles, and to **Table** to list them.

### Day by day, as the outbreak unfolded

Under **How to scan**, choose **Day by day**. Each day, the scan looks only at the cases known by then, and only at
runs that end that day: is something happening now? This is SaTScan's prospective scan, run once a day.

The result is one row per day: that day's most likely cluster, its counts and its p-value. The step says the first day
the p-value was at or under 0.05, and at or under 0.01.

**To watch it day by day**, connect it to a Map set to **Interactive map**, with the cases. Press **Play**, or drag the
slider: each day shows that day's circle, only the cases with a date up to that day, and what the scan said in words.
Hagelloch's *Was there a cluster?* has this map: *The outbreak, day by day*.

- **Each day's p-value is that day's alone.** Looking every day raises the chance of a false alarm, and this does not
  correct for it.
- A day with fewer than 4 cases, 2 places or 2 days is too early to scan, and is listed as skipped.
- Cases count on the day of their date, which is not the day they were reported.

### In the write-up

Both ways write a note under Methods: the expected count and the score, worked on the most likely cluster, and how the
p-value was found. The method's paper reaches References: Kulldorff M, Heffernan R, Hartman J, Assunção R, Mostashari
F. A space-time permutation scan statistic for disease outbreak detection. PLoS Medicine. 2005;2(3):e59. It is open
access.

### Reading what you get

Each cluster carries its first and last day, its places, its radius, the cases observed and expected, their ratio, the
log likelihood ratio and the p-value. The case ids inside it are listed.

- The **p-value** is reported as computed. Which threshold to read it against is yours to state, in your write-up.
- A cluster at **one place** has no radius. It is drawn 15 m round.
- Records **without a date or a location**, or outside the study period, are not scanned. They are counted and named.

## Worked examples that use it

| Example | What it shows |
| --- | --- |
| **Hagelloch · was there a cluster?** | 188 measles cases by day of prodrome; the most likely cluster is one house, 8 cases where 0.55 were expected, 30 October to 18 November 1861, p = 0.001. Replayed day by day, first flagged at p ≤ 0.05 on 21 November |

## What it will not do

- **It does not see where people live.** Only the timing is compared across places, so a crowded street is not a
  cluster here. A rise everywhere at once is not a cluster either.
- **It does not say a cluster is an outbreak.** A cluster is a place and time to look at, not a finding.
- **It does not use a population.** That is the Poisson scan, not built yet.
- **Day and week can disagree.** On Hagelloch the second cluster has p = 0.07 by day and 0.01 by week. Choose the unit
  for the question, before you look.

Experiment 200.
