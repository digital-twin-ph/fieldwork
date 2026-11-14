# Total within groups

_Created 2026-10-26 · Updated 2026-11-14_

**Addition, or a count.** It takes a table, keeps the key columns you name, and adds up the values
of every row that agrees on them, or counts those rows.

## What it does

32 sub-districts, each with a population and a death count, each belonging to one of three water
supply categories. Totalling within the supply category and the measure turns 64 rows into six:
the people and the deaths in each category. That six-row table is a contingency table, and it is
what the next steps turn into a two-by-two.


## Shares within groups

Tick **Add each group's share, %** and every group gets its share beside its count or total. Under
**Share within**, tick the columns whose groups each make 100%: a line list counted by classification
and by what was recorded, with the share within classification, shows how a classification's cases
divide. Tick none and each share is of the whole table.

The result has a column `statistic` naming each number, the count and the share, and the table view
shows them side by side. A share is held to one decimal place, so a classification can total 99.9 or
100.1. A share is offered with **Sum** and **Count rows**, which add up to a total, and not with a
minimum or a maximum. A share of a total that is unknown, because a group summed over an empty cell,
is unknown too.

## Seeing what this step did

After a run, **View this table** at the top of the Inspector opens the output. **Before** and
**After** switch between the table that came in and the one that went out, and After says how many
rows and columns there were before.

## What you connect

**records** — any table.

## How to use it

Connect a table, then open **Configure…**. The **Preview** shows the table your settings make, and
nothing changes until **Apply**.

| Setting | What it decides |
| --- | --- |
| **Key columns to keep** | The key columns that survive. Rows agreeing on all of them become one row. |
| **Aggregate** | Sum, Minimum, Maximum, Count rows, Mean or Median |
| **Column to total** | The table's value column, or a key column that holds numbers, such as one a rule computed |
| **Total what is present, excluding empty cells** | Off: a group holding an empty cell totals to nothing known. On: what was recorded is totalled, and the receipt and the write-up say so |
| **Add each group's share, %** | A share beside each count or total |
| **Share within** | The columns whose groups each make 100%. None ticked: the whole table |

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

### Adding, and what does not add

Adding counts gives you a count. Adding **rates** gives you a number with no referent — deaths per
1,000 in three sub-districts do not add up to deaths per 3,000 in one. This step cannot tell a
count from a rate, and will add up rates if asked.

**Mean** and **Median** summarise the values present in each group: an incubation period or a serial
interval is usually reported as a median. Neither is offered with a share, because neither adds up to a total.

### Totalling a column other than the value

A table holds one value column, and that is what is totalled unless you choose another. A key column holding
numbers can be chosen instead: the days from exposure to onset that a rule computed for every case, say, with
**Median** by outcome. Its blank cells are empty cells, as in the value column; a cell that is not a number stops the
run and names the row. The result carries no unit, because the unit the table declares is its value column's.

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

The South London example: *Died or survived, by water supply*. The MERS-CoV example: *Median days from exposure to onset, by outcome*.

## What this does not establish

That a share is the measure you need. A share of rows is not a rate: it has no denominator of
people unless each row is one person.

## How it was checked

Validation Lab check **29**, `29-group-table-vs-pandas.ipynb`, against a pandas groupby. All six
totals of the Snow contingency table agree exactly — they are integer counts, so the tolerance is
zero rather than small.

The empty cell is the case worth checking, and **pandas has no option for the rule this widget
states**. `min_count=1` reads like it and is the first thing anyone writes: it bounds how many
values must be *present*, not whether any are *absent*, so on eleven numbers and one empty cell it
returns the eleven. On this data that is 147,945 people instead of nothing known — short by the one
sub-district nobody recorded. The comparison that does hold is a per-group `sum(skipna=False)`.

Validation Lab check **39**, `39-group-shares-vs-pandas.ipynb`, recomputes the shares with pandas on
the same table: each company's share of the people and of the deaths, a count's share of all, and one
emptied cell. Every number agrees exactly, in CPython and in the browser kernel.

What no check can verify is the protection that matters most here: summing is the only operation
offered, because this step cannot tell a count from a rate.
