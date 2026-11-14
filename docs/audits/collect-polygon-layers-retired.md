# Collect polygon layers, retired into Map

_Created 2026-11-13 · Updated 2026-11-13_

**Result:** retired 2026-11-13. `stack_polygons` 1.0.0 is retired; Map 0.29.0 takes each polygon layer on its own input.

## Why

The practitioner, 2026-11-13, of South London's *The river as it runs*: *"This is collect polygon layers widget and I
think we can retire it as we can connect polygon layers directly to the Map output. Thoughts? This would decrease the
number of widgets."*

| Checked | Found |
| --- | --- |
| Where it is used | Two South London workflows, *The ground* and *The river as it runs*, each collecting two Polygon layers for one Map. No built-in example. |
| What reads its output | Map only, in both. |
| What it did that Map did not | Let a Map take more than one polygon layer: Map had one `polygons` input, and point layers had `points` to `points_8`. |
| What else it did | Larger polygons drawn first; each feature kept its layer's name, which Map's layer list then read back to list the layers again. |

## What changed

- **Map** declares `polygons`, `polygons_2` … up to six, as many as `polygonInputCount` says; a layer dropped on
  *Add a layer* takes the next. Two or more are collected for drawing by `collectPolygonLayers`
  (`src/polygon-layers.ts`), the widget's ordering moved unchanged. Map's receipt names every polygon layer it used.
- **A saved workflow** whose collector feeds only maps opens rewritten: each collected layer on the map's next polygon
  input, in order, the map stamped as migrated. One whose collector feeds another step is refused, and the refusal
  names it.
- **The South London example** is rewritten the same way, and re-pinned.

## What is given up

Collecting several layers for a step other than a map: summarising deaths over four travel-time bands at once, which a
test did and no example does. Each band is summarised by its own step instead.

## Regime

No deprecation period: nobody outside this project uses it (AGENTS.md, *Retiring a widget*).

## Not established

That a practitioner finds the second polygon input on the canvas without being told it is there.

## Checked

Validation Lab check 16, re-run on Map 0.29.0's collecting (lab bfb0585): the draw order agrees with the independent
recomputation, no ties. South London's two workflows open rewritten and draw 34 polygons in four layers, each polygon
layer by its own name (`tests/recreate-from-scratch.browser.mjs`, built from an empty canvas through Add a layer);
Chromium.
