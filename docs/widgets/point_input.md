# Point data

_Created 2026-10-19 · Updated 2026-11-11_

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

## What it will not do

It does not clean data silently. Nothing is coerced, dropped or filled in; what cannot be read is
reported and left for you to decide.

It does not join one set of records to another. Two sets that share no key stay two sets.

It does not know what a row means. Whether 250 rows are 250 people or 250 addresses carrying 489
events is something your labels and your weights have to say.

## Worked examples that use it

**John Snow Voronoi catchments** loads 250 death locations and eight pumps. **Measles in Hagelloch,
1861** loads a 188-case line list.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/point_input.md](../widget-specs/point_input.md).*
