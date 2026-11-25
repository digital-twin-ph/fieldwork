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

## The rule, settled (2026-11-25)

The inventory above left a boundary unsettled, and it cost something. Two things can make a table wide:

1. **A record on the table.** The melt writes `DataTable.wide` for a file that arrived wide, and *Always show this
   table wide* writes the same field for a table that arrived long. Either way the table itself says which key holds
   the measure and which keys name the record.
2. **A guess.** `wideFrame` will read any long table as wide by taking the key with the most distinct values as the
   subject.

The rule is now: **a user-facing view widens on the record, never on the guess.** The guess survives in exactly one
place, Quick Look, where the reader is told the shape is not the table's own and can settle it — and that settlement
becomes a record, which the views below then follow.

This was not uniform before. The data quality dialog was gated on the record in 0.195.0, but only because the gate
caught it pivoting a data dictionary's `class` column into headings — a file whose long shape is its real shape.
`wideCells`, which draws the *Before* panel in Join and the preview in Detect, was left widening unconditionally, so
the same file was pivoted there. **GitHub Copilot, reviewing the incoming commit, found that gap and noted that no
focused test covered it.** Both are now closed: `wideCells` honours the record, and
`tests/wide-two-subjects.test.mjs` asserts the dictionary case in the shape of the defect.

## What this does not establish, continued

That the record is always right. A reader can declare a wide reading that reads badly, and nothing here argues with
them; the point of the rule is that the table carries one answer rather than each surface inventing its own. Nor
does it settle *Total within groups*, which strips `wide` from its output deliberately — a total over a group is not
the melted file, and whether the reading should survive that step is still open.

## Two defects the one rule introduced, and what found them (2026-11-25)

Reading a melted table on its recorded key is right, and it broke two things the heuristic had got right by
accident. Both were caught by the **release gate on the worked examples**, not by a unit test and not by this audit:

- **The record names some keys, not all of them.** `declaredFrame` used the recorded subject keys and the measure key
  and ignored the rest, so a key acquired after the melt — `water_supply`, brought onto Snow's South London table by
  Relate — left the frame entirely. A leftover key is now placed by what it does: one value per subject is an
  attribute column, and one that varies within a subject belongs to the record's identity.
- **Two rows with the same keys were one row.** The dengue example's *Before* note read 92 greyed of 4,784 where the
  file holds 4,876 rows and 184 fall outside the selected range. The file repeats the week of 2024-12-29 for every
  one of Rio de Janeiro's 92 municipalities, byte for byte, and the pivot absorbed each pair. That duplication is a
  finding — it is what the example teaches at that step — and a view that merges it reports a cleaner file than the
  one the practitioner has. A row whose cell is already filled now opens a new record.

The second is the one worth remembering: the gate reported a *number*, 92 where 368 was expected, and the shape had
legitimately changed, so adopting the new number was defensible and wrong. The file's own row count settled it.

The same overwrite was then found in the heuristic path, which groups on the subject alone and admits numeric
attributes without asking whether they describe the subject. Fixed with the same rule, in the same pass.
