# 213 · An inset in a map

_Created 2026-11-13 · Updated 2026-11-14_

**Status:** asked — design and admission review, written before the code.

## The question

MERS-CoV, South Korea, 2015: *Where were the cases in hospital?* Twelve hospitals, most in Seoul and Gyeonggi, a few
kilometres apart on a map of the whole country. Colour by keeps a busy hospital from hiding its neighbours under a large
mark (0.110.0, and in the static map from 0.113.1), but at the scale of the country their marks still overlap. The
practitioner, 2026-11-13: *"For MERS hospitals, how do you configure an inset in a map I think that also deserves an
experiment."*

So: **can a Map show a part of itself enlarged, in a frame of its own, on the same figure?**

## Decided 2026-11-14

Built now, on the practitioner's go-ahead (*"Build 213 now"*), with a second case. Of the Oswego example: *"We can use
Map inset here."* So the two arrangements have one case each: **the inset**, a zoomed view of Seoul and Gyeonggi beside
the map of South Korea, for the MERS hospitals; and **the Locator**, the map of Lycoming with a small map of New York
State marking where it is, for Oswego.

## What exists

| | Shows | An enlarged part |
| --- | --- | --- |
| Map, one map | every layer over one frame | no; the interactive map can be zoomed, a figure cannot |
| Map, panels (212) | one layer per panel, one frame for all | no; every panel shows the same extent |
| Comparison map | two point layers, original and moved | no |

## The design

The inset is a part of the **static figure**. The interactive map needs none, because it can be zoomed, and it is where
the part is chosen. The practitioner, 2026-11-13: *"For map inset I think only the static map needs one. But how to pick
the part that goes into the inset is the question. I am thinking inset picker on the interactive map. The picked view
becomes the inset with the zoomed in portion with a pointer to the zoomed out map section."* (An earlier draft of this
record, the same day, drew an inset on both presentations and picked the part with a box drawn in Configure…'s preview;
both are replaced.)

1. **Picked on the interactive map.** On the interactive map of the Map step, pan and zoom to the part to enlarge and
   press **Use this view as the inset**. The view on screen becomes the inset's box, stored in longitude and latitude.
   Shown again, the interactive map draws the box, and **Clear the inset** removes it.
2. **Drawn on the static figure.** The main map as before, with the box drawn on it; the inset in a corner, the box's
   contents enlarged to fill it; and **two lines from the box to the inset's frame**, the pointer from the zoomed-out
   place to the zoomed-in one.
3. **Where it sits.** The corner where it covers least of what is drawn, unless one is chosen in Configure…; a third of
   the figure's width, or a half.
4. **What it draws.** Every layer the main map draws, in the same marks, the same colours and **the same classes**,
   only larger: a hospital in the inset is the shade it is on the main map. The inset carries its own scale bar.
5. **Or the other way round: a locator** (the practitioner, the same day: *"How about reverse inset where the bigger
   map becomes the inset highlighting the zoomed in map on the context view?"*). The picked view is the figure, and the
   whole map sits small in the corner with the picked part's box highlighted on it, the same two lines joining them.
   In Configure…, **Arrange** offers both: *Inset*, the part enlarged in a corner of the whole; *Locator*, the whole
   small in a corner of the part. The picking, the box, the lines and the classes are the same for both; only which
   frame is large changes.
6. **The first case** is MERS's hospitals: picked on Seoul and Gyeonggi, where nine of the twelve are, drawn both ways.

**Not in this experiment:** several insets; an inset at another projection.

## Admission review

D1: no new widget. Map gains an arrangement, the one Arrange already offers for panels. The practitioner asks for it by
name ("an inset").

| Distinction | Enforced as |
| --- | --- |
| The inset is the same data on the same scale of values: one shade, one number | **hard stop**: the inset is drawn from the main map's own classes, never classed again |
| The inset's scale of distance is its own | **validation rule**: an inset is drawn with its own scale bar, and its box on the main map |
| The inset's box lies inside the main map's frame | **validation rule**: a view outside it is refused when it is picked |
| An inset enlarges; it does not add detail the data lacks | **limitation**, said nowhere on the figure: a drawn mark is no more precise for being larger |

## What it commits to, written before the result

- A unit test: a box, its frame in a corner, every layer projected into it, the two lines from the box's corners to
  the frame's; the inset's marks take the main map's classes; and the same frames swapped for a locator.
- A browser test: on MERS's interactive map, zoomed to Seoul and Gyeonggi, *Use this view as the inset*; the static
  figure then draws the box, the inset with its own scale bar, and the two lines from one to the other; every hospital
  in the inset at least a mark's width from the next, and both marks of one hospital the same colour. As a locator,
  the picked part fills the figure and the whole sits in the corner with the box.
- **Practitioner observation, which can come out badly:** shown the figure, can the practitioner find a given hospital
  in the inset and say which hospital on the main map it is?

## What it does not establish

That an inset is better than framing the map on the hospitals alone, or than an interactive map, for a reader of this
figure. That a reader reads the inset's scale bar rather than assuming the main map's.
