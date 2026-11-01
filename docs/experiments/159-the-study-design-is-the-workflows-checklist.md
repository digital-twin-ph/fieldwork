# 159 · The study design is the workflow's checklist

_Created 2026-11-01 · Updated 2026-11-01_

**Status:** tried — stage 2 and a first checklist are built. Whether either helps a practitioner is
not observed.

## The task

The practitioner, 2026-11-01:

> Create stage 2 then as part of study design experiment solution. And it may be that the study
> design widget is where the feedback loop happens, for each workflow that gets develop it should
> map to making the study design real and implemented. The question is how to make the study design
> the workflow checklist that addresses the study design implementation.

And on the name: *"Let's not call it protocol then, study design it is."* On surveillance:
*"surveillance will be in stage 2 as a source"*.

## The design

**Stage 1 selects, stage 2 refines.** Selecting a design shows that design's questions. They are
the refinement tables of [the review](../research/study-design-decision-tree-2026-11-01.md), carried
as data with their options, caveats and sentences. Every question offers "not sure / not stated",
and that answer blocks nothing: the note says what is unknown.

**Surveillance leaves stage 1.** It says where data came from, and a study of any design can use
such data, so it never competed with the designs. This is the fault natural experiment had. It
returns as an option of a new source question in stage 2, and choosing it brings the surveillance
questions. The vocabulary is five designs. A workflow that only describes surveillance counts
declares no design, so its source is not recorded here.

**The checklist has two kinds of item, and they differ in what they can claim.**

| Kind | Question | Who settles it |
| --- | --- | --- |
| Declared | Has the practitioner answered this stage 2 question? | The practitioner: FW records the answer and cannot check it |
| Implemented | Does the workflow contain what this design needs? | The graph: FW reads it from the nodes and edges |

The second kind is the feedback loop. Each change to the canvas changes what the checklist reports,
so a workflow can be read against its own design while it is being built.

**The checklist reports and does not grade.** No item blocks a run, and there is no score. An
unanswered item reads "open", and "not sure" reads "stated as unknown", which is a different fact.
Passing every item does not make a study valid: it says the workflow carries what the design asks
for, not that the data are right.

## Distinctions

| Distinction | Enforced as |
| --- | --- |
| Surveillance is a data source and not a study design | Hard stop: not in the vocabulary; a saved node loses the value by migration |
| An answer is the practitioner's claim and not an observation | Limitation: stated in the dialog |
| An implemented item is read from the graph and says nothing of the data | Limitation: stated on the checklist |
| Not sure is not the same as unanswered | Run-time check: separate statuses |
| A question not applying is not the same as deleted | Run-time check: answers stay stored when the design changes |

## Admission review

No new widget. `study_design` gains one optional parameter, `answers`, and one receipt property, `fw:refinementAnswer`. A new `SRC` question is constructed for this experiment. The sentences reach Methods as a machined note.
A workflow saved without `answers` reads as nothing answered.

## Practitioner observation, written before any result exists

Given a case-control workflow and its checklist, can a practitioner say which items FW checked and
which it only recorded? This can come out badly: a list of ticks may read as validation, whatever it
says. A second question: does anyone work through stage 2, or close it?

## The table comes first

The practitioner, 2026-11-01: *"I think a better way to do the study design is to start mapping to
ABCD as early as study design."* And: *"One at a time, South London first."* A design is a statement
about which totals the study fixed, so the 2×2 now follows the design selection, for cohort and
ecological only. Each of `a`, `c`, `a+b` and `c+d` has its own source, which is what Snow needs:
deaths and houses came from different places.

Found while wiring it to the pinned workflows on 2026-11-01:

- South London's cohort governs a `rate_ratio`, not a `two_by_two`, so the first checklist item
  would have said no comparison existed. It now counts one, and says the rate ratio does not obey
  the design.
- South London's ecological `two_by_two` counts people (844 of 167,654), under a licence saying
  the rows count groups. Settled the same day: exposure is known for groups while the cells count
  people, so the table page asks both, and the licence now says so. On a condition from the
  practitioner: *"as long as it does not become hand crafted for South London."* The fields are
  free text for any design, and no South London value is in the source.
- The check of declared groups against computed ones now reads a `rate_ratio` as well.

## Left out

A1, A2 and T1 are not asked, as their tables have another shape. Decision 1's cohort or case series
choice is not asked either, because selecting a design comes first. Caveats name their sources in
plain text and carry no links.

## What this does not establish

- That any question is worded well: the options are constructed and untested, as the review says.
- That the checklist's implemented items are the right ones. They are a first draft by the author,
  and no source read gives such a list.
- That a practitioner learns anything from it. No controlled evidence supports this.
- That FW can tell whether a study was carried out as declared.
