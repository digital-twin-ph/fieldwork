# 113 — Rules over geometry, as a composition

_Created 2026-10-14 · Updated 2026-10-14_

**Status:** asked

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
