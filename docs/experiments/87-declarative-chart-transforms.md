# 87 · Declarative chart transforms

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** prototype, built and measured. A chart experiment, not a spatial one.

## The question

[86](86-isochrone-output-stage.md) ended with a gap: Fieldwork could draw the
nested isochrone bands and chart their **cumulative** counts, but not the chart
NB04 actually prints, which shows the **difference** between neighbouring bands.

Two places that difference could live:

| | Where | Cost |
| --- | --- | --- |
| **Upstream** | A new primitive over counts, in TypeScript | Matches house style. The arithmetic is invisible in the provenance — a reader sees a number, not a subtraction |
| **In the specification** | A Vega-Lite `window` + `calculate` pair | Departs from the stated profile, "already computed bins". The subtraction is *written down* in the receipt |

This prototype takes the second, because of something already true of the
chart widget: the entire Vega-Lite specification is recorded in the receipt as
`fw:rendererSpecification`, with the renderer version beside it. A declared
transform is therefore **more** auditable than the same arithmetic in code — the
provenance carries the expression that produced the bars.

## The transform

```json
"transform": [
  {"window": [{"op": "lag", "field": "count", "as": "innerCount"}],
   "sort": [{"field": "order", "order": "ascending"}]},
  {"calculate": "datum.count - (datum.innerCount == null ? 0 : datum.innerCount)",
   "as": "bandCount"}
]
```

Which is NB04 cell 19, declared instead of looped:

```python
points_in_isochrone = pip_mask.sum()
polys_gdf1.at[index, 'points_in_isochrones'] = points_in_isochrone - prev_count
prev_count = points_in_isochrone
```

## Result

The specification was compiled with `vega-lite` and run in a headless `vega`
view, so Vega-Lite computed the numbers rather than the test asserting a shape:

| Band | Cumulative | `bandCount` |
| --- | --- | --- |
| 1 min | 48 | **48** |
| 5 min | 216 | **168** |
| 10 min | 250 | **34** |
| 15 min | 250 | **0** |

The same figures [86](86-isochrone-output-stage.md) computed in a test, now
produced by the chart that displays them, and matching NB04.

## What stops it being a quiet change of meaning

A chart that silently swapped cumulative counts for differences would be worse
than no chart. So:

- it requires the Vega-Lite renderer, and says so when it is not selected
- the measure is renamed: "Records in this band alone", not "Recorded count"
- the description states the difference was computed in the specification
- the tooltip keeps the cumulative count beside the difference
- the receipt asserts `fw:chartMeasureKind "band-difference-of-location-membership-count"`
  and `fw:chartUnitStatus "location-memberships-differenced-between-bands"`
- cumulative remains the default, and its spec is unchanged — no transform is
  emitted unless asked for

## What it refuses

| Refusal | Why |
| --- | --- |
| Any bin without a travel time | There is no order to difference along. "These bins are not nested bands" |
| Two bands with the same travel time | Ambiguous order |
| **Counts that do not increase outward** | An outer band holding fewer records than the band inside it is not a nested set, and the difference would be negative. Proved from the counts, not assumed from the shape |

The third is the one worth keeping. Nesting is a property of the geometry, and
the chart cannot see the geometry — but it can see that the counts are
inconsistent with nesting, and refuse rather than draw a negative bar.

## What this does not establish

That a declarative transform is the right home for analysis. The honest
objection stands: a reader of the workflow graph sees a chart node, and nothing
on the canvas says a subtraction happens inside it. The receipt says so and the
axis title says so, but the graph does not — and this project's usual answer is
that an operation which changes the answer should be a visible step.

What the prototype shows is that the trade is real in both directions, not that
it has been settled. Settling it needs a practitioner reading both charts, which
is [74](74-notebook-first-worked-examples.md)'s method and not a test.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Chart band differences with a Vega-Lite transform, as a prototype |
