# 133 · The planning stage, and where a historical note belongs

_Created 2026-10-24 · Updated 2026-10-26_

**Superseded by [141](141-organising-snows-notes.md), which synthesizes this with 17 and 119. The spine, the danger and the computable omission are carried over there; this stays as the record of how they were reached, and it got there first.**

**Status:** asked — nothing built. Opened as a filing question (*where does a historical note
go?*) and sharpened the same day into the one worth answering.

**The task.** The practitioner, 2026-10-24: *"The elegant part comes in if we include story map
structure as the frame for both the historical notes and the workflow. How to combine them is a
genuine DE question. That's 133's task."*

So this is not *where does a note go*. It is: **a story map has a structure; can that structure
be the frame a workflow is planned in, rather than a presentation applied to one afterwards —
and what happens to the analysis if it is?** The filing question below stands as evidence that
the gap is real, not as the subject.

## What was asked

Reading Snow's chloride measurements — he titrated salt to trace how far the tide pushed sewage
up the Thames, 5.8 grains per gallon at Hungerford at half-flow against 19.1 an hour and a half
before high water — the practitioner, 2026-10-24:

> *"The tide part is interesting because Cholera vibrio survives inside copepods."*

And then, on where that belongs:

> *"We can add that to the Dive Deeper Notebooks but we do not have a dive deeper class for
> historical notes. Perhaps we can now incorporate it in the planning part of the workflow (that's
> pre-workflow and undeveloped) as we have planned earlier? That way we can capture Snow's
> narratives, and with the historical notes we can then create our story map."*

## The observation is the example, and it is a good one

Snow used salinity as a **tracer**: salt told him the tidal reach, and therefore how far the
sewage-laden water went. What is now understood is that the same variable marks a **reservoir** —
*V. cholerae* is autochthonous to estuarine water and persists attached to the chitinous surfaces
of copepods, which is a large part of how it survives between epidemics. He was measuring the
extent of the organism's habitat with a salt titration, without knowing there was an organism.

Two things the example should teach, and they are not the same thing:

- **Snow's argument does not need the mechanism.** The grand experiment works on the contrast
  between two suppliers and holds whatever the agent turned out to be. That is its strength: it is
  agnostic about cause.
- **The chloride test did double duty.** Residents often did not know their supplier, so he
  assayed the water in the house to assign exposure. The same measurement traced the tide and
  classified the exposure variable.

A note saying this is **modern knowledge, not Snow's claim** is exactly the kind of caveat this
project writes well — and there is nowhere to put it.

## The three places it is not

| Surface | What it is for | Why not this |
| --- | --- | --- |
| `provenance.json`, evidence references | where a dataset came from, and the limits of the data itself | the copepod ecology is not a property of Table IX, and filing it there would make a modern citation look like part of the source record |
| Dive Deeper notebooks | what a widget's METHOD is, in the discipline's terms, run on its own data | this is not about a widget. `widgets/dive-deeper.json` keys every lesson to a `nodeType`, so there is no key for it |
| Inspector prose | what one control does, concisely | scored per explanation against a 240-character limit since 2026-10-23, and correctly: a panel is not where a paragraph of history goes |

So the practitioner's reading is right. The absence is not an oversight in any of the three; none
of them is the place.

## The home already proposed, and never built

[Experiment 27](27-workflow-learning-and-gamification.md) proposes a **side notepad: plan,
prototype and reflect** — an optional panel beside the workbench, with prompts (*What am I trying
to find out? Which inputs and steps do I expect to need? What do I predict? What changed in this
iteration?*), a mutable draft with a visible save state, and dated iteration notes each carrying
an opaque ID. It states its own boundary: those notes *"remain separate from scientific source
citations and publication-ready text"*.

That is the planning stage, it is pre-workflow, and it has never been built. The glossary's
[Workflow stages](../glossary.md) are input, process and output — planning is not one of them,
which is correct: **planning is not a stage that produces a value.** It is what a practitioner
knows and intends, beside the graph rather than inside it.

## What this proposal adds to 27

27 framed the notepad as a LEARNING surface: a prediction to check against a result. The
practitioner's use is different and does not replace it —

- **narrative**: what this investigation is about, in the words it will be told in
- **historical and contextual notes**: what is known around the data that is not a property of the
  data, each marked for whose knowledge it is and when

Both are writing nobody computes on. The difference from provenance is the test: *is this a claim
about the dataset, or about the world the dataset came from?* Table IX's house counts being an
1853 return is the first. Copepods are the second.

## Why it is worth building beyond tidiness

[119](119-can-this-tell-a-story.md) reframed storytelling into a question with an answer: not *is
this story good*, but *are the conditions under which a good story can be made present, and can
the application say so*. It found the three measurable conditions — provenance, rigorous
processing, design rules — already present, measured, and **scattered**, with assurance missing.

[17](17-workflow-publication-products.md) wants a story map as an end product of the pipeline.

A story map needs more than layers in an order. It needs the sentences between them, and today
there is nowhere a practitioner can write a sentence that belongs to the investigation rather than
to a widget, a dataset or a control. **The planning stage is where those sentences would already
be, if it existed** — written before the work, not reconstructed after it, which is the difference
between a narrative and a caption.

## What it is called, and why not the obvious words

The practitioner, 2026-10-24: *"A story map is really not just one map. It could be several. So we
may want to disambiguate that in the ontology. Perhaps we can call it computational narrative or
something but that's what Jupyter notebooks are."* Then, having ruled out the word the glossary
was already using: *"We cannot use composition, that is for workflows."* And: *"Let's just call it
the fieldwork story for now."*

It is the **Fieldwork story**, provisionally, and `for now` is part of the decision.

Three words were considered and each failed for its own reason, which is worth keeping because
the next person will reach for all three:

- **story map** implies one map, where this is a played sequence that may hold several maps,
  charts and tables -- and it is a vendor's product name;
- **computational narrative** belongs to literate-computing notebooks, and describes the wrong
  thing anyway: a notebook interleaves CODE with prose, this interleaves evidence already produced
  with prose, and the computation is in the workflows;
- **composition** was the glossary's own word for it and is already the shipped word for something
  else -- a saved sub-workflow used as one step, in thirteen source files and in the Micro-workflow
  widget's visible description. The glossary's only definition of the term contradicted the code,
  so this is the second collision found in two days, after `workspace` meant a storage slot, a
  single workflow and the whole application at once.

`story map` survives as the name of a PRESENTATION -- one way a Fieldwork story can be shown --
which is what it should have meant all along.

## The task: one structure, two things in it

A story map's structure is a sequence of **sections**, each holding a view — layers, an extent, a
moment — and the sentences that say what it means. A workflow's structure is a graph of widgets
producing outputs. Today the first is applied to the second after the fact: run the analysis,
then arrange the results and write around them.

The proposal inverts that. The sections are written FIRST, in the planning stage, and each one
binds three things:

| In a section | Comes from | Exists today |
| --- | --- | --- |
| what this part claims | the practitioner, before the run | no |
| the context that motivates it | historical and narrative notes | no |
| the evidence that supports it | one or more workflow outputs | yes, unbound |

What makes it worth doing is the third column. Each of those outputs already carries provenance,
refusals and the design rules that applied — [119](119-can-this-tell-a-story.md) found those
three conditions *"present, measured, and scattered"*, with assurance missing. **Binding a claim
to the outputs that evidence it is what makes assurance expressible at all**: a reader asking
*"was this made under conditions I would accept?"* is asking it of a claim, and there is
currently no object in this application that IS a claim.

## Five things at once, a minor sixth, and a seventh that is new capability

The practitioner, on what the frame would settle: *"Then we will have hit three birds with one
stone -- story map which is communication stage, planning, and the integrating project/workflow
into that framework."* And then, counting again: *"Actually 4 because this is an imported worked
example project."*

| | Its state before this | What the frame gives it |
| --- | --- | --- |
| **Communication stage** | `docs/glossary.md` lists *"the communication layer and its products — reports, story maps, dashboards"* among the terms **not yet defined**, and [17](17-workflow-publication-products.md) wants them as end products | a structure to define it as, rather than a format to render into |
| **Planning** | proposed in [27](27-workflow-learning-and-gamification.md), never built, with no reason to build it beyond note-keeping | a product at the end of it, so planning is the first act of making the thing rather than a diary beside it |
| **Project and workflow** | [131](131-project-and-workflow-lifecycles.md) settled what they ARE -- a project is one investigation, its workflows are the questions asked inside it -- and consolidated twelve surfaces into two | a reason for the hierarchy to exist beyond filing: the investigation is the story's subject and its questions are the sections' evidence |
| **An example that lives in a repository** | [127](127-examples-as-repositories.md) built the mechanism and `example-1855-cholera-south-london` carries data, provenance and **no workflow bundle**, because `rate` cannot take a table | something worth carrying: an investigation with its questions, its sections and its notes, imported as one thing |

The third is the one that was not obvious. 131 spent a day deciding what a project is and where
it is managed, and answered both without ever saying what a project is FOR. **The structure the
story map needs is the one already built**: a project with a subject, holding workflows that each
answer one question. A section binds to the output of a question asked inside the investigation
it belongs to. Nothing new has to be invented to hold them -- which is the test of whether the
frame fits, and the reason to suspect it does.

It also explains a loose end from 131. A project's `subject` is "what this investigation is
about", written once and read nowhere except the Project tab. In this frame the subject is the
story's premise, and the sections are what is claimed about it.

### And a sixth: import, and the first thing a practitioner sees

The practitioner: *"It also exercises import and FW onboarding, so that's a minor 6th."*

Minor and real. Two separate things rest on it.

**Import stops being a path nobody travels.** Until 2026-10-23 the import control would not show
a practitioner the `.gz` files this application writes, announced its refusals in the success
colour, and said nothing about why a project could not be saved -- three faults found in one
sitting because somebody tried to import a real project. A fetched example makes that path
ordinary rather than exceptional, and a path that is travelled is a path whose faults are found.

**Onboarding stops being a canvas of widgets.** What a new practitioner opens today is a worked
example: a graph, already wired, with results. It shows what the application DOES and not what it
is for. An imported investigation carrying its subject, its questions, its evidence and the
sentences between them shows the arc -- and the first one would be Snow's South London study,
which is the clearest demonstration in public health of why a denominator matters, on data whose
answer has been published since 1855.

It is minor because neither is a reason to build the frame on its own. It is real because both
are things this project already wanted and neither has a better vehicle.

### What the fourth one constrains

The other three could be built as interface state. The fourth cannot. An example that lives in a
repository is **fetched, verified against a digest, and imported** -- so if a story's sections and
its historical notes are to arrive with it, they are part of the document, not part of the screen.

That is a sharper requirement than it first reads:

- sections and notes belong in the **project document**, beside the workflows, where they are
  exported, digested and imported like everything else;
- a section naming an output has to name it in a way that survives the trip, which means the same
  identity discipline the payload digests already have -- a reference that means nothing on
  another device is the bug this project found in an imported project carrying a downloaded
  network, where a dehydrated reference pointed at nothing and the workflow refused on the next
  reload;
- and the licence question [127](127-examples-as-repositories.md) made per-example now covers the
  notes too. A historical note is writing, with an author and terms, carried in a repository whose
  terms are declared. The South London repository is CC0 precisely so nothing it carries inherits
  a restriction.

So the fourth bird is not an extra payoff; it is the constraint that keeps the other three honest.
A story map built as interface state would be a view that cannot leave the device it was made on,
which for a practitioner whose work is reviewed elsewhere is the same as not existing.

### A seventh: the design rules get a scale they have never had

The practitioner: *"now we can fully exercise the visualization improvement aspect of FW, when we
talked about opinionated approaches."*

`src/map-conformance.ts` holds the opinionated part: design rules applied **while a map is
assembled**, stated in its receipt, and bound to WCAG, EARL and DQV rather than to a vocabulary
minted here. They already refuse -- a mark too faint to find fails with the number that decided
it, and absence of data drawn as a hue fails because it competes with the categories. The record
is blunt about where the boundary falls: every toast tone in this application failed WCAG
contrast on 2026-10-17, the worst at 2.08 against a 4.5 floor, and no RULE would have caught it
-- relative luminance did.

Every one of those rules is applied to **one map at a time**, because one map is all there has
ever been to apply them to. A story map is a sequence of views of one investigation, and that
makes a class of rule possible that cannot exist for a single map:

- **the same variable, encoded the same way across sections** -- deaths per 10,000 houses cannot
  be a sequential ramp in one view and a diverging one in the next;
- **a scale that does not move** when the reader is meant to compare two sections;
- **a mark that means one thing throughout**, which the layer symbols already resolve once per
  map and would now resolve once per investigation.

A single map cannot be inconsistent with itself. A sequence can, and inconsistency across a
sequence is one of the commonest ways a true set of maps misleads. **These rules are arithmetic,
not judgement** -- they compare an encoding to an encoding -- which is exactly the kind this
project is willing to enforce.

It also completes what [119](119-can-this-tell-a-story.md) asked for. Assurance was to state that
*"every design rule that applied, passed -- and the ones that did not apply are listed"*. For a
single map that is a short list. For a story map it is a report about the whole account, which is
the thing a reader actually wants to interrogate.

## One per project, because it is the synthesis of its workflows

The practitioner: *"So the story map in essence should provide the synthesis for all of a
project's workflows."*

That settles the scope, which had been left open. A story map belongs to a **project**, not to a
workflow. A project is one investigation holding workflows that each answer one question; the
story map is where those answers are brought together into one account. One per project is
therefore not a limit imposed on it -- it is what the thing IS.

### And it makes one kind of omission computable

[119](119-can-this-tell-a-story.md) drew the line carefully: *"A map that leaves out the
inconvenient district still breaks no rule — but a map that leaves out what its own declared
objective says it is for is, for the first time, something an application could notice."*

Synthesis puts a second case on the computable side of that line. If the story map accounts for
all of a project's workflows, then **a workflow whose answer appears in no section is visible**.
Not omission of a fact, which remains uncomputable and always will be. Omission of a question the
practitioner asked themselves, in this project, and then left out of the account.

The application can already tell the difference between the states that matter here: a workflow
that is a draft and was never run, one whose results are stale, one that ran and was refused, and
one that ran and produced an output no section cites. Only the last is an omission, and it is the
one worth saying out loud -- quietly, as a count beside the sections rather than as an accusation,
because leaving a question out is often correct and the point is that it should be a decision
rather than a drift.

This is also the answer to the danger above. The risk of writing the story first is that evidence
gets fitted to it; the defence is that **synthesis cannot quietly drop the question that did not
support the story**, because the question is in the project and the project is what the story map
is of.

## Notes are anchored along a sequence, and the sequence already exists

The practitioner: *"If we think of a story map, each workflow may have one or more notes,
incrementally revealed as we play the story and see results."*

That refines the shape twice over. A note is **not one per investigation**: a workflow may carry
several, and each is anchored at a point rather than filed in a drawer. And a story map is
**played** rather than scrolled -- the reveal is the medium, and a note appears when the thing it
is about does.

**The playing already exists.** `src/reveal-playback.ts` replays a worked example one widget at a
time, computing the build order and what each placement unlocks, with the order *"computed here
and nowhere else, so the measurement script and the interface cannot disagree about what the rule
says"*. It was built for a different purpose -- watching a progressive-reveal rule behave on
something real before committing to it -- and `buildOrder` is exactly the spine a played story
needs. The Play back the build control is already in the interface.

So the sequence a story map plays is not a new mechanism. It is `buildOrder` over the workflows
of a project, with three kinds of thing arriving along it:

| Arrives | From | Anchored to |
| --- | --- | --- |
| a step appearing | `buildOrder` | the node |
| a result | the run that produced it | the output |
| a note | the practitioner, written in planning | the node or the output it is about |

### What that settles, and what it opens

It settles the earlier question of what a note binds to: **a node or an output**, not a workflow
as a whole, because a note that cannot say where in the sequence it belongs cannot be revealed at
the right moment.

It opens a harder one. A story map is the synthesis of a project's workflows, and `buildOrder` is
defined over the nodes of ONE workflow. Playing a project means an order across workflows, and
nothing computes that today. The honest candidates are the practitioner's own section order --
which is the planning artefact and probably correct -- or a dependency order between workflows,
which does not exist because workflows do not feed each other. **The sections carry the order**,
and that is another reason the frame has to be written before the run rather than derived after
it: the application cannot work out in which order an investigation's questions should be told.

## The danger, which is the real question

Writing the story first is how evidence gets fitted to a narrative. That is not a hypothetical
risk in public health; it is the ordinary failure mode of outbreak communication, and a studio
that encourages it would be worse than one with no planning stage at all.

The discipline that makes the inversion honest is already in
[27](27-workflow-learning-and-gamification.md), in one of its four prompts: **What do I predict?**
A section written before the run is a prediction. A prediction that survives the run is evidence;
one that does not is a finding, and the section has to change or say why it did not. That is the
difference between pre-registration and confirmation bias, and it is a difference this
application can MEASURE, because it already knows when a workflow was run, what it produced and
whether the result still matches the canvas.

So the question this experiment has to answer is not whether sections and outputs can be bound
together. It is:

- **Does a section that was written before the run, and contradicted by it, survive?** If the
  application cannot tell a practitioner that their own claim did not hold, the frame is a
  template for persuasion.
- **What is the unit?** A section binding to a whole workflow is a caption. Binding to one output
  is probably right and is a guess. Binding to a node is too fine — a reader does not read nodes.
- **Which way does the dependency run?** If deleting an output deletes a section, the story is a
  view of the workflow. If the section survives with its evidence missing and says so, the story
  is an object with its own integrity. The second is harder and is almost certainly correct,
  because a claim whose evidence vanished is exactly the thing a reader needs told.
- **What does a historical note bind to?** A note about copepods is not evidence for a section's
  claim; it is context for the reader. If it binds the same way evidence does, the distinction
  this experiment opened with — *claim about the dataset, or about the world* — is lost at the
  moment it matters most.

## What would say this was wrong

- **The notes are written once and never read.** A plan nobody returns to is a diary, and a diary
  does not need a feature. The test is whether an iteration note is opened while the workflow is
  being changed, not only while it is being written.
- **They become a second provenance record.** If citations drift into the notepad, the boundary 27
  drew has failed and the application has two places to look for the same thing — the fault
  [131](131-project-and-workflow-lifecycles.md) spent a day removing from the project level, where
  twelve surfaces showed project information and two now do.
- **The story map does not use them.** If a story map is built and composes layers, captions and
  nothing from the planning stage, then these notes were never on the path to a product and the
  argument above is decoration.
- **It only ever carries one note.** The Snow copepod remark is the motivating case; one case is
  a reason to write a paragraph in a repository, not to build a surface.
- **A section is never contradicted.** If every claim written before a run turns out to be
  supported by it, the sections are being written after the result or edited to match it, and the
  prediction prompt is decoration. A planning stage that never produces a surprise is not
  disciplining anything.

## The first subject, if it is built

`example-1855-cholera-south-london` carries Snow's Table IX and the four-week figures with their
limits. The copepod note would be its first historical note, and the first test of the boundary:
it must be legible as modern knowledge about the world Snow was working in, and not as something
the 1855 source says.
