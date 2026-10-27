# Relate a column from another table

_Created 2026-10-26 · Updated 2026-10-27_

**A join, narrowly.** It takes two tables that share a column, and brings a *category* from the
second one onto the rows of the first.

## What it does

Two tables often describe the same subjects and carry different things about them. John Snow's
Table VIII gives each of 32 South London sub-districts its population and its cholera deaths;
his Table XII gives each of the same 32 sub-districts the company that supplied its water. Neither
table alone can answer *how many people died in the sub-districts supplied by one company*, and
until this widget existed the application could not put them together — so the example repository
carried that answer as a table somebody had computed by hand.

Relating Table XII's `water_supply` onto Table VIII gives every row a supply category. Nothing is
added up yet; that is the next step.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | the table being added to |
| **related** | the table being read from |

Both are tables. The order matters: the first keeps its rows and gains a column, the second is
only read.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Matched on** | the column both tables carry, such as `sub_district` |
| **Bring across** | the second table's column to add, such as `water_supply` |

### Why it brings a category and not a number

A table in this application is **long**: it has key columns, which hold labels, and one value
column, which holds numbers. A water supply company is a label, so it can only arrive as a key
column — and a key column lands on every row, which is why **the row count does not change.**

Bringing *numbers* across would mean adding rows instead, and that is a different operation with a
different way of going wrong: two tables can disagree about the same measure. It is not built.

## Reading what you get

The same table with one more column, and a receipt stating the matched column, the column brought
across, how many rows were related, how many were dropped, and the distinct values that actually
landed — which is what you need to see before grouping by it.

## What it will not do

- **It will not choose between two answers.** If the second table gives one key two different
  values of the column being brought across, this refuses and names the key. Taking the first
  would produce a grouping that is wrong in a way no total reveals, and the ambiguity is usually
  telling you the key does not identify what you think it identifies.
- **It will not invent a category.** A key the second table has no row for is **reported by name**
  and those rows are dropped. Filling in "unknown" would put a stratum in your table that nobody
  measured.
- **It will not match approximately.** The match is on the exact string, after trimming. A
  sub-district spelled differently in two sources will not match, and this is Epi Info's `RELATE`
  rather than its `MATCH`, which is a different problem.
- **It will not tell you the two tables describe the same subjects.** That is your judgement. The
  widget checks that the keys line up, not that they mean the same thing.

## Where it is used

The South London example: *Died or survived, by water supply*.

## How it was checked

Validation Lab check **28**, `28-relate-table-vs-pandas.ipynb`, against a pandas left merge of
Snow's Table XII onto his Table VIII. There is no arithmetic to check, so what was recomputed is
the matching: the same category on the same row, the row count unchanged at 64, and the same rows
dropped and named when a sub-district is withheld.

The case worth an outside eye is the ambiguous key. A merge resolves it by **multiplying rows** —
66 rows out of a 64-row table — so the sub-district's population would appear under both companies
with no total revealing it. This refuses instead, and the check records the merge's row count as
the measure of what the refusal prevents.

What it does not reach: Snow's two tables spell every sub-district identically, so a name
differing by punctuation or case — the case you will actually meet — is never exercised.
