# 78 · Trying the composition rules on the isochrone case

_Created 2026-10-10 · Updated 2026-10-14_

**Status:** trial plan, written before the work. Predictions are recorded here so
they can come out badly.

## Why isochrone

It is the only subject where a composition and a widget can be compared directly.
`isochrone` ships as one node. The PHI Advanced-1 notebooks decompose the same
analysis into steps. So the trial has a control.

| Source | Steps |
| --- | --- |
| Advanced-1 NB01–NB03 | download graph, project graph, snap to nearest nodes, ego graph by travel time, buffer reached edges, union, convex hull |
| `isochrone` widget, internals | metric projection, snap, reachability, buffer, union, polygon clipping, hole filling |

They agree. The widget is the notebook, collapsed.

## What this trial tests

| Experiment | Claim under test |
| --- | --- |
| [75](75-compositions-as-nodes.md) | a workflow can be used as a node, and opened |
| [76](76-composition-governance.md) | governance is inherited; the assets are writable; the name asserts a stage |
| [77](77-composition-drift-detection.md) | a pinned dependency list makes drift detectable |
| [74](74-notebook-first-worked-examples.md) | need derived from a notebook rather than asserted |
| The teaching tension | whether an expandable composite serves both the hurried and the learning |

## The obstacle, stated before starting

A composition may contain only registry widgets. To express isochrone it would
need roughly six: project to a metric CRS, snap points to network nodes,
reachability within a time, buffer reached edges, union polygons, convex hull.

**None of them exists.** `buffer_area` takes an area, not edges. Metric
projection is not a widget at all — it is a `zone` and `hemisphere` parameter
repeated on five consumers, which is D5's finding in
[40](40-reprojection-primitives.md).

So the trial begins by building primitives, and that is the point rather than a
setback: it is the notebook-first method producing its bill of materials.

## Predictions

Written now so they can be wrong.

1. **Most of the work is the missing primitives**, not the composition machinery.
2. **The knobs will not distribute evenly, and that is the test.** An earlier
   draft of this prediction said the widget hides decisions the notebook does not
   make, naming hole filling and the snap limit. That was wrong: `isochrone`
   exposes nine parameters — `zone`, `hemisphere`, `minutes`, `thresholds`,
   `fillHoles`, `speedMPerMin`, `bufferM`, `maxSnapM`, `direction` — and those two
   are among them. Nothing is hidden.

   The second draft then posed a false choice — bundled against distributed, one
   node with nine knobs against six nodes with their own. A composition is not
   one or the other. The **public parameter set** is the bundled view, one place
   to tune, and **opening the graph** shows each knob on the step it belongs to:
   `maxSnapM` on the snapping node, `bufferM` on the buffer, `fillHoles` on the
   union, `zone` on the projection. Both views, from one artifact.

   So what the trial actually compares is a widget's nine knobs, where the
   attachment of a knob to a step is something a practitioner must infer, against
   a composition's nine knobs, where it is observable.

   Decisions genuinely without a knob are the ones to look for: the order of
   operations, whether the buffer precedes or follows the union, the hull method.
   Those are candidates for something undocumented, and they are a smaller and
   more specific target than the first draft claimed.

   And the composition can **test** them rather than only expose them. Reorder the
   members, run both, compare. For isochrone the pair worth trying first is
   projection against buffering — buffering in degrees and buffering in metres do
   not agree, and the widget settles that silently by projecting first. If a pair
   turns out not to matter, that is a finding a practitioner can rely on. See the
   ordering section of [75](75-compositions-as-nodes.md).
3. **The metric CRS will surface as "which node owns the zone?"** A chain of six
   nodes each asking for a UTM zone is absurd in a way a single widget concealed,
   so the trial should force the D5 question into the open.
4. **The ontology expansion will be the hardest asset to write**, because the
   composition's meaning is supposed to be given by its members and it is not
   obvious what it adds beyond them.
5. **The expandable graph will be legible and the parameter set will not.** Six
   steps read clearly; which of their parameters to expose publicly is the
   decision with no precedent.

## The control, and what failure means

The shipped `isochrone` is the control. If the composition's output differs beyond
tolerance, one of three things is true: the decomposition is wrong, the widget
hides an undocumented decision, or the notebook and the widget were never
computing the same thing. All three are worth knowing and none is visible today.

This makes the composition a parity check on a widget, which is a use for
compositions nobody has proposed and which falls out of having a control.

## What this does not establish

That compositions help anyone. The trial tests whether the machinery works and
whether the rules are writable, with one subject chosen because it has a control.
Whether a practitioner reaches for a composition, or a learner understands the
analysis better for opening one, is [27](27-workflow-learning-and-gamification.md)
territory and needs people, not a trial.

Nor does it establish that isochrone should be a composition. It may well be
right that it ships as one node — the point is to find out what that node costs
and conceals, which can only be seen by taking it apart once.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Plan the composition trial on isochrone, where a control exists |
| 2026-10-10 | Correct a prediction: the isochrone knobs are not hidden |
| 2026-10-10 | Ordering is a variable a composition can test, and should be documented |
| 2026-10-10 | Promotion is not exposure: a composition gives both views of its knobs |
