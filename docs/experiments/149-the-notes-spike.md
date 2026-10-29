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
