# 125 · Caps below the limit we are testing

_Created 2026-10-19 · Updated 2026-10-19_

**Status:** asked — an inventory, with the measured caps separated from the guessed ones. What to
do about the guessed ones is the open question, and it is a different answer per cap.

## The question

The practitioner, 2026-10-19, after a fixed 6 km envelope refused a street-network download for
Buvuma Island:

> *"It just so happens that that kind of cap will stop practical work being done."*

and then the general form, which is the one that matters:

> *"We are testing the limits of browser based apps. How can we test the limits when our caps are
> impractically low?"*

This project's standing claim is that a browser can do real spatial and epidemiological work
offline. That is a question about where a browser actually breaks. **A cap set below the real limit
is a pre-emptive answer to it** — the practitioner discovers the cap, never the limit, and the
record shows a number somebody chose rather than a number the platform imposed.

## The caps, and which are measurements

| cap | value | measured? |
|---|---|---|
| `NETWORK_NODE_LIMIT` / `_MAX` | 2,000 / 50,000 | **yes** — two real extents, 2026-10-13 |
| `downloadLimits` bytes, features | derived from the graph knob | **yes** — derived from that same measurement, with headroom |
| `MAX_FACILITY_RECORDS` | 20,000 | **yes** — a HOT export and an Overpass query over Metro Manila |
| `MAX_SNAP_SITES` | 100 | **yes** |
| `MAX_ORIGINS` | 10 | **yes** |
| `GEOMETRY_BYTE_BUDGET` / `AREA_BYTE_BUDGET` | 1 MiB / 1.5 MiB | **measured against the wrong store** — see [121](121-storage-beyond-localstorage.md): `localStorage` holds 5,226,496 B where IndexedDB reports 1–10 GB, so the budget is 200–2,000× below the platform. The 40% reserve inside it was a guess and is recorded as one |
| `MAX_TABLE_ROWS` | 2,000 | **no** |
| `MAX_RASTER_CELLS` | 262,144 | **no** |
| `MAX_POINT_LAYERS` | 8 | **no** |
| `MAX_POLYGON_LAYERS` | 6 | **no** |
| workflow size | **50 nodes, 100 edges** | **no** — and it is not even a named constant: an inline literal in `validateWorkflow` with no comment beside it |
| street-network span | was 6 km | **no, and removed 2026-10-19** |

## The one that was removed, and why it is the pattern

The 6 km envelope was the fourth of four numbers that a measurement on 2026-10-13 set out to
reconcile. `maxBytes` and `maxFeatures` were derived from the graph knob that day; the envelope was
left behind, underived and unread by that knob, so raising the limit could not raise it. It
contradicted the principle written beside those caps — *"a sparse area yields fewer junctions per
byte and must not be refused for it"* — because **extent is a proxy for size and a poor one**: the
same box is a dense city or an empty lake. Buvuma Island's bounding box is mostly Lake Victoria.

The module had already made the same mistake once and recorded the lesson. It set Overpass's
`maxsize` to this client's byte cap, which broke a query whose *answer* fitted easily, and concluded
that *"the service's own default is the right budget; what protects this client is the streaming
byte cap below, which is a **real limit on a real quantity**."* The envelope was the same error in
the other direction, and the same sentence resolves it.

That is the test to apply to every row above: **does this cap measure the quantity that actually
runs out?** Bytes and feature counts do. Width does not. Node counts in a workflow do not obviously
measure anything.

## A fifth cap, found by trying to carry the work, 2026-10-20

The encrypted project package refused a workflow over **5,000,000 bytes**. That number was set
when a workflow could not hold much more than that, because its payloads lived in a
5,226,496-byte `localStorage`. Payloads moved to IndexedDB the same morning
([121](121-storage-beyond-local-storage.md)) and a town-sized street network became downloadable
— so the export cap refused the very thing the storage work had just made possible. The
practitioner:

> *"we are setting caps that have not met reality yet and this is a DE project to test the limits
> of browser based field operations."*

The fix is not a bigger number in the same place. **One cap was doing two jobs**, and they are
not the same job:

| | Protects against | Now |
| --- | --- | --- |
| **Export** | nothing — the data is already in memory, already the practitioner's, already on their machine | a ceiling, not a judgement: refusing to write a file they asked for caps their own work |
| **Import** | a crafted package that advertises a small compressed size and decompresses into gigabytes | a defence, kept, set at the export ceiling so anything this application writes it can read |

**Measured on the way past**, in Chromium, on a 40,000-junction graph — larger than the whole old
cap — by a test that now fails if it stops being true:

| | |
| --- | --- |
| Package written, Chromium | **8.17 MB in 2.4 s** |
| Package written, WebKit | **8.17 MB in 10.9 s** — four times slower |
| Opened, verified and saved on a clean device | **~1.5 s**, both engines |

The new ceiling is 64 MB, which is eight times the largest thing measured through it. That is
stated rather than claimed: between 8 MB and 64 MB is untested ground, and the honest position is
that nobody has carried a package that large, not that one will work.

**And the round trip found two defects in the morning's storage work**, neither of which any unit
test could have reached. An imported project carries both the data and the reference, and its
payload has never been seen on the receiving device: dehydrating it on the first save left a
reference pointing at nothing, so the project vanished on the next reload. The fix — write the
payload on the way past — then failed in its own way, because the snapshot of what the store held
was taken BEFORE the write rather than after, so an 8 MB workflow was kept inline and sent into a
5 MB store. Both were found by carrying a real project between two browsers, which is what the
practitioner asked for.

## A limit that is not a cap at all, 2026-10-20

The practitioner: *"I tried to download North Kivu ADM1 study area and I think process hangs."*
It does not hang in Chromium — it goes silent for about eight seconds and completes. In **WebKit
the page dies**, reproducibly, and the threshold sits inside the range of real published
jurisdictions.

Measured with the level served from a fixture, applying one DRC province as a study area:

| Province | Vertices | WebKit |
| --- | --- | --- |
| Mai-Ndombe | 1,665 | applied in 0.2 s |
| Tshuapa | 6,231 | applied in 1.1 s |
| Kwango | 15,236 | applied in 5.7 s |
| **North Kivu** | **16,548** | **the page crashed** — see below |

The cost grows faster than the vertex count, and somewhere between 15,236 and 16,548 vertices the
engine stops surviving it. North Kivu is the largest of the 26 provinces; Ituri, next door, is
7,760 and applies in about a second.

Two things follow, and they pull in opposite directions.

**This is the limit this project exists to find.** Not a number somebody chose in advance — a
published administrative unit that a browser cannot hold open. It is worth saying plainly that
the artefact is the browser, not the data: 385,620 bytes of coordinates is nothing to a server.

**And a crash is worse than a refusal.** The vertex contract says admit whole or refuse by bytes,
and it was right to remove simplification — moving 0.82% of a unit across its own edge is a
membership error in exactly the question an outbreak asks. But a crash takes the workflow with it
and tells the practitioner nothing.

### What it actually was, found by profiling

Reading the code produced four wrong guesses: the reasoner (0.7 s), the geometry validation
(0.08 s), a megabyte of GeoJSON text in the DOM (no measurable effect), and SVG versus canvas
rendering of the outline (no measurable effect). The CPU profile answered it in one run.

Of 6.5 s sampled while a boundary landed: **3.3 s in the browser's own layout**, **492 ms in
Leaflet's `_listens`**, with `_initIcon` and `_setIconStyles` beneath it. The dialog was building
**one draggable marker per vertex** — 16,547 divs, each with its own listeners — so that a
practitioner could drag the corners of a shape they had not drawn and must not edit, since the
geometry is as published and editing it is what the provenance records as a modification. This
project's own arithmetic was never in it: `crossingFault` sampled at 35 ms, `validateDrawnGeometry`
at 17 ms.

Handles are capped at 400, which is far more than anybody draws by hand, and an outline above it
is drawn without them and says so.

**And that cap was the wrong rule, stated an hour later by the practitioner:** *"If it's a
jurisdictional polygon as a study area, I don't think we should make the vertices draggable. That
would be changing the shape, provenance and authoritativeness of the polygon."* A limit by vertex
count answers the performance question and misses the point — a district of 40 vertices sits far
below any cap and would still have offered the gesture. **Whose shape it is** decides, not how
many points it has. An acquired outline now carries no handles at whatever size, and says so; the
400 remains beneath it for a large geometry that arrived by some other route.

| | Before | After |
| --- | --- | --- |
| Apply North Kivu, Chromium | 8.2 s | **0.7 s** |
| Apply North Kivu, WebKit | the page crashed | **0.6 s** |

So the limit was never the data, the browser or the vertex contract. It was a control built once
per vertex, and the measurement that found it took one profile after half a day of plausible
reasoning about the wrong things.

## What this does not establish

- **That any specific unmeasured cap is wrong.** 2,000 table rows may be exactly right. The claim
  is that nobody knows, not that the number is bad, and four of these were set without a recorded
  basis.
- **That raising a cap is free.** A browser tab that becomes unresponsive is a worse failure than a
  refusal, because the practitioner loses unsaved work and has nothing to read. Refusing early is a
  real design position; it is just not one that can be held on an unmeasured number while claiming
  to be testing the platform.
- **That the 50-node workflow limit binds anyone today.** The largest worked example is fourteen
  nodes. It is listed because a composition explodes into its members and a project now holds
  several workflows, so the number is closer than it was, and because an inline literal with no
  comment is how a limit becomes invisible.
- **Nothing about the browser's actual limits.** Not one number in the right-hand column above came
  from asking a browser to fail. Even the measured ones measured a service or a file, not the
  platform.
- **That one policy fits them all.** A cap protecting a public service is a courtesy obligation; a
  cap protecting the tab is an engineering limit; a cap protecting a practitioner from a slow
  result is a judgement. The table does not distinguish them and should.

## What would close it

1. For each unmeasured cap, either record the measurement that justifies it or say in the code that
   it is a guess. A number with neither is the defect; a number declared as a guess is honest and
   can be revisited.
2. Make a cap name the measured value when it refuses. The envelope said "at most 6 km across" and
   never said what the area actually was, while the study area already carries a derived
   `spanMetres`.
3. Settle [121](121-storage-beyond-localstorage.md), which is this question for the single cap
   where the gap between the chosen number and the platform is known to be three orders of
   magnitude.
4. Give the workflow-size limit a named constant and a comment, so the next reader can tell whether
   50 was chosen or inherited.
