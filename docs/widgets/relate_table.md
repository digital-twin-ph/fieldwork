# Relate a column from another table

_Created 2026-10-26 · Updated 2026-10-28_

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
| **Compare keys** | folding punctuation and case, or exactly after trimming |

Everything else happens in **Open the join**, a dialog wide enough to show what you are deciding.

### Compare keys

Two sources spell names differently. Snow's own tables agree with each other, because both
transcribe the same book — but his sub-district names against the published boundaries match **23
of 32** exactly and **32 of 32** once punctuation is folded, and every one of the nine differences
is a single comma. So folding is the default, and the choice is recorded in the evidence.

Tighten it to **exactly** when a punctuation difference means two different subjects. Loosen it
when it means one subject written twice.

### The join, in the dialog

**Open the join** shows three things, and they change together as you choose:

1. **The shape of the join** — a bar of the keys only in the first table, in both, and only in the
   second. Keys, not rows: a table here holds several rows per subject, so counting rows would say
   that nine unmatched sub-districts are eighteen unmatched things.
2. **The effect on each numeric variable** — what each one totals over the whole table, over the
   rows that matched, and the share retained. Read this before anything else; see below.
3. **The Methods note** this step will machine, and a **preview of the table** that will travel on.

Then **Finalize**. Nothing is written until you press it.

### What the shares are telling you

If two variables keep different shares, the rows that did not match are **not a random sample** of
what you are measuring. On Snow's Table VIII against the published boundaries, 68.2% of population
is retained against 61.2% of deaths — so a mortality rate computed on the matched rows comes out at
**89.6% of its value over the whole table**, 2.787 per 1000 against 3.109.

That multiplier is arithmetic and not an estimate: a rate of one variable over another is
multiplied by exactly the ratio of their retained shares. It runs backwards too. If the figure you
expected and the figure you are looking at differ by that ratio, you are looking at a number
produced by a join you did not intend — and the shares say which one.

Had both variables kept the same share, the exclusion would cost precision and leave the estimate
alone.

### The rows that did not match

Where any key of the first table has no row in the second, **the step will not run until you say
what to do**. The two answers give different totals and the result cannot be read for which one you
got, so nothing here chooses for you.

| Choice | What you get |
| --- | --- |
| **Drop them** | only the matched rows, and the totals the shares describe |
| **Keep them under a category I name** | every row, and the totals of the whole first table |

Keeping needs a name, and it has to be yours — nothing here will invent a stratum the data never
measured, and a name already used by the second table is refused so that unmeasured rows cannot
join a measured group.

Your decision is stored with a signature of the gap it was made about. Edit either table, or change
how keys are compared, and the decision lapses rather than riding on data it was not made about.

### Why it brings a category and not a number

A table in this application is **long**: it has key columns, which hold labels, and one value
column, which holds numbers. A water supply company is a label, so it can only arrive as a key
column — and a key column lands on every row, which is why **the row count does not change.**

Bringing *numbers* across would mean adding rows instead, and that is a different operation with a
different way of going wrong: two tables can disagree about the same measure. It is not built.

## Reading what you get

The same table with one more column — and, on the step itself after a run, **what the join did**:

| Rows | What it means |
| --- | --- |
| **Offered** | the rows the first table brought in |
| **Related** | the rows that found a match and are in the result |
| **Dropped** | the rows that did not, and are not |

Read the dropped count first. A row that found no match is **absent from the table that travels
on**, so the result is internally consistent whether it holds all of your rows or two thirds of
them. The panel names the keys that did not match, so you can go and look at the second table
rather than only know that something is missing. Where nothing was dropped it says so, because
"none" is the claim you need and a zero in a table is easy to pass over.

Underneath, which table each column came from, and the distinct values that actually landed —
what you need to see before grouping by it.

Quick look at the output table repeats the column origins above each column heading, so a wide
related table says which half of the row came from where.

### The Methods note

This step machines a note for the **Methods** section of a write-up: what was brought from where,
on what key, compared how, how many keys appeared in both tables, and — where rows were
excluded — which keys those were and what share of each variable survived. A join is a thing you
did to the data, and the count of what it excluded is Methods prose in an epidemiology paper rather
than a limitation.

The dialog shows the note each choice would produce, so you can read the sentence before committing
to it. The run records it in the evidence.

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
