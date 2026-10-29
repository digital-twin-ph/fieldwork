# Polygon layer

_Created 2026-10-28 · Updated 2026-10-29_

**An input widget.** It supplies a layer of polygons — many areas, each with its own name and
attributes — as distinct from a study area, which is the single boundary your work sits inside.
Sub-districts, water bodies, supply zones, parishes, building footprints: anything that is a set of
areas rather than one frame.

## Two ways in

Choosing one shows that method's controls and hides the other, so the panel describes the path you
are on.

**A published GeoJSON layer.** A `FeatureCollection` of polygons and multipolygons you already
have. It is read exactly as published.

**Areas from a published `.osm.pbf` extract.** An OpenStreetMap extract — Geofabrik's country and
region files, or any other — chosen with the file picker. You say which kinds of area you want and
the widget reads those, within your study area's bounds.

## What it does

It reads polygons into the workflow and emits them as a polygon layer, which maps, tables, charts
and every polygon step already accept.

**Read as published.** Nothing is clipped, simplified or reprojected. A file whose coordinates are
not longitude and latitude in degrees is refused rather than converted, because a converted shape
is not the shape its author published.

**Which property names each feature** is yours to choose, and is never guessed from a property
name. Leave it unset and the features are numbered. Name a property the file does not carry and the
import is refused rather than silently leaving the names blank.

**Reading from an extract** needs a study area connected, because the study area is the scope: its
bounds, widened by the margin you set, are the box the widget reads. The extract file is read where
it sits and is never copied into this browser — only the areas it yields are kept, and they are
kept on this device by digest rather than inside the workflow, so a large layer does not crowd out
everything else you have saved.

**Which kinds of area** is a closed list, because each entry is a claim about which OpenStreetMap
tags mean an area of that kind. Water covers lakes, rivers, basins and docks. Buildings covers
anything tagged as a building. Nothing is matched on a feature's name.

**A vertex threshold.** A kind on its own is usually too coarse: water over a London-sized box
returns about a thousand features, most of them ponds, basins and ornamental lakes. Setting a
minimum number of vertices keeps the large features and leaves the small ones unread. If what you
asked for is more than a layer can hold, the refusal tells you which threshold would fit, worked
out from the features actually found rather than guessed, so the second attempt is informed.

**The licence travels with the layer.** Areas read from an OpenStreetMap extract are ODbL, which is
share-alike: a figure built on them carries the same terms, and its credits must name
OpenStreetMap. The panel and the run's receipt both say so, and the attribution is attached to the
layer rather than remembered separately.

## How to use it

**From a file.** Add the widget, leave the method on *A published GeoJSON layer*, and choose your
file. The panel then shows how many features and vertices it read. If your features carry a name,
type that property's name into *Which property names each feature* before you choose the file.

**From an extract.**

1. Add **Study area** and define it, then connect it on the widget's *Study area* control. The
   panel shows the box it will read from, so you can see what the margin does before anything is
   read.
2. Tick the kinds you want.
3. Set the margin if the features you need reach outside your bounds. A river's course, a reservoir
   or a lock can sit kilometres beyond the edge of a study area and still belong to the question.
   There is no ceiling: a larger box costs you a slower read, and the read is local.
4. If you do not have an extract, use the download button the panel offers. It names the smallest
   catalogued file that covers your box and your browser downloads it directly — this application
   cannot fetch it for you, because that host does not permit it. Come back to the file picker when
   it has landed.
5. Choose the file. The read runs in the background and reports each stage; the page stays usable
   while it works, which matters because a large extract takes several seconds at least.
6. Read what the panel says came back: how many features, how many vertices, how many were below
   your threshold, and how many fell outside the box. If the counts surprise you, change the
   threshold and read again.

**Moving the study area afterwards.** A layer read for one study area is refused for another: if
the area grows past the box the layer was read for, the run stops and says so rather than drawing a
map with a hole in it. Read the extract again. The file is not kept, so this means choosing it
again — the panel records its name and digest so you know which file to look for.

## What it will not do

**It will not clip.** The box decides which features are read, in or out; it never cuts one. A
feature that crosses the edge of your study area arrives whole. Clipping is a separate step you
choose and a receipt records.

**It will not reproject.** A layer in metres, a national grid or any projected system is refused.
Convert it before you bring it in, so the conversion is yours and is recorded.

**It will not find features by name.** Searching an extract for "Thames" is not available, and is
not an oversight: a name is not a reliable statement of what something is. You ask for a kind, and
you get every area of that kind in the box.

**It will not fetch an extract for you.** The file has to be on your device. The widget works out
which published file covers your box and links it; your browser does the downloading.

**It will not keep the extract.** Only the areas read out of it are kept. Reading again means
choosing the file again.

**How many features is not a limit.** It was, until 2026-10-29: a read stopped at five hundred,
and a practitioner holding the Greater London extract on their own disk was refused 606 water
features. The number stood on a definition — that past it "a layer is a basemap rather than a
study's own geometry" — and on a vertex budget that is checked separately, on its real total. What
refuses now is vertices, two hundred thousand of them, because that is the thing that costs. The
refusal tells you which vertex floor would fit, read off the features the read actually found.

## Choosing which features to keep

A read of a published extract gives you everything of the kinds you asked for inside your box.
Greater London's water areas are 606 features; the Thames is two of them. The rest are ponds,
basins and a boating lake.

**Choose features** opens a viewer: every feature the read returned, as a row, beside a map of
all of them. Select a row and its polygon is marked on the map, so you can tell which one it is
before deciding. Clear a row's box and that feature leaves the layer.

Nothing is deleted. The read is unchanged, so a feature you set aside comes back by ticking it
again rather than by reading 124 MB a second time. The receipt records how many the read returned
and how many you set aside, because a layer of two drawn from a read of 606 is a choice, and a
reader of your evidence should be able to see that you made it.

Setting every feature aside is refused: a layer that holds nothing is not a layer.

*Why looking rather than typing:* the first design for this filtered at read time by a property
name and a list of values. You cannot name values you have not seen, and nobody knows in advance
what OpenStreetMap calls the boating lake.

## Worked examples that use it

**Snow's South London water supply study, 1854** reads the registration sub-districts and the two
reaches of the Thames as layers inside one study area, which is what lets the tidal and non-tidal
reaches be drawn as separate exposures.
