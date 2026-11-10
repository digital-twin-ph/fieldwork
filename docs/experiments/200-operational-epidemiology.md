# 200 · Operational epidemiology, anchored on 7-1-7

_Created 2026-11-09 · Updated 2026-11-10_

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

**Terms of use: CC BY-NC-SA 4.0, as the Alliance's assistant states them.** Not stated on the pages or in the PDF;
the practitioner asked the site's chat assistant, 2026-11-09, which answered that the 7-1-7 Alliance is a project of
Resolve to Save Lives, and all RTSL-owned materials in its Resource Library are under Creative Commons BY-NC-SA 4.0:
use, adapt and share, non-commercially, with attribution; anything adapted from them under the same licence. It added
that it had no details on items with different terms, such as partners' materials, and named contact@717alliance.org.
A chat assistant's answer is not the licence text, so the bottleneck categories' own terms are to be confirmed there.

**What that means for Fieldwork**, by the rule this project already holds for non-commercial data
([STAC survey](../research/stac-catalog-survey-2026-10-10.md), [data sources](../research/data-sources.md)): Fieldwork
is Apache 2.0, which anyone may use for any purpose, so a non-commercial taxonomy is **not built into the application**.
It travels with the data: in a worked example's repository, under its own licence, attributed, and anything made from
it (a SKOS rendering, a translation) shared under BY-NC-SA too. The application reads it as it reads any declared
vocabulary a project brings.

## The questions, and which bottlenecks Fieldwork can serve

The practitioner, 2026-11-09: *"The bottlenecks are associated with key questions those are the ones that we will
focus on. Not all of the bottlenecks are within the purview or FW to support."*

**The key questions, as the Alliance asks them.** Its guide to after-action reviews
([Leveraging 7-1-7 in After-Action Reviews](https://717alliance.org/resources/leveraging-7-1-7-for-aars/)) frames a
review by four questions, after WHO's: what was in place before the response; what happened during it; what went well
and less well, and why; what to do better next time. Bottlenecks and enablers answer the first and the third; the
timeliness metrics, the second. No per-category question was found in the Alliance's documents read.

**Which bottleneck themes Fieldwork can serve**, a first sort, mine, to be corrected. "Serve" means Fieldwork can
measure the bottleneck from data, or let a responder practise the skill whose absence it names; never that Fieldwork
removes it.

| Theme | Within reach | The question Fieldwork can help answer |
| --- | --- | --- |
| Data systems | Timely or complete surveillance data; working where the network is poor | How complete and timely are the data, and where are the gaps? Fieldwork works offline |
| Clinical or health care worker | Training in surveillance and response; clinical suspicion | Could the event have been seen sooner in the data? Practising case definitions and curves, by hand |
| Laboratory | Delays in specimen collection, transport, turnaround and reporting, measured | Between which dates did the time go? |
| Patient and community | Delay in care-seeking, measured; sensitivity of community detection | How long from onset to first contact with care, and who was detected by whom? |
| Event characteristics | Access | Who is far from care, in travel time? |
| Planning and procedures | Risk assessment | What are the burden, severity and risk factors? (early response action 2) |
| Coordination | Sharing information across sectors; coordinating a multi-site investigation remotely | Can two sectors' tables be related on a shared key? Can a multi-site outbreak investigation project be securely coordinated remotely? |
| Resources and procurement | Financing, supplies and logistics, staffing: their data, collected and analysed | Where did funds, supplies and staff fall short of the response, and when did each arrive? Approvals stay out of reach |

Within every theme, capacity itself (laboratory capacity, case management, response teams, coordination across
countries) is out of reach; its timing, measured from dates, is in.

**Corrected by the practitioner, 2026-11-09**, on resources and procurement, first sorted as out of reach because
*"financing, supplies, staffing and approvals are not analysis"*: *"financing, supplies/logistics and staffing data
can be collected and analyzed."* Stock on hand against need, days from request to delivery, staff deployed against
posts: tables with dates and counts, which Fieldwork reads. Approvals were left out of the correction and stay out.

**Added by the practitioner, 2026-11-09**, to coordination: *"can a multi-site outbreak investigation project be
securely coordinated remotely?"* Open, and not answered by anything built. What exists: Fieldwork keeps everything on
the device, with no server; a project travels as an exported bundle, and the worked examples as repositories pinned by
commit. What it would need to be asked: who holds which site's data, what may leave a site (person-level records may
not), how a change made at one site reaches the others and is seen to, and how a bundle is known to be the one sent.

## Open data for the 148 outbreaks, looked for 2026-11-09

- **The Alliance's dataset is not open.** Its [global data dashboard](https://717alliance.org/7-1-7-global-data-dashboard/)
  shows country data only with the owning country's permission.
- **The first multi-country study** ([Bochner et al., Lancet Global Health 2023, CC BY 4.0](https://pmc.ncbi.nlm.nih.gov/articles/PMC10156425/)):
  41 events in Brazil, Ethiopia, Liberia, Nigeria and Uganda, 2018–2022; 27% met the whole target. Its text gives
  aggregates only (by event type; bottlenecks by category, not by event), its ethics approvals were for aggregate
  data, and requests go to each country through the corresponding author. Its appendix sits behind a CAPTCHA and was
  not read; whether it lists events is unknown.
- So no event-level 7-1-7 data set has been found open. To try: the appendix, opened by hand; outbreaks whose own
  open reports give their milestone dates, assembled with each date cited; or made-up events, said so.

### Similar data: open line lists with the dates 7-1-7 measures between

The practitioner, 2026-11-09: *"If data are not available we can look for similar data."* Not 7-1-7 reviews, but
outbreaks recorded case by case with an onset and a later milestone, so an interval can be computed, counted against
a target and explained. Read 2026-11-09; "to check" marks what the pages read did not settle.

| Data | Cases | The dates per case | Who infected whom | Terms, as stated |
| --- | --- | --- | --- | --- |
| **MERS-CoV, South Korea, 2015** (`mers_korea_2015`, R package [outbreaks](https://cran.r-project.org/package=outbreaks) 1.9.0; from ECDC epidemic intelligence) | 162, to check | onset, report, diagnosis, exposure start and end, death | Yes: a contacts table, from, to and exposure | Package GPL (≥ 2). Its page: for teaching, not the final investigation |
| **Ebola, Sierra Leone, 2014–15** (`ebola_sierraleone_2014`; Fang et al. 2016, PNAS) | 11,903 | onset, sample | No | Package GPL (≥ 2); the paper's own terms, to check |
| **Mpox, 2022** ([Global.health line list](https://github.com/globaldothealth/monkeypox)) | many countries, to count | onset, confirmation | No | CC BY 4.0 for the repository's exports; frozen 2022-09-22 |
| **Influenza A H7N9, China, 2013** (`fluH7N9_china_2013`; Kucharski et al., [Dryad](https://datadryad.org/stash/dataset/doi:10.5061/dryad.2g43n)) | 136 | onset and hospitalisation, to check | No | To check on Dryad |
| **Measles, Hagelloch, 1861** (built in) | 188 | prodrome, rash, death | Yes: `infector` | Already shipped with its provenance |

No package page restricts use beyond the MERS and simulated-Ebola pages' "for teaching". A file inside a GPL package
carries the source's terms too; each source is checked before anything is shipped. Onset to report (MERS) and onset to
sample (Sierra Leone) are the nearest to 7-1-7's detect and notify; MERS also serves contact tracing.

## Open data for each bottleneck theme, searched 2026-11-09

Asked for by the practitioner, to demonstrate 7-1-7 support (TODO 10). **Found by a search of landing pages and
metadata; no file was downloaded or opened**, so columns are as each paper or repository describes them, and each must be
checked before use. Licences as the source states them. HDX and PMC refused automated reading and were not verified.

| Theme | Best candidate | Licence, as stated | What it would measure |
| --- | --- | --- | --- |
| All, citing 7-1-7 | South Sudan 7-1-7 key dates, bottlenecks and enablers, 18 events 2013–2025 (figshare 10.6084/m9.figshare.30288880) | CC BY 4.0 | Detect, notify and respond intervals per event; the only open event-level 7-1-7 table found |
| Data systems | Malawi IDSR reporting rates from DHIS2, Oct 2014–Sep 2016 (PLOS ONE 2018, S5) | CC BY 4.0 | Reporting completeness by district and month |
| Clinical | Rosello et al. 2015, DRC Ebola line lists 1976–2014 (eLife, supplementary file 1) | CC BY | Onset to hospitalisation and to notification |
| Laboratory | Ghana yellow fever specimen timeliness, 260 districts 2018–2022, with a shapefile (figshare 29265026) | CC BY 4.0 | Onset to specimen, specimen to national laboratory, by district; aggregated |
| Patient and community | CARAMAL treatment-seeking pathways, Uganda (Zenodo 6833713) | CC BY 4.0 | Care-seeking delay; its rows and dates unconfirmed |
| Access | Maina et al. 2019, 98,745 public health facilities in sub-Saharan Africa (figshare 7725374); travel-time rasters, Weiss et al. 2020 | CC0; rasters' terms to confirm | Travel time to care |
| Planning | Torres Munguía, global outbreaks by country, disease and year 1996–2026 (figshare 17207183) | CC BY 4.0 | Burden; years only, no dates |
| Coordination | South Sudan's table (human and animal events together); Tanzania integrated bite case management 2018–2024 (Zenodo 18508654) | CC BY 4.0; GPL-3.0 | Cross-sector linkage; the Tanzania human–animal link unconfirmed |
| Resources and procurement | **None found** with stock, request-to-delivery dates or staffing for a response | | |

**Not found:** supplies, logistics or staffing data for a response; anything on coordinating a multi-site investigation
remotely (tools only: Go.Data, SORMAS); weekly reporting completeness; specimen-level result dates. The data behind
Bochner et al. 2023 and the Liberia, Zambia, Cambodia and Thailand 7-1-7 studies are on request only.

**First to try: South Sudan's key dates**, the 7-1-7 review itself on open data, after its licence and columns are read
in the file.

## Step 5, built 2026-11-09: the transmission tree, and Hagelloch's second workflow

The practitioner: *"I still don't see the transmission chain chart for hagelloch"*, then *"Vega lite for tree chart."*

- **Chart draws a transmission tree** (Chart 0.12.0). In Configure…, **Draw** offers *Transmission tree*, with the
  columns naming each case, its infector and its date. Each case is a point at its date on a row of its own; a line
  runs down from its infector's date and across to its own, so the length across is the serial interval. Drawn by
  Vega-Lite, as every other chart, so it exports and carries its title and source note.
- **Nothing is dropped.** A case naming no infector starts a chain; one naming an infector the table does not hold,
  one in a loop, and one without a readable date are each counted and coloured apart.
- **Chart moved to the standard Inspector** in the same pass: its three old panels' settings are all in Configure…,
  under the same ids. Nine tests and twenty steps in three example manuals were moved into the dialog.
- **Hagelloch has a second workflow**, *12 · Hagelloch: who infected whom*: the serial interval, the secondary cases
  and the tree, configured as built by hand, so it runs when opened.

**Run, in Chromium and in Node:** 188 cases in 4 chains, 184 links; the largest starts with case 184 and holds 173 cases
over 6 generations; 4 cases name no infector. `tests/transmission-tree.test.mjs` (3),
`tests/hagelloch-transmission-tree.browser.mjs` and `tests/hagelloch-chains-example.browser.mjs` (1 each).

**Found doing it:** the workflow opened under *Heat outreach screening*, because the app recognised example keys from
a closed list; the new key was added to it. The rules warn that 4 records could not be read as dates: the 4 cases kept
under "no infector recorded" carry a word, not a date, in `infector_prodrome`, and are treated as not recorded. That is
what they are, and the warning says so.

**Checked by somebody else's code** (lab check 44): every case's chain and generation equal networkx's component and
shortest path length from its root, in CPython and in the browser kernel.

## Step 4: who infected whom, on the map, 2026-11-10

**Built** in Map 0.22.0, the closest widget: Map already draws point layers with a per-layer class and name, and a
line between two records of a layer is one more per-layer setting, not a new widget. In Configure…, under **Lines
between records**: *Line to the record named in* `infector`, *Found by* `case_ID`. A line with an arrowhead runs
from the infector's point to the case's, under the marks, on the static figure and the interactive map, where it is
a layer of its own. The key names it.

**On Hagelloch** (chosen in Configure… on the first workflow's map by `tests/map-links.browser.mjs`, and shipped on
the second workflow as *Who infected whom, on the map*): 188 records; **94 lines drawn**; **90 links at one place**,
two children of one house, counted and not drawn, because a line there has no length; 4 cases naming no infector.
184 links in all, the tree's number.

**Found doing it:** nearly half the links are inside a house. A map of lines alone would have shown half the
transmission and said nothing of the rest; the counts above the map, the key and the receipt say it. The check that a
"found by" column is chosen first ran when Apply wrote the setting, which threw the choice away; it now runs at Run,
which says what to choose.

**Run:** `tests/map-links.test.mjs` (4) and both browser tests on Chromium.

**Checked by somebody else's code** (lab check 45): the same 94 lines and the same count for every outcome as a
pandas self-merge on `infector` and `case_ID`, in CPython and in the browser kernel. Hagelloch holds no case naming an
unknown case, itself, a duplicated id or an unplaced house, so those four counts agree at zero only; the unit test
exercises them.

**Not yet:** WebKit.

## Detect: finding clusters, 2026-11-09

Asked for by the practitioner: *"Under detect can we add a cluster detection widget like SatScan?"*

- **Space-time permutation scan**, for a line list with dates and places and no population: the first to build,
  reusing Epi Info AI's candidate (circles over places and windows over time; dates shuffled across fixed places for
  the p-value, with a recorded seed). There, SaTScan 10.1.3 chose the same leading window on a 30-case synthetic set;
  the counts differ because SaTScan loaded 28 cases, and the 30-case re-run is pending. A candidate until Fieldwork's
  own lab check passes. First use: Hagelloch replayed day by day, to find the first day a cluster would have been
  flagged, against emergence: a detection-timeliness finding.
- **Poisson spatial scan**, for areas with populations (the practitioner: *"I do like your suggestion also about
  Poisson spatial scan"*): written new, on the same machinery. Relative risk is the right word only here. Data at hand:
  Brazil's 92 municipalities, South London's 32 sub-districts.
- **Describing where points are dense** (HDBSCAN, kernel density, raised by the practitioner): exploratory, and never
  under Detect. Neither tests whether a group or a peak is unusual, and both mostly map where people live. Kernel
  density's epidemiological form is a ratio of case density to population or control density; its bandwidth is
  stated, never hidden.

## Ontologies to reuse, looked for 2026-11-09

The practitioner: *"I need to know if there is an ontology for outbreak response and investigations that we can
reuse"*, *"Or if 717 taxonomy maps to any existing onto."*

| Ontology | Covers | Fit here | Licence, as found |
| --- | --- | --- | --- |
| [Apollo-SV](https://ontobee.org/ontology/APOLLO_SV) (OBO) | Infectious disease epidemiology and population biology for epidemic simulation: populations, contacts, interventions | 199's model, and the interventions 7-1-7 times | CC BY 4.0 (OBO registry) |
| [GenEpiO](https://ontobee.org/ontology/GENEPIO) (OBO) | The laboratory, clinical and epidemiological context of (foodborne) outbreak investigations | An investigation's records | To check |
| [Health Surveillance Ontology](https://obofoundry.org/ontology/hso) (OBO) | One Health surveillance across animal, human and food | Surveillance systems, detection | To check |
| IDO (OBO) | Infectious disease, the core others extend | Underneath all of these | To check |
| [Epidemiology Ontology](https://www.obofoundry.org/ontology/epo) | Metrics and parameters | **Not to use**: deprecated by the OBO Foundry, unmaintained | — |

**Nothing found models 7-1-7**: its milestones, early response actions or bottlenecks. Its nearest relative is a
framework, not an ontology: the IHR **Joint External Evaluation** indicators, to which the 41-event study mapped its
bottlenecks. No ontology of the JEE or of IHR core capacities was found either.

So, a proposal: the milestones as dated activities in PROV-O, which Fieldwork already uses; the bottleneck taxonomy as
a SKOS concept scheme carried in an example repository under BY-NC-SA, citing the Alliance, each category linked to a JEE
indicator only where a source states it; Apollo-SV and GenEpiO terms reused by IRI where a column means one.

## Our own ontology, made from an open source, 2026-11-09

The practitioner: *"We can build a similar taxonomy then but make it an ontology."* Built from the first multi-country
study, [Bochner et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10156425/), which is **CC BY 4.0**: read in full
in the practitioner's browser after PMC's bot check refused the fetch. Not from the Alliance's BY-NC-SA list, so the
Apache-2.0 application can carry it, attributed.

[`ontology/response-timeliness.ttl`](../../ontology/response-timeliness.ttl), validated with the rest:

- **An event and its milestones**: emergence (three definitions, by kind of event), detection, notification and each
  early response action completed, each a dated `prov:InstantaneousEvent`.
- **The seven early response actions**, as kinds of action (`prov:Plan`), numbered.
- **Four targets**, each from one milestone to another with its days: detect 7, notify 1, begin responding 1 (the
  study's own measure) and complete early response 7. An interval meets its target at equality.
- **Bottlenecks and enablers**, disjoint, each tied to an event, a stage, a level of the public health system (health
  facility or community; intermediate; national; multiple; unknown) and a category, keeping the responder's own words.
- **The study's code bank as SKOS**: 26 bottleneck categories, 30 enabler categories, 6 event groups.
- **Not made**: a mapping from a category to a JEE indicator. The study mapped items, not categories, and says so.

Standards searched for these concepts first (IDO, Apollo-SV, GenEpiO, HSO, the JEE tool): none names them, so they are
minted under `fw:`, each citing the study. Declarations only: nothing computes an interval yet; that is the "days
between two dates" extension.

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

**The data:** none found open at event level (above).

**Who infected whom, on Hagelloch, comes first** (the practitioner, 2026-11-09: *"Should we proceed first with
contact tracing in Hagelloch"*, after the DTU25MSS check). It holds who infected whom among the 188 cases, not a
contact list or follow-up, so it teaches chain analysis; contact listing and follow-up wait for MERS.

1. **Relate a column from another table**, the cases to themselves on `infector` = `case_ID`: each case gains its
   infector's prodrome date. To check first: whether a table may be related to itself.
2. **Apply ruleset**, **days between two dates**: a `date` kind for a column the rules read, and `minus` between two
   date columns giving days. Not a new rule type: an extension of the computed columns (188). The serial interval.
   Later, `plus` of a date and days, giving a date, for the end of a contact's follow-up.
3. **Total within groups** by `infector`, counted, and related back to the cases on `case_ID`: secondary cases per
   case, with the children nobody names as infector at 0 (built; below).
4. **Map, a links layer** (the practitioner, 2026-11-09, asking whether a chart draws a contact tracing network: none
   does): a point layer and a column naming another point's id, drawn as a line from each case to its source.
5. **Chart, a transmission tree over time**: each case at its onset, joined to its infector, so chains read as
   generations and each link's length is its serial interval. Ordered by time rather than a free network layout,
   which places nodes arbitrarily and is hard to read.

Each widget touched moves to the standard Inspector, with its manual page and a lab notebook (serial intervals and
secondary cases recomputed in pandas).

## What was built, 2026-11-09: steps 1 and 2

- **A table port reads a point layer as a table**: each point a row of its id and attributes, no geometry, numeric
  columns declared so. As experiment 197 did for distances. Relate's dialog offers a point layer's columns.
- **Relate, Bring it in as** (Relate 0.11.0): the brought column written under a declared name, recorded as
  `fw:broughtAs`. Without one, a column the first table already has is refused, and the message says to name it.
- **Apply ruleset, the date kind** (0.10.0): year-month-day only, and only a real day; one date minus another gives
  days, stated as the column's unit. Any other arithmetic with a date, or a date compared with a number, is refused
  while the rule is written.

**Run, in Chromium and in Node, on Hagelloch's 188 cases:** related to themselves on `infector`, 184 gain their
infector's prodrome date and 4 with no infector are kept under "no infector recorded", decided. The serial interval,
prodrome minus infector's prodrome: 184 values, median 10 days, from 7 to 16; case 1, 21 Nov against case 45's 11 Nov,
is 10. `tests/hagelloch-serial-interval.test.mjs` (5), `tests/hagelloch-who-infected-whom.browser.mjs` (1); the
Relate and rules browser tests, 23, still pass. Not yet: steps 3 to 5, the lab notebook, and WebKit.

## Step 3, built 2026-11-09: secondary cases per child, with the zeros

**Total within groups**, a count by `infector`, gives 63 groups: 62 children named as someone's infector and one
group of the 4 with none. Grouping alone loses the children who infected no one, because a child nobody names has
no row to count. So the counts are related back to the cases, `case_ID` against `infector`: 62 match, **126 do not**.

**Those 126 are a zero, not a gap**, and that is the practitioner's to declare. A child nobody names as infector
infected no one *recorded*; that is what the record says, not a blank filled in. This is not the zeroing withdrawn
from Total within groups on 2026-10-31 (*"opt to exclude them, not assign a zero value"*): there the cell was empty
and a zero would claim a measurement; here every case is present and the count of those naming it is none. Relate
already keeps unmatched rows under a category the practitioner types. **New: a category typed as a number is
written as that number**, and the brought column stays a number, so the count can be added up, charted or divided.
The dialog says *"A number is written as that number, and counted"*, and to use one only where no match means none.
A word, such as "none recorded", keeps the column a category, as before.

**Run, in Chromium and in Node:** 188 children; 126 infected no one recorded, 21 one, 16 two, 12 three, 6 four,
2 six, 3 seven, 1 eight, and case 45, **30**. The counts add up to 184, every case with an infector counted once.
Mean secondary cases 184/188 = 0.98, a figure from the record's reconstruction of who infected whom, not an
estimate of R. `tests/hagelloch-serial-interval.test.mjs` (6), `tests/hagelloch-secondary-cases.browser.mjs` (1),
by hand: the counts run first, then Relate connected in its Inspector and set in its dialog.

**Found doing it by hand:** Relate's dialog, before Relate had run, offered nothing to bring from a count. Its
fallback read the value column of the step *above* the count. Fixed: it reads the count's own, `rows`.

**Checked by somebody else's code** (lab check 43, 2026-11-09): the chain through Fieldwork's own functions against a
pandas self-merge, a difference of dates, and `value_counts` over every case with 0 for a case nobody names. All 188
cases agree on both, in CPython and in the browser kernel.

## What would close this

The practitioner choosing the first slice and its data, and its being built and run by hand on an empty canvas.

## Related

- **199, to come: porting the Gaborone TB agent-based model, one step at a time.** The relation, as the practitioner put it on 2026-11-09: *"we can also simulate 717 activities."* A model of the outbreak is what a response is timed against, and its contact structure is what contact tracing reads. Simulating a response means running each milestone in the model: detection, notification, and the seven early response actions, each with its own delay. Then the 7-1-7 targets can be tested before an event. For example: how many cases a two-day notification delay adds, or what reaching the 7-day response target would avert. The response-timeliness ontology already names those milestones and targets, so a simulated response and a real one can be recorded in the same terms.
- [117](117-data-quality.md): an absence that is an outcome.

## What this does not establish

That this map is complete or is the practitioner's: it is a draft to be corrected. That 7-1-7's taxonomy may be
shipped: its terms are not stated. That Fieldwork should run a response: tools such as WHO's Go.Data do that, and were
not read. What Fieldwork offers is the analysis, by hand and explained, for training.
