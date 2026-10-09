# Experiment 29: complete edge pixels with a visible clipping footprint

_Created 2026-10-07 · Updated 2026-10-08_

Date: 2026-10-06. Local developmental prototype, following [Experiment 28](28-raster-preview-and-adjustment.md).

## Practitioner question

Can the map hide the unbounded portions of raster pixels, with a slight outward margin, while retaining complete data inside the polygon?

New Clip raster nodes default to **All touched** and zero margin. Existing saved **Cell center inside** operations keep their method. Pixel inclusion and **Outer margin (native pixels, 0–1)** are editable in the Clip raster inspector and in its preview. Apply saves both the independent cutline and processing settings; Cancel discards drafts. Preview counts use the same computation as Run.

For an outward margin, select **One pixel around Study area** under **Extra source coverage** when preparing the original GeoTIFF. An existing retained asset cannot supply values beyond its extent: reselect the original file and prepare again if needed. The source padding is represented by the retained window and its georeferencing. Enlarging the clip still requires real source coverage and must respect memory limits.

## Architectural decisions

**A101 — Separate pixel selection from pixel presentation.** All-touched retains a native cell when its closed rectangle intersects the polygon or configured outward margin, including edge/corner contacts within available coverage. Cell-center remains available for legacy work. Neither method resamples values, estimates population totals, or assigns fractional-cell weights. The map uses an SVG alpha mask to hide portions outside the footprint. Exported GeoTIFFs retain whole native cells on a rectangular georeferenced grid, with the mask method, margin and boundary in their description. They are not subpixel raster encodings.

**A102 — Margin is a processing parameter in native pixel coordinates.** The permitted margin is 0–1 pixel, measured by Euclidean distance after transforming coordinates into the source grid. This is not a metre buffer; geographic pixels may have unequal physical dimensions. Round joins in the SVG display use the same pixel-coordinate space. Positive margin expands outer boundaries and contracts holes. Multipart polygons are a union. A small numerical tolerance handles floating-point contacts.

Equivalence with GDAL was measured, found not to hold for All touched, and the
rule has since been changed to match. Against `rasterio` 1.5.2 with GDAL 3.12.2,
over a synthetic CRS84 grid and a cutline with vertices deliberately placed on
pixel corners:

| Case | Reference | Fieldwork | Outcome |
| --- | --- | --- | --- |
| Cell center inside, margin 0 | 132 cells | 132 cells | Agrees exactly, including the window and retained values |
| All touched, margin 0, before | 146 cells | 181 cells | 35 differing cells, window one cell wider on each side |
| All touched, margin 0, now | 146 cells | **144 cells** | **2 differing cells, window agrees** |

**The rule.** A cell is included when the cutline covers part of its area or
crosses its interior. An edge lying exactly on the border between two cells
belongs to the covered one, so no exterior ring is added, and the window is no
longer padded by a fraction of a pixel. Getting there corrected an intermediate
assumption: treating a cell as owning the half-open area `[column, column+1)`
still added a ring, because GDAL does not burn the cell on the **outside** of an
exactly aligned edge. Positive-area coverage is the rule that matches.

**The residual 2 cells** are GDAL-only, in the row whose top border is exactly
the cutline's southernmost extent. They come from GDAL's line rasterizer burning
cells along an exactly aligned vertex, which is an artifact of that
implementation rather than a rule anyone can state. Reproducing them would mean
reproducing the rasterizer's quirks, so they are recorded instead. "Use GDAL's
rule" has a clean answer that reaches 2 cells of 146; the last 2 are GDAL being
GDAL.

**Provenance.** A method name alone cannot distinguish a clip made under the old
rule from one made under the new one, and receipts previously recorded nothing
about the margin, so two different clips were indistinguishable in their
evidence. Each raster receipt now carries `fw:rasterMaskConvention`, constrained
by SHACL to a known identifier, and `fw:rasterMaskMarginPixels`. Receipts
exported before 2026-10-08 carry no convention and were produced by the earlier,
more inclusive rule.

**Effect on saved work.** Re-running a saved All touched clip can retain fewer
boundary cells, so a total derived from one can change; for a count-valued raster
such as population that total was previously inflated relative to GDAL. Cell
center inside is unaffected. `clip_raster` is released as **1.0.0** with the
effect recorded, and a unit test pins the convention at an exactly aligned
border. The margin remains this prototype's own extension with no GDAL
equivalent, compared only against a dilation model, so it is unvalidated. The
measurement is reproducible from the Validation Lab's check 02.

**A103 — Missing data stays missing.** Edge selection can retain an actual source value that a center-only mask would discard. It cannot fill source NoData. Gray within the footprint denotes NoData; outside is transparent. Counts describe selected cells and selected cells with valid data. All-touched and positive margins can select cells extending beyond the original study polygon, so summing whole population-count pixels requires a separate, explicitly justified statistical operation.

**A104 — Settings travel with the evidence.** Clip parameters persist in workflow JSON and encrypted packages. Run evidence records the inclusion method and `fw:rasterMarginPixels`, separately from the shared Study area and actual `fw:clipGeometry`. No new geometry engine is required for this bounded, north-up EPSG:4326 prototype. Projection, resampling and arbitrary raster support remain separate future operations.

## Evaluation

Local validation: TypeScript/build and 76 unit tests passed. The full Chromium run passed 46 cases and identified an incorrect baseline in the new margin test: source preparation adds explicit CRS metadata before clip editing. After moving that test's baseline to the prepared input, the remaining case passed. A subsequent focused raster unit run also passed all 10 cases, including parameter portability and invalid-margin rejection. The real Botswana file was enabled in the full run. Widget validation covers 21 identities and 41 releases; SHACL validation conforms. These are Chromium and local computation checks, not cross-browser or practitioner-effectiveness certification.

Automated cases cover diagonal boundaries, small polygons without an interior pixel center, holes, multipart geometry, source NoData and zero preservation, margin constraints, missing coverage, TIFF round trips, and legacy center behavior. Browser scenarios exercise draft cancellation, invalid-margin feedback, saved parameters, preview/run agreement, receipt metadata, SVG transparency and reload persistence. The existing actual Botswana WorldPop exercise continues to verify original pixel values.

Practitioner evaluation should ask users to explain the difference between a selected cell and its visible portion, identify true NoData, and predict whether adding a margin changes the population represented. Regression success alone does not establish understanding or scientific validity.

## Related projects

See [Prior art: concepts and tools to adapt and adopt](../prior-art.md) for openEO, QGIS Processing Modeler, Geo Engine and APE, their architectural fit and proposed adoption experiments.
