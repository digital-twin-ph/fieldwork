# Append rows

_Created 2026-11-03 · Updated 2026-11-03_

**A summary step.** It stacks the rows of a second table under the first, as pandas `concat` does.

## What it does

Two tables become one, with every row of each. Columns are lined up by name. A column only one table has is
empty on the other table's rows, and the run says which column and how many rows, because empty there means the
question was not asked.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | the first table, whose rows come first |
| **records_2** | the second table, whose rows follow |

## How to use it

| Setting | What it decides |
| --- | --- |
| **Name the source of each row** | Adds a column holding a label for each table's rows |
| **Column naming the source** | That column's name, `source` unless you change it |
| **Label for rows of the first table** and **of the second** | What that column holds on each table's rows |
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

## What it will not do

- Stack tables whose value columns or units differ. They measure different things, and one column cannot mean both.
- Use a source column name either table already has.
- Check that the two tables were collected the same way. Two surveys with different questions stack without
  complaint if their value column has one name.
- Find a primary key repeated across the two tables.
