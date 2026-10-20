# Point data

_Created 2026-10-19 · Updated 2026-10-19_

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

It has no input unless you connect a source. Its output is `points`, which nearly everything
accepts: maps, tables, distance measurement, catchments, summaries, rates, case series and the
geoprivacy steps.

## How to use it

1. Add the node and open it in the Inspector.
2. Import a file, or switch to pins and click the map.
3. Check the column kinds. A column read as text when it holds numbers will not band or sum.
4. Open **Data quality** to see what is missing or malformed before you build on it.
5. Give the node a label that says what the records are, not where they came from.

## What it will not do

It does not clean data silently. Nothing is coerced, dropped or filled in; what cannot be read is
reported and left for you to decide.

It does not join one set of records to another. Two sets that share no key stay two sets.

It does not know what a row means. Whether 250 rows are 250 people or 250 addresses carrying 489
events is something your labels and your weights have to say.

## Worked examples that use it

**John Snow Voronoi catchments** loads 250 death locations and eight pumps. **Measles in Hagelloch,
1861** loads a 188-case line list. **Old Naledi diagnostic access** loads a facility registry.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/point_input.md](../widget-specs/point_input.md).*
