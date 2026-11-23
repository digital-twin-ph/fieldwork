# 229 · A line layer: routes, tracks and borders

_Created 2026-11-22 · Updated 2026-11-22_

**Status:** tried. Built 2026-11-22 as Line layer 0.1.0: it reads lines from a file or takes the border of two study areas; Map draws them, static and
interactive. Not yet in a worked example, and its name is awaiting the practitioner's review. The buffer that is its
first use, Area around a point extended to lines and areas, is not built.

## The question

The practitioner, 2026-11-22: *"That's an important gap no line layer"*, *"Line layer can be transportation routes"*,
*"Perhaps we can also use line layers in microplanning? Team routes?"*; then, of two neighbouring countries, *"if I
wanted to establish a mile buffer on the border line that becomes a buffer polygon and I can find health facilities
just inside that buffer"*; then *"Let's start the line layer"*.

## What exists (inventory, by input and output)

| Widget | In | Out | Could it hold a route, a track or a border? |
| --- | --- | --- | --- |
| Street network | an area, or an OpenStreetMap extract | a network | a graph of junctions to route over; a team's track or a border is not one, and every routing step would accept it |
| Point data | a file, GPS waypoints | points | reads GPX and KML waypoints; tracks, routes and shapes are counted and left out (`gps-import.ts`) |
| Polygon layer | a file, or study areas | polygons | areas; a border is where two of them meet, not an area |
| Reachable corridor | reached junctions, a network | an area | buffers street edges into an area; the nearest thing to buffering a line |

No value held lines. Reused: the GPX, KML and KMZ reading of `gps-import.ts`, extended to the lines it counted.

## Chosen: one source, Line layer

### Admission review

| | |
| --- | --- |
| **D1** | Decomposes into: read positions in order; group them into lines; keep each line's name and attributes. The residual distinction is order: a line is a sequence, not a set of points. **Primitive**, on the palette under Sources: a practitioner asks for routes, tracks or a border by name. |
| **D2** | Street network holds lines as a graph to route over; Point data drops them; Polygon layer holds areas. None holds lines as lines. A border taken from two areas is not an area. |
| **D3** | A line is not a street network: **hard stop** by port type (`lines`, not `network`), so no routing step takes a track. A line of fewer than two positions, or outside longitude −180 to 180 and latitude −90 to 90: **run-time check**, dropped when read. Points and areas in a file: counted and **said**, not imported. A border needs both areas: **validation rule** (both inputs required in border mode). Two areas that do not meet within the distance: **run-time check**, refused in words. Where two outlines are close but not the same line: **limitation**, the distance is stated. |
| **D4** | The port type decides what connects; the file or the areas and the distance are chosen in Configure…; an unconfigured step is a valid draft. |
| **D5** | The distance lives on the step, with its measured default. |
| **D6** | South Sudan and DR Congo → Line layer (border) → Area around… (1 mile, one side) → Find health facilities: the buffer is not built, so the chain ends at the line today. A team's GPX track → Line layer → Map over its settlements: microplanning. |
| **D7** | *Line layer*; ports `area` and `area_2` in, in border mode only; `lines` out. |
| **D8** | Unit tests: GeoJSON read with what is not a line counted, lengths on the sphere, the border of two drawn areas 50 m apart found within 100 m and not within 10 m, a stretch crossing a ring's start kept as one. Browser tests: a GPX file's tracks and routes read in Configure…, its waypoint counted; the border of two study areas drawn After and run; lines drawn on Map static and interactive, alone and over an area. |
| **D9** | One step where none could do it before. |
| **D10** | None yet: microplanning's team routes, and the border example with the buffer. |

## The border's distance, measured

Two countries' outlines, drawn apart, rarely share a vertex, so the border is the stretch of the first's outline lying
within a distance of the second's. Measured 2026-11-22 on Rwanda's Western Province (Rwanda Geo Portal) against DR
Congo's Nord-Kivu and Sud-Kivu (geoBoundaries' DR Congo source), from `boundaries/` beside this repository; nothing
downloaded.

| Within | Stretches | Length | Time |
| --- | --- | --- | --- |
| 10 m | 86 | 47.5 km | 2.6 s |
| 50 m | 33 | 185.6 km | 0.8 s |
| 100 m | 11 | 194.1 km | 0.08 s |
| 250 m | 5 | 199.3 km | 0.04 s |
| **500 m** | **2** | **201.1 km** | 0.03 s |
| 1 km | 1 | 203.8 km | 0.02 s |
| 2 km | 1 | 205.6 km | 0.02 s |

**Found:** the two sources disagree by up to about half a kilometre along the border. From 500 m the border is whole
but for one gap; past it, widening takes in 4.5 km more at most and no stretch that is not border. 500 m is the
default, stated in the dialog and changeable there.

## Validation record, 2026-11-22

- `tests/line-layer.test.mjs`: 4 of 4 (Node).
- `tests/line-layer.browser.mjs`: 4 of 4 on Chromium and on WebKit: a route over a study area, static; a border on a
  map of lines alone; a route on the interactive map, named on hover and in the layer list; Configure… reading a GPX
  file and taking the border of two study areas, then a run.

## What this does not establish

- That a practitioner reads a border taken within 500 m as the border; where the sources differ, the line follows the
  first area's outline.
- The border at other pairs of countries, or at the first level against the national.
- Lines on maps that lead with polygons, a raster or a street network: they are carried, and only the study-area map and
  a map of lines alone draw them. The key does not yet list them.
- Long tracks: a GPX of a day's walking at one position a second is untested for size.
- OpenStreetMap roads as lines: not built.
