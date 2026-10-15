# Encrypted local credential files

_Created 2026-10-07 · Updated 2026-10-15_

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

## Finding, 2026-10-09: exercising the dialog

The first use of the Credentials dialog with a real key — a healthsites.io API key, the consumer
this record anticipated — found no logic defect and a dialog organised around the wrong thing.
Encryption, the generation counter, the origin field, the idle lock and the metadata-only listing
all behave as specified. What the owner met instead was a workflow they could not follow, which
is the kind of result only use produces.

**The practitioner's model, in their words.** Creating: enter the credential, save it encrypted
under a passphrase, activate it. Loading: choose the file, enter the passphrase, activate it.
Three steps each.

**What the dialog presents.** Creating takes four steps and loading two, in an order that matches
neither:

| | Creating | Loading |
| --- | --- | --- |
| 1 | **Create empty collection** — required first, because `#credential-edit` is disabled until `session.unlocked` | Choose File |
| 2 | Fill the fields, **Save to session** — this *is* activation | Enter the passphrase |
| 3 | Enter the passphrase and confirm, at the **top** of the dialog | **Unlock selected file** — this *is* activation |
| 4 | **Download encrypted credentials** | — |

Five causes, separable:

1. **The required first action is disguised as a file operation.** "Create empty collection" sits
   beside "Unlock selected file" under a heading reading *Encrypted credential file*, so it reads
   as something to do with files rather than as the place to begin.
   *Corrected on review of the owner's screenshot:* the status read "0 credentials unlocked",
   which only occurs when `session.unlocked` is true, so the collection **had** been created and
   the owner was not stuck before that step. The discoverability concern stands as a reading of
   the layout; it was not what went wrong here.
2. **There is no activation step, because activation is implicit.** `session.replace(...)` makes a
   credential live the moment it is saved or a file unlocks. The owner expected a third action and
   found none, so nothing confirmed that anything had happened.
3. **One passphrase field does two jobs.** `perform('unlock')` reads `#credential-password` to
   decrypt; `perform('download')` reads the same field to encrypt. It is labelled *File passphrase*
   and placed in the file section, far from the download button it also serves.
4. **The status line reports a count, not a next step.** "0 credentials unlocked in this tab" is
   accurate before a collection exists and reads as failure.
5. **The reference rule is enforced only on save.** `healthsites.` fails
   `/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/` on the trailing dot, with no inline signal while typing.

### Fixed here

**Confirmation is now requested only when creating a file.** The confirm field and its explanation
are hidden unless a collection exists to download. Confirmation guards against a typo that would
make a *new* file permanently unopenable; unlocking an existing file needs none, because a wrong
passphrase simply fails and can be retried. Asking for it on the unlock path invited the reader to
believe both fields were required to open a file.

### Fixed here, 2026-10-09

**Confirmation is requested only when creating a file.** The confirm field and its explanation are
hidden unless a collection exists to download. Confirmation guards a typo that would make a *new*
file permanently unopenable; unlocking an existing file needs none, because a wrong passphrase
fails and can be retried.

**The buttons are named for the actions they perform**, which supplies the activation step the
owner's model expects by naming what the code already does on `session.replace(...)`:

| Was | Now |
| --- | --- |
| Create empty collection | **Start a new collection** |
| Unlock selected file | **Unlock and activate** |
| Save to session | **Add and activate** |

**The status line directs rather than counts**, in three states: locked, empty-and-active, and
*n* active with whether a download is outstanding. A browser assertion on the old wording was
rewritten to assert the state rather than the phrasing — an empty collection is still active and
the deleted entry is gone from the list — which is the more durable check.

Validated: 181 unit tests, 79 Chromium scenarios with 1 skipped, and the three credentials browser
scenarios.

### Two copies of a secret that escape this record's boundary

Both found by use, and neither is covered by the file model this record specifies.

- **The browser offers to save the API key in its own password store.** The field is
  `type="password" autocomplete="off"`, which is the right intent, but Safari and Chrome stopped
  honouring `autocomplete="off"` on password inputs. The result is a copy in the browser's vault,
  possibly synced to an account, outside the passphrase and unaffected by "Lock and discard
  session". Mitigations — `new-password`, a masked text field, readonly-until-focus — are all
  fragile across browsers, and the honest first move may be to state the limit and tell the reader
  to decline.
- **A download URL would carry the key in the clear.** healthsites.io sends no
  `access-control-allow-origin`, so the application cannot `fetch()` it and a proxy is excluded by
  [experiment 32](32-john-snow-primitives.md)'s precedent. The only workable shape is the one
  [experiment 39](39-stac-discovery-and-remote-acquisition.md) settled — discovery emits a request,
  never bytes — with the browser performing a user-initiated download. That places the key in a
  query string, and therefore in browser history, the download manager's record and the server's
  logs. It is inherent rather than a defect, because the alternative needs a header and a header
  needs CORS. The **Allowed HTTPS origin** field is the control that matters: an adapter must
  refuse to place a secret into a URL whose origin does not match.

This record's threat section says encryption protects a locked file rather than an unlocked
application. These two are adjacent and distinct: copies the *platform* makes, which the file model
never governed and should now name.

### The deferred adapter: what resolution buys, and what it does not

This record defers "assigning credentials to a working Healthsites node" until the adapter exists.
Inspecting the interface on 2026-10-09 against that consumer finds it well shaped and
**unreachable**, and finds that what it can offer in this case is narrower than the deferral
implies.

`CredentialSession.resolve(ref, provider, origin)` matches on all three and throws *"Matching
credentials are unavailable."* otherwise, so the origin is enforced rather than advisory. Around
it, `list()` strips `secret` and returns metadata only, and both `resolve()` and `snapshot()` call
`expire()` first, so an idle-locked session fails closed. That is the right surface for a widget.

**It is constructed inside `credentials-ui.ts` and never exported**, so nothing else in the
application can call it. The interface exists and has no caller; exporting the session is the
first thing any adapter needs.

A widget consuming it would be bound by four rules, three of which are constraints:

1. **Store a reference, never a secret.** Params hold `credentialRef` and `provider`; the value is
   resolved at run time. A persisted secret would reach saved workflows, exported packages and
   Undo snapshots, which this record excludes by design.
2. **Declare the origin in the widget, not in a parameter.** A configurable origin would hand the
   practitioner a way to send the key elsewhere.
3. **Refuse when locked, as a valid draft.** With a fifteen-minute idle lock plus `visibilitychange`
   and `pagehide`, an open workflow will meet this routinely, so the refusal must read as ordinary
   rather than as breakage — the division [experiment 48](48-tabular-input.md) settled.
4. **Record the reference in the receipt, never the value**, so a run is traceable to the credential
   that produced it. The metadata/secret split in `list()` exists to make exactly this possible.

**What resolution buys here is non-persistence and origin enforcement, not confidentiality at the
point of use.** Because healthsites.io sends no `access-control-allow-origin`, the workable shape
is discovery — the widget builds a URL and the practitioner's browser downloads it — so the secret
must reach the DOM inside an href, and from there browser history, the download manager and the
server's logs. That is weaker than the fetch case this record presumably imagined, where a secret
would travel in a header and never be rendered. The difference is a consequence of the remote
service, not of the design, and it belongs in the adapter's own stated limits rather than being
discovered by its first user.

### Still open

Renaming the buttons to the actions they perform — *Start a new collection*, *Add and activate*,
*Unlock and activate* — would supply the activation step the owner's model expects by naming what
already happens, and is the smallest change with the largest effect. Beyond that: separate the two
passphrases or relabel the shared one, make the status line directive, validate the reference as it
is typed, and surface the fifteen-minute idle lock, which with `visibilitychange` and `pagehide`
can discard a session while the reader is looking something up.

## Implementation and validation record

Implemented in `src/credentials.ts` and `src/credentials-ui.ts`, launched by the project toolbar's Credentials button. The file extension is Git-ignored and absent from the generated offline asset manifest. The runtime uses native Web Crypto without a new dependency. Credential resolution is a provider/origin-bound interface for future adapters; it is not an implemented Healthsites request path.

On 2026-10-07, strict TypeScript/build, all 80 unit tests and all 50 Chromium scenarios passed, with the real Botswana WorldPop exercise enabled. A subsequent three-case credential browser run passed with direct localStorage/sessionStorage/IndexedDB and workflow-export isolation checks. Unit tests cover file authentication, randomized ciphertext, bounds, schema validation, provider/origin binding, deadline expiry and pending-unlock cancellation. Browser tests cover creation, encrypted download, wrong-password retry, offline reload/unlock, deletion, manual/idle lock and closing during unlock. The dialog screenshot was inspected. No real credentials were used. Firefox/WebKit testing, independent security review and a live authenticated provider integration remain outstanding. Changes are local; no publication is implied by this record.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-07 | Add catchment workflows, semantic evidence, and browser Pages release |
| 2026-10-08 | Date every documentation file from git history, and check it in the gate |
| 2026-10-08 | Show the widget catalog in the application |
| 2026-10-10 | Treat the project as developmental evaluation, and move the audits into docs/audits |
