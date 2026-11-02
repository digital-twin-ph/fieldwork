# Study design

_Created 2026-10-31 · Updated 2026-11-01_

**A workflow declares HOW as well as WHERE.** `study_area` says where a study is; nothing said what
kind of study it is. This declares the design and the study period, and states which measures that
design can actually support.

## What it does

It computes nothing. It declares one of five designs and the period the study covers, and the
computations downstream find it by walking upstream from themselves.

| Design | What one row counts | What a two-by-two may estimate under it |
| --- | --- | --- |
| **cohort** | a person | risk, risk ratio, risk difference, odds ratio |
| **case-control** | a person | **the odds ratio only** |
| **cross-sectional** | a person | prevalence, prevalence ratio, prevalence odds ratio |
| **ecological** | **a group** | the same measures, as group-level quantities |
| **case-series** | a person | counts and intervals — no comparison group, so no ratio |

Five, not the twenty-two of the reference survey. Each is one this application can actually serve
with the widgets it has; a sixth that licensed no computation would be a declaration doing no
work.

## Why case-control is the one that matters

In a cohort you sample people and follow them, so the row totals `a+b` and `c+d` are populations
at risk and `a/(a+b)` is a risk.

**In a case-control study you choose how many cases and how many controls to sample.** The row
totals are then artefacts of that choice — sample twice as many controls and `a+b` doubles while
nothing about the disease changes. So `a/(a+b)` is not a risk, and the risk ratio and risk
difference built from it are not estimable at all. The odds ratio survives because the
cross-product `ad/bc` does not depend on how many of each group were sampled.

Without a declared design, a case-control table is offered all three. The arithmetic is right and
two of the three answers mean nothing.

**What the odds ratio then means depends on how the controls were sampled** — and this widget
does not ask. Under incidence-density (risk-set) sampling an odds ratio estimates an incidence
rate ratio without needing the outcome to be rare; under cumulative sampling it does not. So
declaring `case-control` is enough to rule the risk measures out, and not enough to say which
ratio the surviving one is. Record how you sampled controls in the note field until there is a
field for it.

**Cross-sectional is the quieter failure.** There the arithmetic keeps its value and loses its
name: `a/(a+b)` is a prevalence, not a risk, and a prevalence ratio printed as `Risk Ratio (RR)`
is correct to three decimals and wrong about what it measures. Nothing looks amiss, which is why
it is the worse of the two.

**Ecological is the inference, not the arithmetic.** The rows count groups. South London's
`contingency` workflow attaches a water company to each of 32 sub-districts, so every measure
over it is a statement about sub-districts — and a relation between group-level measures need not
hold between individuals.

## The study period

Declared here because it belongs to the **study**, not to a computation. `rate` carries a
`numeratorPeriod` and a `denominatorVintage`, and `case_series` carries a period, all of which are
properties of one calculation — which is backwards for a title, whose time element is the period
of the study.

Written as it should read: `1854`, or `July–September 1854`.

## How a computation finds it

By walking **upstream** from itself. A design wired by an edge wins outright, because an edge is
an explicit statement; otherwise the walk looks back through the graph.

Three consequences worth knowing:

- **Upstream only.** A design declared downstream of a computation did not govern it, and a design
  on a parallel branch governs that branch and not this one.
- **Two different designs are refused, never resolved.** Which study you are running is not a tie
  this application may break. Two nodes *agreeing* on one design is fine — what cannot be resolved
  is two answers to one question.
- **`relate_table`, `group_table`, `derive_value` and `select_rows` carry nothing.** The walk
  passes through them, so a declaration does not have to be threaded along a chain.

## How to use it

1. **Add it before the computations it governs.** It takes no input, so it sits at the start of a
   branch the way a study area does.
2. **Choose the design and its measures.** The dialog shows what each design licenses before you choose it. What it cannot estimate has no box; untick anything it can estimate that the write-up should not carry.
3. **Write the study period** as it should read in a title: `1854`.
4. **Say what one row counts** if it is not a person. An ecological study counts groups —
   sub-districts, wards, districts — and this is where that is said once instead of in every
   caption.
5. **Connect it, or leave it upstream.** Wiring it to an epi widget's `design` port states which
   declaration governs that computation. Where there is no edge, anything downstream of it finds
   it by walking back through the graph.

If you are not sure which design you have, leave it out. Everything computes as it did before, and
a guessed declaration is worse than none.

## What is asked after you select a design

**Surveillance is not on the list.** It says where data came from, and a study of any design can use
such data. It is an answer to the source question below. A workflow that only describes surveillance
counts declares no design.

For a cohort or an ecological study, the first page after the design is **the table**: you name the groups and the outcome and say what exposure is known for. The dialog draws the 2×2 in those words and marks the totals the study fixed. Select a cell to say what it counts and where it comes from, or that it was worked out from other cells. There are no numbers on this page: they come with the data, so it works for a study not yet begun. The other designs do not have this page yet.

The dialog runs one page at a time with **Next**, **Back** and **Close**. There is no Save: every change is kept as you make it. Selecting a design sets its questions. Where the table already says where each cell comes from, the first asks only whether any of it comes from a surveillance system. A blank for the group is filled from the table page, and you can change it. For a case-control
study that means how cases arose, when controls were sampled, whether they were matched, and where
they came from. Each answer writes a sentence into **Methods**, and some carry a caveat. Answer
*not sure / not stated* when that is the truth: nothing stops, and the note says what is unknown. A
blank you leave stays visible in the sentence as `‹blank›`.

Answers stay stored if you change design, so trying another one loses nothing. Three questions come with every design: who or what decided who was exposed, how time is structured,
and whether the outcome can spread or cluster. If exposure was decided outside the investigators, two
more follow: what supports that claim, and whether to call this a natural experiment. That term has
more than one definition, so the note always names which one it means, and it never licenses causal
language. The wording of these questions is untested.

## The checklist

The last page of the dialog reads your workflow against your design, and the Inspector gives the counts.

**Read from this workflow** is checked against the canvas and changes as you build: whether a
two-by-two reads the design, whether data are connected, whether each input says where it came from,
whether the result reaches an output. It says the workflow holds these things, not that they are
right.

**Declared by you** is what you stated. Fieldwork records it and cannot check it.

The checklist reports and does not grade. Nothing on it stops a run. *Open* means no answer yet, and
*stated as unknown* means you answered that you do not know, which is a different fact. *Differs* means your words and the computation's do not match: they may still be one group, and that is for you to judge.

## What it will not do

- **It will not work out your design from your data.** Four counts look identical whether they
  came from a cohort, a case-control study or a survey. Only you know which you ran.
- **It will not choose between two declarations.** A computation has one design port, and it
  takes one connection. Connect each design to its own computation: a workflow may hold two, on
  separate branches.
- **It will not declare a study whose investigators allocated exposure.** The five designs are
  observational, so answering that investigators allocated exposure stops the declaration, and
  computations run under neutral names.
- **It will not check that your period is consistent with your data.** The period is text for a
  reader and a title. Whether a denominator covers the numerator's period is not checked.
- **It will not travel to another workflow.** A design governs the workflow it is in. A project of
  six workflows may have six different designs, or none.

## What it does not do yet

**It governs the two-by-two only.** A connected design decides what `two_by_two` reports: case-control keeps the odds ratio and drops the word risk, cross-sectional reports prevalence measures, and a case series reports no comparison measure. `rate_ratio` carries the design and is not changed by it.

**An undeclared design is reported, not punished.** With no design connected, every measure is still computed, under a name for its arithmetic: ratio of row proportions, cross-product ratio, difference of row proportions. A line says no design is connected. The numbers are the same as before; only the names differ, because `a/(a+b)` is a risk only under some designs. A practitioner with their own data may not be sure which design they
have, and an application that refused to compute until told would be worse than one that stays
quiet.

**It does not make a result correct.** It makes a wrong measure refusable. Whether the groups are
comparable, and whether a denominator's period covers its numerator's, are untouched — and the
period check `rate` performs today is string equality where the condition is coverage.

See [experiment 154](../experiments/154-a-workflow-declares-how-as-well-as-where.md) for the
admission review, and [the study-design audit](../audits/study-designs-and-our-computations.md)
for how the designs were chosen.

## More than one exposure

Most investigations of a shared meal compare a whole menu. **How were the exposures chosen?** records
whether they were named in advance or all compared as a screen. A screen raises a question and needs
other evidence to answer it. With several exposures, describe the table's groups in general, such as
*ate* and *did not eat*, because the same description applies to each. The checklist then says how many
were compared, and does not compare each with the declared groups.
