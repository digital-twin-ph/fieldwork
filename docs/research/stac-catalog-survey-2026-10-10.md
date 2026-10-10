# STAC catalogs: CORS, licensing and credentials, measured

_Created 2026-10-10 · Updated 2026-10-10_

Measured to answer three questions asked before any STAC browser is integrated
([91](../experiments/91-stac-browser-integration.md)):

1. Which STAC resources are CORS-enabled?
2. Which are not, and which licensing types conflict with Fieldwork?
3. Which need API keys, and can the credential manager serve them?

The purpose is to decide which resources a workflow could acquire **by itself**
and which require a manual download before a workflow starts.

## Method, and what it does not prove

The universe is the [STAC Index](https://stacindex.org/catalogs?access=public)
directory, fetched from its [official API](https://stacindex.org/api/catalogs)
on 2026-10-10: **149 catalogs, 126 public, 45 of those declaring an API.** All
45 were probed.

Each probe sent `Origin: https://fieldwork.example.org` and read the response
headers. One request to the catalog root, one to `/collections`, and for four
catalogs one `/search` followed by a ranged `GET` of a real asset.

**This measures what a server sends, not what a browser does.** A simple
cross-origin `GET` needs only `Access-Control-Allow-Origin`, so a permissive
header here means a browser read would succeed; but a request carrying extra
headers triggers a preflight that was not exercised, and a reader needing the
total size of a file also needs `Access-Control-Expose-Headers`, which is
reported separately below. Nothing was fetched through an actual browser.

## 1. Which are CORS-enabled

**40 of 45 send an `Access-Control-Allow-Origin` header.** Thirty-four send
`*`, five echo the requesting origin, and one sends a different origin entirely.

The STAC Index API itself answers `200` with `access-control-allow-origin: *`,
which settles the open question in [91](../experiments/91-stac-browser-integration.md):
a catalog directory can be refreshed from the browser.

`/collections` answered `200` for **33** of them, with no credential of any
kind. **No catalog returned `401` for its metadata,** and only CBERS returned
`403` there while its root was permissive. Catalog metadata, as a class, is open
and browser-readable.

## 2. Which are not, and the licensing picture

**Five send no CORS header at all:** ESA Catalog, FAIRiCUBE Hub (a `302`),
KAGIS Katalog, and **both GISTDA catalogs — Thailand's drought index and flood
disaster** — which are the regionally nearest resources in the directory and
are unreachable from a browser.

**One is worse than absent.** The USGS Landsat Collection 2 API returns
`access-control-allow-origin: https://landsatlook.usgs.gov/...`, a fixed origin
that is not the caller's. A browser rejects that, so the test is not whether a
header is present but whether it **matches**.

### Licences across 2,763 collections in 32 catalogs

| Licence | Collections | Position for Fieldwork |
| --- | --- | --- |
| `CC-BY-4.0` and spelling variants | ~1,135 | **Compatible.** Attribution, which the reference mechanism already records |
| `proprietary` | 969 | **Unresolvable from the field alone.** In STAC this means "not one of the listed SPDX identifiers, see the link", not that the data is closed — Earth Search labels openly licensed Sentinel-2 this way |
| `other`, `Unknown`, `various`, absent | ~250 | **Unresolvable.** No gate can be derived |
| `etalab-2.0`, `OGL-Canada-2.0` | 157 | **Compatible.** Attribution licences |
| `CC0-1.0`, `PDDL-1.0`, `CC-PDDC` | ~95 | **Compatible.** Public domain |
| `CC-BY-SA-4.0` | 35 | **Share-alike.** The ODbL question again: redistributing a derived product may oblige the same licence, which a bundled worked example would have to honour |
| `CC-BY-NC-SA-4.0`, `CC-BY-NC-4.0` | 53 | **Conflict risk.** Non-commercial terms sit awkwardly with an Apache-2.0 tool anyone may use for any purpose. The restriction travels with the data, not the tool, so it would have to be stated on any example bundling it |
| A bare URL in the licence field | 14 | **Not machine-readable.** The field holds a link to a document |

Fieldwork is Apache-2.0, and nothing here conflicts with the *tool's* licence,
because a data licence binds the data. What these constrain is
**redistribution**: a bundled example, a cached download shipped inside a saved
workflow, or an exported result.

**The licence field cannot be an automatic gate.** 35% of collections say
`proprietary` without meaning closed, about 9% say nothing usable, the spelling
is inconsistent across four variants of CC-BY-4.0 alone, and fourteen put a URL
where an identifier belongs. A widget can *record* the value and show it; it
cannot decide from it.

## 3. Credentials, and what the manager can serve

The credential manager holds `{ref, provider, label, origin, secret}` — a
static secret bound to one exact HTTPS origin, decrypted from a
password-protected blob and held for the session only
([30](../experiments/30-local-credential-files.md)).

| Mechanism | Fits the manager? |
| --- | --- |
| A static API key or token sent to one origin | **Yes.** This is what it is for |
| No credential at all | **Not needed** — which is the case for catalog metadata across the board |
| OIDC, as Copernicus requires for assets | **No.** Redirects, refresh and expiry are a different mechanism, as [39](../experiments/39-stac-discovery-and-remote-acquisition.md) recorded |
| Request signing — AWS SigV4, or a SAS token minted per request | **No.** Signing computes a value per request from a secret; the manager stores and returns a value |

So credentials are not an obstacle for **discovery** at all. They obstruct some
**assets**, and where they do, the manager does not fit.

## What decides automatic against manual: the assets

Catalog metadata being readable says nothing about the data. Four asset hosts
were probed with a ranged `GET` and a browser origin:

| Asset host | Status | `Access-Control-Allow-Origin` | `Range` |
| --- | --- | --- | --- |
| `e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com` (Sentinel-2 C1 L2A) | **206** | `*` | honoured: `bytes 0-1023/12692851` |
| `data.worldpop.org` (WorldPop STAC assets) | 200 | **none** | advertised, **ignored** |
| `zenodo.org` (the known-good case from [47](../experiments/47-sea-level-pack.md)) | 200 | `*` | exposes `Content-Type, ETag, Link` and more |

**Sentinel-2 on AWS is fully readable from a browser, by range.** That is the
first measured case here of a major satellite archive clearing both gates, and
it is what a discovery widget would be for.

**WorldPop is the clearest split in the survey.** Its STAC API sends
`access-control-allow-origin: *` and lists 248 collections, mostly `CC-BY-4.0`.
Its assets, on `data.worldpop.org`, send no CORS header and ignore `Range`,
exactly as [39](../experiments/39-stac-discovery-and-remote-acquisition.md)
measured on 2026-10-07. **A practitioner can search WorldPop from Fieldwork and
cannot download from it.**

One qualification on the Sentinel-2 result: the response carries no
`Access-Control-Expose-Headers`, so JavaScript can read the returned bytes but
**not** `Content-Range` or `Content-Length`. A reader that learns a file's total
size from those headers would need another way to get it. This is the same class
of obstacle [71](../experiments/71-health-facility-sources.md) met with exposed
headers, and it is invisible from the status code.

## The answer

| Class | Condition | Measured example | What a workflow does |
| --- | --- | --- | --- |
| **Fully automatic** | Metadata CORS, asset CORS, `Range` honoured, no credential | Earth Search → Sentinel-2 on AWS | Discover, acquire and cache inside the workflow |
| **Discovery only, blocked by CORS** | Metadata readable, asset host sends no header | WorldPop | Search and choose in Fieldwork; download manually; import the file |
| **Discovery only, blocked by authentication** | Metadata readable, asset needs OIDC or signing | Copernicus ([39](../experiments/39-stac-discovery-and-remote-acquisition.md)) | The same, and the credential manager cannot help |
| **Unreachable** | No CORS header, or a header naming another origin | ESA, FAIRiCUBE, KAGIS, both GISTDA, USGS Landsat | Nothing. The catalog cannot be listed at all |

So manual download is not a fallback for awkward cases. For most of what a
Philippine public-health workflow would reach for, it is the **normal path**,
and the automatic path exists but is narrow.

That makes a discovery widget worth building for what it **refuses** as much as
for what it fetches. It can say: this asset cannot be read from a browser, here
is its URL and its licence, download it and import the file. That is a better
answer than a failed request, and it is the pre-workflow step made explicit
rather than left for a practitioner to discover.

## Per-catalog results

`ACAO` is the header returned for the catalog root with a browser `Origin`;
`root` and `/collections` are HTTP statuses; licences are the two most common
values among that catalog's collections, lower-cased as returned.

| Catalog | Metadata ACAO | root | /collections | Collections | Licences (top two) |
|---|---|---|---|---|---|
| Astraea Earth OnDemand | * | 200 | 200 | 31 | proprietary 20; cc-pddc 6 |
| Boettiger Lab Geospatial Datasets | * | 200 | 404 | 0 |  |
| BON in a Box STAC | * | 200 | 200 | 10 | cc-by-sa-4.0 4; cc-0 3 |
| Canadian Geospatial Data Collections | * | 200 | 200 | 52 | ogl-canada-2.0 48; private 3 |
| CBERS and Amazonia-1 on AWS | * | 200 | 403 | 0 |  |
| Copernicus Data Space Ecosystem | * | 200 | 200 | 10 | other 10 |
| Cyverse STAC API | * | 200 | 200 | 2 | cc-by-sa-4.0 2 |
| data.geo.admin.ch | * | 200 | 200 | 100 | proprietary 99; cc-by 1 |
| Destination Earth Data Lake (DEDL) API | * | 200 | 200 | 314 | other 155; cc-by-4.0 151 |
| Digital Earth Africa | https://fieldwork.example.org | 200 | 200 |  |  |
| Digital Earth Australia | https://fieldwork.example.org | 200 | 200 | 97 | cc-by-4.0 57; unknown 40 |
| Digitale Orthophotos Niedersachsen | * | 200 | 200 | 1 | cc-by-4.0 1 |
| Earth Genome: Sentinel-2 L2A Temporal Mo | * | 200 | 200 | 10 | other 7; cc-by-4.0 2 |
| Earth Search | * | 200 | 200 | 9 | proprietary 9 |
| EasierData | * | 200 | 200 | 8 | cc0-1.0 3; other 2 |
| EOC EO Products Service | https://fieldwork.example.org | 200 | 200 | 69 | cc-by-4.0 49; proprietary 10 |
| ERS open data | https://fieldwork.example.org | 200 | 404 |  |  |
| ESA Catalog | NONE | none | - |  |  |
| FAIRiCUBE Hub Catalog | NONE | 302 | - |  |  |
| FedEO Clearinghouse | * | 200 | 200 | 10 | various 10 |
| GEP Supersites CSK and CSG data | * | 200 | 200 | 16 | proprietary 16 |
| GISTDA Drought Index in Thailand | NONE | none | - |  |  |
| GISTDA Flood disaster in Thailand | NONE | none | - |  |  |
| Google Earth Engine (openEO) | * | 200 | 200 | 1054 | proprietary 671; cc-by-4.0 233 |
| HUB Ocean´s Ocean Data Platform Catalog | * | 200 | 200 | 49 | cc-by-4.0 22; cc0-1.0 7 |
| Impact Observatory STAC API | * | 200 | 200 | 1 | proprietary 1 |
| INPE STAC Server | * | 200 | 200 | 79 | creative-commons-attribution-4.0-interna |
| KAGIS Katalog | NONE | none | - |  |  |
| Kentucky From Above SpatioTemporal Asset | * | 200 | 200 | 9 | cc-by-4.0 9 |
| Microsoft Planetary Computer STAC API | * | 200 | 200 | 138 | proprietary 110; cc-by-4.0 13 |
| MISTEO STAC SERVER | * | 200 | 200 | 100 | cc-by-4.0 100 |
| MTD STAC API | * | 200 | 200 | 10 | etalab-2.0 4; cc-by-4.0 4 |
| NASA CMR CLOUDSTAC Proxy | * | 200 | 404 | 0 |  |
| NASA CMR STAC | * | 200 | 404 | 0 |  |
| OpenAerialMap | * | 200 | 200 | 5 | cc-by-nc-4.0 2; other 1 |
| Paituli STAC (Finland) | * | 200 | 200 | 187 | cc-by-4.0 180; open 4 |
| Panoramax | https://fieldwork.example.org | 200 | 200 | 100 | etalab-2.0 100 |
| PGC Data Catalog | * | 200 | 200 | 12 | cc-by-4.0 12 |
| PSL / Mines Paris / OIE | STAC Catalog | | * | 200 | 200 | 10 | other 9; cc-by-4.0 1 |
| SkyServe Mission Data | * | 200 | 404 | 0 |  |
| Super-Resolved Sentinel-2 2.5m STAC API | * | 200 | 200 | 1 | proprietary 1 |
| Thünen Earth Observation (ThEO) | * | 200 | 200 | 7 | cc-by-4.0 7 |
| USGS Landsat Collection 2 API | https://landsatlook.usgs.gov/stac-server | 200 | 200 | 14 | https://d9-wret.s3.us-west-2.amazonaws.c |
| UVT STAC Catalog | * | 500 | 500 | 0 |  |
| WorldPop STAC API | * | 200 | 200 | 248 | cc-by-4.0 248 |

## Limits

One request each, from one network, on one day, from a machine in one country;
geofenced or rate-limited behaviour would not show. Four asset hosts out of 45
catalogs were probed, and an asset's CORS position cannot be generalised from
its catalog's. Nothing went through a real browser, so preflight behaviour for
non-simple requests is unmeasured. The licence tally counts collections, not
data volume or usefulness: a catalog with one permissive collection may matter
more than one with three hundred restricted ones.
