# Experiment 28: preview and adjust raster clipping

_Created 2026-10-07 · Updated 2026-10-08_

Date: 2026-10-06. Developmental evaluation prototype.

Follow-up: [Experiment 29](29-raster-edge-inclusion.md) adds all-touched selection and a pixel margin. The fixed cell-center descriptions below record this earlier slice.

## Question

Can practitioners see how the study polygon intersects actual raster cells, adjust the boundary using map handles or numerical parameters, and understand the effect before running the workflow?

The worked exercise uses the Botswana WorldPop raster and Old Naledi. The previous release (`41e6f99`) was committed, pushed to CDC GitLab and replicated to GitHub before this slice began.

That release passed 73 unit tests and 44 Chromium scenarios locally, with the actual Botswana file enabled. [GitHub Pages run 37492641457](https://github.com/digital-twin-ph/fieldwork/actions/runs/37492641457) completed successfully; the deployed app JavaScript, HTML and asset manifest were checked against the run's Pages artifact. The preview implementation follows that release as a local development slice.

The corresponding [CDC pipeline 304077](https://git.cdc.gov/digital-twin/fieldwork/-/pipelines/304077) also succeeded.

## Interaction

The dedicated `?example=raster` workspace (Workspace → **04 · Old Naledi raster clipping**) provides the four connected widgets. It initially selects Raster input and waits for the practitioner to supply a local GeoTIFF. The inspector has navigation buttons for Raster input, Clip parameters and Map. It saves separately from other worked examples and supports the same project export/import as manually assembled workflows.

1. Prepare a Raster input, and connect it and a Study area to Clip raster.
2. Select **Preview and adjust** in Clip raster. No prior workflow run is required. The preview verifies the retained GeoTIFF and displays its pixels below the polygon. The basemap starts off; it is optional online context.
3. Adjust polygon vertices, redraw a polygon, or enter west/south/east/north coordinates. **Use these bounds** explicitly replaces the polygon with a rectangle. Numeric edits must be applied to the draft before Apply is enabled.
4. Inspect the output dimensions and cell-center counts: inside, inside with data, and outside. These are estimates produced by the same clipping function used at runtime, not population totals. Cells with no data remain distinct from zero.
5. Change raster opacity or fit the view to inspect the overlay. These are display controls; they do not change the analysis boundary, pixel values or project manifest.
6. **Apply clip parameters** saves the cutline and output label on Clip raster. The shared Study area and other consumers remain unchanged. Cancel discards the draft; Undo restores the prior parameters. Applying an unchanged saved cutline creates no edit. **Use Study area boundary** returns the operation to the connected boundary.
7. Run, inspect the map and N3/computation receipt, and download the derived raster if needed.

## Parameters and limits

| Control | Effect |
|---|---|
| Polygon vertices and drawing tools | Change the operation's proposed cutline |
| West, south, east, north | Replace the proposed boundary with a WGS84 rectangle, longitude/latitude in degrees |
| Clipped raster label | Rename the operation's output |
| Raster opacity and map zoom/pan | Display only; never change the clip |
| Cell-center mask, CRS and resolution | Displayed computational settings, fixed in this slice |

The clipping method remains cell-center inclusion, using native EPSG:4326 pixels. Reprojection, resampling, all-touched inclusion and fractional-cell weighting are not implemented.

The preview shows the **retained raster window**, not the national file. A proposed boundary outside that window produces a prominent coverage error and disables Apply. To expand further, edit the Study area separately and prepare the input again from the original local file. NoData within a window is not treated as missing geographic coverage.

The editor supports simple polygons with at most 200 vertices. Old Naledi's single-part MultiPolygon can be copied as a Polygon without dropping coordinates. The original shared source representation is preserved; edits affect only the operation's cutline. Holes and genuinely multiple polygons are not flattened or silently discarded; editing them remains future work.

## Architectural decisions

**A96 — Reuse drawing controls, separate parameter ownership (revised after practitioner feedback).** Clip raster owns its saved cutline. A newly connected simple Study area supplies an initial copy; Calculate area chains are followed to locate that source. The dedicated raster workspace starts with an independent copy of the pinned Old Naledi polygon. Adjusting the cutline changes only the operation. The shared Study area continues to define acquisition scope. Existing workflows without a saved cutline retain their connected-boundary behavior until parameters are applied. Unsupported complex boundaries are not silently simplified. This supersedes the first prototype's behavior of editing the shared Study area from Clip raster.

**A97 — Preview is a draft, not a run receipt.** Raster bytes are read from the existing content-addressed local asset store and checked against their hash, byte limits and actual TIFF dimensions/bounds before decoding. A prepared input or a chain of upstream clips can supply the preview. The current target polygon can be repaired even when it exceeds retained coverage. Preview does not write a derived asset, alter a source hash or mint evidence of a completed workflow run.

**A98 — One computational implementation.** Draft statistics call the same bounded `clipRaster` routine as execution. Native pixel placement and the display color ramp are shared with raster results. No additional GIS engine is introduced. Preview controls do not alter the cell-center method.

**A99 — Explicit persistence and semantic consequences.** Save uses the application's persistence transaction and refuses to close on failure. Successful edits update the project manifest and invalidate prior results. Workflow changes during asynchronous preview loading or editing reject stale saves. The next run preserves the shared Study area facts and separately emits the actual cutline as GeoSPARQL CRS84 WKT. `fw:clipGeometry` and `prov:used` connect the clipping activity to that geometry. GeoTIFF download and portable packages retain the actual cutline. Display opacity is not an analytic fact.

**A100 — A worked workflow composes shared widgets.** The dedicated raster example adds a workspace identity and connected graph, not parallel widget implementations or new scientific semantics. The pinned Old Naledi source boundary is retained. Raster bytes and citation are supplied through the standard input editor. Workflows with an unprepared raster do not auto-run on opening or switching workspaces; an explicit Run still performs ordinary validation. A prepared workflow resumes and reruns offline using retained local assets. No national raster is shipped or downloaded implicitly.

### Practitioner feedback: processing and output must remain distinct

The user reported that the improved result still looked like processing embedded in an output, with parameterized adjustments not exposed. The Clip raster inspector now explicitly lists the cutline, cell-center inclusion rule, native resolution and outside-cell NoData behavior beside the preview button. The Map inspector does not host the worked exercise's processing navigation. The user explicitly chose a separate clipping boundary initially copied from Study area; the saved workflow contract now contains optional `clip_raster.params.cutline` geometry and selection mode. The input asset and shared Study area are preserved.

The user also identified the large non-intersecting area at the upper right of the displayed clip. The result renderer now leaves the outside region transparent instead of painting the full rectangular raster extent gray. Gray is drawn only within the polygon to distinguish interior NoData. This is a presentation correction: outside pixel values remain NoData, native valid values are unchanged, and the GeoTIFF still has a rectangular georeferenced grid. The PNG alpha channel is checked against null cells in the run result.

## Evaluation

Revised prototype validation: all 74 unit tests and 46 Chromium scenarios passed, with the real Botswana WorldPop file enabled. Tests cover initial independent copying, preserving the shared Study area, parameter persistence, reset to connected boundary and Undo, cutline geometry in portable packages/manifests, distinct Study area and cutline WKT in evidence, and transparent output pixels. Registry validation covers 21 widget identities and 38 releases; SHACL validation conforms. Clip raster is version 0.4.0 and Map is version 0.4.1.

Regression scenarios exercise opening before execution, initial pixel overlay, offline preview, opacity without a workflow mutation, numerical coordinate replacement, out-of-coverage rejection, cancellation, successful persistence, Undo/Redo and offline rerun. Existing drawing and raster portability/provenance tests remain relevant.

Validation: strict TypeScript/build and all 73 unit tests passed. The broader browser run passed 44 scenarios and caught an unchanged-preview save that unnecessarily converted the original source boundary. After correcting the equality check, all seven affected Chromium scenarios passed (area measurement, spatial review, four raster cases including the real Botswana file, and study-area drawing). The new preview case also verifies storage-quota failure keeps the draft open, an unchanged Apply preserves the entire manifest, and preview dimensions/counts equal the subsequent run receipt. Registry validation covers 21 widget identities and 36 releases; SHACL validation conforms. These are local Chromium checks, not Firefox/Safari certification.

For practitioner evaluation, ask participants to predict which cells will remain, explain the difference between raster coverage and NoData, shrink the cutline, and restore it. Observe whether they distinguish operation parameters from the shared Study area and the output map. Record task completion, erroneous assumptions and requested parameters separately from software test results. Browser regression success does not establish usability or scientific appropriateness.
