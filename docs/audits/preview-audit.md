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

## Shows nothing of this workflow's data (7 of 43, was 14)

**Only the walkthrough.** None, as of 2026-11-25. All five that were in this list -- Move points in a donut and
Aggregate points to H3 cells (2026-11-24), then Convex hull, Voronoi catchments and Mean center (0.196.0) -- now run
the step's own function on the points actually connected. What remains below is the harder kind: a Preview that
cannot show data because the function behind it never receives any.

**Four of these were built out on 2026-11-25** — Cases by period, Measure distance, Regression and the space-time
scan — each now counting from the records connected. What they have in common is that their records are reachable
while the dialog is drawing: a table on a node, or a point layer that holds its points.

**Five of the seven left are held by the same thing, and it is not the dialogs.** Network isochrone, Reachable
junctions, Clip raster, Sample a raster and Travel time over ground all read data kept OUTSIDE the page — a downloaded
street network or a raster, stored by reference and read when the workflow runs. A dialog builds its Preview
synchronously, so none of them can reach their data at all. Measured on the Snow isochrone example, whose network node
carries no `data` and only a `dataRef`. Making these count needs `openConfigDialog` to accept a Preview that resolves
later and redraws, which is a change to the component every dialog uses; not attempted here.

**Reachable junctions is counted here although it improved** on 2026-11-25: it now says exactly what it is waiting
for, and no longer asks for a street network that is already connected. That is a correction, not a count — it still
shows nothing of this workflow's data, so it stays on this list until the network can be read.

**The other two were never classified, and both are reachable now.** Table output has its table or its points on a
port, and Point data has its points on the node itself — neither waits on anything held outside the page. Their
Previews describe the FORMAT rather than the data: *"Rows are shown as imported, an absent value as unknown"*, and
*"One point per row, in WGS 84 degrees"*. The same sentence appears over three rows and three hundred thousand, and
over a layer whose coordinates are all missing. They are the next two to build, and they need no new machinery.

**A sentence restating the settings.** Each of these builds its Preview from the node's params alone — the functions
take a `WorkflowNode` or a params object and no records, so no wiring could make them show data:

| Step | Its Preview was | Now |
| --- | --- | --- |
| Cases by period | `seriesSentence(draft)` | counts, 0.9.0 |
| Measure distance | `distanceSentence(node)` | counts, 0.7.0 |
| Regression | `regressionPlan(draft)` | counts, 0.7.0 |
| Space-time scan | `scanSettingsSentence(draft)` | counts, 0.7.0 |
| Reachable junctions | `minutes × speed` | says what it waits for, 0.7.0; still no data |
| Network isochrone | `minutes × speed` | unchanged — data held outside the page |
| Clip raster | `clipSentence(node)` | unchanged — data held outside the page |
| Sample a raster | `sampleSentence(node)` | unchanged — data held outside the page |
| Travel time over ground | `travelSentence(node)` | unchanged — data held outside the page |
| Table output | a fixed sentence per mode | unchanged — reachable, not yet built |
| Point data | a fixed description of the format | unchanged — reachable, not yet built |

Network isochrone deserves its own line: *"The longest time goes up to 1.13 km along the streets at 75 metres a
minute"* is derived, not quoted, which is why it reads like a preview. It still says nothing about the streets
connected to the step, and the practitioner's objection to the walkthrough beside it was that a street network is
used point to point, which this does not show either.

## Had a real preview that could not reach its data (2, both resolved in 0.196.0)

Clip polygons and Summarize points to polygons compute what they would make — *"N of M polygons kept"* — but
`polygonsOn` looks only at a stored layer or at the last run's output while the run is current. A polygon layer a
step COMPUTED upstream, which is the ordinary case in Snow, was in neither place, so both fell back to *"The polygon
layer arrives when the workflow runs."* The run already remembered such layers in `result.computed`, keyed by node;
`pointChoices` read it and these did not.

`polygonsOn` now reads it too, as a third and last source -- a stored layer and a current run still win, because
those carry the whole layer where this carries its shapes. Gated on the run still matching the workflow, like the
lookup beside it: without that, editing a step above left the preview describing the input of a run that no longer
applied, which is how it was first written and what an outside review caught the same day.

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
