# 69 · Healthsites facilities: one widget for discovery and acquisition

_Created 2026-10-10 · Updated 2026-10-14_

**Status:** **excluded 2026-10-09.** Built, measured, and then removed in favour of
[71](71-health-facility-sources.md), which uses sources a browser can actually
read. Kept as the historical record, because the measurements are the durable
part and the reasoning explains why the replacement looks the way it does. The
node type `healthsites_discovery` no longer exists; a saved workflow holding one
is migrated by `migrateHealthsitesNodes`.

**Why it was excluded.** Everything below was true and the widget worked, but it
could only ever work by asking the practitioner to download a file themselves and
hand it back — because healthsites.io sends no cross-origin header and the
response is unreadable to the page. Two other sources were then measured and both
answer with `access-control-allow-origin: *`: Overpass, and the Humanitarian
OpenStreetMap Team country export on HDX. Both are OpenStreetMap-derived, as
healthsites.io itself is, both are ODbL, and neither needs an account. A source
that works end to end beats a curated source that cannot be fetched, so the
hand-back went and the API key with it.

**What survived into the replacement.** The licence treatment, nearly whole: ODbL
is share-alike, so the licence travels in the ontology as a resolvable IRI
attached to the data rather than only to the request, the attribution travels
with it, and the links are shown in the interface before anything is downloaded.
The record-dropping discipline survived too — unplaceable, unnamed and
unrequested records are dropped and counted by reason — and the shared parser in
`src/facility-records.ts` still reads the healthsites API shape, because the
three source shapes differ in spelling rather than content.

**What did not survive, and should not have.** The `useArea` flag, which made the
study area optional and required a conditional exemption in the execution plan.
The replacement always requires an area: the question is "which facilities are in
my study area", and there is no form of it that is well posed without one.

## Question

Can a widget both *discover* a healthsites.io extract and *acquire* it, so a
practitioner configures filters once, accepts the licence once, and ends up with
a point layer on the canvas — rather than configuring a request in Fieldwork,
downloading in a second place, and importing in a third?

## What the licence requires

healthsites.io publishes OpenStreetMap-derived facility data under the **Open
Database License 1.0** (ODbL), with the usual OSM attribution. Confirmed with
the data owner's published terms and recorded here as part of the experiment, at
the user's instruction, because an obligation that lives only in a conversation
is an obligation the software does not carry.

ODbL is share-alike. That has two consequences Fieldwork must honour rather than
mention: the licence and its links are presented at the moment of download and
acceptance is the act that starts it, and the licence travels in the ontology
representation of the node, so a workflow that used this data says so in its
facts and not only in its interface.

- ODbL 1.0 — https://opendatacommons.org/licenses/odbl/1-0/
- OSM copyright and attribution — https://www.openstreetmap.org/copyright

## Measurement: the application cannot fetch this data at all

Measured 2026-10-09 against `https://healthsites.io/api/v3/facilities/`, from
Chromium, from a page origin, with a valid API key.

| Probe | Result |
| --- | --- |
| `OPTIONS` preflight, `Origin` set | HTTP 403, **zero** `Access-Control-*` response headers |
| `GET`, `Origin` set | HTTP 403, **zero** `Access-Control-*` response headers |
| `fetch(url)` in Chromium, valid key | `TypeError: Failed to fetch` |
| `fetch(url, {mode:'no-cors'})` | resolves — `status: 0`, `type: "opaque"`, body reads **0 characters** |

Repeated from three origins, including the project's own deployment origin, to
test whether `localhost` was the cause. It is not: `https://digital-twin-ph.github.io`,
`https://example.org` and `null` all receive the same headers, and `Vary` lists
`Accept, Accept-Language, Cookie` without `Origin`. A service that allowed some
origins would have to vary on `Origin`, or a shared cache would hand one site's
allow-header to another. Its absence says the response does not depend on the
origin at all, so there is no allowlist that a development origin is merely
missing from. Deploying changes nothing.

The browser's console message:

```
Access to fetch at 'https://healthsites.io/api/v3/facilities/?country=…&api-key=…'
from origin 'http://localhost:8411' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The 403 is an authentication detail and does not affect the verdict: the header
is absent on every response regardless of the key, and the browser enforces its
absence before application code sees a status at all.

The fourth row is the decisive one, and it is the row that is easy to get wrong.
`no-cors` does not fail. It returns a response object, which reads as success to
code that only checks for a thrown error. The body is opaque and yields zero
bytes. So the application can *send* this request and cannot *see* the answer.

**Therefore writing the download into application storage — OPFS, IndexedDB or
anything else — is not possible.** Storing bytes requires reading bytes, and
reading is exactly what is forbidden. This was asked for directly and cannot be
built; recording why is more useful than recording that it was declined.

## Measurement: a service worker is not a way round it

Asked directly: can the application hold a proxy inside the browser? A service
worker is the only thing in a browser that resembles a server — it sits between
the page and the network and answers requests — so it is the candidate worth
measuring rather than dismissing. Measured 2026-10-09, in Chromium, from a
service worker on its own origin, with a valid key.

| What the service worker tried | Result |
| --- | --- |
| `fetch(url)`, normal CORS mode | `TypeError: Failed to fetch` |
| `fetch(url, {mode:'no-cors'})` | `type: "opaque"`, text 0 characters, 0 bytes |
| opaque response → `cache.put` → `cache.match` → read | still `type: "opaque"`, text 0 characters, 0 bytes |

The third row is the one worth having. "Cache the opaque response, then read it
back out of the Cache API" is the plausible loophole, and it is closed: opacity
survives the round trip.

The reason is structural and not an unfilled gap. A proxy defeats CORS because
it runs under a *different origin*, where the browser's rules do not apply: it
fetches server-to-server and serves the bytes from an origin the page trusts.
Anything inside the browser is under an origin the rules do apply to. The
sandbox cannot be escaped from inside the sandbox.

What would read these bytes, recorded so the question is not reopened from
memory: a browser extension holding `host_permissions` for the origin, which is
exempt from CORS by design but is a separately installed artifact with a much
broader grant; a desktop shell such as Tauri or Electron, where the fetch is
native; or a server the project operates, which experiment 32 excluded and which
would put the practitioner's API key through infrastructure somebody must run.
None of these is a proxy in the browser application.

## Measurement: a local helper application does work, behind a permission

Asked next: can the browser application talk to a Tauri app? Measured 2026-10-09
in Chromium, from a page on the project's own deployment origin
`https://digital-twin-ph.github.io` served locally so the probe is the
deployment case and not the localhost case, against a loopback HTTP server
standing in for what Tauri would host.

| Condition | Result |
| --- | --- |
| Helper sends `Access-Control-Allow-Origin: <the page origin>` and `Access-Control-Allow-Private-Network: true` | Blocked: `Permission was denied for this request to access the 'loopback' address space` |
| The same, with the Local Network Access permission granted | **200, `type: "cors"`, body readable** |

This works, and it is the one architecture measured here that would make an OPFS
version buildable: the helper fetches healthsites.io in native code, where CORS
does not exist, and serves the result from loopback with the page's own origin in
the allow header. The page then reads ordinary readable JSON.

Four findings, recorded because each is a design obligation and not a detail:

- **The headers are no longer sufficient.** Current Chromium requires a user
  permission in addition to them. The page must handle the prompt and the denial,
  and a denial is not distinguishable from the helper not running unless the page
  probes deliberately.
- **Mixed content is not an obstacle.** An `https` page reached `http://127.0.0.1`
  with no mixed-content error, because loopback is a potentially trustworthy
  origin. This was the expected objection and it did not appear.
- **The helper is a security surface, not only a capability.** Any site the
  practitioner visits can also try to reach the loopback port. The allow header
  must name the exact origin and never `*`, and the helper should require a token
  the page obtains out of band. Otherwise the result is an open proxy on the
  practitioner's machine that will forward their API key to whoever asks.
- **It pays off only as an optional upgrade.** If a desktop application is
  installed anyway, the direct design does the work there. The split shape earns
  its complexity only when the browser application remains the primary interface
  and the helper merely improves it when present.

Not planned, and it changes nothing about what is built: the hand-back works with
nothing installed. Recorded so that the question is not reopened from memory, and
because it is a genuine upgrade path rather than the dead end the proxy question
turned out to be.

## It was never discovery either

Added 2026-10-10, prompted by a practitioner's question: how do you know you
discovered something when you never see the thing you are discovering?

The node was called `healthsites_discovery` and **made no network call at all**.
It built a URL from the country or extent, checked that a named credential
existed, and returned that URL as a result. It could not fail. A misspelled
country produced an equally confident request, and so would a service that had
been switched off a year earlier.

Set beside what the other sources return before any data moves:

| Source | Learned before transferring anything |
| --- | --- |
| Zenodo | the member's name, that it is 71.7 MB deflated inside a 9.24 GB archive, and how it is compressed |
| Overture | that 3 row groups of 4,864 cover the study area, holding 55,649 of 81,455,423 rows |
| HDX | four files with their sizes, the licence `cc-by-4.0`, the version `20210809` |

Each of those can disagree with what was expected, so each can be checked. The
healthsites node could only agree with itself.

So discovery is **learning enough about data to decide whether to fetch it**, and
the test is whether it can fail. By that test the node was not discovery and not
acquisition: it was a constructed address with a licence notice attached. The
name claimed a stage it never reached, which is the same defect the naming
convention exists to catch, arrived at from a different direction.

This is recorded as a finding, not a new rule. It has fired once, here,
retrospectively.

## Consequence for the design

The node is one node, and acquisition happens in the one place that is allowed
to read the response: the practitioner's own browser, acting as itself rather
than as the page.

1. The node carries the filters — country or study area, facility kinds — and
   the reference to a credential held by the credentials manager. It resolves a
   download location and checks the credential is available. It never embeds the
   key in a result.
2. **Apply** opens the licence dialog, which states the ODbL obligations and
   links them. Accepting is the act that starts the download; declining ends it.
   The key is resolved at that click, from the live session, and is never
   stored, returned or logged.
3. The downloaded file is handed back to the node through the same dialog. The
   node parses it to a point layer, records the file's SHA-256, the record counts
   kept and the counts dropped, and emits `points`.

Step 3 is what makes this one widget rather than two, and it closes a limitation
the earlier request-only version stated about itself: that nothing recorded what
was downloaded or verified that a later import was the file the request
described. The digest is now in the receipt.

Records are dropped, and counted by reason, when they carry no name, no
coordinates, or a kind that was not requested. A facility with no location is
not a facility this can place. No centroid is guessed and no kind inferred.

## Open

- Whether the hand-back belongs in the dialog or as a separate step on the node.
- A proxy is not in scope and, per the measurement above, cannot be placed
  inside the browser. A server would make the fetch readable and the OPFS
  version buildable, at the cost of infrastructure the project does not have and
  of routing a practitioner's key through it. Noted, not planned.
- This is why the claim is that Fieldwork works offline *given the right
  conditions*, not that it is a wholly offline application.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add three widgets, and get facility data from sources a browser can reach |
| 2026-10-10 | Define discovery by what it learns, not by what it withholds |
