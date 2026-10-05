# Fieldwork

Fieldwork is a browser prototype for exploring semantic visual GIS workflows in public health. Build workflows with React Flow, compute spatial facts locally, and evaluate Notation3 rules with EYE-JS in WebAssembly.

The current example screens synthetic neighborhoods for heat outreach using distance to cooling centers and an illustrative alert rule. It is exploratory software, not a validated public health policy or risk model.

## Run locally

Install Node.js 22 or newer, then run:

    npm ci
    npm run build
    npm start

Open http://127.0.0.1:4173. The server listens on the local machine only. Built React Flow assets are included; rebuild them after editing canvas.jsx or flow.css.

## Build a workflow

Select nodes to edit their settings. Add nodes from the library and connect compatible ports. All visual output branches execute together, and shared upstream nodes execute once.

Workflow and N3 & evidence are the main views. Each visual output node creates a named Results tab; choose Map or Table in its inspector. The example includes an Outreach map and a Decision table. Select a location in either view to inspect the inputs and assertion behind its decision.

Changes mark existing results as belonging to the previous run until you run again. Export a workflow to transfer it, or export a run receipt to preserve the executed workflow, N3 inputs, conclusions, and output data. Existing saved workflows remain local; Restore example replaces the current workflow with the latest example and can be undone.

## Local execution and offline use

Spatial distance uses a JavaScript haversine calculation. EYE-JS 21.1.24 runs in a worker and derives Review, NoFlag, or Unknown assertions from N3 facts and rules. The explanations combine run inputs and returned assertions; they are not EYE proof certificates.

Application assets and the bundled EYE engine are cached after the first successful visit. Wait for Available offline before disconnecting. Workflows are stored in browser localStorage without encryption. Clearing browser storage removes local workflows and offline assets, so export work you want to keep. Package installation requires network access; routine workflow execution does not use external services or map tiles.

After updating the application, reload to install the updated service worker, then reload again if the old interface remains visible.

## Validation

Run the core tests with:

    npm test

With the local server running, install the Chromium test browser and run the integration checks:

    npx playwright install chromium
    npm run test:browser

BROWSER_EXECUTABLE can select an existing Chromium executable. The browser checks exercise actual EYE inference, independent output branches, evidence selection, output settings and removal, keyboard tabs, offline reload, and mobile layout. Current browser validation is Chromium only.

## Scope and research

The prototype accepts point GeoJSON with at most 2,000 features per source. It currently retains identifiers, names, and coordinates. Polygon layers, street routing, arbitrary N3 editing, chart outputs, and the Logical English comparison are not yet implemented.

The [research review](docs/research/related-research-2026-10-05.md) provides background. The [Gaborone TB modeling repository](https://git.cdc.gov/digital-twin/Gaborone-TB-Agent-Based-Modeling) is a candidate example for richer facility-access and evidence workflows; its data and Starsim simulation have not been integrated here.

## Repository contents

- app.js and core.js: application controls, graph validation, spatial facts, and execution.
- canvas.jsx and flow.css: React Flow editor, bundled by build.mjs.
- reasoning-worker.js and vendor/: local EYE-JS engine and upstream license notices.
- sw.js: offline application cache.
- tests/: core and Chromium integration checks.

Keep local access tokens under .secrets/, which is excluded from Git and blocked by the static server. Credentials are not needed to run the application.
