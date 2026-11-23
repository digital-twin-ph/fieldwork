# Where the internal long table is presented as the practitioner's

_Created 2026-11-23 · Updated 2026-11-23_

**Status:** first pass, 2026-11-23. Every surface that reports a count, a column list or a shape derived from a wide
file's melt, found by reading the source. Nothing is changed by this audit.

Two findings, from the practitioner on 2026-11-23. The first is a number that can be read as a finding and is wrong
for the question asked. The second is the cost of being made to hold two shapes at once, which they called
*"high frequency confusion"*.

## What was found, and why it is dangerous

A wide file is melted on the way in: one row per subject becomes one row per subject per variable. The African Bat
Database's **18,409 records** became **92,045 rows**, five per record, because five numeric columns were taken as
variables.

The practitioner, 2026-11-23: *"UI surface should present wide as that's how epidemiologists read line list. They
would not care that columns get melted internally but externally it would not make sense to them."* Then, pressed:
*"And could be a dangerous interpretation."*

It is, and the danger has a precise shape. **The number is true of the internal long table and false of the thing its
reader takes it for.** An epidemiologist reading a line list maps "rows" to "cases". No check that a stated count
matches its object would catch this, because the count does match the object the application holds. What is wrong is
that the object is not the one the practitioner supplied, and the surfaces that report it no longer say so.

The melt itself is disclosed where it is chosen. It is not disclosed anywhere after.

## Where the melt is disclosed, and honestly

| Surface | What it says |
| --- | --- |
| Import dialog, reconcile (`data-table-ui.ts:525`) | "18,409 subjects × 5 variables = **92,045 cells**, which is what the table above holds" |
| Import dialog, status (`data-table-ui.ts:539`) | "18,409 subjects × 5 value columns = 92,045 rows, 6,544 values absent" |
| Import dialog, As stored (`data-table-ui.ts:310`) | "92,045 rows, **one per** *keys*, each with its *value*" |
| Crosstab note (`table-viewer.ts:235`) | "N *subject*, with *attributes*, and K variables in *unit*. **M values in all**" |
| The import step's N3 (`data-table.ts:350`) | `fw:readAs "wide"`, every `fw:subjectKeyField`, every `fw:meltedValueField`, `fw:meltedValueFieldCount` |

The N3 carries its own reason: *"A receipt that recorded only the long result would describe a table the file does not
contain."* The principle is already stated in the code; it is the later surfaces that do not keep it.

## Where it is not disclosed

| # | Surface | What it says | Reaches |
| --- | --- | --- | --- |
| 1 | Tabular data's Inspector Result (`data-table-ui.ts:1281`) | "92,045 rows, 6,544 values absent and kept as unknown" | screen |
| 2 | Table meta line (`data-table-ui.ts:1195`) | "N of 92,045 rows" | screen |
| 3 | Rows-shown line (`data-table-ui.ts:315`) | "50 of 92,045 rows shown" | screen |
| 4 | Results metrics (`app.ts:3410`) | "**92,045** rows · **6,544** values absent" | screen |
| 5 | Table viewer note (`table-viewer.ts:245`) | "92,045 rows in all" | screen |
| 6 | Relate's preview (`relate-ui.ts:310`, `:360`) | "N rows, every one kept. This is the table the next step reads" | screen |
| 7 | **Write-up prose** (`artifact-notes.ts:85`) | "92,045 rows, keyed by …" | a document a reader cites |
| 8 | **The artifact's receipt** (`artifact-notes.ts:212`) | `fw:artifactRowCount 92045` | machine-readable provenance |
| 9 | **The table's own N3** (`data-table.ts:341`) | `fw:tableRowCount 92045` | machine-readable provenance |

Rows 7 to 9 are the serious ones: the count leaves the screen, where a reader could at least open Configure… and find
the arithmetic, and enters prose and provenance, where it stands alone.

The other counts on those lines are in the same units and inherit the same problem: `missingValueCount` counts melted
cells, and the repeated-key findings are counted over melted rows (207 for the bat database, against 69 if the
coordinate columns are carried as keys).

## The shift of perspective, at every table step

The practitioner, 2026-11-23: *"This may be the reason why some configuration dialogs for tables are hard to read. I
may be able to make sense of what's in those dialogs because I know long and wide but it has been frustrating to shift
perspective from wide to long frequently."* Then: *"High frequency confusion."*

The columns a file was read from are chosen once, in the file's own shape. Every dialog after that is handed the long
table's columns instead: `tableKeyColumns` returns `node.params.data.keys` for a `table_input` (`app.ts:903`), and six
more modules read `.keys` from the stored table directly.

| Where the long columns are offered | Module |
| --- | --- |
| Select rows by value | `select-ui.ts` |
| Relate a column from another table | `relate-ui.ts` |
| Total within groups | `group-ui.ts` (through `tableKeyColumns`) |
| Chart | `chart-ui.ts` |
| Map | `map-ui.ts` |
| Table output | `table-output-ui.ts` (through `tableKeyColumns`) |
| Deduplicate records | `deduplicate-ui.ts` |
| Point data, from a table | `app.ts:2109` |

So the shift is not occasional: it is forced at **every** table step, which is what makes it high frequency. Three
things change under the practitioner's feet between the import dialog and the next one:

- **Columns that were in the file are gone.** The bat database's `Latitude`, `Longitude` and `Year` were taken as
  variables, so they are not columns any more. Point data's picker listed neither — the practitioner, 2026-11-23:
  *"Latitude and Longitude does not show up on the point table so it cannot be picked."* That is this finding met in
  the course of ordinary work, not a hypothetical.
- **Columns the file never had are offered.** `measure` and `value` appear in the pickers. The import dialog labels
  `measure` honestly where it first appears — *"(made by this read: the names of the value columns taken)"*
  (`data-table-ui.ts:334`) — and no later dialog repeats that.
- **The import dialog itself holds both shapes at once:** Before shows the file wide, After shows it long, and the
  words for the choice — **Key columns**, **Value columns**, **Wide**, **Long** — are the long table's words for a
  decision about a wide file.

## What is not affected

- **Point data** reports records, one per row of the file: "18,409 point records · 0 missing locations". No melt.
- **A file read long** states a count that is already one row per observation, which is what the file holds.
- **A table whose long shape is the data** — the population example's 30 districts × 4 sources = 120 rows — counts
  what a reader would count. The melt is not wrong there; it is the file's own shape.
- **Computation.** Every step that reads the long table reads it correctly, one row per subject per measure. What is
  misreported is the count, not the arithmetic over it.

## What this audit does not establish

Whether any shipped worked example's notes or receipts carry a melted count that a reader has already taken for a
record count. The examples were not re-read for this pass. Whether the melt should happen at all for a line list is a
separate question, raised by the practitioner the same day and not settled here: a line list's columns are attributes
of one record, not repeated measures of one variable, and `pointsAsTable` already reads such a shape with every column
carried and no value column.

## What followed

The practitioner settled the direction the same day: *"All user facing table artifacts should be presented wide, not
long, including show me how."* Registered as `tables-are-presented-wide` in `docs/directions.json`.

**Closed in 0.174.0**, the dangerous half of the first finding:

- A count says what it counts. `recordsOf` counts one row per record from the subject keys the melt declared, and the
  Inspector's Result, the results metrics and the write-up's prose state records where the table arrived wide. The bat
  database reads *18,409 records* where it read *92,045 rows*.
- The receipt asserts `fw:tableRecordCount` beside `fw:tableRowCount`, never in place of it: both are facts about the
  same table, and dropping one would hide the melt rather than disclose it.
- A coordinate column is read as a key, so the columns a file was read from reach the steps after it (Tabular data
  0.19.0), and Point data proposes them (0.15.0).

**Open.** Rows 2, 3, 5 and 6 of the table above still state a count in long rows: the table meta line, the rows-shown
line, the table viewer's fallback note and Relate's two previews. `fw:artifactRowCount` in a write-up artifact's
receipt is still the long count alone, because that artifact is not a `DataTable` and does not carry the melt's
declaration. The eight dialogs still offer the long table's columns, which is the high-frequency confusion and the
larger part of the direction. Whether a line list should melt at all is untouched.
