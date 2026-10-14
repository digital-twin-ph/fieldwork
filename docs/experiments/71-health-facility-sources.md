# 71 · Health facility sources a browser can read

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** built. `find_health_facilities` 0.1.0, two sources, superseding the
excluded `healthsites_discovery` ([69](69-healthsites-acquisition.md)).

## The question

[69](69-healthsites-acquisition.md) established that healthsites.io cannot be
fetched from a browser at all. The question that follows is not "how do we work
around that" — that was tried, and the answer was a hand-back step — but **which
sources of health facility data can a browser actually read?**

## Measurement

Probed 2026-10-09 with the project's own deployment origin in the `Origin`
header, so the result is the deployment case and not the development case.

| Source | `access-control-allow-origin` | Account | Licence |
| --- | --- | --- | --- |
| **Overpass API** (OpenStreetMap) | `*` | none | ODbL |
| **HDX / CKAN** API | `*` | none | per dataset |
| **HOT country export** on HDX, served from S3 | `*` | none | ODbL |
| Nominatim | `*` | none | ODbL |
| Overture Maps places, on S3 | `*`, with `Content-Range` exposed | none | mixed |
| healthsites.io | **absent** | API key | ODbL |
| Geofabrik `.osm.pbf` / `.shp.zip` | **absent** | none | ODbL |

Two findings worth stating plainly.

**The project already used Overpass.** `src/street-network.ts` has been
downloading street networks from `https://overpass-api.de/api/interpreter` for
some time, with pacing, provenance and a licence record. The facility question
could have been answered from the same endpoint throughout. A credentialed
source was reached for before the open one already wired into the application was
checked.

**healthsites.io is itself OpenStreetMap-derived.** It is a curated view over the
same upstream data, with completeness scoring and a tidier schema. So Overpass is
not a degraded substitute; it is the same facilities from the source, with
finer-grained `healthcare=*` tagging.

What the measured payloads hold:

| | Records | Named | Size |
| --- | --- | --- | --- |
| Overpass, Metro Manila bounding box | 4,413 | 4,116 | — |
| HOT export, whole Philippines | 12,776 | 11,877 | 452 KB zipped, 5.5 MB raw |

Geofabrik is in the same category as healthsites — no CORS — and is additionally
609 MB for the Philippine `.osm.pbf` and 1.42 GB for the shapefile set. It
belongs behind a script in `validation-lab/`, not in the browser. Overture is
browser-readable with working Range requests, which makes the project's existing
partial-read technique usable in the browser, but it is a much larger build and
is not needed to answer this question.

## End-to-end check against the live services

Both sources were run through the real code path on 2026-10-09, same study area:
a Manila bounding box of 120.95,14.55 to 121.00,14.60.

| Source | Kept | Dropped | Notes |
| --- | --- | --- | --- |
| OpenStreetMap, live | **47** | 0 of another kind, 0 unplaceable, 2 unnamed | from a browser |
| HOT country export | **30** | 10,818 of another kind, 1,926 unplaceable, 2 unnamed | 452 KB download, 0 outside the area after clipping |

Two things fall out of this and both matter to a practitioner.

**The live query found 47 where the prepared export found 30**, for the same area
on the same day. The export is rebuilt periodically, so it lags; the live query is
current at the moment of retrieval. That is a real reason to prefer the live
source for a small area, and a real reason to prefer the export when a country is
wanted at once or when Overpass is busy. Neither is more correct — they are the
same database at different moments — but a workflow should record which it used,
and it does.

**The export's drop counts look alarming and are not.** 10,818 records of another
kind and 1,926 unplaceable are the whole country being filtered down to one
bounding box and two facility kinds. The clip is verified rather than assumed: of
the 30 kept, none fell outside the study area.

One finding for anyone scripting against this: **Overpass returns HTTP 406 to a
request with no browser `User-Agent`.** The same query from a browser succeeds.
This cost some confusion when the module was first exercised from Node, and it is
why the end-to-end check for the live source has to run in a browser. A browser
cannot set `User-Agent` from `fetch`, and does not need to.

## One operation, two sources

The naming convention asks for the operation rather than the method, and which
service a practitioner can reach is a method. So this is one node with a source
setting, not a node per provider, and a workflow that changes source keeps its
shape. `healthsites_discovery` violated the convention twice over: it named a
product and a dataset, where the operation is finding facilities.

| | OpenStreetMap, live | HOT country export |
| --- | --- | --- |
| Bounded at source | yes, by the query | no, it is a whole country |
| Clipped here | **no** | **yes**, to the study area |
| Freshness | current at retrieval | rebuilt periodically |
| Paced | yes, 60 s, shared with the street-network download | no |

The live query is deliberately **not** clipped again after it returns. It is
already bounded by the server, so a second clip could only mask an error in the
bounding box rather than catch one.

**The study area is required, not optional.** The excluded node made it optional
behind a `useArea` flag, which needed a conditional exemption in the execution
plan — a special case that had already caused one bug. The question this node
answers is "which facilities are in my study area"; there is no well-posed form
of it without one.

**Overpass takes `south,west,north,east`.** Everything else in this application
uses `west,south,east,north`. Getting it wrong returns facilities from somewhere
else entirely and raises no error, so the conversion lives in one named function
and the unit test asserts the digits in order.

## Online to offline

Retrieval happens in the interface and never in the executor. A network-dependent
widget retrieves once, while there is a network, and stores the result in the
workflow; running the workflow afterwards reads what was stored and makes no
request at all. That is what makes an offline run produce the same result as an
online one, and it is the same shape `network_input` already used for street
networks.

This is enforced structurally rather than by intention: `core.ts` imports
`facilitiesValue` and the validators from `health-facilities.ts` and deliberately
**not** `downloadFacilities`. Two checks hold it in place — a unit test that runs
a workflow with `globalThis.fetch` replaced by a thrower and asserts zero
attempts, and a browser test that goes offline and asserts no request reaches any
data host.

## What is not established

Completeness. OpenStreetMap coverage is uneven and states none, so **an absence
in the output is not evidence of absence on the ground.** The receipt says so,
and so does the interface, because this is the error a reader is most likely to
make with a facility map. No parity check against an official register — the DOH
National Health Facility Registry, for instance — has been run, and until one
has, this says which facilities the source records and nothing about which exist.

## Overture Maps Places: built

Added 2026-10-10 as a third source, after the feasibility was measured rather than
assumed. Raised as a candidate because the Gaborone agent-based modelling
notebooks already use it.

| | Overture Places |
| --- | --- |
| Derived from | a Meta and Microsoft conflation — **not** OpenStreetMap |
| Licence | **CDLA Permissive 2.0**, which is not share-alike |
| Scale | 81,455,423 places, 16 parts, 11.0 GB, release 2026-09-23.1 |
| Reachable | `access-control-allow-origin: *`, `Content-Range` exposed |

Three reasons it earns its place, each answering something the other two sources
cannot:

- **It is independent of OpenStreetMap.** The first two sources are the same
  database at different moments, so they cannot corroborate each other. This one
  can, which speaks directly to the limitation that matters most here.
- **It is not share-alike**, so a derived database carries no obligation to adopt
  the licence.
- **It states a confidence per place** — the only numeric quality signal any of
  these sources offers, and the capability lost when the healthsites completeness
  score went.

### How 11 GB is read from a browser

The parts are spatially clustered, so a bounding box selects a handful of row
groups out of thousands and only those are fetched.

| | |
| --- | --- |
| Row groups, all 16 parts | 4,864 |
| Selected by a Manila study area | **3**, in **1** part |
| Rows then read | 55,649 of 81,455,423 |
| Time to read those rows | ~1.5 s |
| Time to read all 16 footers | 22 s sequential, **~5 s concurrent** |

Two details that would each have been a silent error:

**Overture's `bbox` columns are 32-bit.** They bracket the true coordinate rather
than equal it — measured, only 0.12% of places have a degenerate bbox. So they
are sound for *selecting* row groups and unsound for reading coordinates, which
come from the geometry. Using bbox as the coordinate would have been wrong by a
rounding error everywhere, which is the kind of wrong that never gets noticed.

**A truncated bucket listing is refused**, not worked around. Dropping a file
would drop whole regions, which would look like an empty study area, which looks
like a true absence of facilities.

The release is **discovered, not pinned**, and recorded in the receipt. A pinned
release goes stale silently and a practitioner would not know their facilities
were a year old; recording the release means a default that moves does not make a
past run unreadable.

### Overture counts differently, and the widget says so

This is the finding worth keeping. In the same Manila study area:

| Source | Facilities |
| --- | --- |
| OpenStreetMap, live | 47 |
| HOT country export | 30 |
| Overture, unfiltered health categories | **1,120** |
| Overture, as built (confidence ≥ 0.70, conservative mapping) | **488** |

The 1,120 is not twenty-four times better coverage. It is a **looser definition
plus noise.** The unfiltered list included a wellness spa under `health_care`, a
training course called "Basic Course in Phacoemulsification 2026" under
`vision_or_eye_care_clinic`, and individually named doctors. Overture reported
**207** places under `hospital` where OpenStreetMap returned 47 hospitals *and*
clinics together: Overture's `hospital` is not OSM's `amenity=hospital`. Overture
catalogues commercial places, which is a broader idea than a health facility.

Two decisions follow, and both are recorded in the receipt:

- **A confidence threshold, defaulting to 0.70.** That is the measured median of
  health places in the study area, and the point above which the obviously
  unusable entries thin out: 1,120 unfiltered, 572 at 0.70, 260 at 0.90.
- **A conservative category mapping.** The generic buckets — `health_care`,
  `medical_service`, `specialized_health_care` — are **not mapped at all**. They
  carried most of the noise and name no facility type a practitioner could act
  on, and a wrong mapping is worse than a dropped record because it is invisible
  in the result. Records in them are dropped and counted. Every kept facility
  carries Overture's own category and confidence as attributes, so the mapping can
  be audited rather than trusted.

Measured live in a browser on 2026-10-10 with the widget as built: 488 kept, 400
below the threshold, 220 of an unmapped health category, 12 of a kind not asked
for. **Counts from this source are not comparable with the OpenStreetMap
sources**, and the receipt states that rather than leaving a reader to infer it.

### A bug worth recording

Every Overture place was dropped as "of another kind" on the first run. The shared
parser derives the facility kind from OpenStreetMap tags, and Overture records
have none — their kind had already been resolved by the Overture adapter, where
the mapping could be stated. The parser now accepts an adapter-resolved `kind`
ahead of the OSM tags.

What makes it worth recording is that the counts diagnosed it: 55,649 rows read,
exactly 500 records produced, 500 dropped. 500 was precisely the number the
earlier measurement predicted for that threshold and mapping. So the Overture
reader was correct and the fault was downstream of it, which is not where it
would have been looked for. Keeping the drop counts separated by reason turned a
vague failure into an arithmetic one.

### Not automated

The live Overture read is covered by a recorded measurement, not an automated
test, because its input is 11 GB of GeoParquet that cannot honestly be mocked.
What *is* automated: release discovery, the refusal of a truncated listing, that
every mapped category lands on an offered facility kind, that the three generic
categories stay unmapped, the confidence threshold's refusals, and the licence
reaching the receipt as a resolvable IRI with share-alike distinguished from not.

## Open## Open

- A parity check against an official Philippine facility register. This is the
  gap that matters most and it is a data question, not a code one.
- HDX holds more than the HOT export, and its CKAN API is readable from a
  browser. A general HDX dataset source would reach administrative boundaries and
  indicator tables, not only facilities, and is a larger piece of work.
- The healthsites.io completeness score is lost. If it turns out to matter, it
  can only come back through a hand-back or a proxy, and [69](69-healthsites-acquisition.md)
  records what each would cost.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Add three widgets, and get facility data from sources a browser can reach |
