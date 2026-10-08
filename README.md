# Fieldwork

A browser prototype for semantic visual GIS workflows in public health. Build a
workflow from typed widgets, compute spatial facts locally, and evaluate
Notation3 rules with EYE-JS in WebAssembly. Nothing is sent to a server.

This is exploratory software, not a validated public health policy, risk model
or privacy control.

## Published

| Site | What it is |
| --- | --- |
| [Fieldwork](https://digital-twin-ph.github.io/fieldwork/) | The application. Also on [GitLab Pages](https://fieldwork-47c2e8.gitpages.cdc.gov/), which may require a sign-in |
| [Validation Lab](https://digital-twin-ph.github.io/validation-lab/) | JupyterLite notebooks that independently recompute Fieldwork's spatial results in Python and report agreement with a stated tolerance |
| [Ontology viewer](https://digital-twin-ph.github.io/fieldwork-ontology/) | A reading view of this project's vocabulary, its shapes and its competency questions, with the schema-level questions as a build gate |

Worked examples: [blank canvas](https://digital-twin-ph.github.io/fieldwork/?example=blank),
[Old Naledi diagnostic access](https://digital-twin-ph.github.io/fieldwork/?example=old-naledi),
[spatial coverage review](https://digital-twin-ph.github.io/fieldwork/?example=coverage).
The version beside the header mark is the released application version; see the
[release notes](CHANGELOG.md).

## Current capabilities

| Component | What you can do now |
| --- | --- |
| Workflow canvas | Connect typed ports, edit nodes, undo/redo, save separate examples and import/export workflows. |
| Colour theme | Choose light, dark, or follow the device from the header. The choice is saved on this device; exported SVG and GeoTIFF artifacts stay light whichever theme is shown. |
| Panel layout | Drag the library/inspector dividers and Workflow/N3–Results split on desktop. Sizes stay on this device. Keyboard arrows resize; Reset layout restores defaults. |
| Study area | Draw and label a bounding box or simple polygon; inspect its GeoSPARQL representation. |
| Calculate area | Enrich the study area with a spherical area measurement; choose metric or imperial units. |
| Input data | Generate synthetic points, import CSV/GeoPackage/GeoJSON, or place map pins with typed attributes, value sets and optional UUIDs. |
| Reproject input | Import a local CSV or GeoJSON in WGS84 UTM metres and convert it to CRS84 longitude/latitude for the other widgets. WGS84 zones only; no datum shift and no raster warping. |
| Raster input and Clip raster | Acquire a bounded WGS84 GeoTIFF window, then crop and mask it with a study polygon. Preserve native values and metadata; display and download the result. |
| Spatial coverage | Check multiple point layers against one boundary; review outside/missing locations and record exclusions without deleting source records. |
| Geoprivacy experiment | Move points with a configurable, seeded donut displacement or aggregate them into H3 cells with sparse-cell omission. Compare private before and derived after maps/tables. These methods do not establish anonymity. |
| Visual outputs | Connect maps and point tables; worked examples also provide decision maps, tables and bar charts in Results tabs. |
| N3 and evidence | Run EYE-JS locally, inspect facts and assertions, and download run receipts. |
| Supporting references | Attach PDFs or URLs to nodes, describe supporting passages, and preserve citations and file identity with run provenance. |

Worked examples cover heat outreach, Old Naledi diagnostic access and raster
clipping, John Snow Voronoi and network catchments, geoprivacy transformations,
and a synthetic coverage exercise. Heat uses synthetic neighborhoods; Old Naledi
combines a real boundary and historical facility registry with generated
demonstration locations.

Step-by-step instructions are in [the usage guide](docs/usage.md); the worked
examples have their own guides for [Old Naledi](docs/examples/old-naledi.md) and
[John Snow](docs/examples/john-snow.md).

## Run locally

Node.js 22 or newer:

    npm ci
    npm run build
    npm start

Open http://127.0.0.1:4173. The server listens on this machine only. Source is
TypeScript under `src/`; rebuild after changing source or styles.

## Validation

Run the full gate before accepting a functional change:

    npm ci
    npx playwright install chromium
    npm run check

That type-checks application, worker and compile-only sources, rebuilds, runs
every `tests/*.test.mjs` unit test and every `tests/*.browser.mjs` scenario on
its own server. There are no retries, and a focused `.only` fails the gate. Use
`npm run validate:ontology` and `npm run validate:widgets` for the RDF and
registry checks. Set `FIELDWORK_BROWSERS` to a comma-separated list to exercise
other browsers; the default gate is Chromium only, and a result is claimed only
for the browsers actually run.

Version 0.4.0 passed 101 unit tests, ontology and widget validation and a
Chromium version check. Work since then is unreleased and recorded as in
development in the [release notes](CHANGELOG.md). The
[regression baseline](docs/experiments/07-functional-regression.md) maps
behaviour to tests. These checks establish structure and deterministic
behaviour, not scientific validity, privacy effectiveness or practitioner
effectiveness.

Independent recomputation lives in the Validation Lab rather than here. It has
confirmed reprojection against `pyproj` and cell-centre raster clipping against
`rasterio`, and found that all-touched clipping is **more inclusive than GDAL's**
at pixel-aligned cutlines — see
[experiment 29](docs/experiments/29-raster-edge-inclusion.md).

## Limits

Not implemented: general reprojection beyond the UTM import path, NetCDF, a
GEOS-WASM geoprocessing executor, Logical English comparison, agent-based
simulation, learning and scoring, publication products, GADM download widgets, a
STAC browser or acquisition adapter, runtime widget-version pinning, widget
packs, and a live SHACL report in the browser.

Input data accepts up to 2,000 points and 5 MB files. GeoPackage import supports
2D POINT layers in EPSG:4326; CSV needs longitude and latitude in degrees. The
study-area editor draws bounding boxes and simple polygons of 3–200 vertices,
excluding holes, antimeridian crossings and polar areas. Browser storage is
unencrypted, and clearing it removes local workflows, attachments and offline
assets, so export anything worth keeping.

## Design records

Every decision is recorded in [docs/experiments/](docs/experiments/), separating
proposed capabilities from implemented behaviour. Start with:

| Record | Subject |
| --- | --- |
| [Semantic audit procedure](docs/ontology-audit.md) | Admission review and worked-example checkpoints across three dimensions — structure, semantics and relevance — opening with a glossary so the work can be reviewed without a background in description logic |
| [44 · Competency questions](docs/experiments/44-ontology-competency-questions.md) | The questions the ontology exists to answer, each with its status, and five it must refuse |
| [47 · Sea-level pack](docs/experiments/47-sea-level-pack.md) | The first widget pack use case, over the IPCC AR6 projections: what a browser can honestly consume, and the inundation claim it must refuse |
| [46 · Colour theme](docs/experiments/46-colour-theme.md) | Light, dark and device, and why the released light theme is pixel-identical |
| [45 · Ontology viewer](docs/experiments/45-ontology-viewer.md) | Why the reading view replaced the graph editor, and what a green build does and does not establish |
| [Prior art](docs/prior-art.md) | openEO, QGIS, Geo Engine and APE: what to adapt, what to evaluate, and the limits of each comparison |
| [Widget registry](widgets/README.md) | All 33 node identities with independent versions, port contracts and ontology mappings |
| [39 · STAC discovery](docs/experiments/39-stac-discovery-and-remote-acquisition.md) | Measured catalog behaviour and a proposed acquisition adapter |
| [40 · Reprojection](docs/experiments/40-reprojection-primitives.md) | The implemented UTM import path, and raster warping as specified but unbuilt |
| [41 · Validation Lab](docs/experiments/41-validation-lab.md) | Independent recomputation in Python, its boundary rules and results |
| [42 · Ontology structure and meaning](docs/experiments/42-ontology-structure-and-meaning.md) | An OWL 2 DL reasoner over the vocabulary: what it establishes, and why its consistency is currently unfalsifiable |
| [43 · Widget packs](docs/experiments/43-widget-packs.md) | Curated, governed packs carrying vocabulary, shapes, rules and worked examples |

## Repository contents

| Path | Contents |
| --- | --- |
| `src/` | TypeScript application: canvas, core execution, widgets, reasoning worker, service worker |
| `ontology/` | Vocabulary, SHACL shapes, N3 rules and synthetic examples |
| `widgets/` | Registry and per-widget release files with digests |
| `tests/` | Unit tests and Chromium scenarios |
| `scripts/` | Validation, staging, source extraction and fixture export |
| `docs/` | Usage guide, worked examples, design experiments and research notes |
| `examples/old-naledi/` | Selected source data with provenance |

## Publication and license

[Apache License 2.0](LICENSE). Third-party libraries and source datasets keep
their own licenses and attribution; bundled notices and the Old Naledi
provenance record are preserved.

A push to GitHub `main` runs `.github/workflows/pages.yml`: locked install,
type-check, build, unit and Chromium suites, then deploy to Pages only on
success. The staging script copies an explicit asset manifest and license files;
repository configuration, tests, source documents and secrets are excluded.
GitLab `main` runs the regression and security stages before publishing the same
assets. No access token is stored in either workflow.

## Keeping this README current

Update this file in the same change that adds or changes a widget, an accepted
input format, a workflow connection, storage or export behaviour, a deployment
step, or a prototype limit. Keep it short: step-by-step material belongs in
[the usage guide](docs/usage.md), and rationale belongs in the relevant
[design experiment](docs/experiments/), which should also carry a practitioner
exercise. Describe proposed capabilities separately from implemented behaviour,
date validation claims, and name the browsers actually exercised. Keep local
access tokens under `.secrets/`, which Git ignores and the static server blocks;
credentials are not needed to run the application.
