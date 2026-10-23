# 132 · Scoring the Inspector prose, and attaching it to a control

_Created 2026-10-23 · Updated 2026-10-23_

**Status:** tried — the score is in the gate and the character budget is gone. The second half,
attaching each explanation to the control it explains, is measured and not built.

## What was asked

The Inspector prose rule was a ceiling on total characters across seven renderers. It stopped the
growth the practitioner had complained about on 2026-10-21 (*"too many commentaries in the
Inspector panel. That is not the place to keep development or agent notes"*) and then did something
nobody intended. A total is a shared budget. On 2026-10-22, to afford a country-mismatch warning
the practitioner had asked for, the weight explanation and the ruleset explanation were trimmed.
Neither was a development note. **The rule made the Inspector worse in order to let something
necessary in.** The practitioner named it on 2026-10-23:

> *"Inspector prose should not be limited by number of characters, it should be limited by how well
> each component of the widget is explained concisely."* ... *"concisely and clearly"*

and then named what a rule can honestly do about a qualitative property:

> *"The prose in the UI is more qualitative review than quantitative. But it could still be
> scored."*

## What replaced it

Two numbers, neither of them a budget:

- **concise** — no single explanation past 240 characters, about two sentences. 3 violations at the
  time of writing, ceiling 3, may fall and may never rise. A longer one is an essay and belongs in
  `docs/widgets/<node_type>.md`, which every panel links to.
- **floor** — no explanation may score below the worst one already in the Inspector. 27 at the time
  of writing, may rise and may never fall.

The floor is the practitioner's rule mechanised. A new control's explanation is never charged for
being new; it is refused only for reading worse than what is already there. Measured immediately:
adding the acquired-country line took the count from 113 explanations to 114 and moved the floor by
nothing. Under the budget that same 60-character line needed 60 of the 22 characters left.

## What was tried and thrown away

- **A development-note vocabulary gate.** Ten patterns over the prose: 3 hits, of which 2 were
  false positives (*"until it is decided"* is about duplicate records). One true positive does not
  justify the noise. Kept as **one weighted component of the score**, where a false positive costs
  a few points instead of a build — which is the practitioner's distinction doing real work.
- **A first scorer that ranked `then` above every real explanation in the repository.** Deleting
  `${...}` to get at the prose split sentences into scraps, and brevity at a quarter of the weight
  made the shortest scrap the best writing in the codebase. An interpolated value is now one token
  rather than a deletion, a match carrying a backtick crossed a source concatenation and is set
  aside, and a paragraph that is more than a quarter values is a readout, not an explanation.
  21 fragments and 30 readouts are now set aside — none of which the character total ever
  distinguished from prose, in either direction.
- **`concrete`, a component rewarding units and consequences.** It scored *"A basemap is layer 0,
  under everything the workflow produced"* at zero. Dropped.

## What the score does not establish

It does not know whether an explanation is **true**, whether it explains the **control a reader
will take it to be about**, or whether **anyone understood it**. It measures sentence length,
syllable load, hedging and development vocabulary — proxies, all of them, and it saturates: many
explanations score 100 and it cannot rank them against each other. Its real output is the
worst-first list it prints. The qualitative review stays human; the score says where to start.

A score treated as the review rather than as a route to it will be gamed by short bad sentences,
and the first draft of this very script proved that is not hypothetical.

## The half that is not built

`anchored` — the share of its control's label words an explanation reuses — is **reported and
carries no weight**, because the association it rests on is a guess. Measured 2026-10-23:

**134 of 139 paragraphs sit outside the `<div class="field">` of any control.**

Including the one explaining the snap limit, which falls after its helper's closing tag. Which
control a reader takes a paragraph to be about is settled by reading order, not by structure, and
neither the source nor the rendered DOM recovers the intent. The sample list bears this out: the
395-character snap-limit essay is attributed to `Hemisphere`, and three unrelated paragraphs to
`Display as`.

Making it structural means the field helpers take an explanation as an argument and every renderer
passes one — a markup change across all seven files and roughly 134 paragraphs. Then "does each
component carry one concise explanation" becomes a containment check that cannot guess, and
coverage can be gated rather than scored.

## What would show this was wrong

- **A panel gets worse while both numbers hold.** The score saturates, so prose can degrade from
  100 to 80 invisibly. If a practitioner reports an unclear explanation that scores above the
  floor, the floor is measuring the wrong end of the distribution and a median or percentile
  belongs in the gate beside it.
- **The worst-first list stops being read.** Its only function is to route a human. If the list is
  never acted on, the score has become the review, which this experiment says it must not be.
- **The three remaining essays are never paid down.** The ceiling permits them. If it sits at 3 for
  months, the ceiling is recording a decision not to write the manual pages rather than a debt.
