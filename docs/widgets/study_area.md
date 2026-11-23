# Study area

_Created 2026-10-19 · Updated 2026-11-21_

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

The step's panel holds its **Name**, one sentence saying what shape it holds, its **Countries** with **Configure
countries…** where they were not taken from a boundary, and **Select area on map**, which opens the map where the area is
chosen. **Result** says what it
holds, what the boundary repair removed, and every extent it has had. Under that, **Manual**, **Evidence** and
**Version**.

**Countries, one or more.** A study area can lie in several countries, at a border. In **Configure countries…**, add
them from the list, or press **Find the countries**: it proposes the countries the area falls in, each with the share of
the area inside it (*86% Botswana, 14% South Africa*). Tick the ones to keep, press **Use the ticked countries**, then
**Apply**. Nothing is kept until you apply it. A share is of the area as drawn, not of the people in it. The proposal
comes from Natural Earth's outlines, which are generalised to about 10 km, and the share from each country's national
outline from geoBoundaries; a country without a published outline is listed but not measured. Each widget that needs a
country reads the list.

1. Add the node and open it in the Inspector.
2. Press **Select area on map**. Pan to where you are working.
3. Either draw — **Bounding box**, **Polygon** or **Point and radius** — or open **Use an
   administrative boundary**, enter a country, pick a level, press **Check this level**, and choose
   the units you need. Or open **Use a boundary file you already have**, name the property holding each boundary's
   name, and choose a GeoJSON file.
4. Press **Apply study area**.
5. Give it a label that says what it is. The label travels into the receipts.

**Its parts.** An area acquired as administrative units keeps each unit as a part, named as its boundary names it.
The panel's Result says how many, and **View the parts** lists each part's name and id. A table joined to the area is
matched against these names.

**What a level holds.** geoBoundaries numbers its levels ADM1, ADM2 and so on, and the number says nothing of the units:
in one country ADM2 holds counties, in another districts. **Check this level** says the level's own name where
geoBoundaries states one, and, where Census tables holds the country's census, how many units each census level counts
beside this level's. Where no census level, or two together, has as many units, it says so: check what the level holds
before relating the census to it.

Changing the shape later keeps the old one: the Inspector lists every extent you have kept and
restores any of them, which records a new extent carrying the old shape rather than overwriting
anything.

### The boundary repair

Published boundaries sometimes carry two faults that change no outline, and that this step would otherwise refuse:

| Fault | What is removed |
| --- | --- |
| A point written twice in a row | The second copy |
| A zero-width spike: the outline goes out along a line and comes straight back along it | The vertex at the tip |

Neither changes the area any outline encloses. Every other vertex is kept as published. The repair runs on every
boundary as it is read, a downloaded level or a file, and the dialog says what it removed, by district for a spike.

**It is recorded, so it can be redone.** The evidence says how many of the published vertices were removed, by this
rule, and lists each one by unit, kind and position. OCHA's districts of Sierra Leone are the case it was found on:
84 repeated vertices across 14 districts, and one spike about a metre long in Bonthe.

A ring that touches itself anywhere else is not repaired, and is still refused, because that is a different shape.

### Boundaries Fieldwork holds

Some levels are held in [boundaries](https://github.com/digital-twin-ph/boundaries): those the worked examples use,
among them DR Congo's provinces and territories, Rwanda's districts, Brazil's municipalities and the United States'
counties. Choosing one reads it from there, as geoBoundaries published it, checked against what this version names, and
keeps it on this device, so choosing it again needs no network. The status line says so. Any other level is asked of
geoBoundaries, as is a held one that cannot be read.

### What its units are called

Beside its countries, **Its units are called** says, once, what the area's units are: *provinces*, *districts*. Charts
and maps read it where their text says {units} or {unit}. Where it is left empty, the boundary's own name for its level
is used, if it gives one; geoBoundaries gives *Unknown* for some, and a file read from disk none. Editing the area on
the map keeps it, and the countries.

## What it will not do

It does not simplify a boundary you took from a source. A published polygon is a claim about where
a jurisdiction is, and thinning it would quietly change that claim. The boundary repair above removes only what
encloses no area, and says so.

It does not fetch data by itself. It says *where*; a source widget says *what*.

A drawn shape is not a jurisdiction. If your result needs to be about a named place, take the
boundary from a source so the receipt can say whose line it is.

Several selected units stay several shapes. They are not merged into one outline and never become a
bounding box around the group.

It does not refuse units that share a border, or rings that meet at a single point, such as an island touching
another at a corner or a hole touching its outline. Both are valid shapes, and Brazil's municipalities have them. It
refuses shapes whose interiors overlap, and rings that cross or run along each other.

## Worked examples that use it

**Measles in Hagelloch, 1861** uses the village. The four **1854 Cholera Outbreak in
London** workflows each use their own Soho extent, which is why three of them differ.

## History

### 2026-11-23 · The country outline, for context (0.13.0)

A province acquired on its own was drawn with nothing around it, which makes it hard to place. Picking a level below
**ADM0** now offers **Include the country outline, for context**. It is read from the same geoBoundaries release as the
units, as the simplified geometry — DR Congo's outline is 339 KB against 2.4 MB, and a line drawn for context needs no
more — and it carries its own licence, which is not the unit's to inherit.

It is drawn under everything as a line with no fill, and it can be switched off in the layer list like any other layer.
Nothing clips, counts or joins to it: it says where the country is and nothing else. If it cannot be read, the units
are unaffected and the dialog says so.

### 2026-11-22 · A second study area's picker starts empty (0.12.1)

Adding a fourth study area, Rwanda, after South Sudan, DR Congo and Uganda, the boundary could not be applied: the dialog,
reused for every study area, still showed the last one's country, units and terms, with none of what was behind them,
so a unit chosen there answered "Select at least one unit". Each opening now starts the picker empty.

### 2026-11-19 · Holes that touch are accepted (0.9.4)

Rwanda, chosen by a colleague as a study area, was refused with "Interior rings must not contain one another". Two holes
in an outline can meet, and the check asked whether one hole was inside the other from a single corner that lay on the
other's edge, where a point can read as inside. It now asks from a corner that is not on the other hole. A hole inside
another hole is still refused.

### 2026-11-20 · Large boundaries quick to choose; the shape named by its digest (0.10.0)

DR Congo's 26 provinces are chosen, applied and reopened in about a second each, where each took 5 to 7 seconds and
Chrome called the page unresponsive. Every receipt names the shape by the SHA-256 of its GeoJSON instead of writing out
its coordinates, 4.3 MB for those provinces. The dialog's summary counts several polygons. **Its units are called** is
new, read by figures as {units}; an edit on the map no longer drops the countries the area states.

### 2026-11-20 · Boundaries Fieldwork holds (0.11.0)

A level held in the boundaries repository, the worked examples' ten, is read from there, pinned and checked by digest,
and kept on this device, before geoBoundaries is asked. The study area records where its shapes were read.

**Check this level** says what the level holds: its own name where geoBoundaries states one, and its units beside each
level of the country's census in Census tables, saying where none has as many.

### 2026-11-20 · Its parts, by name (0.12.0)

A study area acquired as administrative units says how many parts it holds, and **View the parts** lists each one's
name and id: the names a table joined to the area is matched against.

---

*How this widget is built, and the decisions behind it: [docs/widget-specs/study_area.md](../widget-specs/study_area.md).*
