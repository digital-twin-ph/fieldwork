# Raster source metadata and citation

Date: October 6, 2026. Status: bounded local prototype.

## A83 Distinguish file metadata from source documentation

A locally uploaded raster and a future STAC-acquired raster need the same descriptive provenance, even though their acquisition paths differ. Do not assume that dataset citations, licenses, temporal coverage or value units are embedded in a GeoTIFF. Preserve separately:

- Extracted file metadata: dimensions, bounds, CRS, resolution, sample type, NoData, GeoKeys, descriptions and GDAL metadata/statistics.
- Author-entered source metadata: dataset title, provider, landing page, original download URL, DOI/identifier, recommended citation, license/terms, release version, temporal coverage, production date, access date, pixel units and notes.
- Derivation: retained-window content hash, original-file descriptor, input window, cutline, inclusion method and computation provenance.

The original Botswana TIFF has a product description and band statistics but lacks the full web citation, DOI, license and landing-page URL. Its filesystem modification time is not its publication or retrieval date. A recorded download URL documents provenance; Fieldwork does not fetch it or assert that it performed that download. A filename match is not cryptographic verification of the original national file.

## A84 Author, review and save source metadata

Open Raster input -> Prepare GeoTIFF input. Extracted file metadata appears in a collapsible section. Separate labeled source fields can be entered with the initial upload or edited later without selecting the original file again. Save applies metadata and the asset descriptor through the existing persistence/Undo path. Cancel leaves the project unchanged. Choosing a replacement file clears previous source fields to avoid applying the old dataset citation accidentally.

For the exact Botswana filename, an explicit **Use Botswana WorldPop source details** button fills a reviewed template from [WorldPop record 72624](https://hub.worldpop.org/geodata/summary?id=72624). It is not automatic discovery or file verification. The template records DOI **10.5258/SOTON/WP00839**, production date **2025-09-01**, temporal coverage **2026**, release **R2025A v1 (alpha)** and **people per pixel**. The provider describes constrained estimates using Random Forest-based dasymetric redistribution and warns that this alpha release can change. The full provider-recommended citation is transcribed in the template. Its licensing text lists CC BY 4.0 and also notes ODbL conditions for specified derived datasets; the template preserves that qualification for review.

Source values are author assertions, not independently verified computational premises. Entering units does not enable population sums or establish valid cell-weighting assumptions. The Map reports them explicitly as source-reported units. Existing PDFs/URLs in Manage references remain usable for additional evidence passages and methods.

## A85 Carry provenance through derived products

Clipping preserves the input asset's source metadata alongside its original technical metadata, while recording a new cutline and computation result. N3 uses PROV derivation, Dublin Core title/publisher/identifier/bibliographicCitation/license/temporal/issued/description and DCAT landingPage/downloadURL/version. The citation describes the source file descriptor, not a claim that WorldPop published the Fieldwork derivative. A metadata-origin assertion distinguishes user-entered descriptions from original TIFF tags.

Saved workflows, JSON bundles, run receipts and encrypted ZIP packages preserve these optional fields. Metadata-only edits leave retained pixel bytes and their hash unchanged, while updating the saved project revision. Export/import validates bounded text and HTTP(S) source URLs without credentials. Older assets without source metadata remain valid. STAC integration can later populate these shared descriptive fields while separately retaining catalog, collection, item and asset identifiers; this slice does not implement STAC discovery or downloads.

Download GeoTIFF embeds a Fieldwork JSON provenance description in ImageDescription, including the entered citation, original extracted metadata under originalRasterMetadata, retained-input SHA-256, cutline and mask method. Native output georeferencing and NoData remain ordinary TIFF tags. The description explicitly identifies Fieldwork as its author and separates entered source details from original metadata. Original full-raster statistics are source lineage, not statistics of the clip. Generic GIS tools may expose this as descriptive text; no universal parser for the Fieldwork JSON is claimed.

GeoTIFF.js 3.0.5 reserves a fixed-size IFD buffer: putting long citation text directly into its writer corrupted an export during regression testing. The adapter now writes a short normal TIFF description, appends bounded ASCII-escaped JSON after pixel data, and updates only the ImageDescription entry's count and offset. Pixel offsets and other tags are untouched. Export descriptions are limited to 60 KB; larger descriptions require shorter notes or project-package export. Regression tests reopen the file and compare pixels, georeferencing, long Unicode citations and metadata-origin markers.

## Evaluation evidence

The unit suite passes 73 tests, including provenance validation, RDF parsing, encrypted preservation and large Unicode TIFF descriptions. Chromium exercises both a synthetic raster and the user's actual WorldPop file: template/manual entry, save, reopen, metadata-only edit, clipping, downloaded TIFF metadata, N3 source citation, fresh-browser encrypted transfer and offline rerun. This is application/data-transfer evidence, not independent validation of provider claims or a STAC interoperability test. The national raster is not committed or redistributed. Browser evidence is Chromium only.

Final focused validation: six Chromium scenarios passed on the final build (three raster scenarios, including the actual WorldPop file, and three existing encrypted-package scenarios). Source-form layout was inspected visually. Widget registry and ontology validation also passed. These local changes have not been published remotely.
