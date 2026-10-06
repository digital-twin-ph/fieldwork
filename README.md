# Fieldwork

Fieldwork is a browser prototype for exploring semantic visual GIS workflows in public health. Build workflows with React Flow, compute spatial facts locally, and evaluate Notation3 rules with EYE-JS in WebAssembly.

Two worked examples explore heat outreach and Old Naledi diagnostic access; a third synthetic exercise explores spatial coverage and input forms. The heat example uses synthetic neighborhoods; Old Naledi combines a real source boundary and historical facility registry with generated demonstration locations. This is exploratory software, not a validated public health policy or risk model.

## Try the prototype

Open the [published app](https://digital-twin-ph.github.io/fieldwork/), start with a [blank canvas](https://digital-twin-ph.github.io/fieldwork/?example=blank), or explore [Old Naledi diagnostic access](https://digital-twin-ph.github.io/fieldwork/?example=old-naledi) and [spatial coverage review](https://digital-twin-ph.github.io/fieldwork/?example=coverage).

Workflows, attached PDFs and retained raster windows stay in your browser; export them to move between the local and published sites, which have separate browser storage.

**Encrypted ZIP** creates a password-protected project containing the workflow, referenced PDFs and retained raster windows as binary files. Enter and confirm a long passphrase, then use **Import** to restore the ZIP on another device. Generic archive entry names, counts and sizes remain visible; original PDF filenames and citations are inside encrypted content. There is no password recovery. Browser storage and the existing JSON export/run receipts remain unencrypted. The prototype supports PDFs and bounded GeoTIFF windows, with a 20 MB archive limit; original national rasters and arbitrary attachments are not embedded. See the [encrypted-package design](docs/experiments/24-encrypted-project-packages.md).

Projects now keep a manifest alongside their workflow. Edits update its inventory of nodes, connections, embedded records, fields and references. Export/import validate this inventory and required PDF/raster contents; incomplete packages are rejected. Older workflows acquire a manifest when saved. Reference-only JSON imports require their PDF/raster assets to be available locally—use a complete bundle to move projects between devices.

On desktop, drag the dividers beside the Node library and Inspector, or between Workflow/N3 and Results, to resize the panels. Sizes are saved on this device. Focus a divider and use arrow keys for keyboard resizing; double-click it or choose **Reset layout** to restore defaults. Narrow screens keep the stacked layout. See the [panel-layout design record](docs/experiments/23-resizable-panels.md).

## Current capabilities

| Component | What you can do now |
| --- | --- |
| Workflow canvas | Connect typed ports, edit nodes, undo/redo, save separate examples and import/export workflows. |
| Panel layout | Drag the library/inspector dividers and Workflow/N3–Results split on desktop. Sizes stay on this device. Keyboard arrows resize; Reset layout restores defaults. |
| Study area | Draw and label a bounding box or simple polygon; inspect its GeoSPARQL representation. |
| Calculate area | Enrich the study area with a spherical area measurement; choose metric or imperial units. |
| Input data | Generate synthetic points, import CSV/GeoPackage/GeoJSON, or place map pins with typed attributes, value sets and optional UUIDs. |
| Raster input and Clip raster | Acquire a bounded WGS84 GeoTIFF window, then crop and mask it with a study polygon. Preserve native values and metadata; display and download the result. |
| Spatial coverage | Check multiple point layers against one boundary; review outside/missing locations and record exclusions without deleting source records. |
| Visual outputs | Connect maps and point tables; worked examples also provide decision maps, tables and bar charts in Results tabs. |
| N3 and evidence | Run EYE-JS locally, inspect facts and assertions, and download run receipts. |
| Supporting references | Attach PDFs or URLs to nodes, describe supporting passages, and preserve citations and file identity with run provenance. |

Reprojection, NetCDF clipping, a GEOS-WASM geoprocessing executor, Logical English comparison and agent-based simulation are not implemented. See [Scope and research](#scope-and-research) and the linked design experiments for the current boundaries.

The [GADM and jurisdiction design experiment](docs/experiments/14-gadm-jurisdiction-assets.md) now models provider datasets, downloaded assets, versioned jurisdiction boundaries and study areas with multiple named members. It includes synthetic RDF/N3 examples and executable selection-rule checks. GADM download, polygon import and jurisdiction-selection widgets remain proposed; this ontology work does not add them to the canvas.

The [STAC and processing-contract experiment](docs/experiments/15-stac-processing-shacl.md) adds a STAC RDF profile, shared processing contracts, candidate-routing rules and executable SHACL Core shapes. Generic and STAC input configurations converge on the same asset model; GADM normalization specializes reusable processing. Run `npm run validate:ontology` to validate the synthetic graphs and write JSON/RDF reports under `test-results/`. This tooling does not yet integrate a STAC browser or processing dispatcher into the application.

## Run locally

Install Node.js 22 or newer, then run:

    npm ci
    npm run build
    npm start

Open http://127.0.0.1:4173. The server listens on the local machine only. Application source is TypeScript under `src/`. Run `npm run build` after source or style changes; it checks types and rebuilds the browser application, workers and offline cache manifest. Browsers load generated JavaScript under `build/`.

## Publication and license

This work is licensed under [Apache License 2.0](LICENSE). Third-party libraries and source datasets retain their own licenses and attribution requirements; bundled library notices and the Old Naledi provenance record are preserved.

Pushes to GitHub `main` run `.github/workflows/pages.yml`: install locked dependencies, type-check, build, run the unit and Chromium regression suites, and deploy to GitHub Pages only after success. Manual publication is available through the workflow's **Run workflow** action. The staging script copies the build's explicit browser asset manifest and license files into `_site`; repository configuration, tests, source documents and secrets are excluded. Pages uses relative asset paths under `/fieldwork/`, including its service worker. No personal access token is stored in the workflow; deployment uses GitHub's job token.

## Build a workflow

Heat and Old Naledi now use the shared **Map** and **Table** widgets for reasoning results. Choose **Input mode** to distinguish a reasoning result from direct points/coverage; changing modes clears input connectors and can be undone. Legacy map/table outputs migrate on load with their identities and evidence intact. See the [shared result-output record](docs/experiments/21-shared-result-outputs.md). The shared **Chart** widget now replaces legacy bar outputs, with explicit categorical counts and source provenance. Connect a reasoning result and name its Results tab. See the [chart standardization record](docs/experiments/22-shared-chart.md).

**Sample locations** now supplies shared point data to Map, Table and coverage widgets. **Facility access** also accepts points from Input data, preserving missing coordinates as Unknown results. The [shared sample-point design](docs/experiments/20-shared-sample-points.md) records the contract, provenance and compatibility changes.

Old Naledi now separates **Input data: Gaborone facility registry** from **Select nearby facilities**. Edit the connected records through the shared input form; the selection node retains the radius control and feeds the unchanged diagnostic rules. Existing saved Old Naledi workflows gain the explicit source on load. See the [facility-input standardization record](docs/experiments/19-facility-input-standardization.md).

Heat outreach's **Neighborhoods** and **Cooling centers** now use the shared **Input data** widget and its full editing form. Older saved sources are normalized on load while retaining their IDs, labels, scalar attributes, references and connections. The [first widget-standardization experiment](docs/experiments/18-shared-input-standardization.md) documents this migration and the remaining work for Old Naledi and output widgets.

For the first developmental evaluation, open `http://127.0.0.1:4173/?example=blank` or choose **New empty canvas**. Add **Study area**, open **Select area on map**, draw a bounding box or polygon, and apply it. Inspect **N3 & evidence**, then run to see the geometry preview and inferred readiness. The [study-area experiment record](docs/experiments/01-study-area.md) documents each task, architectural decision, standards mapping, and evidence to collect. Readiness means the geometry meets the widget's input contract, not that the selected area is scientifically appropriate.

Select nodes to edit their settings. Add nodes from the library and connect compatible ports. All visual output branches execute together, and shared upstream nodes execute once.

Add **Map** under Outputs to display a study polygon and point layers. Connect the Study area (or Calculate area) and Input data, or connect a Check spatial coverage result. Map and Check spatial coverage offer **Add point input** for multiple datasets with one boundary. Map highlights outside points, lists records without coordinates and lets you toggle layers. See the [map/layer exercise](docs/experiments/04-map-layers-and-attribute-contracts.md).

Add **Table** under Outputs to display point coordinates and attributes in a named Results tab. Connect Input data to **Points 1**, or Check spatial coverage to **Or: Coverage result** to include review decisions and exclusion reasons. Direct point input needs no study area. Tables support multiple layers, search, row/attribute paging, record inspection, saved workflows and offline use. See the [point-table exercise](docs/experiments/08-point-table-output.md).

Workflow and N3 & evidence are the main views. Each visual output node creates a named Results tab; choose Map, Table, or Bar chart in its inspector. Select a location in a map or table to inspect the inputs and assertions behind its result. Expand Results for a larger view or filter table rows by text.

Use the worked-example selector to open **Old Naledi diagnostic access**, or visit `http://127.0.0.1:4173/?example=old-naledi`. Its widgets control sample spacing, facility search radius, minimum evidence, diagnostic-service pathway, speed proxy, and review threshold. The [worked-example guide](docs/examples/old-naledi.md) explains the source data, assumptions, and three comparisons to try. Each example retains its own local edits when you switch.

Changes mark existing results as belonging to the previous run until you run again. Export a workflow to transfer it, or export a run receipt to preserve the executed workflow, N3 inputs, conclusions, and output data. Existing saved workflows remain local; Restore example replaces the current workflow with the latest example and can be undone.

## Local execution and offline use

For a raster exercise, connect **Study area ? Raster input ? Clip raster ? Map**, with Study area also connected to Clip raster. In Raster input choose **Prepare GeoTIFF input**, select the local file and **Save raster window**. Select Clip raster, connect its raster input, and choose **Add raster map**, then run. A default Map exposes **Or: Raster**; connecting there switches its input mode to **Raster**. Undo restores the previous inputs. The Results toolbar offers **Download GeoTIFF**. Only the bounded input window is saved; the original national file remains on disk. Expanding beyond the saved window requires preparation again. Use **Prepare GeoTIFF input** again to enter or edit the separate **Source metadata and citation** fields without re-uploading. Source details follow the clip into N3, packages and downloaded GeoTIFF metadata; the exact Botswana filename offers an explicit WorldPop template. See [source provenance](docs/experiments/26-raster-source-provenance.md) and [the WorldPop clipping experiment](docs/experiments/25-raster-input-and-clipping.md) for metadata, pixel rules and resource limits.

For input and spatial exceptions, open `http://127.0.0.1:4173/?example=coverage`. **Input data → Prepare input data** offers synthetic generation, CSV, GeoPackage, GeoJSON and map pushpins with predefined/custom fields and automatic location/time. **Check spatial coverage** combines the source with a Study area and raises alerts for outside or missing-coordinate records. Select a record to exclude with a reason, restore it, or edit the boundary with the point in view. The [input and review exercise](docs/experiments/03-input-data-and-spatial-review.md) documents each step, decision, limit and evaluation question.

Pushpin key/value pairs support text, number, whole number, yes/no and date types, with optional allowed values entered one per line. Value sets become dropdowns. Shared form fields and per-pin attributes retain their definitions in the saved workflow; invalid values/defaults are rejected. Geographic sources carry explicit WGS84 metadata and longitude/latitude storage order. The [CRS decision record](docs/experiments/05-coordinate-reference-systems.md) distinguishes EPSG:4326 from CRS84 and specifies the future Reproject node; reprojection is not implemented yet.

Use **Save Edits** in Prepare input data to keep changes on your device, including a pending key/value pair. **Delete Pin** edits the draft until saved. **Generate UUIDs for new pins** assigns stable record IDs without renaming existing pins. Category is an optional location label; Notes is free text. See the [pushpin editing and identity record](docs/experiments/09-pushpin-editing-and-identity.md).

Canvas ports are blue for inputs and red for outputs. Nodes are shaded gray for sources, orange for processing and green for visual outputs. See the [canvas color decision](docs/experiments/10-canvas-colors.md).

Add **Calculate area**, choose its **Boundary input**, select a metric or imperial **Area unit**, and run. It outputs the same study area with its measurement attached, so you can connect **Study area → Calculate area → Check spatial coverage**. The calculation measures the polygon using a spherical approximation and records canonical square metres as `geo:hasMetricArea`. The [follow-up evaluation notes](docs/experiments/02-area-computation-and-resource-scope.md) explain the operation, units, reusable study-area ontology, and proposed resource-aware asset subsetting. Raster/NetCDF loading, clipping and budget enforcement remain design work.

Spatial distance uses a JavaScript haversine calculation. EYE-JS 21.1.24 runs in a worker and derives Review, NoFlag, or Unknown assertions from N3 facts and rules. The explanations combine run inputs and returned assertions; they are not EYE proof certificates.

The [geoprocessing memory lifecycle record](docs/experiments/06-geoprocessing-memory-lifecycle.md) proposes disposable workers, bounded output ownership and cancellation for future heavy jobs. It distinguishes reusable Wasm allocations from browser memory reclamation. This executor and its resource budgets are not implemented yet.

Application assets and the bundled EYE engine are cached after the first successful visit. Wait for Available offline before disconnecting. Workflows are stored in browser localStorage without encryption. Clearing browser storage removes local workflows, attached PDFs, retained raster windows and offline assets, so export work you want to keep. Package installation requires network access; workflow execution runs locally. The map editors request OpenStreetMap tiles when their online basemaps are enabled. Saved geometry, pushpin editing and inference work offline; map tiles are not precached for offline use.

After updating the application, reload to install the updated service worker, then reload again if the old interface remains visible.

## References and provenance

Select any node and choose **Manage references** to attach a PDF or URL, identify its author/year and passage, and explain how it supports the data, method or assumption. **Save reference** persists the citation; uploaded PDFs remain local and are available offline. **Export** includes referenced PDFs in a portable workflow bundle; **Run receipt** includes a snapshot of references, file hashes and provenance for the run. URL contents are not downloaded. Limits are 5 MB per PDF and 10 MB total per workflow. See the [evidence-reference design experiment](docs/experiments/13-node-evidence-references.md).

Citation metadata uses PROV-O and Dublin Core alongside the spatial GeoSPARQL facts. Attaching a document records the workflow author's supporting reference; it does not parse the PDF, verify its claims or insert its contents into rule premises.

## Validation

The local baseline on October 6, 2026 passed strict TypeScript checks, the production build, **73 unit tests and 44 Chromium scenarios**, including the local Botswana WorldPop GeoTIFF, including shared-input migration, widget-registry checks, SHACL validation, N3 candidate routing and jurisdiction selection. Deployment status for the latest GitHub commit is recorded in [the Pages workflow](https://github.com/digital-twin-ph/fieldwork/actions/workflows/pages.yml).

Use the full regression gate before accepting a functional change:

    npm ci
    npx playwright install chromium
    npm run check

This first checks the application, worker and compile-only regression types, rebuilds the local assets, discovers all `tests/*.test.mjs` unit tests and runs all `tests/*.browser.mjs` browser scenarios. Playwright starts and stops its own test server on port 4174, using isolated browser contexts; your canvas and server on port 4173 are unaffected. Set `FIELDWORK_TEST_PORT` if 4174 is occupied. The runner refuses to reuse an existing server so it cannot silently test another checkout.

For a focused check, use `npm run typecheck`, `npm test` (type-check, build and unit tests), or `npm run test:browser -- tests/map-output.browser.mjs` after building. Use `npm run test:report` to open the latest HTML report. Failures retain traces and screenshots under `test-results/artifacts/`; the JUnit report is `test-results/browser-junit.xml`. There are no automatic retries, and focused `.only` tests fail the gate.

`BROWSER_EXECUTABLE` can select an existing Chromium executable. The GitLab `functional-regression` job installs dependencies and Chromium, runs the same gate, and retains reports on failure. This job complements the existing security jobs. Its first remote run still needs to be verified after publication; repository settings determine whether a passing pipeline is required for merging.

The [regression baseline and contribution policy](docs/experiments/07-functional-regression.md) maps current behavior to tests. Browser checks exercise actual EYE inference, widgets and connectors, evidence, typed attributes, saved-workflow compatibility, offline reload and mobile layout. Current browser validation is Chromium only; tests do not establish practitioner effectiveness or cover proposed geoprocessing features.

The [N3 output evaluation design experiment](docs/experiments/11-n3-output-evaluation.md) separates representation, spatial calculation, rule behavior, evidence and practitioner understanding. It defines controlled cases, independent expectations, a participant protocol and a proposed Evaluation tab; the additional evaluation tooling and study remain design work.

The [TypeScript migration decision record](docs/experiments/12-typescript-migration.md) describes source ownership, compile-time contracts, runtime validation and the generated offline asset manifest.

## Scope and research

The [workflow learning and gamification design](docs/experiments/27-workflow-learning-and-gamification.md) proposes an opt-in Old Naledi learning exercise, evidence-based milestones, a separate local learning record and future GIS competency ontology mappings. It specifies widget learning profiles, versioned assessment receipts, idempotent points and transfer evaluation. Learning mode and scoring are not implemented.

The [workflow publication products design](docs/experiments/17-workflow-publication-products.md) records future field reports, story maps, infographics and dashboards as pipeline end products. It proposes reusable content blocks, versioned templates, evidence-linked findings and local export, beginning with a spatial coverage field-report experiment. These composition and export capabilities are not implemented.

The [widget registry](widgets/README.md) inventories all 21 node types, including legacy aliases, with stable identities, independent release versions, port contracts, source references and explicit ontology mappings or gaps. Run `npm run validate:widgets` to check coverage, release digests and alignment with current TypeScript definitions. Saved workflows do not yet pin widget versions; the specific heat-source adapter runs on load, while general registry-driven migrations remain future work.

The [shared visualization design specification](docs/experiments/16-semantic-visualization-design.md) proposes common semantics for maps, charts and tables using GeoSPARQL, CSVW, RDF Data Cube, QUDT, SKOS and PROV, with selective OGC portrayal reuse and a candidate Vega-Lite chart adapter. It defines configuration, rendering and artifact provenance, proposed SHACL contracts, offline constraints and a developmental evaluation exercise. The general shared profile and Vega-Lite adapter remain design work; the bounded categorical Chart adapter is implemented as described above.

Input data accepts up to 2,000 points and 5 MB local files, retaining scalar attributes. GeoPackage import currently supports standard 2D POINT layers in EPSG:4326; CSV needs longitude/latitude in degrees. The bounded GeoPackage importer reads the file into memory and does not implement streaming clipping. The legacy heat-example GeoJSON importer retains identifiers, names and coordinates. The study-area editor supports bounding boxes and simple polygons of 3–200 vertices; holes, antimeridian crossings, and polar areas are outside this drawing contract. It emits GeoSPARQL feature/geometry facts and CRS84 WKT literals, while EYE runs application-specific rules. GeoSPARQL query functions are not implemented. The bundled Old Naledi source additionally supplies its pinned polygon and selected facility attributes. General polygon-file import, street routing, arbitrary N3 editing, and the Logical English comparison are not yet implemented.

The [research review](docs/research/related-research-2026-10-05.md) provides background. The [Gaborone TB modeling repository](https://git.cdc.gov/digital-twin/Gaborone-TB-Agent-Based-Modeling) supplies the Old Naledi geometry, historical facilities, and evidence hierarchy. Its building preparation, network routing, and Starsim simulation have not been integrated here. Source commit and file hashes accompany the bundled data and run outputs.

## Repository contents

- src/app.ts and src/core.ts: application controls, graph validation, spatial facts, and execution.
- src/old-naledi.ts and src/old-naledi-ui.ts: typed example nodes, evidence rules, and practitioner widgets.
- src/study-area.ts, src/study-area-map.ts, and study-area.css: drawing contract, GeoSPARQL/N3 generation, and map editor.
- src/area-computation.ts and src/area-measurement.ts: polygon area calculation, units, and computation provenance; rebuild after changing the numerical module.
- src/input-data.ts and src/input-data-ui.ts: point import, synthetic generation, pushpin forms and local SQLite/WASM integration; rebuild after changes.
- src/map-output.ts and src/point-layers.ts: explicit Map output, multiple point inputs, layer identity and source-preserving review.
- src/table-output.ts: point Table output, attribute columns, bounded paging/search and presentation provenance.
- src/attribute-schema.ts and src/spatial-reference.ts: attribute types/value sets and the current geographic CRS contract; rebuild after attribute form changes.
- src/spatial-predicates.ts, src/spatial-coverage.ts and src/coverage-ui.ts: geometric classifications, N3 review rules, exclusions and recovery controls; rebuild after changing src/spatial-predicates.ts.
- ontology/fieldwork.ttl: implemented study-area/measurement vocabulary and proposed spatial-operation/resource-planning terms.
- ontology/jurisdictions.ttl, ontology/gadm.ttl, ontology/rules/ and ontology/examples/: proposed boundary-asset model, GADM profile, selection rules and synthetic worked examples.
- ontology/stac.ttl, ontology/processing.ttl, ontology/shapes/ and scripts/validate-ontology.mjs: proposed discovery/routing profiles and executable SHACL validation tooling.
- examples/old-naledi/: selected source data and provenance; regenerated by scripts/extract-old-naledi.mjs.
- src/canvas.tsx and flow.css: React Flow editor, bundled by build.mjs.
- src/reasoning-worker.ts and vendor/: local EYE-JS engine and upstream license notices.
- src/sw.ts: service-worker source; root sw.js and build/asset-manifest.json are generated.
- src/raster.ts, src/raster-workflow.ts and src/raster-ui.ts: native-grid GeoTIFF acquisition, explicit polygon clipping, metadata, provenance and raster display.
- src/evidence.ts, src/evidence-storage.ts and src/evidence-ui.ts: node citations, local PDF storage, portable bundles and run provenance.
- src/project-manifest.ts, src/encrypted-package.ts and src/package-ui.ts: saved project inventory, bounded encrypted ZIP validation and password dialogs.
- src/types.ts, src/results.ts and src/worker-types.ts: workflow, result and message contracts.
- tsconfig.json and tsconfig.workers.json: strict application and worker type-checking.
- tests/: core and Chromium integration checks.
- .github/workflows/pages.yml and scripts/stage-pages.mjs: tested GitHub Pages publication and bounded static-site packaging.

## Keeping this README current

Update this README in the same change that adds or changes a widget, accepted input format, workflow connection, storage/export behavior, deployment step or prototype limit. Include a short practitioner exercise and architectural rationale in the relevant [design experiment](docs/experiments/), and maintain the [regression coverage record](docs/experiments/07-functional-regression.md). Describe proposed capabilities separately from implemented behavior; date validation claims and name the browsers actually exercised.

Keep local access tokens under .secrets/, which is excluded from Git and blocked by the static server. Credentials are not needed to run the application.
