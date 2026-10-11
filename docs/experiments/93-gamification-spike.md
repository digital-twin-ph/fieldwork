# 93 · Architectural spike: gamifying the workflow

_Created 2026-10-11 · Updated 2026-10-11_

**Status:** spike. Nothing is built, and the purpose is to find out what would
have to be true before anything is.

## The question

Can a practitioner's use of Fieldwork be quantified — points, badges, levels —
in a way that **improves the analysis** rather than the number?

Asked as an architectural spike because the hard parts turn out to be
architecture and measurement, not interface.

## What is already here to build on

| Already exists | What it gives a scheme |
| --- | --- |
| **Receipts** on every node, every run | An evidence trail that cannot be faked by clicking. Anything scored from receipts is auditable the way everything else here is |
| `usage:widgets` | Widget-to-example counts, computed from data rather than declared |
| [79](79-emergent-palette-slicing.md) | Emergent structure already measured: four widgets appear in 6–7 examples and 22 in exactly one, decided by nobody. And the **trap**: frequency conflates "specific to a question" with "added last week" |
| [75](75-compositions-as-nodes.md), [76](76-composition-governance.md) | A practitioner composing a micro-workflow is a real milestone with a real artifact, pinned and governed |
| The case studies' own levels | Basic, Advanced 1, Advanced 2 — authored by the people who wrote the material, not invented here |
| The rule-audit discipline | A rule is provisional until it has fired and addressed a gap. A scoring rule is a rule |

## The hazard, stated first

**Points for widget use reward using more widgets.** Good analysis uses fewer,
better-chosen steps, and a counter cannot tell a necessary step from a
redundant one.

This first read "the walking catchment is *better* as four steps than nine
knobs", which was an assertion dressed as a premise and is corrected in
[94](94-where-explanation-belongs.md). Four nodes are not self-evidently
clearer than one: they are four labels, four parameter sets and three
connections to hold in mind. Whatever compositions are for, it is not that more
nodes explain themselves — which makes the counting hazard worse, not better,
because there is no direction in which node count reliably points.

[79](79-emergent-palette-slicing.md) already found the same shape in a different
measure: `voronoi` appears in one example because it is specific; 
`find_health_facilities` appears in one because it is new. **Frequency does not
know why.** A score built on frequency inherits that blindness and adds an
incentive to it.

So the first question is not how to count. It is **what behaviour the project
wants more of**, and whether a number can stand for it.

## The idea worth spiking: score the evidence, not the activity

Everything this application does well, it does by refusing precisely and
recording assumptions. Today alone: the travel mode is checked against the
speed; the 1854 Soho walking assumption is stated in every result; a licence is
recorded; a corridor says the ground it added was never reached.

A scheme that rewarded **provenance completeness** would reward exactly that:

| Rewarded | Why it is the behaviour wanted | Derivable from |
| --- | --- | --- |
| Choosing a speed for your setting rather than keeping the default | The default is an 1854 Soho assumption and the project says so in every result | `fw:assumedSpeedMetresPerMinute` against the composition's default |
| Declaring the travel mode | Makes a number interpretable | `fw:travelMode` |
| Attaching a reference to a source | Provenance a reader can follow | `node.references` |
| Recording a licence for acquired data | 969 of 2,763 STAC collections say "proprietary" and mean nothing by it | receipt licence assertions |
| Resolving a refusal | "These bands are not nested" is a lesson; getting past it is learning | a refused run followed by a passing one |
| Authoring and admitting a composition | A real artifact with real governance | `compositions/` |

Each is a **fact in a receipt**, not a click. That makes the score auditable,
and it means the scheme cannot be gamed except by doing the thing.

It also inverts the obvious design: a practitioner who builds a four-node
workflow with complete provenance outscores one who builds twenty nodes without
it. Whether practitioners experience that as fair is unknown and is the kind of
thing this spike exists to find out.

## The architectural findings

**Fieldwork has no notion of a person.** No account, no profile, no identity;
`localStorage` holds workspaces, a build marker and a download throttle. A score
belongs to somebody, so the first architectural question is whether to introduce
an identity — and the honest default is not to. Progress stays on the device,
unexported unless the practitioner exports it.

**A workflow must not carry a score.** A workflow is a scientific artifact that
gets shared, reviewed and re-run. Putting points in it would mean a reviewer
receives someone's game state with their analysis, and the project manifest
would inventory it. Progress is a separate store, and the architecture has to
keep it separate or the separation will erode.

**Unlocking is the fork that matters.** Two readings of
[79](79-emergent-palette-slicing.md)'s skill levels:

- **Progressive disclosure** — a learner's palette starts small and grows. Help,
  not gate: everything remains reachable.
- **Unlocking** — widgets are withheld until earned.

The second would make a public-health tool withhold a capability from somebody
doing their job. That should be refused, and the refusal recorded here so it is
not revisited by accident.

**Badges describe what was done, not what somebody knows.** "Ran a network
catchment with a speed you chose for your setting" is a fact in a receipt.
"Isochrone expert" is a competence claim this project cannot back, and the same
discipline that stopped `evidence.status` saying `parity-checked` applies.

## What a minimal spike would build

Enough to learn, and no more:

1. A read-only **tally derived from existing receipts** — no new instrumentation,
   no new storage. If the receipts cannot already answer it, that is the finding.
2. One screen showing what a practitioner did and what provenance is missing.
3. **No points, no badges, no levels in the first cut.** Measure what the
   evidence can support before attaching a number to it.

Step 3 is the discipline the rule audit asks for: the scoring rule is a rule,
and it stays provisional until it has fired on real use.

## Predictions, written to be wrong

1. **The receipts already contain enough** to compute every achievement worth
   having, with no new tracking.
2. **A widget-use count will not correlate with workflow quality** on the seven
   worked examples, and may correlate negatively once node count is controlled.
3. **The hard part will be deciding what not to score**, not computing anything.
4. Practitioners will ask for a leaderboard, and a local-first tool with no
   identity cannot provide one without becoming a different product.

## What this does not establish

That gamification helps at all. The case for it is about motivation and learning
([74](74-notebook-first-worked-examples.md) is the method that would judge it),
and motivation is a claim about people that no receipt can settle. There is also
a real possibility the answer is no: that a professional tool used for outbreak
work is the wrong place for points, and that the same effort spent on clearer
refusals would teach more. The spike should be able to end that way.
