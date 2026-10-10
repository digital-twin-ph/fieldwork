# 63 · Runbooks: a guided tour of a worked example

_Created 2026-10-09 · Updated 2026-10-09_

**Status:** admission review. Written before the code, as experiments 48, 58 and 61 were.
Proposes a presentation artifact and **no new widget**, no new port type and no new
vocabulary.

A worked example currently teaches in two places that do not meet. Inside the application
the `?` button opens one static dialog — "From places to decisions", five generic steps —
which says the same thing whichever example is loaded. Outside it,
[the Old Naledi guide](../examples/old-naledi.md) and
[the John Snow guide](../examples/john-snow.md) explain those examples properly, including
the "try three comparisons" structure that [experiment 43](43-widget-packs.md) singles out
as what makes an example reviewable. A practitioner who opens the application never sees
them.

A **runbook** closes that gap: a step-by-step tour of the loaded example's actual
workflow, opened from the `?` button, explaining what each node does, why it is configured
as it is, and what the result does and does not establish.

## What a runbook is not

This matters more than what it is, because [experiment 27](27-workflow-learning-and-gamification.md)
already designs a learning layer and a runbook must not be mistaken for the first slice of
it. AGENTS.md requires that proposed learning concepts stay separate from implemented
scientific operations, so the boundary is drawn here rather than discovered later.

A runbook makes **no competency claim**. It records no learner evidence, awards no points,
has no profile, needs no assessment rubric, no `fwl:` vocabulary and no reference assessor.
Reading a runbook is not evidence that anyone learned anything, and the artifact must never
be described as though it were. Experiment 27's slices 1–4 remain unbuilt and unaffected.

What it borrows from 27 is the card structure, which is already designed and should not be
reinvented: **What this does · What it needs · What comes out · When to use it · A common
mistake**, in plain language, keyboard reachable, not dependent on hover, returning focus
to the control that opened it.

## Why pull rather than push

[Experiment 49](49-catalog-in-the-interface.md) states the open problem for surfacing this
kind of knowledge: a limitation shown too early is noise, shown too late is useless, and
shown too often is dismissed — and it records that nobody knows where the moment is.

A runbook sidesteps that question rather than answering it, because **the practitioner
asks for it**. Opt-in content carries no timing risk and no dismissal risk. That is the
argument for building a runbook before building any pushed guidance, and it is also the
reason a runbook must not grow into an unsolicited tour that opens on load.

## The step the tour must include

[Experiment 43](43-widget-packs.md) requires every worked example to carry at least one
connection it **refuses**, because an example that only shows what works has not shown
where its semantics end. A runbook is where that requirement finally becomes visible to a
practitioner instead of sitting in a document.

So one step of every runbook invites the reader to attempt the refused connection and watch
it fail: connect the sea-level comparison to a raster map output and the canvas declines
it, because a projected level is not an inundation extent. Meeting a **hard stop** on
purpose, once, teaches what the limitation text cannot
([62](62-workflow-traversal.md), [the glossary](../glossary.md)).

## Term cue cards, and why they are a separate question

_Added 2026-10-09, after reading the first real AR6 file._ A runbook explains a **workflow**.
A cue card would explain a **term** a result depends on, at the moment the term appears. The
two are siblings and the second may be the more important, because the case that prompted it is
one no amount of workflow explanation reaches.

The medium-confidence AR6 file is a **p-box** — a pair of bounding distributions spanning
alternative workflows, which is how AR6 represents imprecise probability. The file carries 107
quantiles from 0.0 to 1.0 and **no dimension naming a bound or a workflow**, so structurally it
is indistinguishable from the quantile function of one distribution. Only its `source`
attribute shows what it is. AR6 derives a *likely* range (17th–83rd) from it and states it
cannot derive a *very likely* range (5th–95th) because of method ambiguity — yet the file hands
a reader q0.05, q0.95 and q1.0 anyway, the last being 3004 mm for Manila in 2100.

So the data offers values the science declines to use, and nothing in the values warns anyone.
The pack's vocabulary already forbids the error — *a quantile is not a p-box bound and neither
is a worst case* — written before anyone had opened the file. A limitation in a vocabulary
comment is not where a practitioner meets it.

### What a card might carry

Mirroring the structure [experiment 27](27-workflow-learning-and-gamification.md) designed for
widgets, because a reader should not learn two shapes:

| Section | For the p-box card |
| --- | --- |
| **What it is** | A pair of bounding distributions, not one distribution. AR6 uses it where the workflows disagree structurally |
| **What it is not** | Not a confidence interval. The width is disagreement between methods, not sampling error |
| **What you can read from it** | The likely range, 17th to 83rd percentile |
| **What you must not** | A very likely range, a worst case, or any probability arithmetic. AR6 declines the 5th–95th for this data |
| **Where this number came from** | The `source` provenance, naming the combined p-boxes |

### The developmental-evaluation question

The form is genuinely unknown, and this record does not settle it. What is known is the
problem [experiment 49](49-catalog-in-the-interface.md) already named and could not answer: a
limitation shown too early is noise, too late is useless, too often is dismissed. A cue card
inherits that question, and has one of its own — whether a card is read at all, or dismissed as
a tooltip.

Observations worth running, written so they can come out badly:

- Ask a practitioner who met the card, and one who did not, to describe the 2100 median in
  their own words. Does the card change the description, or only lengthen it?
- Show both the q0.83 and the q1.0 value and ask which is the worst case. The correct answer is
  that neither is. A card that does not produce that answer has failed at the only thing it was
  for.
- Ask where a card should appear: beside the value, in the receipt, on the term in a results
  table, or only on request. **Do not assume it is a tooltip.**
- Watch whether a card increases unwarranted confidence, as this record already warns a fluent
  runbook might. An explanation of imprecision that leaves a reader more certain has inverted
  its purpose.

A cue card is not in the first slice. It is recorded here so the question is not rediscovered,
and because the p-box case is the strongest argument yet that a vocabulary comment is not
delivery.

## One source of content

The guides in `docs/examples/` already hold this material, are stamped and checked by
`validate:docs`, and are reviewed as documentation. A second copy inside `src/` would drift
from them, which is the failure
[experiment 48](48-tabular-input.md) recorded when two contracts shared a field name and
one silently emptied the other.

So the runbook is **built from the guide**, not written beside it: the guide gains a
declared step sequence, the build reads it, and a drift is a build failure rather than a
quiet divergence. This is the same discipline the host already applies to the vendored pack
vocabularies, which are checked against a pinned digest rather than trusted.

## Decisions this review must settle

| Decision | The options | What turns on it |
| --- | --- | --- |
| How a step names its node | By node id, or by node type | Ids are exact but break when a practitioner deletes and re-adds a node; types are stable but ambiguous when an example has two nodes of one widget, which Old Naledi and the geoprivacy example both do |
| What happens to a modified workflow | Refuse to run the tour, run it partially, or offer to restore the example | A runbook that silently points at the wrong node is worse than none. The honest default is to say which step cannot be shown and why |
| Whether a step may change the workflow | Read-only, or allowed to select and highlight nodes | Selecting a node is presentation; configuring one for the reader is doing their work for them, and would make the tour a script rather than an explanation |
| Where the refused-connection step lives | Described, or actually attempted by the reader | Attempting it is the teaching content; it also means the tour must tolerate a failed action as a success |

The first two are the ones that decide whether this is usable; they should be settled in
this record before code, not in a diff.

## Scope of the first slice

One runbook, for Old Naledi, built from its existing guide, opened from the existing `?`
button, with the generic dialog kept as a fallback for a blank or modified canvas. Step
content is read-only, highlights one node at a time, and includes the refused connection.
John Snow follows if the first holds; the sea-level workflow follows when its example has
data, which [experiment 62](62-workflow-traversal.md) records as still outstanding.

Not in this slice: pushed or automatic tours, progress tracking, any persistence of where a
reader got to, notebook links ([27](27-workflow-learning-and-gamification.md) proposes
those separately), and runbooks for widgets rather than examples.

## What this would make visible

`npm run usage:widgets` reports that four widgets are in the registry and in no worked
example: `places` and `centers`, which are retired legacy identities, and **`rate` and
`reproject`**, which are current. A widget with no example can have no runbook, so the
runbook makes that gap felt by a practitioner rather than only measurable by a script.
That is an argument for the service-coverage-rate example that
[experiments 59](59-pattern-for-engineered-knowledge.md) and
[60](60-from-gis-studio-to-public-health-studio.md) already propose, not a new argument.

## Developmental evaluation

Observations, written before the result is known so they can come out badly.

Ask a practitioner to complete the Old Naledi runbook, then to answer the example's three
comparisons without it. Watch whether they can state what the result does **not** establish
— unprompted — because that is the content most likely to be skimmed and the only content
that prevents a wrong decision. Ask them to attempt the refused connection and explain in
their own words why it is refused; an explanation that repeats the notice verbatim is not
comprehension.

Then the risk worth naming: a confident guided tour may **increase** unwarranted trust in
the output. A reader who has been walked through a workflow may believe the result is
validated because the explanation was fluent. If that shows up, the runbook is harmful in
exactly the way the project's limitations exist to prevent, and the finding should be
recorded rather than softened.

Also watch whether anyone opens it at all. The catalog was correct and invisible
([59](59-pattern-for-engineered-knowledge.md)); a runbook behind a `?` icon could be too.

## Validation this would commit to

Unit checks: a step sequence that names a node absent from the workflow is refused at build
time; a tour over a modified workflow reports which steps cannot be shown rather than
mis-pointing; the step content in the build matches the guide it came from, and a drift
fails the build; and the refused-connection step records a declined action as a completed
step.

A browser check opens the `?` on a loaded Old Naledi, steps through to the end, attempts the
refused connection, confirms the canvas declines it with its stated reason, closes the
dialog with Escape and confirms focus returns to the `?` button. Then it deletes a node the
tour references, reopens the tour, and confirms the affected step says so.

## What this cannot establish

That a reader understood anything; a runbook records no evidence of learning and should
never be read as doing so. That the example's numbers are correct — the runbook explains a
workflow, it does not validate it. That a practitioner can transfer the pattern to their own
data, which is the question [experiment 27](27-workflow-learning-and-gamification.md) and
[experiment 43](43-widget-packs.md) both ask and which only an independent task answers.
