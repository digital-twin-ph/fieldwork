# Encrypted project packages

Date: October 6, 2026. Status: design and bounded prototype; not a security certification.

## A77 Package binaries separately from workflow serialization

Offer an explicit **Encrypted ZIP** export alongside the existing JSON export. Import accepts both. The prototype contains the workflow and all referenced PDFs as original bytes, with an encrypted manifest binding file paths, lengths and SHA-256 digests. JSON remains the internal workflow/manifest representation; binary assets no longer require Base64. Ordinary export and run-receipt JSON remain unencrypted and retain their existing behavior.

The archive profile is `fieldwork/encrypted-project/1`. Its entries are `manifest.json`, `workflow.json`, and opaque `assets/0000.bin` paths. Original PDF filenames, titles, citations and hashes appear only inside encrypted content. All entries use WinZip AES-256 AE-2, never ZipCrypto; the archive uses STORE (no compression) in this first bounded implementation. Public directory information still exposes generic entry names, counts, sizes and encryption metadata. Fixed archive entry timestamps avoid disclosing source-file modification times. This is encrypted entry content, not a fully encrypted ZIP directory.

The manifest has a workflow descriptor and PDF asset descriptors (`path`, `bytes`, `sha256`, `mediaType`). Import verifies the manifest, exact entry inventory, required encryption profile, lengths, digests, workflow validation and correspondence to every referenced PDF before persisting attachments or replacing the workflow. Duplicate/unexpected paths, partial packages, unsupported formats, wrong passwords and integrity failures are rejected. PDF writes use one IndexedDB transaction. Workflow persistence uses the existing rollback behavior; a failed workflow save can leave verified unreferenced PDF blobs, but must preserve the previous workflow.

### Bounded GeoTIFF extension (experiment 25)

Packages containing retained raster windows use `fieldwork/encrypted-project/2`; PDF-only packages retain version 1, and the reader accepts both. Version 2 adds `image/tiff` assets with the same encryption, digest and byte-limit checks. Saved project manifests inventory these assets too. Import checks the TIFF dimensions and georeferencing against the workflow descriptor, and all bytes are verified before storage. JSON bundles use an explicit media type and Base64; absent media type keeps the PDF compatibility behavior. Original national files and computed outputs are not packaged; clipping can be recomputed from the retained input. A downloaded clipped GeoTIFF is a separate derivative. The existing content-addressed IndexedDB store has the historical internal name `pdfs`, but now holds verified TIFF blobs as well. Combined PDF/raster bytes must remain under 10 MB, with 5 MB per asset.

## A78 Limit the encryption claim

Use the established zip.js implementation rather than implement a ZIP cipher. Its AES format is interoperable with readers supporting WinZip AES, but not every operating system ZIP utility supports it. The ZIP format's password-based derivation is fixed by the format; AES-256 does not make a weak password strong. Export requires at least 12 characters, asks for confirmation and recommends a long unique passphrase. This length floor is not a strength guarantee. There is no password recovery. Passwords are not saved or logged; fields clear when the dialog closes. JavaScript cannot guarantee erasure of all temporary strings or bytes from memory.

The export protects the downloaded archive's contents. Browser localStorage, IndexedDB, downloaded individual PDFs, existing JSON exports and runtime memory remain outside that protection. No claim of regulatory compliance, sender authentication or protection from a compromised device is made. Hashes bind assets inside the authenticated encrypted manifest; they are not digital signatures.

## Resource bounds and offline behavior

The first profile accepts at most 102 entries, a 1 MB manifest, a 5 MB workflow, 5 MB per PDF, 10 MB unique PDF bytes in total, and 20 MB archive size. Extraction uses a byte-counted sink and checks advertised and actual lengths. STORE-only import avoids decompression bombs in this profile. Export checks that it produces an importable package. Work is local; bundled dependencies are precached. The bounded prototype processes entries sequentially in memory, not as an unlimited streaming archive.

The UI previews the number and total bytes of included PDFs, distinguishes URL citations from downloaded content, and provides actionable inline errors. Import cancellation and incorrect passwords leave the current project untouched. NetCDF, arbitrary attachment ingestion, run-output packaging, key recovery, recipients/public-key encryption, whole-container encryption and large-file OPFS/worker streaming are future slices.

For future broader raster packages, extend the manifest with embedded/linked/missing availability, media type, CRS, source/license, byte length, content digest and PROV derivation links. Embed the actual study subset when available; do not imply that a URL alone supplies an offline asset. Reuse the ontology's asset and provenance model without treating encrypted-container metadata as scientific evidence. Keep presentation preferences out of the scientific workflow package.

## A79 Maintain a manifest throughout the project lifecycle

Every saved project now carries `manifest` with schema `fieldwork/project-manifest/1`, a revision, update timestamp and required inventory. Application edits refresh it before validation and persistence. It inventories node IDs/types, connections, embedded point record IDs, form/attribute field keys, drawn-geometry presence, reference IDs, unique required PDF hashes/sizes with their node references, and explicitly linked URLs. Other setting edits also advance the revision. Undo/redo restores the corresponding project snapshot and manifest; revisions are local snapshot markers, not a global immutable audit log. Panel resizing is a separate UI preference and does not change it.

The saved inventory declares what the project requires; it does not assert that a file still exists in browser storage. Export verifies the inventory and every required PDF's actual bytes. JSON bundles retain the manifest inside the workflow. ZIP `manifest.json` additionally includes that project manifest plus the package entry descriptors and workflow-content digest. Import checks the inventory against the workflow and the package manifest against the actual archive before accepting it. Local inventory comparison detects omissions and stale metadata; cryptographic content integrity comes from the ZIP entry authentication and content digests, not the revision counter.

Legacy workflows without a manifest remain readable and acquire one when saved/exported. Existing widget migrations validate a supplied manifest against its original workflow first, then refresh inventory for the normalized widget representation. Incomplete manifests are rejected rather than silently repaired at the import boundary. A deliberate compatibility tightening applies to reference-only JSON: required PDFs must already exist and verify locally, otherwise import is rejected and the user must supply a complete bundle. URL citations remain explicitly linked content and are not downloaded. Opening an existing local project can still expose missing files for repair; it cannot successfully export them as a complete package.

Built-in example dataset identifiers still depend on Fieldwork's bundled example assets; this profile is not a standalone archive of the application/runtime. Raster and other future asset types must register in both the persistent inventory and package validators before they can be claimed as included.

CSV/GeoPackage imports contribute the normalized point records stored in the workflow, not the original uploaded file bytes. Completeness means that the declared project inventory and supported required attachments are accounted for; it does not establish that every node is connected, that a workflow is runnable, or that its scientific assumptions are valid.

## Evaluation gates

Test no-PDF and PDF round trips, deduplication, Unicode passphrases, fresh-browser restoration offline, wrong-password retry and cancellation, confidentiality of workflow/source filenames, randomized ciphertext, tampering, unexpected/duplicate/unencrypted entries, manifest mismatch, resource limits, and existing JSON compatibility. Verify that failures never replace the current workflow. Browser tests are Chromium evidence only; cross-browser and independent security review remain separate gates.

Validation on October 6: the final full local `npm run check` passed strict TypeScript/build, all 66 unit tests and all 41 Chromium scenarios. Added tests cover the encrypted package and persistent inventory, byte-exact PDF restoration in a fresh offline browser, wrong-password retry, failed persistence, and rejection of incomplete reference-only JSON. The password/error dialog was inspected visually on a narrow viewport. zip.js is pinned to 2.23.0 and its BSD-3-Clause license is included in the build. No independent cryptographic audit, non-Fieldwork ZIP-reader interoperability test, Firefox/WebKit run or remote deployment is claimed.

## Sources

- [zip.js documentation](https://gildas-lormeau.github.io/zip.js/): browser integration, AE-2 support and untrusted archive handling.
- [Writer options](https://gildas-lormeau.github.io/zip.js/api/interfaces/ZipWriterConstructorOptions.html): AES strength, encryption and timestamp settings.
- [Entry extraction options](https://gildas-lormeau.github.io/zip.js/api/interfaces/EntryGetDataOptions.html): password and integrity-check controls.
