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
