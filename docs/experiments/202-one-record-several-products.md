# 202 · One record, several products

_Created 2026-11-10 · Updated 2026-11-10_

**Status:** asked. A design for the Notes tab, built on [141](141-organising-snows-notes.md). Reordered 2026-11-14: the
publication render first. Nothing is built.

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
- *"Remember with notes we want the humans to write as much as they can, that is a skill we don't want the learners
  and practitioners to lose. We can guide them how to do it but we should not do it for them."*
- *"Well there's machined notes which widgets emit. Those could be formatted for different renders. Even hidden, when
  space is an issue such as posters."*

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
quietly say different things.

**People write; Fieldwork guides.** Every authored note, and every version of one for a product, is written by the
person: Fieldwork offers a prompt (what this panel or scene should say), a length guide, plain checks and the flag,
and never drafts the sentences. **A widget's own note is formatted, not rewritten**: the same facts shown in full for
the paper (formula, worked numbers, how the p-value was found), compressed to the formula and result, cut to one line,
or hidden where space is short, as on a poster, while its reference still reaches References. Every format is made
from the same computation, so its numbers follow the run.

**Evidence first, guided rather than refused.** A scene or panel anchors to a result that exists. One written before
the run is marked a prediction; the run bears it out, or it is flagged to change or to say why not. A result that
changes flags what was built on it.

**A code to the digital form.** A printed product can carry QR codes to its digital form: see
[203](203-qr-codes-from-a-product-to-its-digital-form.md).

**On screen**: a product selector at the top of Notes, the Paper by default so nothing moves; *New product…* opens the
standard configuration dialog (kind, audience, which notes, order, preview).

## The plan

1. The Paper as it is, and one new kind, the story map, on Hagelloch's six scenes: the village and its cases; the
   curve; who infected whom, the tree and the map lines; the scan's cluster; the replay to 21 November; what none of it
   establishes.
2. Include and exclude, and versions with their flag.
3. The poster and the field report; the dashboard last.

## Publication first, 2026-11-14

The practitioner: *"And let's advance the Notes UI one more level. Let's begin to think about the different renders
(report, publication, poster, sit rep, story map), beginning with publication."* The plan above is reordered: the
publication render first, the story map after. A sit rep, a situation report, joins the products, beside the field
report. Asked the same day which way formulas go, *"as footnotes or in an Appendix section"*, and which output first, the
practitioner agreed to both proposals: **formulas in an Appendix**, and **a print layout first**, saved as PDF from the
browser, with Word for a journal's template later.

What the publication render holds, and today's Notes tab does not:

| Part | The publication |
| --- | --- |
| Front matter | title, authors and affiliations from the project's authors, date, keywords |
| Abstract | structured (background, methods, results, conclusions), written by the person, with a prompt and a word limit per part |
| Body | IMRaD as clean text, without the tab's badges and controls; each step's Methods note as prose |
| Figures and tables | numbered, captioned, cited in the text by number; a figure can be left out of this product |
| Formulas | an Appendix, numbered, with the run's own numbers; the Methods note keeps its sentence and points to it |
| References | numbered, Vancouver, cited in the text |
| Limitations | gathered under Discussion |
| Output | a print layout, saved as PDF from the browser, offline |

People write the narrative (title, abstract, introduction, discussion, conclusions); Fieldwork prompts, guides length
and checks, and drafts none of it. A widget's note is formatted for the publication, not rewritten.

**Simulated on Hagelloch, 2026-11-14** (the practitioner: *"Let's simulate the render with Hagelloch"*). Laid out by a
script, not by the application, from Hagelloch's own Notes after its five workflows ran (Fieldwork 0.116.0 in
development): 11 Methods notes and 17 Results notes, 8 figures, 4 tables, 3 equations moved to the Appendix, 13 A4 pages,
with the parts the author writes as prompts. What it found, which the render must handle:

1. **The same note twice.** Two workflows ran the same step on the same data and each wrote its Methods sentence: a
   product merges identical notes, naming every workflow they came from.
2. **A source table in full.** The 188-row line list ran over several pages and off the right edge. In a publication a
   source belongs in a data-availability statement or a supplement, not the body.
3. **Captions.** A figure's note already says what it shows ("3 layers, bottom to top..."): it is the caption, not body
   text; and the map draws its title inside the figure as well.
4. **The tab's furniture leaked through**: "References 0 notes · 0 words", the online-links block's heading.
5. **One reference.** Kulldorff's paper is cited and Hagelloch's source is not: its source step probably lacks the
   `what` a source note needs, as MERS's did. To be checked.
6. **No ground under the cluster map** in the simulation: tiles do not load in the test environment; to be checked on
   the practitioner's machine.

## What this does not establish

That one record can serve every product without each wanting its own: the Hagelloch story is the test. That a saved
view is enough for a scene: a story may need emphasis a view does not carry. That the products' names are settled:
**Fieldwork story** is provisional, and `story map` is one presentation of one.
