# 106 · A rule builder that compiles to N3, and how it is tested

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** asked — design record, written before the code. Specifies the configuration
surface of the widget [65](65-ruleset-as-data.md) proposes, and **adds no widget**: 65 is net
−2 on the palette and this record changes that by nothing.

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
    rule       = { any: [group, ...], then: {predicate, value} }    // OR of AND groups
    ruleset    = { rules: [rule, ...] }

`field` is a **bound role**, not a column name — the binding is 65's, and the dropdown lists
only fields whose declared type and unit can satisfy the role. `value` is a literal of the
field's type or a term from a declared value set. `then` draws from the declared output
vocabulary.

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

Group A green, and **B1 green against all three existing rulesets on their frozen fixtures**.
Until B1 passes this record stays `asked`.

## What this does not establish

That a practitioner can author a correct rule from dropdowns, or read the compiled N3 and
recognise their own intent in it — observations for the runbook work in
[63](63-worked-example-runbooks.md), neither following from the compiler being correct.

Nor that any ruleset is *right*. The compiler preserves meaning; it does not supply it, and the
ruleset's basis remains its author's claim ([65](65-ruleset-as-data.md),
[56](56-basis-behind-identity.md)).
