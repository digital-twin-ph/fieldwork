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

## Why the N3 receipts do not already do this

A first draft of this record said provenance "already flows through the evidence graph" and
framed the port's value as timing — visible before a run rather than recorded after it. That is
a category error, and the practitioner named it:

> The N3 receipts merely record what semantics the widgets express. It's the widgets' job to
> transmit required provenance; the N3 receipts express that that happened.

A receipt is a **record of an act, not the act**. `prov:wasDerivedFrom` says a value came from
another; it does not carry an obligation from one widget to the next, and nothing else does
either. So the honest statement is stronger than the draft's: **there is no transmission of
required provenance today at all.** The receipt has only ever been able to attest to what the
widgets expressed, and on this they expressed nothing — which is exactly why a figure can be
drawn from AR6 projections and say "my data" while the run's receipts look complete.

This is also what the port IS, rather than a view onto something that already exists. It gives a
widget the means to discharge a duty it has always had and never had a way to perform. The
receipt's role is unchanged and remains the right one: once a widget transmits provenance and the
next acknowledges receipt, the N3 says so, and a reader can check the obligation was met rather
than take the application's word for it.

"We already have PROV" is still the first objection this will meet, and the answer is that PROV
is the record. The transmission is the widget's job.

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

## The severity, decided

The practitioner, 2026-10-26:

> If a widget is required-provenance-bearing and the next widget did not acknowledge receipt and
> display the provenance in the outputs, it will result in an **error state**.

That settles two of the three open questions and settles them strictly.

**The obligation is discharged by DISPLAYING, not by acknowledging.** A receiving widget that
takes the provenance and shows nothing has not met it. This is what makes
[136](136-a-figure-that-stands-on-its-own.md)'s rule enforceable at last: `FigureStatesItsSource`
can stop asking whether a note exists and start asking whether it carries what the figure
received. The obligation is to an audience, so it is discharged where the audience looks.

**A widget that cannot carry provenance is an error, not a silent drop.** The alternative —
accepting the connection and losing the obligation at the first widget that does not implement
the contract — is worse than having no port, because the workflow would then look complete while
the duty went unmet.

### This does not reverse P2, and the difference is worth keeping

[115](115-decomposing-the-projection-extract.md)'s P2 made provenance **an alert, not a blocker**,
and that stands. The two decisions are about different things:

| | |
| --- | --- |
| **P2, alert** | A practitioner has not SAID where the data came from. No provenance field changes a computed number, so refusing to compute is a punishment for an unfilled form. |
| **This, error** | An obligation that EXISTS is dropped in transit. The data carries a duty the authors impose, a widget accepted it, and the next one threw it away. |

The first is an absence. The second is a loss. Refusing to run over an absent declaration
punishes someone for not filling in a form; refusing over a dropped obligation stops them
presenting a figure they cannot answer for.

## What must still be decided

**Is the acknowledgement automatic or an act?** A receiving widget could connect the port itself
when the data edge is drawn, or require a practitioner to connect it. The practitioner's own
correction of this record argues for the second: a receipt records an act, so a receipt attesting
to an acknowledgement the application performed on somebody's behalf attests to the wrong thing.
Not settled, but no longer open in both directions.

## What this does not establish

- **That a port is the right severity.** It makes an obligation visible and connectable. It does
  not decide whether omitting it should stop a run, and
  [115](115-decomposing-the-projection-extract.md)'s P2 decided the opposite for provenance:
  an alert, not a blocker. A dangling port is a third thing — neither fatal nor invisible — and
  whether that is the right severity is the question this experiment exists to try.
- **That practitioners read a dangling port as an obligation.** Nobody has watched one do it.
  That is the observation to write down before the result is known: whether an unconnected
  provenance port reads as *something I must do* or as *something optional the application drew*.
