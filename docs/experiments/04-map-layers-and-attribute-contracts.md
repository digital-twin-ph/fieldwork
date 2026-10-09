# Developmental evaluation: maps, multiple input layers and attribute contracts

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. Continuation of [input data and spatial review](03-input-data-and-spatial-review.md). These are design feedback and functional experiments, not evidence of practitioner effectiveness.

## Feedback and decisions

The user requested a Map node to display points, the study polygon and outside records. They then requested explicit key/value pairs for pushpins, expandable input connectors, and the ability to specify data types and value sets. Clarification established that expandable connectors mean multiple point datasets/layers with one study boundary, rather than merely expanding and collapsing existing ports.

### A20: Map is an explicit output node

The library now includes **Map** under Outputs. Connect a Study area (including the enriched output of Calculate area) and point inputs, or connect a Check spatial coverage result that already contains those inputs. Mixing a reviewed result with unrelated direct inputs is rejected. Inspector selections replace the alternate connection mode; canvas connections require incompatible existing inputs to be disconnected first.

Each Map creates a named Results tab. The local SVG display fits the entire polygon and every located point, including points outside the polygon. It uses the existing bounded geographic display approximation and requires no basemap download. Inside and boundary points are green; outside points are amber. Missing-coordinate records cannot be plotted and remain accessible through a named list. Selecting a point exposes its spatial relation, source layer and record attributes. Layer checkboxes control visibility without changing calculations or excluding records. Coincident records can be inspected by hiding another layer or using keyboard selection; no coordinate jitter is applied.

With direct inputs, JavaScript computes spatial relations and emits GeoSPARQL facts as a computation receipt. This does not infer acceptance, identify a data-quality error, or remove records. With a coverage-check input, Map reuses the existing EYE decisions and exposes the check's exclusion/restore/boundary actions. Excluded located records remain visible in grey. Existing implicit result tabs remain available for compatibility.

The Map view is currently a fitted local display, not an online basemap, pan/zoom GIS viewer or raster renderer. **Expand** enlarges the Results area.

### A21: expand point inputs while retaining one study boundary

Map and Check spatial coverage have **Add point input** and **Remove last input** controls in the Inspector. Ports are `points`, `points_2`, and so on, with a prototype limit of eight layers and 2,000 records combined per operation. These caps are implementation bounds, not a browser memory guarantee. An added direct point port must be connected before running. Removing a port removes its connector; Undo restores both. Adding a direct point input to a Map disconnects its alternate reviewed input. A reviewed Map uses the ports on its upstream coverage check.

Dynamic ports participate in the same graph validation and dependency planning as original ports. The canvas updates handle positions and node height. One point source may appear only once in an operation; identical record IDs in different sources remain valid and distinct.

Every result record carries `sourceNodeId`, `recordId` and `layerLabel`. Multiple-layer UI identifiers include the source identifier, while RDF record IRIs retain the established source-plus-record identity. `dcterms:isPartOf` links records to their source. Exclusions match source ID, original record ID and normalized record snapshot, so excluding a record in one layer cannot exclude the same ID in another layer. `retainedLayers` preserves original feature IDs and source association; the convenience combined `retainedData` uses unique scoped IDs when multiple layers are present. Retained data still requires `canProceed` before any future downstream use as an approved dataset.

### A22: explicit key/value pairs with typed value sets

Pin forms display editable attributes. Shared form fields apply across the input; **Add an attribute to this pin** adds a property to the selected record. A per-pin pair can be renamed or removed. Location remains geometry, and capture time remains automatic metadata rather than an editable user-defined pair. The [editing and identity follow-up](09-pushpin-editing-and-identity.md) clarifies Category/Notes and records explicit Save Edits, Delete Pin and UUID generation.

Both addition paths support **text, number, whole number, yes/no and date**, plus an optional allowed-value set entered one value per line. A constrained attribute renders as a dropdown. For example:

| Key | Type | Allowed values | Example value |
| --- | --- | --- | --- |
| `visit_status` | Text | Planned, Completed, Follow-up | Completed |
| `priority` | Whole number | 1, 2, 3 | 2 |
| `household_size` | Whole number | Unrestricted | 5 |
| `visit_date` | Date | Unrestricted | 2026-10-05 |

The value belongs to a record; a definition applies consistently to that key throughout its Input data node. Per-pin definitions are stored in `attributeRules`, separate from shared `fields`, so defining a property does not automatically add it to every pin. Definitions survive saving, workflow export/import and offline reopening. Removing a record property retains its definition for reuse. Reusing a defined key loads its existing type and value set. Renaming copies its definition to the new key; it does not rename other records.

Validation checks declared types, calendar-valid dates, safe whole numbers, finite numeric values, allowed-set membership, unique keys, and valid defaults. Imported workflow records are checked too; conflicting strings are not silently converted to numbers. Missing values remain optional/null, distinct from an allowed choice. Limits are 30 shared fields, 50 per-pin-key definitions, 50 scalar properties per record, 100 allowed values per definition, and 1,000 characters per text value. Schema editing/migration, required fields, conditional forms, coded display labels, external terminology bindings and SHACL execution remain future work.

Coverage evidence retains keys and typed values using application attribute descriptors with `rdf:value`. Declared dates, integers and numbers emit corresponding XSD literals. Allowed-value validation currently runs in JavaScript; no N3/SHACL validation engine or clinical vocabulary semantics is implied.

## Exercise

1. From a blank canvas, add a Study area, two Input data nodes and a Map.
2. Connect the area and first point source to Map. Add a point input and connect the second source. Name the layers and Map tab.
3. Run. Locate inside, boundary and outside points; inspect a missing-coordinate record. Toggle a layer, especially where records coincide.
4. Add a coverage check with the same area and two point ports. Connect its output to Map's coverage input.
5. Exclude one verified bad record with a reason. Verify that a same-ID record in the other layer stays under its own decision. Restore the exclusion.
6. In the pin editor, add `visit_status` with a text value set. Choose a dropdown value, save and inspect the N3 record. Try an invalid value/default and an invalid date.
7. Remove a point port and Undo. Export/import, reload offline and compare connectors, layer identities, values, definitions and review decisions.

## Evidence and next observations

### A28: make coverage-to-map connections visible and consistent

On October 5, 2026, the user reported that Check spatial coverage would not connect to the Map labeled “Study area and points.” Its three sockets had no persistent labels. Source inspection and a Chromium drag regression also identified a mismatch: the Inspector replaced a Map's direct inputs when selecting a coverage result, but dragging the same connection retained those inputs and failed graph validation.

Map and Check spatial coverage now display their input labels beside separate connector rows. Map's **Or: Coverage result** socket accepts the entire checked area, point layers and review decisions. The coverage node labels its corresponding output **Coverage result**. The Study area and Points sockets retain their own types; a coverage result is not silently coerced into either one.

Canvas drag and Inspector selection now share the same connection update: a coverage result replaces the Map's direct inputs, and a direct input replaces its coverage connection. Upstream nodes are preserved, and Undo restores the previous connectors. Added point-layer ports retain visible labels. This changes connection handling and discoverability, not the N3 rule or result data contract.

The browser regression first reproduced the rejected drag, then passed after the fix. It exercises an empty Map, replacement in both directions, wrong-socket rejection, Undo, result rendering, exclusions, export/import and offline reopening. The build and all 23 unit tests passed. `test-results/coverage-map-connectors.png` records the updated canvas. These are Chromium/software observations; whether the labels resolve practitioner confusion remains an evaluation question.

Tests cover source-preserving multi-layer execution, duplicate IDs, layer-specific exclusions, input limits, missing connections, value-set validation, typed RDF, saved workflows and offline use. Browser screenshots are regenerable under `test-results/`, including `map-output-desktop.png`, `map-multiple-layers.png` and `pushpin-form.png`.

Validation on October 5, 2026: the build and all 23 unit tests passed, followed by all six Chromium browser suites, including the existing heat, Old Naledi, study-area and area-computation workflows. Actual EYE execution accepted the typed date/integer literals, and offline reopening retained dropdown definitions and layer connections. Firefox/WebKit and practitioner effectiveness were not evaluated.

The browser exercise exposed a layout issue: layer controls and notices could compress the map enough to intercept point clicks. The spatial-results layout now preserves a usable map height and lets the page grow. Coincident markers in two test layers were correctly identified as overlapping; the exercise uses layer toggles to select the underlying record.

Next observe whether practitioners distinguish a visual mismatch from a data-quality decision, understand shared definitions versus per-record values, notice hidden layers, and predict the effect of adding/removing a port. No participant findings are claimed. [CRS and future reprojection](05-coordinate-reference-systems.md) records the next design question.
