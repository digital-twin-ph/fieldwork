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
4. **Check its ontology mapping and what its receipt asserts.** Every `fw:` term a module emits
   must be declared in `ontology/`, and `npm run validate:ontology-coupling` gates that at zero
   undeclared — a new predicate added to a receipt and not declared fails the build, which is the
   intended cost. The release file's `ontology.emits` must equal what the definition actually
   asserts, so a widget that gains or loses a term and does not say so is caught. If the widget
   computes anything, it owes a receipt: what it used, what it produced, and the method, in terms
   the ontology defines. `scripts/audit-runtime-n3.mjs` parses a whole run's receipts and
   conclusions against the ontology and SHACL shapes, and the worked-example browser tests call it.
5. **Check the panel as a user-facing surface, not only as markup.** `tests/contrast.browser.mjs`
   measures WCAG 2.1 AA on what is actually rendered — the effective foreground after alpha
   compositing over the nearest opaque ancestor, 4.5:1 for normal text and 3:1 for large — in both
   themes, with `disabled-button-contrast` and `toast-contrast` covering the states that are easy
   to forget. A new control is reachable and operable by keyboard, and says what it is to a screen
   reader: a status that changes needs `role="status"`, an input needs a `<label for>`, and a
   button's accessible name is its text. The Inspector is 292px wide, so a control that only works
   at a comfortable width does not work.

6. **Check the default label names the widget.** The label a freshly added node carries is the
   first thing a practitioner reads about it, and it is where one example's specifics leak into the
   general thing: every Map was born called *Study area and points*, which is the heat example's
   label, so a Map added to a cholera workflow announced itself as a study area. The same leak as a
   widget named after one demonstration. `tests/default-labels.test.mjs` compares each constructed
   default against its own widget title; templates stay free to label their own nodes anything,
   because "250 death locations (489 deaths)" is a good label for one example's input and a bad
   default for every input.

7. **Check its catalogue entry is true.** The Widget catalogue is what a practitioner opens to ask
   *what is this and can I trust it*, and `src/catalog-ui.ts` assembles it from six files:
   `widgets/registry.json`, `release-notes.json`, `parity.json`, `classification.json`,
   `packs.json` and the definition in `core.ts`. A change that lands in the code and not in those
   leaves the catalogue describing the previous widget.

   In practice: the current release needs a `changes` entry saying what changed **in the words a
   practitioner would use**, because that text is rendered as *What changed in x.y.z*; the digest
   must match the file, which `validate:widgets` checks; `release-notes.json` must match the
   current releases, which `validate:release-notes` checks and `npm run notes:releases` fixes; and
   the parity entry's `coversRelease` tells the truth about which release was independently
   checked. Leaving that stale is right — it renders as *agrees · earlier release*, which is
   honest — but claiming it covers the new one is not.

8. **Bump the version and write the changelog, so the evolution is legible.** Two changelogs, and
   they are independent: the widget's own `changes` array in its release file, which is what the
   catalogue renders and `npm run notes:releases` compiles, and `CHANGELOG.md` for the
   application. The policy in [AGENTS.md](../../AGENTS.md) governs the second — MINOR for a new
   user-visible capability or a meaningful change to workflow behaviour, PATCH for fixes and small
   interface improvements, MAJOR reserved for an intentionally incompatible contract with a
   documented migration — and `npm version <x.y.z> --no-git-tag-version` moves `package.json` and
   the lockfile together, which is the only source of truth.

   A changelog entry carries the user-visible change, the migration effect, and the validation
   limits. Where a widget's contract changed, the release says `breaking` and names its
   `migrationFrom`, and an identifier that was renamed keeps resolving through
   `RENAMED_NODE_TYPES` so a saved workflow opens.

   The failure this guards against is specific: on 2026-10-20 `package.json` read 0.10.0 while the
   newest section in `CHANGELOG.md` was 0.9.0, so an entire version's worth of user-visible change
   existed only in commit messages. The version had moved and the account of it had not.

Where the material goes is the same split this file already describes: controls in the Inspector,
the practitioner's understanding in the manual, the measurements and the history here. What the
widget asserts goes in the ontology and the receipt, which is the only place a claim survives the
session.
