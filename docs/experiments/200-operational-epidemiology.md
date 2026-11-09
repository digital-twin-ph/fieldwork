# 200 · Operational epidemiology, anchored on 7-1-7

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** asked. A map of a body of work and what Fieldwork already holds of it, anchored on the 7-1-7 target and
its bottleneck taxonomy, made to choose a first slice from. Nothing is built.

## The question

The practitioner, 2026-11-09, in order: *"Let's also figure out how FW can support contact tracing"*; *"Let's
conceptualize that body of work that constitutes operational epidemiology"*; and *"Our operational epidemiology
approach should be anchored on the 7-1-7 framework the taxonomy of which is described on the website of the
7-1-7-alliance.org"*, pointing to its analysis of bottlenecks in 18 countries.

"Operational epidemiology" is the practitioner's phrase, recorded as said: no open source read defines it. The
nearest is field epidemiology in CDC's open manual, epidemiology applied where a problem's timing is unexpected and a
timely response is demanded ([Defining Field Epidemiology](https://www.cdc.gov/field-epi-manual/php/chapters/defining-field-epi.html)).

## The anchor: 7-1-7, as the Alliance states it

Read 2026-11-09 on [717alliance.org](https://717alliance.org/) ([FAQ](https://717alliance.org/faq/),
[milestone dates](https://717alliance.org/resources/7-1-7-milestone-dates-reference-guide/)):

- **7 days to detect**: from emergence, the index case's onset, to detection, the date the event is first recorded by
  any source or in any system.
- **1 day to notify**: from detection to notification, the date the event is first reported to the authority
  responsible for acting on it.
- **7 days to respond**: from notification to the last of seven early response actions completed: initiating an
  investigation or deploying a team; epidemiological analysis and an initial risk assessment; laboratory
  confirmation; case management and infection prevention and control in facilities; public health countermeasures in
  communities; risk communication and community engagement; and a coordination mechanism.

A missed target is reviewed for its **bottlenecks**, classified under the Alliance's
[common bottleneck categories](https://717alliance.org/resources/list-of-bottleneck-categories/) (March 2024, "non
exhaustive"): **37 categories under eight themes**: clinical or health care worker; coordination; laboratory; data
systems; event characteristics; patient and community; planning and procedures; resources and procurement.

**What the 18 countries found** ([From 18 countries to yours](https://717alliance.org/resources/from-18-countries-to-yours-actionable-7-1-7-bottleneck-insights/),
2 May 2025): 148 outbreaks, 505 bottlenecks. About 28% met the whole target; 62% met detection, 75% notification and
47% response. 45% of bottlenecks were in early response. The most frequent: inadequate resources for early response
(30% of outbreaks), low awareness or clinical suspicion (28%), laboratory confirmation (27%). Cholera (21%),
vaccine-preventable (18%) and vector-borne diseases (18%) met it least often.

**Terms of use: not stated** on the pages read or in the categories PDF. So Fieldwork cites and links the taxonomy and
does not ship its list until the Alliance's terms are known; asking them is the practitioner's to do.

## What that makes operational epidemiology here

Two kinds of work, both timed by 7-1-7:

1. **The analysis each early response action needs.** Most of what Fieldwork does serves action 2, the
   epidemiological analysis and risk assessment; contact tracing serves actions 1 and 5.
2. **The timeliness review itself**: an event's milestone dates, its three intervals, whether each target was met,
   and its bottlenecks, classified and counted across events. That is a table of dates and categories, which
   Fieldwork reads already.

| 7-1-7 | The work | In Fieldwork now, by its widgets' names | The gap |
| --- | --- | --- | --- |
| **Detect** | A case definition applied; the line list; the curve that shows an event | **Apply ruleset** (the rulesets example's case definition), **Tabular data**, **Deduplicate records**, **Cases by period** | — |
| **Notify** | When it was first reported, to whom | A date column | — |
| **Respond, 1 and 5** | Who was exposed; who is still followed; who infected whom | A contact list is a table: **Tabular data**, **Relate a column from another table**. Hagelloch, 1861, records `infector` on 188 cases | **Days between two dates**; **following links from record to record** (Reachable junctions does it on streets only) |
| **Respond, 2** | Burden, severity and risk factors; a risk assessment | **Total within groups**, **Rate with a denominator**, **Two-by-two**, **Regression**, **Map**, **Chart** | — |
| **Respond, 3, 4, 6, 7** | Laboratory confirmation; facility measures; risk communication; coordination | Their dates, as milestones | Not analysis Fieldwork does |
| **The review** | Three intervals per event; met or not; bottlenecks by theme and category; shares across events | **Apply ruleset** for met or not; **Total within groups** and **Chart** for the counts | **Days between two dates**; the taxonomy as a closed vocabulary, pending its terms |

**One extension recurs: days between two dates**, a computed column in Apply ruleset. Every 7-1-7 interval is one,
and so are a contact's day of follow-up and a serial interval. It belongs in the widget that already computes
columns, not in a 7-1-7 widget.

## A first slice, proposed: a 7-1-7 review, by hand

Events as rows, with their milestone dates; bottlenecks as a second table, keyed by event, each with its theme and
category.

1. **Tabular data**: the events; and the bottlenecks.
2. **Apply ruleset**, with the one extension: days to detect, notify and respond; each target met or not; the event
   met 7-1-7 or not. Published as a ruleset, so a review is the same everywhere.
3. **Total within groups** and **Chart**: the share meeting each target; bottlenecks by theme.

**The data, still to find:** open event-level 7-1-7 data, real and citable. To check: the Alliance's
[global data dashboard](https://717alliance.org/7-1-7-global-data-dashboard/), and open-access papers reporting events
with their milestone dates. Made-up events are the fallback, said so.

Then contact tracing on Hagelloch, as a second slice: each case related to its infector, the serial interval in days,
secondary cases per case.

## What would close this

The practitioner choosing the first slice and its data, and its being built and run by hand on an empty canvas.

## Related

- **199, to come: porting the Gaborone TB agent-based model, one step at a time.** The two are related: a model of the outbreak is what a response is timed against, and its contact structure is what contact tracing reads.
- [117](117-data-quality.md): an absence that is an outcome.

## What this does not establish

That this map is complete or is the practitioner's: it is a draft to be corrected. That 7-1-7's taxonomy may be
shipped: its terms are not stated. That Fieldwork should run a response: tools such as WHO's Go.Data do that, and were
not read. What Fieldwork offers is the analysis, by hand and explained, for training.
