# 154 · A workflow declares HOW as well as WHERE

_Created 2026-10-31 · Updated 2026-10-31_

**Status:** asked — the primitive design audit is answered below and the implementation follows it.
This record exists before the code, which is what the adding-a-widget procedure requires.

## The task

Step 2 of the sequence recorded in `docs/directions.json` under
`a-study-design-opens-a-workflow-as-a-study-area-does`, stated by the practitioner on 2026-10-28
and restated on 2026-10-31: *"There is a need to identify the study design in the relevant epi
widget so the computations are tailored for the study design."* And, on where it belongs: *"We
decided we would do this at the workflow level."*

> A workflow opens with two declarations rather than one: WHERE, which `study_area` already is,
> and HOW, which nothing is.

Step 1 — the ABCD cells, their margins and the estimates — landed on 2026-10-31
([153](153-a-two-by-two-is-not-a-table.md)). This is step 2. **Step 3, gating the measures, is
deliberately not in this record**: the audit notes that items 1 and 2 of its own list may have to
be built in the reverse order, because there is nothing to gate on until a design is declared.

## What is already decided, and is not reopened here

Recorded in `docs/directions.json` and `docs/audits/study-designs-and-our-computations.md` on
2026-10-28. Listed because re-deriving a settled decision has already cost this thread three
rounds.

| Decision | Why |
| --- | --- |
| **Not merged with `study_area`** | Decided by the example, not by principle: the two South London workflows that most need a design have no study area, and the one with a study area has no design. `study_area` is a spatial OPERAND with 27 references to its port, not a declaration of place. |
| **Upstream of everything, not a pass-through** | The column-to-term mapping happens at table input, so the design cannot sit between a table and its computation. |
| **Found by walking upstream, and refusing when two are found** | A declaration made by a node is not a global: it has an id, a receipt and a place in the graph. `declaredKinds(workflow,nodeId)` and `upstreamKeyValues` already walk this way. Refusing on two designs is the shape `relateTable` already uses for an ambiguous key. |
| **No cascade through `relate_table`, `group_table`, `derive_value`, `select_rows`** | The walk removes the need, which removes the expensive half of the direction. |
| **The period belongs to the design** | `rate` has `numeratorPeriod` and `denominatorVintage` and `case_series` has a period — all properties of a *computation*, which is backwards for a study. |
| **The design is NOT in the machined title; the period is** | Twelve MMWR titles read on 2026-10-28; none names a design. The shape is `<topic> — <place>, <time>`, and the design feeds `<time>` through its period. |

## The primitive design audit

**D1 · What is it, on two axes?** A declaration, not an operation: it computes nothing and
transforms nothing. On the first axis the distinction survives decomposition — a design is not a
parameter of any one computation, because the same declaration governs a `two_by_two`, a `rate`
and a `rate_ratio` in one workflow, and decomposing it into three parameters would mean declaring
it three times and permitting three answers. On the second axis a practitioner asks for it **by
name**: *"identifying the study design is key"*. So it earns a palette entry.

**D2 · Does the operation already exist under another name?** No. Searched 2026-10-28 and again
2026-10-31: `case-control`, `cohort`, `cross-sectional` and `estimable` appear nowhere in
`two-by-two.ts`, `epi-estimate.ts` or `rate-ratio.ts`, and no design is declared anywhere in
`src/`, the glossary or `widgets/*.json`. The nearest things are vocabulary for *quantities* —
`denominatorUnit` including `person-time`, and the widget being named `rate_ratio` rather than
risk ratio — which is the discipline applied one level below this.

**D3 · Is every distinction enforced, and is the level named?**

| Distinction | Enforcement |
| --- | --- |
| A design is declared, never inferred from the data | **Hard stop** — nothing reads a design off a table; the only source is this node |
| Two designs cannot govern one computation | **Run-time check** — the upstream walk refuses rather than choosing |
| A design the application does not serve is not offered | **Hard stop** — the vocabulary is a closed union of the six the audit found we serve |
| An undeclared design is not a cohort | **Limitation, and stated as one** — see below |

**The fourth is the one that prevents nothing, and it is deliberate.** An undeclared design leaves
the measures as they are today rather than refusing them. 147 records the doubt and the audit
repeats it: a practitioner with their own data may not be sure which design they have, and *"an
application that demands the answer before computing anything would be worse than one that stays
quiet"*. So absence is reported, not punished. **This is a limitation and it prevents nothing** —
naming it is the whole of D3's point.

**D4 · Are the conditions in the right places?** The design travels on a port of its own type to
the computations it gates, so connecting a table where a design belongs is refused by the port
union rather than by a message — which is what licenses adding to a closed, compiled-in union.
The *walk* is for consumers with no such port, the table import among them.

**D5 · Does each qualifier live on the input rather than in each consumer?** Yes, and this is the
objection that sank an earlier shape. A field on the workflow would be a global every consumer
reaches for. A node found by walking upstream is not: it has a node id, a receipt and a position,
and the walk is a real dependency even where it is not an edge.

**D6 · Has the practitioner's workflow been traced end to end?** Partly, and the gap is stated.
The two South London workflows are the trace — `water-company` is a retrospective cohort and
`contingency` is ecological, and the audit shows the same four measures printed for both with
nothing saying which. What has *not* been traced is a practitioner meeting the declaration for
the first time on their own data, which is 147's doubt and is not answerable here.

**D7 · Does the name state what was done?** `study_design` declares a study design. The port is
`design`. Neither says "metadata", which would name the mechanism rather than the thing.

**D8 · Does the evidence test the distinction, not only the arithmetic?** There is no arithmetic.
The tests must therefore be about the distinction: that a design is never inferred, that two
designs upstream of one computation are refused rather than resolved, that an undeclared design
is reported as undeclared rather than defaulted, and that the vocabulary admits only designs the
audit found we serve.

**D9 · Does it lower the practitioner's effort, measured?** **Not yet, and this is the honest
answer.** On its own it *raises* effort: it adds a node and two decisions and changes no output.
The effort it saves arrives at step 3, when a measure the design cannot estimate stops being
printed, and at the table import, when columns are mapped onto equation terms once rather than
re-entered per widget. A declaration that never gates anything would be paperwork, and if steps 3
and 4 do not follow, this should be retired rather than kept.

## The vocabulary

Six designs, closed, each one the audit found this application actually serves. Not the
twenty-two of `docs/research/fieldwork-study-designs-v1.1.md`, which is a reading list.

| Value | What `two_by_two` may estimate under it (step 3) |
| --- | --- |
| `cohort` | risk, risk ratio, risk difference, odds ratio — all four |
| `case-control` | **the odds ratio only**: `a+b` and `c+d` are artefacts of how many cases and controls were sampled, so `a/(a+b)` is not a risk |
| `cross-sectional` | the same arithmetic, renamed: `a/(a+b)` is a prevalence, and the ratio is a prevalence ratio |
| `ecological` | the measures are group-level, and the unit of analysis is the group and not a person |
| `case-series` | counts and intervals; no comparison group, so no ratio |
| `surveillance` | counts and rates over periods |

## What the reference adds, having now been read

`docs/research/fieldwork-study-designs-v1.1.md`, read on 2026-10-31. It corroborates the licences
above and sharpens one of them.

**How the controls were sampled changes what the odds ratio MEANS.** The reference: *"With
incidence-density sampling, an appropriately estimated OR can estimate an incidence rate ratio
without requiring a rare disease assumption."* So "the odds ratio only" is right as a statement of
what is estimable, and incomplete as a statement of what the number is — under risk-set sampling
it estimates an incidence rate ratio, and under cumulative sampling it does not. The declaration
built here does not capture the control-sampling scheme, so **it can refuse a risk ratio and
cannot yet say which ratio the surviving odds ratio estimates.** The reference also says
*"Preserve how controls were sampled"*, which is the field this would need and does not have.

**And it maps South London to one design where this project finds two.** The reference files the
whole study as a historical ecological natural experiment; the disagreement is recorded inside the
reference itself, because `water-company` reads Table IX where the company is known per house — a
retrospective cohort — while `contingency` reads Tables VIII and XII where it is attached per
sub-district. Two workflows, two designs, one study. That is the case the walk has to get right,
and it is why a design is declared per workflow rather than per project.

## The licences are a lookup table, and they should probably be knowledge

The practitioner, 2026-10-31: *"If the study designs is an epi ontology figuring out computations
will be knowledge engineering."*

**That is what the thing built here is not yet.** `DESIGN_LICENCES` in `study-design.ts` is a
hand-written TypeScript `Record<StudyDesign,DesignLicence>`: six rows, each naming the estimates
its design permits and a sentence saying why. The ontology carries `fw:licensedEstimate`, but as a
DATATYPE PROPERTY ASSERTED ON A RECEIPT — a fact about one run, recording what the code decided.
Nothing in `ontology/` says what a cohort licenses. The knowledge lives in the code, and the
ontology writes down its output.

**What the other shape would be.** The design classes carry their licensed estimands as axioms,
and which measures a computation may report is DERIVED rather than looked up. This application
already has the stack for it and uses it elsewhere: N3, a bundled EYE reasoner, `apply_ruleset`,
and a receipt that separates stated facts from derived conclusions — the very distinction
`receiptText` draws, and which this widget had to be taught today when a declaration fell through
to the rule branch.

Three things that would change, and they are the argument:

- **Adding a design becomes an ontology edit rather than a code change.** The closed set of six is
  currently closed by a TypeScript union; D1 said the vocabulary should be closed, not that it
  should be closed *in a type*.
- **A refusal becomes explainable by derivation.** Step 3 refuses a risk ratio on case-control
  data. A lookup can say *that* it refused; a reasoner can show the chain it refused along, which
  is this project's stated position on every other rule it runs.
- **The taxonomy becomes reviewable by an epidemiologist.** A Turtle file naming estimands against
  designs is something a domain expert can read and contest. A `Record<StudyDesign,DesignLicence>`
  is something a TypeScript reader can.

**Not decided here, and deliberately not built that way today.** Step 3 is the first thing that
consumes the licences, so it is the point at which the choice has to be made, and making it before
anything consumed them would have been designing the mechanism before the use. What this records
is that the lookup table is a placeholder with a known replacement — and that if step 3 is written
as a filter over `DESIGN_LICENCES`, the knowledge will have been engineered into procedure at
exactly the moment it could have been engineered into knowledge.

The honest risk on the other side: a reasoner in the gate path makes a refusal depend on the
reasoner, and `two-by-two.ts` is arithmetic that runs today with no such dependency. Whether a
measure is reported is not obviously a place to introduce one.

## What this does not establish

- **That a practitioner will declare one.** The one thing that would settle it is watching
  somebody meet this with their own data, which this project has not reached. Recorded in
  `docs/field-questions.md` rather than claimed here.
- **That the six are the right six.** They are the designs the 2026-10-28 audit found we serve,
  read off the widgets we have. A seventh that someone needs is a gap in this list, not evidence
  the list is wrong in kind.
- **That declaring a design makes a result correct.** It makes a wrong measure refusable at step
  3. Everything else about fitness — whether the groups are comparable, whether the denominator
  covers the numerator's period — is untouched, and the period check `rate` performs today is
  still string equality where the glossary defines the condition as coverage.
- **That a design is the whole of what gates a measure.** Control sampling decides what a
  case-control odds ratio estimates, and nothing here records it. The declaration is necessary
  and is not sufficient.
- **That the period is modelled richly enough.** It is declared as the practitioner writes it, so
  it can fill a title's `<time>`. Checking that a denominator's period COVERS a numerator's needs
  a structured period and is not built.

## What would close it

A design is declared on both South London workflows; a `two_by_two`, `rate` or `rate_ratio`
downstream of one finds it by walking upstream and refuses when it finds two; the machined Methods
note states the design and the unit of analysis; and the declaration is reachable from the palette
with its own release file and ontology terms. Step 3 then has something to gate on, which is the
test of whether this was worth adding at all.
