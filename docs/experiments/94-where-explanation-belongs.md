# 94 · Where explanation belongs

_Created 2026-10-11 · Updated 2026-10-20_

**Status:** asked — a finding that retires a claim three earlier experiments were
carrying, and replaces it with a better question. The replacement answer — that
explanation belongs in the Dive Deeper notebooks — is **not** built and not
validated, which is why this is `asked` and not `validated`.

## The claim being retired

[78](78-trying-compositions-on-isochrone.md), [89](89-the-first-composition.md)
and [92](92-micro-workflow-on-the-canvas.md) all carried a version of this:
*a composition of visible steps is easier for a public health practitioner to
understand than one node with nine knobs.* It was named "the claim that
matters" and "the whole point of compositions".

**It is not established, and it is probably not even the right question.**

Four nodes are not self-evidently clearer than one. They are four labels, four
parameter sets and three connections, all of which a reader has to hold at once.
Decomposition moves cognitive load around; it does not remove it. A reader who
did not understand `isochrone`'s nine knobs is not obviously helped by being
shown that the fourth of them belongs to the third of four steps.

Nor does it make the workflow more efficient. The monolith is one node to place,
connect and configure; the composition expands to four at run time and to four
on the canvas if exploded.

## What the experiment was actually worth

This is the value of having built it rather than argued about it. Compositions
earned their place on evidence that has nothing to do with comprehension:

| Demonstrated | Where |
| --- | --- |
| The same answer, to 3.8 parts per million | [84](84-reachable-corridor.md) |
| Reuse as one step, with ports and parameters derived from the graph and checked against it | [89](89-the-first-composition.md) |
| Governance by closure: members pinned by version and digest, nothing outside the registry | [89](89-the-first-composition.md) |
| Drift detection that fires on real work — a member published a release and a pinned composition said so | [90](90-coupling-widgets-to-the-ontology.md) |
| One receipt per member, with an association recording what arranged them | [92](92-micro-workflow-on-the-canvas.md) |
| Knobs that moved to the steps that act on them, and two that turned out to be two questions wearing one name | [89](89-the-first-composition.md) |

None of that needed the comprehension claim, and all of it survives without it.
The honest summary is that compositions are a **reuse and governance
mechanism**, and were mistaken for a teaching one.

## What survives: composing is the skill, not reading

Retiring the comprehension claim does not retire micro-workflows as a learning
idea. It relocates it.

The claim that failed was about **reading** a composition: that four visible
steps explain themselves better than one node. The claim still standing is about
**building** one. Breaking a problem into parts that can be named, reused and
connected is the skill, and it is exercised by the person doing the breaking,
not by the person looking at the result. [75](75-compositions-as-nodes.md)
said this from the start — "breaking a problem into parts becomes something you
do on the canvas" — and then listed the teaching claim among what it does not
establish, which was right.

That has a consequence for where it is taught. A practitioner does not discover
how to decompose a problem by being shown a decomposition; they learn it by
being asked to make one, with something to make it out of. That is manual
material — worked instruction with an exercise — and
[docs/usage.md](../usage.md) is a reference for what the application does, not
a manual that teaches a method. There is no user manual, and this is the second
thing that has now been found to belong in one.

It also has a measure, which [93](93-gamification-spike.md) records: a
composition placed on a canvas is **one** widget, not four. A practitioner who
builds a micro-workflow and reuses it reaches the same output with fewer steps,
which is the skill showing up in a number without anyone having to assert that
it is a skill.

## Exploding is for inspection, not explanation

Exploding stays. Its use is seeing which step refused, what a member was given,
and what a parameter did — debugging and inspection, where the question is
"what happened in this run". That is a different job from "what does this widget
actually do", and conflating them is what produced the retired claim.

## Where deeper understanding belongs: the notebooks

Not the canvas. The Validation Lab is already the place where a widget's
computation is written out in full, independently, with its own data and its own
arithmetic — and the lab's notebooks are narrative documents, which a canvas
node can never be.

That gives the lab a **second purpose**, beside parity:

| Purpose | Reader | What the notebook does |
| --- | --- | --- |
| **Parity** (existing, [41](41-validation-lab.md)) | a reviewer | Recomputes independently and reports agreement against a stated tolerance |
| **Dive Deeper** (new) | a practitioner wanting to understand | Shows what the widget does, on real data, with the assumption visible and variable |

The two are close enough to live in one notebook and are not the same thing.
Check 07 already does both by accident: it establishes parity with NetworkX, and
then its last cell varies the walking speed and shows the reached set going from
69 junctions to 246. The first half is for a reviewer; **the second half is the
Dive Deeper material**, and it teaches more about what reachability *is* than
any arrangement of canvas nodes could.

Check 08 does the same with the corridor half-width: 0.51× the area at 10 m,
1.53× at 60 m, against a figure the case study records no reason for.

So the pattern already exists and was not noticed as a pattern. A Dive Deeper
section is: **vary the assumption the widget inherits, and show what it does to
the answer.**

## What a Dive Deeper section owes, revised 2026-10-20

This record defined the section as **vary the assumption the widget inherits, and show what it does
to the answer**. That is one ingredient and not the whole thing. The practitioner, on the notebooks
being teaching material rather than evidence:

> *"the deeper dive notebooks are pedagogical so they come with their own requirements — learning
> objectives, what are the underlying geospatial processes that are under the hood that helps the
> learner understand what the widget does, notebook example runs of those processes, etc.
> references, links to other notebooks."*

So a section carries:

- **Stated learning objectives.** What a reader will be able to do or judge afterwards, written
  before the cells rather than inferred from them. A section whose objectives cannot be stated is
  a demonstration, not a lesson.
- **The process under the hood, named.** The widget hides a geospatial operation — a Dijkstra over
  edge lengths, a planar partition, a projection to metres, a point-in-polygon test. The section
  names it in the terms the discipline uses, so a reader can recognise it elsewhere and look it up
  without this project's vocabulary.
- **That process run on its own**, in cells, on real data, before or beside the widget's version.
  Reading that an isochrone walks outward until a budget runs out teaches less than watching the
  frontier advance. This is the half the existing checks already do by accident: 07 varies walking
  speed and the reached set goes from 69 junctions to 246; 08 varies the corridor half-width and
  the area goes 0.51× at 10 m to 1.53× at 60 m.
- **The assumption varied**, which is what this record originally asked for and is now one step of
  several rather than the whole of it.
- **References** a reader can follow outward: the method's own literature, the data's source, the
  standard where one exists. A notebook that cites only this repository teaches the tool and not
  the subject.
- **Links to the other notebooks** whose material it depends on or extends. Deferred until there
  are enough sections for the links to mean anything, and recorded here so the ordering is a
  decision rather than an omission.

The parity half is unchanged and still answers to a reviewer. The two live in one notebook because
they share the setup, not because they are the same work, and a section written only to satisfy
`validate:dive-deeper` satisfies a count.

## What this changes

**The 26 widgets without a lab check** ([docs/todo.md](../todo.md), item 2) were
a validation debt. They are now also the deep-explanation materials, which
changes what each notebook has to contain — a parity check plus a section that
varies the governing assumption — and raises what the work is worth.

**It does not change the gamification spike's direction**, but it removes a
premise from it: [93](93-gamification-spike.md) argued that counting nodes is a
bad measure partly because fewer steps are better. The real reason is stronger —
node count has no reliable direction at all, so no counter built on it can mean
anything.

## What would close it

Ten notebooks carry a Dive Deeper section ([98](98-the-coverage-ratchet.md)), which is the
mechanism, and the ratchet keeps the count from falling. Whether an explanation *lands* is not
measurable here.

What is: whether the notebook is the right surface for it. That is answerable against this
project's own record rather than against a reader — the question is whether the explanation a
widget needs is reachable from where the widget is used, and today it is one navigation away in
a different tool that needs a connection. A decision to move explanation into the Inspector, to
keep it in the Lab, or to carry it in both closes this; the three can be argued from what the
corpus already shows about where practitioners are when the question arises.

_Restated 2026-10-15. This section had required one practitioner who did not write it to report
what they learned, which needs field testing, a phase this project has not reached. Kept as a
[field question](../field-questions.md#does-a-dive-deeper-section-land)._

## The two separate, 2026-10-20

The section above says *"the two live in one notebook because they share the setup"*. That is now
reversed. The practitioner:

> *"I created a dive-deeper repo on GitHub so the dive deeper notebooks do not mix with the
> validation lab's."*

The reason this record gave for cohabitation was shared setup, and it has to be answered rather
than dropped. It is true and it is cheap: the shared part is reading a fixture, verifying its
digest and projecting to metres — tens of lines, already duplicated across the lab's own twenty-six
notebooks, and nothing a learner is reading the notebook to see.

What is not shared is the reader and the acceptance test:

| | Parity notebook | Dive Deeper notebook |
| --- | --- | --- |
| Reader | a reviewer checking a number | a practitioner learning a method |
| Passes when | an independent implementation agrees within a stated tolerance | a reader can name the operation, run it, and say what the assumption costs |
| Fails usefully by | disagreeing, published with both values | explaining the tool and not the subject |
| Lives in | `digital-twin-ph/validation-lab` | `digital-twin-ph/dive-deeper` |

Those are different failure modes, and a single document is graded on whichever one the author had
in mind that day. The amendment above made this concrete without naming it: once a section owes
stated learning objectives, the operation named in the discipline's terms, that operation run on
its own, the assumption varied and outward references, it is longer than the check it was appended
to. Seventeen notebooks carry a section of three to five trailing cells. The requirements do not
fit in three to five trailing cells.

**What the split costs.** A second repository to pin and keep pinned, a second Pages site to
build, the fixture-reading preamble written twice, and seventeen sections that are now in the
wrong repository. The last is debt, not a migration: they stay where they are, `widgets/dive-deeper.json`
counts them, and the count may fall and never rise — the same ratchet
[98](98-the-coverage-ratchet.md) uses, because a section rewritten against the requirements above
is new work and not a file move.

**What the split buys that cohabitation could not.** A notebook that is wrong for a learner can be
rewritten without touching evidence a release depends on. Parity results are pinned by commit and
digest into `widgets/parity.json`; until today, improving an explanation moved that pin.

## What this does not establish

- **That separating the repositories helps a reader.** It separates two acceptance tests, which
  is an authoring benefit and measurable here. Whether a learner is better served by a notebook
  that holds only a lesson is a field question and not answered by the split.
- **That the pedagogical requirements above have been tried.** They were stated on 2026-10-20 and
  no section has yet been written against them; the twenty that exist predate them and meet the
  original, narrower definition. Whether a notebook can carry a lesson and a parity check without
  serving neither well is exactly what writing one will show.
- That the notebooks teach either. They are long, they require a kernel, and
nobody has watched a practitioner read one. The claim moved from the canvas to
the lab, and it is no better evidenced there; what has improved is that it is
now in a medium that can carry an explanation, which the canvas could not.

The comparison [92](92-micro-workflow-on-the-canvas.md) made possible — opening
the monolith and the composition side by side — is still worth running with a
practitioner. The question has just changed, from "which is clearer" to "what
does each make askable".

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-11 | Retire the claim that more nodes explain themselves |
| 2026-10-11 | Cite the gamification experiment I missed, and measure parsimony instead |
| 2026-10-11 | Give the experiment document a form, and a ratchet to hold it |
| 2026-10-12 | Make the total a signed number, and make an open experiment say what closes it |
| 2026-10-20 | State what a Dive Deeper section owes as pedagogy |
| 2026-10-20 | Separate the Dive Deeper notebooks into their own repository, against this record |
