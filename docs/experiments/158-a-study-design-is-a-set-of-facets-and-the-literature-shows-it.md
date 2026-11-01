# 158 · A study design is a set of facets, and open literature shows it

_Created 2026-11-01 · Updated 2026-11-01_

**Status:** asked — the search is not built. The access question was measured, the facets are drafted, and the search itself is proposed.

## The task

The practitioner, 2026-11-01, on the decision tree: *"So probably the decision tree should be more of a taxonomy?"* And then:

> The best thing we can do next for study design widget to be really useful is to a faceted search
> of literature (open access) so example applications of study designs are available to trainees to
> examine and study.

The evidence is in [the decision tree review](../research/study-design-decision-tree-2026-11-01.md),
and the rule on open sources is the direction `open-evidence-for-low-resource-settings`.

## Why facets rather than a tree

A tree forces one path, and allocation and sampling are independent. Natural experiment broke the
first draft for that reason: Snow's house comparison is outside allocation and cohort-like sampling
at once. A strict hierarchy would repeat the fault, so the proposal is eight facets: collection,
unit, entry, comparison, observation, allocation, time and group variable. *(Corrected 2026-11-01:
first listed as seven; observation was split from time, because following subjects and calendar
structure answer different questions.)* A design label would follow from facet values, and the
review now holds [the mapping](../research/study-design-decision-tree-2026-11-01.md). The tree stays as one guided path through them, because a novice needs a place to
start.

**A rule may propose a label and never declares one.** That keeps "declared, never inferred".

## Settled, 2026-11-01

- **Facet values that fit two labels offer both.** One followed group with no comparison offers
  cohort and case series, cohort first, and records the definition used. Decision 1 of the review.
  Not built: no shipped surface asks the questions yet.
- **Facet values that fit no label compute under neutral names.** Decision 5. Built in
  `two_by_two` 0.5.0.

## Measured, 2026-11-01

All five services answered a request carrying a cross-origin `Origin` header with
`access-control-allow-origin: *`, so no server is needed.

| Service | Use here |
| --- | --- |
| Europe PMC | Open-access filter and MeSH design terms |
| NCBI E-utilities | Open-access filter on PMC |
| OpenAlex | Open status; a shared daily budget without a key |
| DOAJ | Open-access journals only |
| Crossref | Metadata; no open filter alone |

Open-access counts in Europe PMC on the same day: case reports 41,242; cohort 26,737;
cross-sectional 15,901; case-control 13,629; ecological 1,489 by MeSH and 1,187 by title; natural
experiment in a title 573; public health surveillance 510.

**The indexes disagree.** For cholera case-control studies, E-utilities returned 106 open PMC papers
and Europe PMC 5, on similar but not identical filters. Why is not known.

## The problem that shapes the design

**An index holds a label, not a design.** The audits in the review judged 34–97% of papers calling
themselves case-control not to be. A search on that term would show trainees mislabelled papers as
models. So a result is shown as "indexed as case-control", never "is case-control".

## The proposal

Pearce recommends teaching epidemiology through real problems, which fits a collection of real
papers. That is an editorial position and not a test.

1. A small checked collection first: open papers classified by a person against the facets, with
   the reasoning and the machined sentences each would produce. It ships with example data, so it
   works offline.
2. Live search across open indexes, reporting which source each result came from.
3. "Classify this yourself": a trainee fills in the facets and sees whether the label holds.

## The query comes from the ontology

The practitioner, 2026-11-01: *"If our facets become part of the ontology, I think we can engineer
the right query parameters for the index search."*

- Each facet value is an ontology term, carrying one query mapping per index, because syntax and
  vocabulary differ. Mappings use `skos:closeMatch` rather than `exactMatch`: an index term is not
  the design.
- The generated query is shown and goes in the receipt, so a search can be rerun and read.
- A facet with no usable index term records that limit. No mapping is faked.
- The order is the checked collection, settled values as terms after the ontology admission review,
  mappings, then measurement. For each value and index: how many collection papers the query finds,
  and how many results really are that design. Those figures stay with the mapping.

**It is also a second purpose.** The practitioner: *"The transparency itself behind query generation,
being ontology-based, introduces the field of public health informatics to epidemmiology trainees
(knowledge representation and reasoning)."* This is a design intention. It stays one step off the
main path, as the N3 and evidence view does.

**Practitioner observation, written before any result exists:** can a trainee explain why a query
returned what it did, and predict what changes when a mapping changes? This can come out badly:
trainees may ignore the query entirely.

## AI was considered and set aside

Asked 2026-11-01 whether a WebGPU local model could filter results. The practitioner: *"My position,
if we can do away with AI in FW, unless compelling, better."* Index fields filter, the checked
collection handles mislabelled papers, and caveats written as fixed prompts tied to facets question
the trainee. All three work offline on any device. WebGPU would also exclude the low-resource
settings this is for.

**What would reopen it:** evidence that fixed prompts fail trainees because they cannot respond to
what a trainee wrote. Any exception must improve the trainee's own analysis, reasoning, synthesis and
communication, stay optional, and leave everything else working without it.

## What this does not establish

- That any of this helps a trainee learn. No controlled evidence was found for flowcharts, and none
  was sought for faceted search.
- That seeing a query teaches informatics, or that any index term maps usefully to a facet.
- That the facets are right, or that raters agree on them. They are a draft from the review.
- That a free index stays free: OpenAlex already limits use without a key.
- That the counts mean what they say, given how often labels are wrong.

## What would close it

A trainee who did not build this can find open papers by facet, classify one, and see how their
reading compares with a checked classification, and classification measurably improves. The checked
collection needs a person's judgement, so it closes only with an epidemiologist's review.
