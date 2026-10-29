# 148 — A map is a semantic network, or it is a picture

_Created 2026-10-29 · Updated 2026-10-29_

**Status:** asked — the direction was settled by the practitioner on the day it was asked, and what
remains open is the vocabulary for grouping and how much of the description the renderers can be
made to read. Both are named below.

The practitioner, 2026-10-29, after four reports about layers that would not behave:

> My overarching question is this: If our map is represented as a semantic network (which is what
> FW is about), can that facilitate the design of its presentation management UI? Whether it's a
> static or interactive map? Based on my experience working with maps, I think the answer is yes.

And then the instruction that follows from it:

> Groupings can be declared, and then existing artifacts added to it. Let's stop the backward
> direction. Let's begin with the ontology representation in mind so the exhaust becomes more
> logical and can be queried after render.

> It's actually worth its own experiment 148 semantic representation of interactive and static
> maps. (the same could be true for charts too).

## The answer is yes, and the evidence is that this repository already half-does it

`ontology/fieldwork.ttl` declares, today, every term a layer-management surface needs:
`fw:layer`, `fw:layerIndex`, `fw:layerKind`, `fw:layerLabel`, `fw:layerRole`, `fw:layerPort`,
`fw:layerWithin`, `fw:layerTileProvider`, `fw:layerSymbol`, `fw:layerFeatureCount` — carried on a
`fw:MapSpecification` beside `fw:mapLegend`, `fw:mapPresentation`, `fw:mapBasemap` and
`fw:mapSourceNote`. Ordering, labelling and styling are all declared. The parallel set exists for
charts: `fw:chartSpecification`, `fw:chartField`, `fw:chartMark`, `fw:chartLegend`,
`fw:chartOrientation`, `fw:chartValueUnit`.

The comment on `fw:layer` reserved the slot for the feature being asked for, before it was built:

> The index is the order the ports are declared, which is the order they are drawn today; **when a
> practitioner can state the order, that order belongs here instead.**

And `fw:layerKind` already carries the rule that four defect reports were about:

> The kind decides HOW a layer is drawn, not whether it may be there.

## What is backwards

The description is **exhaust**. `map-communication.ts` assembles its own array of layers — kind,
feature count, port, within, role — for the sole purpose of emitting N3 *after* the picture has
been decided. Nothing reads it back. So the layers of one map are modelled in three places that
can disagree:

| Where | Read by | Carries |
| --- | --- | --- |
| `map-communication.ts`, the emitter | nothing | kind, count, port, within, role |
| the renderer's overlay construction | the reader | a name invented at the line that builds it |
| `map-layer-list.ts` (added 2026-10-29) | the dialog, the interactive control | label, group, order, hidden |

The third was added the same day this was asked, which is the cost of the backward direction
stated precisely: a model was written in TypeScript whose `order` is `fw:layerIndex` and whose
`label` is `fw:layerLabel`, both already declared, because the declaration was not where anyone
looked. The static figure's ordering is a fourth, implicit in the sequence of its draw calls.

## What the inversion buys, concretely

1. **One description, two renderers.** Static and interactive differ in *how* a kind is drawn,
   which is exactly what `fw:layerKind` is declared to govern. The management surface edits the
   description; neither renderer owns the list. This is what makes the practitioner's sequencing
   true — *"solve the interactive map layer first ... then it's easy to solve the static map"* —
   rather than a hope.
2. **One statement, two renderings, for labels.** A declared label property on a layer is a hover
   tooltip on the interactive map and drawn text on the static figure. The alternative is
   implementing *name the water intakes and Teddington Lock* twice and letting the two drift.
3. **Refusals become rules instead of branches.** `map-conformance.ts` already states design rules
   as EARL and DQV assertions with criteria, and distinguishes measured from categorical. The
   instruction *"refusing only when there are rule violations (e.g. sizes and locations of layered
   artifacts on map window)"* is then a query over the specification, with the new rules sitting
   beside the contrast ones — reportable, and in the receipt.
4. **Controls follow the kind.** A raster offers opacity, points offer a mark and a label
   property, polygons offer classification. Derived from the kind rather than hand-written per
   widget, which is how folium and matplotlib arrive at the same place from the other direction.
5. **The exhaust becomes queryable.** A receipt that records the specification the renderer
   actually read can be asked what a published figure showed, in what order, under what names —
   rather than recording a description assembled separately from the drawing and hoping they match.

## Groups are declared, then joined

The practitioner's instruction is specific and it rules out what was built on 2026-10-29: a group
is **not** a free-text string repeated on each layer. A group is declared once, as a thing with a
name, and existing layers are added to it. That is the difference between a label people have to
spell identically and an entity with an identity — and it is the same distinction the glossary
already draws for a **producer-named port type**, where the fix was to name what is carried rather
than where it came from.

`fw:layerRole` is **not** this. It is declared as a *reading* — `observations`, `sites`, `context`
— and the ontology says so: *"A READING and not a property of the data."* A group is the
practitioner's own bundle and can hold layers of different roles and kinds. So grouping needs a
declared term of its own. Naming it is open, and is the first thing this experiment owes.

## What this does not establish

- That the graph belongs in the render loop. It does not: the reasoner must not be required to
  draw a frame. What is claimed is that the **description** is the source, not that it is consulted
  per repaint.
- That a generated UI is better than a written one. Nothing here was generated and measured against
  anything. The claim is narrower — that controls which follow a declared kind cannot drift from
  the thing they control, while four hand-written surfaces demonstrably did.
- That charts behave the same way. The chart vocabulary exists, and the same three-model split is
  *likely* by inspection, but it has not been read line by line the way the map was.
- That any of this improves a published figure. The figure defects reported on 2026-10-29 — a
  sequential ramp over unranked categories, a key naming an on-screen control, unlabelled water
  intakes — are real whether or not the description is inverted.

## What would close this

- A declared term for a group, in `ontology/fieldwork.ttl` and in the glossary, with membership as
  a relation rather than a repeated string.
- One model: `map-communication.ts` and the renderers reading the same layer description, with the
  three-row table above reduced to one row.
- A query, run in a test, that answers of a published map: which layers, in what order, under what
  names and in which groups — from the receipt alone.
- The same read performed on charts, confirming or refusing the fourth bullet above.
