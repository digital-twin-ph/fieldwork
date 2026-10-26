# 141 — Organising Snow's notes, as if Fieldwork had written the publication

_Created 2026-10-26 · Updated 2026-10-26_

**Status:** tried — the design is proposed and was tested against a publication that already
exists, before anything was built. Nothing in `src/` carries a note today.

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

## What this does not establish

That notes make a workflow legible. Nothing was built and nobody read a workflow through one.
This maps an existing narrative onto a proposed structure; it does not show that a practitioner
writing *into* that structure produces a readable account, and the mapping was done by the same
party that proposed the structure.

It does not establish that the Jupyter analogy transfers. A notebook's reading order is its
execution order; a canvas is a graph with no inherent order. `src/reveal-playback.ts` computes
one for progressive reveal (experiment 112) and is the obvious spine to test, but no story has
been told along it.

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
