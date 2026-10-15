# 115 — Decomposing `slr_extract_import`

_Created 2026-10-15 · Updated 2026-10-15_

**Status:** asked — the widget is read operation by operation and none of its five
operations is about sea level. The decomposition is designed and not built: its
largest piece needs a declared field schema for tables, which is a standing
blocker with two other callers, and this is the third.

Asked by the practitioner on 2026-10-15, on finding `slr_extract_import` named in the
blocker ledger as the last widget holding `sources-group-does-not-mean-acquisition` up:

> `slr_extract_import` is one of those widgets that need to be revisited. Let's try to
> decompose it into its primitives.

## What it does, operation by operation

Read from `projectionExtract` in `src/sea-level.ts`, 2026-10-15. Five operations, and
the table says what each one is *about*:

| | operation | about |
| --- | --- | --- |
| 1 | Refuses a table missing any of six key columns — `site_id`, `scenario`, `basis`, `family`, `year`, `quantile` | a table's shape |
| 2 | Refuses a value unit outside a declared set of two (`mm`, `m`), and **records** the conversion to metres rather than performing it | a table's unit |
| 3 | Refuses an absent dataset IRI, dataset version, baseline period without a four-digit year, fewer than three citations, or a basis kind outside `workflow \| confidence-pbox` | provenance |
| 4 | Requires two named family values, that they differ, and that **every row's** family is one of them | a column's domain |
| 5 | Derives the distinct sorted `site_id` values, and annotates the table with all of the above, passing the data through unchanged | a column's distinct values |

**None of the five is a sea-level operation.** Four are assertions about a table and one
is a derivation over a column. Every piece of sea-level knowledge in this widget lives in
its *parameters* — which columns, which units, which vocabulary, how many citations — and
its code is general machinery with that knowledge compiled into it.

That is the division this project already enforces one layer down. `validate-rulesets.mjs`
exists to say that **a widget must be general and a ruleset must be particular**, and the
blocker ledger already reached the same verdict about this widget's sibling: *"`slr_`
names a pack, not an operation. Becoming a ruleset makes that correct rather than needing
a fix."* This document is that sentence applied to the extract.

## The mechanism already exists, bound to one port type

`src/attribute-schema.ts` declares a field with a type and, through `parseValueSet`, a set
of allowed values — at most 100 unique. That is operation 4 exactly: a column, a closed
vocabulary, rows outside it refused.

It is written for `PointCollection` alone. `validateAttributeSchema(data: PointCollection,
…)` is the whole surface, and nothing equivalent exists for `table`, `raster` or `network`.
So `slr_extract_import` hand-codes, for a table, a mechanism the project already has for
points — which is what the `typed-field-schema` blocker says, and this is a third caller
for it beside generic role binding ([65](65-ruleset-as-data.md)) and the table-to-points
conversion. The `filter-values-from-a-connected-port` entry states the rule that follows:
*"Three callers is the argument for building it rather than three arguments for three
mechanisms."*

## The decomposition

| | piece | what it is | state |
| --- | --- | --- | --- |
| P1 | operations 1, 2, 4 | a **declared table contract** — required key columns, admissible units, a closed domain per column — applied the way a ruleset is applied | **blocked**: no declared field schema for tables, and 0 of 7 published ruleset versions declares a `table` input port |
| P2 | operation 3 | **not a primitive at all.** Dataset, version, baseline and citations are provenance, and this project already has evidence references of a url-or-pdf-with-digest shape | unblocked, and an improvement — see below |
| P3 | operation 5 | **distinct values of a column**, which may not need a widget — see below | unblocked |

**Net widget count: −1.** `slr_extract_import` retires; P1 arrives as declared data rather
than as a widget; P2 is an existing mechanism; P3 is a knob or nothing. 46 live widgets
today against a target of 41, so a decomposition that *reduces* the count is the rare kind.

### P2 makes the citations better, not merely different

The three citations are plain strings today. The ruleset ledger already recorded what that
is worth, about a different artefact and in the same words: `nb06-evidence` *"looked cited
and is not: three author-year strings are what the project holds, and they open nothing."*
An evidence reference is a url or a digested PDF. Moving operation 3 to references turns a
licence obligation that is currently satisfied by typing three strings into one that is
satisfied by something a reader can open.

### P3 may not be a widget

Operation 5 derives distinct column values, and the function **already exists**:
`selectionDomains` in `src/sea-level.ts` returns the distinct values of every key column.
It is exported, and outside one test nothing calls it — computed, published and inert,
which is the shape this project has now found eight times.

Whether it earns a widget depends on who needs it. The one consumer named anywhere is
`nearest`'s candidate filter, which the `filter-values-from-a-connected-port` blocker wants
to bind to `extract.siteIds` read from a connected table. If `CandidateCondition` learns to
bind its values to a column of a connected input, `nearest` reads the column itself and
**no distinct-values widget is needed** — and by the knob test of
[107](107-set-operations-and-the-ruleset.md), that binding is a knob, because `nearest`'s ports do not move
with it. There is no port type for a list of scalars, and inventing one to carry six site
ids would be the worse answer.

## What decomposing costs: a ruleset flags, this widget refuses

The real obstacle is not plumbing. Today a malformed extract **stops the run** with a
specific message — *"A projected value without its full key cannot be interpreted"*. A
ruleset classifies and leaves the decision to the reader: `extent-review` says so in its
own text, *"Not a judgement that large is wrong."*

So P1 as a ruleset changes the behaviour from refusal to flagging unless something new
decides to stop. That question — **can a declared ruleset refuse?** — is not about sea
level and is not answered anywhere in the corpus. It is the first thing to settle, because
it decides whether P1 is a ruleset at all or a general validating widget that happens to
read its contract from declared data.

The three candidate answers, with what each costs:

1. **A ruleset may declare its conclusions fatal.** One field on the output vocabulary. Cheap,
   and it gives every ruleset the power to stop a run, which is a large change to what a
   ruleset is for.
2. **A general `check_table_contract` widget reads a declared contract and refuses.** Keeps
   refusal where refusals already live. Costs +1 widget, so the net becomes 0 rather than −1.
3. **It flags, and a practitioner decides.** Cheapest, closest to the existing ruleset model,
   and a behaviour change for the sea-level example: a malformed extract would reach a
   decision table instead of stopping. Whether that is better is a judgement about
   practitioners, not a measurement.

**Recommendation:** 3 for the column domain and the unit, 2 for the missing key columns. A
table lacking `site_id` cannot be interpreted at all, so nothing downstream can act on a
flag about it, while a row with an undeclared family is exactly the kind of thing a reader
should see rather than have hidden by a stopped run. That split is a claim about which
failures are legible, and it is the one piece here that a practitioner should overrule if
they disagree.

## What this does not establish

That the AR6 knowledge in this widget is *correct*. Nothing here re-reads the dataset
documentation; the six key columns, the two units, the two basis kinds and the three-citation
obligation are taken from the widget as written, and a decomposition preserves a wrong
vocabulary exactly as faithfully as a right one.

Nor that the sea-level example would produce identical results after the split. It should,
and no fixture has been replayed to show it, because nothing is built. Operation 2 is the
one to watch: the conversion to metres is *recorded and not performed*, so any decomposition
that performs it changes every comparison downstream.

Nor that this widget is the worst of the three. `slr_site_assignment` is blocked on the
candidate-filter binding and `slr_threshold_comparison` compares field to field, which the
authored ruleset form cannot express. All three want the same missing mechanism, which is
the finding worth more than any one of them.

## What would close it

A decision on the refusal question above — whether a declared ruleset may stop a run —
since that decides whether P1 is declared data or a general widget, and the net widget count
follows from it. Then a declared field schema for `table`, which `typed-field-schema` gates
and which this makes a third caller for.

Both are decisions and code, not observations, so neither waits on a phase this project has
not reached.
