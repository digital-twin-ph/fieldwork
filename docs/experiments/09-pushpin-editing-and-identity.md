# Developmental evaluation: saving, deleting and identifying pushpins

_Created 2026-10-06 · Updated 2026-10-08_

Date: October 5, 2026. The user reported that entered key/value data did not persist and requested an explicit Save Edits button. They also requested a visible Delete Pin button, an option to generate UUIDs, and clarification of the Category/Notes fields.

## A33: one explicit persistence action

The previous **Save pin attributes** action only updated the editor draft. **Apply input data** persisted that draft, but ignored a completed new key/value pair unless **Add pair** had been clicked first. A browser regression reproduced this loss before the fix: the entered value was absent from the saved workflow after applying.

The sticky footer now offers **Save Edits**. It validates existing values and any pending key/value pair or shared-field definition, then saves the whole Input data node on the device. A valid pending pair does not require an extra Add pair click. Incomplete or invalid definitions leave the editor open with an error. Switching records also stages a valid pending pair on its original record. The former pin-level save button is now **Update pin draft**, with explicit guidance to use Save Edits for persistence.

Unsaved edits have a visible status. Closing with X, Cancel or Escape offers **Keep editing** and **Discard edits** rather than silently losing the draft. Successful persistence closes the dialog and displays a saved confirmation. Results remain marked as belonging to the previous run until the workflow is rerun.

The editor now receives persistence success/failure from the application. If browser storage fails, the dialog remains open for retry, the in-memory workflow is restored and no successful-save message is issued. If only one of the two localStorage records was written, the application attempts to restore its previous value. This is error recovery, not a claim that localStorage provides multi-record transactions; storage that also rejects rollback cannot guarantee durable recovery. The editable draft remains available in the open dialog.

## A34: explicit deletion and stable optional UUIDs

**Delete Pin** is located beside the record selector and is enabled when a record is selected. It removes that record from the draft; **Save Edits** commits the deletion. Discarding the draft preserves the original source, and workflow Undo restores a committed deletion. This source-editing action is distinct from a coverage-review exclusion, which retains the source record and records a reason.

**Generate UUIDs for new pins** uses the browser's UUID generator for the GeoJSON feature ID. The selected strategy is stored as `pinIdStrategy: "uuid"` or `"sequential"` in the Input data node. Existing workflows without this setting continue using sequential IDs. The checkbox never renames existing records. Changing a label, dragging a pin, editing coordinates, saving or reloading preserves the ID. UUIDs appear in the read-only Record ID field, Table outputs and the existing source-scoped RDF record identity.

UUID generation is local and does not require a network request. Automatic capture time and coordinates retain their existing behavior. Imported records keep their original IDs; the option governs newly placed map pins.

## A35: explain attributes in practitioner language

Category is an optional user-assigned label, such as Clinic, Household or Water point. It does not currently trigger classification rules, change marker styling or establish a domain ontology class. Notes is optional free text about the location.

The standard fields no longer display the ambiguous “Key: category · Value” or “Key: notes · Value” text. Their help describes what to enter. The custom-attribute section explains that the attribute name identifies what is recorded and the value is the answer, for example `household_size` and `5`. Data-type labels use familiar terms, such as Whole number and Yes / no.

Stored keys, typed values and value-set definitions retain their existing contracts. In N3 they remain attribute descriptors and values; a text Category does not become an inferred RDF class merely because it is called a category.

## Regression and developmental evidence

### A36 Save validation must explain how to recover

The next user trial reported that Save Edits stayed open. The supplied screenshot showed the generic unique-key validation error at the bottom of the dialog. This establishes a validation block, but the exact entered key was not supplied. The prior passing scenarios did not establish that practitioners could find or interpret this message.

Validation errors now stay beside Save Edits in the sticky footer. New-attribute validation distinguishes missing names, reserved names, invalid characters and names already present on the pin; it identifies the entered name and focuses that control. Existing values should be edited in their own fields. Selecting a type for an otherwise empty new-attribute form no longer blocks saving unrelated edits.

An additional browser reproduction found that a rejected file import left Save Edits disabled when switching to pushpins. Entering pushpin mode now restores saving of the current valid draft; the rejected file is never accepted. Browser tests failed before the fix for both the disabled-button path and an offscreen validation message, then check persistence after recovery. Tests also cover a duplicate Category name and an unused type selection.

These changes preserve attribute-name and value validation. They do not silently rename keys, overwrite existing attributes or discard an invalid pending value. The specific key from the user's screenshot remains unconfirmed.

### A38 Make unresolved errors conspicuous

The user requested a more noticeable error message. The input editor now displays an **Action needed** panel with a red border, tinted background, exclamation icon and larger explanatory text. It stays with Save Edits in the sticky footer and reminds the practitioner that edits remain in the draft until saved. The existing `role="alert"` now uses atomic announcements so assistive technology receives the complete message. Attention comes from text, icon and contrast without flashing or animation.

The browser regression checks the alert and Save Edits remain fully in the viewport at both scroll extremes on a phone-sized screen, then corrects the invalid name and verifies persistence. Desktop and mobile screenshots were inspected. Whether practitioners notice and successfully act on the message remains an evaluation question.

Follow-up validation on October 5: build and 33 unit tests passed. Eighteen of 20 Chromium scenarios passed on the full run. Two required test maintenance: the input scenario still expected the obsolete generic error text, and the map scenario clicked a node obscured by a newly added node. The input expectation now checks the specific duplicate name; the map scenario moves the added node through the UI before testing connections. Both focused scenarios then passed, completing verification of all 20 scenarios across the full and focused runs. The three new pushpin scenarios passed in the full run. This is not a claim of an uninterrupted green full-suite run.

`tests/pushpin-save.browser.mjs` covers the reproduced unsaved-pair bug, existing-value edits, offline reopening, invalid values, close/Escape protection, explicit discard, record switching, pending shared fields, storage failure/retry, partial-write rollback, UUID persistence, stable IDs, deletion/discard/Undo and visible mobile Save Edits controls. Unit validation accepts the two ID strategies and preserves the older omitted-setting contract.

The existing input exercise now explicitly discards an edited draft when cancelling. Its assertions for synthetic/CSV/GeoPackage import, forms, typed values, N3 evidence, exclusions and offline behavior remain in the regression gate. `test-results/pin-save-delete-uuid.png` shows the revised editor.

Observe whether practitioners can identify when a change becomes persistent, distinguish deleting a source record from excluding it in an analysis, and explain Category versus a computed classification. These are questions for developmental evaluation, not established usability findings.

Validation on October 5, 2026: `npm run check` passed the build, all 33 unit tests and all 17 Chromium scenarios with no skips or retries. The browser portion took approximately 2.4 minutes. The original pending-pair regression failed before the fix and passed afterward. The revised editor screenshot was inspected; documentation links and whitespace checks passed. Firefox/WebKit and participant effectiveness were not evaluated.
