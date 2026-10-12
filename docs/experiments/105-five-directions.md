# 105 · Five directions, and which ones this project can see in

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** tried — the five directions are recorded as the method, and this project's own
machinery is audited against them. Two directions have no mechanism and one of those cannot have
one, which is a finding rather than a backlog item.

Searched `docs/` first, per [the standard](README.md): the prior statement is the glossary's
**Developmental evaluation** entry, which describes the stance — *"the framework is watched as it
emerges rather than built to a specification"* — and names no directions. Nothing else states a
method. This extends that entry rather than restating it.

## The question asked

The practitioner, after a day of findings that each arrived from a different angle: *"In a DE
project, we look back, we look forward, we look sideways, above and below."*

Taken as a method rather than a mood, that is testable against the project itself: **which of the
five can this project actually see in, and with what?**

## What happened

| Direction | The question it asks | Mechanism | State |
| --- | --- | --- | --- |
| **Back** | Does what we already built still pass what we now know? | `validate:admission` — each criterion's last change against its last sweep; and *what changed our minds* in every document | **Mechanised**, 2026-10-12 |
| **Forward** | What would close this, and what is it heading for? | *What would close it* on every open document; `widgets/budget.json`'s target of 41 | **Mechanised**, 2026-10-12 |
| **Sideways** | Does this already exist, under another name or in another document? | D2 and its follow-through; `grep -ril docs/` before a new document | **Half** — the criterion is enforced, the search is discipline |
| **Above** | Does it serve the goal? | the goal statement at the head of [the TODO](../todo.md), read by a person | **None, and should stay that way** |
| **Below** | Does the implementation do what the declaration says? | nothing | **None** |

**Four of the five got their mechanism today**, which is less impressive than it sounds: the two
that did not are the two where this week's worst findings came from.

### Sideways is where both duplicate failures happened

[93](93-gamification-spike.md) re-derived [27](27-workflow-learning-and-gamification.md).
[102](102-widget-names-and-worked-examples.md) re-derived
[the widget audit](../audits/widget_audit.md), less accurately, two days after that audit had
answered the same practitioner's question. D2 recorded three implementations of one operation and
attached no disposition, so three survived.

The criterion half is now enforced. The search half is a sentence in a standard, and a sentence is
what failed twice. Recorded as a known limit rather than solved, because the obvious
mechanisation — an index of what each document settled — is worth building after a third
instance, not in anticipation of one.

### Above cannot be mechanised, and pretending otherwise would be worse

The goal is to empower public health practitioners in the practical use of GIS in field
workflows, where resources and connectivity may be scarce. Nothing can check an item against
that. What can be done is to keep saying who benefits, and this project does, sometimes
uncomfortably: [96](96-the-experiment-document.md) states that the experiment standard's
beneficiaries are *"us and future contributors, not a public health practitioner in the field"*,
and [the TODO](../todo.md) separates its items by who they reach.

Measured honestly for 2026-10-12: a long day's work produced **two changes a field practitioner
would notice** — the run timer with the per-widget glow, and the donut card — against an
experiment standard, three ratchets, a criteria clock, two audits and eleven lab checks, all of
which serve the project. That is defensible for a framework still emerging. It is not defensible
indefinitely, and only a person reading the goal will ever say so.

### Below is the gap with the most evidence

Three findings today came from reading code against what the registry claims, each by hand:

| Found | The declaration said |
| --- | --- |
| `implementationStatus: 'retired'` is accepted by the validator and **read by no file in `src/`** | that retirement is a supported lifecycle state |
| Eight sites convert metres to angles through a constant, with a −0.56% to +0.32% error | nothing; no release mentions it |
| Four port names encode a use, in `TYPES` | release `ports` list types, which are all correct; the names are not in the release at all |

Each was found because somebody looked, and the third only because a criterion was extended the
same day. A release file is a claim about an implementation and nothing compares the two.

## What would close it

A mechanism for **below**: a check that each release's declared fields are honoured by the code —
beginning with the narrowest case, that a declared `implementationStatus` has an effect. And a
decision on **sideways**, which is whether the search stays a discipline. This moves to
`validated` when below has a mechanism and the sideways decision is recorded either way.

## What changed our minds

**The five directions are not equally hard, and the easy ones got done first — today, by
accident.** Back and forward were mechanised within an hour of each being named, because both are
questions about *records*: when was this swept, what would close this. Below is a question about
*code against claims*, which is harder and has no file to ratchet. Above is a question about
*people*, and has no mechanism at all.

So the order the mechanisms arrived in is the inverse of the order the findings arrive in. Today's
substantive discoveries — the metre conversions, the inert retirement status, the port names, the
three duplicate implementations — were all **below** and **sideways**. The two directions with
machinery produced no findings today; they produced *confidence about* findings already made.

That is worth holding onto: **a ratchet records a lesson, it does not find one.** Every finding
this week came from reading something — a line of source, a widget's own output, an October
document — and the machinery's job is only to stop the finding being lost or re-derived.
