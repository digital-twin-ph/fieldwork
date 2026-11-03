# 165 · A reference is cited from its note

_Created 2026-11-02 · Updated 2026-11-02_

**Status:** tried — the Citations tab, the markers and the assembled References are built and exercised by
the Nigeria example. No practitioner has written a report with it.

## The task

The practitioner, 2026-11-02, with a Methods note whose sentence carried "(Croft et al., 2023)" typed by
hand: *"The citation from the authored note should be built within the note by a citation builder (could be a
tab). So the inline citation does not have to be authored like in this note but be automatically attached
when the note is rendered and the citation automatically shows up in the References."*

And then: *"There should be no References notes. A Reference entry is there because there is an entry in the
main body (any IMRAD section) where provenance is known - that's the citation builder's purpose."*

## What was built

- **A Citations tab in the note dialog.** A work is built from fields: kind, authors, title, date, journal,
  volume, issue, pages, publisher, place, DOI, URL and date accessed. The fields are `Citation`'s, already
  used for inputs, so `citationGaps` says what is missing and the work cannot be added until nothing is.
- **A marker where the note renders**, numbered as References lists the work, so a work cited by two notes
  carries one number in both. Vancouver, the project's citation style, so `[1, 2]`.
- **References assembled from what is cited**: works the notes cite first, then input sources, then methods.
  It has no **+ note** button, References is not offered as a note's section, and a note cannot be dragged in.
- **"et al."** became a field. The DHS Guide's own recommended citation names three authors and "et al.", and
  the full list is defined nowhere, so listing three would have presented them as all.

## Correcting a citation, 2026-11-03

The practitioner: *"I should be able to edit existing citations in case there is an erroneous entry. So there
should be an edit button in addition to remove."* Each cited work now has **Edit**, which puts it back in the form
as entered; the button reads **Update citation** until it is saved or cancelled.

## What changed in the example

Nigeria's seven References notes are gone. The seven body notes that relied on them cite their works through
the tab, and their sentences no longer carry citations typed by hand. A note that named a work in its prose
("in a 2022 study") still does: the marker says which, and the prose says why it matters.

## What this does not establish

- That one style suits every venue. In-text form follows the project style; choosing APA's author-year is not
  offered.
- That a reader finds a marker at the end of a note precise enough. A note citing three works for three
  claims marks all three at its end.
- Citing a single work quickly. Every citation is typed in full; nothing looks a DOI up.
- What happens to References notes in projects made before this. They still render, under References, and
  can be moved to a body section; nothing converts them.
