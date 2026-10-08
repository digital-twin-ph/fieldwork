# 55 · Embedded provenance in exported artifacts

**Status:** design record with a recommendation and one refusal. Nothing implemented.

[Experiment 54](54-degrees-of-reproducibility.md) identified the leak: a figure pasted
into slides or a report travels widely and arrives with no receipt. So the question is
whether provenance can ride inside the artifact — as visible marking, as container
metadata, as a signed manifest, or hidden in the pixels.

Several of those work. They are not equivalent, and the one that sounds most clever is
the one this project should refuse.

## What the exports already carry

Embedding is established practice here, which narrows the question to how far to take it.

- **SVG** figures carry `<title>` and `<desc>` with the map title, subtitle and source
  note ([`src/map-communication.ts`](../../src/map-communication.ts)) — human and
  machine readable, and already part of the accessible rendering.
- **GeoTIFF** exports append a provenance JSON document to the image description:
  schema-identified, with the original raster metadata, the retained input SHA-256, the
  operation performed and the clipping boundary, capped at 60 KB
  ([`src/raster.ts`](../../src/raster.ts)).

So the precedent is container metadata, declared and readable. The gap is the SVG, which
carries prose where it could carry the graph.

## The options, compared honestly

| Mechanism | Carries | Survives re-encoding | Survives a screenshot or a photo of a slide | Reader can verify unaided | Needs infrastructure |
| --- | --- | --- | --- | --- | --- |
| **Visible stamp** (source note, version, basemap vintage) | a few lines | yes | **yes** | yes, by reading | none |
| **SVG `<metadata>` with RDF** | the whole receipt | yes, while it stays SVG; lost on raster export | no | yes, it is text | none |
| **PNG `iTXt` / EXIF** | kilobytes | often stripped by tools | no | with a tool | none |
| **C2PA signed manifest** | a signed manifest with a pixel hash | yes, where tools preserve it | no | yes, and **tamper-evident** | signing keys and certificate management |
| **QR or data matrix in the margin** | ~2–3 kB: digest, version, basemap vintage | yes | **yes** | yes, with any phone | none |
| **LSB steganography** | kilobytes | **no** — destroyed by recompression or resizing | no | no | none |
| **Robust invisible watermark** (DCT/DWT spread spectrum) | tens of bits | yes, mostly | sometimes | no | **a resolver service** |

## Recommendation, in order

1. **Visible stamp.** The only mechanism that survives the actual failure mode — a
   screenshot of a slide — and the only one a reader can check without tooling. The
   application already has `mapSourceNote` to carry it.
2. **RDF in SVG `<metadata>`.** The receipt is already RDF, SVG is XML, and the SVG
   specification anticipates exactly this. It costs nothing but bytes, needs no
   infrastructure, and makes the figure self-describing for anyone who opens it in a text
   editor. This is the clear next step.
3. **A QR code, optionally, for figures destined for presentation.** Ugly, and robust in
   the one case nothing else is: a photograph of a projected slide. Worth offering, not
   worth defaulting to.
4. **C2PA only if authentication is genuinely required.** It is the serious standard for
   this problem and it is the only option in the table that lets a stranger detect
   tampering. It also requires key management and a signing identity, which this project
   does not have and should not improvise.

## The refusal: steganography should not be the mechanism

Three reasons, in increasing order of how much they matter.

1. **Capacity forces a pointer.** A watermark robust enough to survive recompression
   carries tens of bits, not a receipt. So it carries an identifier that must be resolved
   by a service — which reintroduces a network dependency into an offline-first
   application, creates a single point of failure for every figure ever exported, and
   makes a resolver log into a record of who looked at what.
2. **Fragile embedding fails silently.** Least-significant-bit payloads vanish on a
   resize or a JPEG save, with no visible change. That is the same failure class as the
   "Available offline" indicator in [experiment 49](49-catalog-in-the-interface.md): a
   claim that quietly stops being true. Provenance that can disappear without trace is
   worse than provenance that was never there, because its absence is indistinguishable
   from its presence.
3. **Hidden provenance is unauditable, which contradicts the point.** This project's
   entire approach is that claims should be legible and falsifiable by the reader. A
   receipt a reader cannot see cannot be checked by that reader; it can only be checked by
   whoever holds the extraction tool. Making integrity depend on a privileged reader is
   the opposite of what reproducibility is for.

Steganography is the right tool when the goal is for the mark to be *undetectable*. Here
the goal is for the provenance to be *found*, so visibility is a feature.

## Embedding gives continuity, not authentication

Worth stating plainly, because it is easy to oversell. An embedded receipt without a
signature can be edited by anyone who can edit the file. A digest inside an artifact lets
a reader detect a mismatch **only if they can obtain the original to compare**. So
unsigned embedding provides *continuity of description* — the figure says what it came
from — and not *authentication*, which needs C2PA or an equivalent. Any interface text
must say which of the two it is offering.

## The disclosure trap, which is the real finding

Automatically embedding a run receipt into an exported artifact would **violate a rule
this project already has**. [Experiment 35](35-cholera-geoprivacy-workflow.md) states that
a derived-layer download must not include source coordinates, original record identifiers,
source tables or private run receipts — and that whole-project exports and run receipts
remain source-bearing even when the displayed tab shows transformed data.

An embedded receipt is a run receipt inside a file that is designed to be shared. Embedding
it by default would publish the private layer inside the artifact whose entire purpose is
to be the safe one, and it would do so **invisibly**, which is the worst available
combination.

Three hard rules follow:

1. **An allow-list, never a redaction.** The embedded payload is built from an explicit
   list of permitted fields. It is never the receipt minus some exclusions, because an
   exclusion list silently fails to cover a field added later.
2. **The same payload for every export, regardless of workflow.** If what gets embedded
   depends on whether the workflow is "private", then someone has to reason correctly about
   that on every export, and eventually will not.
3. **Seeds are never embedded**, and neither are digests of private inputs. A seed plus a
   method is a reversible displacement, as experiment 54 notes. A digest of a private input
   is worse than it looks: it lets anyone who suspects which dataset was used **confirm**
   it, which is a disclosure even though no data is present.

A defensible allow-list: application version and commit; run identifier; workflow name;
widget identities with versions and catalog digests; basemap source, scale or zoom range,
build date, digest and licence; projection; extent; the reproducibility grade and which
input set it; and required attribution strings. Notably absent: coordinates, record
identifiers, attribute values, seeds, source filenames and input digests.

## Competency questions

Answerable, if this is built:

1. What does this artifact say it came from, without reference to any other file?
2. Which application version, basemap and vintage produced it?
3. Does the artifact's embedded description match the run receipt it claims?

Must be refused:

4. Is this artifact authentic? — unsigned embedding is continuity, not authentication.
5. Does this artifact contain anything about the underlying records? — by construction it
   must not, and that is a rule rather than a reassurance.
6. Can provenance be guaranteed to survive sharing? — no. A screenshot keeps only what is
   visible, which is the argument for the visible stamp and against cleverness.

## Practitioner exercise

Export a figure, open it in a text editor, and see how much of its history you can
reconstruct. Then screenshot the same figure and repeat. The difference between those two
is the part that has to be visible, and it is smaller than most people expect.
