# 166 · Append rows, and relate as a merge

_Created 2026-11-03 · Updated 2026-11-03_

**Status:** tried — `append_rows` is built and used by the Salmonella example. Relate as a merge is designed below
and not built.

## The task

Building the Salmonella example (Łuczyńska et al. 2023), the paper's comparison is 32 cases against 81 panel
controls matched on sex and age group. The 81 are in a second file with the same 82 columns as the complete one.
No widget could produce cases plus those 81: relate refuses a column the first table already has, and one select
keeps one set of values of one column.

The practitioner, 2026-11-03: *"think about how pandas merges dataframes - relate or append"*, then *"Proceed"*.

## What pandas separates, and what was missing

| pandas | Fieldwork | Missing |
| --- | --- | --- |
| `concat`: rows stacked, columns lined up by name | nothing | the operation |
| `merge`: columns added on a key | `relate_table` | suffixes for shared names, and `indicator` |

## Design audit, `append_rows`

- **D1.** A practitioner asks for it by name ("add these rows", "stack the two waves"). It does not decompose into
  anything that exists.
- **D2.** Nothing existing does it. `stack_polygons` gathers layers to draw, not rows of a table.
- **D4.** Both inputs are `table`. No new port type: a wrong producer is a table that measures something else, and
  that is found from the tables themselves at run time.
- **Distinctions, and how each is enforced:**
  - *Two tables that measure different things are not one table.* Different value columns, or different units,
    stop the step at run time, naming both.
  - *A column one table does not have is unknown on its rows, not empty-and-known.* The rows keep an empty value and
    the receipt names the column and how many rows lack it. A limitation, stated.
  - *Where a row came from is a fact worth keeping.* An option in the Inspector adds a column, named by the
    practitioner, with a label for each table, as pandas `concat(keys=...)`. Its name may not be a column either
    table has: a run-time check.
- **D10.** The Salmonella example's second workflow.

## Keys after stacking, 2026-11-03

The practitioner, reading this record: *"naming the source of rows should be an option in the Inspector. If
primary keys will become duplicate for many rows from appended tables, there should be an Inspector option to
create a new primary key, keep the old primary key so the source and old primary key can still be a primary key
aside from the new one."*

Built: **Name the source of each row** is a checkbox. **Create a new primary key** numbers the rows and becomes the
primary key; the old key column stays, and with the source named, source and old key are declared an alternate key,
unique as the primary key is. A table can now hold `alternateKeys`, each checked for repeats as the primary key is.

## Relate as a merge, not built

Shared column names would get suffixes the practitioner chooses, in place of today's refusal, and an optional
indicator column would say which rows matched (`both`, `left only`), as pandas `merge(indicator=True)`.

## What this does not establish

- That appending two tables is honest. Two surveys with different questions stack without complaint if their value
  column has one name.
- That a numbered key means anything outside this workflow. It is assigned in row order and changes if either table
  changes. Each table's own findings are not carried; repeats are looked for on the stacked table's keys only.
