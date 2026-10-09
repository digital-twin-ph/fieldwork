# Developmental evaluation: input data and spatial exception review

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. Continuation of [area computation and resource scope](02-area-computation-and-resource-scope.md). These are design-feedback notes and a bounded functional experiment, not practitioner-effectiveness findings.

## Feedback recorded

The user asked for an alert when an input data source contains records outside a selected bounding box or polygon. The proposed recovery choices were to drop a record if it has a data-quality problem, or expand the study area if the record is a valid outlier. The user requested that we exercise this condition in the workflow IDE.

The user then requested an Input data node supporting synthetic data, CSV and GeoPackage, and map pushpins with predefined and dynamic attributes. When asked what dynamic meant, the user selected **“User-added fields plus automatic location/time.”** Connected-raster-derived attribute values were not requested for this slice.

## Decision A16: separate spatial mismatch from data quality

`Study area + Input data → Check spatial coverage → Coverage review / Coverage map`

The check first computes a point's relation to the actual polygon. It distinguishes Inside, Boundary, Outside, and MissingLocation. Points on the boundary are included under an explicit policy. A point can be inside the bounding rectangle but outside an irregular polygon. The check uses locally bundled Turf point-in-polygon with no tolerance buffer; it is not a statistical outlier detector. Near-boundary coordinate uncertainty remains an issue for the next evaluation. [Turf predicate documentation](https://turfjs.org/docs/api/booleanPointInPolygon).

The geometry step emits `geo:sfWithin`, `geo:sfTouches`, or `geo:sfDisjoint` when coordinates exist. Missing coordinates receive no invented geometric relation. EYE uses explicit N3 rules to derive Accept, Review, or Excluded. Outside and missing-location records trigger review; neither establishes that the record is erroneous. Field keys and scalar values are also included in the graph using application attribute descriptors and `rdf:value`; field names alone are not treated as standardized domain concepts.

The result shows an alert with the number of unresolved records and retains a map/table for inspection. A completed run with an alert means the check executed, not that the data passed. Empty input or exclusion of every record does not count as established coverage.

**User-controlled recovery:**

1. Inspect the record in Coverage review or Coverage map.
2. For a verified data-quality issue, enter a reason and choose **Exclude as data-quality issue**. This removes it from the check's retained dataset, while preserving the original input record and recording the reason in the workflow and run receipt. Restore reverses the decision.
3. For a valid record that belongs in the study, choose **Edit study boundary with this point**. The map displays the reviewed point and fits it together with the existing boundary. Draw or adjust the boundary, apply, and rerun. No automatic expansion is performed.
4. Missing coordinates require correction in Input data or an explicit exclusion; expanding the boundary cannot resolve absent geometry.

Exclusions match source-node ID, record ID and the complete normalized record snapshot. Replacing or changing a record invalidates an old exclusion for that record, preventing accidental exclusion of changed data. Results become stale after an edit; exclusion and boundary actions based on old results are disabled until rerun. Geometry edits preserve the source records.

The check has a typed output and an explicit `canProceed` result, but no downstream consuming node or automatic workflow gate is implemented yet. Unresolved outside records stay in `retainedData`; only explicit exclusions remove records. Consumers must not interpret retained records as an approved dataset without checking `canProceed`.

**Resource-planning implication:** review must happen before irreversible clipping/filtering where possible. Data never fetched or discarded before the check cannot generate an outside-record alert. A future streaming loader must preserve counts and evidence for spatial exceptions, and state whether it examined the full candidate source. Zero observed exceptions is not proof of full geographic coverage. Expanding a study area may increase resource costs and change study design; the future subset planner must rerun, rather than reusing estimates for the old boundary.

## Decision A17: one point-input contract, several preparation methods

The Input data node emits a GeoJSON Point FeatureCollection in CRS84 longitude/latitude order. It retains record IDs, labels and scalar attributes. Inputs can be connected to existing point-compatible operations or to the coverage check. Legacy heat-example point import behavior is unchanged.

| Method | Current behavior | Limits and unresolved work |
| --- | --- | --- |
| Synthetic | Seeded generation with requested inside and outside counts, relative to a chosen study area. Stores seed, counts and boundary snapshot. | Uniform rejection sampling in longitude/latitude, not a population model or uniform sampling by Earth surface area. Generated points are a saved snapshot; boundary changes do not silently regenerate them. |
| CSV | Header-based column selection for longitude, latitude, ID and label. Handles quoted fields, escaped quotes, embedded newlines and UTF-8 BOM. Other columns remain string attributes. | Comma-delimited UTF-8 with unique headers. Coordinates must already be geographic degrees. Missing coordinate components become a missing location for review; invalid numeric/range values reject import. No projected-coordinate conversion or attribute type inference. |
| GeoPackage | Local sql.js 1.14.1/WASM reads a selected feature table, geometry and scalar attributes. | Standard 2D POINT layers whose CRS metadata resolves to EPSG:4326. GeoPackage point storage uses x/y = longitude/latitude. Projected layers, Z/M geometry, rasters, other geometry types and binary attribute columns require a later contract. [GeoPackage geometry format](https://www.geopackage.org/spec140/index.html), [sql.js](https://github.com/sql-js/sql.js/). |
| GeoJSON | Imports point FeatureCollections with scalar properties. | Polygon-file import remains outside this input node. |
| Pushpins | Adds or moves points on a Leaflet map, with a per-record form. A record selector also exposes missing-location records for coordinate entry. | Map-selected coordinates, not device GPS. Basemap availability is independent of local editing. |

Local file limit: 5 MB. Record limit: 2,000 points. Attribute limit: 50 scalar properties per record, strings up to 1,000 characters. These are explicit prototype caps, not a browser memory guarantee. In particular, GeoPackage currently loads the bounded file into an in-memory SQLite database; it does **not** demonstrate the proposed streaming or range-based ingestion design. File size, name, format, selected layer where applicable, and import time are retained as source metadata. Files are not uploaded.

Preparation takes place in a draft. **Save Edits** replaces the source node's data and invalidates prior results; cancelling an edited draft offers Keep editing or Discard edits. Discard leaves the saved source intact. Scalar attributes persist in workflow export/import and browser storage. Original full source files are not retained by the importer; the normalized records and import metadata are retained. The [pushpin editing follow-up](09-pushpin-editing-and-identity.md) records the renamed action, pending-value fix, Delete Pin and UUID option.

## Decision A18: pin forms have explicit fields and automatic capture metadata

New pins start with a label, Category and Notes fields. Users can add up to 30 form fields with a stable key, human label, type and optional default. Supported types are text, number, date and yes/no. The form stores typed numbers and booleans; empty values remain explicit nulls. Field configuration belongs to the Input data node and is saved with the workflow.

Map placement supplies longitude/latitude and an ISO UTC `capturedAt` timestamp from the browser clock. Moving a pin updates coordinates and preserves its original capture time. Coordinates may also be corrected in the form. Imported records retain their supplied attributes; no capture timestamp is fabricated for imported points. The browser clock and the entered attributes are not independently verified observations.

User-added fields and defaults do not supply clinical or measurement semantics by themselves. The subsequent [map/layer and attribute-contract experiment](04-map-layers-and-attribute-contracts.md) adds explicit key/value pairs, whole numbers, allowed-value sets and type validation. Units, externally governed code lists, required fields, conditional visibility and standardized domain-vocabulary bindings remain future work. This slice does not compute attributes from connected rasters or other workflow outputs.

## Worked exercise

Open `http://127.0.0.1:4173/?example=coverage`, or select **03 · Spatial coverage exercise**. The saved example has an illustrative box near Old Naledi and four explicitly synthetic records: inside, on the boundary, outside, and missing coordinates. It is not an official study boundary and contains no patient observations.

1. Run and expect two records requiring review. Confirm that the boundary record is included.
2. Exclude the outside example with a reason, rerun, then restore it and rerun. Compare the input count and retained output count.
3. Open the outside example's boundary editor and increase the east bound from `25.91` to `25.925`; apply and rerun. The outside record should become included. The missing-location record should still require review.
4. Resolve the missing-location record explicitly. A boundary expansion alone must not make it pass.
5. Select Input data, choose Prepare input data, and generate three inside points plus one outside point. Run and inspect the alert.
6. Try a CSV with `id,name,longitude,latitude` columns, then a supported GeoPackage point layer. Compare attributes and spatial classifications.
7. Switch to pushpins, place a point and add a numeric field such as `household_size`. Inspect coordinates and capture time, choose Save Edits, run, and inspect the record's N3 attribute representation.
8. Cancel a draft edit, export/import the workflow, and revisit offline. Compare labels, coordinates, fields, exclusions and conclusions.

## Functional evidence and next observations

Validation on October 5, 2026 used Node.js 22.20.0 and Chromium through Playwright. All 17 unit tests and all five browser suites passed, including the existing heat, Old Naledi, study-area and area-computation exercises. After preserving multiline pin notes, the build and input/coverage browser suite passed again.

The unit checks cover concave-polygon versus bounding-box distinctions, boundary inclusion, holes, absent coordinates, CSV quoting and missing coordinates, deterministic synthetic generation, GeoPackage point decoding/attributes, unsupported CRS rejection and exclusion invalidation after a record changes.

The Chromium browser exercise uses actual EYE inference and the local SQLite/WASM reader. It checks alerts, exclusion/restore, manual boundary expansion, all input methods, a numeric custom pin field, capture time, attribute preservation, offline GeoPackage import, cancellation and mobile overflow. Screenshots are regenerable local artifacts: `test-results/pushpin-form.png`, `coverage-map.png`, and `input-mobile.png`. Firefox/WebKit and practitioner effectiveness have not been evaluated.

Next observe whether the alert prompts appropriate investigation rather than automatic deletion; whether the user can explain the difference between a true outlier, a data error and a deliberately out-of-scope observation; whether expanding the scope changes the research question; and whether the form distinguishes supplied attributes from automatically captured metadata. Record observed actions, user explanations and evaluator interpretation separately. No such participant findings have been collected in this implementation exercise.
