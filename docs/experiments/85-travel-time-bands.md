# 85 · Travel time bands

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** built. The sixth primitive the isochrone decomposition needs, which
was not on [78](78-trying-compositions-on-isochrone.md)'s list of six.

## Competency question

**Which of these junctions are within a shorter time, and how much is left at
each one then?**

## Why it exists: the rings are not four traversals

The Soho example draws four rings — 1, 5, 10 and 15 minutes. `isochrone`
produces them by recomputing itself per threshold (`src/catchments.ts:70`),
which repeats the snap and the whole Dijkstra four times.

It does not have to. A cumulative band is a **subset**: the notebook's own note
says nested thresholds are cumulative, not disjoint. One traversal at the
longest time contains every shorter ring, so four rings are one traversal banded
four ways.

| | Traversals | Snaps |
| --- | --- | --- |
| `isochrone` with four thresholds | 4 | 4 |
| One traversal, four bands | 1 | 1 |

I first described this to the user as a loop problem — four time bands needing
iteration a composition graph cannot express. That was wrong twice over. The
bands are subsets rather than repetitions, so nothing iterates; and the user's
correction, that only one speed is assumed at a time, is what makes the subset
relation hold. Had the speeds differed per ring, the budgets would not nest.

## Why it is not a generic filter

The obvious shape is "keep records where an attribute is at most a value", which
would be useful in a dozen workflows. It would also be **silently wrong here.**

`reachable_corridor` truncates each street by `remainingM / lengthM`, and
`remainingM` is the budget left over *for the traversal that produced it*. Keep
the 5-minute subset of a 15-minute traversal without touching it and every
junction still carries leftover from the 1,125 m budget — so the corridor runs
streets out past the band, and nothing anywhere says so. The areas would simply
be too big.

So the filter and the recomputation have to happen together, which makes this a
primitive about travel rather than a filter about attributes. A generic filter
may still be worth having; it must not be used for this.

## Result: four bands reproduce four thresholds

One 15-minute traversal of the 738-junction Soho network, banded four ways, each
band feeding its own corridor, against `isochrone`'s own thresholds at the same
parameters:

| Band | Junctions | Composed | `isochrone` | Difference |
| --- | --- | --- | --- | --- |
| 1 min | 5 | 14,982 m² | 14,983 m² | 34.9 ppm |
| 5 min | 142 | 198,433 m² | 198,432 m² | 3.8 ppm |
| 10 min | 513 | 698,925 m² | 698,926 m² | 1.3 ppm |
| 15 min | 706 | 867,199 m² | 867,199 m² | exact |

The drift is largest on the smallest ring, which is what you would expect: the
residual is `remainingM` rounded to two decimals, and 5 mm of street weighs more
against 14,982 m² than against 867,199 m². The 15-minute band is exact because
nothing is narrowed.

This is consistency, not parity. Both numbers come from this repository.

## Design checks

| Check | Answer |
| --- | --- |
| **D1** | Residual: membership of a shorter time, with the budget left there. Practitioners ask for it by name — the rings of an isochrone map are this operation. Primitive, on the palette |
| **D2** | No. Nothing in 47 node types filters records by an attribute at all, and a filter would not be this anyway, for the reason above |
| **D3** | See the table below |
| **D4** | One port: points in, points out. The band is a parameter because it is the question being asked |
| **D4a** | Same honest coupling as [83](83-reachable-junctions.md) and [84](84-reachable-corridor.md): the points must carry a traversal's attributes. Output is ordinary points, so a corridor, a map or a table all take it |
| **D5** | **Takes no zone and no speed.** The speed arrives on the junctions, and the traversal's budget is recovered from them as travelled plus remaining. Still nine widgets asking for a zone, not ten |
| **D7** | `travel_time_band`. Spatial operation |
| **D9** | Internally consistent with `isochrone` to within 35 ppm. No external reference: NetworkX has no equivalent, since banding a result it does not keep is not an operation it has |
| **D10** | Not yet in a worked example |

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| The budget left must be recomputed, not inherited | **Validation rule** in effect: `remainingM` is rewritten against the band and the note says why |
| A band narrows, it does not widen | **Hard stop**, naming both times and telling the practitioner to run the traversal longer instead |
| Junctions must come from one traversal | **Hard stop.** Two budgets or two speeds in one input is a mixture, refused rather than averaged |
| Bands are cumulative, not disjoint | **Limitation**, stated. A 5-minute band contains the 1-minute band; disjoint rings would need subtraction, which this does not do |
| The speed is not restated here | **Validation rule** in effect: it is read from the junctions, so a band cannot disagree with its traversal |

## What this does not establish

That cumulative bands are the right presentation. Nested rings drawn over one
another show the 1-minute area four times, and a reader comparing ring widths is
comparing areas that contain each other. Disjoint annuli would need a
subtraction this does not do, and whether a practitioner reads nested or
disjoint rings more accurately is not something a test can answer.
