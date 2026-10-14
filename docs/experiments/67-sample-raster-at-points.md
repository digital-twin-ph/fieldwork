# 67 · Sampling a raster at points

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. Proposes one primitive, no new port type
and no new vocabulary beyond the terms it emits.

[Experiment 62](62-workflow-traversal.md) traced the sea-level workflow and found that nothing
in the application can put a raster value onto a point. The consequence is specific: the
elevation attribute `slr_threshold_comparison` requires **cannot be produced here at all**, so
a shipped widget depends on data the host cannot make, and the worked example cannot be
completed with real facility elevations however good the extraction script is. This is the gap
that postpones the pack work rather than the other way round.

Extracting values to points is not a sea-level concept. The same primitive serves population
density at a facility, rainfall at a sentinel site, land-surface temperature at a settlement.

## Audit answers (D1–D10)

- **D1** — **Primitive, on the palette.** Residual knowledge that does not follow from its
  parts: a cell value is not a measurement at the point, and no-data is not zero. A
  practitioner asks for it by name — "the elevation at each facility".
- **D2** — Nothing samples today. `clip_raster` masks a raster by a polygon; `coverage_check`
  tests containment and returns a check. Neither puts a value on a feature.
- **D4 / D4a** — Inputs are the general `points` and `raster` carriers; the output is the general
  `points` carrier with one attribute added. **No new port type**, so no custom studs.
- **D5** — The value's unit is declared on the node, author-stated and never inferred, and its
  stated/unstated status travels into the receipt, as `table_input` does for a table.
- **D7** — "Sample raster at points" states the operation. Not "extract elevation", which names
  one use; not "read raster", which claims less than it does.
- **D9** — It adds one node to a workflow that today cannot be built at all, so it enables
  rather than lengthens. No existing example changes.
- **D10** — Exercised by the sea-level example once that example has data, and by a check
  against the bundled Botswana raster meanwhile.

## Contract

`sample_raster`: inputs `points` and `raster`, output `points`.

| Parameter | Meaning |
| --- | --- |
| `attribute` | The attribute name to write. Must be a valid attribute key and **must not already exist** on the layer |
| `valueUnit` | What the sampled numbers measure, author-stated. Blank is recorded as unstated, never as dimensionless |

## Distinctions, and how each is enforced

| Distinction | Enforcement |
| --- | --- |
| **A cell value is not a measurement at the point.** It is the value of the cell containing it, at the raster's resolution | **Limitation**, stated in the description and the receipt's method, with the cell size recorded so a reader can judge it |
| **No-data is not zero** | **Behaviour, and counted.** A no-data cell yields no attribute value and increments a reported count. Never zero-filled, following [48](48-tabular-input.md) |
| **A point outside the raster has no value** | **Behaviour, and counted separately** from no-data. Never clamped to an edge cell |
| **A point with no coordinates cannot be sampled** | **Behaviour, and counted.** Consistent with site assignment, which already refuses points without coordinates |
| **One cell convention, stated** | **Validation rule.** The value is the cell containing the point under `PixelIsArea`; no interpolation is performed and none is claimed. Offering bilinear would be a numerical claim needing parity evidence it does not have |
| **Sampling creates no data the source lacks** | **Limitation**, in the words `clip_raster` already uses |
| **An existing attribute is not overwritten** | **Validation rule**: a name already present on the layer is refused, so a sample cannot silently replace survey data |
| **The raster's CRS must match** | **Validation rule.** A raster is `EPSG:4326` by type here and the host implements no datum shift ([40](40-reprojection-primitives.md)) |

The two counts matter for the same reason the two counts in
[65](65-ruleset-as-data.md) do: a point outside the raster is a question about coverage, and a
no-data cell is a statement by the source. Merging them would let a badly aligned raster look
like a sparse one.

## Validation this commits to

Unit checks: a sampled value equals an independently computed value for a known cell; a
no-data cell yields no value and is counted; a point outside the bounds yields no value and is
counted separately; a point without coordinates is counted; an attribute name already on the
layer is refused; an invalid attribute key is refused; the receipt records resolution, the
three counts and the unit status; and a sampled layer remains a valid `points` input to
everything that accepted it before.

A browser check samples the bundled Botswana raster at Old Naledi sample locations, displays
the new attribute in a table, and reloads offline.

Parity is the honest next step and is **not** claimed here: agreement with a `rasterio` or GDAL
point sample belongs in the Validation Lab, which currently covers four widgets of thirty-nine
([kinds of validation](../audits/validation.md)).

## What this cannot establish

That a sampled elevation is suitable for any comparison — that is the vertical reference
question, enforced separately on the comparison itself ([62](62-workflow-traversal.md)). That
the raster is right, or current, or at a useful resolution for the question. And nothing about
interpolation, which is deliberately not offered.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
