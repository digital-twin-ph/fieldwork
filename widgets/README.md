# Widget registry

The [catalog](registry.json) tracks all 27 current node identities (including legacy import identities). Each widget has a stable `urn:fieldwork:widget:<nodeType>` identity, an independent current version, and a history of release files under `releases/<nodeType>/<version>.json`. The first `0.1.0` releases record the existing prototype on October 6, 2026; they do not reconstruct historical versions or claim a new implementation.

This is a development registry, not an executable plugin loader. Workflow nodes still use the existing `fieldwork/workflow/1` format without widget version pins. Runtime version selection, general migrations and per-version implementation archives remain future work; the heat-source adapter is explicitly implemented. A historical release file describes a contract; it does not retain executable historical code. Use Git revisions to recover historical implementations.

## Contents of a release

| Field | Purpose |
| --- | --- |
| `id`, `version`, `nodeType` | Stable identity, independent semantic version and current implementation binding |
| `implementationStatus`, `standardization` | Separate implemented/proposed/retired status from shared/example-specific design |
| `configuration` | TypeScript parameter contract, plan-class alignment and explicit SHACL gaps |
| `ports` | Base input/output types and dynamic point-layer limits |
| `ontology` | Role-qualified class mappings, declaration files and mapping completeness |
| `implementation` | Repository source files and definition location |
| `compatibility` | Workflow schema, migration status and optional replacement candidate |
| `changes`, `evidence` | Release rationale and the limits of validation claims |

Existing mapped classes include StudyArea, AreaComputation, SpatialCoverageCheck, MapView, TableView, ChartView and CategoricalCount. GenericInputConfiguration is a proposed alignment for Input data; registration does not assert that runtime receipts already emit it. Other widgets explicitly report a mapping gap. All configurations align conceptually with `prov:Plan`; this does not change their serialization. Full semantic port contracts and widget-specific SHACL shapes are still required. Existing application port strings are preserved without claiming ontology equivalence.

Neighborhoods and Cooling centers now normalize to Input data through the specific adapter recorded in the current releases. New heat canvases instantiate Input data directly. Historical releases retain their earlier replacement-candidate descriptions. Old Naledi now splits its registry into Input data and Select nearby facilities (`1.0.0`); its downstream evidence and access contracts remain specialized. See the [first standardization slice](../docs/experiments/18-shared-input-standardization.md).

## Version and change policy

Version widgets independently of the application, registry format and workflow schema. A change to one widget does not require bumping unrelated widgets.

- Patch: compatible fixes that preserve accepted configuration, port meanings and result semantics. Document any corrected numerical behavior.
- Minor: additive, backward-compatible settings or capabilities with explicit defaults.
- Major: incompatible configuration, port, unit, identity, rule or result semantics. Use a major bump even during this initial experimental series when an existing saved workflow would change meaning.

Once committed as a release, retain its file unchanged. Add a new file, append its reference to the catalog and update `currentVersion`. Record what changed, compatibility impact, evidence and the associated implementation revision in the change description. An unchanged registry format is not evidence of unchanged widget semantics. File digests detect accidental edits but are not signatures or protection against someone rewriting both file and catalog; Git review enforces historical immutability.

To register an improvement:

1. Copy the current release into a new version file in the same widget directory.
2. Update the version, date, contract and change description. Retain old releases and stable widget identity.
3. Calculate SHA-256 over the exact UTF-8 file bytes. On PowerShell, use `Get-FileHash -Algorithm SHA256 <release-path>` and lowercase the digest for the catalog.
4. Append `{version, path, sha256}` to that widget's `releases` array and set `currentVersion`.
5. Run `npm run validate:widgets` and the relevant functional checks; review any changed configuration or semantic behavior explicitly.

The validator permits application-only validation and the explicit heat-source, facility-source and map/table/chart-output adapters. It checks the shared outputs' reasoning-mode connector as well as their direct inputs. General registry-driven migrations and widget SHACL remain unsupported; extend the validator and negative tests when adding them rather than marking them implemented only in JSON.

## Validation

Run `npm run validate:widgets`. It bundles current TypeScript definitions in memory, checks complete widget coverage and current port alignment, verifies release digests and identities, resolves mapped ontology class declarations, and checks current source paths. It does not execute workflows or certify numerical behavior. Definition symbol names are navigation hints; file existence is checked, not every symbol reference.

The four test groups in `tests/widget-registry.test.mjs` are automatically discovered by the existing unit gate. They test catalog coverage and reject missing widgets, duplicate versions, digest changes, port drift and undeclared ontology classes. Semantic changes without a port change still require review and appropriate behavioral tests.

Before runtime pinning is added, define how unversioned saved workflows resolve, how unsupported versions are reported, and how explicit migrations preserve the original configuration and evidence. Never interpret an old saved workflow as the latest version merely because this catalog's `currentVersion` changed.

The [shared visualization design](../docs/experiments/16-semantic-visualization-design.md) describes the planned relationship between specifications, activities and artifacts. This registry is the starting inventory for applying that ontology discipline across all widgets.

Raster input and Clip raster are shared widgets at 0.1.0. Map 0.3.0 adds an explicit raster input mode. The catalog now tracks 27 widget identities and 53 releases; the validator checks raster-mode ports as well as reasoning and point-layer ports. The raster computation reuses `fw:RasterClipping`, with GeoSPARQL cutlines and PROV source links. See [the raster experiment](../docs/experiments/25-raster-input-and-clipping.md).

Map 0.4.0 exposes the alternative raster port on ordinary spatial Maps and switches modes on connection. The unused raster port does not become a required point-map dependency. Historical release files remain unchanged.

Raster input and Clip raster 0.2.0 preserve author-entered source metadata separately from extracted file metadata, including N3 and GeoTIFF export. See [source provenance](../docs/experiments/26-raster-source-provenance.md).

The proposed [workflow learning framework](../docs/experiments/27-workflow-learning-and-gamification.md) adds companion learning profiles that map widget identities and supported versions to competencies and assessment evidence. Profiles and scoring policies would be independently versioned; they are not current registry fields and do not change scientific port contracts.

Clip raster 0.3.0 adds [preview and parameter adjustment](../docs/experiments/28-raster-preview-and-adjustment.md) using the shared Study area editor. Boundary edits change the connected Study area explicitly; opacity is display-only. Computational ports and cell-center semantics are unchanged.

Clip raster 0.4.0 supersedes the shared-boundary editing behavior of 0.3.0: the operation owns an independent cutline initially copied from Study area. Map 0.4.1 removes the gray rectangle outside the clipped polygon. Computational resolution and cell-center inclusion remain unchanged.

Clip raster 0.5.0 adds all-touched inclusion and a 0-1 native pixel margin. Map 0.5.0 hides pixel portions outside that footprint; Raster input 0.3.0 can acquire one extra pixel of source coverage. Saved center-based workflows retain their method. See [edge inclusion and display masking](../docs/experiments/29-raster-edge-inclusion.md).

Experiment 32 adds six shared primitives (27 identities / 51 releases): Voronoi catchments, Street network, Network isochrone, Clip polygons, Summarize points in polygons, and Buffer study area. Map 0.6.0, Table 0.3.0 and Chart 0.2.0 accept explicit polygon mode. Study area 0.2.0 adds sized boxes. See [design record](../docs/experiments/32-john-snow-primitives.md).

Map 0.7.0 adds polygon plot/interactive views and a context point connector. Network isochrone 0.2.0 adds cumulative thresholds and explicit infill. See experiment 33.
