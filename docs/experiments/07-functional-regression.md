# Developmental evaluation: preserving the functional baseline

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. Following the coverage-to-map connector fix, the user requested regression tests to retain the current functional level as the prototype grows.

## A29: one repeatable gate for existing and new behavior

`npm run check` first runs strict TypeScript checks (application, workers and compile-only contracts), builds the local browser assets, runs every unit test and runs the browser regression scenarios. Unit discovery selects `tests/*.test.mjs`; Playwright discovery selects `tests/*.browser.mjs`. New tests using those names join the gate without editing a list of commands. A failing step returns a nonzero exit status.

The existing six browser scripts now use Playwright Test's managed contexts, server and reporting. Tests run sequentially with a fresh browser context per scenario, a separate localhost origin on port 4174 and no reuse of an existing server. This protects the user's saved canvas on port 4173 from test data. `FIELDWORK_TEST_PORT` selects a different test port when needed. Unit tests remain Node tests; browser scenarios still execute the bundled EYE engine.

Failed browser cases retain a trace, screenshot and error context. HTML and JUnit reports identify each scenario and outcome. Retries are disabled so an intermittent failure remains visible; `.only` is forbidden. The test configuration follows the supported [Playwright web-server](https://playwright.dev/docs/test-webserver) and [reporting](https://playwright.dev/docs/test-reporters) interfaces.

The GitLab `functional-regression` job runs the same command after installing locked dependencies and Chromium, alongside the repository's existing security jobs. Reports are retained for 14 days, including failures. CI configuration is added locally; no commit, push, remote pipeline run or merge-protection setting is implied. See [Playwright CI guidance](https://playwright.dev/docs/ci).

## Preserved behavior

| Functional contract | Automated evidence |
| --- | --- |
| Node parameters, point geometry, CRS order and worker message types | `tests/types.test.ts`, `npm run typecheck`; see [migration decisions](12-typescript-migration.md) |
| Blank canvas; bounding box/polygon drawing; labels; invalid shapes; edit/cancel; Undo/Redo | `study-area.test.mjs`, `study-area.browser.mjs` |
| GeoSPARQL feature/geometry identity, CRS84 WKT and actual EYE readiness | Study-area tests and browser evidence receipts |
| Area operation preserves the study area, supports six units and recomputes after geometry edits | `area-measurement.test.mjs`, `area-measurement.browser.mjs` |
| Synthetic, CSV, GeoPackage and pushpin input; typed key/value pairs and allowed sets | `input-coverage.test.mjs`, `input-coverage.browser.mjs` |
| Explicit Save Edits, pending pairs, close/discard, storage failure/retry, Delete Pin and UUIDs | `pushpin-save.browser.mjs`; see [pushpin editing and identity](09-pushpin-editing-and-identity.md) |
| Inside/boundary/outside/missing classifications; explicit exclusions; retained original records | Input/coverage tests, actual EYE classification and map review |
| Coverage-to-Map dragging, visible ports, wrong-socket rejection, mode replacement and Undo | `map-output.browser.mjs`; includes the reproduced connector regression |
| Multiple layers, overlapping record IDs, source-specific exclusions, layer toggles and eight input ports | Map tests plus `workflow-compatibility.browser.mjs` |
| Point Table output, direct/reviewed inputs, attributes, bounded paging, search and review-alert counts | `table-output.test.mjs`, `table-output.browser.mjs`; see the [Table decision record](08-point-table-output.md) |
| Existing heat and Old Naledi workflows, independent output branches, keyboard tabs and evidence | `core.test.mjs`, `old-naledi.test.mjs`, `outputs.browser.mjs`, `old-naledi.browser.mjs` |
| PDF/URL references on nodes, portable files, provenance, offline retrieval and save recovery | `evidence.test.mjs`, `evidence.browser.mjs`; see [node evidence references](13-node-evidence-references.md) |
| Proposed GADM ontology: multi-place membership, file identity/lineage, incomplete inputs and version isolation | `jurisdiction-ontology.browser.mjs`; see [the jurisdiction asset model](14-gadm-jurisdiction-assets.md). These are semantic checks, not polygon-import UI tests. |
| STAC RDF mapping, shared and provider-specific candidate routing, SHACL acceptance/rejection and post-selection completeness | `ontology-shacl.test.mjs`, `stac-routing.browser.mjs`; see [processing contracts and SHACL](15-stac-processing-shacl.md). No runtime dispatcher is claimed. |
| Saved-workflow compatibility, schema/value-set retention, invalid-import recovery | `workflow-compatibility.test.mjs`, `workflow-compatibility.browser.mjs` |
| Offline replay with cached engines/assets; export/import; narrow-screen layout | Existing browser scenarios and frozen-workflow replay |

## A30: preserve an explicit compatibility fixture

`tests/fixtures/coverage-workflow-2026-10-05.json` is a fixed, synthetic workflow using schema `fieldwork/workflow/1`. It combines area measurement, two point layers with overlapping record IDs, typed attributes/value sets, one exclusion and a Map receiving the coverage result. It intentionally predates explicit stored CRS defaults, exercising the existing normalization path. It contains no participant or patient data.

The fixture is read from disk, not regenerated by the current example builder during tests. Unit checks verify that normalization leaves the input document intact and retains its settings, attributes and connectors. Browser checks import it, execute real EYE reasoning, compare each source/record's known spatial relation and decision, inspect GeoSPARQL and typed literals, then reload offline and compare saved state and results. Area is checked against an independent spherical-rectangle formula, not a freshly generated numerical snapshot.

Additional browser cases verify that malformed imports leave both the saved workflow and completed results intact, and that all eight point inputs remain available, do not overlap and survive removing a port followed by Undo. Cycles, duplicate incoming connectors, wrong types and invalid typed values remain rejected.

## How the baseline grows

The [N3 output evaluation experiment](11-n3-output-evaluation.md) extends this baseline with a proposed protocol for independent expected conclusions, scoped graph checks, deliberate faults and practitioner sessions. It distinguishes regression evidence from semantic conformance and public health validity.

1. For a bug fix, add a test that reproduces the failure before changing the implementation. Test the same interaction path the user exercised: a dropdown test alone cannot protect a drag connector.
2. For a new feature, add an observable behavior check, its important invalid-input/recovery case, and persistence/offline coverage when state or local assets change.
3. Run `npm run check` before accepting the change. Do not remove assertions, skip cases, increase retries or regenerate fixtures merely to obtain a passing result. An intentional behavior change needs a documented decision and revised expectations that explain the change.
4. Retain older compatibility fixtures when introducing a new workflow schema. Add an explicit migration test and a new fixture; replacing the old one would lose evidence of compatibility.
5. Keep unit checks focused on data and mathematical contracts, and browser checks focused on rendered controls, gestures and integrated engines. Screenshots are diagnostic artifacts, not pixel-perfect baselines tied to one font/platform.

A green gate preserves the behaviors represented by these assertions; it cannot guarantee the absence of untested regressions. Chromium is the current execution target. Firefox/WebKit, practitioner effectiveness, large geoprocessing memory reclamation and proposed Reproject/raster nodes require separate tests when implemented. Online basemap availability is an optional observation and is not a prerequisite for local drawing or offline reasoning.

## Validation record

The October 6 STAC/SHACL gate passed strict TypeScript checks, build, 44 unit tests and 31 Chromium scenarios, with no skips or retries (2.5 minutes for the browser suite). Six new unit groups validate SHACL acceptance and deliberate violations; two new browser scenarios execute candidate-routing rules and validate merged EYE conclusions. The validation CLI also emits readable JSON and RDF reports and returns nonzero for a partial selection.

The subsequent October 6 release gate passed strict TypeScript checks, build, **47 unit tests and 31 Chromium scenarios** (3.0 minutes for the browser suite). Three widget-registry test groups now check implementation coverage and reject missing widgets, duplicate versions, digest tampering, port drift and undeclared ontology mappings. Both `npm run validate:ontology` and `npm run validate:widgets` passed. The visualization and publication-product specifications remain design-only and add no runtime capability.

The STAC/SHACL gate exposed an import-fit timing failure in the existing fresh-browser PDF transfer scenario. Canvas fitting now waits for the new React Flow nodes to be measured, rather than fitting the previous empty graph. The scenario additionally asserts that all imported nodes fit inside the canvas before selecting a node. Existing save, transfer and offline assertions remain in place; no retry or timeout increase was added.

On October 6, 2026, the expanded local gate passed strict TypeScript checks, the production build, 38 unit tests and 29 Chromium scenarios. The three added jurisdiction-ontology scenarios exercise the bundled EYE worker with synthetic boundary assets and proposed selection rules. This record does not imply that a polygon importer or multi-jurisdiction widget is implemented.

On October 5, 2026, the full `npm run check` command passed locally on Windows with Node 22 and Chromium: build successful, 28 unit tests passed and nine browser scenarios passed, with no skips or retries. The browser portion took approximately 1.5 minutes. HTML and JUnit reports were generated; the test server used port 4174 while the user's viewing server remained on 4173. Local documentation links and whitespace checks passed. The GitLab/Linux job has not yet been run remotely.

The subsequent shared-input standardization check passed TypeScript/build, 50 unit tests and 32 Chromium scenarios on October 6. The new unit coverage verifies lossless, idempotent heat-source normalization and rejects unsupported data and unknown registry migration adapters; the browser exercise verifies both shared editors and offline EYE results. See [the migration record](18-shared-input-standardization.md).

The facility-input standardization slice passed TypeScript/build, 52 unit tests and 33 Chromium scenarios on October 6. A frozen legacy fixture checks source splitting; selection tests preserve the historical candidate set, and the browser test verifies that deleting a facility changes actual EYE access results and persists offline. Selection adds a computation receipt to the two reasoning receipts. See [the facility migration record](19-facility-input-standardization.md).

Shared sample-point validation passed TypeScript/build and 54 unit tests on October 6. All 34 Chromium scenarios passed across the full run and focused reruns: an icon-prefix locator in the new test was corrected, then the new scenario and both affected worked-example/output scenarios passed on the final build. See [the sample-point record](20-shared-sample-points.md) for details.

Shared result-output validation passed TypeScript/build and 56 unit tests on October 6. All 35 Chromium scenarios passed across the suite and a focused rerun after correcting the heat-output test label-control locator. Coverage includes legacy output migration, input-mode switching and Undo, preserved decisions, independent view payloads and presentation provenance. See [the shared output record](21-shared-result-outputs.md).

Shared Chart validation passed TypeScript/build, 59 unit tests and all 36 Chromium scenarios on October 6. After visual inspection prompted icon and reasoning-port-label corrections, the final build passed all 59 unit tests and five affected output browser scenarios again. Coverage includes legacy bar migration, count conservation, unclassified values, RDF provenance, references, view switching and offline reload. See [the chart record](22-shared-chart.md).

Resizable-panel validation passed the full local `npm run check` on October 6: TypeScript/build, 59 unit tests and all 38 Chromium scenarios. The two added browser scenarios cover dragging, keyboard resizing, offline layout persistence, expand/restore, reset, narrow windows, malformed preferences and storage failures. See [the panel-layout record](23-resizable-panels.md).

Encrypted project packages and persistent manifests passed the final full local `npm run check` on October 6: TypeScript/build, 66 unit tests and all 41 Chromium scenarios. Tests verify encrypted binary PDF transfer offline, inventory updates, completeness and integrity checks, wrong-password retry, rejected imports and save-failure preservation. Reference-only JSON imports now reject unavailable PDFs rather than silently accepting an incomplete project. See [the package design and validation record](24-encrypted-project-packages.md).

Raster input and explicit clipping passed TypeScript/build and the full local suite (70 unit tests, 43 Chromium scenarios, including the local WorldPop file). A subsequent unit run passed all 71 tests after adding negative CRS/PixelIsPoint coverage and exact mask counts. Raster coverage includes source-value preservation, zero/NoData, holes/multipart geometry, native crops, resource limits, metadata/provenance, manifest inventory, encrypted portability and fresh-browser offline recomputation. See [the raster experiment](25-raster-input-and-clipping.md).

Source metadata/citation: TypeScript/build, all 73 unit tests, widget/ontology validation and six focused Chromium scenarios passed. The latter cover raster source edits without re-upload, real WorldPop source-template use, readable GeoTIFF provenance with preserved pixels, encrypted/offline transfer, and existing PDF/package behavior. Large Unicode TIFF-description regressions protect against the upstream writer fixed-buffer limit. See [experiment 26](26-raster-source-provenance.md).
