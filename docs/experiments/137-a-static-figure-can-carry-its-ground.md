# 137 — A static figure can carry its ground

_Created 2026-10-25 · Updated 2026-10-25_

**Status:** asked — designed here, not built. Moving to `tried` needs tiles baked into one
worked example's static figure with its credit, and the alignment error measured rather
than argued.

The practitioner, 2026-10-25, on a Gaborone map: *"There is no default basemap (could be
natural earth)"*. Then, on the licence and privacy question this raises: *"As long as we
don't send any data to the tile provider, just the tile request, we should be OK."* Then,
after South London was re-imported: *"I still don't see the static map basemap"*.

It is not a defect. `src/catchment-map.ts` states the current rule in the Inspector: a
basemap switches the map to the interactive presentation, *"the only one that draws tiles"*.
So a static figure has never had ground under it, and the figure this project most wants to
publish is the static one.

## That the medium is not the obstacle

Python's **contextily** does exactly this for matplotlib: `add_basemap(ax, crs=…, source=…)`
fetches tiles for the axes extent and draws them into the figure. The figure is then
self-contained — which is *better* for [experiment 136](136-a-figure-that-stands-on-its-own.md)
than an interactive map, because a reader with the file has the ground too.

So the constraint here is an artefact of this application's renderer split, not of static
images.

## What the tile request discloses, stated once

The practitioner's condition is met in the narrow sense: a tile request carries no workflow
data, no records and no attributes. It does carry the **tile coordinates**, and those are
the viewed extent. For Gaborone or 1854 Soho that is not sensitive. For a workflow using
`donut_geomask` the extent is the one geographic fact being protected, and this project
should not quietly undo a geomask to draw a prettier figure.

So: off by default, chosen per map, and the receipt records that tiles were requested and
from whom. The application already warns in those words; what is new is that the warning
now applies to a figure that can be published with the tiles inside it.

## Raster and vector are different problems

`src/catchment-map.ts` says it plainly: *"OpenFreeMap serves VECTOR tiles, not raster, so
these cannot be an `L.tileLayer` URL."*

| choice | kind | bakeable |
| --- | --- | --- |
| `osm` | raster | yes — fetch PNG, embed as a `data:` URI |
| `topo` | raster | yes |
| `ofm-liberty`, `ofm-positron`, `ofm-bright` | vector, MapLibre | not without rasterising a GL canvas first |

The practitioner's own selection was `ofm-positron`, which is the hard case. This record
proposes the raster path only, and says so rather than appearing to deliver both.

## The projection mismatch, which is the real engineering question

Tiles are **Web Mercator**. This project's static plot is not: it projects
`x = (lon − west)·cos(midLat)·scale`, `y = (north − lat)·scale` — equirectangular with one
cosine factor taken at the middle latitude.

Laying Mercator tiles on that plot misaligns, and the error grows with the latitude span,
because Mercator's `dy/dlat` goes as `1/cos(lat)` while this plot's is constant.

Two honest options, and the second is proposed:

1. **Reproject the plot to Web Mercator when a basemap is drawn.** Exact, and changes the
   geometry of every existing figure that turns one on.
2. **Place each tile by its own corners.** A tile's lon/lat bounds are known; project those
   four corners with the plot's own projection and place the image between them. The
   approximation then applies *within* one tile rather than across the figure, which makes
   it piecewise and small.

For option 2 the within-figure error is bounded by how much `1/cos(lat)` varies across one
tile. At South London (51.4°–51.5°N) across the whole extent that is about
`tan(51.45°)·0.1°·π/180 ≈ 0.22%`, under 1.5 px on a 650 px figure, and far less within a
single tile. **This is a calculation, not a measurement**, and measuring it on a real
extent is what moves this record to `tried`.

## Attribution is a condition of use, not a courtesy

OpenStreetMap tiles are ODbL. A figure that bakes them in and is then published without
`© OpenStreetMap contributors` breaks the licence, and a figure is exactly the artefact
that travels away from the application that drew it. `mapPresentation` already derives
`attribution` separately from the editorial source note, with the comment that it is an
obligation a practitioner cannot opt out of by leaving a field blank. The baked figure
draws that string, and [experiment 136](136-a-figure-that-stands-on-its-own.md)'s
`BasemapIsCredited` rule — which reports `inapplicable` today — becomes applicable and
starts checking it.

OpenStreetMap's tile usage policy also applies: this fetches a handful of tiles for one
figure, which is ordinary use, and it must not become bulk download. OpenFreeMap publishes
a cap of 3,000 tiles or 50 MB for offline caching, recorded in `catchment-map.ts`.

## What this does not establish

- That Natural Earth is served by this. It is not. Natural Earth answers a different
  question — context at national and regional extent, as bundled public-domain geometry
  with no network request at all — and at Gaborone's or Soho's extent it is far too coarse
  to show anything. It deserves its own record.
- That a baked figure is small. Each 256 px tile is tens of kilobytes as a `data:` URI, and
  a figure needing a dozen of them grows by a few hundred kilobytes. The size belongs in
  the measurement that moves this to `tried`.
- Anything about the vector styles, including the one the practitioner had selected.
