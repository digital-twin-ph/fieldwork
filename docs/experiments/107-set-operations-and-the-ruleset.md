# 107 · Intersections, unions and memberships — and where each belongs

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** asked — a design study, no code. The practitioner's question: *"We may need a widget
that processes intersections, unions, memberships. Let's study this in relation to the emergent
policy widget."*

**Searched first**, as [the standard](README.md) requires. `grep -ril
"intersection\|union\|set operation\|membership" docs/experiments/` returns eight documents and
none of them designs set operations: [01](01-study-area.md) and
[68](68-area-around-a-point.md) mention a union in passing,
[29](29-raster-edge-inclusion.md) is about raster edges,
[87](87-declarative-chart-transforms.md) names a *location-membership-count* as a chart measure,
and the rest are incidental. The question has not been asked here before.

## The answer in one fact

**EYE has no spatial builtins, so rules cannot make geometry.** Everything below follows from that,
and it divides the question cleanly rather than leaving it a matter of taste.

| | Geometry level — new geometry out | Subject level — which records qualify |
| --- | --- | --- |
| **Intersection** | `clip_polygons`, via `polyclip-ts.intersection` | **AND** within one rule |
| **Union** | `summarize_combined_area`, via `polyclip-ts.union` | **OR** across rules sharing a conclusion |
| **Difference** | **nothing** — `polyclip-ts.difference` ships and is unused | **not expressible** — the subset has no negation |
| **Symmetric difference** | **nothing** — `polyclip-ts.xor` ships and is unused | not expressible |
| **Membership** | `pointRelation` → `coverage_check` | an asserted fact the rules read |

So the study's first finding is an inventory one: **both intersection and union already exist, and
each is welded to one shape of input.** `clip_polygons` intersects an *area* with a *layer*;
`summarize_combined_area` unions the polygons *within one layer*. Neither is a general operation
over two layers, and the library has shipped `difference` and `xor` the whole time.

## What this says about the policy widget

**Do not build a set-operations widget for memberships.** Subject-level intersection and union are
already what the rule builder's AND and OR are: AND is the intersection of the satisfying sets, OR
is their union. A widget for them would duplicate [106](106-rule-builder-ui.md)'s authoring surface
with a second, incompatible way to say the same thing.

**Membership is the bridge, and the pattern already ships.** `coverage_check` computes point-in-
polygon in TypeScript, asserts the result as a fact —

    <record> fw:spatialRelation fw:Inside .

— and its rules reason over the asserted relation, never over the geometry. Its own comment says so:
*"Point relations are computed locally."* That is how a spatial condition reaches a ruleset without
spatial builtins, and it is why no geospatial rule language is needed
([106](106-rule-builder-ui.md), the same finding from the other direction).

### The sharp part: difference is where the two levels diverge

At the geometry level, difference is one library call nobody has exposed. At the subject level it is
**not expressible at all**, because the subset has no negation and negation-as-failure is excluded
on purpose — adding a fact must not retract a conclusion.

But there is a workaround, and the project already relies on it twice without having named it:

> **A relation that is total over a closed vocabulary makes difference expressible without
> negation.** If every subject receives exactly one of `Inside`, `Boundary`, `Outside`, then
> *not inside* is `Outside` **or** `Boundary` — a union of positive facts, which the subset has.

That is the same trick as `fw:alertKnown`, `fw:distanceKnown` and `fw:accessKnown`: express absence
as a positive value so a rule can match it. Membership and missingness are the same problem, and
totality is the same answer.

**Which yields a design rule with teeth.** A membership widget must assign a value to **every**
subject from a closed vocabulary and must never drop non-members, because dropping is precisely what
makes difference inexpressible downstream. And `coverage_check` violates it where it matters:
`retainedData` filters on the `excluded` flag, so the layer it passes on has records removed. The
relation is total; the layer it hands downstream is not.

## What a geometry set-operations widget would be

Two polygon layers in, one layer out, with an operation knob: intersection, union, difference,
symmetric difference. One widget for four operations.

**Why a knob is right here and was wrong for the selection widget.** Earlier the same day a
spatial-selection widget with output modes was rejected, because its modes — a boolean, the
members, the counts — are different *layers* of answer and giving one widget all three fuses policy
into geometry. This is not that. All four set operations take the same two inputs and produce the
same carrier, so the knob changes the **operation** and not the **ports**. That is the test:
a knob is honest when the contract does not move with it.

**The count.** It is plus one widget covering four operations, and it may be net negative: a general
two-layer intersection subsumes `clip_polygons`, and a general union may subsume
`summarize_combined_area`. Both subsumptions depend on a question this record does not settle —
whether an `area` can present itself as a one-polygon layer, which is the carrier question
[66](66-ports-as-schema-binding.md) owns.

## Distinctions, and how each would be enforced

| Distinction | Enforcement |
| --- | --- |
| Rules cannot make geometry | **Structural**: geometry operations are widgets; EYE provides no spatial builtin and none is proposed |
| A set operation on subjects is AND or OR, not a widget | **Design refusal**: recorded here, so a membership-set widget is not proposed again |
| A membership relation is total, and nothing is dropped | **Validation rule**: every subject carries a value from the declared vocabulary; a widget that drops non-members makes difference inexpressible for everything downstream |
| A knob may change an operation, never a contract | **Precondition**: all modes share one port set and one output carrier, which is what separates this from a selection widget with output modes |
| Difference exists at one level and not the other | **Limitation**, stated: at the subject level it is a union over a total relation, not a negation |

## Where DE-9IM enters

_Added 2026-10-12, after OGC and ISO geometry standards were assessed against this project
(`docs/research/ogc-standards-assessment-2026-10-12.md`)._

The project emits three DE-9IM predicates — `geo:sfWithin`, `geo:sfTouches`, `geo:sfDisjoint` — and
those are **exactly the three that are non-trivial for a point against a polygon**. A point cannot
overlap, cross or contain one, so the vocabulary is complete for the geometry the project holds, and
adopting the rest today would add terms nothing could assert.

**The two-layer set operations proposed above are what makes the rest meaningful.** Between two
polygons, `sfIntersects`, `sfOverlaps`, `sfContains` and `sfCrosses` are all distinct and all
assertable, and none is emitted anywhere. So this record is where DE-9IM stops being a reference
and becomes a requirement: a widget that intersects two layers should assert *which* relation each
pair stands in, not only hand back the resulting geometry.

That also sharpens the membership rule above. For points the relation is total over three values
because three is all there are. For polygons it is total over a larger closed set, and the same
argument applies unchanged: difference stays expressible without negation only while every pair
carries a relation from the declared set.

## What would close this

A two-layer set-operations widget with the four operations, and a decision on whether `area`
presents as a one-polygon layer — without which it adds a widget instead of replacing two.

## What this does not establish

That any practitioner wants difference or symmetric difference. The library has shipped them for the
project's whole life and nothing has asked, which is weak evidence against urgency and no evidence
against need. [63](63-worked-example-runbooks.md)'s observation would settle it.

Nor that `coverage_check`'s dropping of excluded records has ever caused a wrong answer. It is a
latent constraint on what downstream rules can express, found by reasoning rather than by a defect.
