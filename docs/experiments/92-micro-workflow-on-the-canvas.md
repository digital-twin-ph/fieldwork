# 92 · A micro-workflow on the canvas

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** validated — the composition can be added, inspected, run and exploded, so
the claim [89](89-the-first-composition.md) could not test is now testable by a
person.

## What a practitioner can now do

| Step | Where |
| --- | --- |
| See it offered, under its own palette group, marked **private, unreviewed** | Micro-workflows group |
| Add it as **one node** carrying the composition's pinned contract and defaults | one click |
| Read what it is pinned to — `compute_walking_catchment 0.3.0`, its stage, its four steps in order | Inspector |
| Change its public parameters | Inspector |
| **Explode** it into the four primitives it arranges | Inspector button |
| Undo back to one step | Ctrl+Z |

The browser check walks exactly that path, including that exploding produces
`snap_to_network`, `reachable_nodes`, `travel_time_band` and
`reachable_corridor` as ordinary nodes, each with its own release and digest in
the Inspector afterwards.

## The governance rule, corrected

[76](76-composition-governance.md) gates the **palette** on admission and says a
private composition is usable in your own workflows. This project read its own
rule as "may not be added at all", which gated trying on review — and so gated
the learning the review exists to protect. In a developmental evaluation that is
backwards: the review is downstream of use, not upstream of it.

The correction is in the rule, not in a fabricated review. Every bundled
composition is offered, and an unreviewed one **says so on its entry and in its
Inspector**, and carries `fw:governanceStatus` into every run's provenance.
Admission still means something: it is the difference between a marked entry and
an unmarked one.

## Exploding is one-way, on purpose

There is no reassemble. Once a member's parameter is changed the nodes are no
longer that composition at that version, so a reassemble action would have to
either refuse or silently discard the change. Undo is the way back, and the
Inspector says so where the button is.

Members are laid out in a row from the host's position and will overlap whatever
was to the right. That is visible and draggable; pretending to solve graph
layout here would have been worse than leaving it plain.

## The output port, and where the seam was not carried through

Reported by the user: the node had no output port on the canvas.

`describe()` built the canvas definition as `{...TYPES[n.type], inputs:nodeInputs(n)}`.
Inputs were already node-aware, because `map_output` changes its ports by
parameter. Output was not, so the canvas drew its handle from the static table,
where `micro_workflow` declares `null`. The node therefore appeared with its two
inputs and nothing to connect onward.

The `outputOf` seam existed and this one call site did not use it. Sixteen
others did: edge validation, `validConnection`, every Inspector source list. The
model was right the whole time, which is why the unit test that runs a
composition into a map passed — the defect was only in what a practitioner could
see and click.

Two lessons, both about how this was missed. A seam added for one caller is not
a seam until every caller that needs it uses it, and a grep for
`TYPES[x.type].output` found the call sites that *looked* like lookups while
missing the one that spread the whole definition. And the unit tests exercised
the model where only a browser test could have shown the missing handle; the
browser check now asserts two input handles, one output handle, and that it is
titled `polygons output`.

## The run that stopped, and why no test caught it

Reported by the user: running a workflow containing the composition stopped with
*"Project manifest does not match its nodes, connections, records or references.
Import a complete project."*

`executionPlan` validates the workflow a **second** time, after
`executeWorkflow` already did. The expansion happens between those two calls, so
the authored project's manifest — an inventory of four nodes — was asserted
against the expanded seven-node graph.

The expanded graph is a run-time arrangement, not the project anybody authored,
so it now carries no manifest at all. The manifest describes what a practitioner
saved; expansion is what the executor does with it.

**No test caught this because every test built its workflow by hand**, and a
hand-built workflow has no manifest, so `assertProjectManifest` returned early
every time. The unit suite ran the composition repeatedly and could not have
seen it. The browser check now runs a composition inside `snow-isochrone`, which
carries a real manifest, and it was verified by reverting the fix and watching
it fail.

That is the second defect in this feature found by a practitioner rather than by
the suite, after the missing output port. Both were in the gap between a model
that was correct and an application that a person actually touches.

## A pre-existing defect, found by testing this

Every numeric field in the Inspector **visually reverts** after a change while
the model updates correctly. Typing 10 into the micro-workflow's `minutes`
leaves the field showing 5, and the saved workflow holds 10.

It is not this panel's defect. The same was measured on `mean-center-zone`,
which predates all of this: filling 31 leaves 30 on screen. `change()` mutates,
validates, saves and re-renders, and the re-render rebuilds the field from a
value that is already stale by the time it is read.

Recorded rather than fixed here, because it affects every numeric parameter in
the application and belongs in its own change. The browser check asserts the
saved workflow rather than the field, and says why in the test.

It has a second consequence worth writing down. Because a re-render can replace
the input at any moment, a test that fills the field and *then* dispatches the
change event leaves a window in which the typed value is lost. That passed in
Chromium and alone in WebKit, and failed inside the full WebKit suite — which is
the shape of a race, not of a browser difference. Setting the value and
dispatching in one step closes it.

## What this still does not establish

That a composition is easier to follow than one node with nine knobs. It is now
*possible* to find out — a practitioner can open `snow-isochrone`, add the
walking catchment beside the monolith, run both and explode one. Nothing here
measures which they understand, and no test can.

**And that is no longer the question being asked.**
[94](94-where-explanation-belongs.md) records why: four nodes are four labels,
four parameter sets and three connections, which is cognitive load of its own.
Exploding remains useful for **inspection** — seeing which step refused, or what
a member was given — and that is a different job from explaining what a widget
does. Explanation belongs in the notebooks.

The John Snow example still uses `isochrone`. Replacing it is the next decision
and a real one: the monolith is a shipped widget and the example teaches it.
