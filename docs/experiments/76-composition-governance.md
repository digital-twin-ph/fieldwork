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

**A name.** The widget naming convention governs node types the project controls.
A practitioner naming their own routine primitive is not bound by it and should
not be while it is private. A published one read as equivalent to a reviewed
widget is the `xpert` problem with more authors.

**A public parameter set.** Which of the members' parameters the composition
exposes. This is the only genuinely new design decision: too few and it is rigid,
too many and it is the internal graph with extra steps.

**A claim.** What the composition says it does. D7 applies here and nowhere else
in a composition, because everything underneath already passed it.

## Three levels, and the ends already exist

| Level | Governed by | Who relies on it |
| --- | --- | --- |
| **Private** | nothing | one person, in one browser |
| **Shared** | a name that does not overclaim; the member versions it was built against | whoever was sent it |
| **Published** | owner, repository, commit, review state, admission — pack-shaped | anyone |

A **widget** has a registry entry, version, digest, release file and audit. A
**pack** has a repository, a commit SHA, an admission status, named reviews and a
curated owner. A composition climbs between them, and the top rung is already
modelled in `widgets/packs.json`.

Private being governed by nothing is deliberate. Governance costs effort, and
imposing it on something nobody else relies on is how a tool stops being used.

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
