# 141 — Notes, the story, and the report: one record

_Created 2026-10-26 · Updated 2026-10-26_

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
| References, and its four subsections (~75 lines) | — | source | — |

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
