# Fieldwork release notes

The application version follows the policy in [AGENTS.md](AGENTS.md). A version
shown in a local build is not a claim that it has been published.

## In development

- Add **Tabular data**, a source widget that imports a long-format CSV: one row
  per observation, with the columns that identify a row declared as keys and one
  column holding the value. The key tuple must be unique, so a wide table or a
  dropped key column is refused by name rather than silently collapsed onto one
  row. A unit is recorded only as the person states it and is never inferred from
  the file; an absent value is kept as unknown and counted, never read as zero.
  The widget claims no geometry: `fw:DataTable` is declared disjoint from
  `fw:PointDataset`, so a table cannot be mistaken for a point set by the
  reasoner. Table output gains a Tabular data mode that displays an imported
  table with its unit stated or marked unstated. Limits: 2,000 rows and 5 MB, the
  same as point input. Validation: 8 new unit checks and 2 Chromium scenarios
  within 123 unit tests and 71 scenarios, SHACL conformance for
  `fw:DataTableShape`, and registry validation at 34 widgets and 66 releases. See
  [the design record](docs/experiments/48-tabular-input.md).

## 0.6.0 — 2026-10-08

- Add a colour theme: light, dark, or following the device, chosen from the
  header and saved on this device. The default follows the device, so a first
  visit matches the operating system, and an explicit choice beats a later device
  change. Every colour the interface used keeps its exact released value in
  light, verified by screenshot at 2,162 differing pixels of 1,760,000, all but
  71 of them the new control itself. Canvas node colours are authored separately
  for dark so the widget roles stay distinguishable. Exported SVG and GeoTIFF
  artifacts are unaffected and stay light. No workflow migration is required.
  Dark meets WCAG AA for every rendered text element, measured: fixing 38 colours
  written as the keyword `white`, which had left panels light in dark mode, and
  adding contrast tokens for text on filled accent and danger surfaces. The
  released light theme has 144 long-standing low-contrast labels which are
  recorded rather than changed, and a check ratchets them so they cannot get
  worse. Validation: 115 unit tests and 69 Chromium scenarios with 1 skipped.
  Colour-vision accessibility, non-text contrast and Firefox or WebKit rendering
  are not established; see [the design record](docs/experiments/46-colour-theme.md).
- Fix a latent defect in the encrypted-project dialog: opening it again before the
  previous one had closed left two elements sharing one id, which is invalid and
  made the dialog ambiguous to find. Opening is now idempotent. This was
  intermittent and predated the theme work.

## 0.5.0 — 2026-10-08

- **Change the All touched clipping rule to match GDAL.** A cell is now included
  only when the clipping boundary covers part of its area or crosses its
  interior. A boundary edge lying exactly on the border between two cells no
  longer pulls in the cell outside it, and the cropped window is no longer
  padded by a fraction of a pixel. Measured cell by cell against rasterio 1.5.2
  with GDAL 3.12.2, differences over a deliberately pixel-aligned cutline fall
  from 35 cells to 2, and the window now agrees; the residual 2 cells come from
  GDAL burning cells along a cutline vertex lying exactly on a cell border,
  which is an artifact of its line rasterizer rather than a stateable rule.
  **Migration:** re-running a saved All touched clip can retain fewer boundary
  cells, so a total derived from one can change. Cell center inside is
  unaffected. `clip_raster` is released as 1.0.0 with that effect recorded.
- Validation: strict TypeScript, production build, **112 unit tests**, ontology
  SHACL conformance, widget-registry validation at 33 widgets and 64 releases,
  and **63 Chromium scenarios with 1 skipped** (the local WorldPop raster, which
  is not bundled). Independent recomputation in the Validation Lab confirms
  reprojection against pyproj and cell-centre clipping against GDAL, and records
  a 2-cell residual on all-touched. **Not established:** scientific suitability,
  privacy effectiveness, cartographic suitability, or Firefox and WebKit
  behaviour. A first WebKit run passed 31 of 64 scenarios, with 21 of the
  failures attributable to the test harness rather than the application and the
  remainder untriaged.
- Record the inclusion rule and the outer margin in N3 evidence as
  `fw:rasterMaskConvention` and `fw:rasterMaskMarginPixels`, constrained by
  SHACL. Receipts previously stated only a method name, so two clips made under
  different rules, or with different margins, were indistinguishable in their
  evidence. Receipts exported before this change carry no convention and were
  produced by the earlier, more inclusive rule.
- Add a **Reproject input** source widget that imports a local CSV or GeoJSON in
  WGS84 UTM metres and converts it to CRS84 longitude/latitude, so projected
  files can reach the existing point widgets for the first time. The conversion
  runs once on import and replays offline; the output is the ordinary CRS84
  points contract, so no downstream widget changes.
- Record the declared source EPSG code, exact proj4 definition, axis order,
  units, operation, library version, converted and unconverted counts, maximum
  round-trip error and an explicit `datumShift: none` with the imported points.
- Admit WGS84 UTM zones only. A file on another datum needs a datum shift this
  prototype does not implement, and is refused rather than approximated.
  Coordinates outside the UTM easting/northing ranges, points outside the
  declared zone's validity guard and round-trip disagreements above 0.01 m are
  refused with an explanation.
- No workflow migration is required; existing saved projects are unaffected.
- Validation of this work in progress: strict TypeScript, production build, 111 unit tests, ontology and
  widget-registry checks (33 widgets, 63 releases) and 63 Chromium scenarios
  with 1 skipped. Unit checks assert UTM definitional invariants, round-trip
  tolerance and guard refusals. **Not established:** agreement with PROJ or
  GDAL to a stated tolerance, any datum other than WGS84, that a declared zone
  or hemisphere is the correct one for a given file, or Firefox and WebKit
  behavior. Raster warping is specified in
  [experiment 40](docs/experiments/40-reprojection-primitives.md) but not built;
  `raster_input` keeps its no-resampling contract.

## 0.4.0 — 2026-10-07

- Make Map outputs standalone communication views with configurable title,
  subtitle, visible map key, source/method note and local SVG export. Interactive
  polygon maps can choose no basemap, OpenStreetMap streets or OpenTopoMap
  terrain; online tiles are requested only for the current view and are absent
  from the SVG. Record the bounded map plan in N3 and validate it with SHACL.
  Existing saved maps default to local geometry; no migration is required.
  Validation covers structural evidence and Chromium interaction, not
  cartographic suitability or the correctness of source citations.

- Add an opt-in, locally bundled Vega-Lite Chart enhancement for the existing
  categorical counts: bar or dot marks, orientation, title, subtitle, axis
  labels, optional color legend, source note, SVG export,
  an underlying values table and an inspectable specification. Classic bars
  remain the default for saved workflows; no migration is required.
- Record the bounded chart specification in N3 and validate its structure with
  SHACL. This does not establish scientific correctness, chart suitability or
  practitioner comprehension. Local browser and cross-browser validation are
  recorded in [the spike note](docs/experiments/37-vega-lite-chart-spike.md).
- No saved-workflow migration is required. The release build passed 101 unit
  tests, ontology and widget validation, and a Chromium desktop/narrow-screen
  version check. Scientific suitability and Firefox/WebKit behavior remain
  unverified for this release.

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
