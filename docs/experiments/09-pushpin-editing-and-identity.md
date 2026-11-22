# Developmental evaluation: saving, deleting and identifying pushpins

_Created 2026-10-06 · Updated 2026-11-22_

**Status:** validated, 2026-11-22. Save Edits, Delete Pin and record IDs were built and checked on 2026-10-05 (A33 to
A38). A review of what pins can do on 2026-11-22 found twelve gaps, and the practitioner added photos and GPS exports;
all fourteen [open items](#open-items-2026-11-22) were built or tried in 0.166.0 and 0.167.0, or recorded as not built
with the reason. Checked by `tests/pushpin-field.browser.mjs` (ten cases), `tests/pin-photos.test.mjs`, and the pin
and input tests before them, in Chromium and WebKit. Not on a phone, with a real GPS fix, a real phone photo or a real
handheld's file.

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

## Open items (2026-11-22)

A review of the pin editor against what a person placing pins in the field needs, from the code and the manual. The
practitioner chose to take them in this order, the first three first.

| # | Gap | State |
| --- | --- | --- |
| 1 | No "use my location". `docs/usage.md` said pins came with automatic location and time; only the time was automatic, and a pin was placed by eye | built 2026-11-22 (0.166.0): **Add a pin at my location** and **Move this pin to my location**, one fix at the device's best accuracy; usage.md corrected |
| 2 | Where a position came from, and how accurate it is, is not recorded: a pin placed by eye and a GPS fix look the same | built 2026-11-22 (0.166.0): `positionSource` (device, map, typed), `positionAccuracyM` and `positionFixedAt`; a drag or a typed position clears the device's accuracy |
| 3 | A field cannot be required, and fields have no order or groups | required built 2026-11-22 (0.166.0), flagged rather than refused (below); field order built 2026-11-22 (0.167.0), Move up and Move down; groups not built (below) |
| 4 | Date only: no field for a date and a time of day | built 2026-11-22 (0.166.0): **Date and time**, kept as entered with no time zone, `xsd:dateTime` in N3 |
| 5 | No table of the pins in the editor: seeing them all needs a save and Data quality → Records | built 2026-11-22 (0.166.0): 25 a page, each row choosing its pin |
| 6 | Every pin looks the same: Category does not change the marker (A35 said so on purpose) | built 2026-11-22 (0.166.0): eight colours with white text above 6:1, the category's first letter on the marker, a legend with counts; supersedes A35's "does not change marker styling" |
| 7 | No way to find a place: no place-name search, no degrees-minutes-seconds entry (a CSV import reads them) | built 2026-11-22 (0.166.0): **Find a place** asks OpenStreetMap's Nominatim, only when Find is pressed, and says the words were sent there; a position can be typed in degrees, minutes and seconds, read as a CSV's are |
| 8 | The editor's basemap is OpenStreetMap only: no satellite imagery or building footprints | built 2026-11-22 (0.166.0): a **Basemap** choice of OpenStreetMap, OpenTopoMap, and CARTO and Esri styles on the person's own key, Esri's satellite imagery among them. Building footprints are not a basemap here; at high zoom OpenStreetMap draws buildings where they are mapped |
| 9 | Changing the input method to generate or import replaces the pins; whether it warns first is unchecked | built 2026-11-22 (0.166.0): changing to generate or import says how many records the draft holds and that Cancel keeps them |
| 10 | No undo inside the editor: the canvas's undo begins after Save Edits | built 2026-11-22 (0.166.0): **Undo** in the editor, the last 30 changes, off above 20,000 records |
| 11 | The editor is its own dialog, not the standard one: Save Edits, Update pin draft, Delete Pin; its map opens on Gaborone | built 2026-11-22 (0.166.0): the editor is the standard dialog (experiment 186), built once so its map and what is typed survive "Discard them?"; Cancel and Apply, the standard refusal message (which replaces A38's panel), and the map opens on the study areas or the world, not Gaborone |
| 12 | Unchecked: placing pins on a phone by touch, and what pins on households need to say about identifying people (stored unencrypted on the device until backed up encrypted) | tried 2026-11-22 (0.166.0) in a phone-sized browser with touch, not on a phone: a tap places a pin and Apply stays in reach. A line in the editor says pins on homes can identify people, and to back up encrypted and mask with Donut geomasking before sharing |
| 13 | Photos on a pin (the practitioner, 2026-11-22: *"Can pushpins also include photos?"*). Decided the same day: a photo's location offered to place a pin without one, then removed; photos on the device and in encrypted backups only, plain copies and shared projects carrying digest and caption; up to ten a pin, 2,048 px | built 2026-11-22 (0.166.0) |
| 14 | Exports from GPS devices (the practitioner, 2026-11-22). Decided: waypoints only, since Fieldwork has no line layer; tracks, routes and shapes counted and said | built 2026-11-22 (0.166.0): **Import GPX** and **Import KML or KMZ** |

## Validation record, 2026-11-22: open items 1 to 6

**Built (0.166.0).** `src/input-data-ui.ts` and `src/attribute-schema.ts`. `tests/pushpin-field.browser.mjs`, four cases:
a fix given to the browser at 12 m, saved with its source, accuracy and time, then its latitude typed again and the
accuracy gone; location refused, said, and a pin placed by eye instead; a required Date and time field, one pin's value
given and the save kept while others lack it; a Clinic marker in its colour with its letter, the legend's counts, and a
table row choosing its pin. With `pushpin-save`, `input-coverage` and `shared-inputs`: 15 passed in Chromium and 15 in
WebKit on the development Mac.

**Found while building.** WebKit under Playwright gives a fix's time in microseconds, which reads as the year 58,851;
a fix's time is now used only where it is within a day of the clock, and the time it arrived otherwise.

**Decided while building: a required value is flagged, not refused.** A pin lacking a required answer is named in the
summary and in the table, and Save Edits still saves. Refusing would lose pins recorded in the field over a missing
answer; the project's rule for data quality is to diagnose and never refuse. Whether a practitioner reads "required"
as "cannot be saved without" is a question for the field.

**What this does not establish.** Not tried on a phone, by touch, or with a real GPS fix: every test gave the browser a
position. The accuracy is the device's own estimate. A date and time carries no time zone, so two pins entered in
different zones do not compare.

## Validation record, 2026-11-22: open items 7 to 14

**Built (0.166.0).** `src/input-data-ui.ts`, `src/pin-photos.ts`, `src/gps-import.ts`, the editor on `src/config-dialog.ts`
(which gained `bodyOnce`), `rasterBasemap` in `src/catchment-map.ts`. `tests/pin-photos.test.mjs`: a GPS position read
from EXIF, south and east signed, none from a file without one or at 0, 0; photos read back as what they can be.
`tests/pushpin-field.browser.mjs`, nine cases in all: degrees, minutes and seconds typed; a place found (Nominatim
answered by the test); the standard dialog's heading, Undo, the import's replace note, Esri imagery without a key
saying so, the privacy line, Cancel asking first; a tap on a phone-sized screen; a 3,000 px photo with a GPS position
added to the record with no location, its position offered and taken, its caption saved, the kept copy 2,048 px with
no EXIF segment; a GPX of two waypoints and a track, and a KMZ of a point and a line.

**Found while building.** Re-encoding a photo was taken to drop its metadata, and in WebKit it did not: the encoder writes an
EXIF segment of its own. Every metadata segment (APP1 to APP15, and comments) is now removed from the encoded JPEG
before it is digested and kept, in every engine, and a test reads the kept bytes for one. The shared dialog rebuilt its whole body to ask "Discard them?", which would have removed the
pin map and anything typed but not yet added; `bodyOnce` asks without rebuilding. The map now sat below the dialog's
fold, so a test's click at 70% of the map landed on the footer; the tools were laid out two to a row.

**What this does not establish.** Not on a phone, not with a real GPS fix, a real phone photo (HEIC from an iPhone is
read only where the browser decodes it, which Safari does and Chrome does not), or a real handheld's GPX. Nominatim was
answered by the test, not asked. The line layer the tracks need is a gap of its own, in the TODO.

## Field order, and groups not built (2026-11-22)

The practitioner agreed, the same day: field order built, groups not. **Field order** (0.167.0): under Add a form field,
the form's fields listed in order, each with Move up and Move down; every pin's form follows, and Undo takes a move
back. `tests/pushpin-field.browser.mjs`: a field moved to the top, the pin's form and the saved order following, Undo;
Chromium and WebKit. **Groups** (headed sections, as field-collection tools have) are not built: a pin's form holds at
most 30 fields, and none here has grown long enough to need them. If one does, that is the reason to build them.

## What would close it

Each open item built and checked in a browser test, or recorded here as not built with the reason, and the manual's
account of placing pins true of what the editor does.

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

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-06 | Capture current Fieldwork development prototype and regression baseline |
| 2026-10-08 | Date every documentation file from git history, and check it in the gate |
| 2026-10-08 | Show the widget catalog in the application |
| 2026-11-22 | Pin review: twelve open items; status tried, with what would close it |
| 2026-11-22 | Open items 1, 2, 4, 5 and 6 built, and 3's required fields; 0.166.0 |
| 2026-11-22 | Items 7 to 14 built, the editor on the standard dialog; field order and groups left open |
| 2026-11-22 | Field order built (0.167.0), groups recorded as not needed; validated, closed |
