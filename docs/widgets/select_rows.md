# Select rows by value

_Created 2026-10-26 · Updated 2026-10-26_

**A selection.** It keeps the rows whose chosen column holds one of the values you name, in the
order you name them, and drops the rest.

## What it does

What a figure should show is often less than what a table carries. After *Derive a value* computes
`houses without a death`, Snow's Table IX holds three measures — `houses`, `deaths` and
`houses without a death` — and only the last two belong in a 2×2, because `houses` is the **total
the other two partition**. Leaving it in gives the grid a third column and a totals row that counts
every house twice.

Keeping `deaths` and `houses without a death` leaves exactly the 2×2, and its totals come out as
the houses supplied.

## What you connect

**records** — a table. It gives back the same table with fewer rows. Key columns, value field and
unit are unchanged, because selecting rows does not change what a table measures.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Key column to choose by** | Which column the values belong to. |
| **Values to keep** | Ticked from the values on offer, or typed one per line. |

**Order matters.** The rows come out in the order you name the values, so a 2×2 reads the way you
asked for rather than the way the file happened to be written. Unticking a value and ticking it
again moves it to the end, which is how you reorder without a second control.

## What it refuses, and why

**A value the table does not hold is reported, not ignored.** Asking for a row that is not there is
usually a typo, or a table upstream that changed. Quietly returning fewer rows than you asked for
is how a figure loses a category nobody noticed.

**Keeping nothing the table holds is refused** rather than handing back an empty table.

## What it will not do

It will not tell you whether what you kept is a fair selection. Dropping the categories that
disagree with you looks exactly like dropping a double-counted total. Decide which you are doing,
and say so where a reader can see it.

It will not add a value that is missing. Naming a value the table does not hold leaves it out and
reports it; it does not create an empty category to hold a place in a figure.

It will not change what the rows mean. The unit, the value field and the key columns are the
table's, and they come back as they went in.

## What this does not establish

That a selection is an honest one. Keeping a subset of categories is exactly how a figure
misleads, and this widget cannot tell a partition from a cherry-pick: it will drop the rows that
disagree with you as readily as the ones that double-count. The evidence records which values were
kept and how many rows went, so the choice is at least visible to a reader.
