# Total within groups

_Created 2026-10-26 · Updated 2026-11-02_

**Addition, or a count.** It takes a table, keeps the key columns you name, and adds up the values
of every row that agrees on them, or counts those rows.

## What it does

32 sub-districts, each with a population and a death count, each belonging to one of three water
supply categories. Totalling within the supply category and the measure turns 64 rows into six:
the people and the deaths in each category. That six-row table is a contingency table, and it is
what the next steps turn into a two-by-two.


## Seeing what this step did

After a run, **View this table** at the top of the Inspector opens the output. **Before** and
**After** switch between the table that came in and the one that went out, and After says how many
rows and columns there were before.

## What you connect

**records** — any table.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Keep** | the key columns that survive. Rows agreeing on all of them become one row. |

### Why you name what is kept rather than what is dropped

Because files change. Name the columns you keep and a column added to the file later is simply
dropped, leaving you the same groups you had before. Name the columns you drop and that new column
silently becomes a grouping key, splitting your groups without telling you.

### Counting a line list

A line list has no count in it: Oswego's 75 people are a row each, with a Y or an N under every
food. Choose **Count rows** and each group holds how many rows agree, which is what a two-by-two
needs. Keep the exposure and the outcome and the four cells come out.

Count rows never reads the value, so a blank is still a row and the result's value is called
`rows`. **It counts rows, not people.** Import one value column from a line list: two value columns
give two rows per person, and each person then counts twice. The step cannot detect that.

### Why it only adds up

Adding counts gives you a count. Adding **rates** gives you a number with no referent — deaths per
1,000 in three sub-districts do not add up to deaths per 3,000 in one. This step cannot tell a
count from a rate, so it offers the operation that is right for counts and does not offer a choice
it has no way to police. Averages are a different operation and are not built.

## Reading what you get

One row per group, and a receipt stating which columns were kept, which were dropped, how many
rows collapsed into how many groups, and every group that held an empty cell.

## What it will not do

- **It will not treat an empty cell as a zero.** A group holding any empty value totals to
  **nothing known**, and is named in the receipt. This is the whole risk of the operation: summing
  over an empty cell gives a total that is too small by an amount nobody can state, and a stratum
  whose population was never recorded should come out *unknown* rather than *small*.
- **It will not check that the rows belong together.** You named the columns; it adds up what
  agrees on them. If you ask it to total a column of rates it will do that, and the number will
  mean nothing.
- **It will not group by everything.** That is a no-op, and it says so rather than handing back
  your table unchanged.

## Where it is used

The South London example: *Died or survived, by water supply*.

## How it was checked

Validation Lab check **29**, `29-group-table-vs-pandas.ipynb`, against a pandas groupby. All six
totals of the Snow contingency table agree exactly — they are integer counts, so the tolerance is
zero rather than small.

The empty cell is the case worth checking, and **pandas has no option for the rule this widget
states**. `min_count=1` reads like it and is the first thing anyone writes: it bounds how many
values must be *present*, not whether any are *absent*, so on eleven numbers and one empty cell it
returns the eleven. On this data that is 147,945 people instead of nothing known — short by the one
sub-district nobody recorded. The comparison that does hold is a per-group `sum(skipna=False)`.

What no check can verify is the protection that matters most here: summing is the only operation
offered, because this step cannot tell a count from a rate.
