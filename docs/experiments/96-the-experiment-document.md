# 96 · The experiment document

_Created 2026-10-11 · Updated 2026-10-11_

**Status:** tried — the standard is written, a validator gates it, and 8 of 95
documents conform. Whether a reader can actually answer the five questions from
an arbitrary document is a judgement no validator makes, so this is not
`validated`.

## The question asked

This directory is the instrument of a developmental evaluation, and it had no
form. The practitioner named what it has to deliver:

> what questions did we ask? How did we try to answer them? What happened? What
> did we decide? How did that shape the architecture / framework?

So: **can those five be made answerable from any document here, without turning
95 documents into a template nobody reads?**

Placed first among the urgent items, ahead of notebook CI and the 26 unchecked
widgets, because both of those produce work that has to be written down and this
decides how.

## How it was tried

By measuring the corpus before proposing anything, on the premise that a
convention already half-present is worth naming and a convention invented from
nothing is worth little.

| Measured across 95 documents | |
| --- | --- |
| No status line at all | **48** |
| Status line in free prose | **47**, of which 14 opened "admission review", 7 "built", 4 "design" |
| "What this does not establish" | 18 |
| "What this cannot establish" — the same section, spelled differently | 9 |
| "Competency questions" / "Competency question" — likewise | 10 + 6 |
| "What changed our minds", or anything like it | **0** |

The strongest convention in the corpus is the one where a document declines to
over-claim, and it was split across two spellings. The second strongest was also
split. Nothing recorded a correction.

## What happened

Three decisions, and one of them is a refusal.

**A closed status vocabulary: `asked`, `tried`, `validated`, `retired`.** The
first word is fixed and machine-read; the prose after it is unchanged in
character from how these were already written, so a document keeps its genre —
`tried — admission review, written before the code`.

**`built` is not `validated`,** and seven documents said "built" as if it were.
That distinction is the practitioner's: *what is known and what is validated are
two different things.* `validated` now means something outside the document
confirms it — parity against the Lab, a test that fails when the change is
reverted, a measurement taken twice.

**One spelling of "What this does not establish",** closing the 18/9 split as
documents are touched.

**And the refusal: the five questions are not enforced.** They are a reading
test. A document about a raster edge rule and a document about governance do not
need the same seven headings, and the corpus shows domain-shaped headings —
*Competency questions*, *Practitioner exercise*, *Design checks*, *Distinctions*
— carry more than generic ones would. A validator that demanded `## What
happened` would have produced 95 conforming documents and no better reading.

## What was decided, and what it changed

[`docs/experiments/README.md`](README.md) states the form.
[`scripts/validate-experiments.mjs`](../../scripts/validate-experiments.mjs)
gates the two parts a machine can honestly read, and runs inside `npm run check`,
so it is in CI as of this commit.

Applied as `ontology.emits` was, and for the same reason — a convention imposed
on 95 documents in one pass is a convention nobody has read:

- a new document must conform;
- the other 87 are listed in [`standard-debt.json`](standard-debt.json);
- **the list only shrinks** — the validator fails both when an unlisted document
  does not conform *and* when a listed one does and has not been removed. Both
  directions were verified by breaking them;
- backfill as touched, never in bulk, because a status word chosen without
  reading the document is worse than none: it looks authoritative.

Eight conform now — the seven documents actually read this week, plus
[95](95-the-duplicate-street.md). Converting them was not clerical. Two cases
were genuinely hard, and both are recorded rather than smoothed over:

**[94](94-where-explanation-belongs.md) is `asked`, not `validated`.** It is a
finding, and it felt like a conclusion. But its replacement answer — explanation
belongs in the Dive Deeper notebooks — is not built and not checked, and the
vocabulary exists precisely to stop that reading.

**[41](41-validation-lab.md) is `validated`, and its old status line was kept in
place.** It read *"No lab exists, no notebook has run, and nothing in this
prototype has been validated against a reference implementation yet"* — which
was true on 2026-10-08 and is now false in every clause. Deleting it would have
erased the distance travelled, which is the one thing a developmental evaluation
should not do.

## What changed our minds

**The element added here is the one this corpus did not have**, and the reason it
is needed is visible in the week it was written. The best findings of the last
few days all came from a correction: the 1854 walking speed was an estimate two
co-authors argued to and deliberately time-boxed, not an undocumented constant;
parsimony is the measure of a workflow, not widget use; there is no baseline for
fewest until a problem recurs; known and validated are different things. Every
one of those lived only in a commit message.

So **where a document's thinking was changed, by a measurement, a practitioner, a
co-author or a defect, it says so and says by what.** Not required of every
document — not every document had its mind changed, and a heading reading
"nothing" is noise — but counted in every validator run so it stays visible
rather than becoming a rule nobody follows. Three documents carry it now: this
one, [93](93-gamification-spike.md), [89](89-the-first-composition.md), and
[95](95-the-duplicate-street.md).

The original proposal also had the ordering wrong. It assumed the work was
inventing a form. The measurement said otherwise: most of the form was present
and unnamed, and the work was closing splits and naming what was there.

## What would close it

The debt count falling. 87 documents predate the standard and the mechanism is "backfill as
touched"; this is **validated** when the count has fallen materially without a bulk migration,
which is the only evidence that the standard is being used rather than merely enforced on new
work. If it sits at 87 for a month, that is the finding the document already predicted.

## What this does not establish

**That the five questions are answerable from any given document.** The validator
reads a status word and a heading spelling. Whether a reader can answer *what did
we decide* from [53](53-reproducible-maps.md) is a judgement, and nothing here
makes it. Review is still a person's job, and the standard only gives them a
checklist.

**That the five are the right five.** They were named after 95 documents had been
written, by the person who has to read them back. If a sixth is the one a
reviewer keeps asking for, that is a finding about this standard and belongs in a
document here.

**That 87 documents will ever conform.** "Backfill as touched" is honest about
incentives and also means a document nobody touches is never fixed. The count is
visible in every run, which is the only pressure applied. If it sits at 87 in a
month, that is the finding.

**And that this served the goal.** The beneficiaries are us and future
contributors, not a public health practitioner in the field. It was placed first
because it governs how everything else gets written down, and that is a claim
about the project's own machinery — worth doing, and worth being honest about who
it is for.
