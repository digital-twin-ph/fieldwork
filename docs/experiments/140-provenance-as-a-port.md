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

## Whoever shares the ruleset owes its users the instructions

The practitioner, 2026-10-26, stating what the rest of this section rests on:

> Whoever creates a ruleset like this that requires provenance transmission and shares it has the
> responsibility to tell its users how it's supposed to be used, so the provenance requirement is
> fulfilled.

That makes the instructions an **obligation on the ruleset author**, not a courtesy, and it
completes a chain in which each link is owed to the next:

| | owes | what |
| --- | --- | --- |
| the dataset's authors | the user | terms: cite these three sources |
| **the ruleset's author** | **its users** | **how to meet those terms in this application** |
| the user | their audience | the citations, on what they present |

The middle row is the one nothing enforced. A ruleset author encodes somebody else's dataset
contract and shares it; a user who applies it inherits an obligation they did not negotiate and
may never have read. Shipping that without saying how to discharge it passes on a duty while
withholding the means, and the user meets it as an error they cannot interpret.

### This is mechanisable, which is the test of whether it is a rule

`validate:rulesets` can refuse a ruleset that declares provenance transmission required and
carries no `obligation` saying how to acknowledge it. That is the project's own preference —
*"mechanised rules enforce; prose rules describe"* — and it is checkable without judgement: the
declaration is present or it is not.

What a validator cannot check is whether the words are any good. That stays a human reading, and
the honest test is the one below: a practitioner who reads it can answer the question a scientist
asks at a venue. A ruleset passing the check with unusable prose is a worse failure than one
refused, because it looks discharged.

## A ruleset tells the user what it obliges them to do

_Added 2026-10-26, by the practitioner, answering the observation below rather than waiting for
it to come out badly:_

> This is the reason why I think rulesets should have explicit customizable / editable
> instructions for users, so they do not merely provide information about the ruleset but also
> inform the users of contractual obligations associated with the ruleset and how to acknowledge
> the obligation. We can demonstrate this feature in the Manila example.

The risk this answers is the one written below: a dangling port is a **shape**, and a shape
cannot say whether it is required. An obligation needs words, in the place where a practitioner
meets the ruleset, before they meet the error.

A ruleset already carries prose — `description`, `mustNotBeReadAs`, `basis.statedBy`,
`parameters[].meaning` — and every piece of it describes **the ruleset**. None of it addresses
the user, and none says what they must do. That is the gap: `mustNotBeReadAs` says what a result
is not; nothing says what applying it commits you to.

### Editable, and the enforcement is somewhere else entirely

A first draft of this section made the obligation text **not** editable, on the reasoning that a
practitioner could otherwise soften an obligation the authors impose. The practitioner struck
that down, and the argument is the better one:

> They could soften it as much as they can, but the hard constraint and the accountability to
> audience and the consequences of shirking that responsibility will always make them think
> twice — the consequences are real, even if they manage to skirt around the responsibility:
> non-acceptance of a publication, questioning by peers during a presentation.

Locking the wording is a **false protection**. It stops nobody determined, and it confuses
editorial control with enforcement. The enforcement here is structural and unaffected by any
rewrite: no connection, no output. And the enforcement that actually governs is outside this
application altogether — a paper not accepted, a question at a venue nobody can answer. An
application cannot manufacture that and should not pretend to substitute for it.

### The edit is recorded, in the receipt

The practitioner, 2026-10-26: *"we can even keep track of edits to the user instruction in the N3
receipts."* That is where it belongs, and it is the mechanism that makes an editable obligation
safe without locking it. It also fits the rule they set earlier the same day — a receipt records
what the widgets express — because *the instruction shown was not the authors'* is precisely such
a semantic.

The idiom exists. `src/core.ts` already writes a column repair this way:

    ${entity} prov:qualifiedRevision [ a fw:ColumnRepair;
      fw:boundAttribute "deaths"; fw:repairedAs "number";
      fw:repairedRecordCount "3"^^xsd:integer; fw:repairedAt "2026-10-16" ].

An obligation revision is the same shape, on the activity that applied the ruleset:

    ${activity} prov:qualifiedRevision [ a fw:ObligationRevision;
      fw:revisedObligationOf <urn:fieldwork:ruleset:extract-contract>;
      fw:authorTextDigest "sha256-…";
      fw:statedObligation "…the practitioner's wording, verbatim…";
      fw:revisedAt "2026-10-26" ].

Three decisions inside that, each with a reason:

- **The author's text is referenced by digest, not copied.** It is already pinned in the ruleset
  at a version the receipt names, so a reader can fetch it; the digest says WHICH wording was
  revised, which matters when a later ruleset version changes it.
- **The practitioner's text is carried verbatim.** It is what was actually shown, and a digest of
  it would let a reader verify nothing while telling them nothing.
- **No revision node means no edit.** Absence is the claim that the authors' words were shown as
  written. That is only honest if the absence is reliable, so an unedited obligation must never
  emit an empty revision, and an edited one must never fail to emit one.

What this buys is narrow and worth stating plainly: a reader of the evidence can see that the
obligation presented to the practitioner was not the one the dataset's authors wrote, and can
read both. It does not stop the edit, and it is not meant to.

### And a second reason, which is the architectural one

The practitioner, 2026-10-26: *"if you design the text as non-editable, that destroys the
flexibility of the widget. It becomes more attached to sea level rise."*

This is the stronger argument, and it is independent of whether locking would enforce anything.
Fixed obligation text is **domain content compiled into a surface** — the failure this whole
session has been unwinding. `alert` was a widget titled "Heat alert". `slr_extract_import` is a
widget named for sea level. A non-editable obligation would make `apply_ruleset`, the one
genuinely general widget here, present fixed words written for one dataset, and serving WorldPop
or a census would mean changing the widget rather than the data.

Editability is what keeps the interpreter an interpreter. The obligation belongs to the ruleset,
which is the program; the same widget then carries AR6's three citations, a census's terms of
use, or nothing at all, without knowing which. Locking the text would quietly re-attach the
generic widget to the first domain that used it, which is how every widget retired this week got
that way.

What is worth keeping is **attribution, not control**. The author's text stays pinned to the
ruleset version; a rewrite is recorded as the practitioner's revision, in the idiom this project
already uses for a repaired column — `prov:qualifiedRevision`, the source unchanged, the change
attributed. So a softened obligation is never read in the authors' voice. That is the only thing
an application can honestly protect, and it is enough: a reader can see whose words they are.

### What the obligation text must say

Not a licence paragraph. Three things a practitioner can act on: **what they are taking on**,
**how to acknowledge it** — which for this design is connecting the provenance port — and **what
happens if they do not**, which is an error and no output. Written so that someone meeting it for
the first time understands why the application is about to refuse them.

**Demonstrated in Manila**, whose three AR6 citations are the obligation and whose authors
require them of users. That is also the honest test of the text: it is right if a practitioner
who reads it can answer the question a scientist asks at a venue.

## Every refusal here must map to a mechanical check

The practitioner, 2026-10-26: *"we cannot introduce a blocker to something we cannot enforce in
code."* This section audits the design against that, because a refusal without a check behind it
is a false boundary in the sense
[the directions register](../directions.json)'s `fieldwork-bounds-what-it-controls` rules out —
it reads as a guarantee and is not one.

| refusal proposed here | the check behind it | enforceable? |
| --- | --- | --- |
| A ruleset declaring provenance required, carrying no obligation text, is refused | the field is present or absent | **yes** |
| An unconnected provenance port stops the run and produces no output | the edge exists or it does not | **yes** |
| A receiving widget that shows nothing is an error | the obligation reached the rendered output, or it did not | **yes**, in-run |
| An edit to the obligation is recorded as the practitioner's | the stated text differs from the pinned text, by digest | **yes** |

And the things this design must therefore NOT block on, each of which it would be tempting to:

- **Whether the practitioner understands the obligation.** Connecting the port is a PROXY for
  acknowledgement, not the acknowledgement itself. Fieldwork blocks on the connection because the
  connection is mechanical; it cannot block on knowing, and must not word anything as though it
  had checked that somebody knew.
- **Whether the obligation text is any good.** A validator sees presence, never usability. A
  ruleset can pass carrying prose nobody can act on, and that failure is a human reading's to
  catch.
- **Whether the citations are honoured after the figure leaves.** Out of scope by construction,
  and the layer that actually governs.

The distinction to keep while building: each refusal is of a **mechanical fact** — an absent
field, an absent edge, an absent citation in the rendered output — and the refusal's WORDS may
explain the obligation behind it, but its TRIGGER is never the obligation itself.

## The generality test: a second climate model

The practitioner, 2026-10-26: *"if another climate model ended up as a ruleset in FW it should be
able to use the standard ruleset widget to express and implement its contract."*

That is the falsifiable criterion for everything above. The design is right if a different
dataset — another sea-level product, a downscaled CMIP run, a hazard projection — can be
expressed **entirely in data**, and wrong the moment it needs a widget, a branch or a type.

Checked against what exists on 2026-10-26:

| what a second model would differ in | where it goes | code or data? |
| --- | --- | --- |
| different key columns identifying a value | `tableContract.requiredKeys` | data |
| different units its values are published in | `tableContract.allowedUnits` | data |
| a different closed vocabulary on a column | `tableContract.closedVocabulary` | data |
| a different baseline, or basis kind, or recorded conversion | `tableContract.declares` | data |
| different columns feeding the rules | `inputContract.fieldFrom` | data |
| different citations and licence terms | `basis.evidence`, `obligation` | data |
| different rules | `rules`, from the rule builder | data |

`src/rulesets.ts` mentions AR6 and sea level five times and **every one is a comment** naming the
case the code was derived from. No AR6 logic is in the generic path: `tableContractFailures`
reads a declaration it is handed, and `authoredProjection` was general before any of this.

### What would falsify it, and it is still standing

`src/sea-level.ts` holds `PROJECTION_KEYS`, `BASIS_KINDS`, `VALUE_UNITS` and the
vertical-land-motion pair as TypeScript constants, and `slr_extract_import` is still live. So
today a second climate model arrives to find a working example of how this was done **in code**,
and the cheapest path for whoever adds it is to copy that widget. The generality above is real
and unproven at the same time, because the counter-example is still shipped.

That is the argument for the retirement that is not cleanup: **the variant is the thing that
teaches the next author to make another one.** Until `slr_extract_import` is gone, "no variants"
is a rule the repository contradicts by example.

## What this does not establish

- **That a port is the right severity.** It makes an obligation visible and connectable. It does
  not decide whether omitting it should stop a run, and
  [115](115-decomposing-the-projection-extract.md)'s P2 decided the opposite for provenance:
  an alert, not a blocker. A dangling port is a third thing — neither fatal nor invisible — and
  whether that is the right severity is the question this experiment exists to try.
- **That practitioners read a dangling port as an obligation.** Nobody has watched one do it.
  That is the observation to write down before the result is known: whether an unconnected
  provenance port reads as *something I must do* or as *something optional the application drew*.
