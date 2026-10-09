# Encrypted local credential files

_Created 2026-10-07 · Updated 2026-10-08_

Date: 2026-10-07. Design and bounded implementation specification.

## Contract

Credentials belong in a separately downloaded encrypted file on the user's computer. Fieldwork loads that file through a file picker and unlocks it for this tab only. No credential values, passphrases, file handles or encrypted vault copies are persisted in localStorage, IndexedDB, workflow JSON, N3, receipts, project bundles or the service-worker cache. This does not scan or import the developer's `.secrets` directory.

The Credentials dialog supports creating a collection, adding or replacing named API keys, deleting entries, downloading an encrypted file, loading a file, and locking. Closing the dialog clears form fields but keeps the unlocked collection in session memory. Manual lock, page departure/reload and 15 minutes of inactivity discard the collection and any drafts. Downloads create a new file; they do not silently overwrite the original. Unsaved session edits are explicitly identified. Locking does not revoke credentials at their providers.

Each entry has a stable reference, provider identifier, label, HTTPS origin and secret value. References use short ASCII identifiers and are unique within the collection. The UI lists metadata only, never existing secret values. Replacement requires entering a new value. Future input adapters can resolve a reference only for the expected provider and exact HTTPS origin; a project cannot choose an arbitrary destination for a stored key. Imported projects never trigger an authenticated request automatically.

The first slice implements file and session management plus the adapter resolution interface. Healthsites querying and assigning credentials to a working Healthsites node follow when that adapter is implemented. Existing local input nodes do not pretend to consume a credential. Future workflow configuration stores only `{provider, credentialRef}`; vault absence does not make a project package incomplete, but authenticated acquisition must report credentials unavailable.

## File profile

Extension `.fwcredentials`; schema `fieldwork/credentials/1`. A bounded JSON envelope carries schema, fixed KDF identifier/work factor, base64 salt, IV and authenticated ciphertext. The encrypted payload contains all credential metadata and values. Only format, cryptographic parameters and approximate size are public.

Use native Web Crypto PBKDF2-HMAC-SHA-256, 600,000 iterations, a fresh random 16-byte salt and AES-256-GCM with a fresh 12-byte IV and 128-bit authentication tag on every download. Authenticate the versioned profile as additional data. Import accepts only this fixed profile, avoiding attacker-selected KDF costs. Derive a non-extractable encryption key from the entered passphrase; do not save that key or passphrase. Require 12–1,024 characters for creation and recommend a long unique passphrase. There is no recovery mechanism. Limit the file to 512 KB, 50 entries and 4,096 characters per secret. Validate the complete decrypted payload before replacing a session. A wrong password, corrupted file or unsupported profile leaves the existing session unchanged.

This uses Web Crypto primitives, not a handwritten cipher. The chosen KDF is a browser-native portability tradeoff; OWASP generally prefers memory-hard password hashing, and its PBKDF2 SHA-256 guidance provides the 600,000-iteration reference point. This is not a claim of FIPS certification or independent cryptographic review. Sources: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Web Crypto encryption](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt).

## Lifetime and threat boundary

Keep the collection outside the workflow state and Undo/Redo snapshots. A generation counter invalidates asynchronous unlock/download operations after lock or dialog closure, preventing late completion from restoring credentials. Check inactivity deadlines on access and visibility changes as well as timers, because background tabs may throttle timers. Activity after expiration cannot revive an expired session.

Encryption protects a locked file, not an unlocked application from malicious same-origin code, extensions or a compromised device. JavaScript cannot guarantee erasure of strings, garbage-collected copies or OS swap. Lock drops references and clears editable DOM fields; it cannot recall a credential already used by an in-flight request. Protect future requests with strict destination binding and secret-redacted errors; do not cache authenticated request URLs. See [OWASP browser storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#storage-apis).

## Evaluation

Test randomized authenticated round trips, Unicode, wrong passwords, tampering, unsupported profiles, oversized input, duplicate references, provider/origin mismatch, manual and idle lock, and lock during asynchronous unlock. Browser tests must exercise create/download/lock/reload/unlock/update/delete, clear forms on close, offline operation and absence of test secrets in persistent browser storage and workflow exports. Use synthetic credentials only. Record Chromium evidence separately from cross-browser validation and independent security review.

## Implementation and validation record

Implemented in `src/credentials.ts` and `src/credentials-ui.ts`, launched by the project toolbar's Credentials button. The file extension is Git-ignored and absent from the generated offline asset manifest. The runtime uses native Web Crypto without a new dependency. Credential resolution is a provider/origin-bound interface for future adapters; it is not an implemented Healthsites request path.

On 2026-10-07, strict TypeScript/build, all 80 unit tests and all 50 Chromium scenarios passed, with the real Botswana WorldPop exercise enabled. A subsequent three-case credential browser run passed with direct localStorage/sessionStorage/IndexedDB and workflow-export isolation checks. Unit tests cover file authentication, randomized ciphertext, bounds, schema validation, provider/origin binding, deadline expiry and pending-unlock cancellation. Browser tests cover creation, encrypted download, wrong-password retry, offline reload/unlock, deletion, manual/idle lock and closing during unlock. The dialog screenshot was inspected. No real credentials were used. Firefox/WebKit testing, independent security review and a live authenticated provider integration remain outstanding. Changes are local; no publication is implied by this record.
