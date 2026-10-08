# Experiment 29: complete edge pixels with a visible clipping footprint

Date: 2026-10-06. Local developmental prototype, following [Experiment 28](28-raster-preview-and-adjustment.md).

## Practitioner question

Can the map hide the unbounded portions of raster pixels, with a slight outward margin, while retaining complete data inside the polygon?

New Clip raster nodes default to **All touched** and zero margin. Existing saved **Cell center inside** operations keep their method. Pixel inclusion and **Outer margin (native pixels, 0–1)** are editable in the Clip raster inspector and in its preview. Apply saves both the independent cutline and processing settings; Cancel discards drafts. Preview counts use the same computation as Run.

For an outward margin, select **One pixel around Study area** under **Extra source coverage** when preparing the original GeoTIFF. An existing retained asset cannot supply values beyond its extent: reselect the original file and prepare again if needed. The source padding is represented by the retained window and its georeferencing. Enlarging the clip still requires real source coverage and must respect memory limits.

## Architectural decisions

**A101 — Separate pixel selection from pixel presentation.** All-touched retains a native cell when its closed rectangle intersects the polygon or configured outward margin, including edge/corner contacts within available coverage. Cell-center remains available for legacy work. Neither method resamples values, estimates population totals, or assigns fractional-cell weights. The map uses an SVG alpha mask to hide portions outside the footprint. Exported GeoTIFFs retain whole native cells on a rectangular georeferenced grid, with the mask method, margin and boundary in their description. They are not subpixel raster encodings.

**A102 — Margin is a processing parameter in native pixel coordinates.** The permitted margin is 0–1 pixel, measured by Euclidean distance after transforming coordinates into the source grid. This is not a metre buffer; geographic pixels may have unequal physical dimensions. Round joins in the SVG display use the same pixel-coordinate space. Positive margin expands outer boundaries and contracts holes. Multipart polygons are a union. A small numerical tolerance handles floating-point contacts.

Equivalence with GDAL is now measured, and it does not hold for All touched.
Against `rasterio` 1.5.2 with GDAL 3.12.2, over a synthetic CRS84 grid and a
cutline with vertices deliberately placed on pixel corners, **Cell center inside
agrees exactly**: same cropped window, same 132 included cells, same retained
values. **All touched does not**: Fieldwork includes 35 cells that GDAL excludes
and none that it includes, and its cropped window is one cell wider on each
side. All 35 differing cells sit beside a cutline coordinate lying exactly on a
pixel boundary.

Two causes, both in this prototype's own definition rather than in GDAL. The
inclusion test measures distance to a **closed** cell rectangle, so a cutline
edge running exactly along the border between two cells touches both of them,
while GDAL's ALL_TOUCHED assigns such an edge to one side. Separately,
`clipRaster` pads the All touched window by 1e-9 pixel, which flips a floor at
an exactly aligned boundary and widens the window by a whole cell; the extra
frame is written as NoData.

The difference is one-sided: All touched here is strictly more inclusive than
GDAL's. For a count-valued raster such as population, retaining extra boundary
cells inflates any total computed from the clip, so a figure derived from an All
touched clip is not comparable with a GDAL-derived one without stating which
convention produced it. Whether to change the convention, or to document it as
deliberate, is an open decision; the measurement is recorded in
[the Validation Lab record](41-validation-lab.md) and reproducible from its
check 02.

**A103 — Missing data stays missing.** Edge selection can retain an actual source value that a center-only mask would discard. It cannot fill source NoData. Gray within the footprint denotes NoData; outside is transparent. Counts describe selected cells and selected cells with valid data. All-touched and positive margins can select cells extending beyond the original study polygon, so summing whole population-count pixels requires a separate, explicitly justified statistical operation.

**A104 — Settings travel with the evidence.** Clip parameters persist in workflow JSON and encrypted packages. Run evidence records the inclusion method and `fw:rasterMarginPixels`, separately from the shared Study area and actual `fw:clipGeometry`. No new geometry engine is required for this bounded, north-up EPSG:4326 prototype. Projection, resampling and arbitrary raster support remain separate future operations.

## Evaluation

Local validation: TypeScript/build and 76 unit tests passed. The full Chromium run passed 46 cases and identified an incorrect baseline in the new margin test: source preparation adds explicit CRS metadata before clip editing. After moving that test's baseline to the prepared input, the remaining case passed. A subsequent focused raster unit run also passed all 10 cases, including parameter portability and invalid-margin rejection. The real Botswana file was enabled in the full run. Widget validation covers 21 identities and 41 releases; SHACL validation conforms. These are Chromium and local computation checks, not cross-browser or practitioner-effectiveness certification.

Automated cases cover diagonal boundaries, small polygons without an interior pixel center, holes, multipart geometry, source NoData and zero preservation, margin constraints, missing coverage, TIFF round trips, and legacy center behavior. Browser scenarios exercise draft cancellation, invalid-margin feedback, saved parameters, preview/run agreement, receipt metadata, SVG transparency and reload persistence. The existing actual Botswana WorldPop exercise continues to verify original pixel values.

Practitioner evaluation should ask users to explain the difference between a selected cell and its visible portion, identify true NoData, and predict whether adding a margin changes the population represented. Regression success alone does not establish understanding or scientific validity.

## Related projects

See [Prior art: concepts and tools to adapt and adopt](../prior-art.md) for openEO, QGIS Processing Modeler, Geo Engine and APE, their architectural fit and proposed adoption experiments.
