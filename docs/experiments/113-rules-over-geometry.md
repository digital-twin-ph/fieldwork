# 113 — Rules over geometry, as a composition

_Created 2026-10-14 · Updated 2026-10-14_

**Status:** tried — the blocker is fixed, the ruleset exists and a worked example
runs it. The composition the record is named for is not built, and the question
that has to be answered before it can be is below.

Proposed by the practitioner on 2026-10-14, in two steps. First:

> We should probably have two different apply ruleset widgets — one for
> non-geometries, the other for geometries. In the geometry apply ruleset we can
> extract the derived data from the input data, e.g. area, centroid, length.

Then, after the objection below:

> So the geometry ruleset becomes a micro-workflow composite widget.

This record is the design and its admission review, written before the
implementation. The practitioner also asked for **a worked example as evidence of
feasibility or not**, which is what moves this to `tried`.

## Why not a second primitive

Three objections, measured 2026-10-14.

**It would duplicate six widgets.** Deriving a quantity from geometry is already a
primitive family: `measure_area`, `summarize_hull`, `summarize_combined_area`,
`fill_interior_gaps`, `measure_distance`, `buffer_area`.

**It would make a rule-runner a metric widget.** An area in square metres cannot
be computed without projecting, so a geometry `apply_ruleset` would acquire a UTM
zone and fall under the one-projection rule of
[110](110-one-projection-per-workflow.md). That is a large contract change for a
widget whose job is evaluating N3.

**It answers the wrong question.** D1 asks whether the distinction survives
decomposition. "Geometry versus table" does not: the rules are identical N3 over
facts either way, and what differs is only how the facts are produced — which is
the **binding** gap already recorded in
[the rule-application audit](../audits/rule-application-audit.md).

## The composition, and the precedent

A composition is the answer D1 points at: *factor a composite underneath while
keeping its palette entry, and never make a practitioner wire three nodes to ask
one question.*

`compute_walking_catchment`, the one composition that exists, already does the
hard part. Four primitive members, internal edges, external ports mapped onto
member ports, and a **shared parameter**:

```json
{"name": "zone", "title": "UTM zone",
 "members": [{"node": "snap", "param": "zone"},
             {"node": "corridor", "param": "zone"}]}
```

One UTM zone fanned out to two members. A geometry-ruleset composition needs
exactly that: the deriver projects, the composite exposes one zone knob, and it
lands under the one-projection rule without special-casing.

So the shape is **members** = a deriver plus `apply_ruleset`, **ports** = geometry
in and decisions out, **parameters** = the zone plus the ruleset's own.

## The blocker, measured

**Derived quantities do not reach the records.** `summarize_hull` computes an area
and a span:

```js
const areaM2=ringAreaM2(ring);
const feature:Catchment={id:'hull',name:node.params.label,siteId:'hull',geometry};
```

The area goes into the notes and into `fw:hullAreaSquareMetres` in the receipt.
The **feature carries `id`, `name`, `siteId`, `geometry` and nothing else.** The
same holds for a catchment polygon in the John Snow example, checked by running
it: `id, siteId, name, geometry, count, total, missingValues` — no area.

A composition edge carries a **value**, not a receipt, so `apply_ruleset` inside
the composite can see no more than it could outside. Reaching through to a receipt
is the move `src/old-naledi.ts` warns is "how a thin carrier becomes a thick one".

This is the third instance of one defect shape found on 2026-10-14: a quantity
computed, published, and left where nothing downstream can use it — after the
`alert` widget's date and `fw:metricCRS` buried inside a JSON string literal.

There is also an inconsistency between widgets doing the same kind of work:
`measure_area` **does** attach its result to the value as `AreaValue.measurement`.
The polygon derivers do not.

## Admission review (D1–D10)

**D1 — does the distinction survive decomposition, and would a practitioner ask
for it by name?** The composite survives on the second axis and fails on the
first, which is exactly the case D1 was written for: *the unit of reuse is not the
unit of use.* A practitioner asks "flag the catchments that are too large" by
name; underneath it is a deriver and a rule application, and both already exist.

**D2 — compared against existing primitives.** Nothing new is built. The members
are existing widgets; the composition declares their wiring.

**D10 — some example must instantiate it.** The point of this experiment. A
composition that no example uses would repeat the gap `reproject` sat in until
2026-10-14.

## What this predicts, before it is built

Written before running, so the result can contradict it:

1. Attaching the derived quantity to the record will be small — the value is
   already computed and discarded one line away.
2. **A new ruleset will not be addable without changing TypeScript.**
   `apply_ruleset` dispatches on `projectionOf(id, version)` into a hardcoded
   switch, and a ruleset over geometry needs a case that does not exist. If that
   prediction holds, the worked example is evidence *for* the binding gap, not
   against it, and the composition is feasible only in the sense that the author
   can extend the switch.
3. The composition will need a human admission review before it reaches the
   palette, as `compute_walking_catchment`'s governance record requires.

## What would close it

A composition that runs end to end in a worked example, with the cost of adding it
recorded honestly — including whether prediction 2 held.

## What landed, 2026-10-14

Three of the four parts, and not the one the record is named for.

**The blocker is fixed, and prediction 1 held.** `summarize_hull` and
`summarize_combined_area` attach `areaSquareMetres` and `spanMetres` to the record
instead of leaving them in a note and a receipt. It was the small change the
prediction said it would be: the quantity was already computed one line away.

**The ruleset over geometry exists.** `extent-review` 1.0.0 classifies a polygon by
its own area against a threshold, reading the area off the record. It neither
projects nor measures.

**Prediction 2 held, and the code says so at the line.** A ruleset declares its
projection as data, but the handler for a new one is a branch in `core.ts`, so
adding a ruleset over a shape nothing had classified before was not a data change.
The `polygon-extent` case carries that finding as a comment where the branch is.

**A worked example runs it**, which satisfies D10 for the chain: the John Snow
`snow-extent` workspace wires 250 death locations into `summarize_hull`, into
`apply_ruleset` at a 250,000 m² threshold, and out to a decision table.

**The composition is not built.** The example wires the two widgets by hand. So
prediction 3 — that a composite would need a human admission review before the
palette — is untested, because there is nothing to review.

## What breaks the composite: a decision is not a thing

Raised by the practitioner on 2026-10-14, as a question about the design rather than
about the code:

> How can decisions be an output?

Literally, it is a declared port type, and the type is **data**: `apply_ruleset` takes its
output from the ruleset's own contract, and `extent-review` declares
`ports: {inputs: [["polygons","polygons"]], output: "decisions"}`. `outputOf` reads it off
the pin (`src/core.ts:147`), so changing it is a ruleset version, not a code change.

**But for polygons that value is the judgement with its subject thrown away.** Two
projections in the same file, doing the same job:

| Ruleset over | Returns | So a map can |
| --- | --- | --- |
| points — `outreachProjection` | `{...row, status, explanation}`, the subject kept whole including its coordinates | draw the decisions |
| polygons — `extentProjection` | `{id, name, status, areaSquareMetres, explanation}` — **no geometry** | not draw them |

`extentProjection`'s own doc comment says *"The classification, assembled onto the polygons
it is about"*. It is not: the polygons do not come out. So a decision about a shape can be
listed and cannot be drawn, and the inconsistency is invisible until someone tries to map
one.

**This is the fourth instance of the same defect shape on 2026-10-14**, after the `alert`
widget's date, `fw:metricCRS` inside a JSON string, and the derived area this experiment
already fixed: a quantity computed, published, and left where nothing downstream can use
it. Here it is a conclusion rather than a measurement.

### Why it breaks the composite specifically

A composition has exactly one output (`ports.output`, one terminal member,
`src/compositions.ts:155`). A composite of `summarize_hull → apply_ruleset` therefore emits
whatever the ruleset emits.

`snow-extent` feeds the hull to **two** places: the ruleset, and the map that draws the
outbreak outline. Substituting a composite that emits `decisions` leaves the map with
nothing to connect to, because a decision value has no geometry. So the experiment's own
test — the practitioner's method, *substitute it into the worked example and see* — cannot
be run while the ruleset emits decisions. That is what makes or breaks this experiment,
and it is a property of the port type rather than of the composition machinery.

### The change, and what it predicts

The decision travels **on** the record it is about: `extentProjection` returns the polygons
with `status` and `explanation` attached to each feature, and the ruleset declares
`output: "polygons"`.

Predictions, written before building:

1. Substituting the composite into `snow-extent` will then keep **every** edge, because the
   composite emits what the hull emitted plus a judgement. The one-output limit stops being
   a blocker without being changed.
2. The decision will survive operations the decision table never could: clipping or
   summarising the polygons afterwards keeps the status, where today it is dropped at the
   ruleset.
3. The map will be able to colour by status, which is the first time a rule result is
   visible as geometry rather than as a row.
4. Nothing is lost for the table: a polygons value carrying status is a superset of the
   rows the decision table read.

If prediction 1 fails, the obstacle is the composition machinery after all, and the
one-output limit is the thing to argue with.

## The question to settle before building it

A composition passes values to its members two ways, and a ruleset fits neither
cleanly.

| Route | What it allows | What it costs |
| --- | --- | --- |
| **Exposed** as a public parameter | a practitioner could choose the ruleset on the node | impossible today: `CompositionParameter.default` is `string \| number \| boolean`, and a ruleset pin is `{id, version}` |
| **Fixed** by the author | works now, `fixed` takes any value | the ruleset version is frozen inside the composition, and the drift report tracks member *widget* release digests only. The ruleset could publish 1.1.0 and every pinned composite would keep running 1.0.0 with nothing saying so |

`compute_walking_catchment`, the only composition that exists, has no member
carrying a pinned artefact of its own, so neither case has ever been exercised.

**Prediction, written before building:** the composite will be buildable by fixing
the ruleset pin, and the drift report will stay silent when the ruleset moves. If
that holds, the composition is feasible and the pinning is incomplete — a
composition pins its widgets and not what they were told to apply — and that gap
is the result of this experiment rather than a reason not to build it.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-14 | Rules over geometry: a quantity derived, attached, and classified |
| 2026-10-14 | "How can decisions be an output?" — the question that decides the experiment. A ruleset over points returns its subject whole; a ruleset over polygons returns the judgement without the geometry, so a decision about a shape cannot be drawn and the composite cannot replace the hull in the worked example. Fourth instance of the day's defect shape. The fix and its four predictions recorded |
| 2026-10-14 | Status to tried. Predictions 1 and 2 held; the blocker is fixed, `extent-review` ships and `snow-extent` runs it end to end. The composition is still not built, and the question that blocks it is recorded: a composition can fix a ruleset pin but cannot expose one, and nothing reports a ruleset moving under a pinned composite |
