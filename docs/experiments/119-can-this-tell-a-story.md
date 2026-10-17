# 119 — The conditions for a good story, and assuring they were met

_Created 2026-10-17 · Updated 2026-10-17_

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
