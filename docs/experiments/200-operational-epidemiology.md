# 200 · Operational epidemiology

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** asked. A map of a body of work and what Fieldwork already holds of it, made to choose a first slice from.
Nothing is built.

## The question

The practitioner, 2026-11-09: *"Let's also figure out how FW can support contact tracing"*, and then, widening it:
*"Let's conceptualize that body of work that constitutes operational epidemiology."*

## What the term is, and is not

**Not a defined term in the open sources read.** A search on 2026-11-09 found no definition of "operational
epidemiology". The nearest:

- **Field epidemiology**, in CDC's open *Field Epidemiology Manual*: epidemiology applied where a problem's timing is
  unexpected and a timely response is demanded ([Defining Field Epidemiology](https://www.cdc.gov/field-epi-manual/php/chapters/defining-field-epi.html)).
  Its investigation chapter sets out ten steps, which may run out of order or together
  ([Conducting a Field Investigation](https://www.cdc.gov/field-epi-manual/php/chapters/field-investigation.html)).
- **Contact tracing**, in WHO's interim guidance of 6 July 2022: identifying, assessing and managing people who were
  exposed ([Contact tracing and quarantine in the context of COVID-19](https://www.who.int/publications/i/item/WHO-2019-nCoV-Contact_tracing_and_quarantine-2022.1)).
  WHO issued disease-agnostic contact tracing guidance in 2024–2025; not read here.
- **Its indicators are not agreed.** A scoping review found 153 contact tracing indicators in use, two-thirds of them
  process indicators, and no standard set ([PLOS ONE, open](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8884491/)).

So the phrase is the practitioner's, recorded as said. What follows is a working map to explore from, not a
definition to enforce.

## A working map: the work, as the questions a responder asks

What Fieldwork holds today, by its widgets' own names, and where the gap is.

| The question | What it takes | In Fieldwork now | The gap |
| --- | --- | --- | --- |
| **Who is a case?** | A case definition, applied to every record, with its classes | **Apply ruleset**; the rulesets worked example's case definition (0.64.0) | Sierra Leone's classification, postponed by the practitioner |
| **Who is on the list?** | A line list, cleaned without being changed | **Tabular data**, **Deduplicate records**, **Append rows**, the data quality tab | — |
| **When, where, who?** | Counts by time, place and person | **Cases by period**, **Map**, **Total within groups**, **Rate with a denominator**, **Chart** | — |
| **Who was exposed?** | A contact list, each contact tied to a case, with the setting and the last day of exposure | A contact list is a table: **Tabular data**; tied to its case by **Relate a column from another table** | No worked example holds one |
| **Who is still being followed?** | Each contact's day of follow-up, counted from the last exposure over the disease's window | — | **Days between two dates.** Rules order rows by date, but cannot compute a difference of dates |
| **Who infected whom?** | Each case's source; the serial interval; secondary cases per case; chains and generations | Hagelloch, 1861, already records it: `infector` is a case's `case_ID`, on 188 children | Serial interval needs days between dates. A chain needs links followed one after another: **Reachable junctions** does that on streets only |
| **Is the response keeping up?** | Contacts per case; the share followed; the share of new cases already on the contact list | **Total within groups** and **Apply ruleset**, once the dates are there | Which indicators: not agreed (above) |
| **Did the measures reach people?** | Isolation, quarantine and vaccination coverage | **Rate with a denominator**, **Two-by-two** | Not mapped yet |
| **What do we tell people?** | A situation report | Notes and the write-up | Not mapped yet |

Two gaps recur: **days between dates**, and **following links from record to record**. Both belong in widgets that
exist (Apply ruleset's computed columns; a reachability that reads a table's links), not in a contact-tracing widget.

## The first slice, proposed: who infected whom, in Hagelloch, by hand

Built into Fieldwork already, real, and open: 188 cases, each with `infector`, onset dates and a house.

1. **Relate a column from another table**, the cases to themselves on `infector` = `case_ID`: each case gains its
   infector's prodrome date. To check first: whether a table may be related to itself.
2. **Apply ruleset**, a computed column in days between two dates: the serial interval. The one extension.
3. **Total within groups** by `infector`: secondary cases per case, the offspring distribution.
4. **Chart** of both; **Map** with each case drawn to its infector, if Map can draw a link.

Each step goes to the standard Inspector as it is touched. Chains and generations wait for the second gap.

## What would close this

The practitioner choosing a first slice, this one or another, and its being built and run by hand on an empty
canvas. Contact follow-up, a situation report and response indicators are later slices, each its own experiment.

## Related

- 199, to come: porting the Gaborone TB agent-based model, one step at a time. A contact list is the structure an
  agent-based model runs on; the two may meet.
- [117](117-data-quality.md): an absence that is an outcome, which a contact's "never became a case" is.

## What this does not establish

That this map is complete, or that its rows are the practitioner's: it is a draft to be corrected. That Fieldwork
should run a contact tracing programme: tools such as WHO's Go.Data exist for that, and were not read here. What
Fieldwork offers is the analysis of such data, by hand and explained, for training.
