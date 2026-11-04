# 175 · How large a table: finding the limit rather than choosing it

_Created 2026-11-04 · Updated 2026-11-04_

**Status:** tried — tables moved to the dataset store; the size measurements are not yet run.

## The task

The remote sensing plan for NYC ([research note](../research/eo-stac-nyc-architecture-and-plan-2026-11-04.md)) needs a
table of seven measures over 3,653 days, 25,571 rows; Fieldwork caps a table at 20,000. The practitioner, 2026-11-04:
*"That means we have to increase the cap"*, *"We need to move tables to IndexedDB"*, and *"That is why this is a DE
project. It's not about limits. It's about discovering what those are."*

So this does not choose a new number. It removes what made the old one necessary, then measures where the
application stops coping, and the cap follows from that.

## What held the cap: rows stored inside the saved workflow

A Table input kept its rows in its parameters, and the workflow is saved to the browser's local storage, about 5 MB
for everything. Every other input's data was already kept once in the dataset store (IndexedDB) by digest, with the
workflow holding a reference (`dataRef`); Table input never was. The same day, NYC's 92-column wide read failed to
save for this reason.

**Done:** a table's rows are now kept in the dataset store under a content key, `table-<rows>-<64-bit hash>`, set on
every save. The key is synchronous because a save is; it is recomputed every save rather than cached by object, since a
table edited in place would otherwise keep a key that no longer describes it. A fetched table with no rows on the device
has nothing to keep and no reference. Exports are unchanged: they carry the table inline, as before.

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `tests/table-in-dataset-store.browser.mjs`, Chromium | 5,000 rows: the saved workflow holds `table-5000-…` and no rows, under 20 KB; after a reload the table is whole and runs |

## What is to be measured

Sizes of 25,571, 100,000 and 250,000 rows, through the steps the NYC plan uses. For each, the first step that fails or
slows past use, the size, and the browser:

| Step | What is timed or watched |
| --- | --- |
| Import | Parsing, the preview, the key check |
| Save and reopen | The content key on every save; IndexedDB write and read; a reload |
| Select rows, a range | Filtering and the Inspector's value list |
| Chart panels | The figure's point limit, 20,000 today |
| Regression | The kernel's row buffers, 20,000 today |
| Export | The project file's size limit |

Other ceilings met on the way: CSV reading stops at 20,000 records; a file is refused over 5 MB.

## Practitioner observation, written before the result

Whether a practitioner meeting a slow step reads it as the application failing or as the data being large, and whether
the message they get says which.

## What this does not establish

That a table of any size is usable in every widget. The measurements cover the steps the NYC plan uses.
