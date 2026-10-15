# Widget specifications

_Created 2026-10-15 · Updated 2026-10-15_

What a widget assumes, what has been measured about it, what it works around and what changed
when. For the people building Fieldwork and for the record of how it got here.

**This is not the manual.** The manual is one page per widget in [../widgets/](../widgets/),
compiled into the application and shown behind the *Manual for this widget* button. It is for
the person using the widget: what kind of widget it is, what it does, what to connect, how to
use it, which worked examples exercise it, and what it will not do — in plain words, with no
dates, no audit trail and no revision history.

The split was made on 2026-10-15, on the practitioner's instruction:

> The manual should not contain historical / audit / revision history text. It's for the human
> user, not developers or agents, it should be as plain language as possible and focus on
> understanding what the widget is (e.g., type - input, process, output, what it does, ports)
> and how to use it and point to worked examples that exercise it.

A widget that does not exist yet is specified here and has no manual, because there is nothing
to use — `find_building_footprints.md` is the first of those. A manual page for an unregistered
widget is refused by `validate:manual` as an orphan, which is the right refusal: a page in
[../widgets/](../widgets/) is a promise that the thing is in the palette.

`validate:manual` enforces it from both sides: a manual page must carry **What it does**, **How
to use it** and **What it will not do**, and must not carry a dated change note, a quotation, a
link into `docs/experiments/` or a blocker name. A manual may link here once, at the end; the
compiler strips that line, and the repository's own date stamp, on the way to the page.
