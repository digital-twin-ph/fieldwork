# Fieldwork release notes

The application version follows the policy in [AGENTS.md](AGENTS.md). A version
shown in a local build is not a claim that it has been published.

## 0.3.0 — 2026-10-07

- Add a collapsible widget library and full-screen workbench and Results views,
  with Escape to restore the normal layout. No workflow migration is required.
- Add a John Snow geoprivacy experiment with configurable donut displacement,
  H3 cell aggregation, private before views, derived after maps/tables, and demo
  GeoJSON downloads. Compare original and moved locations in side-by-side maps
  with mean centers and pump context. The notebook map-encryption transform and contextual hide
  operation remain planned. No workflow migration is required.
- Expose Mean center as a reusable processing widget on both original and moved
  branches; Compare point sets consumes their typed outputs and verifies source
  identity, CRS, and counts. Existing saved comparisons retain their earlier
  three-input behavior.
- Local validation passed 99 unit tests and 60 Chromium browser scenarios,
  including the Botswana WorldPop GeoTIFF, desktop and narrow-screen version
  badge, positive and negative SHACL cases, and N3/evidence inspection.
  Privacy effectiveness and Firefox/WebKit behavior are not established.

## 0.2.0 — 2026-10-07

- Display the application version next to the Fieldwork mark, sourced from the
  root package version.
- Establish a versioning policy that distinguishes application releases from
  widget, ontology, workflow schema, and project revision versions.
- Add this release-note record.
- No workflow migration is required. The local build, widget and ontology checks,
  and a desktop/narrow-screen browser check passed. Broader browser regression
  runs are part of the publication pipelines.

## 0.1.0 — 2026-10-07

- Publish the browser-based visual GIS prototype to GitLab Pages and replicate
  the same source commit to GitHub Pages.
- Add shared study-area, point, raster, network, catchment, map, table, and chart
  workflow primitives, including the Old Naledi and John Snow worked examples.
- Export N3 and provenance evidence, validate runtime RDF with SHACL development
  checks, and package local projects with their binary reference assets.
- Validate the release with 94 unit tests and 57 distinct Chromium scenarios.
  Firefox, WebKit, and scientific outcome validation remain open.
