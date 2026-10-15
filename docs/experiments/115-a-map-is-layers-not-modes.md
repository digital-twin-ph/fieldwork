# 115 — A map is layers, not modes

_Created 2026-10-14 · Updated 2026-10-14_

**Status:** asked — the defect is measured and the cost is already being paid in three
places; nothing is built.

Raised by the practitioner on 2026-10-14, correcting an explanation of mine:

> I think we have a misunderstanding of maps. A map has layers, whether static or
> dynamic. If the widget before it emits points, that becomes a layer when it reaches the
> map input port. When another widget before it emits polygons, it becomes another layer
> when it reaches the map input port. So there is no such thing as mode, only layers.

## What the code does

`map_output` carries a parameter `inputMode` with five values, and the value decides which
ports the node draws:

| `inputMode` | What it can show at once |
| --- | --- |
| `spatial` | `area`, `points`, `coverage`, `raster` |
| `polygons` | `polygons` |
| `polygons` + `contextPoints` | `polygons`, `context` (one points layer) |
| `decisions` | `decisions` |
| `raster` | `raster` |
| `network` | `network` |

So a map is declared to be **a map of one kind of thing**, with two exceptions that were
added when that proved false.

## The exceptions are the evidence

Two mechanisms already exist whose only purpose is to put more than one layer on a map,
and neither generalises.

**`pointInputCount`,  1 to 8.** A map in `spatial` mode draws `points`, `points_2` …
`points_8`. Eight layers — of points only.

**`contextPoints`, a boolean.** A map in `polygons` mode draws one extra port, named
`context`, which takes points. One layer — of points only, beside polygons only.

A model that needs two special cases to show a point layer beside something else is
describing layers in a vocabulary that cannot say "layer".

## What the shipped examples ask for

| Example | Map | Mode | Layers wired |
| --- | --- | --- | --- |
| snow-voronoi | Voronoi catchment map | polygons | 1 |
| snow-isochrone | Isochrone plot | polygons | **2** — polygons + context |
| snow-isochrone | Interactive isochrone map | polygons | **2** |
| snow-extent | Observed extent | polygons | **2** |
| snow-geoprivacy | BEFORE · private source | spatial | **2** — area + points |
| snow-geoprivacy | AFTER · moved points | spatial | **2** |
| snow-geoprivacy | AFTER · H3 cells | polygons | 1 |
| old-naledi | Access map | decisions | 1 |
| raster | Clipped population raster | raster | 1 |
| sea-level | Facilities and projection sites | spatial | **3** — area + 2 point layers |

**Six of the ten shipped maps already show more than one layer**, and every one of those
six gets there through `pointInputCount` or `contextPoints` rather than through anything
the model calls a layer.

Nothing in the shipped set asks for polygons beside a raster, or two polygon layers, or a
network beside points — not because those are unwanted, but because **no port exists to ask
with**. `stack_polygons` was built to put several polygon layers into one value, which is
the same need solved one type at a time.

## What the correction implies

A map input port is a **layer slot**. Whatever arrives at one is drawn as a layer, with its
own symbology and legend entry, over or under the others. The kind of thing it is decides
how it is drawn, not whether it may be there.

Consequences, stated before anything is built:

1. **`inputMode` stops being a question.** It exists only because the map must be told what
   kind of map it is. With layers it is told by what is connected.
2. **`contextPoints` and `pointInputCount` collapse into it.** Both are "one more layer",
   restricted to points.
3. **Draw order becomes a real question**, and it is a practitioner's to answer: polygons
   under points is usually right and is not always right. `stack_polygons` already orders
   layers largest first and says so.
4. **The legend becomes derived**, one entry per layer, instead of per mode.
5. **The renderer has to compose**, where today it branches: `catchmentPlot` for polygons
   with optional context, `polygonSvg` for plain polygons, a spatial renderer for area and
   points, a raster renderer, a network renderer. Composition is the work; the ports are
   the easy half.

## "Context" is a reading, not a port — and the renderer has it backwards

The practitioner, on what the two John Snow maps are actually for:

> For a Voronoi catchment, we use the pumps to calculate the tessellation. Then overlay the
> death locations layer to demonstrate which catchment had the most locations where people
> died. Same with isochrone. The Broad Street pump + street network was used to create
> derived polygons, the time bands. The death location points are overlaid on the time bands
> to figure out distribution of death locations within the time bands.

So in both maps the **pumps are the computation's input** and the **deaths are what the
reader is asked to look at**. The pump is on the map so you can see where the bands came
from. The question is about the deaths.

The port is named `context` and the parameter `contextPoints`, which fixes in the
vocabulary a judgement that belongs to the question. The same pump layer is the subject of
a map asking *where are the pumps*, and context in a map asking *how did deaths fall around
one*. Nothing about the data decides which; the reading does.

**And the renderer takes its visual hierarchy from the computation's roles.** In
`catchmentPlot`:

```js
const sites=context?.features||p.sites, observations=p.observations?.features||[];
for(const [fs,color,r,kind] of [[observations,'gray',2.7,'observation'],
                                [sites,'red',3.5,'site']])
```

The pumps — the input — are drawn **red at radius 3.5**. The deaths — the subject of the
question — are drawn **gray at radius 2.7**, and the legend reads *"Gray: observations ·
red: sites"*. The thing the map exists to show is smaller and duller than the thing that
produced the shape, because one is called a site and the other an observation, and those
names come from the computation rather than from the reading.

That is the cost of the missing vocabulary stated as something a practitioner sees: not a
refused connection, but **a map whose emphasis is wrong for its own question.**

## The last stage can see what is upstream, and the mechanism is already there

The practitioner, continuing:

> An output widget being the last stage can see what the widgets before it are producing
> that it can consume — points, polygons, rasters, even derived polygons and points.

It can, and **the Inspector already works this way for one port at a time.** Twelve source
pickers exist in the Inspector today, each a `<select>` carrying `data-map-port`, listing
the nodes on the canvas whose output matches that port's type; choosing one calls
`setConnection` and the edge appears. A practitioner wiring a catchment map does not have
to drag anything: they pick *Polygon input* from a list of the polygon producers on the
canvas.

So the map is already told what it can consume by looking at the canvas. What stops it
being a layer list is only that the lookup is **per port, and the ports come from the
mode**.

Measured on two shipped canvases, counting every node whose output is drawable — `points`,
`polygons`, `raster`, `area`, `network`:

| Canvas | Layers the map wires | Layers the map could see |
| --- | --- | --- |
| snow-extent | 2 | **4** — deaths, hull, judged hull, pumps |
| snow-isochrone | 2 | **10** — study area, pumps, deaths, catchments, clipped, summarised, projected points, network, context pumps, acquisition buffer |

The isochrone canvas holds ten drawable things and its map is told about two. The other
eight are not hidden by a rule about what makes sense; they are hidden because the map is
in polygons mode and polygons mode has two ports.

**This makes the change cheaper than the previous section implies.** The edge-making half
is built and shipping — a picker that lists candidates by type and calls `setConnection`.
What is missing is one list instead of several, keyed by *drawable* rather than by a mode's
port, plus the renderer that composes what comes back.

## The receipts now say how many layers, and of what kinds

> The ontology N3 receipts should be able to provide count and types of layers in the
> workflow maps.

They could already, and badly. `prov:used` reaches each source and `fw:portType` says what
that source emits, so a two-step join answers the question — but the join is fragile: a
node appears under two IRI forms, the activity uses itself, and on the geoprivacy maps a
naive query returned **four sources for a two-layer map**.

So the map specification asserts it directly: `fw:layerCount`, and one `fw:layer` per
connected port carrying `fw:layerPort`, `fw:layerPortType`, `fw:layerIndex` and the
activity that generated it. Measured on the shipped examples:

| Map | Asserted |
| --- | --- |
| isochrone plot | `layerCount 2` → `polygons:PolygonsPort`, `context:PointsPort` |
| interactive isochrone | `layerCount 2` → same |
| geoprivacy BEFORE | `layerCount 2` → `area:AreaPort`, `points:PointsPort` |
| geoprivacy AFTER · moved | `layerCount 2` → same |
| geoprivacy AFTER · cells | `layerCount 1` → `polygons:PolygonsPort` |

**This is the layer model arriving in the vocabulary before it arrives in the renderer**,
which is the right order for this project: the graph can now be asked a question the
interface still answers in five branches, and the gap between the two is visible rather
than argued about. `fw:layerIndex` is the declaration order today, because that is what the
renderer uses; when a practitioner can state the order, the same term carries it.

## A map can be read many ways, and the receipt records only half of what decides the reading

> In short, a map no matter how we configure it can be read many ways. We can make maps
> tell lies if we want to just by the way it's constructed.

Audited on the shipped isochrone map, 2026-10-14, by asking which construction choices the
graph records.

**Recorded as terms**, so a reader can reconstruct them: `corridorWidth`, `snapLimit`,
`walkingSpeed`, `travelTime`, `travelDirection`, `fillInteriorHoles`, `metricCRS`,
`countSemantics`, `caveats` — and since today `layerCount`, `layerPortType`, `layerIndex`,
`mapLegend`, `mapBasemap`, `mapPresentation`.

**Absent from the vocabulary entirely**: `fw:layerColour`, `fw:layerWeight`,
`fw:layerRole`, `fw:mapExtent`, `fw:classBreaks`. No term exists for the colour or size a
layer is drawn at, for which layer the map is *about*, for what was cropped out of the
frame, or for the class breaks a shaded map uses.

So the division is clean and uncomfortable: **the graph can reconstruct what was computed,
and not how it was shown.** Every choice recorded above changes the *numbers*. The choices
that are absent change the *reading* while leaving every number intact.

The application contains a worked demonstration of exactly that. `catchmentPlot` draws the
computation's inputs red at radius 3.5 and the observations gray at 2.7, so the John Snow
map de-emphasises the deaths it exists to show — and **nothing in the receipt records it**.
A reader checking that map against its graph would find the corridor width, the speed, the
direction, the CRS, the infill, the caveats and the two layers, and would have no way to
learn that the subject was drawn smaller than the context.

That is the honest answer to *can we make maps tell lies*: yes, and this project's
provenance would not catch it, because provenance here records computation and the lie
lives in presentation. Three things follow, and none is a small job:

1. **Symbology belongs in the specification.** Colour, size and order are choices, and the
   specification already records title, legend and basemap — it stops exactly where the
   misleading begins.
2. **Which layer is the subject is a declaration, not an inference.** Today it is inferred
   from which widget computed what, which is how the emphasis got inverted.
3. **The frame is a choice.** What a map crops decides what a reader believes is absent,
   and no term records the extent that was drawn.

## Reordering layers, and why the control cannot be honest yet

> Another map knob is the layer index. The Inspector should allow for a reordering of
> layers for better usability.

Agreed, and `fw:layerIndex` was added today carrying the declaration order precisely so
that a practitioner's order could replace it. The obstacle is not the control. It is that
**the renderer's layers are not the node's layers.**

The isochrone map has two things connected to it: `polygons ← summary` and
`context ← context-pumps`. `catchmentPlot` draws **three**:

| Drawn | Where it comes from |
| --- | --- |
| the time bands | the polygons value |
| **250 death locations** | `p.observations` — carried **inside** the polygons value by `summarize_polygons` |
| the pumps | the `context` port |

The deaths are not a connected layer at all. `summarize_polygons` counts points inside
polygons and keeps the points it counted on the value it returns, so the map draws them
without anything having been wired. A reorder control listing the node's two ports would
therefore not mention the layer a reader most wants moved, and a control listing all three
would be offering to reorder something that is not a layer in the model — a knob whose
effect the graph cannot state.

That is the same defect shape this project keeps finding, caught before shipping rather
than after: **a control that claims an effect the model cannot carry.** The honest order of
work is the layer model first, the control second, and the control then has something true
to write into `fw:layerIndex`.

A narrower version is available and worth naming: order the two connected ports against
each other — pumps over the bands or under them — which is real, recordable and about a
quarter of the value, since the layer a practitioner would actually reach for is the one
arriving inside the value.

## What this does not establish

That every type should be drawable as a layer. `decisions` carries rows that may have no
coordinates, and a `coverage-check` is a review state rather than a geometry — both are
drawn today by their own renderer, and whether they are layers or something else is a
question this record does not answer.

Nor does it establish that the modes should be removed rather than derived. A saved
workflow holds `inputMode`, and a migration that silently reinterprets one is a change to
somebody's work.

It also does not establish the cost. The renderer branches in at least five places and the
interactive map is a separate implementation from the plot, so "compose layers" is a
rewrite of the display path rather than a port change.

## Why this record exists, since nothing shipped is broken

Asked directly on 2026-10-14: *why is 115 needed?* Three reasons, and one thing it does
not earn.

**It changes what a different fix should be.** The blocker
`output-mode-set-before-the-shape-arrives` proposes to switch a map's mode automatically
when exactly one mode accepts the connected type. That is a sensible repair *inside* the
mode model, and if this record is right it entrenches the thing to remove. Without 115
someone implements it and the model hardens.

**It holds measurements that would otherwise live nowhere**: six of the ten shipped maps
already show more than one layer and every one reaches that through a points-only special
case; the isochrone canvas holds ten drawable nodes and its map is told about two.

**It records a correction to a model, which this project keeps rather than quietly
absorbs.** The explanation it corrects was mine, written the same day.

**~~What it does not earn is a rewrite.~~** *Struck 2026-10-14, within the hour, by the
practitioner: "all 10 maps render with a broken model inside them."* The paragraph said
nothing shipped is broken and the demand was unmeasured. Rendering correctly is not
evidence that the model is sound, and the demand is not unmeasured — **it has been paid for
three times, in three different places, none of which is allowed to say "layer".**

| What was built | What it is | Scope |
| --- | --- | --- |
| `pointInputCount`, with `point-layers.ts` | numbered ports `points`…`points_8` | eight layers, points only |
| `contextPoints` | one extra port named `context` | one layer, points only, polygons mode only |
| **`stack_polygons`, an entire widget** | numbered ports `polygons`…`polygons_6`, **ordered largest first so the smaller draw on top** | six layers, polygons only |

The third is the one that settles it. `stack_polygons` exists because a map cannot take
two polygon layers, and its own documentation describes what it does as layering: *"several
polygon layers collected into one, with nothing merged … ordered largest area first, so the
smaller bands draw on top of the larger."* **Draw order — which this record listed as a new
question the layer model would raise — is already implemented, in a widget, for one type,
by a heuristic.**

So the cost is already being paid: two parameters, one widget, a renderer that branches
five ways, and an interaction where the mode must be set before the shape can arrive. What
a layer model would do is collect those into one thing that can be named.

## What would close it

A map that takes N layer inputs of mixed types, draws them in a stated order with a legend
derived from the layers, and reproduces all ten shipped maps — the sea-level map with three
layers, the isochrone map with polygons and context points, the four nested isochrone bands
— with no `inputMode`, no `contextPoints`, no numbered point ports, and `stack_polygons`
retired or reduced to what it is actually for.

The draw order it uses today, largest area first, is a heuristic that happens to be right
for nested bands and has no reason to be right for a raster under points. Ordering is the
practitioner's, and that is the one thing a layer model adds rather than collects.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-14 | A map has layers, not modes — the correction, and the measurement that supports it: 6 of 10 shipped maps already show more than one layer, through two special-case mechanisms that each handle points only |
| 2026-10-14 | "An output widget being the last stage can see what the widgets before it are producing that it can consume." It already does, one port at a time: twelve Inspector pickers list the canvas nodes whose output matches a port's type and call setConnection on choice. Measured: the isochrone canvas holds ten drawable nodes and its map is told about two, hidden by the mode rather than by sense. So the edge-making half of a layer list is built; what is missing is one list keyed by drawable instead of several keyed by a mode's ports, and a renderer that composes |
| 2026-10-14 | "Why is 115 needed?" -- narrowed in answer. It earns its place by changing what the blocker output-mode-set-before-the-shape-arrives should do (automating a mode switch would entrench the model this record calls wrong), by holding measurements that live nowhere else, and by recording a model correction. It does NOT earn a rewrite: nothing shipped is broken, and the claim that combinations are wanted is an inference rather than a measurement. Closing it now means evidence of demand, not a new renderer |
| 2026-10-14 | "All 10 maps render with a broken model inside them." Struck the paragraph claiming nothing is broken and the demand unmeasured: rendering is not evidence the model is sound, and the demand has been paid for three times -- pointInputCount for eight point layers, contextPoints for one beside polygons, and stack_polygons, an entire widget, for six polygon layers ORDERED LARGEST FIRST SO THE SMALLER DRAW ON TOP. Draw order, which this record called a new question, is already implemented for one type by a heuristic |
| 2026-10-14 | "Context is relative depending on the focus." In both John Snow maps the pumps are the computation's input and the deaths are what the reader is asked to look at -- so `context` as a port name fixes a judgement that belongs to the question. Worse, catchmentPlot takes its visual hierarchy from the computation's roles: pumps red at radius 3.5, deaths gray at 2.7, legend "Gray: observations, red: sites". The thing each map exists to show is drawn smaller and duller than the thing that produced the shape |
| 2026-10-14 | "The ontology N3 receipts should be able to provide count and types of layers in the workflow maps." They could, by joining prov:used to fw:portType, and the join was fragile enough to return four sources for a two-layer map. Now asserted: fw:layerCount plus one fw:layer per port carrying fw:layerPort, fw:layerPortType, fw:layerIndex and what generated it. The layer model reaches the vocabulary before the renderer, which makes the gap between them queryable instead of arguable |
| 2026-10-14 | "We can make maps tell lies just by the way it's constructed." Audited: the graph records every choice that changes the NUMBERS -- corridorWidth, snapLimit, walkingSpeed, travelTime, travelDirection, fillInteriorHoles, metricCRS, countSemantics, caveats, and now the layers -- and has no term at all for the choices that change the READING: layer colour, layer weight, which layer is the subject, the frame that was cropped, class breaks. catchmentPlot draws the pumps red at 3.5 and the deaths gray at 2.7 and nothing in the receipt says so |
| 2026-10-14 | "Another map knob is the layer index. The Inspector should allow for a reordering of layers." Agreed, and not buildable honestly yet: the renderer's layers are not the node's layers. The isochrone map has two ports connected and catchmentPlot draws three things, because summarize_polygons keeps the 250 death locations INSIDE the polygons value it returns. A control over the two ports would omit the layer a reader most wants moved; a control over all three would reorder something the model cannot name. Layer model first, control second |
