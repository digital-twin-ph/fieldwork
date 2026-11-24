# Line layer

_Created 2026-11-22 · Updated 2026-11-24_

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

### 2026-11-24 · The map pans until you start a line (0.4.0)

Press **Start a line**, then click to lay down each position. Until you press it, dragging pans the map and a click
does nothing.

Before this, every click laid down a position — and a press-and-release that barely moves *is* a click as far as the
map is concerned, so there was no way to look around without leaving a point behind. Finishing a line now returns
the map to panning, so the next click starts nothing you did not ask for.

You can still pan while drawing: drag to move the map, click to lay down a position. A route can be longer than one
screen, so that had to keep working.

The mode is shown three ways — the button looks pressed, the pointer becomes a crosshair, and the map gets an
outline — because one small visual cue is easy to miss. The line of text under the map says what the mouse will do
next, and it was blank when the dialog opened until now.

### 2026-11-24 · An arrowhead, and a map that shows (0.3.0)

The line you are drawing now ends in an **arrowhead** pointing the way it runs, instead of a filled dot. The hollow
marker at the start is unchanged, so one glance tells you both which end is which and which way the line goes — and
it is the same arrowhead Map draws when you set it to mark direction, so what you draw here is what the figure shows.

The drawing map also used to open as a single tile in one corner with grey around it. It was measuring a panel that
had no size yet; it now waits for the layout, and keeps up when the panel changes size or goes full screen.

### 2026-11-24 · Routes and flows drawn on a map (0.2.0)

A third way to make a layer, beside a file and a border: **draw it**. Click the map to lay down each position of a
route or a flow, press **Finish the line**, and name it. It is what pushpins are for points.

**The order you click is the direction.** A flow drawn from a camp to a clinic is not the same as one drawn from
the clinic to the camp, so the map shows where each line starts and where it ends, and **Reverse** turns one round
rather than making you draw it again. Nothing else had to be invented for this: a line is an ordered sequence
already.

A drawn layer names no file, because there is none — what it has instead is you and the day you drew it. One click
is a place rather than a route, so a line of one position is refused and says how to continue it. Two hundred
lines is as many as drawing one by one is good for; past that, read them from a file.


### 2026-11-22 · First release (0.1.0)

Lines read from a file or taken as the border of two study areas, and drawn on Map. Its first
use, a buffer along a border to find the health facilities just inside it, waits on Geometry buffer taking lines.
