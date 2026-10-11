# 92 · A micro-workflow on the canvas

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** built. The composition can be added, inspected, run and exploded, so
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

## What this still does not establish

That a composition is easier to follow than one node with nine knobs. It is now
*possible* to find out — a practitioner can open `snow-isochrone`, add the
walking catchment beside the monolith, run both and explode one. Nothing in this
experiment measures which they understand, and no test can.

The John Snow example still uses `isochrone`. Replacing it is the next decision
and a real one: the monolith is a shipped widget and the example teaches it.
