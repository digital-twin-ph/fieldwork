# 125 · Caps below the limit we are testing

_Created 2026-10-19 · Updated 2026-10-25_

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
| `NETWORK_NODE_LIMIT` / `_MAX` | 50,000 / 1,000,000 | default **yes** — two real extents, 2026-10-13; ceiling **no**, and see below: it was 50,000, the default itself, until 2026-10-21 |
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

## The ceiling was the default, 2026-10-21

The inventory above records `NETWORK_NODE_LIMIT / _MAX` as **2,000 / 50,000** and marks it
**measured**. The default was raised to 50,000 on 2026-10-20 for exactly this experiment's reason.
What nobody checked that day is that `NETWORK_NODE_LIMIT_MAX` was also 50,000 — *the ceiling and
the default were the same number*. So the knob could be lowered and never raised, and the byte cap
derived from it, `50,000 x 600 = 30.0 MB`, was a hard limit on every download in the application.

It was met on 2026-10-21:

> *"The street network download for Ituri province capped at 30MB and stopped."*

and then the argument, which is the one this experiment exists to carry:

> *"And if we can't download street networks for provinces we will never know how far this
> application can go because of an imagined cap."*

Imagined is the right word for it. 600 bytes per junction is roughly double the 270–272 B/junction
measured on two extents, carried as headroom; nothing was ever measured at 30 MB, so the cap was a
projection of a measurement, enforced as a boundary, with no way past it. The largest graph this
project has actually downloaded, parsed and drawn remains the isochrone extent: **7.39 MB, 50,791
features, 27,181 junctions**. Everything above that is unknown, and the cap guaranteed it stayed
unknown.

**What changed.** `NETWORK_NODE_LIMIT_MAX` is now 1,000,000 junctions — about 600 MB at the padded
rate, which the large store can hold and which a public Overpass instance is unlikely to serve in
one request anyway. The default is untouched at 50,000, so nobody who leaves the knob alone sees a
difference. Above `NETWORK_MEASURED_NODES` the widget states what is not known — that the tab may
stop responding, that a failed download saves nothing, and that this is the experiment rather than
a reason to refuse — instead of enforcing a number nobody derived.

**The pattern, stated once more.** Two of the caps in the table above were raised by this argument
and a third was removed by it. The one that bit this time was not in the table at all, because the
inventory recorded the pair as one row and read the measured half. A ceiling equal to its own
default is invisible in any list that prints the default.

## A number, at last: Ituri is over 60 MB, 2026-10-21

The ceiling was raised the same day, and the practitioner immediately used it: graph limit from
50,000 to 100,000, which moves the byte cap from 30.0 MB to 60.0 MB. The download was cut again.

> *"Doubling to 100000 did not help."*

That is the first measurement past the isochrone extent this project has ever had, and it is worth
writing down plainly: **a walking street network for Ituri Province is more than 60 MB of Overpass
JSON.** Not "too large" — over 60,000,000 bytes, read off a stream that was stopped there. How much
more is still unknown.

It also shows what doubling costs. Each attempt is a complete download of a donated public service's
work, up to the cap, thrown away: 30 MB, then 60 MB, with no way to tell what the next guess should
be. A client that can refuse but cannot say how much would be enough makes the practitioner pay for
the search in someone else's bandwidth.

**The count was already there and was counting the wrong thing.** Since 2026-10-20 the widget asks
Overpass `out count;` before every download. It counted the WAYS the filter matches — and a street
download returns the ways plus every node they reference, which is most of the bytes. So a ways
count can sit well inside every limit for an area whose response is 60 MB, which is exactly what
happened twice. The count now recurses (`>;out count;`) and reports the elements that would actually
be sent, which costs the service a recursion and saves it a serialization.

With that number, 150 bytes per element — measured, unpadded, on the same two extents that gave the
per-junction rate — turns the count into megabytes, and megabytes into the graph limit that would
accept it. The refusal names it: *this area holds N ways and M elements, about X MB, set the graph
limit to Y junctions or draw a smaller area.* One cheap request instead of a sequence of expensive
ones, and the answer rather than a direction to guess in.

**And the mode was never in the conversation.** Said straight after, on the same download:

> *"At the province level we are not even looking at walking mode. It will be driving mode."*

Right, and the client had no way to say so. Walking keeps footways, paths and steps and driving
drops all three, so the two modes are different sizes for the same bounds — and the count is
already mode-specific, because the count query carries the same filter the download does. So a
refusal now spends one more count on the other mode and reports it: whether it fits at the current
setting, or that neither does. The mode a province needs is now a number the practitioner is given
rather than one they would discover by downloading 60 MB in the wrong mode.

**What is still a projection.** 150 B/element comes from two extents of 1.42 MB and 7.39 MB. Ituri
is at least eight times the larger one, and nothing says the rate holds there — denser tagging, more
nodes per way, different mix of highway classes. The refusal says so in its own words rather than
presenting a prediction as a measurement.

## One number, one question, 2026-10-21

The province downloaded. At a graph limit of 500,000 the byte cap is 300 MB, the count passed, the
response arrived, it parsed, and it normalized to **1,837,939 junctions and 3,755,832 directed
segments** — and `validateNetwork` threw it away, citing the knob.

> *"Still did not work, and I don't think the isochrone exercise in London should dictate a cap.
> That is a totally unrelated problem to this one, and an isochrone activity is not even assumed at
> this point."*

Both halves are right, and this file had already written the first one down. The comment above
`NETWORK_NODE_LIMIT` says the limit exists because isochrone construction exhausted a 4 GB heap at
5,249 junctions, that a network which is drawn, snapped to or routed over never meets that cost,
and that the isochrone carries its own worker, boot check and timeout. Having said all of it, the
code then enforced the isochrone's number on every network in every workflow.

And it enforced it in the worst possible place: **after** the download, the stream, the parse and
the normalization. Every byte and every allocation had already been paid for. A cap that fires
there is not a guard; it is a way of spending the cost and refusing the result.

**The division, stated.** A download is bounded by the byte cap, before the bytes are spent, by a
number the practitioner sets. An isochrone is bounded by the isochrone. A saved graph is bounded by
the store, which refuses in its own words. A graph in memory, between those, is allowed to be the
size the area is.

**What the province measured, which nothing here had.** 300 MB for 1,837,939 junctions is about
**163 bytes per junction**, against the 600 this project derives its download cap from — padded by
nearly four times at this scale. The segment ratio is 2.04 against the assumed 2.5, which holds.
Both are now one-extent measurements of a province rather than projections from a neighbourhood,
and they say the byte cap is far more conservative than it reads.

**What came with it.** The 30,000-vertex cap on edge geometry, same shape and same place. And the
Inspector picture, which would have built a path element per segment and spread 1.8 million
coordinates through `Math.min`: it now folds the bounds and draws an even sample of 20,000
segments, with the caption saying the drawing is a sample while the numbers are the network. That
is a limit on a 292-pixel figure, which is a real limit on a real thing.

## What this does not establish

- **That a province-scale download works.** It establishes that one can now be attempted, and
  that Ituri's is over 60 MB. Nothing above 7.39 MB and 27,181 junctions has been downloaded in
  full, parsed, drawn, routed over or saved by this application.
- **That the province graph is usable.** It downloads, parses and normalizes. Nothing has drawn
  it on the map, routed over it, snapped to it or saved it to the store, and each of those is its
  own measurement.
- **How large Ituri actually is.** The earlier streams were stopped at the cap, so 60 MB was a
  floor and not a size; 300 MB at a 500,000 knob is the first complete response. The element count from the recursed count request would give a prediction;
  nobody has read one for this area yet.
- **That 1,000,000 junctions is a measured ceiling.** It is a number chosen to be past what a
  public service will serve in one request, so that the service and the device do the refusing
  instead of this client. It is the same kind of number as the one it replaced, and it is marked
  as such here rather than in a comment.

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
