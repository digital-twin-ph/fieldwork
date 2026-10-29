# 149 — The Notes spike: can the IMRAD body carry a write-up's notes?

_Created 2026-10-29 · Updated 2026-10-29_

**Status:** tried — the surface exists, read-only, on the Project view, and it answered the
questions it was built to ask. What it did not answer is named at the end.

The practitioner, 2026-10-29: *"Let's do a Notes spike"* and *"let's test it on the South London
example."*

## What was there

`src/notes.ts` since 2026-10-28: two kinds of note, four parts of the body, grouping, tolerant
reading, a word and character count, a ceiling. Imported by `core.ts`, `project.ts` and
`relate-table.ts`.

**Never imported by `app.ts`.** Notes were defined, produced, stored, grouped and counted where no
practitioner could see one. The module was built as the half a surface would sit on; the surface
was not built, and nothing reported that.

## What the spike found, in the order it found it

**The example shipped its notes and did not carry them.** `notes/snow-quotations.json` has held
nine of Snow's own sentences since 2026-10-27 — harvested against the digest of the Gutenberg
text, refused where an anchor was not unique — and `project.notes` in the published bundle was
empty. Two facts that look like one thing from a distance: the notes were *published*, and the
example did not *use* them.

**And the importer dropped them anyway.** `importProjectDocument` mints a project from the name
and the subject:

```
const project=newProject(document.project.name,document.project.subject,allProjects());
```

So even with the bundle carrying nine notes, an imported investigation arrived without a word of
the author it is about. This is the same shape as the defects the map kept having: a field that
exists, travels as far as the door, and is dropped by the one step that rebuilds the object.

Neither of these would have been found by reading the code, because each half looks correct on its
own. They were found by putting the thing on screen and looking at it, which is the argument for
spikes.

## What it answered

- **The IMRAD body works as the spine.** Four parts, every one shown including the empty ones.
  South London's nine notes land in three — Introduction, Methods, Discussion — and `Results` is
  empty, which is a fact about the write-up rather than a gap in the surface. A Results section is
  mostly figures and tables, which this application makes as artifacts.
- **The two kinds read together.** A quoted sentence of Snow's and a machined sentence from
  `relate_table` sit in the same section under the same function heading, labelled by which is
  which. A write-up does not care who wrote a sentence; a reader checking it does, so the label
  carries that and the grouping does not.
- **The function labels come off the notes.** `purpose`, `background`, `method`, `source` in this
  example, from `KNOWN_NOTE_FUNCTIONS` and never invented.

## What it does NOT do, and says so on screen

Read-only. The practitioner's own specification from the prototype — *"Each note should be
editable as a modal dialog"*, and *"if there is no notes under an IMRAD section, there should be an
Add Notes button"* — is not built. The panel states that rather than looking finished.

## What this does not establish

- ~~That the Project view is where it belongs.~~ **Settled the same day by the practitioner: *"It
  should be a tab."*** It is now a fifth tab beside N3 & evidence, carrying a count of what it
  holds. The reason it is not a panel is readable off the thing itself: a write-up is read in
  order, and under the project's own controls a reader reaches the Introduction by scrolling past
  backup buttons.
- **That machined notes read well at volume.** `relate_table` is the only producer and South
  London's run makes few. Nine quoted notes is not a write-up.
- **That the word count means anything yet.** It counts what a reader would read and nobody has
  written against a target.
- **That editing belongs on this surface at all.** A note is produced by a widget or quoted from a
  source; whether it should be editable afterwards, and what that does to its provenance, is the
  question the modal would force and the spike deliberately did not touch.

## The prototype, read

The practitioner supplied it on 2026-10-29: <https://claude.ai/artifact/XHXnyV4mhbVuZnXZyZ2V7e>,
*"Notes from Snow's South London study"*. It is a standalone Claude artifact, so it is not in this
repository and cannot be gated; what it settles is written down here instead, because a design
that lives only in an artifact is a design this project cannot check itself against.

It is the design [141](141-organising-snows-notes.md) proposed, built. Read with 141 beside it:

**Three kinds, not two.** `derived`, `authored`, `machined` — carrying Snow's own Map 2 palette:
the Southwark and Vauxhall indigo, the Lambeth oxide red, and the purple of the zone where both
companies' pipes are intermingled. `quoted`, which is what `notes.ts` ships, **does not appear in
it at all.**

**And its fourteen notes contain no quotations.** They are the example's own declarations: the
source of each table, the title and caption of the choropleth, the rate ratio `two_by_two`
machined, the empty cell `group_table` reported. Its subtitle says so — *"Harvested from the
example, not written for this page."* So the write-up is **assembled from what the workflows
already declare**, which is a different proposition from a place to keep sentences, and the one
141 means by *"References are the one section a workflow can write by itself."*

**Two coordinates, two palettes, and a rule.** The CSS states it: *"The four IMRaD sections carry
a separate, quieter ramp, because kind and narrative position are two coordinates and must not be
read off one colour."* That is 141's independence claim, enforced in the design rather than
asserted.

**Three arrangements**: IMRaD, Chronological, Board — with notes draggable between sections and
reorderable within them.

**It answers the editing question this spike deliberately left.** A note that may not be edited is
shown read-only with a reason — *"read-only: the place to change it is …"* — so a derived note is
edited at the widget that derived it, not in the write-up. The surface cannot silently make an
edited quotation, because the edit happens where the thing is made.

**And it carries what a note is about**: the table it cites, spelled as the file spells it; the
figure, with its conformance rules and verdicts; a markup view showing the variables a machined
note was built from; flags and suggestions; `live` and `edited` markers; a reference list
assembled with `usedBy`, licence, and the missing fields marked.

### The vocabulary has drifted from its own design

| | Functional purposes |
| --- | --- |
| `notes.ts` ships | background · related literature · purpose · method · source · limitation |
| 141 settled | source · limitation · rationale · context · method · finding |
| the prototype uses | source · finding · method · limitation |

`finding`, `rationale` and `context` are in the design and not in the code; `background`,
`related literature` and `purpose` are in the code and not in the design. And 141 records a
seventh that belongs in neither yet: **`verification`** — *"checking the source and finding it
wrong, which is a distinct act and arguably the most valuable prose in the file"*.

**Reconciled the same day**, on the practitioner's decision: *"Reconcile the vocabulary towards
the earlier prototype we developed and discussed extensively one afternoon."*

`KNOWN_NOTE_FUNCTIONS` is now **context · rationale · source · method · verification · finding ·
limitation** — 141's six, plus the seventh 141 found missing and argued for on evidence. They are
ordered as a reader meets them inside a section: what this is about, why it was done, what it was
made from, how, what checking it found, what it showed, and what it cannot show.

`background`, `related literature` and `purpose` are gone. Nothing refuses a note that still uses
them: the list governs grouping, and a function outside it is kept and sorted after, because
somebody else's word for what their note does is not ours to drop.

**The example's four were relabelled, not rewritten.** `snow-ready-made-experiment` is
`rationale` — *"no experiment could have been devised which would more thoroughly test the effect
of water supply"* is the reasoning that makes the comparison work. The three on the grandest
scale, the tidal limit and the Lambeth supply are `context`: each is a claim about the world the
data came from rather than about the dataset, which is 141's own test. A function is this
project's account of what a sentence does; the sentence is Snow's and is untouched — the
distinction the prototype's read-only rule exists to protect.

## What the spike has, against that

Four of the prototype's properties: the IMRaD spine with every part shown, a label per note, the
link from a machined note to its node, and the running count. It has none of the three
arrangements, one coordinate drawn as labels rather than two drawn as palettes, no references, no
tables or figures carried, no drag, no editing, and `quoted` where the prototype has `derived` and
`authored`.

## The prototype this is reaching for

The practitioner, 2026-10-29: *"We developed an earlier prototype of the UI and that looked
excellent"* — and, asked where it is, *"It was a standalone Claude prototype."* So it is not in
this repository and cannot be read. What survives of it is four requirements, quoted in
`src/notes.ts` as they were given:

| Quoted requirement | In the spike |
| --- | --- |
| *"show intent (IMRAD, not sure where limitation goes in) as colored labels"* | the body in IMRAD order; each note labelled with its function and its kind |
| *"if produced by a workflow it should link to the workflow"* | a machined note names the node that machined it |
| *"We can also show number of characters, words so we have a running word / character count"* | notes, words and characters, in the header |
| *"if there is no notes under an IMRAD section, there should be an Add Notes button"* | the button is there, disabled, and says it is not built |
| *"Each note should be editable as a modal dialog"* | **not built** — see below |

Four of five. Whether the fifth should be built as specified is the open question, not a task.

## What would close it

- The prototype itself, or a screenshot of it, if the shape is to be matched more closely than
  four sentences allow.
- One more machined producer, so grouping is tested across two widgets rather than one.
- The editing question answered before the modal is built, because an edited quotation is no
  longer a quotation and the surface should not be able to make one silently.
