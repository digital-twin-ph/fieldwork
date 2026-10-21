# Keep points inside the area

_Created 2026-10-20 · Updated 2026-10-20_

**A spatial operation.** It takes a layer of points and a study area, and passes on the points
that are in the area.

## What it does

Every point is tested against the study area's outline, and the ones inside come out the other
side. The ones outside are counted and reported, not passed on.

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
2. Leave **Keep points that sit exactly on the outline** ticked unless you need strict
   containment.
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

It does not clip polygons or rasters. Those have their own widgets.

## Worked examples that use it

None yet. It was built on 2026-10-20, from a defect found in a real study area.
