# 54 · Degrees of reproducibility

_Created 2026-10-08 · Updated 2026-10-08_

**Status:** audit and proposed grading. The audit is of shipped code; the grading is
specified and unbuilt.

[Experiment 53](53-reproducible-maps.md) treated reproducibility as a property a figure
either has or lacks. It is not. **Reproducibility is a property of each input, and a
figure inherits the weakest one** — which makes it a continuum, and makes the honest
question not "is this reproducible" but "to what degree, limited by what".

The stakes vary too, and in a direction that matters: a map glanced at on a phone in the
field needs almost none of this, and a figure in a technical report, a publication or a
presentation needs nearly all of it. The same application produces both.

## A ladder of input classes

| Class | Means | Example in this project |
| --- | --- | --- |
| **Retained** | The bytes travel with the workflow, digested | Input data points, the study-area geometry, a normalised street network — all embedded in workflow parameters and exported |
| **Pinned** | Content-addressed and obtainable by digest, bytes not necessarily retained | A raster asset recorded with `sha256`, byte count, filename and window; a pack file at a catalog-pinned commit |
| **Versioned** | Identified by a release or build that exists upstream | Natural Earth at a release; a PMTiles build date and digest; the AR6 dataset at version `20210809` |
| **Dated snapshot** | Fetched at a time from something that is not versioned | An Overpass extract — mitigated here, see below |
| **Seeded** | Regenerable from a recorded seed and the code version | Donut geomasking at `seed: 42` |
| **Live** | Named by a service, not identified at all | `basemap: "osm"` — tiles replaced upstream continuously |

Two things follow immediately. **A figure's grade is the minimum over its inputs**, so
one live input defeats five retained ones. And the grade is **capped by producer
identity**: if the receipt does not say which application version drew the figure, no
input class can raise it above "re-renderable in principle", which is experiment 53's
first missing field.

## Reproducibility decays, so retention is an operation

A grade is not fixed at render time. "Versioned" depends on the version remaining
obtainable, and upstream retention is often short — Protomaps keeps daily builds for a
week, plus weekly Monday builds for a month. A figure that was *versioned* in October is
*unreproducible* in December unless somebody kept the file.

So **retention is the operation that converts versioned into retained**, and for a
publication it is not optional: the bytes have to be kept, or deposited, which is exactly
what data-availability statements ask for. The practical consequence is that a figure
intended for publication should pull its basemap down into the retained class at the time
of publication, not rely on a URL surviving.

## Audit: this project is already near the top, except for one input

Measured against the ladder, from shipped code:

| Input | Class | Evidence |
| --- | --- | --- |
| Point data, study area, attributes | **Retained** | embedded in workflow parameters and in the export |
| Street network from Overpass | **Retained**, with an upstream vintage | the normalised graph is embedded, and provenance records provider, `ODbL-1.0`, attribution, the query, bounds, `retrievedAt`, a SHA-256 of the response **and `osmTimestamp` from `osm3s.timestamp_osm_base`** — the upstream data timestamp, not merely the fetch time ([`src/street-network.ts`](../../src/street-network.ts)) |
| Raster asset | **Pinned** | `sha256`, bytes, filename, source metadata and window ([`src/raster.ts`](../../src/raster.ts)) |
| Geoprivacy transforms | **Seeded** | the seed is a visible computation parameter |
| Widget definitions | **Pinned** | `fw:widget`, `fw:catalogVersion`, `fw:catalogDigest` per node |
| Reasoner | **Versioned** | `EYE-JS 21.1.24 (WASM)` in the run receipt |
| **Basemap** | **Live** | `basemap: "osm" \| "topo"`, a service name |
| **Producer** | **Absent** | no application version or commit in the receipt |

The Overpass handling deserves note because it is the pattern the basemap should follow:
a source that is not versioned upstream was *converted* into a retained, digested,
vintage-stamped input by embedding the normalised result. Nothing about tiles makes that
impossible — a PMTiles archive with a build date and digest is the same move.

So the finding is narrow and actionable: **every Fieldwork figure that shows a basemap is
currently capped at the bottom of the ladder by that one input, while everything else it
draws is retained or pinned.** The cheapest large improvement available anywhere in these
records is to raise one input and add one field.

## Required grade by destination

Stakes should select the requirement, declared when the figure is made rather than
discovered at review:

| Destination | Minimum grade | Also required |
| --- | --- | --- |
| On-screen during fieldwork | Live acceptable | nothing; orientation is the only job |
| Internal working note | Dated snapshot | the run receipt kept with the figure |
| Technical report | Versioned, producer identified | attribution, basemap vintage, data-source note |
| Peer-reviewed publication | **Retained**, producer identified | bytes deposited or kept; licences permitting redistribution |
| Presentation | **Retained**, and legible on the face of the figure | see below |

Presentations are the awkward case and the most common one. A figure pasted into slides
as a raster image loses the receipt entirely: the machine-readable provenance does not
travel, while the figure travels widely. That argues for a **visible minimal stamp** —
source note, application version, basemap and its vintage — rendered into the artifact
itself. The application already has `mapSourceNote` for exactly this kind of text, which
makes the fix a matter of what it is populated with rather than new machinery. The mechanisms for carrying
provenance inside an artifact — visible text, RDF in the SVG container, a signed manifest,
or hidden in the pixels — are compared in
[experiment 55](55-embedded-provenance.md), which recommends the first two, refuses the
last, and finds that embedding a receipt by default would breach an existing privacy
rule.

## Constraints on grading

1. **Derived, never asserted.** A grade must be computed from the receipt, per input, and
   inspectable input by input.
2. **Never a badge.** [Experiment 49](49-catalog-in-the-interface.md) refused to show pack
   admission state in the interface because a state displayed without its basis is a trust
   badge the application cannot stand behind. A single-word reproducibility grade would be
   the same mistake; the per-input table is the artifact, and any summary must be
   expandable into it.
3. **Reproducibility is not validity.** A fully retained figure can be wrong in every
   substantive way: wrong projection, wrong classification, wrong denominator, or a map
   that should never have been drawn. Grading provenance completeness says nothing about
   the map, and a high grade must not read as endorsement.
4. **No grade for data that should not be published.** Geoprivacy transforms are seeded
   and therefore reproducible, which is a reason for care and not for confidence: a
   reproducible displacement is a reversible one given the seed.

## The gate this allows

Extending experiment 53's proposed check rather than adding another: compute the grade
from an exported receipt, and assert it in tests. A worked example declares the grade it
claims, the gate recomputes it from the receipt alone, and a figure that claims
publication grade without producer identity or with a live basemap fails. That turns this
whole record from advice into something that breaks the build when it stops being true.

## Competency questions

Answerable, once grading exists:

1. What is this figure's reproducibility grade, and which input sets it?
2. Which inputs would have to be retained to raise it to publication grade?
3. Has any input's grade decayed since the figure was made?

Must be refused:

4. Is this figure correct, or peer-reviewable? — grading is about provenance
   completeness, nothing else.
5. Will a retained figure stay reproducible indefinitely? — retention is a commitment
   somebody has to keep, not a property of the file.
6. Does a reproducible privacy transform mean it is safe to publish? — no, and the
   inverse is closer to true.

## Practitioner exercise

Take a map you have already published or presented. Grade each of its inputs against the
ladder above, then identify the weakest. For most published public health figures the
weakest input is the basemap, and almost nobody records it — which is the gap this record
exists to make visible rather than to scold anyone about.
