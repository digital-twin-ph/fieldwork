# Point data

_Created 2026-10-19 · Updated 2026-11-14_

**An input widget.** It brings located records into a workflow — one row per thing, each with a
position and whatever attributes came with it.

## What it does

It holds a set of points and the values attached to them: cases, households, facilities, pumps,
sample sites. Everything downstream that works on points starts here.

Records arrive three ways. **Import a file** — GeoJSON, or a CSV with longitude and latitude
columns. **Place pins** by clicking a map, for a handful of locations you know. **Connect a
source** that produces points, such as a facility search.

A record may have no position. That is kept rather than dropped, because a case with no recorded
address is still a case, and steps that need geometry say how many they had to leave out instead of
quietly working with fewer.

**Columns and their kinds.** Each attribute has a declared kind — number, text, or a term from a
list you give. The data quality panel profiles a column, shows which values do not match its kind,
and offers a repair. A repair is recorded with the node and appears in the run evidence; it never
overwrites what the file held.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | optional: a table with longitude and latitude columns, read as one point per row |

Its output is `points`, which nearly everything accepts: maps, tables, distance measurement, catchments, summaries,
rates, case series and the geoprivacy steps. A step that takes a table reads it as one too: each point a row of its
attributes, without its location.

## How to use it

The step's panel holds its **Name**, its input, one sentence saying what it holds, **Configure…**, and the records.

| In Configure… | What it does |
| --- | --- |
| **Points held here** | the Input data editor: import a CSV, GeoPackage or GeoJSON file, generate synthetic points, or place pins on the map |
| **Points from a table** | when a table is connected: the columns holding **x (longitude)** and **y (latitude)**, named, never guessed; a **Record ID** and a **Label**, optional |

Then check the column kinds, open **Data quality** to see what is missing or malformed, and name the step for what
the records are, not where they came from.

**What the columns mean.** For points held here, **Describe columns…** works as it does in Tabular data: a label, a
unit, a description, what kind of values each column holds, and its codes, typed or proposed from a data dictionary.
A dictionary chosen there is kept with the records, and **View the data dictionary** shows it as published. Points
from a table take their meanings from that table's Tabular data step.

Hagelloch's cases carry their source's dictionary, the outbreaks package's, so every column arrives proposed. `class`
arrives as categories in no order, because the package calls it a factor; whether pre-school, first and second class
are in order is yours to say.

## Editing a value by hand

**Data quality**'s **Records** tab shows the records as the steps after this one read them, a page at a time, each value
in a box. Change a value and leave the box: it is kept as an **edit** on this step, with the value it replaced and when,
and the run applies it to a copy of the records. The file is not changed. An empty value can be filled the same way; such
edits are counted apart, because a supplied value is not a reading. **Edits (n)** lists every edit, newest first, each
with **Remove**, which takes it back.

An edit is applied only where the record still holds the value it was made against. If the data has changed under it,
after a new import, the edit is not applied and Data quality says so. The run's record states each edit, before and
after (`fw:CellEdit`). Experiment 214.

## What it will not do

It does not clean data silently. Nothing is coerced, dropped or filled in; what cannot be read is
reported and left for you to decide.

It does not join one set of records to another. Two sets that share no key stay two sets.

It does not know what a row means. Whether 250 rows are 250 people or 250 addresses carrying 489
events is something your labels and your weights have to say.

## Worked examples that use it

**John Snow: where were the deaths?** loads 250 death locations and eight pumps. **Measles in Hagelloch,
1861** loads a 188-case line list.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/point_input.md](../widget-specs/point_input.md).*
