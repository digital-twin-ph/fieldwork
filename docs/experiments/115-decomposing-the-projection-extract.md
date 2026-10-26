# 115 — Decomposing `slr_extract_import`

_Created 2026-10-15 · Updated 2026-10-15_

**Status:** tried — the widget is read operation by operation and none of its five
operations is about sea level. The practitioner settled all three pieces on
2026-10-15, including the refusal question this document could not answer.

**Corrected 2026-10-25: the build had started and this line said it had not**, which is
how it came to be re-derived from scratch ten days later. **P2 is done** —
`provenanceGaps` in `src/sea-level.ts` carries the decision's own words in its comment, and
`projectionTable` already hands the gaps to the run's alert channel. **P1's hardest piece is
done too, under another name**: `authoredSubjects` in `src/authored-application.ts` is a
generic fact generator over a `PointCollection` **or** a `DataTable`, emitting one subject
per row from declared `FieldBinding`s. What P1 still needs is not that machinery but a way
for a *bundled* ruleset to declare its bindings, which is `inputContract.parameterFrom` one
field over. P3 is not built.

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

## The decisions, 2026-10-15

Given by the practitioner, and they resolve the open question rather than choosing between
the three answers this document had offered:

> P1 in 115 is potentially a ruleset. The ruleset widget establishes the contract. AND/OR
> The user must know what fields are required so must feed a table that has the right shape
> and metadata to pass the rules. P2 — Provenance is something we can check if uploaded or
> not and can be flagged as an alert, not a blocker. The user must know where the data came
> from and can note that down in an Inspector field. P3 is an input widget knob (unique
> values required for column x).

### P1 · The contract is the ruleset's own declaration

The refusal question above was over-thought. A ruleset already declares what it needs:
`inputContract.expects` is a list of predicates with their types and units —
`extent-review` declares `fw:areaKnown` as a boolean and `fw:areaSquareMetres` as a number
in m² — and `apply_ruleset` is what holds a practitioner to it. So the contract does not
need a new widget and the ruleset does not need the power to stop a run. **The ruleset
widget establishes the contract**, and a table that cannot satisfy the declaration does not
reach the rules.

What that leaves is narrower than `typed-field-schema` in general: a **declared binding from
column to predicate**, so a generic table fact generator can emit one subject per row with
the declared fields as predicates. The analogous mechanism already exists one field over —
`inputContract.parameterFrom` maps a node's parameters to a ruleset's declared parameters —
so this is the same idea for fields rather than a new kind of thing. The general
field-schema UI that 65 and 61 want is a larger mechanism and is not needed here.

The consequence for the practitioner is stated rather than hidden: **they must know what
fields are required**, and supply a table with the right shape and metadata. The ruleset
declares it, the Inspector can show it, and nothing guesses a column's meaning from its
spelling.

### P2 · Provenance is an alert, not a blocker

Today a missing dataset IRI, version, baseline period, basis kind or third citation
**stops the run**. That is the wrong severity: no provenance field changes a single
computed number, so refusing to compute is a punishment for an unfilled form. It becomes
an **alert** — checked, named, visible, and not fatal — with an Inspector field where the
practitioner notes where the data came from.

The alert machinery for exactly this shape already shipped: the unconnected-sites alert and
the version-supersession notice both say what was found, what it costs, and what to do,
without stopping anything.

This is a behaviour change, and the honest consequence is that a workflow can now publish a
result from an extract whose source is undeclared. The alert is what makes that visible
rather than silent, which is the trade the practitioner chose: *"The user must know where the
data came from."*

### P3 · The distinct values are a knob on the input widget

Not a widget, and not a derivation in the middle of the graph: a knob on the input that
declares **unique values are required for column x**. The constraint then lives where the
data enters, which is where it can be acted on — a practitioner who sees it at import can
fix the file, while one who meets it three steps downstream cannot.

It also leaves the distinct set available at the input rather than annotated onto a value in
transit, which is what `filter-values-from-a-connected-port` wants to bind a candidate
filter to.

### What the decisions change about the count

P1 is declared data, P2 is an alert plus a field, P3 is a knob. **No piece of the
decomposition is a new widget**, so the net is −1: `slr_extract_import` retires and nothing
replaces it. 46 live against a target of 41.

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

The decisions are made, so what remains is code, in the order the pieces depend on each
other:

1. **P2** — the provenance check becomes an alert and the Inspector grows a source field.
   Self-contained, and the alert machinery exists.
2. **P3** — a unique-values knob on the table input.
3. **P1** — a declared column-to-predicate binding, a generic table fact generator, and an
   `extract-contract` ruleset carrying the AR6 expectations; then `slr_extract_import`
   retires and the sea-level example replays to the same numbers.

This moves to `tried` when the three are built and the sea-level example produces identical
results, and to `validated` when a frozen fixture shows it.
