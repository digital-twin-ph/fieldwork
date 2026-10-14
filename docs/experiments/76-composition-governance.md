# 76 · Composition governance, inherited and added

_Created 2026-10-10 · Updated 2026-10-10_

**Status:** admission review, written before the code. Companion to
[75](75-compositions-as-nodes.md), which proposes the mechanism.

## The claim to be proved

A composition's governance is **mostly inherited**, because it may contain only
widgets already in the registry. What has to be added is small, and it is about
the composition itself rather than its contents.

## What the closure buys

A composition contains only registry widgets. `core.ts` already enforces that for
every workflow, so the rule needs no new code. From it:

| Inherited | Source |
| --- | --- |
| Every member is versioned, digested and has a release file | the widget registry |
| Every member passed the design audit at admission | D1–D10 |
| Every member emits a receipt | the execution contract |
| Every connection type-checks | `validateWorkflow` |
| Every member's ontology mapping is declared | the release files |

So **no part of a composition needs auditing.** That is the point of the rule, and
it is why the constraint is a hard stop rather than a preference: a composition
that could contain something unregistered would inherit nothing and have to be
audited whole.

## What must be added

Three things, none of them inherited.

**A name that asserts where it belongs.** The widget naming convention says
`verb_object` and leaves the verb free. For compositions the verb should come
from a **closed set — the stage taxonomy**: check, compute, relate, summarize,
classify, and the input and output verbs. A composition called
`relate_facilities_to_gauges` has declared its stage in its name.

**Corrected 2026-10-10 when the set was implemented.** This first wrote
`summarise`, which would have put compositions named `summarise_*` beside
widgets named `summarize_*`. Node types in this project take `-ize`:
`summarize_polygons` predates the convention and `summarize_hull` was renamed to
match it the same day. The identifier is `summarize`; the stage is still
"summarise" in prose and in the glossary.

Three things follow.

**It can be tried without renaming anything.** Measured 2026-10-10: of 42
widgets, **one** starts with a stage verb and sixteen are single words with no
verb at all. Applying this to what exists would be forty-one migrations for names
that have obstructed nobody. Compositions are all new, so every one can follow it
from birth, and after a dozen there is evidence instead of an argument.

**The palette tension dissolves.** [75](75-compositions-as-nodes.md) records a
choice between grouping compositions by form — one "Micro-workflows" group — and
by what they do, which scatters a practitioner's own work. If the name asserts the
stage, the group is derived from the name and the choice disappears. What still
needs marking is **authorship**, which is a different axis: project widget, your
composition, somebody else's.

**The assertion can be checked against the graph.** A composition named
`summarise_*` whose members do not reduce rows is claiming something its contents
contradict. A terminal member emitting `decisions` is a classification whatever
the name says. How far the stage is derivable from the members is untested — the
ends look clear and the middle may not be — but it is the difference between a
style guide and a rule that can catch something.

A private composition stays unbound by any of this. A published one read as
equivalent to a reviewed widget is the `xpert` problem with more authors.

**A public parameter set.** Which of the members' parameters the composition
promotes to its own surface.

**Promotion is not exposure**, and that is what makes this decision lower-stakes
than a widget's. A widget's author decides once, for everyone, which decisions
become knobs; anything left out is unreachable. A composition's author decides
only which knobs are *convenient*, because every member knob stays reachable by
opening the graph. Choosing too few makes a composition inconvenient, not rigid.

Which leaves a real but smaller question: too many promoted parameters and the
public surface is the internal graph with extra steps, and the composition has
stopped standing for anything.

**A claim.** What the composition says it does. D7 applies here and nowhere else
in a composition, because everything underneath already passed it.

## The palette is a curated surface

A composition does not appear on the palette by being saved. **It appears by being
admitted**, and admission requires assets and governance. Everything before that
is private work, which is usable and ungoverned.

| Level | Where it lives | Governed by | Who relies on it |
| --- | --- | --- | --- |
| **Private** | your workspace; usable in your own workflows | nothing | you |
| **Shared** | exported and sent | a name that does not overclaim, and the versions it was built against | whoever received it |
| **Admitted** | **the palette** | the assets below, plus review and an owner | anyone who opens the application |

Private being ungoverned is deliberate. Governance costs effort, and imposing it
on something nobody else relies on is how a tool stops being used. The cost
arrives when the claim does.

### What admission requires

A widget release file already carries identity, ports, ontology mappings,
implementation, compatibility, changes and evidence. A pack already carries an
admission record with status, reason, named reviews, an approver and a date. An
admitted composition needs both, plus one thing neither has.

| Asset | Precedent | New? |
| --- | --- | --- |
| **Manifest** — id, version, title, author, released | widget release file | no |
| **Dependencies** — every member at a pinned version and digest | none; widgets have no members | **yes** |
| **Description** — what it does, and what it must not be read as | widget title and node notice | no |
| **Ontology expansion** — its own terms and their mappings | `ontology.mappings` in a release file | no |
| **Governance** — admission status, reviews, owner, approval | `widgets/packs.json` | no |

The dependency list is the new one, and it earns its place twice: it is what makes
the composition reproducible, and it is what makes drift detectable
([77](77-composition-drift-detection.md)). Without it a composition names its
members and nothing more, which is the position every saved workflow is in today.

**Ontology expansion is the asset most easily skipped and least safely.** A
composition that enters the palette is a term practitioners will use. If it adds
no vocabulary it is claiming its meaning is fully given by its members, and that
claim should be made explicitly rather than by omission.

### Why the palette, specifically

Appearing on the palette is a claim that somebody vouches for the thing. That is
what keeps the surface readable: [75](75-compositions-as-nodes.md) records the
risk that project widgets, your compositions and other people's would share one
visual language and lose the distinction. If only admitted compositions appear,
the palette stays vouched-for, and private work lives where private work belongs —
in your workspace, where nobody mistakes it for something reviewed.

## Distinctions it must carry

| Distinction | How enforced |
| --- | --- |
| A composition contains only registry widgets | **Hard stop**, already enforced |
| A private composition is not a reviewed artifact | **Limitation.** It says so; nothing stops its author |
| A published composition is not a widget | **Validation rule.** It cannot enter the widget registry, which is for things the project maintains |
| A composition's claim is its author's, not the project's | **Limitation**, carried wherever it is displayed |

## What this does not establish

That three levels are the right number, or that practitioners will climb them.
The levels are derived from what already exists at the ends, which is a reason to
try them, not evidence they fit.

Nor does it establish that inheritance holds in practice. It holds by
construction while every member is a registry widget at a known version — and
whether that survives a member changing is [77](77-composition-drift-detection.md),
not this.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-10 | Three admission reviews for compositions, written before the code |
| 2026-10-10 | Let a composition assert its stage in its name |
| 2026-10-10 | The palette is a curated surface: compositions reach it by admission |
| 2026-10-10 | Promotion is not exposure: a composition gives both views of its knobs |
| 2026-10-10 | Build the composition artifact, with the isochrone chain as the first one |
