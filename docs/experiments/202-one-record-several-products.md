# 202 · One record, several products

_Created 2026-11-10 · Updated 2026-11-10_

**Status:** asked. A design for the Notes tab, built on [141](141-organising-snows-notes.md), to be tried on Hagelloch.
Nothing is built.

## The question

The practitioner, 2026-11-10, in order:

- *"Knowing we have notes now do we have the ingredients to create story maps?"*
- *"So do we need a different axis for stories as compared to IMRAD?"*
- *"We can always guide the user not to create the story map first unless the evidence has already unfolded. This way
  user can avoid putting the cart before the horse."*
- *"Perhaps this is the point where we think more about the Notes tab because it can configure many renders - report,
  paper, story"*
- *"The notes can have versions for different renders and they can be excluded or included in a selected render."*
- *"It can even have a format for a poster presentation"*

These are recorded as said. They are the starting point of a design, not rules.

## What 141 already settled

141 is titled *Notes, the story, and the report: one record*. It found that a note's narrative axis is independent of
what the note does: two limitations landed in different IMRaD sections. It found that a story map is the one product
that needs an **order**, a spine through a canvas that has none, and that the order exists: the build order *Play
back the build* walks (`buildOrder` in `src/reveal-playback.ts`). And it named the danger: writing the story first is
how evidence gets fitted to a narrative.

The glossary's word for the products is **Fieldwork story**: several views and text as one product, of which a field
report, a story map, an infographic and a dashboard are kinds. It is provisional (*"for now"*).

## The design

**Two layers.**

1. **The record**, written once: every note (authored, machined, quoted, derived), every view, and for each note three
   axes: what it does; its IMRaD section; its anchor, the step or result it is about, with an optional **saved view**
   (a map's extent, the layers on, the frame or day).
2. **Products**, configured from the record and never copied from it:

| Product | Order | Which notes | Views |
| --- | --- | --- | --- |
| Paper (today's write-up) | IMRaD with title, abstract, references, appendix | all, by section | static figures |
| Field report | findings first, then actions and limits | findings, limitations, actions | a few key figures |
| Story map | the build order, scene by scene | those anchored to a view | interactive, each at its saved view; a static version for print |
| Poster | panels on one page: question, methods, key figures, findings, limits | short versions | a few figures, large |
| Dashboard | none | numbers and short notes | live, recomputed |

**Per product, a note is included or excluded**, from a default (the Paper takes all by section; the story map takes
those anchored to a view), and each product shows what it left out. **A note may have a version per product**: the
full paragraph for the Paper, one plain sentence for the story map, a line for the poster. Each version is linked to
the note it came from and is flagged when the original changes, until it is revised or confirmed, so versions cannot
quietly say different things. A widget's own note is recomputed on every run, so a version of it must not freeze its
numbers: a widget can machine a short form as it machines the long one.

**Evidence first, guided rather than refused.** A scene or panel anchors to a result that exists. One written before
the run is marked a prediction; the run bears it out, or it is flagged to change or to say why not. A result that
changes flags what was built on it.

**On screen**: a product selector at the top of Notes, the Paper by default so nothing moves; *New product…* opens the
standard configuration dialog (kind, audience, which notes, order, preview).

## The plan

1. The Paper as it is, and one new kind, the story map, on Hagelloch's six scenes: the village and its cases; the
   curve; who infected whom, the tree and the map lines; the scan's cluster; the replay to 21 November; what none of it
   establishes.
2. Include and exclude, and versions with their flag.
3. The poster and the field report; the dashboard last.

## What this does not establish

That one record can serve every product without each wanting its own: the Hagelloch story is the test. That a saved
view is enough for a scene: a story may need emphasis a view does not carry. That the products' names are settled:
**Fieldwork story** is provisional, and `story map` is one presentation of one.
