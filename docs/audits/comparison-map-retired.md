# Comparison map, retired into Map and a Table

_Created 2026-11-20 · Updated 2026-11-20_

**Result:** retired 2026-11-20. `comparison_map` 1.0.0 is retired; Map 0.39.0 draws a Mean center as a point, and
Compare point sets 0.3.0 hands on a table of its distances.

## Why

The practitioner, 2026-11-20: *"I also noticed comparison map widget is still in the palette. We should have retired it
already."* It had been listed as bound to one example since 2026-10-12 (widget audit, R7 in TODO.md), and held on the
palette by the `presentation-stage` blocker.

| Checked | Found |
| --- | --- |
| Where it is used | One built-in example, *John Snow: can the locations be shared safely?* (`snow-geoprivacy`), as its last step. |
| What it read | Compare point sets' result only, a type no other widget took. |
| What it drew | The original and moved points side by side with their mean centres and the eight pumps; eight representative donuts; how far the centre moved and each centre's nearest pump; a caveat. |
| What Map could already do | Take up to eight point layers, with a study area. Not a Mean center, whose output was its own type. |

The practitioner chose, of three ways: into Map, with the numbers as a table.

## What changed

- **Map** takes a Mean center on a point layer, drawn as one point named by its step (`src/core.ts`, the inputs of a
  step; `portAccepts`). Any step taking points can now take one.
- **Compare point sets** hands on a table, one row per measure, in metres: how far the mean centre moved, each mean
  centre to its nearest pump with the pump named, and how far a point moved, least, median and most. Its receipt is
  unchanged. Its Inspector moves to the standard, in `src/point-comparison-ui.ts`, where the drawing was.
- **The geoprivacy example** ends in a Map of the original and moved points, both mean centres and the pumps, over the
  study area, and a Table of the distances, both labelled PRIVATE.
- **A saved workflow** whose Comparison map is fed by Compare point sets opens rewritten the same way, the map stamped
  as migrated, with the study area its other maps use. One fed by nothing loses the step.
- **The `presentation-stage` blocker** is withdrawn: the display-only widget it held on the palette is gone.

## What is given up

- **The representative donuts**: eight pairs of an original location and its moved copy, drawn large inside the
  measured band. The table keeps the band, least, median and most; the pairing is not drawn.
- **Two panels on one scale.** The original and moved points share one map, each a layer that can be switched off.
- **The caveat in the view.** It is now in Compare point sets' manual, under *What it will not do*: the comparison keeps
  original coordinates and is for teaching, not sharing; a centre that barely moves does not establish privacy; the
  pumps give context, not use.

## Regime

No deprecation period: nobody outside this project uses it (AGENTS.md, *Retiring a widget*).

## Not established

That a practitioner reads the mask's effect from one map of 510 points as well as from two panels and the donuts.

## Checked

`tests/geoprivacy.test.mjs`: the example runs, its Map holds 510 points (250 original, 250 moved, 2 mean centres,
8 pumps), the distances are in metres, and the receipts still conform. `tests/geoprivacy.browser.mjs`: the Map and the
Table are shown, the measured band lies within the 50 to 125 m donut widened by the ellipsoid's 0.32%, and a new seed
moves the centre by a different distance. Chromium.
