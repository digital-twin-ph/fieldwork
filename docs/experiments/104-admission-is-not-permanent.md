# 104 · Admission is not permanent

_Created 2026-10-12 · Updated 2026-10-12_

**Status:** tried — the clock is built, gated and verified by breaking it. Four criteria have
never been swept and two of those are recorded as contestable, so the re-admission work itself
has not been done.

Searched `docs/` for admission, re-admission and criteria before writing: the prior work is
[the audit procedure](../audits/ontology-audit.md), [the widget audit](../audits/widget_audit.md)
and [64](64-widget-streamlining.md). Nothing prior treats admission as revisitable.

## The question asked

The practitioner, after the widget-count and duplicate-experiment ratchets were built: *"this is
a DE project — what is admitted earlier may not be admissible as the framework emerges and
lessons are learned, AND acted upon."*

Which is a claim this project's machinery contradicted. **Admission was permanent.** A widget
passed D1 and D2 at the moment it was proposed and was in the registry thereafter, whatever
happened to D1 and D2 afterwards.

## How it was tried

By finding where the permanence came from, which took one reading of the widget audit's own
**Method** section:

> D3 and D4 were sampled rather than applied exhaustively: naming each distinction in 39 release
> files is the work the audit asks of an author at the time, and **doing it retroactively for all
> of them is a separate task.** D5, D6, D8 and D9 **are not applicable retroactively** — they
> govern how a primitive is designed, not what can be measured about one already built.

That is the mechanism, stated plainly and reasonably at the time. Four criteria were declared out
of retrospective scope and two were deferred to a separate task. **The separate task was never
scheduled, and nothing counted it**, so "sampled" and "not applicable retroactively" became
"never again".

And it is not a hypothetical cost. Every one of these passed admission under criteria that have
since changed:

| What survived | Under which criterion, before it changed |
| --- | --- |
| Three implementations of nearest-neighbour-with-distance | D2, before it required naming the general one and each other's disposition |
| `nearest`'s ports named `places` and `centers` | D7, before it covered port names |
| Nine example-bound widgets | D1, before kind and placement were separated |
| `alert` as a node rather than a parameter | nothing asked whether a widget was a parameter wearing a node |

## What was built

`widgets/admission.json` records, per criterion, when it last **changed** and when the set was
last **swept** against it, with the coverage and the count. `validate:admission` is in
`npm run check` and **fails when a criterion changed after its last sweep** — a re-admission
debt. Verified by dating D7 one day forward and watching it fail.

The two ways to clear a debt are to sweep, or to record in the file why the change does not reach
the existing set. The second is allowed on purpose: not every criterion change is retrospective.
What is not allowed is silence, which is what produced the four rows above.

Current state, which is the honest part:

```
D1   2026-10-12 · all (51)          D7   2026-10-12 · all (51)
D2   2026-10-12 · duplicates (6)    D8   never swept
D3   2026-10-09 · sampled (6)       D8a  never swept
D4   2026-10-09 · sampled (6)       D9   2026-10-12 · all-examples (13)
D4a  2026-10-09 · partial (51)      D10  2026-10-12 · all (51)
D5   never swept                    D6   never swept
```

**Eight of twelve swept since they last changed; three across the whole set.** Never-swept
criteria are reported and not gated, because reversing the audit's scope judgement is a decision
and not an omission.

**Two of those four are contestable and the file says so.** D5 asks whether each qualifier lives
on the input rather than in each consumer, and D8 whether the evidence tests the distinction
rather than only the arithmetic. Both were called design-time. Both are **readable off built
code**: where a qualifier sits is a structural property, and whether a test exercises a
distinction is visible in the test. Calling them non-retrospective was quicker than true.

## What would close it

D3, D4, D4a swept across all 51 rather than sampled at 6, and a decision recorded for D5 and D8 —
either swept or explicitly out of scope with a reason better than the one this document just
contested. That is the "separate task" the audit named in October and nobody scheduled; it is now
a number that appears in every run, which is the only reason it will not be forgotten again.

## What changed our minds

**The ratchets built an hour earlier were the wrong shape, and this is why.** The widget budget
counts how many widgets exist, and the experiment standard makes an open document say what would
close it. Both are about **quantity and follow-through**. Neither notices that a widget admitted
in October has not been tested against December's criteria — so a set could sit at its target
count, with every experiment closed, and still be full of widgets no current criterion has seen.

The practitioner's phrase that forced it was *"and acted upon"*. A lesson learned and recorded
changes a criterion; a lesson **acted upon** re-tests what the criterion already let through.
This project was doing the first and calling it the second.

## What this does not establish

**That re-sweeping finds anything.** D3 and D4 were sampled at 6 of 39 and the sample found real
problems; whether the other 45 hold more is unmeasured. The clock says the work is outstanding,
not that it is valuable.

**That a criterion change should always reach backwards.** Some genuinely should not — D6 traces a
practitioner's workflow at design time and cannot be re-run per widget. The file permits recording
that, and the risk is obvious: "does not reach the existing set" is available as an excuse for
every criterion anybody does not want to sweep. Nothing prevents that except review.

**And nothing about the widgets themselves.** This is the clock, not the sweep. Four criteria have
never been applied to the set, and after today's work the set is unchanged: still 51, still nine
example-bound, still three nearest-neighbour implementations.

## Updates

_Appended, never rewritten. Rows before this table existed are seeded from the commits that
changed this file; a date stamp sweep is not an update._

| Date | What happened |
| --- | --- |
| 2026-10-12 | Admission is dated, not permanent: put a clock on the criteria |
