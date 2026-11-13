# Tabular data

_Created 2026-11-02 · Updated 2026-11-09_

**A source.** It reads a CSV, Excel or Stata file into a table.

## What it does

It reads a CSV, Excel (`.xlsx`) or Stata (`.dta`) file in wide or long shape and hands a table to the next step. An absent value is kept as
unknown, never read as zero.

## How to use it

The Inspector says in one sentence what the step reads: the file, its shape, its value columns and its unit. **Configure…**
opens the import.

1. Choose the file, and say whether it is wide or long.
2. Tick the key columns and choose the value column or columns.
3. Under **What identifies a row?**, mark any primary and secondary keys.
4. **Apply.** Nothing changes until you do; **Cancel** or **×** leaves the step as it was.

After it, the Inspector's **Result** says how many rows were read and how many values are absent, what Data quality
found, and how many columns are described, with **Quick look at the table**, **Data quality** and **Describe
columns…**. If it names a Data quality finding, open it before relying on the table.

**Convert the source table on each run**, in the dialog, keeps the file as published and melts it when the workflow
runs, so the run's receipt names the columns it took. It can be changed without reading the file again.

## Excel workbooks

A workbook of several sheets offers **Sheet**: choose the one holding the table, and it is set up as a CSV is. The
dialog says which sheet it read, and the step keeps it, so a table fetched again reads the same sheet. Cells are read
as written: a formula gives its saved result, and formatting is ignored, so a date Excel stores as a number stays that
number. An older `.xls` file needs saving as `.xlsx` or CSV first.

## Stata files

A Stata file, from Stata 8 onward, is read as Stata wrote it and then set up as a CSV is. Numbers are as stored. A
missing value, `.` or `.a` to `.z`, is empty, never zero. A variable Stata formats as a date is read as a date. Value
labels are not applied: codes stay as stored, and the import says which variables carry labels.

## Fetched from a URL

Under **Or fetch from a URL**, give the address of a CSV, a Stata file or a zip. For a zip, choose the file inside.
The table is then set up as any other.

The project keeps where the table came from, the URL, the file inside and the digests, in place of its rows. An
exported project carries no rows, so sharing it does not republish data whose terms do not allow that. On another
device the step says its rows are not fetched yet, and **Fetch the table**, under Result, reads the same file again
with the same settings. A file whose digest has changed is refused, and nothing is read.

**Downloaded once per device.** What is fetched is kept on the device by its digest. Any table, in any project on the
device, that names the same file reads it from there, checked again, instead of downloading it. Typed again in the
dialog, a URL reads the copy and says when it was fetched; **Fetch again from the source** checks for a newer file. A
source that has not finished after two minutes is stopped and said to be late.

## Keys

**A file with more than 12 columns** lists them in a dialog of its own: Key columns shows how many are ticked and which,
and **Choose key columns…** opens the list, with **Columns to keep** (paste or type names, separated by commas, then
**Keep these**), **Find a column**, **Untick all** and **Ticked only**. A name the file does not have is said. Read long,
such a file starts with nothing ticked; a smaller one ticks every column but the value, and lists them inline. Value
columns, for a wide read, work the same way.

Key columns are read as labels. Among them you decide what identifies a row:

| Declaration | Means | Checked |
| --- | --- | --- |
| **Primary key** | One column or several together are unique | Yes |
| **Secondary key** | Groups or links rows, and may repeat | No |
| **Neither** | An answer or category | No |

With no primary key declared, the check is on all the key columns together.

**List the distinct values of** ticks key columns whose values the table lists, for a step that needs them as a list.
**Assign projection site** reads the sites it assigns against from `site_id` here, so tick it on the projections
table. Nothing else changes: the rows are the same.

## What the columns mean

**Describe columns…** on the node opens a dialog for every column the table keeps: a **label**, a **unit** and a
**description**. The column's name stays as the file spells it; the label is shown beside it, in a regression's
terms and a chart's panels. Describing the columns is your step, and a data quality check: a column nobody has
described is a finding in Data quality and in the write-up's Methods, never a reason to refuse the table.

**From a data dictionary.** Under *Propose from a data dictionary*, choose a CSV, Excel workbook or Stata file with one
row per variable, or, for a table fetched from a zip, a file in the same archive (read from this device). Say which of
its columns holds the variable name, label, description, unit and missing count; a first guess from its headers is
filled in. **Propose descriptions** fills the columns it describes, marked *not yet accepted*, and checks it against
the table: which kept columns it does not describe, and whether each missing count it states agrees with the table's.
Accept each proposal, or **Accept every proposal**; typing in a field makes the description yours.

A Stata file's own variable labels are proposed the same way when it is imported.

## Data quality

A file is not refused for a quality problem. Every row is kept, the step's Result names what Data quality found, and the
**Findings** tab of Data quality lists:

- rows repeating a key value
- rows with no value in a key column
- values that are not numbers, kept as unknown and never as zero

A finding left unresolved goes into the write-up as a machined limitation.

A file with no rows, too many rows or a missing column is still refused, because there is no table to look at.

**Read as wide, a repeated subject is kept.** When the key columns repeat a subject, the dialog says the file may be
long and offers to read it so. Usually it is. But a wide file can repeat a subject because the source has a fault,
and the Brazil dengue file has one week twice for every municipality. Read as wide anyway, every row is kept and
each repeat is a finding in Data quality.

## What it will not do

It does not choose between rows that disagree. The table stays as read until a later step changes it.
