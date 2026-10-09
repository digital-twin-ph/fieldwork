# Developmental evaluation: TypeScript migration

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. Status: implemented locally; validation record below. This migration follows the user's request to adopt TypeScript before extending browser geoprocessing. It preserves the current worked examples and saved workflow schema.

## Evaluation question

Can explicit software contracts make changes to widgets, computations, reasoning and presentation safer without changing what practitioners enter, save or see? The immediate evidence is compile-time rejection of incompatible code plus the existing functional regression suite. Practitioner effectiveness and public health validity remain separate questions in the [N3 evaluation experiment](11-n3-output-evaluation.md).

## A45: TypeScript source, static JavaScript delivery

All application modules, the React Flow canvas and both workers now live under `src/` as `.ts` or `.tsx`. The previous root application JavaScript files are removed to avoid two editable implementations. Edit source, then run `npm run build`.

The build performs strict type checking before esbuild emits browser JavaScript into `build/`. EYE and sql.js remain their existing bundled JavaScript/WASM dependencies. The browser requires no TypeScript compiler and no application backend. Offline execution still uses local assets.

Node build/test/server utilities remain `.mjs`; generated example data and vendored engines remain JavaScript artifacts. `allowJs: false` prevents unchecked application JavaScript from entering the TypeScript source graph. A narrow declaration file describes the pinned, generated Old Naledi data artifact. Third-party declaration internals use `skipLibCheck`; application and worker source are checked with `strict: true`. There are no application `@ts-ignore`, `@ts-nocheck` or explicit `any` escape hatches.

## A46: types complement runtime validation

| Contract | Source | Purpose |
| --- | --- | --- |
| Discriminated node parameters, graph edges, geometry, attributes and CRS metadata | [types.ts](../../src/types.ts) | Associate each node kind with its settings and distinguish points from study polygons. |
| Spatial results, review rows, measurements and receipts | [results.ts](../../src/results.ts) | Describe computational outputs and the fields used by result views. |
| N3 requests and successful/error replies | [worker-types.ts](../../src/worker-types.ts) | Share the browser-to-worker message contract. |
| Canvas API and callbacks | [canvas.tsx](../../src/canvas.tsx) | Type the connection between React Flow and the application shell. |
| DOM queries and form controls | [dom.ts](../../src/dom.ts) | Give known controls concrete element types and report missing required elements. |

Imported JSON, GeoJSON, CSV and GeoPackage values still require runtime validation. TypeScript cannot establish that a file actually follows an interface, that a polygon is valid, or that a geographic approximation answers a public health question. Existing checks for node connections, cycles, record limits, scalar attributes, value sets, CRS labels, geometry and returned EYE decisions remain in place.

The graph executor resolves dynamic connections after validation. Its heterogeneous execution-input and presentation boundaries retain localized type assertions; this is not a claim that the compiler proves every port relationship or returned RDF assertion. Narrow operation contracts protect their implementations; graph validation and regression tests protect those dynamic boundaries. Form edits using dynamic parameter keys also pass through workflow validation before persistence.

Application and worker environments have separate configurations: the application uses DOM declarations; workers use WebWorker declarations. This prevents accidental reliance on document elements inside worker code. GEOS-WASM and the proposed geoprocessing job lifecycle are not added by this migration.

## A47: generate the offline asset list from the build

The previous manually maintained cache list could miss a module as the application grew. The build now collects emitted JavaScript/CSS chunks from esbuild metadata, adds the pinned engine and other static assets, and writes `build/asset-manifest.json`. A content digest identifies the cache version. Root `sw.js` is generated from [src/sw.ts](../../src/sw.ts) so its scope still covers the application.

Every emitted runtime chunk is precached. Source maps remain available for debugging but are not required offline. Online basemap tiles remain optional and are not precached. The service worker replaces old application caches; it does not delete localStorage. Storage keys and schema `fieldwork/workflow/1` are unchanged, so saved workflow migration is unnecessary.

## Steps and regression evidence

1. Preserve the existing behavior through the current tests and fixed compatibility fixture.
2. Introduce strict application/worker configurations and shared types.
3. Convert computational modules, node execution, UI widgets, canvas and workers.
4. Point the static page and tests at compiled TypeScript outputs; remove duplicate root sources.
5. Add type checking to the existing local/CI gate and generate the offline manifest.
6. Exercise the existing browser scenarios without changing their assertions or frozen fixture.

`tests/types.test.ts` contains eight expected compile-time failures: unsupported area units, wrong node parameters, wrong CRS axis order, malformed worker requests/replies, polygon geometry in point input, incompatible settings after node narrowing, and mixing reviewed coverage with raw map layers. The TypeScript compiler fails the gate if an expected error disappears. These checks complement the runtime tests; they do not execute in the browser.

Commands:

- `npm run typecheck`: application, worker and compile-only contract checks.
- `npm run build`: type checks plus static assets and offline manifest.
- `npm test`: type checks, build and all unit tests.
- `npm run check`: type checks, build, unit tests and Chromium browser scenarios.

## Validation record

On October 5, 2026, strict application/worker checking, all eight compile-time rejection cases, all 33 unit tests and all 21 Chromium browser scenarios passed locally using Node 22.20.0. Browser execution took approximately 2.7 minutes, with no retries or skips. This includes pushpin save/error/retry/deletion/UUID behavior, all input formats, connector dragging, actual EYE inference, the frozen saved-workflow fixture and offline replay. Tests use isolated contexts and port 4174, leaving the user's saved canvas on port 4173 untouched. Firefox/WebKit, a remote GitLab pipeline and practitioner sessions have not been run for this migration.
