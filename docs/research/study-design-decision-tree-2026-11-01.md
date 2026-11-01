# A decision tree for refining a study design

_Created 2026-11-01 · Updated 2026-11-01_

**Asked by the practitioner, 2026-11-01:** what questions would help refine an epidemiology study
design, like a decision tree.

**Standing of this note.** It is a proposal and nothing here is built. It rests on search summaries
of the sources listed at the end, not on a reading of each one in full, and the primary papers need
reading before any of this reaches a widget. The order of questions is a judgement made here: the
published sequences ask about assignment, then comparison, then time, and this one adds the unit of
analysis and how subjects were selected because those are what separate Fieldwork's six designs.

## What the tree is for

Four counts look the same whichever study produced them, so a design is declared and never
inferred. The tree does not change that. It asks about what was DONE, and proposes a design for the
practitioner to accept. The published advice points the same way: an NIH methods handbook warns
against relying on the design label an author gives, and works from the methods instead.

**"Not sure" must be an answer at every step**, and it ends at no declaration, because a guessed
declaration is worse than none.

## The tree

```text
1. Who decided who was exposed?
   ├─ The investigator, by assignment
   │    └─ TRIAL. Randomised, or not?                    [no such design here yet]
   ├─ Something outside the study: a policy, an event, a water company
   │    └─ NATURAL EXPERIMENT. Was there a before, and an unaffected group?
   │                                                     [no such design here yet]
   └─ Nobody: exposure was observed
        │
        2. What does one row count: a person or household, or a whole group?
           ├─ A group, with exposure known only for the group ......... ECOLOGICAL
           └─ An individual subject
                │
                3. Is there a comparison group?
                   ├─ No
                   │    └─ Is this ongoing counting over periods?
                   │         ├─ Yes ................................... SURVEILLANCE
                   │         └─ No .................................... CASE SERIES
                   └─ Yes
                        │
                        4. How did subjects get into the study?
                           ├─ From a defined group, then followed
                           │  to see who became a case ................ COHORT
                           ├─ Because they were or were not cases ..... CASE-CONTROL
                           └─ Sampled at one time, exposure and
                              outcome measured together ............... CROSS-SECTIONAL
```

## The refining questions, once a design is proposed

Each of these changes what a number means or which measure is right.

| Design | Question | Why it matters |
| --- | --- | --- |
| Cohort | When does follow-up start, and is that when eligibility and exposure are settled? | Misaligning these is the usual source of immortal time bias |
| Cohort | Was everyone followed for the same period, or for different lengths of time? | A shared period gives a risk; different lengths need person-time and a rate |
| Cohort | Was the cohort assembled from existing records, or followed forward? | Decides what could be measured and when |
| Cohort | How many were lost to follow-up, and do they differ? | STROBE asks this of every cohort |
| Case-control | Were controls sampled from those still at risk when each case arose, from those free of disease at the end, or from the group at the start? | **Decides what the ratio estimates** (below) |
| Case-control | Were controls matched? On what? | STROBE asks for matching to be handled in the analysis |
| Case-control | Is exposure stable over the study period? | Knol et al. found this assumption matters more often than disease rarity |
| Cross-sectional | How was the sample drawn, and are there weights? | STROBE asks for the sampling strategy to be reflected in the analysis |
| Cross-sectional | Could the outcome have caused the exposure? | Both were measured together, so the order may be unclear |
| Ecological | How much does exposure vary within each group? | That variation is what a group-level result cannot see |
| Surveillance | Did the case definition or the reporting change during the period? | A change looks like a trend |
| Surveillance | Is there a denominator for each period? | Decides between counts and rates |
| Case series | How were the cases found? | Decides what group they can speak for |

**And four that apply to every design**, from the target trial protocol and STROBE: who is eligible;
what exactly is compared with what; how the outcome is defined; and which confounders were measured.

## The question that would change the widget most

**How were the controls sampled?** Under incidence-density sampling the odds ratio estimates the
incidence rate ratio with no rare-disease assumption. Under cumulative sampling it approaches the
risk ratio only when the disease is rare. Labrecque et al. (2020) go further: they argue that
density-sampled and case-cohort studies should report rate ratios and risk ratios respectively
rather than odds ratios.

`readUnderDesign` already reports one arithmetic under the name a design gives it, for prevalence
measures, so the same mechanism could carry this. It means splitting `case-control`, or giving it a
sub-question, and that is a decision for the practitioner.

## What it shows about the six designs

- **Two branches have no design to land on.** Fieldwork serves observational designs only. South
  London's 1849/1854 figure is the case in point: it compares before and after a change nobody in
  the study assigned, with a group that did not change, and neither `cohort` nor `ecological` says
  that. Whether to add a natural-experiment design is open.
- **Checked against South London's two declared designs by hand.** Deaths per house by company:
  exposure observed, one row a house, a comparison, houses taken from a defined group. It reaches
  COHORT, the declared design. Sub-districts by company: a company attached per sub-district reaches
  ECOLOGICAL, also as declared. Two examples are a sanity check and no more.

## What this does not establish

- That the tree classifies correctly beyond those two examples. It needs trying on real studies by
  an epidemiologist other than its authors.
- That practitioners would answer it accurately, or would use it at all.
- That these are the right questions in the right order. They are drawn from general guidance and
  from what separates the six designs here.
- Anything about the risk-of-bias tool ROBINS-E, which the search did not return and which is
  left out for that reason.

## Sources

- [NIH methods handbook, study design algorithm appendix](https://ncbi.nlm.nih.gov/books/n/methresbias/appb)
- [Research design algorithm, Academy evidence library](https://www.andeal.org/vault/2440/web/files/Research_Design_Algorithm.pdf)
- [UNC study designs handout](https://sph.unc.edu/wp-content/uploads/sites/112/2023/04/Handout-Study-Designs-3.27.23.pdf)
- [Knol et al. 2008, what do case-control studies estimate?](https://boris.unibe.ch/27781)
- [Greenland and Thomas 1982, on incidence-density sampling](https://pubmed.ncbi.nlm.nih.gov/7124721/)
- [Labrecque et al. 2020, when is a case-control study a case-control study?](https://medicaljournalssweden.se/jrm/article/view/18041)
- [STROBE explanation and elaboration](https://pmc.ncbi.nlm.nih.gov/articles/2020495/)
- [Target trial emulation tutorial](https://arxiv.org/pdf/2608.01625)
- [On estimands in target trial emulation](https://arxiv.org/html/2601.03377v1)
