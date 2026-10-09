# Separate facility data from radius selection

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 6, 2026. Status: second implementation slice of shared-widget standardization.

## A68 Make source data an explicit input

The Old Naledi example now connects **Input data: Gaborone facility registry** to **Select nearby facilities**. The source contains the same 214 bundled historical records, represented as point features with name, owner and serviceType attributes. It uses the shared import/pushpin editor and can connect directly to a generic point table. Source metadata retains the original repository, commit, file path and source-file digest.

The selection node retains its `facilities` implementation identifier but moves from Sources to Spatial operations. Its inputs are a study area and point data. It requires text owner and serviceType attributes on every record, selects located records at or within the configured radius, and outputs the existing facility contract for the diagnostic-evidence operation. Additional scalar source attributes are retained with selected facilities.

The operation uses haversine distance from the center of the study boundary's bounding box, preserving the previous method. It is not point-in-polygon selection, road distance, travel time or service availability. Missing coordinates are counted and omitted from candidates without deleting source records. The source's generic Table view remains available to inspect all input records.

Diagnostic-evidence and access rules are unchanged. Replacing data does not validate the historical named-facility or facility-type assumptions for a new setting. The selection inspector makes that limitation explicit.

## A69 Migrate the combined widget without replacing scientific settings

Legacy facility nodes have no `sourceMode`. Validation adds one shared input node and connector per legacy node and marks the existing selection `sourceMode: connected`. The existing selection ID, radius, references and outgoing connections are retained. New node and edge identifiers avoid collisions. The transformation works on a cloned workflow and is idempotent.

An explicitly connected selection with its point edge removed remains disconnected; validation does not regenerate a source or undo user edits. Unknown legacy dataset versions, contradictory point connections, and migrations exceeding workflow size limits are rejected. The old exported file remains unchanged; subsequent saves contain the expanded graph and its explicit source data.

The facility widget advances to `1.0.0` because its input-port contract changes. The registry preserves `0.1.0`, records the compatibility adapter, and maps the new activity to `fw:NearbyFacilitySelection`. This remains a specialized facility-data adapter with application field validation, not a general-purpose spatial selection engine or a complete SHACL input profile.

## Computation evidence and source lineage

Selection now emits a computation receipt describing the activity, used point-source and study-area entities, radius, input count, missing-location count and selected count. It is recorded alongside the two existing reasoning receipts; it does not invoke EYE to calculate distance. Outputs also retain `facilitySource` metadata and counts, exposed in result inspection.

The source-file digest identifies the original upstream file, not the current edited point collection. The workflow snapshot captures actual edited inputs. Existing Old Naledi dataset/provenance fields continue to describe the example boundary and historical method context; `facilitySource` identifies the connected facility input. Do not interpret those example fields as proof that edited or replacement facilities equal the historical file.

## Evaluation

Unit checks compare the selected facilities with the original bundled-record calculation, verify identity and connector preservation during migration, exercise identifier collisions and deliberate disconnection, and test missing coordinates and required attributes. A frozen pre-split workflow fixture provides the migration input.

The browser experiment imports that fixture, verifies the historical review count, opens the new shared source editor, deletes Princess Marina Hospital from the draft, saves, selects the direct-only evidence setting and confirms unknown access for all 21 sample points. Offline reload must preserve the 213 remaining input records and must not regenerate the removed record or source node. The established Old Naledi browser exercise continues to check the evidence hierarchy, settings, four outputs and offline behavior; its expected receipt count increases from two to three because selection is now explicitly recorded.

Sample generation, specialized reasoning and output standardization remain future slices. This change does not imply publication, a new download service, generic polygon import or a simulation engine.

Validation on October 6: strict TypeScript checks, production build, all 52 unit tests and all 33 Chromium scenarios passed. The additional RDF receipt assertions passed in a focused rerun. Ontology and widget-registry validation passed; the registry contains 18 identities and 22 release records. This slice has not been tested in Firefox, Safari or remote CI.
