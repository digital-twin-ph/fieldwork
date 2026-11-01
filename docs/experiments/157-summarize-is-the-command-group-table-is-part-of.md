# 157 · SUMMARIZE is the command `group_table` is one aggregate of

_Created 2026-11-01 · Updated 2026-11-01_

**Status:** asked — the admission review is answered below and the implementation follows it. The
need was established by a test rather than by argument, and two alternatives were tried and ruled
out before this was proposed.

## The task

The practitioner asked whether Dulwich's missing 1854 figure could be bounded by a best and worst
case: *"We can also do a worst and best case scenario on Dulwich using the least mortality/1000
and highest mortality/1000 using Dulwich population."*

It can, and the result is decisive. Computed 2026-10-31 from Table XII's 1854 deaths over Table
VIII's populations — one period, one basis:

| scenario for Dulwich | Lambeth-only 1854 | ratio to 1849 |
| --- | --- | --- |
| the source (Snow's printed 37) | 37 | **0.228** |
| best case — lowest observed rate, Streatham 1.66/1,000 | 39.7 | 0.245 |
| **worst case — highest observed rate, St. Olave 20.09/1,000** | 69.8 | **0.431** |
| *Southwark and Vauxhall only, for comparison* | 2,458 | **1.087** |

Even if Dulwich suffered the single worst mortality in south London, the Lambeth districts fall to
43% of their 1849 level while Southwark and Vauxhall **rise** to 109%. The missing cell cannot
change the answer, which is what a sensitivity analysis is for.

**A period trap, recorded because the naive version is wrong by a factor of three.** The rates
above come from Table XII's own deaths. Taking them from the ranked chart of Table VIII would give
a maximum of 6.613 rather than 20.087, because Table VIII covers seven weeks to 26 August and
Table XII runs to 21 October. The rate must come from the same table as the count.

## What decided it: the by-hand test

The practitioner: *"The test is whether we would be able to do the Dulwich assumptions by hand
from an empty canvas."* Walked step by step:

| step | widget | possible |
| --- | --- | --- |
| Table VIII population, Table XII deaths | `table_input` ×2 | yes |
| join them | `relate_table` | yes |
| 1854 deaths per head by sub-district | `rate`, which carries a multiplier | yes |
| **the lowest and the highest of those 31 rates** | — | **no** |
| that rate × Dulwich's population | `derive_value` | only once the rate is a row |
| add to the Lambeth-only total | `group_table` | yes |

**No aggregation in the application returns an extremum.** All nine table operations were checked:
`group_table` totals and that is the whole of it.

**And declaring the bounds as data fails the same test for a sharper reason.** A practitioner can
read 20.087 off a sorted chart and type it into a `table_input` — but if Table XII is ever
corrected, every other figure updates and that constant silently stays wrong. That is the defect
shape this project met four times on 2026-10-31 alone: a value living in two places and drifting.
The hardcoded test counts, the semantic workflow keys, the catalogue's `uses` list, the fixture
lookup by minted key.

## Two alternatives tried and ruled out

**A ruleset cannot do it, and the reason is structural.** An `AuthoredRule` is
`any: [{all: [field comparator value]}] → then: [predicate value]`: each condition compares ONE
subject's field to a constant, a term or a declared setting, and the conclusions assert facts about
that subject. There is no quantification over other records and no aggregate operand, so a ruleset
can classify Dulwich against a threshold and cannot find one. The limit is deliberate —
`RULE_CEILING` calls the bound *"a guard against a combinatorial surface"* — and lifting it would
change what a practitioner can author rather than what a step can compute.

A near-miss worth naming: a condition's value may be a **declared setting**, so a ruleset could
compare against a maximum somebody else computed. That is the typed-constant route wearing a
semantic hat, and it fails the re-run test identically.

**`group_table` cannot simply gain the aggregate**, which is what this record first proposed. Its
own comment refuses it:

> SUM AND NOTHING ELSE, deliberately. Epi Info separates `MEANS` from `GROUP` … summing counts
> gives a count, while summing rates gives a number with no referent … it offers the operation
> that is right for the counts a contingency table is made of and leaves the other command
> unbuilt rather than offering a choice it cannot police.

The additivity argument does not reach `MIN` and `MAX` — a maximum of three rates is a rate — but
the comment is right that the answer is a different command, and it names it.

## It is SUMMARIZE, not MEANS, and the source says so

The practitioner: *"Before we open MEANS, Epi Info AI has SUMMARY."* Read from
`epi-info-ai` rather than from memory, because this project refuses to fill Epi Info claims from
recollection. The command is **`SUMMARIZE`**, and `COMMAND_SET.md` lists it beside `MEANS` as a
separate Statistics command.

The difference is exactly the one that matters here:

| | `MEANS` (`classic-ast.ts:185`) | `SUMMARIZE` (`classic-summarize.ts:8`) |
| --- | --- | --- |
| fields | `field`, `crossTab?`, `options` | `aggregate`, `field?`, `resultField`, `outputTable`, `stratifyBy?` |
| produces | a report | **a dataset** |

The Dulwich scenario needs a value in a table that flows onward into the next step. That is
SUMMARIZE. `group_table`'s comment was pointing at the report command, and adding the aggregate
there would have fused two commands Epi Info AI keeps apart.

**`group_table` IS `SUMMARIZE` restricted to `SUM`**, under a name that does not say so:

| `SUMMARIZE` | `group_table` |
| --- | --- |
| `stratifyBy` | `by` |
| `aggregate: SUM` | what it does, and all it does |
| `aggregate: MAX, MIN, AVG, COUNT, …` | absent |
| `resultField`, `outputTable` | the table on its `records` port |

That is the second widget found this week to be an Epi Info command wearing a different name —
`derive_value` is DEFINE and ASSIGN, which the practitioner named the same day. **The pattern is
worth recording separately from this experiment**, because a vocabulary a practitioner already has
is the one a widget should use, and two instances is not a coincidence.

## The primitive design audit

**D1 · What is it, on two axes?** An operation, and the distinction survives decomposition: an
extremum cannot be reached by totalling, dividing or selecting, which is what the by-hand walk
established. On the second axis a practitioner asks for it by name, and the name is one they
already use. It earns a palette entry.

**D2 · Does the operation already exist under another name?** **Partly, and that is the finding.**
`group_table` performs `SUMMARIZE … SUM`. So this is not a new operation beside it but the command
it is one aggregate of — which makes the honest options *extend* or *replace*, not *add*. See the
open question below.

**D3 · Is every distinction enforced, and is the level named?**

| Distinction | Enforcement |
| --- | --- |
| An aggregate that is wrong on a rate is not offered | **hard stop** — the vocabulary admits only what can be policed |
| An empty cell is not a zero | **run-time check** — inherited from `group_table`, including the declared exclusion |
| A minimum over no values is not zero | **run-time check** — it is unknown, and says so |

**The aggregate list is a vocabulary, not a menu to copy.** Epi Info AI offers `AVG COUNT FIRST
LAST MAX MIN STDEV STDEVP SUM VAR VARP`. `STDEVP` and `VARP` are population variants, right on a
census and wrong on a sample, and this step cannot tell which it has — the same argument that
keeps `group_table` sum-only. `AVG` over rates has the referent problem that argument is about.
`FIRST` and `LAST` depend on row order, which a long table does not promise.

**D4 · Are the conditions in the right places?** No new port type: it takes a table and emits a
table, which is what every operation in this family does.

**D5 · Does each qualifier live on the input rather than in each consumer?** Yes — the aggregate
is a parameter of the step, not something a downstream consumer re-states.

**D6 · Has the practitioner's workflow been traced end to end?** Yes, and that is what produced
this record. The trace is the table above, and it failed at a named step.

**D7 · Does the name state what was done?** `SUMMARIZE` is the practitioner's term and the source's
term. The risk is the opposite of the usual one: naming it for Epi Info implies parity with Epi
Info, which this project does not claim and `epiInfoLabelSource` exists to keep separate.

**D8 · Does the evidence test the distinction, not only the arithmetic?** The tests must establish
that an extremum is not reachable by the existing operations, that an aggregate invalid on the
data is refused rather than computed, and that an empty group is unknown rather than zero.

**D9 · Does it lower the practitioner's effort, measured?** Yes, and measurably: the Dulwich
sensitivity goes from impossible-on-the-canvas to a chain of existing widgets plus one step. That
is a stronger answer than `study_design` could give on its admission, where D9 was answered in the
negative.

## The open question this record does not settle

**Extend `group_table`, or admit a new widget and retire it into this one?** D2 says they are one
command. The widget budget stands at 55 against a reference of 41 and this would be the sixth
addition this week, which argues for extending. The recorded "sum and nothing else" decision and
Epi Info's own separation argue for a separate command. The practitioner's answer to *"Yes to
SUMMARIZE"* settles the name and not the shape.

## What this does not establish

- **That Fieldwork's SUMMARIZE agrees with Epi Info's.** It will share a name and a vocabulary
  read from `epi-info-ai`, and nothing here is validated against either Epi Info AI or Epi Info.
  `epiInfoLabelSource` keeps those two claims apart already and the same discipline applies.
- **That the bounded aggregates are the right bounded set.** `MIN` and `MAX` are safe on counts
  and rates alike. Everything else was excluded by an argument, not by a measurement.
- **That a sensitivity analysis is what a practitioner would reach for.** It is what this
  practitioner reached for, on one missing cell in one example.
- **That the Dulwich bounds are bounds.** They are the lowest and highest OBSERVED rates. Dulwich
  could in principle have exceeded every sub-district, and nothing rules that out. It is a
  plausible range and must be labelled as one, never as an interval.

## What would close it

The Dulwich best and worst case is built by hand from an empty canvas, with no number typed in
that the canvas could have computed, and it survives a correction to Table XII because every
figure in it is derived. The aggregate vocabulary admits only what the step can police, and says
why the others are absent where a practitioner would look for them.
