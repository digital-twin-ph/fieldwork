# Fieldwork release notes

The application version follows the policy in [AGENTS.md](AGENTS.md). A version
shown in a local build is not a claim that it has been published.

## In development

- Link the canvas to the Results panel: selecting an output node opens that node's result tab and
  marks it, so the two panels agree about what is being looked at. A node that produced two tabs, as a
  coverage check does, keeps whichever of its own is already open rather than jumping between them,
  and selecting a node with no result leaves the open tab alone while clearing the mark.

- Add **Rate with a denominator**, the first widget on the person axis: divides counted events by a
  declared population at risk, grouped by an attribute or by bands of a numeric one. The declarations
  are the point — what the denominator counts (people, houses, households, person-time), whether the
  result is a proportion or a ratio, the multiplier, the smallest denominator that gets a rate, and the
  numerator period beside the denominator vintage, which are compared rather than assumed to match. A
  proportion exceeding one is refused, a zero or small denominator reports its counts and no rate, and
  a non-numeric or negative value is refused rather than read as zero. `fw:RateResultShape` requires
  the unit and the kind, so a rate that does not say what it is a rate of cannot conform.
- Record what the surviving John Snow data sets can and cannot support in
  [a research note](docs/research/john-snow-data-sets.md): the 578-point digitisation is a stacked
  cartographic device rather than case locations and was withdrawn from the Chicago compilation; the
  bundled 250-building file has an unknown licence; a denominator exists only as **houses** in the
  1,852-house General Board of Health digitisation, so a rate per house is defensible and a mortality
  rate per person is not; the numerator and denominator come from different years; and the GPL on that
  digitisation permits redistribution, so the file can be bundled verbatim with its licence and
  attribution, while a reprojected or filtered copy would itself have to carry the GPL. Measured there:
  186.7 deaths per 100 houses within 50 m of the Broad Street pump against 2.0 beyond 300 m, and 55.6 %
  of houses within 50 m having at least one death against 5.0 % at 250–300 m.

- Add **Cases by period**, the first widget on the time axis: counts cases per day, week or month
  from a declared date attribute and a declared **kind** of date, reading either a point layer or a
  keyed table, and optionally weighting by an attribute where one row stands for several cases. A
  Chart output gains a case-series mode that draws the result as an epidemic curve, so the curve is a
  presentation of the series with no smoothing or interpolation. Periods with no cases are retained,
  because a gap is a fact about the outbreak; records whose date is not ISO 8601 are excluded and
  counted rather than guessed at, since a widget that chose between day-first and month-first ordering
  would be silently wrong for a third of the year; and a non-numeric or negative weight is refused,
  naming the record. `fw:CaseSeriesShape` requires the kind and the period, so a series that does not
  say what it is a series of cannot conform.
- Bundle **John Snow's own daily table** (1855, Table 1) at `examples/john-snow/snow_dates.csv` with
  its citation chain, digest and retrieval route. It supplies the time axis his map cannot: 616 deaths
  and 571 dated attacks between 19 August and 30 September 1854, with **attacks peaking on 1 September
  and deaths on 2 September** — the historical demonstration of why the kind of date must be declared.
  Recorded limits: the file's final row carries 45 attacks with no date, which a keyed table cannot
  represent, and the two Snow files cannot be joined case by case because one has places without dates
  and the other dates without places.
- Record a measured contrast finding: an amber palette icon is 2.83:1 on its own wash, a pre-existing
  defect the new widget surfaced in the node library for the first time. The widget uses the Summaries
  group's teal instead, and the amber token is left for a deliberate decision rather than changed as a
  side effect. See [experiment 46](docs/experiments/46-colour-theme.md).

- Implement the sea-level pack's three contracts in the application, since the pack ships no code and
  the application loads none: **Sea-level projection extract** declares an imported long-format table
  as a bounded AR6 extract, requiring the full key of site, scenario, workflow, family, year and
  quantile, metre units, the dataset and version, the baseline period, three obligatory citations and
  which family value includes vertical land motion; **Assign projection site** gives each point its
  nearest published site and keeps the distance, reporting unlocated points rather than dropping them;
  and **Compare level to elevation** compares one fully keyed projected change against a
  practitioner-supplied elevation on a stated datum, refusing to run without the datum, without a
  named elevation attribute, or with a partial key, and treating equality as reaching the elevation.
  The output uses the existing decisions port, so Map, Table and Chart present it unchanged and it
  cannot reach a raster output that would resemble a flood map.
  The pack's vocabulary stays authoritative: the host mints no sea-level term and vendors the pack's
  two TTL files at the digests `widgets/packs.json` pins, which `validate:widgets` now verifies and a
  negative test covers. The pack retires its widget declarations and records each deviation. Three
  deviations were argued before the code, in
  [experiment 58](docs/experiments/58-sea-level-widgets.md): a table input rather than a second CSV
  reader, three inputs for site assignment because a table has no geometry, and the decisions output.
  Validation: 11 new unit checks within 145, 2 Chromium scenarios within 74 with 1 skipped, receipts
  conformant to the pack's own SHACL shapes with a negative case, registry valid at 37 widgets and 69
  releases, catalog 0.2.0 verified at 5 pinned digests. Projections are **imported, never produced**,
  and the worked example here uses synthetic values with the published key structure rather than AR6
  numbers.

- Show widget packs in the catalog, with the admission state, the pinned commit, each required
  review's state and the recorded reason — labelled as decisions read from this build's catalog
  rather than checks performed by the page. The view also states why no pack can be added here:
  nothing is fetched or executed at runtime, and the sea-level pack is declaration-only, carrying
  no widget code. Experiment 49 had excluded admission state on the grounds that a bare badge is an
  unverifiable trust claim; showing it with its basis keeps that objection satisfied while
  answering the question the omission left hanging.

- Show the widget catalog in the application, reachable three ways: **▤ Catalog** in the header,
  **Widget catalog ›** beside the node library, and `?catalog=1` for a direct link. The first
  version had only the library link, at 10px, which was too easy to miss. The header control is
  hidden below 850px because the header measures 395px wide with it at a 390px viewport and 390px
  without, even reduced to its icon, so phone width keeps the labelled library entry instead. The
  dialog, beside the node library, lists every
  compiled definition with its version, release digest, declared ports and independent-check
  outcome, together with the application version, the pack-catalog version and digest, and how
  many widgets have parity evidence. The inspector shows the same identity for the selected node,
  with the measured result of its check. Nothing is fetched and nothing is installable, which the
  dialog states. Adding it tripped the light-theme contrast ratchet at 47 pairs against a baseline
  of 46 — a "not checked" badge at 3.26:1 — which was fixed by differentiating outcomes through
  the foreground only, since an invented light background had left dark mode light-on-light. See
  [experiment 49](docs/experiments/49-catalog-in-the-interface.md).

- Record the curated pack catalog in run provenance. A run asserts `fw:PackCatalog` with the
  catalog version and the SHA-256 of `widgets/packs.json` as built, and every node plan states
  `fw:widgetDefinitionSource "host-registry"`, which the runtime shape requires from a closed
  set. The application still loads no pack — `runtimeFetching: "none"` is an admission rule —
  and that is why the receipt now says so positively instead of being silent, since an absence
  cannot be checked. Recorded metadata only: not a claim that any pack was reviewed, admitted,
  available or used. The identity is generated into `widgets/pack-catalog.json` by the build.
  Validation: 5 new unit checks within 128, 71 Chromium scenarios with 1 skipped, SHACL
  conformant, registry valid at 34 widgets and 66 releases, catalog verified at 8 pinned
  digests. See [experiment 49](docs/experiments/49-catalog-in-the-interface.md).
- Record parity evidence for widget releases in `widgets/parity.json`: which external
  implementation recomputed a release, under what criterion, with what measured result. Release
  files are immutable once committed, so evidence about a release accrues in a separate record
  pinned to a Validation Lab commit. `validate:widgets` checks its shape and registry agreement
  offline; the new `validate:parity` verifies each claim against the Lab's own result file and
  lists the widgets with no evidence. Recorded so far: `reproject` 0.1.0 agrees with pyproj within
  6.70e-5 m, and `clip_raster` 1.0.0 is partial — cell-centre agrees exactly, all-touched differs
  by 2 cells at a pixel-aligned cutline, and the margin case is an unresolved comparison. Also recorded, working through the Spatial
  operations group: `measure_area` 0.1.0 agrees with an independent spherical computation to
  4.8e-14 relative, while the same check quantifies the approximation the widget declares — 0.30 %
  against great-circle edges for an oblique triangle, and +0.45 % to -0.56 % against WGS84 between
  the equator and 60 N; and `mean_center` 0.1.0 agrees with pyproj to 4.1e-10 m. Parity is
  4 of 34 widgets, and the other 30 are printed by name. See
  [experiment 57](docs/experiments/57-parity-evidence.md).
- Make the pack validation report citable. `validate:packs` now records what it validated
  against — host version, registry digest, catalog version and digest, widget count — plus the
  rules it evaluated and, per pack, files verified against files pinned and the state of each
  required review. A review state is a claim; this is the evidence a curator attaches to it. See
  [experiment 56](docs/experiments/56-basis-behind-identity.md).

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
