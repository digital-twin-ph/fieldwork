# 119 — The conditions for a good story, and assuring they were met

_Created 2026-10-17 · Updated 2026-10-17_

**Superseded by [141](141-organising-snows-notes.md), which synthesizes this with 17 and 133. The three measurable conditions and the assurance argument are carried over there; this stays as the record of how they were reached.**

**Status:** asked — reframed on the day it was opened, and nothing built for it yet.

## The question, after a correction

Opened as *"can FW be used to make data tell great stories through maps and visualizations?"*,
and this record first answered it the wrong way round: by arguing at length that storytelling is
a judgement no rule can make, that omission cannot be computed, and that the honest reply is a
list of things the application cannot do.

The practitioner corrected the frame the same day:

> *"It's not about eliciting judgment for a good story, it's more about creating the conditions
> for FW to help create a good story — and there are elements of it that can be measured: (1)
> tracking provenance of data and related evidence (2) rigorous processing (3) cartographic and
> visualization rules. What's missing is the assurance part and what's needed to achieve that."*

That is a different and better question. **Not** *is this story good* — which nobody can compute
and this application should not pretend to. **But**: *are the conditions under which a good story
can be made present, and can the application say so in a way somebody can rely on?*

The first question has no answer. The second has three measurable parts and one missing one.

## The three conditions that can be measured

| | What is already true | What is measured about it |
| --- | --- | --- |
| **1 · Provenance of data and evidence** | Every run emits PROV: entities, the activities that made them, what each used. Sources carry a licence IRI, a digest and a retrieval date; references attach to nodes; a repaired column states what it changed and leaves the original | the chain is complete or it is not, and `audit-runtime-n3.mjs` already refuses a receipt asserting an undeclared term |
| **2 · Rigorous processing** | Units are declared and a mismatch **refuses the run** rather than converting. Field bindings are declared, never guessed from a column name. A step reports the records it could not read (117). A ruleset may decline to classify, and says how often | counts, refusals, and `fw:unmatchedSubjectCount` — all already in receipts |
| **3 · Cartographic and visualisation rules** | Four rules applied while a map is assembled, stated in its receipt with outcome, measurement and threshold, and held to SHACL shapes ([118](118-cartographic-judgment-as-rules.md)) | contrast ratios against WCAG criteria; palette and no-data checks |

So the parts are not missing. **They are present, measured, and scattered.** Each lands in its
own corner of a receipt, in its own vocabulary, with no statement anywhere that takes the three
together.

## What is missing: assurance

A reader of a published map cannot currently ask *"was this made under conditions I would
accept?"* and get an answer. They can, in principle, read the N3 and work it out. That is not
assurance; that is raw material.

Assurance would mean the application can state — and a reader can check — that for this output:

- every input's provenance is complete to a stated depth, or **named where it is not**;
- every processing step that could have refused did refuse, and nothing was silently converted;
- every design rule that applied, passed — and the ones that did not apply are listed, since a
  short list of green outcomes is the easiest thing in this project to mistake for quality.

**And an assurance that cannot fail is worthless.** Whatever is built must be able to come back
*"these conditions were not met"* and say which, or it is decoration. The three negative SHACL
tests written for 118 are the smallest existing example of that discipline.

## Where to start: what is the project trying to communicate?

The practitioner's proposal, and the part still emerging:

> *"I am thinking begin with what communication objectives does the 'project' intend to achieve."*

A **declared communication objective** on the workspace, the way a ruleset declares what it must
not be read as. And it has a consequence worth stating now, because it is the strongest argument
for the whole approach:

**A declared objective turns some judgement into measurement.** With no objective, *"does this
map answer the question?"* is unanswerable and this record said so. With one — *to show how far
the outbreak reached* — some of it becomes checkable: does any output carry an extent; does the
map draw the layer the objective names; does the receipt's `mustNotBeReadAs` contradict what the
objective claims. Not all of it, and never the part about whether the story is worth telling.
But the boundary between what can be measured and what cannot **moves** once the objective is
declared, and it moves in the useful direction.

That also sharpens what remains outside: omission. A map that leaves out the inconvenient
district still breaks no rule — but a map that leaves out what its own declared objective says it
is for is, for the first time, something an application could notice.

## An incompleteness, not a caveat

The practitioner, 2026-10-17, on this record's observation that nothing here composes a sequence,
an annotation or a caption that argues:

> *"Since this is a DE project, that means the framework is not complete. There must be something
> in the beginning that helps the user design the frames of the story … And this step precedes the
> use of the study area widget."*

**A limitation written into a caveat section is a limitation this project has accepted. A
framework incompleteness obliges something.** That is the distinction, and under developmental
evaluation the second is a result rather than an apology.

**Where the gap is.** [The glossary](../glossary.md#workflow-stages) says a workflow has three
stages — input, process, output — and a blank canvas offers only widgets needing no input, which
in practice means **Study area**. The claim is that something belongs *before* that: a stage in
which the practitioner states the frames of the account they intend to give, and only then
chooses a study area — because a study area is already an answer to *where*, and *where* is one
of the frames. Today the first question this application asks is a spatial one, and nothing has
asked what the work is for.

**Frames are not the medium.** The practitioner again: *"The story could be a scientific
publication or a poster or an infographic but nevertheless needs the rigor required to achieve
the narrative goal."* So what the account claims is one thing and the form it takes is another,
and the rigor requirement does not vary between them. That separation is worth holding, because
[Segel and Heer's](https://homes.cs.washington.edu/~jheer/files/narrative.pdf) narrative
visualization framework — the standard reference, **not read here** — is criticised in later work
for conflating the storytelling mechanism with the medium carrying it.

**Candidate structures, none chosen:**

- **Person, place, time.** Native: this project already reasons in them, and the Snow research
  note's central finding is phrased in them. An epidemiological account's descriptive frame, and
  checkable against what the data carries.
- **STROBE.** The reporting standard for observational epidemiology: 22 items, 18 common to
  cohort, case-control and cross-sectional designs and 4 design-specific, intended for *clear
  reporting* rather than judging quality. Read from its summaries 2026-10-17 — and the
  interesting part is what it does **not** cover: nothing in those 22 items concerns figures or
  maps. The thing this application produces is precisely the thing the field's reporting standard
  is silent about.
- **Segel and Heer genres** — magazine style, annotated chart, partitioned poster, slide show —
  which describe the *form*, and so belong to the medium question rather than the frame question.

**The hazard, and the practitioner's answer to it.** Writing the outline before building the map
risks fitting the data to the frame, which is what this project's whole discipline exists
against. This record first offered a weak answer — that a declared frame is at least falsifiable.
The practitioner gave a better one, 2026-10-17:

> *"The frame should not declare a result then OR if it does, FW should have the ability to
> change the arc of the story. It's like strategy, the frames as sequenced and mapped to sections
> is the deliberate strategy. But a wise general once said, no plan survives contact with the
> enemy. So the strategy emerges to the realities of the battlefield (emergent strategy), and
> then battle is concluded, we would be the wiser to realize what was the real strategy all
> along (realized strategy)."*

Two things follow, and the second is the stronger.

**A frame states a question, not a conclusion — or states the conclusion as a null hypothesis.**
*Where did the outbreak reach* is a frame. *It clustered around one pump* is a result, and a
frame declaring one has decided the analysis before it ran.

The practitioner's refinement makes the second case legitimate rather than forbidden: *"Or
better, declare a result as a null hypothesis in the case of a scientific publication."* That is
the falsifiable form the field already has, and it is **already required**: STROBE's item 3 asks
for specific objectives *"including any prespecified hypotheses"*. So a frames stage producing
null hypotheses would be generating what the reporting standard asks for, in the form it asks for
it — and prespecification is the recognised guard against **HARKing**, hypothesising after
results are known, which is the formal name for the hazard this section is about.

It is also checkable. A frame carrying a claim about the data is a different object from one
carrying a question, and a claim stated as a hypothesis is a third — each distinguishable without
understanding the subject matter.

**And the arc must be revisable, with the revision recorded.** This is
[Mintzberg's](https://en.wikipedia.org/wiki/Henry_Mintzberg) distinction — **deliberate**,
**emergent**, **realized** strategy — applied to an account, and it fits this project's existing
machinery almost exactly, because all three are provenance:

| | In a workflow | What a receipt could carry |
| --- | --- | --- |
| **Deliberate** | the frames declared before the study area was chosen | what the practitioner intended to show |
| **Emergent** | frames changed, dropped or added once the data was seen | what contact with the data forced |
| **Realized** | the account as published | what it actually argues, and **where that differs from the intent** |

The difference between the first and the third is the interesting number, and nothing in this
application records it today. It is also the evidence that a prespecified hypothesis was not
quietly rewritten once the results were in — which is what makes the record worth keeping rather
than merely tidy. A framework that only let a practitioner declare frames up front
would be a planning tool; one that lets the arc change and **says that it changed** is doing what
the rest of this project already does with units it will not convert and classifications it
declines to make.

*(Mintzberg and Waters, 1985, is the usual attribution. Not read here — the terms are used as
the practitioner used them.)*

**Scheduled, not built** — [TODO](../../TODO.md), so it does not displace housecleaning.

## What this does not establish

- **That assurance is buildable here.** Nothing has been built. The three conditions are
  measured today; nothing aggregates them, and aggregation is where overclaiming would start.
- **That a declared objective would be declared honestly.** A practitioner may write an objective
  that flatters what they already made. The declaration is a commitment, not a verification.
- **That meeting the conditions produces a good story.** It does not. A fully provenanced,
  rigorously processed, rule-conformant map can still be dull, answer nothing anybody asked, or
  mislead by what it omits. The conditions are necessary, not sufficient, and an assurance
  statement that implied otherwise would be the worst thing this experiment could produce.
- **That the three conditions are the right three.** They are the practitioner's, stated on
  2026-10-17, and each maps onto work already done. Nobody has checked them against what a reader
  of a published map actually wants to know.
- **Anything about readers.** This project has still reached no reader who did not build the
  thing, and [field-questions.md](../field-questions.md) is where that belongs.

## What would close it

1. **A communication objective can be declared** on a workspace, and at least one thing the
   application already measures is assessed against it.
2. **An assurance statement exists** that can come back negative, naming which condition was not
   met — and is tested doing so, not only passing.
3. The **`presentation-stage` blocker** is lifted on its own test, or withdrawn with a reason:
   display-only work still has nowhere to live, which is where a narrative step would go.
4. The field question is written down, so that when this project reaches a reader, somebody knows
   what to ask them.

## What changed our minds

**On the day it was opened.** This record was first written to argue that the question was mostly
unanswerable — that rules are negative, that omission is uncomputable, and that a conformance
report gets mistaken for quality. All of that is still true and none of it was the question.

Asking whether the application can *judge* a story put the application in the wrong chair. The
practitioner's frame puts it where it belongs: the thing that makes the conditions available, and
says plainly whether they were met. The judgement stays with the person, which is where this
project has put every other judgement — a unit it will not convert, a repair it will not apply,
a classification it will decline to make.
