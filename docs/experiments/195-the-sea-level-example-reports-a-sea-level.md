# 195 · The sea-level example reports a sea level

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** tried. Manila coastal exposure has moved from Fieldwork into
[example-2026-sea-level-rise-philippines](https://github.com/digital-twin-ph/example-2026-sea-level-rise-philippines),
and its second workflow now reports the projected rise at each facility's gauge. The built-in example is removed.
Building it from an empty canvas found three defects, each fixed.

## The question

TODO had held two things about this example since 2026-10-26. The practitioner then: *"that is a useless worked example
if titled sea level rise."* It imported 288 AR6 projections, checked them against their contract, and never read one:
the output was facility, gauge and distance. TODO named the limit: carrying a value across is a join, and slicing the
extract is Select rows. Both exist now. And it was to move to its own repository, with the terrain and datum note as
its reading (2026-11-07, `docs/research/terrain-models-vertical-datum-2026-11-07.md`).

## What was built

**The repository**, commit 29cc183: the 288 projections as a CSV, the 8 gauges, 194 OpenStreetMap facilities, the
study-area box, the datum diagram, a README, a CITATION.cff, a manual and a project bundle. The values are those
Fieldwork bundled, unchanged. The facilities are a file under the ODbL, not fetched live: the HOT export was not on
this machine, and serving a subset in its place would have stored a false retrieval record in the published project.

**Two workflows:**

| Workflow | What it reports |
| --- | --- |
| Which tide gauge's projection applies to each facility, and how far is it? | All 194 are nearest Manila's gauge, 145; distances in metres |
| How much is sea level projected to rise at each facility's gauge by 2100? | 1,124 mm, under SSP2-4.5, with vertical land motion, the middle of the likely range |

Without vertical land motion the same projection is 602 mm. The land sinking at Manila roughly doubles the rise.

**The README carries the terrain note** (the practitioner, 2026-11-09: *"Don't forget to incorporate the research note
on terrain models"*): the four terrain models with their datums and licences, the three sources for the
geoid-to-sea-level offset, the diagram, and what is not established.

## What building it found

The manual was performed in Chromium from an empty canvas. Three defects stopped it:

| Found | Where | Fixed |
| --- | --- | --- |
| Assign projection site refused: *"The table input has not been asked for the distinct values of site_id"*. Only code could ask | Tabular data | **List the distinct values of**, a set of ticks in the dialog. Tabular data 0.9.0 |
| Relate after Assign projection site offered no column | Relate's dialog | The assignment's two columns are known before a run. Relate 0.10.1 |
| The rise, one number for every row, became the table's headings, so "1124" headed the distances | The table view | A numeric column is never an axis. Table 0.8.0, which also moves to the standard Inspector (186) |

The second and third were also in the way of anyone joining a value onto an assignment, not only this example.

## Validation

- Browser, Chromium: `tests/sea-level-from-scratch.browser.mjs` performs the repository's manual, both workflows, and
  exports the bundle that was pushed. The three tests that used the built-in example (`write-your-own-rules`) now load
  a table and the extract-contract ruleset directly, and pass.
- Unit: `tests/crosstab.test.mjs` checks a numeric key with one value is drawn as rows.
- Browser, Chromium: `tests/table-output-standard.browser.mjs` checks Table's standard panel and the totals claim
  applied in Configure…; the output, chart and figure-section tests that used its old controls pass.
- `validate:examples`: 9 examples pinned, 90 file digests and sizes verified.

## What this does not establish

- **Which places would flood.** That needs a terrain model's datum and the offset between the geoid and Manila's mean
  sea level, and neither is sourced. The README says so.
- **That the scenario chosen is the one to report.** SSP2-4.5, with vertical land motion, 2100 and the middle quantile
  are stated choices; the file holds 35 others per gauge.
- **That a facility's rise is its gauge's.** The 194 are 0.9 to 13.4 km from gauge 145, great-circle distances computed for this
  record; the projection is for the gauge.
- The datum diagram was in the README only until 0.69.0, when it became a note of the write-up's Introduction
  ([196](196-a-picture-in-a-note.md)).
