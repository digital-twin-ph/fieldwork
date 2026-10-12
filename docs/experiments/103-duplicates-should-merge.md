# 103 · A duplicate operation is a merge, not a note

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** validated — the gap in the audit procedure is identified, the criterion that let it
through is extended, and the first case is worked. Nothing is merged yet; the merge is blocked on
port work that was already blocked.

## The question asked

The practitioner, on being shown that `nearest` is the general nearest-neighbour operation
wrapped in the heat demo's vocabulary: *"This is supposed to be something that the widget audit
should have already found out. Instead, we have lingering widgets that could have been merged
with another — that is a DE moment again, a change in direction because of a finding that aligns
to streamlining."*

So: **why did a passing audit leave three implementations of one operation in place, and what
has to change so it does not happen again?**

## What happened

The audit **did** find the duplication. [D2](../audits/ontology-audit.md) records it in terms:
*"Three implementations of nearest-neighbour-with-distance exist today — `nearest`, `access` and
`slr_site_assignment` — so the registry does not catch this."* And D2's own failure condition is
*"Fails if an existing widget performs the same operation."*

**Three widgets perform the same operation, D2 says that is a failure, and nothing merged.**

The reason is structural, not inattention. **D2 is written as an admission gate** — a question
asked of something new, answerable yes or no, with refusal as the consequence. It had no
procedure for the case it actually met: *N implementations already exist.* With no follow-through
attached, "three implementations" is a fact, and a fact routes to wherever the refactor puts it.
[64](64-widget-streamlining.md) put it in Phase 3, *factor the keyed join*, and Phase 4, *narrow
the port types* — both **code** tasks. So a palette question became an implementation question
and the three widgets stayed on the palette, which is where a practitioner meets them.

**And the thing that would have made the merge obvious was never audited.** `nearest` declares:

```
inputs: [['places','points'], ['centers','points']]
output: 'distances'
```

Both inputs carry the general type `points`. The **names** are the heat demo's — so wiring a
facility layer to a tide-gauge layer means connecting "places" to "centers". D7 covers titles and
descriptions, and had been applied to a port name exactly once, opportunistically, when a
practitioner noticed `decisions` overclaiming on `slr_threshold_comparison`. Nothing swept port
names, so the clearest evidence that `nearest` is general-with-specific-wrapping sat in the
declaration unexamined.

## What was decided

**D2 gains a follow-through**, which is the change in direction. When a duplicate operation is
found among existing widgets, the audit must now answer:

1. **Which implementation is the general one** — the one whose operation carries no domain.
2. **What does each other one add**, named as either an operation or domain.
3. **If what it adds is domain, it merges**; its domain becomes a parameter, a prepared input, or
   a separate widget consuming the general output. Only a distinct *operation* earns a widget.

It fails if a duplicate is recorded without naming the general implementation and the disposition
of each other one. That converts "three implementations exist" from an observation into a
decision with an owner.

**D7 is extended to port names**, with a stated failure: a port name that encodes a use rather
than what the port carries.

**The case, worked under the new rule.** `nearest` is the general one: for each point in A the
nearest in B, with the distance, which one won, and an explicit `null` plus a stated reason when
a point has no geometry or B is empty — that last part is what lets `policy` answer `Unknown`
instead of defaulting. `access` adds a speed and a service grading: **domain**.
`slr_site_assignment` adds one validity rule, which [the widget
audit](../audits/widget_audit.md) already established is satisfiable by preparing the site layer:
**domain**. Both merge.

## What changed our minds

**The direction, twice over.**

Three messages earlier this project had the sequence backwards: retire the duplicates first,
because they looked like the cheap group. Then checking what "replaceable" means mechanically —
a current widget declaring a `migrationFrom` adapter — showed **none** of the six affected
workflows is completely replaceable, and that the three nearest implementations carry three
different port types in and out, so collapsing them is a base-contract change and not a rename.

Then this. The cheapest real move is not a retirement at all: it is **making `nearest` general** —
its port names, its title, the ontology mapping Phase 1 flagged it as missing — after which the
other two have something to merge *into*. A retirement-first plan had the dependency inverted,
and the audit's own D2 would have said so if it had carried a follow-through.

**And "the audit found it" was not the same as "the audit acted on it",** which is the part worth
generalising. Five of this audit's findings are recorded as facts with no disposition attached.
A criterion that detects without deciding produces exactly this: a true record, a passing run,
and no change.

## Correction, later the same day — `facilities` is not one of the duplicates

This record worked D2's new follow-through on three widgets and got one of them wrong. It said:

> `facilities` adds a radius filter over a bundled registry: nearest-neighbour-with-distance plus
> data: **domain**. Both merge.

Reading the executor settled it. `facilities` keeps **every** point within a radius of the study
boundary's bounding-box centre. That returns a set; nearest-neighbour returns one match. The two
share `distanceKm` and share no operation, and sharing a distance function is code reuse that had
already been done. So `facilities` was queued behind the output-carrier blocker that the real
duplicate needs, and that blocker never applied to it.

**What it actually is**, and the evidence was already in the registry: `buffer_point`'s own release
says it *"previously existed only welded inside Select nearby facilities"* — it was extracted from
this widget. So `facilities` is `buffer_point`, a circle around a reference point, plus a selection
of the points inside that area, which `coverage_check` already does and already retains. A
composition of two shipped primitives, one of which came out of it.

Two things in it remain domain rather than operation, and they are the reason it is not simply a
composition today: the reference point is the **bounding-box centre** of a boundary, which is
neither the centroid nor the boundary itself and is one example's choice; and it requires every
record to carry text `owner` and `serviceType` attributes, which is NB06's vocabulary.

**What this cost.** The merge plan carried two widgets behind a blocker for three days when one of
them was never blocked, and the wrong classification came from reading a one-line description
instead of the code — the same way a fourth rule application was found by reading a port name. D2's
follow-through asks what each duplicate *adds*; it does not ask whether the thing is a duplicate at
all, and that is the gap this correction exposes. **A duplicate claim needs the operation stated,
not the inputs compared.**

### Sharpened again — it is a study-area problem

The practitioner, on being shown the correction above: *"Facilities looks like a study area widget
related problem."* That is right, and it is sharper than "a composition of `buffer_point` plus a
selection".

The widget declares an **`area`** input and uses only its **bounding-box centre**:
`extent(boundary)`, midpoint, then a radius test per facility. The boundary's shape is discarded
entirely. A widget that says it needs an area needs a point.

**Measured, 2026-10-12.** The Old Naledi boundary's bounding-box diagonal is 2.55 km.

| Selection | Facilities, of 214 |
| --- | --- |
| Shipped: 6 km circle at the bounding-box centre | 122 |
| `buffer_area` at its 5,000 m ceiling, then the points inside | 122 |
| Agreeing | **121** |

One differs each way, at the margin where a circle and a buffered polygon part company. So the 6 km
radius encodes *5 km beyond the boundary* plus the boundary's own half-width of 1.27 km — **a
number compensating for an operation that was missing**. The study-area primitive reproduces the
widget to one facility in 122, using the geometry the widget threw away.

So the decomposition is `buffer_area` plus a selection, not `buffer_point` plus a selection.
`buffer_point` was extracted *from* this widget, which is why it looked like the answer, and reaching
for it repeats the same mistake one level down: substituting a circle for a boundary that was
available all along.

**What is actually missing is the selection.** Nothing in the registry takes `(area, points)` and
outputs `points`. `coverage_check` does that geometry and emits a review carrier that only
`map_output` and `table_output` consume, so a spatial selection cannot be chained into anything.
Two widgets take an area and produce points — `samples` generates a grid, `find_health_facilities`
fetches from a source — and neither selects.

**The cap was a knob, and it was not the obstacle.** `validateBuffer` capped at 5,000 m with no
stated reason, while the geometry helpers in the same module accept 50,000 — and
`validateBufferPointNode` delegates to the same function, so one number governed both buffer
widgets. It is 50,000 now, on the practitioner's point that it is a knob.

But raising it refuted the claim it was raised for. Measured across distances:

| Boundary widened by | Selected | Agrees with the shipped 122 | Shipped only | Widened only |
| --- | --- | --- | --- | --- |
| 4,000 m | 93 | 93 | 29 | 0 |
| 4,500 m | 109 | 109 | 13 | 0 |
| **5,000 m** | **122** | **121** | **1** | **1** |
| 5,500 m | 139 | 122 | 0 | 17 |
| 6,000 m | 150 | 122 | 0 | 28 |

6,000 m **over-selects by 28**. The closest equivalent to the shipped selection is a 5,000 m margin,
which was inside the old cap all along — so the cap never stood in the way of the replacement, and
the sentence that said it did was wrong within the hour. Reaching for the cap was reaching for an
explanation before measuring, which is the third time in one day that a one-line reading needed
code or numbers to correct it.

The disposition is net **zero** on the widget count: one general primitive added, one
example-specific widget retired. The count is not the point. It converts a widget that bakes in one
example's reference point and one registry's attribute vocabulary into two that bake in neither.

## What this does not establish

**That the merge is safe.** It is blocked on the same port work as everything else —
[66](66-ports-as-schema-binding.md) — and `distances` is consumed by `policy`, which is itself a
retirement candidate. The order between them is not worked out here.

**That three is the only duplicate.** D2's table also records group-and-aggregate over three
keys (`summarize_polygons`, `hex_aggregate`, `case_series`), judged separately because each is
asked for by name. The new follow-through has not been run against that one, and running it is
the obvious next application.

**And that the other recorded-but-undisposed findings are now dispositioned.** Extending D2 and
D7 changes what the *next* audit must do. It does not retroactively decide the findings the last
one left lying, and nothing here sweeps them.
