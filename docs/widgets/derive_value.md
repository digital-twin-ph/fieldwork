# Derive a value

_Created 2026-10-26 · Updated 2026-10-26_

**Arithmetic.** It takes a table, combines two of its values with one operation, and gives the
table back with a new value added for every group of rows.

## What it does

A table here is **long**: every row carries one value, under key columns. So two numbers about the
same subject are two rows, not two columns. Snow's Table IX holds

| supplier | measure | count |
| --- | --- | --- |
| Southwark and Vauxhall Company | houses | 40,046 |
| Southwark and Vauxhall Company | deaths | 1,263 |

and the number a 2×2 needs — **houses without a death** — is in neither row. It is `houses` minus
`deaths`, and until this widget existed the only way to get it was to compute it somewhere else
and import the answer.

This step computes it once per group: all the rows sharing the other key columns are one group,
and `measure` is the column holding the names of the values to combine.

## What you connect

**records** — a table. It gives back the same table with the derived rows added.

## How to use it

| Setting | What it decides |
| --- | --- |
| **Key column holding the values** | Which column names the values. In Snow's table, `measure`. |
| **First value** | The left operand, e.g. `houses`. |
| **Operation** | minus, plus, times, divided by. |
| **Second value** | The right operand, e.g. `deaths`. |
| **Name for the derived value** | What the new rows are called, e.g. `houses without a death`. |

The values are offered as a list wherever the chain ends in a table this canvas holds, including
through an earlier *Derive a value* or *Select rows by value*. Where it does not, you type them.

## What it refuses, and why

**A group missing either value gets no row, and is named in the evidence.** A supplier whose house
count nobody recorded has an *unknown* number of houses without a death. Writing a zero there would
be a measurement the table never made.

**A name the column already uses is refused.** Two rows would then share a key, and a table with
two values for one key is one nobody can read.

**Dividing by zero is unknown, not infinite.**

## What it will not do

It will not tell you whether the two values can be combined. Subtracting deaths from houses works
because both count houses; subtracting a rate from a count is equally allowed here and is
nonsense. Check that yourself before reading the answer.

It will not fill in a group whose values are incomplete. Those groups come back named, with no
derived row, and any figure you draw from the result is missing them — count them before you
present it.

It will not reach across tables. Both values must already be in the one table you connect.

## What this does not establish

The widget does not know what its numbers count. Subtracting deaths from houses is sound only
because both count houses; subtracting a rate from a count is equally permitted here and is
nonsense. Nothing checks that the two values are commensurable, because nothing in the table says
so — the unit belongs to the table as a whole, not to each measure.

A derived value is also not a measurement. `houses without a death` was never observed; it is an
inference from two things that were, and it inherits every error in both.
