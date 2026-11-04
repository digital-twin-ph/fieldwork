# Tabular data

_Created 2026-11-02 · Updated 2026-11-03_

**A source.** It reads a CSV or Stata file into a table.

## What it does

It reads a CSV or Stata (`.dta`) file in wide or long shape and hands a table to the next step. An absent value is kept as
unknown, never read as zero.

## How to use it

1. Choose the file, and say whether it is wide or long.
2. Tick the key columns and choose the value column or columns.
3. Under **What identifies a row?**, mark any primary and secondary keys.
4. Save. If the node says **Check Data quality**, open it before relying on the table.

## Stata files

A Stata file, from Stata 8 onward, is read as Stata wrote it and then set up as a CSV is. Numbers are as stored. A
missing value, `.` or `.a` to `.z`, is empty, never zero. A variable Stata formats as a date is read as a date. Value
labels are not applied: codes stay as stored, and the import says which variables carry labels.

## Keys

Key columns are read as labels. Among them you decide what identifies a row:

| Declaration | Means | Checked |
| --- | --- | --- |
| **Primary key** | One column or several together are unique | Yes |
| **Secondary key** | Groups or links rows, and may repeat | No |
| **Neither** | An answer or category | No |

With no primary key declared, the check is on all the key columns together.

## Data quality

A file is not refused for a quality problem. Every row is kept, the node says **Check Data quality**, and the
**Findings** tab of Data quality lists:

- rows repeating a key value
- rows with no value in a key column
- values that are not numbers, kept as unknown and never as zero

A finding left unresolved goes into the write-up as a machined limitation.

A file with no rows, too many rows or a missing column is still refused, because there is no table to look at.

## What it will not do

It does not choose between rows that disagree. The table stays as read until a later step changes it.
