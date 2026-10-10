# 89 · The first composition

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** built and run. The artifact [75](75-compositions-as-nodes.md),
[76](76-composition-governance.md) and [77](77-composition-drift-detection.md)
specified, with one of its rules only half-enforceable and said so below.

## What exists

`compositions/compute_walking_catchment/0.1.0.json` — the isochrone chain as one
step: snap to the network, traverse to a budget, narrow to a band, draw the
corridor. Four members, each pinned to a published version and its digest.

Running it produces **four receipts, one per member**, which is
[75](75-compositions-as-nodes.md)'s D8: a composition must not emit one receipt
claiming work its members did. The numbers in those receipts are the ones the
Validation Lab checked — 706 junctions traversed, 142 in the five-minute band,
301 streets entered, 45 cut part-way.

## The two predictions from [78](78-trying-compositions-on-isochrone.md)

**1. "Most of the work is the missing primitives, not the composition
machinery."** Held, and by a wide margin. Eight primitives were built across
experiments 80–88, each with its own admission review, tests, release file and
ontology terms. The machinery is one module and one validator.

**2. "The knobs will not distribute evenly, and that is the test."** Held, and
the result is more interesting than the prediction:

| | `isochrone` | `compute_walking_catchment` |
| --- | --- | --- |
| Knobs | 9 | 9 |
| | zone, hemisphere, minutes, thresholds, fillHoles, speedMPerMin, bufferM, maxSnapM, direction | zone, hemisphere, maxSnapM, travelMode, speedMPerMin, direction, traversalMinutes, minutes, bufferM |

The same count, and a **different set**. `travelMode` is new, and it exists
because the composition had to state what the speed means
([83](83-reachable-junctions.md)). `thresholds` and `fillHoles` are gone:
thresholds became a second node per band, and filling became
`fill_interior_gaps`. And `minutes` split into two — the traversal's budget and
the band being drawn — which the monolith conflated.

So the knobs did not reduce. They moved to the steps that act on them, and two
of them turned out to be two questions wearing one name.

## What the validator enforces, and what it cannot

| | |
| --- | --- |
| **Nothing outside the registry** | Member types are checked against `TYPES`, and each is pinned to a published version *and* its digest. A digest that is not that release's is refused with "re-pin it rather than editing the digest" |
| **No port the graph contradicts** | Public ports map to member inputs no internal edge fills, each covered once and typed to match. The walking catchment has **four** open inputs behind **two** public ports, the network fanning out to three members — declared, because two ports of one type are not necessarily one input |
| **The name asserts the stage** | The verb comes from a closed set, and a declared stage that differs from the name is refused. A name the palette already uses is refused outright |
| **A parameter is not in two places** | Fixed and exposed at once is refused; expansion refuses to run without a value for every declared parameter |
| **Not enforceable** | **A parameter that is neither exposed nor fixed.** `ParamsByType` is a TypeScript type with no runtime form, so there is nothing to enumerate a widget's parameters from. [76](76-composition-governance.md) states the rule; half of it is checked. Closing it needs the parameter list in each release file, which is a change to the registry rather than to this module |

## Drift, measured rather than designed around

[77](77-composition-drift-detection.md) asked for three states. All three are
reported, per member, with what moved:

| State | Detected by | Reported as |
| --- | --- | --- |
| **Unchanged** | pinned version is current and its digest matches | nothing to act on |
| **Moved** | a newer version is current, *or* the pinned release's digest has changed | which member, from which version to which, and to read that release's changes |
| **Gone** | the type is absent, or the pinned release is no longer published | which member, and that what it did cannot be reproduced |

The second row is two different events deliberately reported as one state: a
member that published 0.3.0 while this pinned 0.2.0, and a member whose 0.2.0
was *edited underneath it*. The first is ordinary and the second should not
happen — release files are immutable once committed — so detecting it matters
more than distinguishing it.

**Detection reports; it does not decide.** Whether a drifted composition opens,
annotates or refuses to run is the product question
[77](77-composition-drift-detection.md) raised, and answering it inside a
utility would have hidden the choice.

## A naming collision, found by implementing

[76](76-composition-governance.md) specified the stage verbs as "check, compute,
relate, **summarise**, classify". Implementing that put compositions named
`summarise_*` beside widgets named `summarize_*` — `summarize_polygons` predates
all of this, and `summarize_hull` was renamed to match it the same day. The
identifier is `summarize`; the stage is still "summarise" in prose and in the
glossary. Experiment 76 is corrected.

## What this does not establish

**It is not on the canvas.** A composition runs by expansion: its members become
ordinary nodes and the existing executor runs them. Nothing yet adds one to a
canvas as a single node that can be opened, which is what
[75](75-compositions-as-nodes.md) describes and what a practitioner would
actually use. The artifact, its governance and its drift detection are real; the
interface is not built.

**It is private, and that is not modesty.** Admission to the palette needs a
human review and an ontology expansion. Neither exists, so the status is
`private` and the governance record says who assembled it and that nobody has
reviewed it.

**And the claim that matters is still untested.** Whether four visible steps are
easier for a public health practitioner to understand than one node with nine
knobs is the whole point of compositions, and nothing here measures it. The
decomposition agrees with the monolith to 3.8 parts per million; that is a
statement about arithmetic, not about comprehension.
