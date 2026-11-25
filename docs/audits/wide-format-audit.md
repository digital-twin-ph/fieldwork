# Audit — tables in the shape a reader expects

_Created 2026-11-25 · Updated 2026-11-25_

The practitioner, on finding the data quality dialog showing a wide table in its melted form: *"I noticed that the
Data Quality display of this table reverted to the long format, which my cause confusion when both wide (the user
preference) and long (internal) formats are used in different places. We decided that all user-facing tables should
be presented wide (line list format)."* Then, asked how far to take it: *"We should decrease the friction for the
user, which means consistency in user-facing views of the tables. We can be efficient using long formats but will
result in cognitive dissonance in the user."* Then: *"Let's review all table related widgets, make sure all
user-facing views present tables in wide format."*

The evidence is the source as it stood on 2026-11-24. Nothing was run to produce the inventory.

## The rule, and why melting exists at all

A line list has one row per record and the file's own columns. Fieldwork melts a wide table internally — one row per
value, with `measure` and `value` columns it invents — because the steps downstream are written against that shape.
The melting is an efficiency, and `measure` and `value` are names Fieldwork gave the table, not columns anybody read
off a file. A surface showing them is showing the reader the machine's convenience.

## What renders a table

Thirty modules render table rows. Most never see a melted table: a facility list, a catalogue, control points, a
two-by-two, a walkthrough's made-up tables — all are one row per record by construction. The thirteen that render a
`DataTable`, which is the only thing that can arrive melted, are the subject here.

| Surface | Before | Now |
| --- | --- | --- |
| Quick look (`table-viewer.ts`) | wide, via `wideFrame` | unchanged |
| Tabular data's preview (`data-table-ui.ts`) | wide, via `wideFrame` | unchanged |
| Relate's preview (`relate-ui.ts`) | wide, and says why when it cannot be | unchanged |
| **Data quality (`app.ts`)** | **melted** — the report | **wide**, via `wideFrame` |
| **Join to the study area (`area-join-ui.ts`)** | **melted** | **wide**, via `wideCells` |
| **Detect unusual counts (`detect-ui.ts`)** | **melted** | **wide**, via `wideCells` |
| Append rows (`append-ui.ts`) | melted | **left as it is** — see below |
| `column-matches`, `two-by-two-mapping` | — | not row views: distinct values for a picker |
| `series-rate-ui` | — | already branches on `wide`; its table is one row per group |
| `long-tables` | — | scrolling, not shape |

## One reconstruction, not several

`wideFrame` already existed and is what Quick look and the Tabular data preview read. It widens any melted table, not
only one a file declared wide, and it handles the awkward cases — a declared reading order, numeric keys that must
never become an axis, ragged tables with a missing cell.

The first attempt at the data quality fix rebuilt the shape a second way, from the declared `wide` read. That would
have let the dialog and the table view disagree about the same table, which is the dissonance one level down. It was
removed. `wideCells` wraps `wideFrame` and returns text, so each surface keeps its own markup — the alignment grid in
Append rows, the scroller in Join, the plain table in Detect — and only the shape is shared.

## The edits, which is where this could have gone wrong quietly

The data quality dialog's Records tab is editable, and `applyTableEdits` keys an edit by `row N` in STORED order and
by the stored column. Presenting the file's shape without translating would have written edits against coordinates
that can never match a row: the dialog would have looked right and editing would have stopped working. Worse than
the inconsistency it set out to fix, and invisible until somebody tried to correct a value.

So `wideFrame` now carries, for each displayed row, which stored rows it came from — `cells[i]` for the row behind
each value, `rows` for every stored row of the subject. A value cell is one edit on the value column; a subject or
attribute cell is one edit per stored row of that subject, appended together.

**It closes a defect nobody reported.** In the melted view, editing a subject's name on one of its rows renamed that
row alone and silently split the subject in two. In the wide view the correction necessarily reaches all of them.

## Append rows is left melted, deliberately

Its Before is not a table view. Each header carries how that column will be stacked — *"stacked as X"* — and the
whole point of the panel is to line up columns between tables that name them differently. The stored columns are its
subject, and widening it would destroy the mapping it exists to show.

This is the one place where the rule is not applied, and it is recorded here rather than quietly excepted. If the
practitioner reads it as an inconsistency anyway, the answer is probably a wide preview BESIDE the alignment grid
rather than instead of it.

## Widened only where Fieldwork did the melting

The first version of the data quality fix called `wideFrame` on every table, for consistency with the table view.
The gate refused it: `data-dictionary.browser.mjs` lost the column `class`, because that table is long IN THE FILE
and widening pivoted a real column — one somebody wrote and described — into headings, in the very tab where a
column is checked against what a dictionary says it means.

So the dialog widens only where `DataTable.wide` is set, which the melt itself writes. It is present exactly when
the shape a reader expects is the wide one, and absent when the file really is long.

**This audit had already warned of it** — the closing section says `wideFrame` widens more than it is asked to — and
the warning was written here and ignored one function away. The gate caught what the author did not.

**It leaves a divergence, and it is recorded rather than hidden.** Quick Look widens a natively long table on sight,
which is what it is for (the practitioner, 2026-10-27: *"pandas does not show you a long table"*). The quality
dialog now does not. For a table long in the file the two therefore disagree — the original complaint, one dialog
over. Closing it is what the practitioner asked for next: a wide reading DECLARED on the table, offered where it is
noticed and cascading to every surface, so that one decision governs all of them instead of each surface guessing.

## What this does not establish

That no surface anywhere shows a melted table. The inventory covers modules that render rows from a `DataTable`; a
surface that receives rows already shaped by a caller — the write-up's figures, for one — shows whatever it is given,
and is only as wide as its caller. Nor does it establish that `wideFrame` widens every table a practitioner would
want widened: it returns null for tables it cannot read confidently, and those still show as stored, which Relate
already says out loud and the others do not.
