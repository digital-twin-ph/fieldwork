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
