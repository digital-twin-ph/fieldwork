# 191 · Shares within groups

_Created 2026-11-08 · Updated 2026-11-08_

**Status:** tried (Fieldwork 0.62.0, 2026-11-08). Total within groups 0.3.0 gives each group's share of a total, and is
on the standard Inspector and dialog ([186](186-one-standard-inspector.md)). The Sierra Leone table it was built for is
not yet made.

## The question

The Sierra Leone measles classification ([189](189-a-measles-line-list-made-safe-to-teach-with.md)) puts 368 rows in
*clinically compatible* on the clinician's word where the recorded symptoms do not meet WHO's definition. The
practitioner, 2026-11-08, choosing to accept them: *"explicitly show in an analysis table the proportion without
symptoms but clinician classified."* Measured outside Fieldwork, by a script over the file: 238 of the 368 (64.7%)
had no symptom recorded, 130 (35.3%) some.

No widget gives a share. Total within groups counts rows by group; a share needs the count divided by a total. Built
from existing widgets it is four steps: count by both columns, count again by one, relate the two, divide in a
ruleset. The practitioner chose to extend Total within groups instead (2026-11-08), and: *"So the widget gets the
standardization love too."*

## The proposal

| Setting | What it decides |
| --- | --- |
| **Add each group's share, %** | Off by default. Offered with *Sum* and *Count rows*, where adding up has a meaning; not with *Minimum* or *Maximum* |
| **Share within** | The kept columns whose groups each total 100%. None ticked: the share of the whole table |

**Counts and shares in one table.** A Fieldwork table holds one number per row. The result gains a key column,
`statistic`, whose rows are the count (or sum) and the share, declared on the table so the view shows them side by side
as two columns. It reuses the wide shape [188](188-rules-that-compute-and-show-their-table.md) declared, marked to be read
in the order the columns were kept.

**What it will not do:**

- **Share a group whose total is unknown.** A sum over an empty cell is unknown (the step's rule since 2026-10-31);
  every share in that group's stratum is then unknown too, and named.
- **Round beyond one decimal place.** The share is held to one, because the table view prints numbers as held; so a
  stratum can total 99.9 or 100.1.
- **Share a minimum or a maximum.** They do not add up to a total.

**The standard (186):** the Inspector has the six sections and one sentence; keep, aggregate, empty cells and shares
move into the Configure… dialog, whose preview is the table the draft would make. The controls keep their ids, so the
Brazil and NYC manuals change only by opening the dialog and applying.

**Found while building the lab's fixture:** the key column was first called `measure`, and South London's table
already has one, population or deaths, as many melted tables do. Fieldwork refused to add the share. It is called
`statistic` now: its values are a count's name and a share's, which is what the word means to an epidemiologist.

## Validation it commits to

- Unit: shares within a column and of the whole table; each stratum totals 100; an unknown sum gives unknown shares;
  refused with Minimum or Maximum and when every kept column is a *within* column.
- Browser (Chromium locally, WebKit in CI): the dialog's preview, Apply, and the two columns side by side.
- The Brazil and NYC manuals build their projects from an empty canvas against the new dialog.
- On the Sierra Leone file, inside Fieldwork: 238 (64.7%) and 130 (35.3%) of the 368.

## Validation record, 2026-11-08

| Check | Result |
| --- | --- |
| Unit, `tests/shares-within-groups.test.mjs` | 6 pass: within a column, of the whole table, one decimal place, the view's two columns, an unknown stratum, the refusals |
| Browser, `tests/shares-within-groups.browser.mjs` | passes in Chromium: six sections, the dialog's preview, Apply, Cancel writes nothing |
| Brazil and NYC built from an empty canvas by their manuals | pass in Chromium, after the manuals open the dialog |
| Validation Lab check 39, against pandas | agrees in CPython 3.13.3 and in Pyodide: every total and share exact on South London's table, the emptied stratum unknown |

**Found while running the manuals:** the dialog first read only the box that changed, and a manual's step ticks
several at once. The run then refused with no columns kept. Every box is read on any change now, as the Inspector
did.

WebKit runs in CI. **Not yet:** the Sierra Leone figures (238, 64.7%; 130, 35.3%) inside Fieldwork.

## What this does not establish

That a share is the measure a reader needs: a proportion of rows is not a rate, and has no denominator of people
unless each row is one person.
