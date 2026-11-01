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
ecological only. Deaths and houses came from different places in Snow, so sources are per cell.

The practitioner, reading the first version the same day: *"I am not sure we will be able to provide
counts for ABCD when study has not begun yet, but what might help here is for every cell, where the
data would come from, what cells count, etc."* So the table became the form. Every cell and row total
says what it counts and where it comes from, or that it was worked out from other cells. One
"the cells count" field could not hold a table whose `a` counts deaths and whose `a+b` counts houses.

Found while wiring it to the pinned workflows on 2026-11-01:

- South London's cohort governs a `rate_ratio`, not a `two_by_two`, so the first checklist item
  would have said no comparison existed. It now counts one, and says the rate ratio does not obey
  the design.
- South London's ecological `two_by_two` counts people (844 of 167,654), under a licence saying
  the rows count groups. Settled the same day: exposure is known for groups while the cells count
  people, so the table page says so, and the licence does too. On a condition from the
  practitioner: *"as long as it does not become hand crafted for South London."* The fields are
  free text for any design, and no South London value is in the source.
- The check of declared groups against computed ones now reads a `rate_ratio` as well.

## Walked on South London, 2026-11-01

Both real workflows, `Deaths per house, by water company` and `Died or survived, by water supply`,
loaded from the pinned project, answered in full on Chromium, and ran. The answers are the author's
reading of Snow. What it found, all fixed the same day:

| Found | Change |
| --- | --- |
| Every "not sure" sentence had a double negative | Reworded |
| The source question repeated the table page and could not hold two sources | With a table, it asks only whether any of it is surveillance |
| `‹group›` was retyped on two pages | Filled from "exposure is known for", and editable |
| The advice to name a row as its group made the group check report open | A new status, `differs`, leaves it for a person to judge |
| "Sub-districts ... was excluded; it was" | The sentence no longer needs a verb that agrees |
| C4 spoke of initiation, and could not be answered for a water supply | Reworded for exposures in general; the report's table changed with it |

A second walk, after allocation and time were added, answered every question on both workflows on
Chromium. The run did not stop, no blank was left, and the whole note reached Notes, with Snow's
allocation argument and the natural experiment in its broad sense on the house comparison. That shows
the words arrive. It does not show an epidemiologist would write them, and the note runs long: the
ecological one is 14 sentences.

## Allocation and time, added 2026-11-01

A1 and T1 are asked of every design. A2 and a new A3 follow only when exposure was decided outside
the investigators. A3 asks whether to print "natural experiment", with its definition named, which
is decision 4's recommendation. A2 is the first choose-all question, so an answer may hold several
options. Investigator allocation says it is outside the five designs but does not yet withdraw the
declaration, which decision 3 calls a stop: the checklist does not say so either.

## Left out

Decision 1's cohort or case series
choice is not asked either, because selecting a design comes first. Caveats name their sources in
plain text and carry no links.

## What this does not establish

- That any question is worded well: the options are constructed and untested, as the review says.
- That the checklist's implemented items are the right ones. They are a first draft by the author,
  and no source read gives such a list.
- That a practitioner learns anything from it. No controlled evidence supports this.
- That FW can tell whether a study was carried out as declared.
