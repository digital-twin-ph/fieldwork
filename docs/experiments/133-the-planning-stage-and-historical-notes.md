# 133 · The planning stage, and where a historical note belongs

_Created 2026-10-24 · Updated 2026-10-24_

**Status:** asked — a home proposed for a kind of writing the application has nowhere to put, and
nothing built. What follows names the gap, the three places it is not, and the test that would
show the proposal was wrong.

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

## The first subject, if it is built

`example-1855-cholera-south-london` carries Snow's Table IX and the four-week figures with their
limits. The copepod note would be its first historical note, and the first test of the boundary:
it must be legible as modern knowledge about the world Snow was working in, and not as something
the 1855 source says.
