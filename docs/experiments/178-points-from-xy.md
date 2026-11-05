# 178 · Point data from a table: x and y, as geopandas reads them

_Created 2026-11-05 · Updated 2026-11-05_

**Status:** tried — built in Point data 0.4.0 and used by the NYC example's fifth workflow; lab check 34 agrees with geopandas. No new widget.

## The task

The NYC study-area map ([177](177-where-a-figure-goes-in-the-write-up.md)) needs the air monitors, and their positions
are columns of a table: the package's site-day files carry `site`, `Latitude` and `Longitude` on every row. The
practitioner chose, 2026-11-05, *points from a table* over a boroughs-only map and over a monitors file in the example
repository, and pointed at the operation's familiar form: *"Geopandas has points_from_xy."* Then, while a new widget was
being written up: *"Point data widget has input options that include CSV"*, and *"Before we propose widgets we should
examine current widgets we discussed this before."*

## The current widgets, examined first

Every widget that takes a table or emits points:

| Widget | Takes a table? | Makes points? | Why it is not the answer |
| --- | --- | --- | --- |
| `point_input`, CSV | a file, at import | yes, from named longitude and latitude columns | the only source is a file on the practitioner's machine, read when the dialog is used |
| `deduplicate_points`, table mode | yes | no | emits a table, its records carry no geometry |
| `join_table_to_area` | yes | no | puts values onto existing polygons by name |
| `find_health_facilities`, `point_grid` | no | yes | other sources |

**Point data already does the mapping.** Its CSV import names a column for x (longitude) and one for y (latitude), in
geopandas' order. What it lacks is a table a workflow computed as a source: a fetched file, or one totalled to one row
per place. So this extends Point data and adds nothing to the palette.

**And with care, because the GIS widgets are not yet streamlined.** The practitioner, 2026-11-05: *"We have a lot of
GIS widgets and the widget deduplication and streamlining work is not yet fully done so we have to be more careful with
GIS widgets."* Experiment 64's plan touches Point data only in folding `places` and `centers` into it, which is done;
this adds a source to that widget and no node type.

## Design

- Point data takes an **optional `records` table**, as Polygon layer takes an optional area. Unconnected, it is the
  source it always was.
- Connected, the Inspector names **x (longitude)**, **y (latitude)** and, optionally, the record ID and label columns,
  stored as `fromTable`. The run reads the table through `tablePoints`, the run-time sibling of `csvPoints`.
- Degrees only, CRS84: `geopandas.points_from_xy(x, y, crs="EPSG:4326")`.

| Distinction | Enforced as |
| --- | --- |
| x is the longitude and y the latitude | the settings name both; nothing is guessed from a column name |
| Only CRS84 is read from a table | stated on the result; UTM metres stay with the CSV import |
| A row with an empty, non-numeric or out-of-range coordinate is not placed | run-time check per row: kept with no geometry, counted and named; the table is never refused (*diagnose, never refuse data*) |
| Rows sharing one position are separate points | limitation, stated: the result counts them, which on an ungrouped site-day table is the sign to total it first |
| Every column travels as an attribute | kept as the table spells it |

The CSV import keeps refusing a bad coordinate at import, as before: there the practitioner is present to fix the file.

## Validation it commits to

- Unit: NYC's ozone site-day table, totalled by `site`, `Latitude`, `Longitude`, gives 6 points whose coordinates equal
  the table's; an empty, a text and an out-of-range coordinate are each counted and named.
- A lab check against `geopandas.points_from_xy` with `crs="EPSG:4326"`.
- The NYC manual builds the study-area map from an empty canvas, in a browser.

## Practitioner observation, written before the result

Whether x and y, named as longitude and latitude, prevent the swap they are there to prevent, or whether a reader
still picks `Latitude` for x because it comes first in the file.

## What this does not establish

- That a coordinate is where the thing is. A monitor's published position is the custodian's claim.
- Any CRS but CRS84 from a table.

## Validation

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-05 | `tests/points-from-table.test.mjs` | 6 of 6 with the NYC package named (5 without): one point per row with every column kept; an empty, a text and an out-of-range coordinate each kept with no position and counted; rows sharing a position counted; x and y required and distinct; a run's receipt conforms to `fw:PointsFromTableShape`; NYC's ozone site-day table, totalled by site and position, gives the 6 monitors at the table's own coordinates |
| 2026-11-05 | Lab check 34 (lab `867f689`) | agrees with `geopandas.points_from_xy(..., crs="EPSG:4326")` on both cases: the same rows placed, every placed point exact, the same distinct positions |
| 2026-11-05 | `tests/nyc-from-scratch.browser.mjs`, all five workflows | passes in Chromium, the fifth fetching the US counties from geoBoundaries and the site-day file from the package |

**Found on the way, three defects, each fixed:**

- **A repeated county name could not be told apart.** geoBoundaries' US counties carry only a name and an id, no
  state, and 444 of 3,233 names repeat: five Richmonds, two Kings. The unit picker listed names alone. A repeated name
  is now listed with where it lies (*Richmond · 40.58° N, 74.17° W*), and a unit is chosen by its own id. Every one of
  the 3,233 now reads differently.
- **The Country field's label read as the whole country list**, because the list sat inside the label. A screen
  reader and the manual's runner both read it that way.
- **Total within groups kept only the first of several columns ticked at once**, because each box saved only itself.
  Every box is now read on any change.

## A rule fired, and was amended

`source-consumes-data` refused it: a widget under Sources may take a scope, such as an area, not data already in the
workflow. Its ledger had one precedent, Reproject, split into a transform in experiment 111. The practitioner first
chose to record a known violation, which meant raising the ledger's ceiling; then, the same day: *"If that's another
cap then it's a false one"*, and *"Reading data already in the workflow is efficiency."*

So two things changed, and Point data is no violation:

- **The rule now catches a source that REQUIRES workflow data.** Reproject, which could not run without points, is
  what it was right about. An optional data input, as Point data's table is, lets a workflow reuse what it already
  fetched or totalled instead of importing it again.
- **The ledger has no ceiling.** Each known violation states why it stands and what would clear it; how many there are
  is not capped. The old ceiling and its raises are kept in `widgets/naming.json` as `ceilingHistory`.

## Practitioner observation, still open

Whether x and y, named as longitude and latitude, prevent the swap, or whether a reader still picks `Latitude` for x
because it comes first in the file.
