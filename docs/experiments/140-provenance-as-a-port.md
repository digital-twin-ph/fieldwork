# 140 — Provenance as a port, on ruleset widgets that require it

_Created 2026-10-26 · Updated 2026-10-26_

**Status:** asked — this record is the design and its admission review, written before the
code, as [138](138-a-table-and-a-boundary-are-two-tables.md) and
[139](139-a-rate-ratio-with-an-interval.md) were.

## The problem it answers

A declaration can be forgotten. Everything built on 2026-10-25 and 26 moved obligations into
declarations — the alert condition onto the node that applies the ruleset, the distinct values
onto the table input, the dataset's citations onto the ruleset that contracts for it — and each
is an improvement on knowledge compiled into a widget. None of them is **refusable**.

The case that shows the cost is not hypothetical. The practitioner, 2026-10-26, on why the three
AR6 citations are obligatory:

> It's something the authors require of users, and if the users present to an audience they will
> be held accountable by other scientists to that provenance requirement.

And [136](136-a-figure-that-stands-on-its-own.md) records the gap that follows:
`FigureStatesItsSource` passes when the source note is non-empty and checks nothing else, so a
figure drawn from AR6 projections passes with a note reading "my data". The citations are on the
receipt. The artifact that leaves the application and stands in front of a room need not carry
them.

## The proposal

The practitioner's, 2026-10-26:

> We can make provenance an output port type so we can connect it to the next widget's input.
> Once the widget input detects a provenance input it separates as a port to acknowledge receipt
> of the provenance from the output — part of the interoperability contract for required
> provenance-bearing widgets.
>
> It's only specific to ruleset widgets where if provenance is required to be transmitted, it
> sends it the output port as well.

**Narrow by construction, and the narrowness is what makes it admissible.** Not every widget
grows a port. One port type, emitted by `apply_ruleset`, and only when the pinned ruleset
declares that its provenance must be transmitted. A ruleset that carries no such obligation —
`extent-review`, which is illustrative — emits nothing extra and nothing on the canvas changes.

The ruleset is the right place for that declaration because the ruleset is already where the
obligation lives: the dataset's identity and its obligatory citations are its `basis`, pinned by
id **and version** on every receipt. Whether the authors require them transmitted is a fact about
the same dataset.

## Why PROV does not already do this

It does the derivation half. The run emits `prov:wasDerivedFrom` chains, so provenance already
flows through the evidence graph, and this proposal adds no new relation to it.

What the evidence graph cannot do is **refuse a connection, or show a practitioner a dangling
obligation before they run**. A declaration is checked after the fact, in a graph most readers
never open. A port is visible while the workflow is being built, and an unconnected one is an
obligation somebody can see they have not discharged. That is the whole of what this adds, and it
should be stated plainly, because "we already have PROV" is the first objection it will meet.

## The admission audit

**D1 · Primitive or composite, and would a practitioner ask for it by name?** Neither: it is a
**port type**, not a widget, so the widget budget does not move. A practitioner does not ask for
it by name; they meet it as a connection the application offers and, if they leave it dangling,
as an obligation they can see.

**D2 · Is it the same as something already here?** No port type carries an obligation today.
The nearest thing is `declarationGaps`, which reports an unstated declaration as an alert on the
run — after it. This is the same fact, before it, and refusable.

**D4a · Standard stud or custom stud?** This is the criterion to answer carefully, because
`widgets/admission.json` enumerates seven custom-stud port types — `gradedFacilities`, `access`,
`distances`, `alert`, `facilities`, `point-comparison`, `coverage-check` — with **"no disposition
attached to them"**, and `alert` was retired on 2026-10-25 for being exactly that: a bespoke port
carrying one value between two nodes.

A provenance port is a different kind. It is **not producer-named**: it does not describe who
made it or what dataset it came from, and every ruleset that must transmit provenance emits the
same type. That is the distinction D4a draws, and this would be the first disposition attached to
any of the seven.

**D10 · Which example instantiates it?** Manila coastal exposure, whose three AR6 citations are
the obligation this exists for.

## What must be decided before building

1. **Is the acknowledgement automatic or an act?** A receiving widget could connect the port
   itself when the data edge is drawn — visible, and never forgotten — or require the connection,
   which makes the obligation an act a practitioner performs. The first cannot be forgotten; the
   second cannot be done absent-mindedly. They are different claims about what a practitioner is
   asserting when they wire it.
2. **What does a widget that cannot carry provenance do?** Refusing the connection stops a
   workflow the obligation did not intend to stop. Accepting it silently drops the obligation at
   the first widget that does not implement the contract, which is worse than not having the port.
3. **Does a figure's source note read from it?** That is [136](136-a-figure-that-stands-on-its-own.md)'s
   piping half, and it is the point of the whole exercise: the obligation is discharged in front
   of an audience, not in a receipt.

## What this does not establish

- **That a port is the right severity.** It makes an obligation visible and connectable. It does
  not decide whether omitting it should stop a run, and
  [115](115-decomposing-the-projection-extract.md)'s P2 decided the opposite for provenance:
  an alert, not a blocker. A dangling port is a third thing — neither fatal nor invisible — and
  whether that is the right severity is the question this experiment exists to try.
- **That practitioners read a dangling port as an obligation.** Nobody has watched one do it.
  That is the observation to write down before the result is known: whether an unconnected
  provenance port reads as *something I must do* or as *something optional the application drew*.
