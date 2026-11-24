# Line layer

_Created 2026-11-22 · Updated 2026-11-23_

**A source.** It holds lines: a vaccination team's GPS track, a planned route, a road, or the border two study areas
share. Map draws them over the study area and under the points.

## What it does

It reads lines from a file, or takes them from two study areas:

- **From a file.** GPX tracks and routes, from a GPS device or a phone app; KML or KMZ lines, from Google Earth and many
  field apps; GeoJSON lines. Each line keeps its name and attributes. Points and areas in the file are counted and said,
  and left out: Point data reads the points.
- **The border of two study areas.** The stretch of the first area's outline that lies within a distance of the
  second's. Two countries' outlines, drawn apart, rarely meet exactly, so the distance is what lets them meet. It is
  500 m unless changed: on Rwanda's border with DR Congo, from two sources, that found the whole border, and more found
  no stretch that is not border.

All positions are longitude and latitude on WGS84, as every one of these formats states them; nothing is converted.

## What you connect

| Port | What goes there |
| --- | --- |
| **area** | in border mode only: a study area |
| **area_2** | in border mode only: the study area it borders |

Read from a file, it takes no input. Its output is **lines**, which Map takes on its **lines** port.

## How to use it

In **Configure…**:

1. **Where the lines come from**: a file, or the border of two study areas.
2. **A file**: choose it. **After** draws the lines and lists each with its length.
3. **A border**: connect the two study areas on the canvas, or choose them under **Inputs** in the Inspector. **Before**
   draws the two areas; **After** draws the border over them and gives its length. Change **Outlines within, metres**
   where the border is broken into pieces or does not appear.

Nothing reaches the workflow until **Apply**.

## What it will not do

- **Route along its lines.** A line is not a street network: no routing step takes it.
- **Find roads in OpenStreetMap.** Not built yet; read a GeoJSON of roads instead.
- **Draw on every map.** Map draws lines on a map with a study area and on a map of lines alone; on a map that leads
  with polygons, a raster or a street network the lines are carried and not yet drawn, and the key does not list them.

## How it was checked

- `tests/line-layer.test.mjs` (Node): a GeoJSON file read with its points and areas counted; lengths on the sphere; the
  border of two drawn areas 50 m apart found within 100 m and not within 10 m.
- `tests/line-layer.browser.mjs`, Chromium and WebKit: a GPX file's tracks and routes read in Configure…, its waypoint
  counted; the border of two study areas drawn After and run; lines drawn on Map, static and interactive.
- Measured on Rwanda's Western Province and DR Congo's Kivus: [experiment 229](../experiments/229-a-line-layer.md).

## History

### 2026-11-22 · First release (0.1.0)

Lines read from a file or taken as the border of two study areas, and drawn on Map. Its first
use, a buffer along a border to find the health facilities just inside it, waits on Geometry buffer taking lines.
