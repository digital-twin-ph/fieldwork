# Shared input widgets: heat outreach migration

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 6, 2026. Status: first implementation slice of widget standardization.

## A67 Use example labels on shared input contracts

Neighborhoods and Cooling centers now instantiate the shared `observations` (Input data) widget. Their labels, example point records and connections to the nearest-center operation remain unchanged. The heat palette offers one Input data entry, with the same CSV, GeoPackage, GeoJSON, synthetic-data and pushpin editor used by the spatial coverage exercise. Synthetic generation still requires a study boundary; this change does not add one to the heat example.

The input contract remains a point dataset, with optional scalar attributes, typed field definitions, missing coordinates and explicit CRS metadata. The connection's destination role distinguishes neighborhood observations from candidate cooling centers. A label alone does not assert that a point is a verified cooling center or that a facility is available.

## Compatibility and provenance

`validateWorkflow` normalizes legacy `places` and `centers` nodes to `observations` before shared input validation. It works on a clone, keeps node IDs and edges, and records `sourceMigration` with the original node type and adapter version `1`. Revalidating a normalized workflow is idempotent. Original caller objects and previously exported files are not modified; subsequent local saves and exports contain the normalized workflow.

Labels, coordinates, missing locations, references and scalar attributes are preserved. The old point importer could discard attributes other than names; normalization uses the shared scalar-attribute validator instead. Unsupported nested properties are rejected visibly rather than silently removed. Records already stripped by an earlier save cannot be recovered by this adapter.

The old type definitions remain registered as loading aliases. Their example-specific editor branches are no longer reached after successful normalization. This is a specific compatibility adapter, not a general registry-driven migration engine. Workflow nodes still do not pin widget versions.

## Registry and ontology alignment

Input data advances independently to `0.2.0`; the legacy source entries advance to `0.1.1`. Previous release files remain unchanged. The registry records the two migration sources and their adapter implementation. The Input data alignment to `fw:GenericInputConfiguration` remains partial: this change does not invent full SHACL port contracts or claim that new configuration triples are emitted by runtime receipts.

## Evaluation and remaining work

Two unit groups check shared source types, non-mutating/idempotent normalization, record and connector preservation, unchanged distance/N3 inputs, and rejection of unsupported data. The browser scenario imports a legacy heat workflow, verifies a single shared palette entry, edits both datasets through pushpin forms, saves added attributes and reopens offline with the same EYE review count.

The expected synthetic heat baseline is eight neighborhoods, five review classifications at the existing threshold, and one missing-location record. No rules, thresholds or distance methods change in this slice.

Old Naledi's facility and sample contracts, shared visualization outputs, reusable reasoning widgets, full semantic port shapes, runtime version pinning and general migrations remain subsequent standardization work. See the [registry](../../widgets/README.md) and [visualization specification](16-semantic-visualization-design.md).

Validation on October 6: strict TypeScript checks and build passed; the full Chromium suite passed all 32 scenarios (3.0 minutes). The unit suite passed all 50 tests after adding the migration-adapter rejection case. Registry validation passed with 18 identities and 21 release records. Firefox, Safari and remote CI have not been tested for this change.
