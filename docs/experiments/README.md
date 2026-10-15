# How an experiment document is written

_Created 2026-10-11 · Updated 2026-10-15_

This directory is the record of a developmental evaluation. Its documents are
where questions are asked, tried in implemented code, and answered or retired.
They are the instrument, so they have a form.

**The test is a reading test, not a template.** A contributor, a reviewer, or one
of us in a week should be able to answer five questions from any document here
without reading all of it:

1. **What question did we ask?**
2. **How did we try to answer it?**
3. **What happened?**
4. **What did we decide?**
5. **How did that shape the architecture or the framework?**

Headings are free. A document about a raster edge rule and a document about
governance do not need the same seven sections, and the corpus already shows that
domain-shaped headings — *Competency questions*, *Practitioner exercise*,
*Design checks*, *Distinctions* — carry more than generic ones would. What is
fixed is the status line, one heading spelling, and the habit described last.

## The status line

Every document opens, after its date stamp, with a status whose **first word is
one of four**:

| | |
| --- | --- |
| **asked** | A question is posed and nothing is built. Spikes, design records, proposals, research notes. No answer is claimed, and the document says what would answer it |
| **tried** | Something was built or attempted and the document says what happened. Nothing outside the document's own reasoning confirms it |
| **validated** | The claim is confirmed by something outside this document: a parity check against the Validation Lab, a test that fails when the change is reverted, a measurement taken twice, a defect a practitioner reported and can no longer reproduce |
| **retired** | Superseded, withdrawn, or decided against. Kept, because a path not taken is part of the record |

The prose after the word is unchanged in character from how these were already
written, and it carries the document's own genre:

```
**Status:** tried — admission review, written before the code.
**Status:** validated. Measured, implemented, parity re-checked against the Lab.
**Status:** retired by [94](94-where-explanation-belongs.md), which asked a better question.
```

**Why a closed set.** 48 of 95 documents had no status at all on 2026-10-11 and
the other 47 used free prose, so half the corpus gave a reader no way to tell a
proposal from a finding. That is not a style problem. It is how a gamification
spike re-derived [experiment 27](27-workflow-learning-and-gamification.md) five days
after it was written: 27 had *asked* a question, and nothing on its face said so.

**`built` is not `validated`.** Seven documents opened with "built", which says
the code exists and says nothing about whether the claim survived a check. That
distinction is the whole point of the vocabulary, and it is the user's:
*what is known and what is validated are two different things.*

## Before writing one: search

**An experiment that re-derives existing work is worse than no experiment**, because it adds a
second account to disagree with the first. This has happened twice.
[93](93-gamification-spike.md) re-derived [27](27-workflow-learning-and-gamification.md) and
found out through a citation. [102](102-widget-names-and-worked-examples.md) re-derived
[the widget design audit](../audits/widget_audit.md) — less accurately, and two days after that
audit had already answered the same practitioner's question.

So the first act of a new document is a search, not a sentence:

```
grep -ril "<the subject>" docs/
```

`docs/` is not only `docs/experiments/`. It holds `docs/audits/`, which is where both
re-derivations found their prior work, and `docs/research/`. A document records what the search
found, even when the answer is nothing — *"searched `docs/` for X, Y and Z; nothing prior"* is one
line and it is the line that makes the next person's search unnecessary.

## What would close it

**A status of `asked` or `tried` is an open position, and an open position has to say what would
close it.** Without that, a document sits in `tried` indefinitely while the thing it half-did
gets re-derived by somebody who could not tell it was unfinished.

That is the same failure as a criterion that detects without deciding
([103](103-duplicates-should-merge.md)): D2 found three implementations of one operation,
recorded it truthfully, and attached no disposition — so three widgets survived a passing audit.
An experiment with no closing condition is that, in prose.

So `asked` and `tried` documents name the condition: what measurement, what code, what decision
would move this to `validated` or `retired`. `validated` and `retired` need none — they are
closed. The count of open documents without one is reported by `validate:experiments`, so it
cannot drift quietly.

**And the condition has to be executable in the phase this project is in.** Stated by the
practitioner on 2026-10-15, on finding four documents whose closing condition was a practitioner
who did not write them saying what they concluded:

> This cannot be answered without field testing which is a phase this project has not reached
> yet. That is not an experiment question.

A condition nobody can execute is not a closing condition; it is a document parked under a word
that claims it is waiting on work. Four were — 94, 110, 111 and 112 — and the effect is the same
failure this section exists to prevent, one step further along: the document says what would close
it, the sentence cannot be acted on, and `tried` stops meaning *the measurement is in and the
finding is recorded* and starts meaning *waiting for a phase that does not exist*.

A question that needs a user in front of the software is a **field question**. It is real, it is
often the most important one a document raises, and it belongs in
[docs/field-questions.md](../field-questions.md) — the list field testing will have to answer when
there is field testing — not in a closing condition. The experiment keeps what it can settle from
the code, the declarations and its own measurements, and `validate:experiments` fails a closing
condition that defers to an observation instead.

## One heading spelling

**"What this does not establish."** It is the strongest convention in the corpus
— 26 documents, under two spellings — and it is the most valuable one, because it
is where a document declines to over-claim. `What this cannot establish` is the
same section and is being closed into the one spelling as documents are touched.

A document that establishes something should carry it. A document that has
nothing to disclaim is rare enough to be worth a second look.

## What changed our minds

**The element this corpus did not have.** This project records the provenance of
its data obsessively and the provenance of its own decisions not at all. Several
of the best findings came from a correction — the 1854 walking speed, parsimony
as the measure of a workflow, that there is no baseline for fewest until a
problem recurs, that known and validated differ — and a reader could not see
which claims had survived a challenge and which had never met one.

Where a document's thinking was changed by something — a measurement, a
practitioner, a co-author, a defect — say so and say by what. It is not required
of every document, because not every document had its mind changed, and a
heading reading "nothing" would be noise. The count of documents carrying it is
reported by the validator so that it stays visible rather than becoming a rule
nobody follows.

## How this is applied

As `ontology.emits` was applied, and for the same reason: a convention imposed on
95 documents in one pass is a convention nobody has read.

- **New documents conform.** `validate:experiments` fails on a new document
  without a vocabulary status, or using the non-canonical heading spelling.
- **Existing documents are debt**, listed in
  [`standard-debt.json`](standard-debt.json) with the count. The list can only
  shrink: the validator also fails if a listed document now conforms and has not
  been removed from it.
- **Backfill as touched.** A document being edited for another reason gets its
  status word then. Do not migrate the corpus in one pass; a status word chosen
  without reading the document is worse than no status word, because it looks
  authoritative.

## What this standard does not establish

That the five questions are answerable from any given document. The validator
checks a status word and a heading spelling, which are the parts a machine can
read. Whether a reader can actually answer *what did we decide* from experiment
53 is a judgement, and nothing here makes it. The reading test is for review, and
review is still a person's job.

Nor does it establish that the five are the right five. They were named on
2026-10-11, after 95 documents had been written, by the practitioner who has to
read them back. If a sixth question turns out to be the one a reviewer keeps
asking, that is a finding about this standard and belongs in a document here.
