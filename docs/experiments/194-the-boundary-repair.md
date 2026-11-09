# 194 · The boundary repair

_Created 2026-11-08 · Updated 2026-11-09_

**Status:** tried. Study area removes two faults from a published boundary as it is read, a point written twice in
a row and the tip of a zero-width spike, and records every vertex it removes. Validation Lab check 41 agrees with
shapely on 108 units of two sources.

## The question

Sierra Leone's district rates ([193](193-relate-allows-for-spelling.md)) are mapped on OCHA's COD-AB districts, the
only open source with the 16 districts created in 2017; geoBoundaries' Sierra Leone ADM2 holds 14, from before 2017,
and GADM's terms forbid redistribution. The study area refused the file, first as *"Polygon vertices must be
distinct"*, then as *"Remove overlapping or collinear adjacent edges"*, and named all 16 districts each time.

Measured on the file:

| Fault | Where | Count |
| --- | --- | --- |
| A vertex the same as the one before it | 14 of 16 districts | 84 |
| A zero-width spike: about a metre east and straight back along 7.59311° N | Bonthe | 1 |

Neither changes the area any outline encloses. The checks that refused them were written for shapes drawn by hand.

The practitioner, 2026-11-09, asked whether repairing a vertex was *"reproducible by hand"*, whether another source
needed no repair, and then: *"Can we include the repair mechanism in the widget assuming it can solve similar problems
for other boundaries?"*

## What was built

One rule, `REPAIR_RULE` in `src/boundary-repair.ts`, applied to every boundary as it is read, a downloaded level
(`readUnits`) or a file (`unitsFromFile`):

- a vertex equal to the one before it is removed;
- a vertex at the tip of a zero-width spike is removed, by the same collinearity test the study area applies, so what
  is left passes it.

A ring that touches itself anywhere else is not repaired and is still refused.

**Recorded, because a change from the source must be indicated** (CC BY). The dialog says what was removed, by unit
for a spike. The study area keeps each removed vertex by unit, kind and position. Its evidence no longer says
*"Admitted as published… not edited"* for a repaired boundary: it says how many of the published vertices were
removed, states the rule, and lists each one. The Inspector's Result says the counts.

Found along the way: a refusal named every chosen unit, not the one at fault. It now names the unit whose own outline
fails.

## Validation

- Unit (`tests/boundary-repair.test.mjs`, 4 tests): a repeated point removed and listed; Bonthe's three vertices, a
  spike removed with no change in area, and the result passing the study area's own check; a ring touching itself
  not repaired and still refused; a MultiPolygon repaired part by part, a clean boundary left alone.
- Browser, Chromium: Sierra Leone from an empty canvas applies all 16 OCHA districts, and the dialog reported
  "84 repeated vertexes removed" on the first run; the study area, boundary picker, boundary file and extent history
  tests pass.
- Validation Lab check 41, CPython 3.13.3, shapely 2.2.0 on GEOS 3.14.1: on OCHA's 16 districts and geoBoundaries'
  92 municipalities of Rio de Janeiro state, the repeated vertices shapely's `remove_repeated_points` drops equal
  Fieldwork's, position by position and in order (84, in 14 districts); the spike rule written out in Python removes
  the same tip (Bonthe's one); every vertex count is equal; and GEOS's area of every unit is unchanged within 1e-12.
  Exact rational arithmetic decides every spike the same as the declared 1e-12 tolerance. Both a dropped spike and a
  dropped repeat were checked to make it disagree.
- GEOS, recorded and not asserted: it accepts a repeated vertex and calls Bonthe's spike a self-intersection, so
  before the repair it refuses one unit where Fieldwork's own check refused 14; after it, all 108 are valid.
- How often it runs on a source that did not need it: on Rio de Janeiro's geoBoundaries municipalities, never; on
  Nigeria's 774 LGAs as the example carries them, never, run on the Fieldwork side only (left out of the fixture at
  29 MB).

## What would close it

The lab check agrees, in CPython and, on 2026-11-09, in the lab's browser kernel (shapely 2.1.2, GEOS 3.12.1). Still
open: the repair met on a second source where it runs.

## What this does not establish

That every published boundary's faults are these two. A ring crossing itself, or two parts overlapping, is a
different fault and is still refused. That a spike is always a digitising error: it encloses no area, which is why it
is removed, but nothing here knows why it was drawn.
