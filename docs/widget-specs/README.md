# Widget specifications

_Created 2026-10-15 · Updated 2026-10-20_

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

## Finish a widget's surfaces when you touch it

The standing rule, stated 2026-10-20: when work changes a widget, do these in the same pass. The
understanding is already loaded, and nobody comes back for them afterwards.

1. **Trim its Inspector panel** to the controls plus a line. Measured that day: 11,838 characters
   of explanatory prose across 80 paragraphs sat in the Inspector while 49 of 53 widgets had no
   manual page. Those are one fact — the explanation went where it was easy to put rather than
   where a reader looks, and the manual stayed empty because the Inspector was absorbing its job.
   A widget whose Inspector explains itself at length is a widget whose manual was never written.
2. **Write or update its page in [../widgets/](../widgets/)**, run `npm run manual:widgets`, and
   lower the ceiling in `widgets/manual-coverage.json`. It may fall freely and never rise.
3. **Add its validation-lab notebook** and its `widgets/parity.json` entry, with a `diveDeeper`
   heading where the notebook carries one. The lab is the separate `digital-twin-ph/validation-lab`
   repository and `widgets/parity.json` pins the commit it is checked against, so a notebook added
   there needs the pin moved here.

Where the material goes is the same split this file already describes: controls in the Inspector,
the practitioner's understanding in the manual, the measurements and the history here.
