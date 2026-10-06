# Raster input and polygon clipping: Old Naledi / WorldPop

Date: October 6, 2026. Status: bounded local prototype.

## A80 Separate acquisition from clipping

Use **Study area → Raster input → Clip raster → Map**, with a second Study area connection into Clip raster. Raster input reads the GeoTIFF header and native pixel window around the study boundary. This resource-saving acquisition retains a rectangular subset without resampling or polygon masking. Clip raster is a distinct computation: it crops to the native-grid bounding window and masks cells outside the selected polygon and outputs a raster, not points.

The original national file remains on the user's filesystem. Read file slices and intersecting TIFF blocks; do not allocate the national pixel array or copy the original file into browser storage. Persist only the bounded window as a GeoTIFF asset. Retain the original filename, byte length, modification time and extracted metadata as source descriptors. These descriptors are not a checksum of the full national file. The retained window has its own content digest. Expanding the study area beyond that window requires reacquisition; do not silently invent coverage or zero-fill missing regions.

## A81 Define pixel and CRS semantics before statistics

First support one-band, north-up, PixelIsArea GeoTIFFs with explicit WGS84/EPSG:4326 and no rotated affine transform. Extract dimensions, bounding coordinates, origin, resolution, GeoKeys, sample type/bit depth, compression/block layout, NoData, GDAL band metadata, description and citations. Preserve band metadata and distinguish it from user-supplied evidence about year, product, licensing and value units. Metadata may be incomplete; filenames are not authoritative scientific metadata.

Use native-grid cell-center inclusion (including polygon-boundary centers), with holes and multipart geometry handled by the existing spatial predicate. Cells outside the polygon become NoData; zero remains a valid value. NoData is excluded from valid-cell summaries. Preserve floating-point values in a Float64 derivative and retain the original sample metadata in lineage. Do not resample, reproject, automatically sum population, or infer units from the filename. WorldPop count and density products have different meanings. A center-mask total, if added later, would not be an exact area-weighted estimate of people within a small polygon.

The output remains a rectangular GeoTIFF with NoData outside the cutline. This differs from merely cropping to a bounding box. Record the cutline as GeoSPARQL WKT, the retained input digest, method and source/derivative links using PROV and DCAT. Reprojection, all-touched rules and fractional-cell weighting are later operations.

## A82 Keep raster assets portable and bounded

Retained input windows participate in the saved project manifest and completeness checks. ZIP and JSON bundles must include their binary bytes (JSON uses Base64 for compatibility); missing or modified assets fail transfer. Run receipts include the required input assets and computation provenance. A clipped GeoTIFF can also be downloaded as a derivative. Package support does not imply ingestion of arbitrary raster formats.

Limit retained windows to 262,144 cells, decoded intersecting source blocks to 64 MB, individual retained assets to 5 MB and combined packaged PDF/raster assets to 10 MB. GeoTIFF metadata must fit a bounded JSON description. These are prototype safeguards, not measurements of peak memory. Browser-local data remains unencrypted; encrypted ZIP protects exported contents only. No WorldPop data is committed to the repository; regression fixtures are synthetic.

## Evaluation

Use the user's local `bwa_pop_2026_CN_100m_R2025A_v1.tif` and the bundled Old Naledi polygon. Inspect extracted metadata before acquisition. Compare the source dimensions with the retained window, then inspect the masked map and download/reopen the clipped GeoTIFF. Verify coordinate alignment, unchanged valid values, preserved zero/NoData, rejection of non-overlap/insufficient coverage and unsupported CRSs, and offline package round trips. Record real-file findings separately from synthetic regression expectations.

Sources: [GeoTIFF.js reader/writer documentation](https://github.com/geotiffjs/geotiff.js), [WorldPop data types](https://hub.worldpop.org/project/list), [WorldPop population counts](https://hub.worldpop.org/project/categories?id=3). GeoTIFF.js is selected for bounded local file/window access here; this is not the proposed general GDAL/GEOS-WASM processing executor.

## Real-file observation and validation

The local Botswana file is 16,278,285 bytes with 11,248 x 10,953 pixels, one Float32 band, EPSG:4326 / PixelIsArea, LZW compression and 512 x 512 tiles. Its angular resolution is 0.00083333333 degrees; this is not a promise of square 100 m cells on the ground. NoData is -99999. GDAL metadata describes BWA population 2026, WorldPop R2025A v1. Product units still require supporting source evidence. Full-source GDAL statistics remain in source lineage and are not copied into derivative statistics.

The bundled Old Naledi polygon selects source pixel window `[7069, 8279, 7089, 8302]`: 20 x 23 cells. The retained Float64 TIFF is 4,680 bytes. The center mask includes 175 cells, all valid, and masks 285 outside cells. Every retained valid output value was compared directly against an independent read of the corresponding original source window; all matched. This is numerical preservation evidence, not validation of WorldPop estimates or the study boundary. No population total is asserted.

Synthetic regression tests cover zero, fractional values, NoData, holes, multipart geometry, smaller crops and georeferencing, insufficient coverage and block budgets, encrypted TIFF bytes and RDF receipts. Chromium exercises upload/save, typed connections, raster display and download, offline rerun and encrypted transfer into a fresh offline browser. The optional local-file scenario uses `FIELDWORK_WORLDPOP_FILE`; CI does not require or distribute the national raster. Screenshots and metadata observations are retained only under ignored `test-results/`. GeoTIFF.js is pinned to 3.0.5 and its license is included in the build.

The first executor runs bounded work on the main browser thread; the decoded-block estimate is not peak-memory enforcement or a worker partition. General GDAL/GEOS-WASM execution, projected CRS inputs, other raster formats, resampling, zonal statistics, fractional-cell weighting, browser-engine comparisons and widget-specific SHACL contracts remain separate work. The emitted N3 records computations and provenance; clipping is not performed by an N3 inference rule.

Validation on October 6: the full local check passed TypeScript, the production build, 70 unit tests and all 43 Chromium scenarios, including the optional WorldPop file. A final unit-only run passed 71 tests after adding unsupported CRS/PixelIsPoint rejection coverage and tightening mask expectations. No application code changed after the full check. Raster screenshots were inspected for map alignment and port labels. No Firefox/WebKit run or remote deployment is claimed.

## Follow-up: make raster connections discoverable

A Map from the library originally exposed only point/coverage ports until the user changed its input mode. The prior raster test used Add raster map, so it missed this manual connection path. Spatial Maps now expose an alternative **Or: Raster** port and inspector selector. Connecting a raster switches the Map to raster mode and replaces its previous inputs as one undoable edit. The unused alternative is optional during point-map execution. Imported raster connections require raster mode rather than silently executing the point renderer. React Flow also refreshes handle geometry when port identities change, including equal-port-count mode changes.

Map registry release 0.4.0 records this contract. A Chromium regression drags Clipped raster into the ordinary Map, verifies the saved edge/mode, restores the old area connection with Undo, reconnects using the inspector and reloads. The unit suite passes all 71 tests; focused browser checks also cover raster execution/export/offline restoration and existing spatial/reasoning maps and tables.

[Experiment 26](26-raster-source-provenance.md) adds a separate source metadata/citation form and preserves author-entered provenance through clipping, project packages, N3 and derivative GeoTIFF metadata. These source fields are not assumed to exist in the original TIFF tags.

## A86 Keep the clipping slice small

On October 6, the user narrowed the GDAL/WASM exploration to a sufficient study polygon and a small native-resolution raster subset. A temporary gdal3.js 2.8.1 Worker experiment passed synthetic clipping and offline rerun, but introduced approximately 40 MB of runtime assets. Its dependency, Worker, UI engine selector and runtime files were removed from the active app after the scope clarification. It is not an implemented Fieldwork processing engine.

For this slice, retain GeoTIFF.js file/window I/O and the existing center-in-polygon mask. GEOS-WASM would be sufficient for richer vector boundary operations alongside the raster reader/writer; it does not itself read or write GeoTIFF pixels. Add it only when boundary union/intersection/repair is needed. GDAL, reprojection, extra inclusion choices and a general processing toolbox remain deferred. Expanding beyond the retained input window still requires reacquisition from the original source.
