# Audit — what a Configure dialog's Preview shows

_Created 2026-11-25 · Updated 2026-11-25_

The practitioner, opening one Configure dialog after another in the John Snow example: *"for this voronoi catchment
dialog there is no preview"*, then the same of Clip polygons, Summarize points to polygons, Move points in a donut,
Aggregate points to H3 cells, Mean center, Convex hull and Cases by period — and then the generalisation:
*"Practically all widgets used in Snow built in have similar problems."* Asked to settle it: *"Yes review the widgets
for empty Preview sections."*

The evidence is the 43 `openConfigDialog` calls in the source on 2026-11-24, each read for whether its `preview`
expression can reach the step's records at all. Nothing was run to produce it.

## Why this needed reading rather than grepping

Twice I reported "that is the whole set" from a pattern match for `preview:SHOW_ME`, and twice the practitioner found
another. The reason is that an empty Preview is not the only kind that shows nothing. Cases by period has a Preview
that reads *"Counts cases by day of the week of date_of_prodrome, a date of onset, one case per record"* — a fluent
sentence that never touches a record. It is invisible to a search for the empty ones, and it is the kind most likely
to survive, because it looks like a preview.

## The four kinds

| Kind | Shows the step's own data? |
| --- | --- |
| The rows, before and after | yes |
| A number computed from the input | yes |
| A sentence restating the settings | **no** |
| Only "Show me how it works" | **no** |

## Shows nothing of this workflow's data (14 of 43)

**Only the walkthrough.** Convex hull, Voronoi catchments, Mean center. (Move points in a donut and Aggregate points
to H3 cells were in this list until 2026-11-24 and now compute from the connected points.)

**A sentence restating the settings.** Each of these builds its Preview from the node's params alone — the functions
take a `WorkflowNode` or a params object and no records, so no wiring could make them show data:

| Step | Its Preview is |
| --- | --- |
| Cases by period | `seriesSentence(draft)` |
| Space-time scan | `scanSettingsSentence(draft)` |
| Clip raster | `clipSentence(node)` |
| Sample a raster | `sampleSentence(node)` |
| Travel time over ground | `travelSentence(node)` |
| Regression | `regressionPlan(draft)` |
| Measure distance | `distanceSentence(node)` |
| Table output | a fixed sentence per mode |
| Point data | a fixed description of the format |
| Network isochrone | `minutes × speed`, which is arithmetic on the settings |
| Reachable junctions | the same |

Network isochrone deserves its own line: *"The longest time goes up to 1.13 km along the streets at 75 metres a
minute"* is derived, not quoted, which is why it reads like a preview. It still says nothing about the streets
connected to the step, and the practitioner's objection to the walkthrough beside it was that a street network is
used point to point, which this does not show either.

## Has a real preview that cannot reach its data (2)

Clip polygons and Summarize points to polygons compute what they would make — *"N of M polygons kept"* — but
`polygonsOn` looks only at a stored layer or at the last run's output while the run is current. A polygon layer a
step COMPUTED upstream, which is the ordinary case in Snow, is in neither place, so both fall back to *"The polygon
layer arrives when the workflow runs."* The run already remembers such layers in `result.computed`, keyed by node;
`pointChoices` reads it and these do not.

## Shows the data (the rest)

Append rows, Join a table to the study area, Detect unusual counts, Line layer, Relate, Select rows, Total within
groups, Transmission chains, Rate with a denominator, Area around a point, Measure area, Keep points inside the area,
Tabular data, Polygon layer, Point comparison, Find health facilities, Map, Apply ruleset, Map to a vocabulary — each
reaches its records, or says plainly which input it is waiting for.

## What this does not establish

That the fourteen are equally worth fixing. A Preview restating the settings is honest and sometimes sufficient:
Clip raster's method and margin may be all there is to say before a raster is read. What the audit establishes is
that a reader cannot tell, from the dialog, which case they are in — Cases by period could show the counts per day
and does not, and nothing distinguishes it from Clip raster, which perhaps cannot.

Nor does it rank them. The ones the practitioner met are in Snow because Snow uses nearly every spatial step; the
same defects sit in dialogs nobody has opened yet.
