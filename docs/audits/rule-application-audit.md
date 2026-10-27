# Audit — `apply_ruleset`

_Created 2026-10-14 · Updated 2026-10-25_
_Uses a term this project withdrew on 2026-10-12, named in [the withdrawn-vocabulary ledger](../withdrawn-vocabulary.json). The text stands as written — it is evidence of what was thought then, and rewording a dated record would falsify it. Live text says **port type** for what a connection is checked against._


The first widget out of the audit queue opened on 2026-10-14
([widgets/audit-queue.json](../../widgets/audit-queue.json)).

## What it declares

**No input ports of its own.** `nodeInputs` returns
`node.params.ruleset?.inputs ?? []`: the ports come from whichever ruleset is
pinned into the node, and an unconfigured node has none, which the source defends
as the honest answer for a node whose ruleset has not been chosen.

| Ruleset | Declared inputs | Output |
| --- | --- | --- |
| `outreach-criteria` | `distances`, `alert` | `decisions` |
| `access-review` | `distances` | `decisions` |
| `nb06-evidence` | `facilities` | **`points`** |

So "the decision widget" does not always produce decisions: one of its three
rulesets emits a graded point layer.

## The design intent

Stated by the practitioner on 2026-10-14, and it is the right frame for the rest
of this audit:

> The reason a ruleset apply widget does not have an input type is because it can
> have any, where there are columns to filter, classify, aggregate, count,
> compute. The input can be table (CSV, JSON), can be geometry (GeoPackage,
> GeoJSON).

The widget is meant to ask for **roles**, not port types. The
[glossary](../glossary.md) already has the pair this describes, and it is worth
using the words that survived the 2026-10-12 vocabulary audit rather than the one
that did not:

> **Role** — what a widget needs, described by meaning rather than by column name.
> *A widget cannot know what your columns are called, so it asks for roles.*
>
> **Binding** — which of your fields plays which role. Chosen by you from what the
> connected data offers, never guessed, and recorded in the receipt.

The intent is that a ruleset states roles, and the practitioner states the
binding. Whether the fields arrive as a table or as geometry is then incidental.

## Where the implementation is not that

**It has roles and no binding.**

A ruleset declares what it needs **semantically** — predicates, with types and
units:

```json
"expects": [
  {"predicate": "fw:accessKnown", "type": "boolean"},
  {"predicate": "fw:proxyMinutes", "type": "number",
   "unit": "http://qudt.org/vocab/unit/MIN"}
]
```

That half is independent of how the value travels, and is good. But three other things in the same file
and in the code are not:

| | Where | What it fixes |
| --- | --- | --- |
| `inputContract.ports` | the ruleset | one port type |
| `inputContract.factGenerator` | the ruleset | **a named function in the code** — `src/old-naledi.ts#accessN3` |
| `projectionOf(id, version)` | `src/core.ts` | a five-way dispatch on the ruleset's identity |

That is a role, stated well: a number, meaning travel time, in minutes. What is
missing is the **binding** — which field of the connected data plays it. In its
place `factGenerator` names a TypeScript function that already knows one input
shape, so the binding is made in code, by the author, once, instead of by the
practitioner from what their data offers.

The project has the idiom elsewhere: `csvPoints(table, {x, y, id, name, units})`
is a binding, and the import dialog is a UI for choosing one. It exists for ingest
and not for rule application.

## The measurement: two of five projections adapt a thick port type

`apply_ruleset` dispatches into five projections. Three are distinct rule
applications. **Two are the same rules reached through a different port type:**

- `access-review` runs `applyAccessReview(inputs.access, …)`.
  `access-review-distances` runs `applyAccessReview(distancesAsAccess(inputs.distances), …)`
  — the source comment says it plainly: *"Same rules, same facts, read off the
  general carrier that nearest and travel_time produce instead of the one `access`
  emitted."*
- `facility-grading` and `facility-grading-points` both run
  `applyFacilityGrading(inputs.facilities, …)` and differ in how the result is
  wrapped.

So **two of the five branches are adapters, not rules.** And the thing being
adapted is named in the glossary: `access` is its canonical **thick port type** —
one whose value carries fields beyond what its name implies, four of which
surfaced only when it was decomposed. `distancesAsAccess` is the shim between that
thick type and the thin `distances` the general widgets emit.

So the cost of the missing binding is paid twice: once in branches here, and once
in the thickness of the port type those branches exist to reconcile.

## What the audit concludes

**The widget is one primitive, not five.** The earlier merge was right: three
widgets that "differed only in which rules they ran" became one. The five
projections are not five meanings; they are three meanings plus two adapters.

**It is not finished.** The intent — a ruleset that states roles and a
practitioner who states the binding — is reachable, and the distance to it is one
declaration: a binding from the connected data's fields to the ruleset's `expects`
roles, replacing `factGenerator` and collapsing the two adapter branches. The
glossary already names the whole of it — a **port contract** is the value's
structural class, its roles and its conditions, *"declared rather than implied, so
it can be read, tested and queried"*. Until then a new ruleset cannot be added without writing a fact
generator in TypeScript and adding a case to a switch, which is the opposite of
what "declared rules as data" promises.

**Its name is accurate and its group is right.** Nothing here is a naming or
placement finding.

## What this audit does not establish

It does not establish that binding works for geometry as cleanly as for tables. A
GeoPackage attribute and a CSV column are both named fields a practitioner can
point at, but a geometry also has derived quantities — area, length, a centroid —
which are not fields and which no binding UI would show. No ruleset here asks for
one yet, so the case is untested.

It does not establish that the two adapter branches are the only ones. Five
projections were read; a sixth ruleset could need a third adapter, and nothing
counts them. It also does not establish that retiring `access` is the right fix
rather than binding around it; that is a separate question about a port type the
2026-10-12 audit already found thick.

It does not assess whether any of the three rulesets is scientifically
appropriate. `outreach-criteria` states of itself that its threshold is a
practitioner judgement with no published basis, and
[validate:rulesets](../../scripts/validate-rulesets.mjs) reports all three as
having no resolvable evidence.
