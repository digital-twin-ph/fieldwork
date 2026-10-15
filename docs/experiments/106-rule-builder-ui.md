# 106 · A rule builder that compiles to N3, and how it is tested

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** tried — the compiler is built and **B1 is green**, which this record said was the
test that matters. The authoring surface is not built, so a practitioner still cannot write a
rule. Design record otherwise unchanged; it still **adds no widget**.

_2026-10-15. This sat at `asked` from 2026-10-12 while the other half of
[65](65-ruleset-as-data.md) shipped — rules as declared versioned data, one widget hosting
them, three widgets retired — so the practitioner met a dropdown of four fixed rulesets and
said: "this is not the design we discussed, the rules are pinned not very flexible." Then:
"We designed a widget, re-modeled it to streamline rule leaning widgets, a DE moment, not
acted on." Both accurate. The gap is now tracked in
[docs/directions.json](../directions.json) rather than in this status line alone._

### What is built, case by case

| | | |
| --- | --- | --- |
| A1 | one condition, one conclusion, exact text | **green** |
| A2 | `all` of three conditions | **green**, and a field compared twice binds once with its builtins chained |
| A3 | `any` of two groups → two rules, identical conclusions | **green** |
| A5 | over the ceiling, refused before compiling, naming the product | **green** — `RULE_CEILING` is 64 |
| A8 | no instance IRI in any compiled ruleset | **green**, and unreachable by construction |
| A9 | parses under the vendored N3 parser | **green** |
| A10 | identical forms compile to identical text | **green** |
| **B1** | the three shipped rulesets rebuilt, compiled, reasoned | **green** — identical conclusions under the real EYE engine |
| A4 | two `any`s of two → four rules | not written; the form is DNF by construction so the author states disjuncts rather than multiplying them, and what A4 describes cannot arise |
| A6 | each of the eight comparators | **four** of eight. `greaterThan`, `notGreaterThan`, `lessThan`, `notLessThan` and `equals` compile; `is not` (`log:notEqualTo`) is **not implemented**, and `is recorded` / `is not recorded` are `equals` against a `*Known` boolean rather than comparators of their own |
| A7 | a bound parameter, unit recorded, incommensurable binding refused | partly: a parameter stays a placeholder and binds through `bindParameters` exactly as a declared ruleset does, so the unit rules are the declaration's. Nothing yet refuses an incommensurable binding at authoring time |
| B2 | each unproven comparator against the real engine | not written. `lessThan` and `notLessThan` compile and **have never been executed**, so by this record's own rule they must not be offered in a dropdown until B2 passes |

What is deliberately absent: **existence-negation**. There is no "this field is absent"
condition, because a monotonic subset cannot conclude from absence and a ruleset that appeared
to would be lying. A ruleset says unknown with an explicit `…Known false` fact, which is what
all three shipped ones do.

**Searched first**, as [the standard](README.md) requires. `grep -ril
"comparator\|rule builder\|dropdown" docs/` returns eight files. Seven are unrelated —
[11](11-n3-output-evaluation.md)'s "comparator" is a *test* comparator for scoped assertions,
not a UI control. The eighth is [65](65-ruleset-as-data.md), whose amendment of 2026-10-12
settles the **direction**: structured entry, N3 as the compiled form, comparison-negation safe
and existence-negation excluded, AND native and OR expanded to one rule per disjunct,
conclusions mutually exclusive by construction because first-match is unavailable in a
monotonic subset.

**That reasoning is not restated here.** This record carries only what 65 does not: the
authored form, which builtins are actually proven in this codebase, and the test cases.

## The question

Can the compiler be shown to be right, rather than asserted? A surface that can only emit a
safe subset moves the risk into one component. This asks what would demonstrate that
component is correct.

## The authored form

Three nested things, and deliberately no more:

    condition  = { field, comparator, value }
    group      = { all: [condition, ...] }                          // AND
    rule       = { any: [group, ...], then: [{predicate, value}, ...] }   // OR of AND groups
    ruleset    = { rules: [rule, ...] }

`field` is a **bound role**, not a column name — the binding is 65's, and the dropdown lists
only fields whose declared type and unit can satisfy the role. `value` is a literal of the
field's type or a term from a declared value set. `then` draws from the declared output
vocabulary, and is a **list**: `accessN3` concludes `fw:decision` and `fw:zone` from one rule, and
`facilityN3` concludes `fw:evidenceLevel` and `fw:service` from every rule. The first draft of this
form had a single conclusion, which the rulesets that exist refute.

The contribution of this shape is that it is **disjunctive normal form by construction**.
That is what makes compilation total: every authored ruleset has an N3 image, and no authored
ruleset can need an operator the subset lacks. It is also why the ceiling 65 calls for is
checkable before compiling — the rule count is the product of the group counts, known from the
form alone.

## Comparators, and which are actually proven here

| Comparator | Field kind | Compiles to | In use today |
| --- | --- | --- | --- |
| greater than | numeric | `?v math:greaterThan T` | **yes**, 5 uses |
| not greater than | numeric | `?v math:notGreaterThan T` | **yes**, 5 uses |
| less than | numeric | `?v math:lessThan T` | no |
| not less than | numeric | `?v math:notLessThan T` | no |
| is | categorical | unification: `?x fw:field fw:Value` | **yes**, implicitly |
| is not | categorical | `?v log:notEqualTo fw:Value` | **no `log:` builtin is used anywhere** |
| is recorded | any bound role | `?x fw:fieldKnown true` | **yes**, three such booleans |
| is not recorded | any bound role | `?x fw:fieldKnown false` | **yes** |

The right-hand column is the finding. Four of the eight compile to builtins this codebase has
never executed, and `log:notEqualTo` is not merely unused but from a different namespace.
**Each unproven comparator must pass against the real engine before the dropdown offers it**
(test B2). A comparator the engine does not support is removed from the list, not worked
around.

One consequence of 65's absence-as-fact rule is worth stating because it is a trap rather than
a restatement: a subject with **no `*Known` fact at all** must conclude *nothing*. Reporting it
as "not recorded" would be the silence inference arriving by the back door, through the very
mechanism built to exclude it. Test B4 exists for exactly this.

## Measured against the three rulesets that exist

Read on 2026-10-12, after the practitioner said that whether the rulesets collapse into one is
itself part of the merge rather than a question to be assumed away.

| | Rules | Subjects | Conditions used | Concludes |
| --- | --- | --- | --- | --- |
| `makeN3` → `policy` | 5 | places | `*Known` booleans, a boolean flag, `>` and `≤` against one threshold in km | `fw:decision` ∈ 3 |
| `accessN3` → `access_policy` | 7 | facilities | an `*Known` boolean, `>` and `≤`, and one **two-sided interval** (`> 5` and `≤ 15` in one antecedent) against a threshold in minutes | `fw:decision` ∈ 3 **and** `fw:zone` ∈ 5 |
| `facilityN3` → `xpert` | 7 | facilities | categorical equality, boolean equality | `fw:evidenceLevel` ∈ 4 **and** `fw:service` ∈ 4 |

**All 19 rules fit the authored form above**, once `then` is a list. Every antecedent is a
conjunction of categorical equality, boolean equality, or a numeric comparison — the first rows of
the comparator table. None uses negation, recursion or aggregation, which is the subset claim now
measured over the whole corpus rather than counted as builtin occurrences.

Two details worth seeing. The two-sided interval needs no new operator: it is two comparisons in
one `all`. And `facilityN3`'s last two rules conclude the same pair from different antecedents,
which is **an OR already hand-compiled** — the practitioner who wrote it did by hand exactly what
this record proposes the compiler do.

### A fourth ruleset, found by looking somewhere else

Added 2026-10-12, while thinking about what a spatial selection widget should output.
`coverage_check` carries **six** N3 rules as a template literal in `src/spatial-coverage.ts`:

    { ?r fw:excluded true. }                                  => { ?r fw:coverageDecision fw:Excluded. }.
    { ?r fw:excluded false; fw:spatialRelation fw:Inside. }    => { ?r fw:coverageDecision fw:Accept. }.
    { ?r fw:excluded false; fw:spatialRelation fw:Boundary. }  => { ?r fw:coverageDecision fw:Accept. }.
    { ?r fw:excluded false; fw:spatialRelation fw:Outside. }   => { ?r fw:coverageDecision fw:Review. }.
    { ?r fw:excluded false; fw:spatialRelation fw:MissingLocation. } => { ?r fw:coverageDecision fw:Review. }.
    { ?activity fw:checkedRecord ?r. ?r fw:coverageDecision fw:Review. } => { ?activity fw:requiresReview true. }.

So the corpus is **four** rulesets, not three, and the one found last was never a candidate for the
merge: `coverage_check` declares itself `shared` and is not example-bound, so the exemption ratchet
cannot see it. **A hidden ruleset is a different failure from an example-bound widget**, and nothing
in this project was looking for the first.

Three things it adds to this record:

- **A third hand-compiled OR.** Rules 2 and 3 conclude the same decision from different antecedents,
  after `facilityN3`'s last two. Three instances now, all written by hand, all doing what a
  compiler would do.
- **A policy hidden in a comment.** The rules open with *"Boundary points are included by policy"*,
  and rules 4 and 5 map **different** relations to the **same** decision: `Outside` → Review and
  `MissingLocation` → Review. That collapses outside-ness and unknown-ness, which is exactly the
  distinction the four-valued `SpatialRelation` upstream exists to preserve. Declaring the ruleset
  makes the collapse visible and contestable. A template literal does not.
- **A conclusion about the activity, not a subject.** The last rule concludes `?activity
  fw:requiresReview true`. The authored form above concludes per subject only, so hosting this
  ruleset needs **set-level conclusions** — a real extension to the form, found by a ruleset nobody
  had counted rather than by designing.

### So can the three be represented as one?

Two senses, with different answers.

**One form — yes, demonstrably.** 19 of 19 rules are instances of a single shape. That is what
lets **one widget** host all three, which is the merge: three widgets become one.

**One ruleset — no, and the reason is in the table.** They classify disjoint subject kinds against
three output vocabularies, and two carry thresholds in **different units**, kilometres and minutes.
A single ruleset firing on anything would also forfeit the refusal
[65](65-ruleset-as-data.md) wants, where a ruleset declares which input kinds it applies to so a
nonsensical connection is refused rather than quietly concluding nothing.

The near-miss is worth recording because it looks like a further reduction and is not. `policy`
and `access_policy` are both "a numeric measure against one threshold → Review, NoFlag, or Unknown
when unknown". But `policy` carries an **extra gate** the other lacks — the alert boolean, in three
of its five rules — so collapsing them would mean parameterising the *number of conditions*, which
is not a parameter. Two rulesets in one form, not one ruleset.

### A fourth rule application that was not one

This table said four widgets over three rulesets for most of 2026-10-12, counting `facility_audit`
because its output port is `decisions`. Reading its executor settled it: it calls no reasoner and
generates no N3. Its entire body is one projection over values `xpert` already derived —
`tier==='Direct'?'NoFlag':tier==='None'?'Unknown':'Review'` — plus a restatement of `f.reference`
as the explanation. Its own `check-coverage.json` entry had said so all along: *"it selects and
presents; it derives no value."* [65](65-ruleset-as-data.md)'s original count of three was right.

**An output port type is not evidence of what a widget does.** The fourth rule application was
found by reading a port name and removed by reading code, which is the same failure D7 names one
level down.

It is not innocent either. That ternary is a decision rule written in TypeScript, outside any
ruleset and outside the reasoner, and the only place in `src/` that maps a tier to a status. So
`facility_audit` is a presentation widget with rule-like logic hidden inside it — which makes it
the first concrete instance of the practitioner's hypothesis that a **decision class** is its own
declared thing, and moves it to the presentation-stage disposition rather than this merge.

## Six rule applications, three kinds, and the ratchet sees one

_Added 2026-10-12, after the practitioner asked whether `slr_threshold_comparison` is a
ruleset-based widget and noted that geospatial rulesets do not exist yet._

**It is one**, and it is the sixth. Counting rule applications by what they do rather than by how
they are written gives three kinds:

| Kind | Widgets | How the rules are written |
| --- | --- | --- |
| **Declared ruleset** | `policy`, `access_policy`, `xpert` → now `apply_ruleset` | `rulesets/*/1.0.0.json`, versioned, digested, with a basis |
| **N3 in a template literal** | `coverage_check` | six rules inside `src/spatial-coverage.ts` |
| **A TypeScript ternary** | `facility_audit`, `slr_threshold_comparison` | one expression, no reasoner at all |

`slr_threshold_comparison`'s whole classification is one line:

    const status:Status = level===null||!elevationKnown ? 'Unknown'
                        : level>=elevation! ? 'Review' : 'NoFlag';

Three conclusions over the project's own `fw:decision` vocabulary, with the unknown branch first —
which is the `*Known` discipline the declared rulesets implement by pre-asserting booleans, here
done in TypeScript instead. `src/sea-level.ts` calls no reasoner and contains no N3.

So **three of six rule applications are declared, and the standardization ratchet can see none of
the other three**: `coverage_check` and `slr_threshold_comparison` declare `shared`, and
`facility_audit` was removed from the ruleset merge once it turned out to run no reasoner. A hidden
rule is a different failure from an example-bound widget, and nothing in this project was looking
for the first kind until it was tripped over twice in one afternoon.

### A third extension: relational conditions

The authored form's condition is `{field, comparator, value}` over one subject. The standard spatial
predicates are **binary** — `?record geo:sfWithin ?area` — so a spatial premise cannot be written in
this form at all.

That is why `coverage_check` asserts `fw:spatialRelation fw:Inside` as a subject *attribute* rather
than using the GeoSPARQL predicate directly, and why the dictionary between the two vocabularies is
written twice, in `src/spatial-coverage.ts` and `src/map-output.ts`
(`docs/research/ogc-standards-assessment-2026-10-12.md`). **The invented vocabulary is downstream of
this form's shape**, not an oversight — and the cost of keeping it is a translation table that has
already been duplicated once.

So the form needs conditions whose right-hand side is another *feature*, not only a literal, a bound
parameter, or another field of the same subject. Three extensions are now required of it, and all
three were found by examining rule applications or vocabulary nobody had counted rather than by
designing: set-level conclusions, field-to-field comparison, and this.

### What it needs that this record's form does not have

The comparison is **field to field**. `level` is the projected change for the row's assigned site,
read from the AR6 extract; `elevation` is the row's own attribute. Neither is a parameter, and
there is no threshold knob at all. The authored form above is

    condition = { field, comparator, value }

where `value` is a literal or a bound parameter. This needs `value` to admit **another field of the
same subject**, which is a real extension and not a detail: it is the difference between "compare
every subject against one number the practitioner chose" and "compare each subject against its
own".

And the comparator is `>=`, so equality counts as reaching the elevation — the widget's method
string says so. That is a policy sitting in a comparator, which is what test B5 exists for, and the
third instance today after `coverage_check`'s boundary-points rule and `makeN3`'s
`math:notGreaterThan`.

### It is not a geospatial ruleset, and the architecture says none is needed

`level >= elevation` is a scalar comparison between two numbers. There is no geometry in the rule.
The widget sits in a geospatial pipeline; its rule is arithmetic.

Which answers the larger question the practitioner raised. A genuinely geospatial rule would want
spatial predicates as premises, and EYE provides none — but **`coverage_check` already shows the
shape that works without them**: the geometry is computed in TypeScript, the *relation* is asserted
as a fact —

    <record> fw:spatialRelation fw:Inside .

— and the rules reason over the asserted relation, never over the geometry. Its own comment says it:
*"Point relations are computed locally."* So a geospatial ruleset needs no spatial builtins; it
needs the relation asserted as a fact, and that pattern ships today. What is missing is not
capability but declaration: the one instance of it is a template literal.

### And the naming problem dissolves

The practitioner's starting point was that `slr_threshold_comparison` carries an example label. It
does — `slr_` names a pack, not an operation. If it becomes a **ruleset**, that stops being a
problem rather than needing a fix: a widget must be general and a ruleset must be particular, which
is the division `validate-rulesets.mjs` enforces. Sea-level-specific knowledge in a ruleset named
for sea level is correct; the same knowledge in a widget name is not.

## Test cases

Grouped by what each group can establish, because they are not interchangeable. **Group A
cannot establish that a rule means the right thing** — only that the compiler is a function
with the shape claimed.

### A · Compiler, without an engine

| | Input | Expected |
| --- | --- | --- |
| A1 | one condition, one conclusion | one rule; exact expected N3 text |
| A2 | `all` of three conditions | one rule, three antecedent clauses, one conclusion |
| A3 | `any` of two groups | **two** rules, identical conclusions |
| A4 | two `any`s of two | **four** rules — DNF expansion is multiplicative |
| A5 | a ruleset over the rule ceiling | refused **before compiling**, naming the product and the ceiling |
| A6 | each of the eight comparators | its tabled builtin, and no other builtin |
| A7 | a bound numeric parameter | substituted with its unit recorded; a unit-incommensurable binding refused |
| A8 | any generated ruleset (property test) | contains **no instance IRI** — the check 65 proposes can then be deleted as unreachable |
| A9 | any generated ruleset (property test) | **parses** under the vendored N3 parser |
| A10 | two authored forms that compile identically | identical text, so identical digest |

### B · Semantics, against the real EYE engine

| | Input | Expected |
| --- | --- | --- |
| **B1** | the three existing rulesets — `policy`, `access_policy`, `xpert` — rebuilt in the authored form and compiled | **identical conclusions** to the hand-written N3 on the existing frozen fixtures, including the Old Naledi classifications the browser suite already checks |
| B2 | each comparator not in use today | fires correctly across the boundary; one the engine rejects is **removed from the dropdown** |
| B3 | `A or B` on four fixtures: only A, only B, both, neither | identical to hand-written two-rule N3; the "both" case concludes once |
| B4 | a subject with `fieldKnown false`, and a subject with **no `*Known` fact at all** | the first concludes "not recorded"; the second concludes **nothing** |
| B5 | `> T` and `≤ T` over subjects below, exactly at, and above `T` | exactly one of the pair fires per subject; the at-`T` case is what separates `notGreaterThan` from `lessThan` |
| B6 | a ruleset with an unmatched subject | `fw:unmatchedSubjectCount` is 1 and no asserted unknown — 65's two counts stay apart |

**B1 is the test that matters**, and the reason this is tractable: it needs no new oracle.
Three rulesets with frozen expectations already exist. A compiler that cannot reproduce the
rules this project already runs has not been shown to compile anything.

### C · Authoring-time refusals

| | Input | Expected |
| --- | --- | --- |
| C1 | overlapping numeric intervals, **different** conclusions | refused, naming both rows |
| C2 | intersecting categorical value sets, different conclusions | refused, naming both rows |
| C3 | disjoint intervals, different conclusions | accepted |
| C4 | overlapping intervals, **same** conclusion | accepted — that is just OR |
| C5 | a text field against a numeric comparator | not offered in the dropdown at all |
| C6 | a role left unbound | valid draft; refuses to run, naming the role (65's rule) |

C1 and C2 are the authoring-time half of a failure that already refuses at run time, loudly
but anonymously: "Reasoner returned conflicting decisions" names neither offending row.

### D · The receipt

| | Input | Expected |
| --- | --- | --- |
| D1 | any run | receipt carries the compiled N3, and it parses |
| D2 | any run | receipt carries the authored form beside it |
| D3 | a changed threshold | ruleset digest changes |
| D4 | an authored form reshaped without changing compiled text | digest **unchanged** (pairs with A10) |

## Distinctions, and how each is enforced

| Distinction | Enforcement |
| --- | --- |
| A comparator is not supported because it is plausible | **Precondition**: B2 gates each unproven builtin on a passing case against the real engine |
| "Not recorded" is a fact, not a silence | **Hard stop**: B4 requires a subject with no `*Known` fact to conclude nothing |
| The ceiling is a property of the form, not of the output | **Precondition**: A5 refuses before compiling, from the product of group counts |
| This is a configuration surface, not a widget | **Budget**: the widget count must not rise |

## What would close this

B1 is green, so what remains is the half a practitioner meets:

1. **The authoring surface.** The Inspector offers a ruleset chosen from a list; it has to offer
   rules composed from conditions. Until then the compiler is reachable only from code and the
   widget is as pinned as it was.
2. **A6 and B2** — the four comparators that compile but have never been executed must pass
   against the real engine before any dropdown offers them, and `is not` must be implemented or
   dropped from the table.
3. **A7's refusal** — an incommensurable unit binding caught while authoring rather than at run
   time.

This moves to `validated` when a ruleset authored in the interface runs and its receipt cites
rules the practitioner wrote.

## What this does not establish

That a practitioner can author a correct rule from dropdowns, or read the compiled N3 and
recognise their own intent in it — observations for the runbook work in
[63](63-worked-example-runbooks.md), neither following from the compiler being correct.

Nor that any ruleset is *right*. The compiler preserves meaning; it does not supply it, and the
ruleset's basis remains its author's claim ([65](65-ruleset-as-data.md),
[56](56-basis-behind-identity.md)).

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-12 | 106 and 64: the rule builder's tests, and essentiality before example impact |
| 2026-10-12 | 106: the ruleset measurement, redone after it was lost uncommitted |
| 2026-10-12 | Spatial selection: three outputs are three layers, and a fourth ruleset |
| 2026-10-12 | slr_threshold_comparison is the sixth rule application, and the third kind |
| 2026-10-12 | The standard names are already in the code; only the widgets hide them |
