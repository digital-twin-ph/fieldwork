# 141 — Notes, the story, and the report: one record

_Created 2026-10-26 · Updated 2026-10-30_

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
| **141** (this) | the notes, the report they assemble into, its apparatus: equations, author contributions, captions and cross-references |
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

## Amendment, 2026-10-30 — the gesture was tested, and two of its three tests were asserting nothing

Reordering notes within an IMRaD section landed on 2026-10-29 with seven unit tests on `moveNote`
and a green gate. The practitioner asked for the running application. Dragging a card in it found
a defect those tests could not reach, and the attempt to test the defect found two more that were
in the test, not in the code. All three are recorded because the shape is the finding.

**The defect.** A card dropped on its own body was sent to the end of its section. `moveNote`
was correct throughout; the handler in `app.ts` read the drop position as `before=null` whenever
the card under the cursor was the dragged card itself — which is exactly what a drop into the
empty space below the last card means. Two gestures that mean opposite things shared one code
path, and only the DOM could tell them apart: once the position is `null`, the handler no longer
knows which gesture it was. The fix tests for it *before* reading the position rather than
inferring it from the result.

This is not the defect shape experiment 149 records (a field dropped by the one step that rebuilds
the object). It is a new one: **two distinguishable gestures collapsing into one indistinguishable
argument.** A unit test cannot see it, because the collapse happens upstream of the unit — by the
time `moveNote` is called, the information is already gone.

**The two tests that asserted nothing.** Both passed, and both were no-ops:

| What it looked like | What it actually did |
| --- | --- |
| A drag from one card onto another | Landed on `<html>`. Playwright reports a bounding box for a card the viewport cannot show; a synthetic drag to those coordinates fires no `dragstart` at all, so nothing moves and the "before" and "after" orders match for the wrong reason. |
| A drop on the card itself | Moved two pixels, which never crosses the browser's drag threshold. No `dragstart`, no drop, no move — and the assertion that nothing moved passed. |

The second one is the instructive case: it **still passed with the fix removed**, which is how it
was caught. Removing the fix and re-running is cheap and it is the only thing that distinguishes a
test that holds a defect out from a test that happens to agree with the code. Both rules are now
written into `tests/notes-order.browser.mjs` beside the code that obeys them, because both failures
are silent.

`tests/notes-order.browser.mjs` drives the three gestures on the published South London bundle:
a reorder that survives a reload, a drop on itself that does nothing and says nothing, and a drop
below the last card that ends *that section* rather than the write-up. 6 passed, Chromium and
WebKit, 2026-10-30.

**What it cost to find: one drag.** The feature had a green gate, seven unit tests and a correct
primitive, and the first gesture a person would try was broken.

## Amendment, 2026-10-30 — writing, and the two things keeping an edit can mean

The practitioner: *"Let's build the writing in the modal dialog."* Two of the four kinds said
*"Not built yet"* in that dialog, and they now do two different things. The difference is the
whole of the rule settled on 2026-10-29.

| Kind | What Save does | Why |
| --- | --- | --- |
| **authored** | Rewrites the note where it sits | It is ours. Nothing else has a claim on the words. |
| **machined** | **Forks** it into an authored note and leaves the machined note alone | The widget goes on machining its own account every run. An overwrite would be undone by the next run and would have destroyed the computation's wording in the meantime. |
| **quoted** | Nothing to write | An edited quotation is not a quotation. |
| **derived** | Nothing to write | It restates what an input declares. The place to change it is the input, or the receipt goes on asserting the input's own words. |

So the dialog says which of the two is about to happen **before the button is pressed**, and the
split lives in `app.ts` rather than in `notes-ui.ts`, because only the application knows where a
project's notes are kept.

**A fork records two warrants separately rather than merging them.** `forkedFrom` keeps the
machined wording as it stood, which is what makes drift detectable; `author` takes the current
GitHub login where there is one, and stays absent otherwise, as `src/identity.ts` requires. A
reader of the fork can see that a computation produced the sentence and a person changed it, which
are two different things to trust.

**An added note now opens for writing.** It did not before: adding one produced a card reading
*"(empty — writing is not built yet)"* and a toast, which is a card nobody could do anything with.
The marker is now `(unwritten)`, and it exists for a reason that is worth stating because it looks
like a placeholder and is not: `readNotes` **drops a note with no words**, so an empty note would
not survive the next open. The dialog opens the marker as an empty page rather than as prose to
delete first, and refuses to keep a note still carrying no words — giving the reader's own rule as
the reason rather than enforcing it silently.

**Closing says what it costs.** Once there is something to lose, the exit reads *Discard changes*.
A dialog whose only exit is labelled *Close* throws away an edit without ever having said so.

### Held against the prototype

The practitioner produced the Notes Board prototype's own dialog mid-build. Comparing the two
closed four gaps and left one open.

| In the prototype | What was here | Now |
| --- | --- | --- |
| Section and function are **drop-downs** | Both labelled *fixed* | Chosen, **for an authored note only**. The other three keep the label: a derived note's coordinates are decided by what it restates, a machined note's by the widget, a quotation's by the claim it establishes. |
| `PRODUCED BY — written here — no workflow` | The field was omitted when there was no node | Said. A note with no workflow behind it is a fact about the note, not a blank. |
| `New note`, with the kind and id beside it | `Note — authored` | The heading says which it is, and the id is shown — shortened to eight characters when it is a UUID, whole when it is readable like `snow-chloride-test`. |
| `Discard` / `Add note` | `Close` / `Save` | A note being written for the first time has nothing to go back to, so its exit is *Discard* throughout and its button is *Add note*. An existing note keeps *Save*, and its exit becomes *Discard changes* once there is an edit to lose. |
| A **formatting toolbar** — bold, italic, lists, quote | Nothing | **Not built.** See below. |

**One word in the prototype is retired.** Its function drop-down offers `background`, which with
`purpose` was this list's own vocabulary and is not in the one that settled on 2026-10-29. The
drop-down offers the seven that survived, and a test asserts the two retired words are not on it —
because a screenshot is a reasonable place to reintroduce a withdrawn term without noticing.

**The toolbar was a decision, not an omission — and it was taken the same day.** A note's `text` is
plain prose everywhere it is read: the counts, the contributions statement, the N3 receipt, and
whatever assembles a report. A toolbar means choosing a markup and teaching every one of those
consumers, and the obvious candidate interacts with the equations decision above. Both were settled
together in [151](151-typesetting-an-equation-a-practitioner-wrote.md): the markup is **markdown**,
because markdown is plain text and so none of those readers changes, and an equation is **LaTeX
converted to MathML**, which the browser typesets with nothing fetched and no fonts shipped. The
toolbar writes markdown a person could have typed by hand.

What this experiment claimed and 151 does **not** establish: that an equation is ever constructed
automatically. *"All of our computations have equations"* remains the claim; what exists now is a
place to put one and a renderer that will draw it. The first machined equation is unwritten.

**Two more things the dialog still will not do**, both deliberate: it does not edit a quotation or
a derived note, and nothing here deletes a note. Deletion was not asked for and has no gesture yet.

### Seen, not only tested

Three defects came out of looking at a screenshot of the dialog rather than from any assertion:
the textarea rendered at **182 pixels** and in a monospace face, because the stylesheet's generic
`textarea` rules do not reach inside this dialog, and the primary button sat to the left of the
exit. None of the twelve passing tests could see any of it. This is the same lesson as the drag
earlier the same day, from the other direction: a test says whether the mechanism works, and says
nothing about whether anybody can use it.

### The gate was already red, on an assertion about this example

Starting a gate found `notes-spike.browser.mjs` failing two assertions at the previous commit,
before any of this work: it claimed **9 notes**, and the example has carried **13** since
2026-10-29, when the lessons of this experiment were exercised on it. Nine of Snow's sentences and
four the investigation wrote. The assertions now say both numbers, because a total alone would go
stale the same way.

That is the second time in two days that **a count in a test outlived the thing it counted**. The
example is the shared fixture of ten browser suites, and editing it moves numbers in files nobody
is editing at the time.

**Validation.** `tests/notes-writing.browser.mjs`, 7 tests: an added note opens and what is written
is what the write-up says and survives a reload; a note with no words is refused with the reason;
closing after writing says it discards; a quotation has nothing to write; a derived note is still
changed at the input; the section and function of an authored note are the author's to choose and
the retired words are not on offer; and editing a machined note forks it, leaving the machined note
reading exactly as it did. 36 passed across the three notes suites, Chromium and WebKit.

**One mechanical note.** The fork test had to be pointed at a different workflow. `relate` is the
only widget that machines a note, and no example reached from the picker uses one — South London's
contingency table is the single workflow that joins two of Snow's tables, and it is selected by
name after the bundle is imported. The first version of the test ran against the workflow the
example opens on, where there is no machined note to edit, and failed by finding nothing.

## Amendment, 2026-10-30 — captions, numbers, and referring to a thing that has not settled

The practitioner, after the equation notes landed:

> Tables, maps, charts and equations need to be captioned and numbered but when organizing the
> notes, the positions of those artifacts in the emergent document may be temporary so referring
> to them from other notes requires having a flexible table/chart/map/equation referencing
> system.

**Nothing is built.** This records the design settled in conversation the same day, because a
design that lives only in a conversation is one this project cannot check itself against — the
reason the Notes Board prototype was written down in [149](149-the-notes-spike.md) rather than
left in an artifact.

### A number is a rendering, not a property

The same distinction `fw:layerIndex` already draws — *"the index is the order the ports are
declared, which is the order they are drawn today; when a practitioner can state the order, that
order belongs here instead"* — and the same reason derived notes exist: *"nothing should be
written by hand, because anything written by hand can disagree with the digest."*

A hand-typed "Table 2" is a hand-typed citation. It looks right, and it is wrong the first time
somebody drags a card. So a note stores a **reference to an identity**, and the number is computed
when the document is rendered.

**The identity already exists.** Every artifact is a node output, addressed in every receipt as
`urn:fieldwork:run:{runId}:output:{nodeId}`. And `relatesTo` already carries edges between notes
with exactly the right semantics for the hard case: *"An id naming nothing yet is KEPT: a note
whose companion has not been written is an ordinary state of a draft, and dropping the edge would
quietly undo a practitioner's decision at the moment it is hardest to notice."* A reference to an
artifact not yet placed is that state.

### IMRaD is the ordering, because IMRaD is the document

The practitioner, settling which of the three arrangements numbers come from: *"IMRaD is the more
document focused view, that's the publication outline."*

So Chronological and Board are working views and renumber nothing. **There is exactly one ordering
that counts**, which is a larger simplification than it sounds: dragging a card in Board view
cannot move a figure number.

**And it hands over the placement rule.** If notes are ordered within the outline, the order of
**first mention** is already a total order on the artifacts, with nothing extra to place or
maintain:

- a figure appears where it is first referenced, which is what a journal does anyway;
- its number is the position of that first mention in IMRaD order, computed and never stored;
- drag the note and the figure follows, so a figure **cannot drift away from the prose discussing
  it**, having no independent position to drift to.

One thing to drag rather than two. Note that this makes dragging a card **renumber figures with no
text changing**, which is the condition the instrument below has to make visible.

**The body is not the whole outline.** [147](147-table-shells-begin-with-the-end-in-mind.md) fixed
the boundary: IMRaD is the body, title and abstract are front matter, references and appendix are
back matter. Counters run over the body and an appendix figure numbers separately.

### The artifact nothing mentions, and the instrument for it

First-mention placement leaves a gap, and it falls in the richest section: 149 found Results is
*"mostly figures and tables"* with little connecting prose, so a figure nobody writes a sentence
about would never land.

The practitioner's answer, which is better than making the application place it: *"During the
notes organizing stage of publication, we can have an audit button to check which tables, charts,
maps, equations have no references in text."*

**This is the third case of omission made computable, and the most computable of them.** 119 could
notice only a map omitting what its own objective named; this document added a workflow whose
answer appears in no section; both sides of this one are already in the data — the artifacts the
run produced, and the references the notes carry.

**It reports and does not grade**, which is this document's own rule arriving where it is most
tempting to break: *"Said quietly, as a count beside the sections rather than an accusation."* And
149's: no completeness gate, no score, no badge. **An unreferenced figure is frequently correct.**
A green list here would be the assurance this record already warned cannot fail and is therefore
worthless.

Four conditions, which must not be run together:

| | What it means |
| --- | --- |
| referenced by nothing, placed in no section | invisible in the write-up — the case the button is for |
| referenced but not placed | the reference renders with nothing to number |
| a reference to an artifact that no longer exists | an **error** only when the thing is gone from the project — see the venue section below, which is what reclassified this row |
| referenced more than once | not a problem, but **first mention sets the number** |

**It is buildable before everything else here**, needing no renderer, no placement and no
numbering — only the artifacts on `WorkflowRun` and the references parsed out of note text, the
way `equationsIn` already parses formulas out of it. So it is also the **instrument that would
answer the rest**: run it on South London and the count of unmentioned artifacts says whether
first-mention placement is viable at all.

**Not to be called an audit.** In this repository that word means a procedure document run against
the codebase — the ontology audit, the rule audit, the worked-example audit, D1-D10 — and the
glossary already carries a *"same token, different subject"* warning for one such clash. *Check
references* says what it does and collides with nothing.

### A note set aside is not a note deleted, and that makes a venue a thing

The practitioner, reading the row above:

> It is possible that we may set aside some notes judged to be extraneous or unnecessary for a
> communication venue. So that means we should be able to save versions of the notes configured
> for selected communication venues.

Which breaks the row. A reference whose target is missing was recorded above as the one condition
that is an error rather than a choice, and it is not: a note set aside **for this venue** is an
editorial decision, and a reference left pointing at it is a consequence of that decision rather
than a fault. Three states, where the table had one:

| | |
| --- | --- |
| the note or node is gone from the **project** | an error — nothing can resolve it |
| the note is **set aside for this venue** | a decision, and the reference has to be dealt with, not flagged |
| the note is in the venue and **unplaced** | the earlier condition, unchanged |

**And it resolves something left open two sections up.** The caption convention was settled as
belonging to "the rendering", which was the right shape and the wrong noun. MMWR against a journal
that sets display math is not a difference of *form* — both are documents. It is a difference of
**venue**, and a venue is what carries both halves: which notes are in it, and how its captions
and numbers are written. One object, not two settings in different places.

This is distinct from the four renderings this document already names. **Report, story map,
infographic and dashboard differ in reading order and in their relation to time**; two venues can
share a form entirely and differ only in what they include and what they call a figure. So the
axes are:

- **form** — how it is read: report, story map, infographic, dashboard;
- **venue** — what is included, in what order, under whose caption convention.

### A venue selects; it does not copy

**The practitioner's phrase is "save versions of the notes", and the thing to be careful about is
whether a version is a copy.** It must not be, and this project has already measured the cost of
the alternative. [150](150-can-several-authors-collaborate-in-a-project-repository.md) found South
London storing its notes twice — once as a plain file and once inside the bundle — and recorded
what that did: *"on 2026-10-29 the two copies diverged within hours: nine edges written to the
plain file reached the bundle only when they were synced by hand."*

A venue that copies its notes reproduces that divergence once per venue. Correcting a sentence
would then mean correcting it in each, and the failure is silent — the journal version and the
field-report version quietly disagree about a number, which is precisely the drift this document's
*"a report may quote a note verbatim; it must not quote a number"* rule exists to prevent, arriving
by a different route.

**So a venue is a selection over one set of notes**: what is set aside, the order within each
part, the caption convention, and which parts exist at all — a policy brief has no Methods
section. The notes stay single-source. Edit one and every venue that includes it is correct.

Three consequences, each falling out rather than being added:

1. **Numbers are per venue, and this is the argument that settles "compute, never store."** Set
   Figure 3 aside and 4 and 5 move up. A stored number would be wrong in every venue but the one
   it was written for; a computed one is right in all of them.
2. **Check references runs against a venue**, not against the project. An artifact referenced in
   one venue and not in another is an ordinary state, and reporting it at project level would make
   the instrument noisy in exactly the situation it exists for.
3. **A selection is small and it merges.** 150's granularity finding applies directly: a venue
   stored as a list of ids and an order is a file two authors can both edit; a venue stored as a
   copy of the notes is another opaque blob to conflict on.

**What a reference to a set-aside note should do is open**, and it is the one question here with
no candidate answer. Dropping the sentence silently edits the author's prose; leaving it to
dangle publishes a reference to nothing; reporting it at render time is honest and may be noise
if setting notes aside is routine. Nothing is known about which, because nobody has assembled two
venues from one project.

### Caption conventions are a setting on the rendering

Settled after the evidence and the request disagreed. The practitioner asked for equations to be
numbered; the MMWR article read in full for this document carries one equation and does **not**
number it, and names its artifacts *"Table 1, Table 2 and the Figure"* — not "Figure 1", because
with one figure the genre drops the number. So numbering is conditional on count and on genre.
The practitioner's resolution: *"we can have settings for captions."*

**The setting belongs on the rendering**, which follows from the first section: the number is
computed at render time, so the convention producing it lives on the same object. One project then
renders for MMWR and for a journal that sets display math and gets different numbering from the
same notes.

**Presets, not knobs, and `CITATION_STYLES` is the pattern.** [144](144-provenance-as-structured-data.md)
encoded three styles from three named manuals, each carrying the `authority` it was read from,
rather than offering a punctuation editor. A practitioner picks a convention; they do not tick
eight boxes. What varies, from the evidence rather than from imagination:

| | MMWR, as observed | elsewhere |
| --- | --- | --- |
| equations | **not numbered**, inline in a footnote | numbered where cross-referenced |
| a sole figure | *"the Figure"* | "Figure 1" |
| maps and charts | one counter, Figure | sometimes separate |
| label case | `TABLE 1` | `Table 1` |
| appendix | its own counter | |

**And the first preset carries 144's honesty constraint.** A style encoded from a manual nobody
read is the professional-looking-and-wrong failure. What exists for MMWR is **one article read in
full**, which this document already says is *"one article's practice, verified, and not a measured
frequency across the journal"* — so the preset ships labelled as observed from one article rather
than read off a style guide, the way `conventionalLabelSource` separates deduced from verified. The
`authority` field is the slot for that sentence.

**The default decides more than the settings do.** If the default numbers everything, then the
MMWR behaviour becomes the thing a field epidemiologist switches off, which makes the common case
for this audience the configured one. Unresolved, and the practitioner's to choose.

### Built 2026-10-30 — the three artifacts state their own shape

The practitioner, continuing: *"We need to add the tables next, then maps, then charts as machined
notes."* Built in that order, in `src/artifact-notes.ts`.

**The gap it closes is this document's own measurement.** 147 found a Results section is *"mostly
artifacts, plus connecting prose"*, and 149 found the surface carrying none of it. Until today not
one artifact in this application could put a single word into a write-up: the figure was drawn,
the receipt recorded what it drew, and the Notes tab had nothing from it.

Nine notes on South London, one per output node, all in Results:

| | what it says |
| --- | --- |
| **table** | the columns **as the table spells them**, the row count, empty cells as unknown rather than zero, and the source file and digest where it came in as one |
| **map** | the layers bottom to top with their feature counts, and any layer connected and **not** drawn |
| **chart** | the caption the chart already stated, plus the bar count, the category column, and a bar at zero that may be a withheld value |

**None of them carries a number**, which is the amendment above applied at the first place it
could have been broken.

**What reading them found, again.** The first version of the table note wrote
`${valueField} by ${keys}` as prose, which reads only when the columns happen to be nouns. On this
application's own output it produced *"per 1,000 people by group"* and *"count by group and
measure"* — because `rateTable` sets `valueField` to a unit phrase and keys a long table by the
literal word `measure`. **A generator cannot know whether a column name is a noun.** It now states
them in code spans, which says they are the table's own spelling, and leaves prose to the author —
who forks the note the moment they touch it. Three readings, three rounds of this on one day.

**And the map note is the one that reads best**, which was not expected: *"4 layers, bottom to
top: South London, the study extent; Registration sub-districts (32 features); Thames reaches (2
features); Where the water came from, and the tidal limit."* It reads well because every string in
it was named by a practitioner and the machine only ordered them. The table note reads worst
because `group` and `measure` are names this application gave itself.

**A test for the numbering rule cannot work by pattern**, which is worth recording because the
first one did not. Matching the whole note for `Figure \d` failed on `Snow's Map 2, 1855` — the
name of the plate, not a number. That is the argument for the rule rather than a flaw in the test:
"Map 2" is a legitimate thing for such a note to contain, so a number cannot be found or avoided by
inspection, and only a generator that never writes one is safe. The test strips the author's own
strings and checks what the module wrote.

#### Corrected the same day: these are not captions

The first version of this work called its output a caption and filed it under `fn: 'caption'`, an
eighth function word invented for the purpose. The practitioner:

> Captions are the user's responsibility, unless there is a way to machine it based on table, map,
> chart or equation semantics.

**Which is right, and the correction is to the name rather than to the content.** Every sentence
machined here is read off a declaration — `DataTable.keys`, `MapLayer.index`, `ChartSummary.unit`
— so it satisfies the exception the rule names. What it is not is a caption. A caption states the
subject, the population, the place and the period in the author's own words — *"Deaths and
survivals among persons supplied by the Southwark and Vauxhall Company and the Lambeth Company,
South London, 1854"* — and none of that is derivable from a `DataTable`. Machining the shape and
calling it the caption claimed the authorial act while delivering something else.

It is 149's rule arriving one level down — *"that is not the application's job, it's the user's
and the user alone"* — and it was easier to miss here because what is machined is genuinely
useful. The test for it is now mechanical: no note may contain the word, asserted in the unit
suite and in the browser.

**What a real caption would need is already written down**, in 147's chain for the machined title:
design, place, outcome, period. Place is declared today on `study_area`. Period is declared per
rate as two free strings whose agreement is checked with `===`, which 147 records as broken.
Design is declared nowhere. **So a caption is partly machinable and mostly not yet, and the
missing parts are the ones already blocking the machined title** rather than anything peculiar to
figures — which means this is not a separate piece of work to schedule.

**And the vocabulary question dissolved rather than being settled.** With the output no longer
claiming to be a caption, there is nothing to file under an eighth function: these notes carry no
`fn` at all, which is what `relate_table`'s machined note already did, so the two producers now
agree. `KNOWN_NOTE_FUNCTIONS` is untouched, and the seven the practitioner reconciled on
2026-10-29 stay seven. Whether a machined self-description deserves a function word of its own is
a question for whenever one is needed, not a hole to fill now.

**Validation.** `tests/artifact-notes.test.mjs`, 14 unit checks; three more in
`tests/equation-notes.browser.mjs` on Chromium and WebKit over the published bundle. 16 passed
there across both engines; 72 across the notes and output suites; 1,138 unit. Mutation-checked:
numbering a note fails the rule test, and dropping the undrawn-layer sentence fails the map test. Released as `table_output` 0.6.0, `map_output` 0.17.0, `chart_output` 0.8.0.

**What it does not do.** No caption is written, which is the point above. Nothing places these
notes anywhere — placement, ordering and numbering
are all still the unbuilt part, and a caption with no document to sit in is a caption in a list.
And no note is reachable by a reference, because nothing
references anything yet.

#### Corrected the same day: the write-up is the project's, not the open workflow's

The practitioner, after looking for the artifacts on the Notes tab and not finding them, twice:

> I still do not see the tables, maps, charts in the notes for the South London example.

And then, on being told the write-up held one workflow's artifacts at a time:

> This is not the model we are building. It's supposed to hold notes from all workflows in that
> project.

**Which was a defect, not a design question, and the whole of this amendment had already settled
the model it violated.** IMRaD is the publication outline; a publication is a project. The
implementation had the run scope: `result` in `app.ts` is one variable holding the open workflow's
last run, set to `null` on every workflow switch, and `renderNotesView` read `result.machined`
directly. Measured on South London before the fix:

| | Notes tab |
| --- | --- |
| open the example from the catalog | **13 notes, 0 machined** |
| run *Deaths per 1,000 people* | 3 machined |
| then run *The ground* | **1 machined** — the previous three gone |

So a six-workflow investigation could show one workflow's artifacts at a time, and a freshly
opened project showed none at all, which is what the practitioner was looking at.

**How it was missed, which is the part worth keeping.** Every test written for the machined notes
and the descriptions ran ONE workflow and then looked at the Notes tab. All sixteen passed and all
sixteen were blind to this, because the sequence that exposes it — run one workflow, run a second,
look — is the sequence a practitioner performs and no test performed. This is the third time in
two days that a surface passed its tests and failed the first thing a person did with it; 141
already records the drag gesture and the dialog. **The pattern is now explicit enough to name: a
test that exercises one of a thing cannot see a defect in how several of them combine.**

**And the author's own diagnosis was wrong twice before it was right.** Told the notes were not
visible, this project first explained it as a stale service-worker cache — and produced real
evidence for that explanation, including the cache-first rule in `sw.js` and a build hash to
compare. The explanation was plausible, the evidence was true, and it was not the cause. What
found the cause was running the practitioner's actual sequence instead of re-proving the one that
already worked.

**What was built.** `src/write-up.ts`: what each workflow's last run contributed, by workflow key,
persisted and read across every workflow the project lists.

- **Notes only, never a run's outputs.** Keeping six workflows' tables, geometry and rasters would
  put megabytes in `localStorage` to show a paragraph. Notes are text.
- **Kept rather than recomputed.** Re-running six workflows to read a write-up would make opening
  a project expensive and make the write-up depend on a reasoner; a practitioner organising a
  publication is reading, not computing. The cost is that a stored note can go stale, so every
  entry carries `runAt` and a note from another workflow says when its run happened — the same
  call `forkHasDrifted` makes for an edited note.
- **A node id is unique within a workflow and not within a project.** South London has
  `table-viii` in three of its six, so the panel could no longer key machined notes by node id:
  it silently dropped two of every three, and two cards sharing a `data-note` attribute would
  make opening one act on the other. `MachinedNote` and `DerivedNote` gained `workflowKey`, which
  is honest modelling rather than a workaround — a machined note does belong to a workflow — and
  `noteKey` is scoped by it.
- **A step's label is resolved in the workflow that produced the note**, not in the open one, for
  the same reason. The labels travel with the entry.
- **A workflow the project no longer lists stops contributing.** Nothing else would remove it, and
  a deleted workflow going on writing into a publication is what nobody notices until a reader
  asks what a paragraph is doing there.
- **The project's workflow order, not the order things ran.** Ordering by `runAt` would re-sort
  the write-up every time somebody re-ran a step.

**Validation.** `tests/write-up.test.mjs`, 8 unit checks. `tests/write-up-is-the-projects.browser.mjs`,
4 checks driving the sequence that exposed it: a second workflow ADDS rather than replaces; a note
from elsewhere says which workflow and when; the write-up survives a reload; and notes from three
workflows that share a node id neither collide nor drop. Mutation-checked by restoring the
run-scoped read — all four fail. Nothing is injected through `localStorage`: the write-up is built
by running workflows in the interface, because the two silent setup traps recorded in
`tests/version-supersession.browser.mjs` are exactly how a test like this comes to assert against
the published template.

**What it does not do.** The write-up now holds the project's notes and still places none of them:
ordering within a section, numbering and references are all unbuilt, which is what the rest of
this amendment is about. And a stored note whose workflow has since been edited is reported by its
run date rather than by a comparison — there is no `forkHasDrifted` for a machined note against a
canvas that moved under it.

#### And a second time: a kept write-up outlives the build that wrote it

The practitioner, having run every workflow: *"After I ran every workflow the notes and equations
appeared but still no maps, charts and tables."*

**What settled it was a screenshot, not a test.** The card it showed carried
*"Deaths per 1,000 people, mapped · ran 2026-10-30"* — a source attribution added in the same hour
— which proved the build was current and the write-up WAS accumulating across workflows. Both of
this author's diagnoses to that point were dead: a stale service worker, then a stale server. Each
had produced real evidence for a false cause, including the cache-first rule in `sw.js` and a build
hash to compare.

**The actual cause was introduced by the fix above.** A write-up is kept rather than recomputed,
so the store outlives the build that filled it. Equations were wired into the widgets early in
0.13.0 and the artifact descriptions were added later the same day. A store filled in between held
equations and no descriptions — and because entries are read rather than regenerated, updating the
application changed nothing. Running every workflow would have refreshed them; running every
workflow *before* the descriptions existed did not, and nothing distinguished the two states.

**So an entry now records the build that machined it**, read from `build/asset-manifest.json` —
which `build.mjs` writes with the same content hash the worker names its cache after, and which is
deliberately not precached, so it reports what is on disk rather than what is being served. An
entry from another build is dropped on read, the Notes tab reports that workflow as not yet run,
which is true of this build, and the button below fixes it. Nothing is dropped when the build
cannot be read: a write-up that cannot be checked is kept rather than thrown away.

**The general shape, which is this corpus's own rule arriving somewhere new.** Machined prose is
only as current as the code that wrote it, exactly as a machined note is only as current as the
run that wrote it. `forkHasDrifted` already makes that argument for an edited note against its
run; this is the same argument one level up, for a stored note against its generator. **Anything
this application keeps that it also generates needs to record what generated it.**

#### Run the rest: a button, and why not on open

Measured on South London on 2026-10-30, because the choice turned on a number:

| | |
| --- | --- |
| all six workflows | **1.9 s** — 0.1, 0.5, 0.1, 0.5, 0.1, 0.1 |
| the write-up they assemble | 39 notes — 15 machined, 11 derived, 4 authored, 9 quoted |

Two seconds made running them automatically tempting. The practitioner chose the button, and the
reasons are the ones that generalise past this example: **a project with an isochrone or a raster
download is not 1.9 seconds**, and each run switches the open canvas, which is the run-in-flight
hazard [142](142-an-epi-kernel-exercised.md) spent a day finding on a deployed instance. So the
practitioner asks, the runs are sequential rather than racing, and the canvas is returned to the
workflow they were reading — leaving them on whichever ran last would be the surface rearranging
their work to do its own.

`loadExample` now returns the run it starts. It always started one; it simply never handed it
back, so nothing could sequence several.

#### What three wrong diagnoses in a row say about the method

Worth recording because the pattern is the finding, not the defects.

| | the diagnosis | why it was believed | what it was |
| --- | --- | --- | --- |
| 1 | a stale service worker | `sw.js` really is cache-first over unhashed entry points | wrong |
| 2 | a stale server | two servers were running, two days old | wrong; both served current bytes |
| 3 | the write-up is run-scoped | true, and really was a defect | right, and **not the whole cause** |
| 4 | the store outlives its build | — | right |

**Every wrong answer came with true evidence.** That is the part to carry: a mechanism that could
explain a symptom is not evidence that it did, and this project's habit of measuring rather than
asserting protected it from inventing facts while doing nothing to stop it from attributing real
ones to the wrong cause.

**What actually located each one was the practitioner's own sequence.** Three rounds of tests
passed while the surface was broken, because every test ran one workflow and looked; the defect
lived in running several, in opening a project, and in updating the application. The author could
not see any of it from inside a test that set up its own world. [149](149-the-notes-spike.md)
already named this once — *"found by putting the thing on screen and looking at it, which is the
argument for spikes"* — and it has now cost four rounds in one day.

### What this amendment does not establish

- **That any of it works**, which is the ordinary state of a design recorded before it is built.
  Nothing here has been tried against a write-up, and the placement rule in particular is argued
  from how journals behave rather than from anything measured here.
- **That an equation can be referenced at all under this scheme.** A table, map and chart are node
  outputs with ids. An equation lives **inside a note's text** as `$$...$$`, so its identity is a
  position within prose that somebody is editing. `equationsIn` reads them back in order, which is
  the hook, but it is a different addressing problem and nothing solves it yet.
- **That first mention is the order a write-up wants.** It is the order journals use, and the
  cheapest way to find out whether it suits this material is the check-references pass over South
  London, which has not been run.
- **That the settings are worth building before a renderer exists.** They are inert until something
  renders a document, and nothing does.
- **That a write-up assembled from six workflows reads as one account.** It now holds them, which
  is a different claim. Nine artifact notes and thirteen authored and quoted ones sit in four
  sections in the project's workflow order, and nobody has read the result to see whether it is a
  write-up or a list.
- **That one project ever has two venues.** The whole venue section is argued from a practitioner
  saying they would set notes aside, and from the cost of the copying alternative. No project here
  has produced two write-ups, so the selection model answers a need that is stated rather than
  observed.
- **That setting a note aside is the only selection a venue needs.** A venue may also want a
  shorter version of the same note, which is an edit and not a selection — and an edited machined
  note already forks. Whether a venue-specific wording is a fork, a variant, or a thing to refuse
  is unexamined, and refusing it is the option that keeps the single source.

### What would close it

1. **Check references, over South London.** It needs nothing that is not built, and it produces
   the evidence for items 2 and 3.
2. The hand-written cross-reference pass over the same example, done **with** that instrument
   rather than by eye: how many figures, whether they want numbers at that count, and whether
   first-mention order is the order the write-up wants.
3. A decision on the equation addressing problem, which is the one thing above with no candidate.
4. **Two venues from South London** — the full account and something MMWR-shaped — which is the
   cheapest way to find out whether a venue is a selection, what a reference to a set-aside note
   should do, and whether the numbering really does come out right per venue.
5. **The declarations 147's chain needs** — a study design, and a study period that is one
   declared thing rather than two free strings compared with `===`. They are what would make a
   caption and a title partly machinable, and they are one piece of work, not two.

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
