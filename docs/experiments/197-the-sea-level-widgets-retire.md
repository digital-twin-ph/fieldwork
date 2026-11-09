# 197 · The two bespoke sea-level widgets retire

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** tried. Assign projection site retired into Measure distance and Relate; Compare level to elevation into
the published ruleset `compare-level-to-elevation` 1.0.0, applied by Apply ruleset. The sea-level example is built
from standard steps only.

## The question

The practitioner, 2026-11-09, building the sea-level example ([195](195-the-sea-level-example-reports-a-sea-level.md)):
*"I want to look at the assign projection site widget. It seems this is a custom widget we can replace with standard
ones."* Then: *"Compare level to elevation seems to be a ruleset candidate"*, and *"Those two widgets seem to be bespoke
ones."*

TODO's Duplicates row had said since [103](103-duplicates-should-merge.md) that `nearest`, `access` and
`slr_site_assignment` are three implementations of nearest-neighbour-with-distance, and that the general one must be
made general first. `slr_extract_import` retired the same way on 2026-10-26: none of its operations was about sea level
([115](115-decomposing-the-projection-extract.md)).

## What each does, operation by operation

| Widget | Operation | Already standard |
| --- | --- | --- |
| Assign projection site | For each point, the nearest site and the distance | **Measure distance**: the same shared search, `nearestOf` |
| | Only sites the projections file has | Measure distance's candidate condition, or Relate's unmatched rows, which are shown and decided |
| | The projection at that site | **Relate**, on the site, after **Select rows** narrows the file |
| Compare level to elevation | Narrow to one scenario, family, year, quantile | **Select rows** |
| | Refuse without a stated datum and reference surface | A ruleset's parameters and what it must not be read as |
| | Rise against elevation, millimetres against metres, equal counts as reaching | N3 rules: `math:quotient`, `math:notLessThan` |

**Neither holds an operation about sea level.** The sea level is in the data and the ruleset's declarations.

## What stands in the way

Measure distance gives `distances`, which only Outreach criteria accepts. Relate, Select rows and Table take `table`.

**Proposed:** a `table` port accepts a `distances` result, read as a table: one row per point, keyed by `point_id`,
`nearest_id` and the nearest candidate's own attributes as `nearest_<attribute>`, with the distance as the value in its
stated unit. A distances result is a table of points and their nearest candidate; the port type was the only thing
saying otherwise. `nearest_site_id` is then what Relate matches to the projections' `site_id`.

## The plan

1. A `table` port accepts `distances`, converted where it is read (`distancesAsTable`).
2. Assign projection site and Compare level to elevation retire: classified retired, a final release record each.
   Remove now: no outside user, so no deprecation period.
3. `compare-level-to-elevation` 1.0.0, a published ruleset over a table holding a rise in millimetres and an elevation
   in metres. It must not be read as an inundation model; its declarations say the elevation must be measured from the
   projection's baseline sea surface.
4. The sea-level example's manual moves to Measure distance; its bundle and pin follow.

## What building it found

| Found | Fixed |
| --- | --- |
| A published ruleset that computes a value concluded nothing: only rules written on a step were evaluated directly, and the reasoner cannot compute | A published ruleset that computes runs the same way, its fields its declared bindings with the units its contract expects |
| A value Relate brought across reached the rules as text, `"1124"`, which a rule reads as unreadable | A column the table declares numeric (`numericKeys`) reaches the rules as a number |
| Measure distance was not on the standard Inspector, and is now the step the example relies on | Moved: unit and candidate conditions in Configure…, its result said under Result. Measure distance 0.6.0 |

## Validation

- Unit: `tests/distances-as-table.test.mjs` (2): the table's columns, a point with no location counted, a table port
  taking distances and a workflow wiring Measure distance into Table validating.
  `tests/compare-level-to-elevation.test.mjs` (2): below reaches, equal reaches, above stays below, a missing value is
  Unknown, with margins −224, 0 and 376 mm; and the ruleset's evidence is given as DOI links (that they resolve was
  checked for extract-contract on 2026-10-17, not again here).
- Browser, Chromium: the sea-level manual builds both workflows from an empty canvas with neither widget, and the
  second still reports 1,124 mm; the bundle pushed (c172f4b) holds no retired node type. Measure distance's dialog is
  exercised by the Old Naledi and facility-inputs tests.

## What would close it

The sea-level example built from an empty canvas with neither widget, giving the same facilities, gauges, distances
and 1,124 mm; the ruleset tested on rows that reach, fall short, equal and lack a value.

## What this does not establish

That a rule written once fits other elevation questions. The ruleset is used by no example until a terrain height and
the offset to local sea level are sourced ([the research note](../research/terrain-models-vertical-datum-2026-11-07.md)).
