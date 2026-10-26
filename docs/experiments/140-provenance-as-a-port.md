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

**Three layers, and an earlier draft of this record collapsed two of them.** The practitioner,
settling it:

> The act of connecting is the user's way of acknowledging that he knows the provenance is
> required. ... And the display of the provenance on the output is merely the evidence of that
> acknowledgement.

| layer | what it is | whose |
| --- | --- | --- |
| **the act** | connecting the port — *I know this provenance is required* | the practitioner's |
| **the evidence** | the provenance shown on the output | the widget's |
| **the record** | the N3 saying it happened | the receipt's |

A draft above said the obligation is "discharged by displaying, not by acknowledging". That has
it backwards. The **act** discharges it; the display is what makes the act checkable by someone
who was not there, and the receipt records that it occurred. Each layer attests to the one above
it, and none substitutes for it.

This is why [136](136-a-figure-that-stands-on-its-own.md)'s rule becomes enforceable:
`FigureStatesItsSource` can stop asking whether a note exists and ask whether it carries what the
figure received — not because the display IS the obligation, but because it is the only evidence
a reader has that the obligation was taken on.

**No connection means no output, not merely a warning beside one.** The practitioner,
2026-10-26: *"if the user does not connect the required provenance port it results in error and
no output."* An error state that still drew the figure would let the figure travel, and the
figure is the thing that reaches an audience.

**Why a DOI is what makes any of this worth doing.** *"The citations are also DOIs, so when
transmitted and embedded in the output they are independently verifiable."* That is the property
the whole design turns on: a DOI resolves for anyone, so an audience can check the provenance
without trusting this application **or** the person presenting. Embedding an unresolvable string
would give a reader something to look at and nothing to check. All three AR6 DOIs resolved on
2026-10-17 — the chapter as a `book-chapter`, FACTS as a `journal-article`, the dataset as a
`dataset` returning `version: 20210809`, which means even the declared dataset version can be
checked rather than taken on the practitioner's word
([probe](../research/doi-resolution-probe-2026-10-17.md)).

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

**~~Is the acknowledgement automatic or an act?~~ SETTLED: an act.** *"The act of connecting is
the user's way of acknowledging that he knows the provenance is required."* So the port is never
wired by the application on a practitioner's behalf. Auto-connecting would produce a receipt
attesting to an acknowledgement nobody made, which is worse than no attestation: it is the
application vouching for a person's knowledge of an obligation they were never shown.

The cost is accepted and should be stated: a practitioner who does not connect it gets an error
rather than a figure, and that is the intended behaviour. The alternative buys convenience with
somebody else's accountability.

## What this does not establish

- **That a port is the right severity.** It makes an obligation visible and connectable. It does
  not decide whether omitting it should stop a run, and
  [115](115-decomposing-the-projection-extract.md)'s P2 decided the opposite for provenance:
  an alert, not a blocker. A dangling port is a third thing — neither fatal nor invisible — and
  whether that is the right severity is the question this experiment exists to try.
- **That practitioners read a dangling port as an obligation.** Nobody has watched one do it.
  That is the observation to write down before the result is known: whether an unconnected
  provenance port reads as *something I must do* or as *something optional the application drew*.
