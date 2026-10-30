# 141 — Notes, the story, and the report: one record

_Created 2026-10-26 · Updated 2026-10-29_

**Status:** tried — the design is proposed and was tested against a publication that already
exists, before anything was built. Nothing in `src/` carries a note today.

**This supersedes [17](17-workflow-publication-products.md),
[119](119-can-this-tell-a-story.md) and [133](133-the-planning-stage-and-historical-notes.md)**,
at the practitioner's instruction on 2026-10-26: synthesize them so there is one to deal with.
Those three stay in the repository as the record of how each finding was reached; what is
actionable is here. [74](74-notebook-first-worked-examples.md) is NOT superseded — it is the
notebook intuition pointing the other way, a method for deriving primitives from a real analysis.

**A correction that is itself the argument for consolidating.** Most of the "connection worth
testing first" written below — that a story is the playback sequence with narrative attached to
its steps — was already recorded in 133 on 2026-10-24, with the same `reveal-playback.ts` quote
and a table of what arrives along `buildOrder`. It was rediscovered on 2026-10-26 by someone
working on this project all day, because the record was spread across four documents and 700
lines. That is the cost this consolidation is paying off, and it is the same cost that merged two
TODO lists the same afternoon.

## The question

The practitioner, 2026-10-26, after specifying what notes should be: *"can we organize John
Snow's notes as if we were using FW to write his publication about South London?"* And then why
it matters: *"that's how we demonstrate the value of the notes widget."*

This is the stage [AGENTS.md](../../AGENTS.md) says is usually skipped — a rule proposed, then
**tried in a scenario**, and only then built. It costs nothing here, because the publication
exists, its argument is known to have succeeded, and this project already carries its figures.

## The design being tested

**Why notes at all**, in the practitioner's words: *"Notes are user documentation that provides
the contextual scaffolding for the workflows. Like in a Jupyter Notebook, the computations are
not as useful by themselves. Only when they are woven together by narrative will they begin to
make sense and become a story."*

Three levels, all markdown:

| Level | Role |
| --- | --- |
| **Widget** | notes on a widget "so their outputs can carry the notes" |
| **Workflow** | "its own widget ... provide context for the workflow", a methods section with its limitations |
| **Project** | how workflows "are sequenced and stitched", rationale for selection and sequencing, synthesized findings |

And each note carries **two coordinates**: a *functional* purpose (what it does for a reader —
`source`, `limitation`, `rationale`, `context`, `method`, `finding`) and a *narrative* purpose
(where it belongs in the write-up). The narrative frame is **IMRaD as taught in the FETP
materials**, not a journal reporting checklist.

## The test

South London's README is 453 lines in 22 sections. It was written as repository documentation.
Read as a publication it is already one, so the test is not "could a narrative be written" but
"does the proposed shape hold the one that was".

| README section | Level | Functional | IMRaD |
| --- | --- | --- | --- |
| The figures; By sub-district | widget | source | Results |
| The whole table, verified against two independent transcriptions | widget | source | Methods |
| A 36-person error, and where it actually came from | widget | *verification* | Methods |
| One of the five printed rates does not follow from the columns beside it | widget | *verification* | Results |
| Deaths per 1,000 people, by sub-district (and the five other per-workflow sections) | workflow | method | Methods |
| Why the company is the exposure | workflow | rationale | Introduction |
| The three dates, which do not agree | **project** | limitation | Methods |
| Limits | project | limitation | Discussion |
| What this repository does not yet contain | project | limitation | Discussion |
| Independently found, twice | project | finding | Discussion |
| Why this is a separate repository | — | — | — |
| References, and its four subsections (~75 lines) | **derived** | source | **References** |

### References are the one section a workflow can write by itself

_The practitioner, 2026-10-26: "Some of the references and citations can be automatically built
from the provenance of the assets like WorldPop, OSM, PMTiles, John Snow literature, etc."_

That row carried two dashes until this was said, and it was the only row in the table that did.
The reason it can be filled is that **this project already stores a bibliographic record and
calls it something else.** Every source carries a licence IRI, a digest and a retrieval date;
`provenance.json` in the example repository holds them per asset; a run emits PROV naming every
entity a result used. A reference list is that same information with a citation style applied.

So References is a **fourth kind of note**, and it is unlike the other three. Widget, workflow
and project notes are written by a practitioner and the application cannot check them. This one
is the reverse: **nothing should be written by hand, because anything written by hand can
disagree with the digest.** It is derived, and the practitioner's judgement goes into what a
citation says about an asset ONCE, in the source record, rather than into every report that
cites it.

What that buys, and why it is more than a convenience:

- **An uncited asset becomes findable.** A run used an entity; the report's reference list is
  built from the run; so an asset that appears in a figure and in no reference is a gap an
  application can name. This is the first thing in 119's assurance argument that could be
  mechanically checked, and References is where it is cheapest.
- **A citation and a digest cannot drift apart**, which is the failure the retrieval date exists
  to catch. A hand-typed OSM citation stating a date the digest contradicts is worse than no
  citation, because it looks like diligence.
- **It separates the two things a reference does.** Attribution is a licence obligation and is
  owed whether or not anybody reads the report; citation is a scholarly claim about what the work
  rests on. The same record serves both and they are not the same act. ODbL requires the first.

**What is NOT derivable, and must not be made to look as if it were.** The John Snow literature
is a different case from WorldPop, OSM and PMTiles: the 1855 monograph is not an asset with a
digest this project retrieved, it is a work being argued with. A citation to it is a scholarly
choice about what the account rests on, and nothing in a receipt knows it was made. So the
derived list is **sources used**, and a practitioner adds **works cited** — and a report that
blurred the two would be claiming provenance for a reading.

Nor is the ORDER derivable, nor which style, nor whether a source cited for one number deserves
the same prominence as one the whole argument rests on.

**And the section predicts which kind it is**, which turns the distinction from a caveat into a
rule the application can hold. _The practitioner, 2026-10-26: "There are some references that
will be written by hand, especially those that appear in the Introduction, and Discussion."_

| IMRaD section | What it cites | Where it comes from |
| --- | --- | --- |
| **Methods** | the assets the run used: a boundary, a population raster, a basemap, a transcription | derived from provenance, with the digest and the retrieval date |
| **Results** | the same assets, where a figure rests on one | derived |
| **Introduction** | the literature the question comes out of | written |
| **Discussion** | the literature the finding is argued against | written |

The reason the split falls exactly there is not bibliographic convention. **Methods and Results
make claims about what was done, and the application witnessed it. Introduction and Discussion
make claims about what the work means, and nothing in a receipt was present for that.** So the
two reference kinds are not a formatting difference to be merged later: they differ in who can
vouch for them, which is the same distinction this project draws between a measurement and a
judgement everywhere else.

It also gives the derived list a falsifiable duty. A Methods reference that nothing in the run
used is wrong and can be caught; an Introduction reference nobody can check is a practitioner's
to defend, and the report should not dress it in a digest.

**Not built.** Recorded here on the day it was said, with the rest of the notes design.

## What held

**The three levels are real, and the README sorts into them without strain.** The six
per-workflow sections are workflow notes; `Limits` is a project note; the transcription
provenance is a widget note. Nobody designed the README this way, which is the point: the
levels were found in it rather than imposed on it.

**The narrative axis is independent of the functional one, as predicted.** `Limits` and `The
three dates` are both `limitation`, and they land in different IMRaD sections — Discussion and
Methods — because one is about what the study cannot show and the other about how it was
measured. One vocabulary could not have expressed that.

**A note's scope is not always its level's scope.** `The three dates, which do not agree`
governs *four* of the six workflows and belongs to none of them. It is a project note that
constrains particular workflows, which the design did not anticipate and which a simple
three-level containment would get wrong.

## What did not hold

**IMRaD has no slot for References, and every publication has one.** Roughly 75 lines of this
README — primary source, digitisations, independent verification, geography, examined and not
used — have a clear functional purpose (`source`) and no narrative home. Either the narrative
axis is IMRaD plus the apparatus a publication actually carries, or references are not notes at
all but the evidence register this application already has, surfaced into the write-up.

**Two sections are about the artifact, not the investigation.** `Why this is a separate
repository` is a decision about packaging. It is real documentation and it is not part of any
publication, so a design that files everything under IMRaD would either lose it or distort it.

**`verification` is missing from the functional vocabulary.** Two of the strongest sections —
a 36-person arithmetic error traced to its origin, and a printed rate that does not follow from
the columns beside it — are neither `source` nor `limitation`. They record *checking the source
and finding it wrong*, which is a distinct act and arguably the most valuable prose in the file.

**The best material was produced by doing the work, not by planning it.** Both verification
notes exist because somebody transcribed the tables twice and compared. No note field would have
elicited them.

## The final stage: the report

The practitioner, completing the shape the same day: *"the final stage is the report that
synthesizes the workflow outputs and the narratives."*

So the notes are not the product. The product is a **report**, and the three note levels are its
raw material together with the outputs themselves — the figures, the tables, the maps. That is
the Jupyter analogy carried to its end: a notebook's value is not the markdown cells or the code
cells but the rendered document in which neither can be read without the other. It is also what
[17](17-workflow-publication-products.md) asked for in 2026-10-06 and could not say the mechanism
for: communication products as end products, "preserving the connection between displayed
findings, underlying results, assumptions and supporting evidence".

With notes carrying a narrative purpose, that mechanism is now nameable. A report is the IMRaD
structure, filled by selecting notes for each section and the outputs they refer to.

**One stage, several renderings.** The practitioner, immediately after: *"that stage also
presents the story map, shows the dashboard."* So the synthesis stage is not a document
generator. It composes notes and outputs once, and renders that composition in the forms
[17](17-workflow-publication-products.md) named in 2026-10-06 — report, story map, infographic,
dashboard — which until now read as four features and now read as four views over one thing.

They differ in **reading order** and in **their relationship to time**, and those two
differences decide what each one needs:

| Rendering | Reading order | Time | What it needs that the others do not |
| --- | --- | --- | --- |
| **Report** | IMRaD, linear | a snapshot of an investigation | the narrative axis, and a References home it does not yet have |
| **Story map** | a guided path through the geography | a snapshot, walked | an ORDER, which a graph does not have |
| **Dashboard** | none; read at a glance | live, recomputed | numbers that are never transcribed |

**The story map is the one that needs the spine.** A report can take IMRaD's order and a
dashboard needs no order at all, but a story map is a sequence through a canvas that has none.
`src/reveal-playback.ts` already computes one, one widget at a time, and says that order "is
computed here and nowhere else" so the interface and the measurement cannot disagree. It was
built for experiment 112 to watch progressive reveal behave. If a story map is the playback with
narrative attached to its steps, the hardest part of it already exists and was paid for.

That also answers [133](133-the-planning-stage-and-historical-notes.md)'s question from the other
end: it asked whether story map structure could be the frame a workflow is PLANNED in rather than
a presentation applied afterwards. If the order a story map walks is the order the canvas was
built in, the two are the same structure seen at different times, and planning in it is not a
separate discipline.

**The dashboard is where "do not transcribe a number" stops being advice.** A report is a
snapshot and could, badly, be written once. A dashboard claims to be current; one holding
transcribed numbers is stating a falsehood the moment anything is rerun, and unlike a stale
report it carries no date to warn a reader.

**Why this is a field application and not a publishing feature.** The practitioner, on the
synthesis stage: *"that is a very powerful field application."* The report is not a convenience
added after the analysis — for a field epidemiologist it **is** the deliverable. An outbreak
investigation produces an investigation report, that is what FETP trains people to write, and
this project's stated goal is practitioners "where it matters, and where resources and
connectivity may be scarce".

What that setting changes: the report has to be producible **on the device that did the
analysis, offline, by the person who did it**. Today the path from a result to a report runs
through exporting numbers and retyping them into a document somewhere else — which is the step
that introduces the drift below, and it happens at the worst moment, when an investigator is
tired and the report is due. Removing the transcription is not tidiness; it is the difference
between a report that can be regenerated when a case count is corrected and one that cannot.

**The failure mode, which this project demonstrated to itself today.** A report that RETYPES its
numbers will drift from the analysis that produced them. On 2026-10-26, within an hour:

- the South London README described the derived 2x2 as having row totals, and the figure drew
  none — the prose was written from the arithmetic rather than from the rendered figure, and was
  wrong about the application's own behaviour until someone looked;
- earlier the same day a figure's key named marks the figure did not carry, reported three times
  on three surfaces before it was right.

Both are the same defect: a sentence about a result, stored apart from the result, with nothing
to make them disagree out loud. A report is that defect institutionalised unless its figures and
numbers are **derived from the run rather than transcribed into the document**. The rule that
follows is not a preference: a report may quote a note verbatim, because a note is prose somebody
wrote; it must not quote a number, because a number is a result somebody computed.

This is the strongest argument yet for notes being declared data with a purpose rather than a
free-text field. A report that assembles itself from typed notes and live outputs can be
regenerated after a rerun and will either still be true or visibly fail; one that is written once
is a document that can quietly contradict its own analysis.

## Amendment, 2026-10-29 — the narrative, and why verification earns it

The practitioner, on keeping `verification` in the reconciled vocabulary:

> we can put a spin to the narrative. Because we used some novel methods for the workflows, we can
> treat the exercise as the past meeting the future. Where we stand on the shoulders of a giant in
> epidemiology (John Snow, the father of epidemiology) and reconcile his methods with modern ones,
> especially GIS.

**The framing holds, and the evidence makes it sharper than reverence.** The obvious version of
"the past meeting the future" is that modern tools check an old master and find him wanting. That
is not what this example found, and writing it that way would be false.

What re-transcription actually found, already in the example's README:

- Snow's deaths column sums to **1,514**, exactly the printed total, and **all six** of Table
  XII's group totals come out exactly. The arithmetic of 1855 is correct.
- The populations sum 36 short of the printed total — and *"three independent sources settle it,
  and none of them blames Snow"*. One digitisation reads 26,748 where the same e-text's Table VII
  and Coleman's transcription from the archive.org scan both read 26,784. **The error entered in
  the copying, not in the original.**
- One figure is still not reproduced under either rounding rule: Rest of London, printed 59 where
  the quotient is 55.46. That one is unexplained and is left so.

So the honest narrative is not that the modern tools corrected the giant. It is that **they
checked him, found him right, and located the error in the century and a half of copying in
between** — with one residue nobody can yet account for.

**That is what makes `verification` load-bearing rather than decorative.** Standing on a
predecessor's shoulders is a claim you are only entitled to make about work you have checked, and
`verification` is the function that records the checking. A vocabulary with `source` and
`limitation` and no `verification` can say where a number came from and what it cannot show, and
cannot say *we re-did this and here is what we found* — which, on this example, is the only reason
the rest of the write-up is trustworthy.

**Where the GIS half lands.** Snow's method was the natural experiment and the comparison; the
map was his illustration of it. What is modern here is not the idea but the apparatus: boundaries
digitised and georeferenced, a join whose unmatched rows are reported rather than dropped, a rate
with its denominator declared, an interval around the rate ratio, and a receipt for each. Those
belong to `method` notes in the Methods section, and the comparison between his apparatus and
ours belongs in Discussion.

**What this does not settle:** whether the example should *say* any of this. The notes that would
carry it are not written, and writing them is a different act from designing where they go. The
two verification sections above exist as README prose and are not yet notes at all.

## Amendment, 2026-10-29 — the DE outcome, and the rung it is on

The practitioner:

> If the work becomes publishable, which it could, then we have developed the critical substrate
> on which that publication will stand. And at the same time, we have demonstrated the value of FW
> in facilitating the production of such publication, an important DE outcome.

**The first half is true now.** The substrate exists and is checkable: nine quoted notes carrying
what each establishes, two of them recording a modern source checked against the historical one;
a machined note per computation that states its own numbers; a functional vocabulary reconciled
against this experiment; references the workflows can write themselves; a receipt behind every
figure. A publication built on that would stand on something, and the something is in the
repository rather than in anybody's memory.

**The second half is the claim this project is most at risk of flattering itself about**, and its
own instrument already says so. `scripts/widget-evidence.mjs` declares four rungs and prints the
top one empty on every run:

> 4 · field use — a practitioner used it on real work. **Nothing has this yet**, and the rung is
> declared anyway, because an empty top rung is a measurement and a missing one is a flattering
> omission.

Facilitating a publication is that rung, one surface over. Today the notes are at rung 2: one
worked example exercises them, and the example is one we built to exercise them. *"We have
demonstrated the value of FW in facilitating the production of such publication"* is not yet a
measurement — it is the hypothesis the worked example was constructed to test, and the test has
not been run.

**What would run it**, stated so it can be checked rather than asserted:

- A write-up of this study whose Methods and Results sections are **assembled from the notes the
  workflows produced**, not written beside them — with the count of sentences that had to be
  written by hand recorded, because that number is the friction the mission promises to decrease.
- The same for its references: 141 found roughly 75 lines of the README are `source` material with
  no narrative home, and that *"references are the one section a workflow can write by itself"*.
  Whether it can is a thing to measure, not to claim.
- One author who is not the application's author doing it. An example built by the people who
  built the tool, used by the people who built the tool, measures the tool's reach and not its
  usefulness.

Until then the honest statement is the one the ladder models: **the substrate is built, one
example exercises it, and the top rung is empty.** Writing it down that way is what keeps the
outcome worth claiming when it is finally earned.

## Carried over from the three superseded records

### The spine, and what travels along it (from 133)

A note is **not one per investigation**: a workflow may carry several, each anchored at a point
rather than filed. And a story is **played** rather than scrolled — a note appears when the thing
it is about does. The sequence is `buildOrder` in `src/reveal-playback.ts`, already computed and
already in the interface as *Play back the build*:

| Arrives | From | Anchored to |
| --- | --- | --- |
| a step appearing | `buildOrder` | the node |
| a result | the run that produced it | the output |
| a note | the practitioner | the node or the output it is about |

### The danger, which is the real question (from 133)

**Writing the story first is how evidence gets fitted to a narrative.** That is not hypothetical
in public health; it is the ordinary failure mode of outbreak communication, and a studio that
encouraged it would be worse than one with no planning stage at all.

The discipline that makes the inversion honest is already in
[27](27-workflow-learning-and-gamification.md): **What do I predict?** A section written before
the run is a prediction. One that survives the run is evidence; one that does not is a finding,
and the section must change or say why it did not. That is the difference between
pre-registration and confirmation bias, and this application can MEASURE it, because it knows
when a workflow ran, what it produced, and whether the result still matches the canvas.

### Omission, made computable (from 133 and 119)

119 drew the line: *"a map that leaves out the inconvenient district still breaks no rule — but a
map that leaves out what its own declared objective says it is for is, for the first time,
something an application could notice."* Synthesis puts a second case on the computable side. If
a report accounts for a project's workflows, **a workflow whose answer appears in no section is
visible**. Not omission of a fact, which stays uncomputable; omission of a question the
practitioner asked themselves and then left out.

Said quietly, as a count beside the sections rather than an accusation: leaving a question out is
often correct, and the point is that it be a decision rather than a drift. It is also the answer
to the danger above — synthesis cannot quietly drop the question that did not support the story,
because the question is in the project and the project is what the report is of.

### Assurance, and why a green list is the danger (from 119)

The parts of a trustworthy account are **present, measured, and scattered**: provenance (PROV
chains, licence IRIs, digests, retrieval dates), rigorous processing (declared units that refuse
rather than convert, declared bindings, unread records counted, rulesets that decline and say how
often), and the cartographic rules held to SHACL shapes in
[118](118-cartographic-judgment-as-rules.md). Each lands in its own corner of a receipt with
nothing taking the three together.

A reader cannot ask *"was this made under conditions I would accept?"* and get an answer. And
**an assurance that cannot fail is worthless**: whatever is built must be able to return "these
conditions were not met" and say which. A short list of green outcomes is the easiest thing in
this project to mistake for quality.

### Product identity (from 17)

A communication product must preserve the connection between what it displays and the underlying
results, assumptions and evidence; and a product's presentation filters must stay separable from
the analytical decisions that produced the numbers. A filter that silently changes a finding is
an analytical decision wearing a presentation control.

## Amendment, 2026-10-29 — equations, and the author contributions statement

Both arrived while [150](150-can-several-authors-collaborate-in-a-project-repository.md) was being
written, and both were briefly recorded there before the practitioner separated the threads: *"They
are connected but for clarity we have to separate."* 150 is about the repository — its format, its
write path, who may change it. These two are about what the report carries, which is this document.

They share one dependency and it runs one way: both name authors, and an author is
`fw:Author` with the two tiers of `fw:identityBasis`, which 150 settled. Identity is a prerequisite
for co-ownership; these are things a publication prints.

### The author contributions statement

The practitioner: *"Because we have authors modifying the artifacts, we can actually quantify the
amount of work each co-author did in the publication. So that goes into author contributions section
at the end of the publication."*

This is the clearest member of the apparatus class this corpus already names — the parts
*"assembled from declarations spread across a workflow rather than written into one place, so no
single note owns them"*. Nobody writes an author contributions statement, and it is wrong exactly
when somebody writes it from memory instead of from the record.

Built 2026-10-29 in `src/contributions.ts`, over CRediT, whose fourteen role IRIs were each checked
to resolve before any was used. The set is closed because it is somebody else's standard.

**What it refuses to do is the design.** The request was to quantify, and a count of acts is the
only quantity available — but a count is not a measure of contribution. One decisive limitation
note can outweigh forty drawn boxes and nothing observable here tells them apart. So: no share, no
percentage, no ranking; authors keep byline order rather than being re-sorted by volume; every role
is marked **proposed** for the authors to confirm. Journals ask for roles, not proportions, so this
is also the form they want. Six of the fourteen roles leave no trace in a workflow and are named as
unevidenced rather than quietly omitted, so a reader can tell a role nobody performed from one the
application cannot observe.

Evidence base, measured rather than assumed: **two** surfaces carry an author today —
`AuthoredNote.author` and a study area's `drawnBy`. A statement assembled from them is as thin as
the record is, and saying so is part of the output.

### Where this thread lives, so it stops seesawing

The practitioner, 2026-10-29: *"It's in a lot of places, for publications. For example we talked
about table shells (147) and what become required variables depends on study design."* Measured
across the corpus rather than guessed — documents with more than two mentions of publication,
write-up, IMRAD, table shell, author contribution or journal:

| owner | what it owns |
| --- | --- |
| **141** (this) | the notes, the report they assemble into, its apparatus: equations, author contributions |
| **147** | the chain from study design to required variables to table shells, and the open question of how a design is **declared or detected** |
| `docs/research/fieldwork-study-designs-v1.1.md` | the design taxonomy itself — generated elsewhere, unverified here, and labelled as such |
| `docs/audits/study-designs-and-our-computations.md` | which designs our computations actually serve, read from the code |
| `docs/research/mmwr-style-for-machined-prose-2026-10-28.md` | MMWR house style: machined titles, and equations |
| **149** | the Notes surface as built, and what the spike found |
| **150** | the project **repository**: format, granularity, assets, write path, identity, who may change it |
| **54** | degrees of reproducibility — the ladder of input classes and the minimum rule |
| **136** | a figure that stands on its own |

**The boundary that was blurring**, stated once: 150 is about the repository and who may change it;
141 is about what the report says. Identity is 150's and is a prerequisite; a contributions
statement is a thing a publication prints, so it is 141's.

**And the boundary with 147**, which is finer and was nearly missed. 147 already writes the chain:

    study design → the computations it licenses → the variables they need
                 → what to look for in the incoming columns → the shells they fill

The practitioner, 2026-10-29: *"The study designs for epi is in a docs/research note."* So the
taxonomy is not 147's either — 147 holds the question 147 itself names as the hard one, *how the
design is declared or detected in the first place*, and the taxonomy and the audit are the two
documents above.

So **which** equations may be computed at all is 147's question — it is downstream of a design, and
147 records that no gating exists today: `case-control`, `cohort` and `cross-sectional` appear
nowhere in `two-by-two.ts`, `epi-estimate.ts` or `rate-ratio.ts`. **How a licensed computation's
equation is written into the report** is this document's. 147 anticipated the junction: *"during
table input, the variables can be mapped to computation/equation terms already."*

### Equations as notes

The practitioner: *"All of our computations have equations, and these can be automatically
constructed in LaTex for automatic rendering as notes."*

**The measurement is not here.** It is a probe against a journal corpus, so it lives with the other
one: [`docs/research/mmwr-style-for-machined-prose-2026-10-28.md`](../research/mmwr-style-for-machined-prose-2026-10-28.md),
part three. One MMWR article read in full carries exactly one equation — the rate, as plain inline
text in three table and figure footnotes — and gives the rate ratio and its interval no formula at
all, naming SAS 9.4 instead.

**What Fieldwork holds**, read off the implementations rather than from a textbook, because a
formula asserted for a computation nobody read is the failure this corpus exists to prevent:

| computation | the formula as implemented |
| --- | --- |
| `rate` | `numerator / denominator × multiplier` (`rate.ts:91`) |
| `rate_ratio` | `(a₁/n₁) / (a₀/n₀)` — and `rate-ratio.ts:121` notes the multiplier **cancels** |
| `rate_ratio` interval | `exp(ln RR ± z·√(1/a₁ + 1/a₀))`, stated at `rate-ratio.ts:127` |
| `two_by_two` | risk ratio, odds ratio, risk difference, with log/Wald intervals |

**Three decisions follow, and the probe changed two of them before anything was built.**

1. **A note carries both forms, not LaTeX alone.** What this genre prints is an inline parenthesised
   expression; LaTeX serves a journal that sets display math. The plain form is also the only one
   that works today, since nothing here renders math.
2. **The equation worth emitting is the one the literature omits.** The rate is spelled out in
   footnotes because a reader could reconstruct it unaided. The interval is replaced by a software
   citation — and that is the step this application can supply.
3. **The instantiated form is the valuable one.** A symbolic formula restates a textbook; the same
   formula with this run's numbers substituted lets a reader check the arithmetic. That is a
   reproducibility contribution in [54](54-degrees-of-reproducibility.md)'s narrow sense, unlike
   the identity thread, which serves accountability.

An equation note is a **machined** note by that kind's own definition — *prose a widget generated
for a part of a write-up*. Not a new kind, and the rule that editing one forks it into an authored
note holds unchanged. Where it lands is open: MMWR puts it in a footnote, and a footnote is
apparatus rather than one of the four IMRaD parts a note can target.

**Nothing is built.**

### Reusing a document ontology, checked 2026-10-29

The practitioner: *"Can we reuse a document ontology to organize our Notes assets?"* Checked against
the vocabularies themselves rather than from memory, because the answer determines whether terms
get coined or borrowed.

**Yes — SPAR, and specifically DEO and DoCO.** DEO (Discourse Elements Ontology,
`http://purl.org/spar/deo/`) defines **45 classes**; DoCO (Document Components Ontology,
`http://purl.org/spar/doco/`) imports it and covers structure.

**Every one of the four IMRaD parts already exists there.** `deo:Introduction`, `deo:Methods`,
`deo:Results`, `deo:Discussion`. This application coined nothing it needed to, and the mapping is
exact rather than approximate.

**And DEO corroborates a ruling already made here, by omission.** It has **no Limitations class** —
it has Discussion, Background, Motivation, Conclusion, Evaluation, and no Limitations. Which is
precisely the ruling `notes.ts` records: *"LIMITATIONS IS A FUNCTION, NOT A FIFTH PART. In IMRAD it
is a subsection of Discussion."* An external standard agreeing by omission is worth more than one
agreeing by assertion.

**There is a class for the thing built this morning.** `deo:AuthorContribution`. The author
contributions statement has a term waiting for it.

Known `fn` values against DEO: `background` → `deo:Background`; `rationale`, `purpose` →
`deo:Motivation`; `method` → `deo:Methods`; `related literature` → `deo:RelatedWork`; `finding` →
`deo:Results`; `source` → `deo:BibliographicReference` or `deo:ExternalResourceDescription`.
Unmatched: `verification` and `limitation` — the first has no DEO class (`deo:Evaluation` means
something else), the second is a function by the ruling above.

**What does NOT map, and should not be made to.** The four note *kinds* — quoted, machined,
authored, derived — are a **provenance** distinction, not a discourse one: they record who or what
produced the words. DEO models what a passage DOES in an argument and is silent on where it came
from. That half stays PROV's and this application's, and conflating them would lose the thing the
kinds exist to carry.

**Recommended shape: align, do not replace.** `fn` is deliberately an open string, for a reason
this document's corpus already paid for — *"a vocabulary closed before its producers exist is a
vocabulary that gets withdrawn"*, against a ratchet standing at 131 occurrences. Importing DoCO
would close it. Declaring `rdfs:subClassOf` / `owl:equivalentClass` alignments for the terms that
genuinely match adds no withdrawable term and makes the receipt readable by anything that speaks
SPAR.

**And it answers the ordering question that arrived the same hour.** The practitioner: *"In the
Notes UI we should be able to move around notes within IMRaD sections."* **DoCO does not define
sequence** — ordering is the Collections Ontology, `co:List` with `co:firstItem` and `co:nextItem`.
So a reordering feature has a vocabulary to emit into and does not need one invented. Note that a
linked list is the right thing to *publish* and the wrong thing to *store* for a surface people drag:
the internal order is a position in a list, and `co:` is how it leaves.


### What these two do not establish

- **That the MMWR survey is a survey.** One article was read in full and a handful of others were
  seen only as search summaries. The one source that *is* a purposive review of MMWR data
  reporting — Heilig, 56 full reports from January 2019 to May 2022 — does not quantify how often
  each measure appears in the chapter read here, and says nothing about equations. So the finding
  is one article's practice, verified, and not a measured frequency across the journal. What would
  make it one is reading the Methods and footnotes of a named sample and counting.
- **That MMWR's practice is the right target.** It is a field-epidemiology weekly with a house
  style, chosen because it is the genre this work sits in. A journal that sets equations as display
  math would want the LaTeX that MMWR's style does not use, which is the argument for carrying both
  forms rather than picking one.
- **That any equation note exists.** Nothing is built. The formulas above were read off the
  implementations and the survey changed the intended format before a line was written, which is
  the whole value of having run it first.
- **That a contributions statement has ever been assembled from a real project.** It was exercised
  on constructed authors and on South London's notes in a scratch run, not published.

## What this does not establish

That notes make a workflow legible. Nothing was built and nobody read a workflow through one.
This maps an existing narrative onto a proposed structure; it does not show that a practitioner
writing *into* that structure produces a readable account, and the mapping was done by the same
party that proposed the structure.

It does not establish that the Jupyter analogy transfers. A notebook's reading order is its
execution order; a canvas is a graph with no inherent order. `src/reveal-playback.ts` computes
one for progressive reveal (experiment 112) and is the obvious spine to test, but no story has
been told along it.

It does not establish that one composition can serve all four renderings. That is an
architectural claim made from their descriptions, not from building any of them, and the
differences tabulated above are exactly the kind that look superficial until implementation
finds they are not.

It does not establish that a report can be assembled at all. The synthesis stage above is a
design with no implementation and no trial: nothing here has selected notes into sections, and
the claim that a report regenerated after a rerun "will either still be true or visibly fail"
is an assertion about a mechanism nobody has built.

It does not establish that the README is a good publication — only that it is a real one, written
without the structure being tested, which is what makes it a fair test rather than a rehearsal.

Nor does it say anything about whether a practitioner would write these notes at all. The
README exists because this project documents itself unusually heavily. That is not evidence
about anyone else.

## What would close it

Write the South London project's notes **in the proposed shape**, from the README, and see
whether the application can then show the account without the README. If a reader who has not
seen the repository can follow the argument from the canvas and its notes, the design holds. If
they cannot, the gap names itself.
