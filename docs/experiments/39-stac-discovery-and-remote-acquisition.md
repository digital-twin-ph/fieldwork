# Experiment 39: STAC discovery and remote asset acquisition

Date: October 7, 2026. Status: design specification, measured dependency cost and
measured catalog probes. No application code, widget release or dependency is
added by this document. It continues the
[STAC processing contracts](15-stac-processing-shacl.md) toward an acquisition
adapter and records the conditions that must hold first.

The dependency sizes and catalog behavior below were measured on this date from
a developer machine with `esbuild` and `curl`. A `curl` probe is not a browser:
it establishes what a server sends, which bounds what a browser can do, but it
does not exercise the browser's own preflight and opaque-response handling. Those
require the browser checks specified at the end of this note.

## Disposition of STAC Browser

[STAC Browser](https://github.com/radiantearth/stac-browser) is a standalone
Vue 3 / Vite / Bootstrap 5 single-page application, ISC licensed to the Radiant
Earth Foundation, supporting STAC 0.6.0 through 1.1.0. Its 4.0.x line used
OpenLayers; earlier lines used Leaflet. Its README records limited maintenance
funding. It is an application, not a component library, and its documentation
does not describe embedding it in a host application.

Fieldwork is React 19 with `@xyflow/react`, bundled by esbuild into one offline
PWA. Embedding STAC Browser would add a second framework, router and CSS
baseline to that bundle and to the service-worker asset manifest. The
[prior-art disposition](../prior-art.md) for the openEO Web Editor applies
unchanged: inspect its interaction patterns, do not replace the canvas.

| Option | Disposition | Reason |
| --- | --- | --- |
| Embed STAC Browser in the canvas | **Reject** | Framework, CSS and bundle conflict; it is an app, not a library; offline asset budget. |
| Adopt `@radiantearth/stac-fields` (1.6.2, Apache-2.0) | **Reject** | Measured below: a Markdown renderer is 35.8% of its weight, for metadata labels. |
| Adopt `stac-js` (0.5.7, Apache-2.0) | **Defer** | Measured below: its own logic is small, but it carries a URI library and a version migrator this slice does not need. |
| Hand-roll a bounded client in `src/stac.ts` | **Adopt** | No new dependency; matches how `street-network.ts` already parses Overpass JSON and GraphML itself. |
| Host a STAC Browser instance and link out | **Adopt for human browsing** | Catalog exploration by a practitioner, outside the workflow, with no coupling. |
| Use STAC Browser as an independent comparator | **Adopt for validation** | Compare our rendered item/asset metadata against a mature implementation, as QGIS is used for clipping. |

Both candidate libraries are Apache-2.0 and ISC/Apache-2.0 are compatible with
this repository's license. That settles neither their transitive dependency
licensing, offline behavior nor maintainer support, which the prior-art policy
requires recording before selection.

## Measured dependency cost

Each candidate was installed outside this repository and bundled with `esbuild`
(minified, ESM, browser platform) importing only the entry points a bounded
picker would use.

| Probe | Raw | Gzip |
| --- | --- | --- |
| `stac-js` | 127,177 B | 39,425 B |
| `@radiantearth/stac-fields` | 191,976 B | 58,699 B |
| Both together | 319,223 B | 97,910 B |

The composition matters more than the total. `commonmark` is 111.6 KB, 35.8% of
the combined bundle: a complete Markdown parser, reached only to format
description fields. `@musement/iso-duration` adds 21.2 KB and `fields.json`
25.4 KB. For `stac-js`, its own twenty source files total roughly 10 KB; the
weight is `urijs` (about 41 KB across URI.js, SecondLevelDomains, punycode and
IPv6), `@radiantearth/stac-migrate` (18 KB) and turf geometry helpers. Native
`URL` resolves hrefs without `urijs`, and the migrator matters only for catalogs
below STAC 1.0.0.

[Experiment 37](37-vega-lite-chart-spike.md) recorded an 857,966-byte Vega-Embed
chunk as "material for an offline-first browser app" that "should be compared
with a smaller renderer before expanding chart types." The same standard applies
here, and metadata formatting is a weaker justification than chart rendering.
A hand-written client is therefore preferred, supporting STAC 1.0.0 and 1.1.0
and refusing an older `stac_version` with a message naming it, in the way
`parseGraphML` already refuses a non-WGS84 `crs`. Reconsider `stac-js` only if
multi-version catalog support becomes a stated requirement.

These figures are bundle sizes before transfer compression on one machine with
one bundler configuration. They are not a runtime performance measurement.

## Semantic admission

Discovery and acquisition are different operations and must not be merged into
one primitive. Experiment 15 already separates them: a STAC Asset is a
descriptor, `fw:DownloadedAsset` is bytes with an identity, and "a MIME
declaration, extension or STAC role never establishes that a file is available
locally or has a verified format." This slice therefore proposes one new
primitive and one additive mode on an existing primitive.

**Proposed `stac_discovery` (new, 0.1.0).** A discovery plan and activity. It is named for discovery, not input, because its output is a request rather than data. It
queries a static catalog or a STAC API Item Search endpoint, lets the author
select one Item and one asset key, and outputs a **descriptor only**. It
acquires no bytes, reads no pixels and asserts no local availability. Its
output is a proposed `remote-asset-request` port carrying the resolved
absolute href, declared media type, declared roles, Item footprint or explicit
`stac:geometryIsNull`, Item datetime or interval, collection and catalog
identity, the source document base used for resolution, and the original JSON.

**Existing `raster_input` (additive, 0.3.1 to 0.4.0).** Acquisition of a
bounded WGS84 GeoTIFF window has the same meaning whether the bytes come from
a local file or a URL, so AGENTS.md's reuse rule forbids a synonymous
`stac_raster` widget. `raster_input` instead gains an acquisition **source
mode** with `local` as the saved default, plus an optional `Or: STAC asset`
input. Existing saved workflows keep `local` and require no migration.

A Study area or buffered area may feed `stac_discovery` to supply the search bbox,
following the `network_input` precedent. The Item footprint describes asset
coverage and never becomes a study area or a clipping boundary.

| Contract | Proposed decision |
| --- | --- |
| `stac_discovery` inputs | Optional study area or buffered area for bbox; otherwise explicit bounding coordinates |
| `stac_discovery` parameters | Catalog root or Item Search endpoint, collection identifiers, datetime interval, result limit, asset key, request pacing |
| `stac_discovery` output | One `remote-asset-request`; never bytes, pixels or a boundary |
| `raster_input` inputs | Existing local file, or one descriptor in `remote` mode |
| `raster_input` output | Unchanged `fw:DownloadedAsset` plus native-grid window, with transfer provenance added |
| Query surface | STAC API core Item Search only: `collections`, `bbox`, `datetime`, `limit`. Filter, sort and arbitrary extension queries require a declared conformance class and are **not** admitted here |
| Missing data | A relative href without its source document base, an absent asset key, an unowned asset key, a non-HTTPS scheme, or `geometryIsNull` with a requested window each refuse the selection and explain which condition failed |
| Provenance | Catalog/collection/item identity, source document base, original href, declared media type, retrieved digest, measured transfer bytes, request time and pacing record |

Proposed terms that must remain distinct, for the audit table once implemented:

| Term | Meaning |
| --- | --- |
| Catalog descriptor | Retrieved STAC metadata; not an acquired file and not proof an asset exists |
| Asset selection | The author's chosen Item, asset key and requested window; a plan, not a transfer |
| Windowed acquisition | Executed ranged reads producing retained bytes with a digest; distinct from the selection that requested it |
| Measured transfer | Bytes actually moved over the network; distinct from retained asset size and from the source file's full size |

## Remote acquisition and measured transfer

The pinned `geotiff` 3.0.5 dependency already exports `fromUrl`, `fromUrls` and
`fromCustomClient` alongside the `fromBlob` path that [src/raster.ts](../../src/raster.ts)
uses today. Ranged reading therefore needs no new runtime dependency. This is
the Geo Engine resource-aware concept in prior-art section 3 applied to a
concrete case: request a bounded native window instead of obtaining an entire
national file first.

Windowed reading does not by itself reduce transfer. A tiled, internally
overviewed Cloud Optimized GeoTIFF on a server honoring range requests can
serve a small window; a stripped TIFF, or a server answering `200` to every
range request, degenerates toward a full transfer. The receipt must therefore
record measured transfer bytes separately from retained bytes, and the
interface must not describe a remote acquisition as bounded until that
measurement exists. The existing 20 MB archive limit and raster window budgets
continue to apply to retained bytes.

Request discipline follows `network_input`, which is the closest implemented
precedent: one request at a time, a visible pause between attempts, no
automatic retries or background refreshes, a cooldown that survives reload, and
saved attribution. Discovery is online-only. STAC responses must not enter the
service-worker asset manifest. What persists and replays offline is the
acquired window plus the descriptor snapshot, exactly as a local raster does
today.

## Feasibility gates before implementation

Each is a precondition, not a prediction. The status column records what the
named candidates actually returned on October 7, 2026.

| Gate | Condition | Measured status |
| --- | --- | --- |
| CORS | The asset host returns permissive CORS headers for cross-origin ranged `GET` from a browser origin, including on redirects | Copernicus: present on both metadata and asset hosts. WorldPop: **absent** |
| Range support | The host honors `Range` and advertises `Accept-Ranges`; the asset is tiled | WorldPop: advertises `Accept-Ranges` and **ignores** `Range`. Copernicus: not reachable anonymously |
| Native CRS | The asset's native CRS is EPSG:4326 | Satisfied by Copernicus CLMS global products; still blocking for Sentinel and Landsat UTM assets |
| Authentication | Any required signing fits the session-only credential manager | Copernicus requires OIDC; **does not fit** the static-key model |
| Conformance | A STAC API declares the Item Search conformance class actually used | Copernicus declares STAC 1.1.0; the specific class is unverified |

## Measured catalog behavior

**Copernicus Data Space Ecosystem.** `https://stac.dataspace.copernicus.eu/v1/`
answers `200` with `access-control-allow-origin: *`, lists 427 collections and
serves STAC 1.1.0 Items. A CLMS global product
(`clms_lc_global_100m_yearly_v3_cog`) carries `proj:code` of `EPSG:4326`, which
clears the CRS gate that Sentinel and Landsat UTM assets do not.

Acquisition is nonetheless closed. Fifteen of that Item's seventeen assets use
an `s3://eodata/...` href, which this profile's HTTPS-only restriction refuses
by design. The remaining HTTPS route is the `alternate-assets` v1.2.0
`alternate.https` href on the OData download endpoint, which returns **`401
Unauthorized`** to an anonymous ranged request while sending
`access-control-allow-origin: *`. So CORS is satisfied and **authentication is
the gate**. The Item declares `authentication` v1.1.0 with `auth:schemes` of
`s3` and `oidc`, the latter pointing at the CDSE realm at
`identity.dataspace.copernicus.eu`, and assets carry `auth:refs` of `["oidc"]`.
An OIDC bearer token with refresh and expiry is a different mechanism from the
[credential manager's](30-local-credential-files.md) session-only static keys
bound to an allowed origin, and adopting it is a separate security decision, not
an incidental part of a STAC adapter.

Because these declarations are machine-readable, the widget can refuse
precisely: name the required scheme and the unsupported URI scheme instead of
failing opaquely. A refusal that explains which condition failed is the stated
goal of the compatibility contract in [prior art](../prior-art.md).

**WorldPop.** The hub REST API returns direct file URLs; no STAC endpoint
surfaced for it, and this slice should not assume one exists. The file the Old
Naledi workspace actually uses,
`https://data.worldpop.org/GIS/Population/Global_2000_2020/2020/BWA/bwa_ppp_2020.tif`,
is **292,628,857 bytes** and answers an anonymous `GET` with `200` and
`Accept-Ranges: bytes`, but:

- it returns **no `Access-Control-Allow-Origin` header**, on the `GET` or on an
  `OPTIONS` preflight carrying `Access-Control-Request-Headers: range`, so a
  browser blocks the cross-origin read outright; and
- it answers a well-formed `Range: bytes=0-1023` request with `200 OK` and the
  full 279 MB `Content-Length` rather than `206` with a `Content-Range`, so it
  advertises range support it does not apply.

This is the degenerate case this note warned about, now observed. Windowed
reading cannot bound the transfer, and the browser cannot make the request at
all. The existing local-file preparation flow in `raster_input` is therefore not
a limitation awaiting a remote replacement for WorldPop: it is the only
mechanism that can work from a browser, and it should keep its documented place.
A server-side proxy would change the trust, provenance and offline story and is
outside this design.

The CRS gate is the significant one. Fieldwork's raster contract is a bounded
**WGS84** window, and the [CRS decision record](05-coordinate-reference-systems.md)
specifies Reproject as a future node that does not exist. Landsat and
Sentinel-2 COGs in the commonly used public catalogs are distributed in UTM
zones. Those assets are therefore **not** ingestible by this slice, and no
amount of discovery work changes that. Only assets already in EPSG:4326 are
admissible until reprojection is implemented. Sequencing follows from this:

1. Discovery, descriptor, RDF mapping and provenance, with no byte transfer.
2. Ranged acquisition restricted to EPSG:4326 assets, with measured transfer.
3. Reprojection, which unblocks the general EO case and needs its own audit.

Authentication is a second gate. A catalog requiring signed asset URLs needs
the `.fwcredentials` manager to reach an input node, and the README currently
records that "current input nodes do not consume these keys." Signing also
introduces a per-request expiry that must not be written into a saved workflow
as if it were a durable href.

## Emitted triples and validation

The mapping targets the existing [`urn:fieldwork:stac:` profile](../../ontology/stac.ttl)
and its [shapes](../../ontology/shapes/stac.ttl) without extending the profile's
namespace. Two proposed additions are needed: `fw:AssetSelection` as a
`prov:Plan` linking a descriptor, asset key and requested window, and
`fw:WindowedAcquisition` as the `prov:Activity` generating `fw:DownloadedAsset`
with its digest, retained bytes and measured transfer bytes. Shapes must be
written before implementation, per the admission procedure.

Negative fixtures to supply alongside positive ones:

- A relative asset href with no `stac:sourceDocument` base.
- An asset key not owned by the Item that declares it.
- A non-HTTPS asset scheme.
- An Item with `stac:geometryIsNull true` and a requested spatial window.
- A declared media type offered in place of a completed byte inspection.
- A retrieved digest that disagrees with the recorded digest.
- A requested window outside the Item footprint.
- An acquisition receipt asserting bounded transfer with no measured value.
- A selection whose expiring signed href is persisted as a durable href.

Browser scenarios must run against a **local fixture catalog served by the test
server**, so the regression gate stays offline and deterministic. A live-catalog
probe belongs in a scenario skipped by default, following the existing
`tests/raster.browser.mjs` WorldPop skip, which is the pattern already used for
a check that depends on an absent local resource.

## What this does not serve

This would not improve the Old Naledi raster workflow. The measurements above
show WorldPop is unreachable from a browser origin and does not honor the range
requests it advertises, so no amount of discovery work changes how that raster
enters a project. STAC's dense coverage is Earth-observation imagery and derived
products, not the population and facility data this prototype's worked examples
rely on.

A genuinely motivated first case is land surface temperature for the heat
outreach example, which currently uses synthetic neighborhoods. That case sits
behind the CRS gate, so it cannot be the first implemented slice. Choosing a
discovery experiment because the standard is interesting, rather than because a
worked example needs a dataset, would add an online dependency and bundle cost
to an offline-first prototype without changing any current result.

## Implementation plan

The editors in this application are imperative DOM, not React components. React
wraps the canvas in [canvas.tsx](../../src/canvas.tsx); `openRasterEditor` in
[raster-ui.ts](../../src/raster-ui.ts) builds a `<dialog>` directly, and
inspector panels are template strings. A native STAC browser is therefore a
`<dialog>` in that same shape, and the framework of any external browser
application is irrelevant to it.

Two new files, following the closest existing precedents:

| File | Precedent | Contents |
| --- | --- | --- |
| `src/stac.ts` | `street-network.ts` | Descriptor type; catalog and Item Search requests; `child`/`item`/`data`/`search` link traversal; href resolution through native `URL` against the source document base, including the `alternate.https` href; byte caps, `AbortController` and streamed size guards; refusal of unsupported `stac_version`, URI scheme, auth scheme, unowned asset key and null geometry with a requested window; SHA-256 and request provenance |
| `src/stac-ui.ts` | `raster-ui.ts` | `openStacBrowser(boundary, onSave, existing?)`: endpoint, collection, datetime and bbox-from-study-area controls; result and asset lists; raw Item JSON in `<details>`; `role="status"` and `role="alert"` regions; Cancel and Save asset selection |

A small record of the fields actually displayed replaces `stac-fields`, in the
way `RASTER_SOURCE_FIELDS` already enumerates raster citation fields.

Edits, derived from every file that currently references `network_input`:

- [types.ts](../../src/types.ts): `PortType` gains `remote-asset-request`; `ParamsByType`
  gains a `stac_discovery` entry holding endpoint, collections, datetime, asset key
  and the saved descriptor.
- [core.ts](../../src/core.ts): a `TYPES` entry in the Sources group with an
  `area` input, and an execution case passing the stored descriptor through as
  `network_input` passes its saved graph.
- [app.ts](../../src/app.ts): default parameters in the add-node chain, the
  inspector section and download button wiring, and the `canAutoRun` guard so a
  node without a descriptor does not auto-run.
- `network-throttle.ts`: generalize the single hard-coded OSM deadline key to a
  per-host pacing instance, preserving current OSM behavior and reusing the
  existing `navigator.locks` cross-tab guard.
- `runtime-semantics.ts`, `project-manifest.ts`, `canvas-semantics.ts`: activity
  identifiers, manifest inventory and canvas plan RDF.
- `ontology/stac.ttl` and `ontology/shapes/stac.ttl`: the two proposed classes
  and the negative fixtures listed above.
- `widgets/releases/stac_discovery/0.1.0.json`, and a `raster_input` minor release
  when a remote mode exists.

No service-worker change is required. [sw.ts](../../src/sw.ts) already returns
early for any request whose origin differs from the application's, so catalog
traffic bypasses the cache and cannot enter the offline manifest.

For tests, a fixture catalog under `tests/fixtures/stac/` is served
**same-origin** by `server.mjs`, which already maps `.json`. That exercises
traversal, selection and refusals but **not** CORS, because a same-origin
request never performs a cross-origin check. Cross-origin behavior, including a
missing `Access-Control-Allow-Origin` and a `Range` request answered with `200`,
should be synthesized with Playwright request interception so the regression
gate stays offline and deterministic. Any live-catalog probe belongs in a
scenario skipped by default, as the WorldPop raster scenario already is.

## Evaluation and limits

Evaluation should ask whether a practitioner can distinguish a retrieved
descriptor from an acquired file, state which conditions an asset satisfied and
which remain unknown, and explain why a syntactically valid asset was refused.
A candidate asset that passes every structural check is still not evidence that
its values, units, coverage or date suit a public-health question.

Nothing here is implemented. Dependency sizes and the two named catalogs are
measured; tiling, conformance classes, redirect behavior and every other catalog
remain unverified, the probes were made with `curl` rather than from a browser,
the transitive dependency licensing and maintenance of `stac-js` and
`@radiantearth/stac-fields` are unaudited, and no widget release, shape or test
exists yet. Mapping STAC JSON into this profile establishes structural
provenance only, not STAC JSON Schema conformance, which remains an upstream
check.

## Resolved decisions

These three questions were open when this note was drafted and have since been
settled. They are recorded here because they change the port contract.

**The node is named for discovery.** `stac_discovery`, not `stac_input`. The
other source widgets are named for the data they output, and this one outputs a
request. Experiment 15's phrase "STAC input configuration" describes the
configuration, not the node, and the catalog entry should use the narrower name.

**The output port is a general remote-asset request, not a STAC descriptor.**
The port is `remote-asset-request`: the resolved absolute HTTPS href, the
declared media type, the declared CRS, the Item footprint or explicit null, and
the declared authentication requirement — the composed acquisition request that
`raster_input` needs in order to download. Keeping it general rather than
STAC-shaped means a future plain-URL input can produce the same port without
introducing a second acquisition path, and it keeps STAC vocabulary out of the
acquisition operation, which does not care how the href was discovered. The
original STAC JSON travels alongside as provenance, not as the port contract.

**A vanished asset must fail the run, loudly.** The saved request stays valid
metadata: it records what was discovered and when. Availability is not part of
that record, so execution revalidates it. A `404`, a `403`, a redirect to a
different host, a changed content length or a digest that disagrees with the
recorded one fails the run with a message naming the asset and the condition
observed. The prior run's results stay visible and labeled as belonging to the
previous run, as any stale result already is. Execution never silently reuses
earlier bytes for a request that no longer resolves, and never downgrades a
failed revalidation to a warning that a practitioner could miss.

This mirrors the existing treatment of reference-only project imports, which are
rejected when their PDF or raster assets are unavailable rather than opening a
partially populated project.
