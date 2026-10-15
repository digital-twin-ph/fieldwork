# 116 — A sideways look at ArcGIS Model Builder

_Created 2026-10-15 · Updated 2026-10-15_

**Status:** asked — seven screenshots read, nine concepts named, four recommended. Nothing
built. This is the **sideways** direction pointed at a tool outside this project:
*does the thing we are building already exist under another name, and what did they learn
that we have not?*

The practitioner uploaded the screenshots on 2026-10-15 and said: *"They are screenshots of
ArcGIS' Model Builder UI. There may be useful concepts to adapt."*

**What this is read from, and its limit.** Seven screenshots of ArcGIS Pro 3.x on Windows,
showing the Geoprocessing pane, the ModelBuilder ribbon, a model of three nodes, a
drop-target menu, a tool help panel and a run-messages panel. Nobody here has used the
product. Everything below is read off those images, and where a mechanism's behaviour is
inferred rather than seen, it says so. A concept adopted from a screenshot is a concept
adopted from its advertisement.

## What the model itself looks like

Three nodes, three shapes, and the shapes carry meaning:

| | In the screenshots | Fieldwork's equivalent |
| --- | --- | --- |
| **Data** | blue rounded rectangle, `Botswana-node` | an input widget's node |
| **Tool** | yellow rectangle with a hammer, `Buffer` | a process widget's node |
| **Derived output** | green rounded rectangle, `Botswananode_Buffer` | nothing — our outputs are nodes that draw, not values that exist |

The third row is the real difference. In ModelBuilder the **output of a tool is a thing on
the canvas with a name**, and a later tool consumes that named thing. In Fieldwork a value
travels along an edge and is never drawn; what we call an output widget is a *view*. Neither
is wrong, and the consequence is visible in our own records: experiment 113 had to argue that
a ruleset should return the polygons it judged "because a decision about a shape that cannot
be drawn is a decision nothing downstream can use". A named intermediate makes that obvious
rather than arguable.

## The nine concepts, and what each is worth here

| | Concept | What we have | Verdict |
| --- | --- | --- | --- |
| 1 | **Drop and choose the role** — dragging a layer onto a tool opens *Select input…* listing `Input Features`, `Extent`, `Precondition` | the Map's one configurable port, which binds by TYPE automatically | **adapt** — ask when ambiguous |
| 2 | **Validate, separate from Run** — *"Verify all data elements and parameter values are valid"* as its own ribbon button | `executionPlan` validates, but only as the first step of Run | **adopt** |
| 3 | **Ready vs not-ready, on the node** — an unfilled tool is missing parameters; a filled one can run | status is done/running/failed; "not yet runnable" is an Inspector notice | **adopt** |
| 4 | **Suggest Tool** — a ribbon button that proposes the next tool | nothing, and [112](112-progressive-widget-reveal.md) concluded the useful feature is exactly this direction | **adopt the direction, not the button** |
| 5 | **Environments** — settings applied across the whole model | the UTM zone, checked for agreement widget by widget | **adapt** |
| 6 | **Preconditions** — an edge that orders without carrying data | ordering comes from data edges only | **reject for now** |
| 7 | **Iterators** — loops over a list | none | **out of scope** |
| 8 | **Run messages with severity** — Information / Warning / Error filters, elapsed time, and the executed call verbatim | receipts carry more, and no human-readable "this is what ran" line | **adapt the line, not the panel** |
| 9 | **Group, Ungroup, Create Label** — annotate and group on the canvas | Tidy, and nothing else | **not now** |

## The four worth doing, with what each would cost

### 1 · Ask which role, when more than one fits

The screenshot shows a connection dropped on `Buffer` opening a menu of three roles. Our Map
does this by type: a points layer binds to the next free point slot, a polygons layer to
`polygons`. That works because the Map's ports have distinct types — and it already fails
quietly in one place we know of. `context` is points-typed and means *drawn beside polygons*,
so a second point source could legitimately be either a layer or the context, and the binding
rule had to **exclude `context` from automatic binding** to stop it taking a role the
practitioner did not choose.

The menu is the honest answer to exactly that: bind silently when one port fits, **ask when
more than one does**. It would also extend the configurable port from the Map to every widget,
which is the thing that made the Map's canvas legible.

### 2 · Validate without running

ArcGIS separates *are the parameters valid* from *do the work*. We do not, and the cost is
specific: a practitioner who wants to know whether a canvas is coherent has to run it, and a
run here downloads street networks over an unstable public service, reasons over N3, and takes
tens of seconds. `executionPlan` already computes the answer. Exposing it is a button and a
message, not a mechanism.

### 3 · Say on the node that it cannot run yet

An unconfigured `apply_ruleset` says so in the Inspector, which is to say it says so to
somebody who has already selected it. The canvas is where a practitioner looks at the shape of
their work. We already draw an alert badge for a widget that found something at run time; the
same affordance for *not runnable yet* is small and would have told a practitioner, on the
blank-canvas palette work of the same day, which of the seven inputs they still had to fill in.

### 5 · Declare the metric frame once, for the workflow

This is the one with a measured cost in our own records. Every widget that measures carries a
UTM zone, the run is refused by name when two disagree, and
[100](100-choosing-the-metric-crs.md) measured what a disagreeing zone costs. ArcGIS calls the
same thing an **Environment**: a setting declared for the model, inherited by every tool, and
overridable per tool.

That is a better shape than ours — declared once, inherited, overridden deliberately — and it
is a substantial change to how a workflow is saved, because the zone currently lives in each
node's parameters and every saved workflow has it there.

## What this does not establish

That any of these works well in the product. They are screenshots: the drop-target menu might
be tedious in practice, Validate might be ignored, and Suggest Tool might suggest badly.
Reading a tool's interface tells you what its authors decided to make visible, not what their
users do with it.

Nor that ArcGIS is the right comparison. It is a desktop GIS with a thirty-year toolbox and a
licence; Fieldwork is a browser application with 46 widgets and an ontology. Where it has
solved something we have not, that is worth taking; where it has a feature we lack, that is
not by itself an argument.

And none of the nine was measured against a practitioner, here or there.

## What would close it

A decision on each of the four recommended, taken one at a time rather than as a programme.
Each is independently useful and none depends on another:

1. **Ask which role** — needs a port-ambiguity rule and a menu. Closes the `context` workaround.
2. **Validate** — a button over machinery that exists.
3. **Not-runnable on the node** — a node state and a badge.
4. **Environments** — the largest, and the only one that changes what a saved workflow holds.

This moves to `tried` when one of them ships and `retired` if the sweep turns out to have
produced only features nobody wanted.
