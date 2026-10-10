# 91 · Integrating a STAC browser, given what CORS actually allows

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** research note. No code, and nothing proposed for the palette yet.
Asked for after [jltobias/JupyterLite-STAC-Browser](https://github.com/jltobias/JupyterLite-STAC-Browser)
was added to [prior art](../research/prior-art.md).

## Why this is not experiment 39 again

[39](39-stac-discovery-and-remote-acquisition.md) dispositioned
[radiantearth/stac-browser](https://github.com/radiantearth/stac-browser) — a
Vue 3 single-page application — and rejected embedding it, planning instead a
hand-rolled bounded client in `src/stac.ts` and a `stac_discovery` node.

**None of that was built.** There is no `src/stac.ts`, no `stac_discovery` in
`TYPES`, and nothing in the registry. What exists is `ontology/stac.ttl`
describing a STAC acquisition and `ontology/rules/processing-routing.n3` routing
one to a reader, exercised by `tests/stac-routing.browser.mjs` through the EYE
reasoner. **Fieldwork can reason about a STAC acquisition it has no way to
make.**

So this note asks a narrower question about a different artifact: what would it
take, and does it clear the gates 39 set?

## The distinction that decides everything

The browser's architecture states its own boundary: *"Dataset assets are links
and are never fetched automatically."*

That is why it works where 39's acquisition did not. Discovery and acquisition
cross the network for different things, and only one of them is blocked:

| Step | What crosses the network | CORS position |
| --- | --- | --- |
| Public catalog directory | metadata JSON from STAC Index | Its own live refresh uses browser `fetch`, so permissive — **inferred from its design, not measured here** |
| Catalog root, collections, item search | metadata JSON | Copernicus measured at `access-control-allow-origin: *`, 427 collections, 2026-10-07 ([39](39-stac-discovery-and-remote-acquisition.md)) |
| Item footprints drawn on a map | metadata only | same request, same answer |
| **Asset bytes** | the data itself | **the gate.** WorldPop: no `Access-Control-Allow-Origin`, and `Range` advertised but ignored. Copernicus: `401` to an anonymous ranged request *while* sending `access-control-allow-origin: *` — CORS satisfied, authentication blocking |

**Integrating a browser would give Fieldwork discovery and leave acquisition
exactly where 39 found it.** A practitioner could search a catalog, see
footprints over their study area, choose an item — and not be able to download
it. That is the central risk of this work, and it is a design requirement rather
than something to find out afterwards.

## What this project has since learned about CORS

Measured in [69](69-healthsites-acquisition.md), [71](71-health-facility-sources.md)
and [47](47-sea-level-pack.md):

| Attempt | Result |
| --- | --- |
| healthsites.io API | No `Access-Control-Allow-Origin` on the `GET` or the preflight. Excluded, with a historical note |
| Zenodo record files ([47](47-sea-level-pack.md)) | `access-control-allow-origin: *`. A 71.7 MB deflated member reached by `Range` inside a 9.24 GB archive |
| Overture on a CDN | `Range` honoured: 3 of 4,864 row groups, 55,649 of 81.5 M rows |
| A localhost helper sending permissive headers | Refused by Private Network Access: *"Permission was denied for this request to access the 'loopback' address space"* |

The conclusion was that **there is no client-side bypass.** A proxy is a server,
and this project does not have one; a Tauri shell would solve it by no longer
being a browser. The STAC browser's own troubleshooting reaches the same
sentence independently — *"There is no client-side bypass"* — which is
corroboration rather than two documents agreeing by assumption.

## What Fieldwork would take, and what it would not

| Part | Disposition | Reason |
| --- | --- | --- |
| The idea of a **catalog directory snapshot** recording its source, API and retrieval date | **Adopt the idea** | Every acquisition source here is pinned by name and digest; a dated snapshot is the same discipline |
| The **search serialisation contract**: exactly one of `bbox`, `intersects` or neither, POST preferred for polygons, **no silent spatial fallback** | **Adopt** | This is the project's recurring rule in another domain: an operation that changes the answer must be visible, not a fallback |
| **Bounded limits** — 20 s timeout, 1–100 items a page, 500 items, 1,000 collections | **Adopt, re-tuned** | `network_input` already caps OSM at 2 MB, 2,000 nodes, 5,000 edges |
| Rendering provider metadata **as text**, HTTPS only, credential-bearing endpoints inspectable but unable to connect | **Adopt** | Downloaded data is untrusted here too, and `fw:requestOrigin` already records where a request went |
| Its **Leaflet + Leaflet-Geoman study area** | **Reject** | Fieldwork already ships Leaflet 1.9.4 and has its own drawing in `src/study-area-map.ts` — bounding box, polygon, and a circle with two handles, all browser-tested. A second drawing implementation would be the defect, not the feature |
| The **JavaScript explorer** as a whole | **Reject** | For the reason 39 rejected the Vue app: it is an application, and the canvas is the interface |
| **`stac_browser.py` in the Validation Lab** | **Adopt candidate** | The lab is already JupyterLite, and the helper's `pyodide.http.pyfetch` in the browser with a standard-library adapter outside it is the same split the lab's checks already make between Pyodide and CPython |

The Validation Lab row is the cheap one and the likely first move. It needs no
Fieldwork change at all, and it serves the lab's second purpose — off-fieldwork
data download and extraction — without putting an interactive browser inside a
workflow graph.

## What a Fieldwork discovery widget would take

Five things, in the order they would have to be settled. None is written.

1. **A node whose output is a request, not data.** [39](39-stac-discovery-and-remote-acquisition.md)
   already settled this and the naming: `discover_*` under the stage taxonomy
   now in use for compositions, with a remote-asset request as its output port.
2. **Gate evaluation at discovery time.** The declarations are machine-readable:
   an `s3://` href fails an HTTPS-only profile, `auth:schemes` of `oidc` fails a
   session-only static-key credential model, `alternate-assets` may offer an
   HTTPS route. A widget can therefore **refuse precisely** — naming the scheme
   and the unsupported URI — rather than failing opaquely. The browser does not
   do this, because it never acquires.
3. **A CORS probe, because CORS cannot be read off a declaration.** Nothing in a
   STAC document says whether an asset host will permit a browser origin. It can
   only be attempted, which means discovery should probe and record the answer
   rather than present an item as available on the strength of its metadata.
4. **The online-to-offline contract.** Network-dependent widgets here download
   and cache, so that a workflow re-runs offline against what it already has. A
   discovered item is not a workflow input until its bytes are cached and its
   request saved; otherwise the workflow is reproducible only while the catalog
   is up.
5. **The asset gate stays shut.** Nothing in this note unblocks WorldPop or
   Copernicus. Discovery would make the obstruction legible and early instead of
   opaque and late, which is worth something — but it is not access.

## What has to be measured before any of it

Each is a precondition, and none is measured:

| Question | Why it decides the matter |
| --- | --- |
| Does the STAC Index API send permissive CORS headers? | The catalog directory depends on it. Inferred from the browser's design; unverified here |
| Which catalogs in that directory actually permit a browser origin? | The directory records `access: public`, which is about **data licensing, not CORS**. Conflating the two would ship a chooser full of endpoints that cannot be reached |
| Is there any catalog whose assets clear **all four** gates at once — permissive CORS, no authentication, EPSG:4326, honoured `Range`? | 39 measured two candidates and found none. If the answer across the directory is still none, a discovery widget is decorative: it would browse to things Fieldwork cannot read |

That last question is the one worth spending effort on, and it can be answered
by measurement in the Validation Lab against the bundled catalog snapshot,
before any Fieldwork code is written. It is also the honest order: find out
whether anything is reachable before building a way to reach it.

## What this note does not establish

It does not establish that the repository does what its documentation says. The
README and `book/architecture.md` were read; no source was read and nothing was
run. Every disposition above is of a **described** design.

It does not establish that discovery is the bottleneck. A practitioner who
cannot download an asset is not helped by finding it faster, and the gates in
39 remain the binding constraint. The case for discovery is that a precise early
refusal is better than an opaque late failure — which is a claim about
practitioner experience, and like the composition legibility claim in
[89](89-the-first-composition.md), it needs a person rather than a test.
