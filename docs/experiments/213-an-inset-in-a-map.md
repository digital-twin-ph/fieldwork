# 213 · An inset in a map

_Created 2026-11-14 · Updated 2026-11-14_

**Status:** asked — design and admission review, written before the code.

## The question

MERS-CoV, South Korea, 2015: *Where were the cases in hospital?* Twelve hospitals, most in Seoul and Gyeonggi, a few
kilometres apart on a map of the whole country. Colour by keeps a busy hospital from hiding its neighbours under a large
mark (0.110.0, and in the static map from 0.113.1), but at the scale of the country their marks still overlap. The
practitioner, 2026-11-13: *"For MERS hospitals, how do you configure an inset in a map I think that also deserves an
experiment."*

So: **can a Map show a part of itself enlarged, in a frame of its own, on the same figure?**

## What exists

| | Shows | An enlarged part |
| --- | --- | --- |
| Map, one map | every layer over one frame | no; the interactive map can be zoomed, a figure cannot |
| Map, panels (212) | one layer per panel, one frame for all | no; every panel shows the same extent |
| Comparison map | two point layers, original and moved | no |

## The design

An arrangement of Map, beside *one map* and *panels* (212): **one map with an inset**.

1. **Where the inset looks.** In Configure…, under **Arrange**, *One map with an inset* opens the preview with a box to
   draw over it: the part to enlarge. Or one of the study area's own parts is chosen by name, such as *Seoul* and
   *Gyeonggi*, and the inset frames them. The box is stored in longitude and latitude, with the parts it was taken from
   where it was.
2. **Where the inset sits.** A corner of the figure, top left, top right, bottom left or bottom right, chosen where it
   covers least of what is drawn; and its size, a third or half of the figure's width.
3. **What it draws.** Every layer the map draws, in the same marks, the same colours and **the same classes**, only
   larger: a hospital in the inset is the shade it is on the main map.
4. **How a reader finds it.** The box is drawn on the main map, and the inset is framed in the same line, so the two are
   read as one place. The inset carries its own scale bar, because its scale is not the main map's.
5. **Interactive.** The interactive map can already be zoomed, so it shows no inset; it offers *Go to the inset*, which
   moves the view to the box.
6. **The first case** is MERS's hospitals: the inset on Seoul and Gyeonggi, where nine of the twelve are.

**Not in this experiment:** several insets; an inset at another projection; a locator map (the main map small, beside
a large part), which is the same frames the other way round and may follow.

## Admission review

D1: no new widget. Map gains an arrangement, the one Arrange already offers for panels. The practitioner asks for it by
name ("an inset").

| Distinction | Enforced as |
| --- | --- |
| The inset is the same data on the same scale of values: one shade, one number | **hard stop**: the inset is drawn from the main map's own classes, never classed again |
| The inset's scale of distance is its own | **validation rule**: an inset is drawn with its own scale bar, and its box on the main map |
| The inset's box lies inside the main map's frame | **validation rule**: a box outside it is refused in Configure… |
| An inset enlarges; it does not add detail the data lacks | **limitation**, said nowhere on the figure: a drawn mark is no more precise for being larger |

## What it commits to, written before the result

- A unit test: a box, its frame in a corner, every layer projected into it; the inset's marks take the main map's
  classes.
- A browser test: MERS's map with an inset on Seoul and Gyeonggi, its box drawn on the main map, every hospital in the
  inset at least a mark's width from the next, and both marks of one hospital the same colour.
- **Practitioner observation, which can come out badly:** shown the figure, can the practitioner find a given hospital
  in the inset and say which hospital on the main map it is?

## What it does not establish

That an inset is better than framing the map on the hospitals alone, or than an interactive map, for a reader of this
figure. That a reader reads the inset's scale bar rather than assuming the main map's.
