# Append rows

_Created 2026-11-03 · Updated 2026-11-03_

**A summary step.** It stacks the rows of two or more tables, one after another, as pandas `concat` does.

## What it does

Two or more tables become one, with every row of each, in the order of the ports. Columns are lined up by name. A
column some tables lack is empty on their rows, and the run says which column, which table and how many rows,
because empty there means the question was not asked.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | the first table, whose rows come first |
| **records_2** | the second table, whose rows follow |
| **records_3**, ... | each further table, added with **＋ Add a table** in the Inspector |

## How to use it

| Setting | What it decides |
| --- | --- |
| **Name the source of each row** | Adds a column holding a label for each table's rows |
| **Column naming the source** | That column's name, `source` unless you change it |
| **＋ Add a table** and **Remove the last table** | How many tables it stacks: one port each, two at least |
| **Label for rows of** each table | What that column holds on that table's rows |
| **The labels are numbers**, and **Their unit** | Says the labels are numbers, such as a lag in weeks, so a chart places them as numbers and titles its axis with the unit |
| **Create a new primary key** | Adds a column numbering every row 1 to N, and makes it the primary key |

### When the old keys would repeat

Each table's own `id` is unique, but two tables stacked can share an `id`. Where both declare the same primary
key, the stacked table's key is:

| Options on | Primary key | Also unique |
| --- | --- | --- |
| Neither | the old key; any repeat is a Data quality finding | |
| Source named | source with the old key | |
| New key | the new key | |
| Source named and new key | the new key | source with the old key |

The old key column is always kept.

The Salmonella example stacks 32 cases, selected from the complete file, on the 81 matched panel controls from
the second file, so the two-by-two can compare them.

### Many tables, one step

Five models, one per lag, are five tables. One Append rows stacks them all: add a port for each with **＋ Add a
table**, rather than chaining four steps. The Brazil dengue example stacks five Regression tables this way and
labels each table's rows with its lag, `0`, `2`, `4`, `6` and `8`.

**The labels are numbers** only when you say so. Nothing is read off the labels. A label that is not a number, such
as `2 weeks`, is a data quality finding naming its rows, and the rows are kept. A chart cannot place those on a
numeric axis.

An estimate's interval, declared by Regression, survives the stacking when every table declares it the same way, so
**Chart** can draw each estimate with its interval.

## What it will not do

- Stack tables whose value columns or units differ. They measure different things, and one column cannot mean both.
- Use a source column name any table already has, or one label for two tables.
- Check that the two tables were collected the same way. Two surveys with different questions stack without
  complaint if their value column has one name.
- Find a primary key repeated across the tables.
- Read a label as a number unless you say the labels are numbers.
