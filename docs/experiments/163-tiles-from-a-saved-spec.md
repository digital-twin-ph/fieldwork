# 163 · PMTiles on a map: can a saved spec fetch the tiles again?

_Created 2026-11-02 · Updated 2026-11-02_

**Status:** tried — built 2026-11-02 and imported into a Chromium page from the real archive once. WebKit reached a
one-tile local archive only.

## The task

The practitioner, 2026-11-02: *"On an empty canvas the PMTiles workflow should be to enable the user to
import the tiles one time while connected and use the study area as boundary for filtering the required
tile set."* The import sits on the map widget. *"We keep specs not the asset. What we need to discover is if
the saved spec can be used to download the same asset on another laptop."*

Experiment 52 concluded *PMTiles for interactive navigation, Natural Earth for static figures*. It was not
built. MapLibre, which it weighed as a cost, has since arrived for another reason.

## What was measured, 2026-11-02

Requests made with `curl` carrying an `Origin` header.

| Source | Lasting | Range read | CORS |
| --- | --- | --- | --- |
| `build.protomaps.com`, daily build | Past week; 2026-10-08, the one 52 measured, is 404 | Yes | None; preflight 403 |
| `build.protomaps.com`, last of a patch version | 62 listed from 2023; 3 sampled returned 200 | Not sampled | None on the daily tried |
| `data.source.coop/protomaps/openstreetmap/v4.pmtiles` | Fixed name; last changed 2026-03-31 | Yes, 134.8 GB | Open; preflight 204 |

The retention rule is Protomaps' published one: all builds for the past week, and the latest for each patch
version.

## What was decided

**The answer to "the same asset" stopped mattering.** The tiles are context, and no value depends on them.
The practitioner: *"Not a big deal."* So:

| | Requires |
| --- | --- |
| Data and computed results | Exact, pinned by digest |
| Basemap tiles | The same area and a recent map |

The spec is the source, the boundary, the zoom range and the date. It travels and the tiles do not. Another
laptop imports what is there. Digest and ETag checks on tiles, designed earlier the same day, were dropped.
The practitioner: *"The reproducibility constraint goes into machine notes for limitations."* That note now
exists for every online basemap, in `basemapLimitation`.

## The design

- The control sits with the basemap choice on `map_output`, shown only in the interactive presentation.
- The boundary comes from what the map draws, so a polygon layer of 774 LGAs needs no special case.
- The tile set is fetched once by range request and kept on the device.
- A worked example exercises it, and Nigeria goes first. The gate uses a small local file in place of the
  archive, and one manual run reaches the real one.

## What was found, 2026-11-02

| Measure | Result |
| --- | --- |
| Nigeria, zoom 0 to 10, sampled estimate beforehand | 33 MB |
| Nigeria, zoom 0 to 10, imported | 1,344 tiles, 49.2 MB, about 1.5 times the estimate |
| Build read from the archive | 2026-03-31 |
| Browser range reads and CORS from a page | Worked, Chromium, Source Cooperative |

The whole Nigeria test took 7.0 minutes with the real import, against about 2.5 without.

Two things differed from the design. Labels were left out, because they need fonts from a server and this map
is meant to work offline. And the tiles are kept in the store project files use, not `payload-store`, which
loads whole at start-up.

The worked example also found a defect outside this experiment: Nigeria's priority map was keyed by zero-dose
ranges over polygons shaded by rule class. Figure, key and interactive map now share `polygonShading`.

## What this does not establish

- That an import works from a real archive in WebKit, or that it works offline after import. Neither was run.
- What zoom is practical to a practitioner. Zoom 10 was tried; nobody has judged it.
- Whether Source Cooperative will keep this file, or what replaces it.
- Whether the ODbL obligations on an extract held only on a device differ from those on a served tile. The
  credit on the figure is the same; this needs reading.
- That a practitioner notices, or minds, a map whose ground differs.
