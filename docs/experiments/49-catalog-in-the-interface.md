# 49 · The pack catalog in the interface

**Status:** design record. Nothing in this record is implemented, and one of its
three options is recommended against being implemented at all.

The curated pack catalog (`widgets/packs.json`, [experiment 43](43-widget-packs.md))
is currently legible only to someone reading the repository. Asked how to see it,
the honest answer was: open the file, or run `validate:packs`. That answer is
correct about the mechanism and wrong about the concern. The catalog exists to
support a judgment — whether a result can be trusted, and what the thing that
produced it refuses to claim — and the people making that judgment never meet it.

## Why this is a developmental-evaluation concern

Developmental evaluation asks what an intervention teaches while it is still
forming, and treats use as evidence about the design rather than as a later phase.
Three of the catalog's eight rules exist because something had already drifted by
the time anyone looked at it: a stage status, a restated capability, a pinned
digest. Each was found by a reader, not by the design.

That is the pattern worth naming. The catalog's failures are **failures of
legibility**, and legibility failures are only observable in use. So the question
is not "should the application list the packs". It is:

> Which decisions does a practitioner make that the catalog should inform, at the
> moment they make them, and what would we learn from watching them make those
> decisions badly?

A storefront answers neither half.

## The decisions, and who makes them

| Who | Decision | What they need | Where they are when they need it |
| --- | --- | --- | --- |
| Practitioner | Can I rely on this result? | Which definitions produced it, at which digests; whether any came from a pack | Looking at a Results tab or a run receipt |
| Practitioner | May I say what this output means? | What the producing vocabulary **refuses** to claim | Before writing the result down, not before running |
| Reviewer | Is this pack admissible? | The three reviews, the diff, the digests | In the repository, with the pack open |
| Curator | Is the catalog itself sound? | Rules, owners, pinned commits | In the repository, at review time |

Only the first two are in the application at all. The reviewer and the curator are
already served by the file and the validator, and moving their work into a
rendered page would weaken it — review needs a diff, not a view.

## The constraints, which conflict

1. **Offline-first, no runtime fetch.** `runtimeFetching: none` is an admission
   rule. Anything the interface shows is a **build-time snapshot** and can be
   stale by any amount.
2. **Proposed is not implemented.** The project's documentation discipline
   separates the two deliberately. A list of packs inside the application reads as
   a list of things you can use.
3. **The application cannot verify a review.** Displaying `admitted` would make the
   interface a republisher of a claim it has no way to check. A review state shown
   without its date, reviewer and host version is a badge, not evidence.
4. **Provenance must nonetheless be complete.** A receipt that is silent about pack
   origin is not neutral; it leaves the reader to assume. The absence of pack
   definitions is itself a fact worth asserting.

Constraint 4 pulls toward showing something. Constraints 1–3 pull against showing
almost all of it. The resolution is that the interface should carry **provenance
and refusals**, and should not carry **inventory or status**.

## Three candidate surfaces

### A. A pack browser — recommended against

A panel listing catalog entries with their admission states. It is the obvious
reading of "see the catalog", and it is the wrong one. It implies installability
that does not exist; it turns `admitted` into a trust badge the application cannot
stand behind; and it answers a question nobody in the application is asking, since
a practitioner cannot act on the list. It would also make the first real
disagreement between a snapshot and the live catalog into a user-visible
falsehood rather than a validator problem.

If the demand for it recurs, the honest form is a link out to the file, not a
rendering of it.

### B. Pack provenance in the receipt — recommended, and small

The run receipt already names, per node, `fw:widget`, `fw:catalogVersion` and
`fw:catalogDigest` from the **widget registry**. The slot therefore exists; what is
missing is one assertion about the **pack catalog**: which catalog version and
commit this build was made from, and that every definition used was host-defined.

Stated positively rather than as an absence, so it can be checked:

- the build's pack-catalog version and short commit, labelled as compiled, not live;
- that every widget definition in this run came from the host registry;
- nothing about admission, review state or availability.

This adds no promise, survives staleness because it names its own vintage, and is
falsifiable: if a pack definition ever does execute, the assertion fails loudly
instead of the receipt quietly staying the same. It needs vocabulary terms, which
means it is subject to the [semantic audit](../ontology-audit.md) before it is
declared, not after.

### C. A refusals surface — the actual DE experiment

The most valuable thing the catalog points at is not the pack list but what each
pack's vocabulary **refuses to answer** — the five refusals in
[experiment 44](44-ontology-competency-questions.md), and for the sea-level pack,
the inundation claim it must decline ([experiment 47](47-sea-level-pack.md)).
Refusals are what a practitioner most needs, at the moment they write a finding
down, and unlike admission state they are verifiable from the vocabulary that is
compiled in.

This is where a DE observation is worth running, because the outcome is genuinely
uncertain: a refusal shown too early is noise, shown too late is useless, and shown
too often is dismissed. We do not know where the moment is.

## What to observe, if C is tried

Developmental evaluation needs disconfirming observations, so these are written so
they can come out badly:

| Observation | Would disconfirm |
| --- | --- |
| Shown a result, can the practitioner say where the definitions came from? | That provenance in the receipt is legible at all |
| Asked what the output does **not** establish, do they name a refusal unprompted? | That a refusals surface changes anything |
| Does the refusal get read, dismissed, or resented? | That this is the right moment or wording |
| Does anyone, after seeing it, ask how to install a pack? | That the interface successfully avoided implying inventory |

The last one is the test of option A's exclusion. If people ask anyway, the
exclusion is not working and the design, not the user, is wrong.

## Competency questions

Answerable, if B is built:

1. Which widget definitions produced this result, at which versions and digests?
2. Was any definition in this run supplied by a pack?
3. Which pack-catalog version and commit was this build made from?

The application must **refuse** these, and should be seen to refuse them:

4. Has this pack passed its security review? — the application cannot verify a
   review; it can only point at the catalog and the report.
5. Is this pack safe to use? — not a question any artifact answers about itself.
6. Can I install this pack? — there is no runtime loading, by rule.
7. Is the catalog shown here current? — no: it is as compiled.

## Practitioner exercise

Run any workflow, open its run receipt, and answer from the receipt alone: which
widget produced each output, and at what digest. Then try to establish, from the
application only, whether a widget pack contributed anything. Note what you had to
assume. That assumption is what option B exists to remove, and the difficulty of
answering is the measurement.

## Decision

Option A is excluded. Option B is specified here and left unbuilt pending the
vocabulary review it requires. Option C is the open DE question, and nothing
should be built for it until the observations above have somewhere to be recorded.

This record changes no code. The catalog remains reviewable as a file and checkable
by `npm run validate:packs`, which is correct for reviewers and curators, and
insufficient for practitioners.
