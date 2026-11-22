# Reproject points, retired into Table output

_Created 2026-11-22 · Updated 2026-11-22_

**Result:** retired 2026-11-22, in 0.169.0. `reproject` 1.0.0 is retired; Table output 0.14.0 shows a point layer's
coordinates in metres, in a chosen UTM zone, where asked.

## Why

The practitioner, 2026-11-22, of the Inspector move's batch C: *"Shouldn't Project to UTM be an internal process
instead?"* Then, to retiring it into Table output: *"Yes"*.

| Checked | Found |
| --- | --- |
| Where it is used | One built-in example, *Where were the deaths? Soho, London, 1854* (`snow-deaths`): the eight pumps projected, shown in one table. |
| What could take its output | Table output only. The plan refused any other step fed by it, by name, since 2026-10-13: a buffer, a distance or a map would read metres as degrees. |
| What computes in metres | Eight widgets (Mean center, Compare point sets, Combined area, Convex hull, Snap to network, Reachable corridor, Voronoi catchments, Network isochrone). Each projects for itself and states its zone in its receipt. None takes projected points. |
| What it did that nothing else did | Showed coordinates as easting and northing in metres, for a partner who works in UTM or for a lesson on what a projection does to a coordinate. |

A step whose output nothing computes with asks a trainee for a choice that changes nothing downstream. Showing
coordinates in metres is a property of where they are shown.

## What changed

- **Table output** offers, in Configure…, a point layer's coordinates as recorded (longitude and latitude) or in metres,
  as easting and northing in a UTM zone. The zone comes with the advice the measuring steps' dialogs give: the zone the
  workflow's coordinates suggest, and how far the chosen one stretches distances. A layer already in metres, read from a
  UTM file, is shown as it is. The table's receipt states the frame, as it did for Reproject's points.
- **The deaths example** shows the pumps in metres that way: one Table fed by the pumps, zone 30N.
- **A saved workflow** holding Reproject points opens rewritten: each Table it fed reads its source, in the same zone,
  stamped as migrated. A Reproject feeding nothing is dropped.
- **The plan's guard** against projected points reaching a step that assumes degrees is withdrawn with the only step that
  produced them mid-workflow.
- **What stays:** `src/reproject.ts`. Point data, Polygon layer and the raster inputs read files recorded in UTM with it,
  and Table output projects with it. The lab's reproject notebook stays the Dive deeper link of every step that measures.

## What is given up

- **A projected layer as a value on the canvas.** Nothing used it, and the guard existed to stop its use.
- **The step's card of frames** (source CRS84, target EPSG code, axis order, no datum shift). The table's receipt states
  the frame; the Settings sentence names the zone.

## Regime

No deprecation period: nobody outside this project uses it (AGENTS.md, *Retiring a widget*).

## Not established

That a partner asking for UTM coordinates wants them from a table rather than in an exported file of points. The export
of a Table follows the table, so it carries them; a point file exported elsewhere does not.

## Checked

`tests/reproject-transform.test.mjs`: a saved Reproject opens as its Table reading the pumps in zone 30N, and the
table's receipt states every point as EPSG:32630 easting and northing. `tests/reproject.browser.mjs`: the deaths
example's Table says zone 30N, its dialog offers metres with the zone the data suggests, switching back to longitude and
latitude asks for a run, and Reproject is not on the palette. `tests/catchments.test.mjs`: the deaths example runs.
Chromium.
