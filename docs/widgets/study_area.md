# Study area

_Created 2026-10-19 · Updated 2026-10-19_

**An input widget.** It defines where your work takes place: one shape, kept on this device, that
every later step can be scoped to.

## What it does

A study area holds one piece of geography and makes it available to the rest of the workflow. You
can draw it, or take it from a published administrative boundary.

**Drawn.** A bounding box, a polygon you click out, or a circle around a point. Quick, and it is
yours — nothing outside the workflow knows what it means.

A drawn shape cannot be fetched by anybody else, so the thing worth recording about it is **who
drew it**. If a GitHub login is set on the area, the receipt names that person as the author of the
geometry and says whether the login was simply entered here or confirmed by GitHub. With no login
set, nobody is named: the receipt reports the shape and leaves the author blank rather than
assuming it was whoever opened the file. This also applies if you take a published boundary and
then move it — the source is credited for what the shape came from, and you are credited for the
shape.

**From a boundary source.** Chosen by country and level from geoBoundaries: ADM1 is usually a
province or region, ADM2 a district or city, and what each level means differs by country. The
level is checked before anything is downloaded, so you see how many units there are and how
detailed they are before committing. You then pick the units you want, and the shape you get is the
one the source published, vertex for vertex.

The shape is stored in longitude, latitude order (CRS84). Applying it writes N3 facts you can read
in the **N3 & evidence** tab.

## What you connect

It has no input. Its output is an `area`, which the map, the buffer, the raster window, the
facility search, the point grid, the coverage check and the area measurement all accept.

## How to use it

1. Add the node and open it in the Inspector.
2. Press **Choose study area**. Pan to where you are working.
3. Either draw — **Bounding box**, **Polygon** or **Point and radius** — or open **Use an
   administrative boundary**, enter a country, pick a level, press **Check this level**, and choose
   the units you need.
4. Press **Apply study area**.
5. Give it a label that says what it is. The label travels into the receipts.

Changing the shape later keeps the old one: the Inspector lists every extent you have kept and
restores any of them, which records a new extent carrying the old shape rather than overwriting
anything.

## What it will not do

It does not simplify a boundary you took from a source. A published polygon is a claim about where
a jurisdiction is, and thinning it would quietly change that claim.

It does not fetch data by itself. It says *where*; a source widget says *what*.

A drawn shape is not a jurisdiction. If your result needs to be about a named place, take the
boundary from a source so the receipt can say whose line it is.

Several selected units stay several shapes. They are not merged into one outline and never become a
bounding box around the group.

## Worked examples that use it

**Old Naledi · diagnostic access** uses a drawn settlement boundary. **Old Naledi · raster
clipping** scopes a population raster to the same shape. The four **1854 Cholera Outbreak in
London** workflows each use their own Soho extent, which is why three of them differ.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/study_area.md](../widget-specs/study_area.md).*
