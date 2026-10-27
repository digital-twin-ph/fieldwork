# 70 · WebKit parity: what the second engine found

_Created 2026-10-10 · Updated 2026-10-14_

**Status:** three root causes found and fixed. The documented gate stays
Chromium; this records what running a second engine actually bought.

## Why this was worth doing

The suite had been Chromium-only, with WebKit standing at 42 passed and 37
failed and the failures unexamined. The assumption was that a second engine
would surface styling differences and timing flakiness — the sort of thing one
notes as a portability caveat and moves on from.

It surfaced a defect that made a shipped feature not work at all in Safari.
That is the finding: the second engine was not a portability nicety, it was the
only thing that would have told us.

## The progression

| Stage | Passed | Failed |
| --- | --- | --- |
| Starting point, Playwright 1.63.0 | 47 | 37 |
| After upgrading Playwright to 1.64.0 | 71 | 13 |
| After storing bytes instead of Blobs | 82 | 2 |
| After separating behaviour from request observation | 84 | 0 |

## Cause 1, in the harness: offline navigation

23 of the original 37 failures were one message, `page.reload: WebKit
encountered an internal error`. Isolated with four probes differing only in
whether the service worker had registered and whether the context was offline:

| Probe | Result |
| --- | --- |
| Reload online, no service worker wait | passes |
| Reload online, after "Available offline" | passes |
| Reload **offline**, after "Available offline" | internal error |
| Reload **offline**, no service worker wait | internal error |

So it was navigation under `context.setOffline(true)`, and the service worker was
irrelevant — which matters, because "the service worker does not work in WebKit"
was the obvious wrong conclusion and would have sent the work in the wrong
direction.

Four workarounds were measured before the real fix was found, and all four
failed: `goto` in place of `reload` (same internal error), and aborting every
route at page or context level (`Blocked by Web Inspector`, because the document
navigation is itself a route). Upgrading Playwright from 1.63.0 to 1.64.0 fixed
it outright and recovered 24 tests.

**Lesson:** the dependency was a suspect and was not checked first. One version
bump was worth more than every workaround attempted before it.

## Cause 2, in Fieldwork: WebKit cannot put a Blob in IndexedDB

The remaining 13 fell into three clusters — evidence (4), encrypted package (3),
raster (4) — which all store binary through `storePDFs`. Measured, per engine:

| Value put into an object store | WebKit |
| --- | --- |
| `Uint8Array` | stored ok |
| `ArrayBuffer` | stored ok |
| `Blob`, type `application/pdf` | **ABORT: UnknownError: Error preparing Blob/File data to be stored in object store** |
| `Blob`, no type | same abort |
| `Blob`, type `image/tiff` | same abort |
| `File` | same abort |

`storePDFs` wrapped every value in a Blob. So in Safari **no attached PDF and no
retained raster window could ever be stored**, and this had nothing to do with
tests: the feature did not work for Safari users. Fixed by storing the bytes.
`readPDF` now returns bytes and still accepts a Blob, because a database written
by the previous version is on the device of everyone who used it and their
attachments have to keep opening.

### The error that hid it for as long as it did

```js
tx.onabort=()=>reject(new Error('PDF could not be saved locally. Storage may be full; …'));
tx.onerror=()=>{};
```

The abort handler **asserted a cause** — a full disk — and the error handler
discarded `tx.error`, the one object that said what actually happened. The
browser refusing the value outright looked like a quota problem. Two further
things compounded it: the message went to `#evidence-error` while the test
asserted on `#evidence-status`, so the visible symptom was a status that never
changed rather than an error anyone would read; and no console output appeared at
all, so the failure looked like a dead click. Time was spent on form association
and hit-testing, both of which measured fine, before the real message was found.

The handler now reports `tx.error` and names no cause it has not observed.

**Lesson, and it is the generalisable one:** an error message that guesses at a
cause is worse than one that admits ignorance, because it is believed. This is
the same discipline the receipts already follow — state what was observed — and
it had not been applied to the failure paths.

## Cause 3, in the harness again: a service worker hides requests from the test

The last two failures were in catchments, and the app turned out to be correct in
both engines. The tests were not.

Both simulate a network condition by intercepting a route — aborting basemap
tiles, or replacing an Overpass response with a fixture. Measured per engine,
with the interactive map open:

| | Routes intercepted | Tile images |
| --- | --- | --- |
| WebKit | **0** | 15, all **loaded** |
| Chromium | 15 | 15, all **broken** |

The tiles loaded for real in WebKit: the abort never applied. The cause is that a
page controlled by a service worker has its loads routed through the worker
thread, where Playwright cannot see them. Confirmed directly, with a fetch to the
same origin the test mocks:

| | Routes hit | What the page received |
| --- | --- | --- |
| WebKit, worker controlling | 0 | the real network |
| WebKit, worker **blocked** | 1 | the fixture |
| Chromium, either way | 1 | the fixture |

Note that Fieldwork's worker already declines cross-origin requests — it checks
`origin !== self.location.origin` and does not call `respondWith` — so this is
not the application routing tiles through its cache. Merely being controlled is
enough.

Two different fixes, because the two tests want different things:

- **A behavioural claim** — the app reports an unavailable basemap and keeps its
  local layers — is asserted in every engine, using `setOffline`, which was
  measured to reach tile loads in both. This is the better test anyway: it
  exercises the real condition rather than a simulation of it.
- **An observational claim** — which provider URL was requested — cannot be made
  where the request is invisible. The counter assertions are now guarded to the
  engine that can see them, with the reason recorded at the assertion. The
  alternative was asserting `tiles === 0` in WebKit, which passes vacuously:
  a counter that cannot increment agrees with every expectation.
- **The Overpass test**, which substitutes a fixture and cannot work without
  interception, opts out of the service worker with Playwright's
  `serviceWorkers: 'block'`. It exercises no offline behaviour, so there is
  nothing to lose, and it now runs in both engines instead of being skipped in
  one and counted as covered.

**Lesson:** a test that simulates a failure can itself fail to simulate it, and
then it reports the opposite of the truth. The WebKit run was not showing a
broken application; it was showing two tests whose method did not work there,
while one of them would have gone on passing in Chromium forever.

## Consequence for the Tauri question

Tauri on macOS runs WKWebView. Had Fieldwork been packaged as a desktop
application before this, every attached PDF and every retained raster would have
failed there, and the Chromium-only gate would have reported everything as
green. Any desktop packaging decision should follow a WebKit gate, not precede
it.

**The gate now runs WebKit, from 2026-10-13.** Asked whether the application could
be compiled to Tauri, the answer was that this experiment had already set the
precondition and it was not met: `playwright.config.mjs` defaulted to Chromium and
the Pages workflow installed Chromium alone, so the WebKit suite ran only on a
developer's machine by hand.

Measured before changing anything, which is the order this experiment exists to
teach: **all 102 browser checks pass under WebKit, unmodified.** So the gate starts
from parity rather than from a list of exemptions, and the default in
`playwright.config.mjs` is now `chromium,webkit` with the workflow installing both.
Firefox stays opt-in.

What this costs is roughly nine minutes of browser checks instead of four. What it
buys is that the precondition above is now a fact rather than an intention, and a
WebKit regression fails a pull request rather than waiting for somebody to think of
running it.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Store file bytes rather than Blobs, so attachments work in Safari at all |
| 2026-10-13 | Put WebKit in the gate |
