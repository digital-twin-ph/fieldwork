# Kinds of validation

_Created 2026-10-10 · Updated 2026-10-14_

"Is this widget validated?" has no single answer, because there are seven different checks
here and each one establishes something different. A widget can pass one and fail another,
and the most common mistake is to read a pass on the cheapest check as a pass on all of
them.

This page says what each check establishes, what it does **not**, and how much of the set
it currently covers. For **how to run** the gate, see the README's Validation section. For
the three dimensions these instruments serve — structure, semantics and relevance — see
[the audit procedure](ontology-audit.md), which also records what a pass on each dimension
leaves open.

## The seven

| # | Check | Command | What a pass establishes | What it does **not** |
| --- | --- | --- | --- | --- |
| 1 | **Type check** | `npm run typecheck` | The source compiles and the parameter types line up | Nothing about behaviour |
| 2 | **Unit checks** | `npm test` | The operation does what its tests say, deterministically, including its stated negative cases | That the method suits any real question, or that the numbers are right in the world |
| 3 | **Browser scenarios** | `npm run test:browser` | A workflow can be built, run, saved, reopened offline and read, end to end | Anything about browsers not run. The default gate is Chromium only |
| 4 | **Ontology validation** | `npm run validate:ontology` | The vocabulary is well formed, internally consistent, and rejects the conflations it claims to reject | That the distinctions drawn are the right ones. A reasoner enforces only the modelling it is given |
| 5 | **Registry validation** | `npm run validate:widgets` | Identities, versions, parameter bindings, mapping status, migration adapters and change history are coherent, and the derived classification is current | That the widget works. It checks the paperwork, thoroughly |
| 6 | **Pack validation** | `npm run validate:packs` | A pack's files match the digests the catalog pins, at a full commit, and that pack and host agree about capabilities and stages | That the pack is any good, or that its reviews have run |
| 7 | **Parity** | `npm run validate:parity` | An independent external implementation computes the same numbers under a stated criterion | Scientific certification, or that the method is appropriate. It is agreement, not correctness |

Checks 1–5 run in `npm run check`. Check 6 needs the pack repository and check 7 needs a
[Validation Lab](../../../validation-lab) checkout, so neither is in the gate.

Two human checks sit alongside these and are not automated. The **semantic admission
review** happens before a primitive is built; the **design audit** (D1–D10) checks whether
a widget aligns with the design spec, and was last run in
[the widget design audit](widget_audit.md). Both are in
[the audit procedure](ontology-audit.md).

## What is actually covered today

| Check | Coverage |
| --- | --- |
| Unit, browser, ontology, registry | All 39 widgets, as part of the gate |
| **Parity** | **4 of 39.** `reproject`, `measure_area` and `mean_center` agree; `clip_raster` is **partial** |
| Competency questions | Reviewed by hand. Turning each into a query that runs against a receipt is not implemented |

`clip_raster`'s partial result is worth reading rather than summarising: cell-centre
selection agrees exactly, a pixel-aligned all-touched cutline differs on 2 cells beside the
alignment, and all-touched with a one-pixel margin differs on 61 cells because the external
reference models the margin as a 3×3 dilation, which is not this widget's rule. A
*disagreement that is explained* is a result, not a failure.

The Validation Lab holds notebooks for reproject, raster clipping, area and mean centre.
Its numbering skips two, which is where planned comparisons were never written. So the gap
is not the mechanism — that works, and its evidence is digest-pinned to a lab commit — but
its reach.

## They are independent, and `reproject` proves it

`reproject` has independent numerical agreement with pyproj recorded in the lab. It also
has **no ontology mapping** and **no worked example**. So it is a widget whose arithmetic an
external process has confirmed and which no practitioner has ever been shown working.

That is the argument for not collapsing these into one notion of "validated". By check 7 it
is among the best-evidenced widgets here. By checks 4 and 10 of the design audit it is the
worst.

## Where post-release evidence lives, and the ceiling

A release file is immutable once committed, so evidence that accrues after release cannot
go in it. Parity results live in `widgets/parity.json`, pinned to the lab commit that
produced them, and accumulate as checks run.

There is a limit worth knowing before you try to work around it. `validate-widgets.mjs`
**requires** every release to declare `validationStatus: "application-only"` with an empty
`shaclShapes` array, and `evidence.status: "not-individually-certified"`. So a release
cannot record that its contract is validated more strongly than that, even where it is, and
cannot point at its own parity evidence. Raising that ceiling is a change to the registry
format and needs its own record; until then, a release file saying "not individually
certified" is a statement about the format, not about the widget.

## What none of these establish

Worth stating in one place, because each check's own limits are easy to read as the only
limits.

None of the seven establishes that a result is **scientifically suitable for a public health
question**. None establishes that a practitioner **understood** what they were shown — that
needs the observation work recorded with each experiment. None establishes that external
source data is **true**. And a passing suite says nothing about a distinction the code does
not enforce: the sea-level datum fixtures pass because the fixture's elevations and its
datum label agree with the projection baseline, which is exactly the agreement real data
would not supply ([62](../experiments/62-workflow-traversal.md)).
