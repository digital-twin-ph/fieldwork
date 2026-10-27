# 144 — Provenance as structured data

_Created 2026-10-27 · Updated 2026-10-27_

**Status:** tried — the module and its tests are in this commit; adoption across every input is not.

The practitioner, 2026-10-27, after a notes-UI prototype offered a citation-style picker that
could only work against hand-parsed fields: *"While it is early, let us make provenance structured
data then."*

## What the prototype exposed

The notes prototype offered Vancouver, APA 7 and Chicago author-date over the South London
example's three references. The picker worked. The data behind it did not: all three references
reached it as one free-text sentence each, the longest being

> John Snow, On the Mode of Communication of Cholera, second edition, London: John Churchill, 1855.

which reads correctly and reformats into nothing. The three styles each reorder the author, move
the date, change the edition abbreviation and repunctuate throughout. None of that is recoverable
from the sentence without parsing English, and a parse right for Snow is wrong for the next input.

**So the picker had to be fed by hand**, and the prototype says so on its face. That is the finding:
a style picker over free text produces citations that look like a style and are not one —
professional-looking and wrong, the failure this project names.

## What was added

`Citation` on `InputProvenance`: `type`, `authors` (family and given apart), `title`, `container`,
`place`, `publisher`, `volume`, `issue`, `pages`, `doi`.

Three decisions worth the record:

- **Dates and URL are not repeated inside the citation.** `published`, `edition`, `retrieved` and
  `url` already sit on the provenance record and mean the same thing for a citation as for anything
  else. A second copy would be a second answer to the same question.
- **The edition statement joined the existing `edition` block** as `statement`, rather than becoming
  a second field called `edition` on the citation. Everything about the edition is in one place and
  the word means one thing in the file.
- **`source` is not withdrawn.** An input's origin is often an authority rather than a publication:
  an Overpass query, a ministry's facility register, a sensor. Those have a source and no citation.
  Forcing them into bibliographic fields would be the mirror of the same error. A citation is for a
  work; `source` is for everything that is not one.

**The title is not case-folded.** Vancouver prefers sentence case and deriving it would lowercase
London. A style that wants sentence case needs the author to store it that way, and the record says
so rather than guessing.

## A gap refuses the whole citation

`renderCitation` returns `undefined` where any required field is missing, and `citationGaps`
returns what is missing as sentences a reader can act on. Separated so that one caller can refuse
and another can show: a validator fails a build, an Inspector tells the author which field to fill.

A half-rendered reference is worse than none — it looks checkable and is not. The tests hold the
line for a missing year, a missing given name, and a `source` sentence with no citation, and in
each case `renderedCitations` returns `{}` rather than a partial set.

## What it already changed, beyond rendering

`attributionFor` fell straight through to the bare licence identifier for an input that carried a
work and no sentence. **A figure drawn from Koch and Denike's boundaries credited
`BSD-2-Clause` and nobody.** It now falls back to `citationShort` — first author, year, title —
which is a credit line rather than a reference-list entry, because a credit on a map has one line
and a reader who wants the entry has the references.

The receipt asserts the citation **as fields**, not as a rendered string, with one
`dcterms:creator` per author. A receipt recording only `Snow J. On the mode… 1855.` would be the
free-text problem one layer down, and a reader could not re-render it in their own style.

## What this does not establish

- **That the three styles are correct.** They are encoded from the three manuals named in
  `CITATION_STYLES` and checked against two records — a single-author book and a two-author
  dataset. No style authority has reviewed them, and the article, chapter and webpage paths have
  unit coverage but no worked example behind them.
- **That any shipped input carries a citation.** The field exists; adoption is separate work and
  the example's inputs are updated in a following commit. Until then every `citationGaps` call over
  shipped data returns the free-text message.
- **That italics are handled.** APA and Chicago italicise a standalone title and this project has
  no rich-text channel for a provenance string. `renderCitation` emits plain text; the title stays
  a field so a caller that has rich text can italicise it.
- **That a citation is true.** It records what an author declared about a work. Nothing checks that
  the work exists, that the year is right, or that the data came from it.

## What would close it

1. Every shipped input carrying a citation, with a validator that refuses a bibliographic origin
   recorded only as a sentence.
2. The notes UI reading `renderedCitations` instead of hand-parsed fields, so the picker is fed by
   the model.
3. A reference ordered by `published` — the literature-review ordering asked for on 2026-10-27,
   which is still unavailable because no shipped input fills the field.
