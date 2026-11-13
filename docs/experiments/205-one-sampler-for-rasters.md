# 205 · One sampler for rasters, at points or over areas

_Created 2026-11-11 · Updated 2026-11-13_

**Status:** tried. Built 2026-11-11 in 0.94.0: Sample a raster reads a raster at points or over areas, or satellite files; the satellite sampler is retired into it. The lab check against an external zonal sum is not yet done. TODO 24.

## The question

The practitioner, 2026-11-11, asking how to compare the populations WorldPop, GRID3 and GHS-POP express: *"how do we
compare populations expressed by their models"*, then *"before we add let's survey for potential duplication"*, then,
of the widget that already totals a grid over areas: *"sample satellite files does not explicitly say it takes rasters
that might be a problem."* Then the name, chosen from four: **"Sample a raster at points or over areas"**; and the
design, chosen from three: **the output follows the input**.

## What exists, surveyed by input and output

| Widget | In → out | Over areas? |
| --- | --- | --- |
| Sample raster at points | points + raster → points | No |
| Sample satellite files at points or over areas | points, a polygon layer or a study area's units + satellite files → table | Yes: sums of cells whose centre is inside or on the area (`src/satellite-areas.ts`), the rule Clip raster uses and lab check 02 holds against rasterio |
| Clip raster | area + raster → raster | One area, masked; no total |
| Summarize points to polygon | points + polygons → polygons | Points, not cells |
| Rate with a denominator | records → table | A stated population |

Used: Sample raster six times in the sea-level rise example (points onto maps); the satellite sampler in Brazil dengue
(six) and New York ozone (two), tables.

## Design

**One widget, `sample_raster`, titled "Sample a raster at points or over areas".** It takes a Raster input (or Clip
raster) or satellite files, and points or areas.

**The output follows the input**, set by the step and stated on it, on the precedent of Combined area (`yields`),
Deduplicate records (`format`) and Apply ruleset:

| Connected | Out | Each place carries |
| --- | --- | --- |
| A raster, points | points | the cell's value, as today |
| A raster, areas (a polygon layer or a study area's units) | polygons | the total of its cells, the count of cells, and how many had no data |
| Satellite files, points or areas | table | one row per place and file period, as today |

**Retired:** the node type `sample_satellite_files_at_points`. A saved workflow holding one opens migrated
(`migrateSatelliteSampler` in `src/core.ts`, stamped), its settings kept and the source stated as satellite files. A
retirement, not a rename: the two widgets' release histories overlap in version numbers, and a rename would have to
merge them. No deprecation period: nobody
outside this project has built on it (AGENTS.md, retiring a widget).

**Over areas, from a raster:** the cells whose centre is inside or on the area, by `rasterCellPredicate` (cell centre) in `src/raster-areas.ts`, the rule Clip raster
and the satellite sampler use; summed, never averaged first; a cell the raster marks as no data counted apart, never as
zero; an area reaching past the raster's window said, with how many of its cells were outside it.

## Distinctions, and how each is enforced

| Distinction | Enforced as |
| --- | --- |
| A total is of the cells inside the area, not of an area-weighted share | Limitation, said in the receipt and the manual |
| No data is not zero | Run-time: counted apart in the output |
| A raster's window that does not cover an area is not a total of that area | Run-time: the share outside is said on the area |
| Points and areas are not mixed in one step | Hard stop, as the satellite sampler does today |

## Validation it commits to

- Unit: totals on a small grid against hand counts, a no-data cell, an area half outside the window.
- Lab: a check against rasterio's `rasterstats`-style zonal sum on the same grid and polygons, before the comparison
  example ships.
- Browser: a Raster input over a study area's units gives polygons with totals; a saved satellite sampler opens as the
  merged widget and runs unchanged (Brazil dengue).
- **Practitioner observation, before it is known:** whether a person reading three totals side by side reads the gap
  between them as error in one model, or as three different definitions of population.

## Not established

Area-weighted totals for cells split by an edge: a 100 m cell over a ward of a few hectares can matter, and the rule
here counts a cell whole or not at all.

## 2026-11-13: found walking the practitioner's workflow by hand

Botswana's 10 districts (geoBoundaries ADM1, 47,321 vertices) over WorldPop Global2 2025 (11,248 by 10,953 cells kept)
did not finish in ten minutes on the published site (0.110.0): each area tested every cell of its box against every
vertex, billions of tests for Central District. The tests used grids of a hundred cells, so nothing caught it. The cells
are now found by scanline, row by row from where the outline crosses each row's centre line, by the same cell-centre rule:
`tests/raster-areas-scanline.test.mjs` holds it equal to `rasterCellPredicate` cell for cell over 25 random outlines with
holes and parts, and on a centre placed on the outline. The run took 6.3 s. Every district's total and cell count equals
rasterio's (`rasterio.mask`, `all_touched=False`) over the same two files: South-East 396,924.5 over 66,156 cells;
2,229,207 cells in all. 166 cells of the districts lie beyond the window Raster input kept, and are said.

The same walk found the map's ramp drawn across the middle of the districts (placed for a 295 frame in a 650 one) and its
key calling the totals "the joined value"; both fixed in 0.110.1.

