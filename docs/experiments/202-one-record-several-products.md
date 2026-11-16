# 202 · One record, several products

_Created 2026-11-10 · Updated 2026-11-15_

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

**Built, 2026-11-14 (Fieldwork 0.117.0).** Publication, at the top of Notes, lays out the record as the table above
describes, from the same notes, figures and references, over the page and printable alone (A4, saved as PDF from the
browser's print dialog, offline). Of the simulation's six findings: (1) identical notes are merged, naming each
workflow; (2) a source's table is not printed, its sentence stays in Methods and Data availability names it; (3) a
figure's note is its caption; (4) none of the tab's furniture is drawn. (5) is confirmed: Hagelloch's cases are a Point
input, which carries its sources as Evidence links and a source line, and no `provenance` with a `what`; only that
reaches a source note and References. Point input has no provenance field to give it, so the fix is a change to that
widget, its own batch. (6) is still to be checked on the practitioner's machine. Hagelloch's day-by-day map is out of
the write-up, by the output's new "Not in the write-up" (the practitioner: "we can leave it out of the notes"). Not
yet: a stored abstract, title, affiliations and keywords (prompts only, so far); the map's own title drawn inside the
figure as well as in its caption; a figure numbered where the text cites it; Word.

**The open items, 2026-11-14 (Fieldwork 0.118.0).** (5) Hagelloch's source is cited: Point input carries a provenance
record, and the cases name Pfeilsticker's 1863 thesis; Vancouver prints it as a report, because the citation types have
no thesis yet. The parts the person writes (title, affiliations and keywords, abstract, conclusions, data availability)
are written in the publication itself, kept with the project, and shown in place of their prompts; a shipped example
offers no Write. A map's title is dropped from the figure in the publication, its caption carrying it. Still open: (6)
the basemap, to be checked on the practitioner's machine; figures cited by number in the text; a thesis citation type;
Word.

## What this does not establish

That one record can serve every product without each wanting its own: the Hagelloch story is the test. That a saved
view is enough for a scene: a story may need emphasis a view does not carry. That the products' names are settled:
**Fieldwork story** is provisional, and `story map` is one presentation of one.

## The draft as a document, asked 2026-11-15

The practitioner: *"The other thing we can improve is the render part. The draft document should be configurable: (1)
notes text and images should be resizable such that polished charts, maps and graphs can be inserted side by side or
"inserted" like in Word (2) we can make the draft document appear like a publication. (3) We just need one example each
of a publication, a surveillance report, sit rep for now for demo purposes."* Ordered after the Notes maps and before
the ABM spike, and, the same day: *"The above can partly close the render experiment."*

So three things, each a product of the record rather than a new one: a figure's width and its place beside text or
beside another figure, set per product; the draft laid out as the publication is, on screen, not only in print; and
three worked products, a publication, a surveillance report and a situation report, one example each. What it would
partly close: the products this record designed (the field report becomes the surveillance report and the sit rep;
the poster, story map and dashboard stay open), and how a figure sits on the page, which the record did not ask.

**Where the publication render stands, the practitioner, the same day:** *"The publication render exists but it is not
ready for demo. Still not convincing."* So the publication is one of the three to bring to a demo, not a product
already done: the built render of 0.117.0 and 0.118.0 is the starting point, and the work above is what is to make it
convincing.

**Decided the same day.** The three demos: **a publication on South London** (Snow's rates, maps and two-by-two),
**a surveillance report on NYC** (ten years of daily asthma visits and the air), **a sit rep on MERS** (South Korea
2015: hospitals, chains, response times). Their written parts are drafted as Markdown for the practitioner to edit,
then entered as authored notes. A figure's size and place are **a width (full, half, third) and a placement (on its
own line, beside the next figure, or beside the text, left or right, as Word wraps)**, kept per product and drawn the
same on screen and in print; dragging was the alternative, set aside as harder to print the same.

**The design, written before the code (2026-11-15).**

| Part | What it is |
| --- | --- |
| Draft as | A choice at the top of the render: Publication, Surveillance report, Sit rep. Each kind is a template: its sections, their order, their headings and the prompts for what the person writes, filled from the same notes |
| Surveillance report | Title and reporting period; key points; the situation (Results); trends (the figures); data and methods (Methods, short); limitations; recommendations; data sources and references |
| Sit rep | Report number, date, period and who prepared it; highlights; the situation in numbers (Results); epidemiology (the figures); response actions; gaps and needs; next steps |
| A figure's layout | Width: full, half or a third of the text column. Place: on its own line; beside the next figure; or beside the text, on the left or the right, the text running round it. Set from a small toolbar on the figure that does not print; kept per product with the project, as the written parts are |
| The page | The draft drawn as a page on screen: a text column, margins, a body face for reading, headings and numbering, the same as it prints |

| Distinction | Enforced as |
| --- | --- |
| A product lays out the record and never copies it: a figure's layout is per product, its caption is its note | **hard stop**: the layout is stored by note and product, not in the note |
| A kind's parts that the person writes stay prompts until written | **validation rule**: an unwritten part prints its prompt on screen and nothing in print |
| The same layout on screen and in print | **run-time check**: the browser test measures a figure's width on screen and in the print stylesheet |

**What it commits to, before the result:** a unit test that each kind places the record's notes in its sections and that a
layout is kept per product; a browser test that a figure set to half and beside the next sits on one line with it, on
screen and in print emulation; and the practitioner's own look at the three demos, which can come out badly: is each
convincing as what it claims to be?

## Formats as mappings onto section roles, asked 2026-11-15

The practitioner, asked whether the sit rep follows a standard format: *"Check against open templates"*, and then: *"If
the standard templates have enough structure perhaps we can do interformat mapping so presentation format is
flexible."* The sit rep and surveillance report built the same day were laid out from general knowledge of WHO and
OCHA reports, not from a template checked at its source; that check is running (WHO, OCHA, ECDC, Africa CDC, PAHO for
situation reports; ECDC, WHO's Weekly Epidemiological Record and CDC's MMWR for surveillance reports, open sources
only).

**The idea, not yet designed.** One set of section **roles** beneath every format: key points or highlights, the
situation in numbers, the epidemiological description, background, assessment or interpretation, response actions,
gaps and needs, next steps, recommendations, methods, limitations, sources. Each role says where its content comes
from: the notes of a part (Results, Methods, Discussion, limitations), or text the person writes. **A format is a
mapping**: its own headings, in its own order, each pointing to a role, with its own prompt and length; declared as
data, as a ruleset is, so a WHO sit rep, an OCHA sit rep or an ECDC report is a declaration, not code. **Changing
format keeps what was written**: text written for a role appears under whichever heading another format gives that
role; a heading with no role in the other format is named as not carried over, never guessed into another.

**What it depends on, and what would close it:** whether the open templates share enough structure for one role set to
cover them, which the check will show. Designed from what it finds, not before: the role set, each source format's
mapping, and where the formats disagree.

**What the check found, 2026-11-15** (the full comparison: `reports/Sit rep and surveillance report templates.md` in the
workspace, 10 situation reports and alerts and 5 surveillance reports, each read at its source). Situation reports
share a masthead (number, issue date, a separate data cut-off), a key-figures box of 3 to 6 numbers, 2 to 6
highlights, the situation with its figures, response, gaps, a risk assessment with a level, recommendations, data notes
at the end (never a Methods section), references and contacts. Surveillance reports share key points, background,
methods, results, interpretation with limitations, public health implications and references. The day's two layouts
had the parts but not the order or the names: the sit rep's background after its figures, no cut-off, no key figures,
"Next steps" where sources have recommendations, a Methods section no sit rep has; the surveillance report's
"situation" where sources say results, and methods after interpretation. The practitioner: *"Mapping first"*.

**The design (written before the code).**

| Part | What it is |
| --- | --- |
| A role | What a section holds, and where it comes from: the notes of a part, or text the person writes. Roles: report number, data as of, reporting period, key figures, highlights or key points, background, the situation or results, methods or data notes, interpretation, limitations, risk assessment, response, gaps, recommendations, contacts, references |
| A format | A declaration: its name, its kicker, the template it follows and where that was read, and its sections in order, each a heading of its own pointing to a role, with its prompt and length. Five to start: the publication (unchanged), a WHO-style sit rep (A1, A2), an OCHA-style sit rep (A4, A5), an ECDC-style surveillance report (B2) and an MMWR-style surveillance summary (B3) |
| What is written | Kept by role, not by format: highlights written under a WHO sit rep are an OCHA sit rep's highlights and an ECDC report's key facts |
| What does not carry | A format lacking a role that holds text says so on screen, by name: written for another format and not in this one |
| A figure's place | Kept per format, as before |

| Distinction | Enforced as |
| --- | --- |
| A format arranges the record and never rewrites it | **hard stop**: a role fills from notes or the person's text, nothing else |
| A role's text is the same text under every format's heading | **validation rule**: one key per role |
| Text a format leaves out is named, not lost | **run-time check**: the leftovers listed on screen |

The day's unreleased `sitrep:` and `surveillance:` keys are withdrawn for role keys; nothing outside this machine wrote
them.

**Built, 2026-11-15.** `widgets/report-formats.json` declares 16 roles and four formats, each naming the reports it
follows; the publication keeps its own layout. Written text is kept as `role:<role>` and laid out under each format's
heading for it; a role with text or notes that a format does not map is listed on screen as kept for the others. A
project reads `role:`, `kind` and `layout:` keys only for declared roles and formats; the day's `sitrep:` and
`surveillance:` keys are dropped. Checked: `tests/publication.test.mjs` (every format maps only declared roles; WHO and
ECDC headings in their declared order, background before the figures, a sit rep's methods as data notes at the end;
highlights written once appear under all three; key figures named as not carried by the ECDC report; each format's own
prompt), `tests/project.test.mjs`, and `tests/draft-products.browser.mjs` on South London in Chromium (WHO style, the
OCHA style's gaps section, back again, figures side by side and left out, kept on reopening). **Not established:**
whether a reader takes the drafts for the reports they follow; that comes with the demos.

**A fifth format, and the real thing it follows, 2026-11-15.** The practitioner, asked whether a surveillance summary of
the NYC data was ever published: *"we need something that comes really close to the real thing."* None was found
(workspace `reports/NYC asthma and the June 2023 smoke, published reports.md`): no CDC or NYC health department report
gives NYC figures for the June 2023 smoke; the nearest are McArdle et al. (MMWR 2023, HHS Region 2, ages 5 to 17), Meek
et al. (MMWR 2023, New York State without NYC), and Chen et al. (JAMA 2023, NYC ages 5 to 17, rate ratio 1.32). The
practitioner chose the MMWR full report: **Report, MMWR style**, after McArdle et al., opens on its Summary box of
three questions, each a role the person writes with its own prompt (a format section may now carry a prompt per role).
**Found on the way:** the example's PM2.5 of 190 µg/m³ on 7 June 2023 is the authors' citywide mean of eligible
monitors, which that day was **two**; over Chen et al.'s windows the authors' series gives 115.3 against a reference of
10.7, against Chen's 100.9 and 9.0 from ten monitors. Checked in `tests/publication.test.mjs` (the Summary box's three
questions, a written answer led by its question).

## The draft as a page you work on, 2026-11-15

Rendered from the draft text, South London's publication ran to 22 A4 pages
(`demo-drafts/south-london-publication.pdf` in the workspace): a front page that reads as a paper, then a Methods
section of every step's machine note in full ("kept 1854 deaths per 1849 death of measure", runs of "(Equation A3, in
the Appendix.)", a quotation cut at "(No."), each figure and table on a page of its own, and machine descriptions as
captions. The practitioner, first: *"For the render, remember we need to be able to configure the output per role."*
Offered settings per role (which notes, how much of each, which figures), the practitioner answered that it is a UI
problem, and said what was meant: *"I meant UI problem as a design problem, not as a problem that is an issue. Which
means we need to be able to manipulate blocks of text (notes) and figures (resize, and text flows around figures).
This is before a final render to PDF."*

So the draft is a surface to work on, not a set of options: notes and figures are **blocks** the person moves, keeps
or leaves out, and resizes, with the text flowing around a figure as in a word processor; the PDF is rendered from the
page as arranged. The width and place menus built the same day are a stand-in for that, and settings per role would
only have been presets for it. Dragging was set aside earlier the same day as harder to print the same; that
judgement is reversed by the practitioner's direction, and printing the same becomes the thing to test. Not yet
designed.

The practitioner, the same day: *"And the publication render as it is now is a mish mash of notes, it does not provide
a cohesive scientific narrative yet."* Arranging blocks better would not cure that: every note is placed by its
section, so the render is the record laid end to end, and nothing in it is the argument. A paper's narrative is
written, by the person (Fieldwork drafts none of it): what was asked, what was done, what was found, what it means. The
steps' notes, sources and figures are its material and its evidence. **What this implies, not yet designed:** the
draft centres the person's narrative, section by section, and the record's notes and figures sit beside it as material
to draw into it, cited or placed where the narrative calls for them, rather than poured in by default; what the
narrative does not use stays out of the document and is named as not used, so nothing is lost from the record.

The practitioner, the same day: *"Remember we are simulating a publication, like the ones for sit rep and surveillance
summary. The publication has to look like one, which means we have to go back to the source notes, both machined and
authored, and begin with the end in mind."* So the order of work: (1) a real model, an openly readable paper of the
kind South London's would be, as the sit rep followed WHO's and the surveillance report McArdle et al.'s; (2) the end
state written first, the whole paper as a mock-up with each paragraph marked by what supplies it, an authored note, a
step's note, a figure, or nothing yet; (3) the practitioner's judgement of it; (4) working back to the notes: authored
notes to write or reshape (drafted for the practitioner to edit), machine notes that need a short form for a
publication (a change to the widgets that write them), notes the paper does not carry.

## Gaps in the model, found 2026-11-15

The practitioner: *"This is an important DE moment, when we discover gaps in our underlying model. What gaps still
exist for us to bridge the gap between what we have and that end?"* Read off South London's 22-page render:

| # | Gap | Where it sits |
| --- | --- | --- |
| 1 | No narrative layer: a note is filed by IMRaD section only, so the render lays the record end to end; nothing records what a paragraph argues and which notes, figures and numbers are its evidence (`relatesTo` exists and the render ignores it) | the note |
| 2 | No order within a section beyond the order steps ran | the note |
| 3 | One register: each step writes its note once, as a full technical account; the full, short and one-line forms designed above were not built | the note, and each widget that writes one |
| 4 | Methods are per step, not per method: every Select, Relate and rule writes a sentence; no finer function within Methods (data, case definition, analysis, statistics) to gather them by | the note's function vocabulary |
| 5 | Numbers in written text are typed, not bound to the computed value, so a rerun that changes one goes unnoticed | the note |
| 6 | Quotations overlap and are cut at their edges (one sentence printed twice; one cut at "(No.") | quoted notes |
| 7 | **No outline**: a product has sections and prompts, but no statement of what each section must argue, so nothing can say which points have material and which are missing. The "end in mind" has no home | the product |
| 8 | No editorial selection: every output a figure, every formula in the appendix, every table whole | the product |
| 9 | Captions are machine descriptions; a figure in Results has no authored caption, as a note's image has | the product, per figure |
| 10 | No cross-references: no "Figure 2" cited in the text; quoted sources not cited in the text | the product |
| 11 | No working page: blocks to move, keep, resize and wrap text around before the PDF | the surface |
| 12 | Guidance per section, not per point of the argument | the surface |

**Most consequential:** 7, then 1, 3 and 9; the others largely follow once a product has an outline and paragraphs that
cite their evidence. **Not established:** whether an outline per product is the right shape for "the end in mind";
the real model paper being sought now is to inform it.

## The design for gap 7: targets chosen at the start, notes written to roles, 2026-11-15

From the practitioner, the same day: *"I think the role for the notes has to be picked early so the outline for the
type of output (and render) guides what form the notes take, the length of each note, and where they go"*; *"And
where do we pick publication, sit rep, surveillance summary? And when in the process?"*; *"For the project, could
render targets be multiple?"*; and *"Yes"* to the design below.

| Part | What it is |
| --- | --- |
| Targets | A project names what it is writing towards, at its start, beside its question: one or more formats (publication, a WHO-style sit rep, an MMWR report …). "Not chosen yet" is allowed for exploratory work. Changing them drops nothing |
| Roles | A note's role is independent of any product (the case definition, the main finding), finer than IMRaD's sections. Each target maps the roles it uses to its own headings. A step's note takes its role from the widget that writes it. A note may be left unplaced |
| The outline | Notes shows one outline: every role any target needs, each slot saying which targets use it and the length each wants. Slots only one target uses are marked, so their cost shows |
| Writing | Once, in the fullest form a target needs; a target that wants it shorter asks for a short form, flagged when the full note changes |
| Coverage | Per target: slots filled of slots needed, so readiness is judged per product |
| Suggested by design | The study design (159) can suggest a target; it does not choose |

**Open in it:** a target's own cut-off in time (a sit rep is "as of" a date, a paper covers the whole event), which roles
alone do not answer. **Test before design:** South London's publication written as a mock-up from a real model
(Coleman 2020 for content, Barnett 2020 for form; workspace `reports/South London publication, model papers.md`), each
paragraph marked with its role, what supplies it now and its length, against two targets at once, the publication and
a sit rep.

**Objectives are the workflows' questions (the practitioner, the same day: *"For the publication, the results should
match publication questions or objectives"*).** A paper's Introduction states its objectives, Results answers each in
the same order, and the Discussion returns to them. Fieldwork already names each workflow for the question it answers,
so a publication's objectives are drawn from the project's workflow questions: each objective a Results slot, filled
by that workflow's result and figure, with the person's sentence giving the answer; workflows the paper does not ask
about support Methods or stay out. South London's mock-up has three: per house, per person, 1854 against 1849.
