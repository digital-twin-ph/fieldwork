# Keep points inside the area

_Created 2026-10-20 · Updated 2026-11-24_

**A spatial operation.** It takes a layer of points and a mask — **a study area or a polygon layer** — and passes on
the points that are inside it.

## What it does

Every point is tested against the mask's outline, and the ones inside come out the other
side. The ones outside are counted and reported, not passed on.

**The mask is a study area or a polygon layer.** Connect one or the other — connecting both is refused, because a
point inside the area and outside every polygon would have no single answer.

A polygon layer is **many** masks, so a point kept by one records **which** polygon held it, in a column you can
name. "Inside the buffer" is not enough when the buffer is 32 stretches of a border and you want to know which
stretch a facility is near. A study area has one mask and nothing to name, so it writes nothing.

This matters beyond tidiness. A buffer wide enough to be interesting often cannot be a study area at all — a 10-mile
buffer around 656 km of border spans more than three degrees, and a study area windows every raster a workflow
reads. Kept as a polygon layer it has no such limit, and this is what lets you clip by it.

The test is the same one the coverage check and the map use. A point counted inside here is inside
there, and a figure you quote from one agrees with the other.

## Why you need it

A source gives you what its own request asked for, and almost every source is bounded by a
**rectangle**: OpenStreetMap's query takes a bounding box, a cloud dataset is read by extent, a
country export is clipped to one. A rectangle is not a jurisdiction. Draw North Kivu — long,
curved, a province of the DRC — and its bounding box covers large parts of Uganda and Rwanda; a
facility search inside it returned 961 places of which 526 stood in the neighbouring countries.

This widget is where that is decided, visibly, on the canvas. Before it existed the decision was
made privately inside whichever widget happened to need it, which meant it could not be seen,
changed, or recorded.

## How to use it

1. Connect the study area to the **area** port and the point layer to the **points** port. Both
   are required: the question is about these points against that area.
2. In **Configure…**, leave **Keep points that sit exactly on the outline** ticked unless you need strict
   containment. **Show me how it works** shows a point inside, one on the outline, one outside and one with no
   location, and what happens to each.
3. Run. The step reports how many were inside, how many sat on the boundary and how many fell
   outside, and passes the kept points on to whatever you wire next.

If every point falls outside, the step refuses and says so with the counts — that usually means
the area is not the one you meant, or the points are somewhere else entirely.

## The one setting

**Keep points that sit exactly on the outline.** On by default. A point on the border is in that
jurisdiction's edge, and silently folding it into one side or the other answers a question nobody
asked. Turn it off for strict containment — which is what the OGC predicate `sfWithin` means, and
it gives a different count on exactly the data where it matters.

## Seeing what it set aside

**Show the excluded points on a connected map.** On by default. They are drawn in the colour the
map already uses for points outside the area, and they are **not** passed to anything downstream —
the next widget receives only what is in the area.

The count tells you how many were set aside. Seeing them tells you whether setting them aside was
right: 526 facilities in a tight cluster over one border is a different fact from 526 scattered in
every direction, and no number distinguishes those.

## What it records

The receipt names the predicate the kept set answers to, whether boundary points were kept, and
three counts: inside, on the boundary, outside. A reader can tell how many the source offered and
how many this area accepted, which is the number a reviewer asks for.

## What it will not do

It does not change a point. Nothing is moved, snapped or rounded; a point either is in the area or
is not.

It does not know why a point is outside. A facility across a border, a coordinate entered the
wrong way round and a geocoding error all look the same to a membership test. The coverage check
is the widget for asking what to do about them, with reasons recorded.

It does not clip polygons or rasters. Those have their own widgets, and they take a study area as their mask.

It does not take two masks. A study area and a polygon layer connected together are refused rather than resolved by
a rule nobody chose.

## Worked examples that use it

None yet. It was built on 2026-10-20, from a defect found in a real study area.

## History

### 2026-11-24 · The mask may be a polygon layer (0.4.0)

Until now every clip in Fieldwork masked by a **study area** — this one, Clip polygons and Clip raster alike — and
nothing could clip by a polygon layer. That left a dead end: a buffer spanning degrees cannot be a study area,
because a study area windows every raster a workflow reads, so it can only be a polygon layer, and no step would
take one as a mask.

Both ports are now offered and neither is required on its own; connecting one is how the mask is chosen. A point
kept by a layer records which polygon held it.


### 2026-11-22 · On the standard, with Show me how (0.2.0)

Its two settings moved into **Configure…**, with **Show me how it works**, and its Inspector became the standard one:
name, inputs, one sentence, and what the last run counted.
