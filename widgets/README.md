# Widget registry

The [catalog](registry.json) tracks all 18 currently implemented node types. Each widget has a stable `urn:fieldwork:widget:<nodeType>` identity, an independent current version, and a history of release files under `releases/<nodeType>/<version>.json`. The first `0.1.0` releases record the existing prototype on October 6, 2026; they do not reconstruct historical versions or claim a new implementation.

This is a development registry, not an executable plugin loader. Workflow nodes still use the existing `fieldwork/workflow/1` format without widget version pins. Runtime version selection, migrations and per-version implementation archives remain future work. A historical release file describes a contract; it does not retain executable historical code. Use Git revisions to recover historical implementations.

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

Existing mapped classes include StudyArea, AreaComputation, SpatialCoverageCheck, MapView and TableView. GenericInputConfiguration is a proposed alignment for Input data; registration does not assert that runtime receipts already emit it. Other widgets explicitly report a mapping gap. All configurations align conceptually with `prov:Plan`; this does not change their serialization. Full semantic port contracts and widget-specific SHACL shapes are still required. Existing application port strings are preserved without claiming ontology equivalence.

Neighborhoods and Cooling centers identify Input data as a replacement candidate. That is a standardization direction, not an automatic substitution or deprecation. Old Naledi's specialized widgets retain their current typed contracts and evidence semantics.

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

The initial validator permits application-only validation and no executable migrations. Extend its contract and negative tests when adding widget SHACL or runtime migrations; do not silently mark those capabilities implemented in a JSON file.

## Validation

Run `npm run validate:widgets`. It bundles current TypeScript definitions in memory, checks complete widget coverage and current port alignment, verifies release digests and identities, resolves mapped ontology class declarations, and checks current source paths. It does not execute workflows or certify numerical behavior. Definition symbol names are navigation hints; file existence is checked, not every symbol reference.

The three test groups in `tests/widget-registry.test.mjs` are automatically discovered by the existing unit gate. They test catalog coverage and reject missing widgets, duplicate versions, digest changes, port drift and undeclared ontology classes. Semantic changes without a port change still require review and appropriate behavioral tests.

Before runtime pinning is added, define how unversioned saved workflows resolve, how unsupported versions are reported, and how explicit migrations preserve the original configuration and evidence. Never interpret an old saved workflow as the latest version merely because this catalog's `currentVersion` changed.

The [shared visualization design](../docs/experiments/16-semantic-visualization-design.md) describes the planned relationship between specifications, activities and artifacts. This registry is the starting inventory for applying that ontology discipline across all widgets.
