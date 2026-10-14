# 99 · H3 resolution, and what the aggregation is for

_Created 2026-10-11 · Updated 2026-10-12_

**Status:** asked — the trade-off is measured and the rule of thumb is written where a
practitioner meets it, but nothing in the application states a purpose or checks a resolution
against a study area. No code changes here.

## The question asked

Raised by the practitioner, on seeing [98](98-the-coverage-ratchet.md)'s hex check run at two
resolutions: *the resolution should suit the study area's extent — but accounting for the
purpose of aggregating, geoprivacy or summarization.*

`hex_aggregate` takes `resolution` and `minOccupancy` as two independent numbers. They are not
independent of each other, they are not independent of the area being studied, and the widget
says nothing about either relationship. So: **what is the right resolution, and does the answer
depend on why the points are being aggregated?**

## How it was tried

Measured rather than reasoned. 250 cholera deaths in the Soho reporting rectangle — 1,318 m
across its diagonal — indexed at resolutions 7 to 12 with a minimum occupancy of 2.

| Resolution | Cell edge | Cells | Kept | Deaths withheld | Median occupancy | Cells across the area |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | 1,406 m | 1 | 1 | 0 | 250 | 0 |
| 8 | 531 m | 2 | 2 | 0 | 125 | 1 |
| 9 | 201 m | 5 | 5 | **0** | 17 | 3 |
| 10 | 76 m | 15 | 14 | **1** (0.4%) | 12 | 9 |
| 11 | 29 m | 65 | 52 | **13** (5.2%) | 4 | 23 |
| 12 | 11 m | 159 | 65 | **94** (37.6%) | 1 | 61 |

## What happened

**The two purposes pull in opposite directions**, which is the answer to the question as asked.

**Geoprivacy wants coarse.** No cell should point at an individual, so occupancy should be high
and — the part that is easy to miss — **nothing should be withheld**, because the points the
sparse rule removes are the most isolated ones, which are precisely the people most
identifiable. Resolution 9 withholds none and the median cell holds 17 deaths. The geoprivacy
example ships at exactly this, which is right for what it is.

**Summarization wants fine, but not too fine.** Enough cells across the area to show structure,
few enough sparse ones that the picture is not mostly holes. Resolution 10 gives nine cells
across and withholds one death of 250. Resolution 12 withholds **94 of 250** and the median cell
holds a single point, so most cells vanish before they are drawn.

**And resolutions 7 and 8 are not aggregation at all** on an area this size: one or two cells
larger than the study area, answering no question anybody asked.

So the rule of thumb the widget does not state: **pick the resolution from the study area's
extent** — roughly ten cells across for summarization, as few as three for privacy — **then
check what the minimum occupancy withholds at that choice.**

## The finding underneath it

**The sparse rule means two different things depending on the purpose, and the application
cannot tell which is intended.**

The points it removes are the most isolated. For geoprivacy that is arguably correct behaviour:
the individuals easiest to identify are the ones withheld. For summarization it is the opposite
of what is wanted — an outlier is often the signal, and a cholera death alone two streets from
the cluster is exactly the observation that matters.

One rule, two meanings, no declaration. That is a sharper problem than the resolution itself,
because a resolution can be chosen by eye from a map and a silently-applied disclosure rule
cannot.

## What was decided

The guidance goes where a practitioner meets it: the Dive Deeper section of
`21-hex-vs-h3py.ipynb`, which now computes the table above from the fixture rather than
asserting it, reads it for each purpose, and states what the sparse rule does to each.

**Nothing is changed in the application, deliberately.** Three options are visible and none is
obviously right:

| | |
| --- | --- |
| **A declared purpose parameter** | `purpose: geoprivacy \| summarization`, which would let the widget refuse a resolution that contradicts it and carry the intent into provenance. Adds a knob, and [94](94-where-explanation-belongs.md) is a caution against adding knobs to carry explanation |
| **A derived default** | Compute a suggested resolution from the connected study area's extent. Useful, and it needs the area as an input the widget does not currently take |
| **Guidance only** | What is done here. Costs nothing, changes nothing, and relies on the notebook being read |

Choosing between them is a product decision, not a measurement, and recording it unresolved is
the honest state.

## What would close it

A decision among the three options recorded above — a declared purpose parameter, a resolution
derived from the connected study area, or guidance only. Guidance is what exists, so this is
already at the weakest of the three; it moves to **tried** if either of the other two is built,
and to **validated** if a practitioner chooses a resolution using the guidance and the choice
holds up.

## What this does not establish

**That ten cells across is right.** It is a rule of thumb from one study area, one point count
and one minimum occupancy. A sparser outbreak over a larger area would want something else, and
nothing here measures how the thresholds move with density.

**That withholding isolated points protects anybody.** Occupancy is not an anonymity guarantee,
which the widget already says. A cell plus a date plus a street may identify somebody whatever
the minimum was, and that is a claim about an adversary's knowledge that no threshold settles.

**And that the purpose can be inferred.** It cannot, which is the point. A workflow that
aggregates to cells records a resolution and a minimum, and nothing anywhere in the run says
whether the intent was to see a pattern or to hide a person.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-11 | Check hex aggregation and the case series; record what the cells are for |
| 2026-10-12 | Make the total a signed number, and make an open experiment say what closes it |
