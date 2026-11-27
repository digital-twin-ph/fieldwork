# 232 · Terms looked up in a published source, and appraised

_Created 2026-11-24 · Updated 2026-11-24_

**Status:** asked. The three questions are settled (2026-11-27, below); the literature search is designed, not built.
One slice is **tried**: looking a term up in Wikidata and keeping the entity a person chose is built, unit-tested and
registered as `map_terms_to_vocabulary` 0.1.0. Interconnected with [219](219-open-science-requirements.md), where the
search's open-science requirements are recorded.

**That name was provisional; question 3 kept it (2026-11-27).** A release file is immutable, so renaming means a new
release and a migration for any saved workflow naming the old type. That is cheap today and only today — the
retirement rule in AGENTS.md holds while nobody outside this project has built on it — so the name was registered
rather than held back, and is recorded here as unsettled so the next author does not read it as decided.

## The questions

The practitioner, 2026-11-24. First: *"Can we create a WikiData data retriever widget that takes a table, enables
user to select a column and adds a column with a Wikidata link such that if we pass on a term it would look up the
WikiData link?"* Then, settling how: *"The Wikidata widget configure dialog can help filter in the right link. That
is for a human to decide."* Then, widening it:

1. *"Given we can create tables in tabular input, can we create a table of search terms and pass them through this
   widget and pass it on to search APIs? (Semantic Scholar for related citations, WikiData)"*
2. *"Can we provide the user the dialog that enables him or her to exercise critical appraisal and judgment to
   include or [exclude] what were discovered?"*
3. *"What do we call this widget?"*

## What was measured, 2026-11-24

### Rank is not judgement — twice, in two different sources

Wikidata's `wbsearchentities`, four terms from work in hand, top four each:

| Term | Top hit | Right for a Nigerian LGA table? |
| --- | --- | --- |
| **Kano** | Q182984, *city in Nigeria* | **No** — the table means Kano **State**, Q682571, **fourth** |
| Ungogo | Q3510251, *local government council in Kano State* | Yes, with a constituency and two wards of the same name below |
| Kunchi | Q6444225, *LGA in Kano State* | Yes, with a ward of the same name fourth |
| measles | Q79793, *viral disease affecting humans* | Yes, with Q573943, the **pathogen**, below |

One top hit in four is wrong; three of four carry a competing entity **of a different kind** in the top four.

OpenAlex, searching *Ebola bats mining*: **1,164 works**, of which the first is *"Mining industry must adapt to
Ebola, Indaba delegates warn"* — trade news, **0 citations, closed access** — above a review with 359 citations
under a gold open licence.

**The same finding in both sources, and it is the finding the design turns on.** A step that takes what the source
ranked first is wrong often enough to matter, and wrong invisibly.

### Which literature source can actually be used

| | Unauthenticated | With a key | Open-access status in the result | Data terms |
| --- | --- | --- | --- | --- |
| Semantic Scholar | **HTTP 429 on both attempts** | 1 request per second | `openAccessPdf`, `isOpenAccess` | per their API terms |
| **OpenAlex** | **HTTP 200, first try** | not needed | `is_oa` and `oa_status` (gold, bronze, closed) | CC0 |

**A correction to an earlier reading in this record.** The two 429s were taken as evidence that Semantic Scholar
*requires* a key. Their tutorial says otherwise, and the practitioner said so first: *"the APIs can be accessed
freely"*. The page states that **"the use of API keys is optional but recommended"**, and explains the failure in
the next breath — *"users without API keys are affected by the traffic from all other unauthenticated users, who
share a single API key"*. So an unauthenticated caller shares one quota with everybody, and a 429 is contention
rather than a closed door. An individual key gives **1 request per second across all endpoints**. No daily figure
appears on that page.

**One request a second is ample here**, because a person drives the asking: a term is looked up, its candidates are
read, a judgement is made, and the next term follows. The rate would only bind on bulk automatic search, which is
the shape this design deliberately refuses.

What survives of the earlier argument is narrower and still worth weighing. A **shipped worked example** that
searches Semantic Scholar behaves unpredictably for a reader without a key, because they fall into the shared pool;
the same example on OpenAlex does not. That is a question about what an example stands on, not about which API is
better, and the two are good at different things: Semantic Scholar for the citation graph, OpenAlex for open-access
status and for author affiliation and country — which shows whether the literature on a Nigerian question was
written by Nigerian institutions, itself a finding a trainee should see.

### What a Semantic Scholar key commits you to

The key request form, read 2026-11-24 from the practitioner's screenshot. The daily figure they gave is confirmed
there — **1000 or less per day** is a tier on the form — and four of its acknowledgements are design constraints
rather than paperwork:

| The form says | What it means for a widget |
| --- | --- |
| *"I will apply exponential backoff and similar strategies to help protect our systems from overloading"* | Backing off on a 429 is **promised on the practitioner's behalf**, so it belongs in the code and not in a manual's advice. A tight retry would break a commitment they made to get the key |
| *"keys that are seen to be inactive for approximately 60 or more days may be removed"* | A key kept in Credentials can stop working through disuse. The widget must say that in those words when the service refuses it, because the alternative is a step that looks broken |
| *"there are only 2 rate plans"* | The ceiling is not negotiable per workflow: 1 request a second with a key, or the shared unauthenticated pool |
| *"I have read and agree to Semantic Scholar™ API License Agreement"* | There is a licence agreement over the API, distinct from the bulk datasets' AI2 Terms of Use. **Neither has been read here**, and what either permits for redistribution is unestablished |

The first of these settles something the earlier reading left open: a widget that searches Semantic Scholar is not
merely rate-limited, it is **obliged to behave well when limited**. That is a run-time requirement, and it is one
more reason the asking happens one term at a time with a person in the loop rather than in a burst.

### The bulk download, measured

The practitioner, 2026-11-24: *"I can even download the whole dataset"*, and *"I wonder how big that data set is."*
Semantic Scholar's Datasets API, release 2026-11-17:

| Dataset | Records | Download |
| --- | --- | --- |
| papers | 200M | 30 files of 1.5 GB — **45 GB** |
| abstracts | 100M | 30 of 1.8 GB — **54 GB** |
| citations | 2.4B | 30 of 8.5 GB — **255 GB** |
| paper-ids | 450M | 15 GB |
| authors | 75M | 3 GB |
| s2orc, s2orc_v2 (full text) | 10M, 16M | 120 GB, 180 GB |
| embeddings (two versions) | 120M each | **840 GB each** |
| tldrs | 58M | 6 GB |

Papers with abstracts and citations is about **354 GB**; everything is roughly **2.3 TB**.

**Fieldwork cannot read this, and the reason is not size alone.** It is a browser application, and a 45 GB JSONL
file has no index to window by. A 12 GB population raster is read in a tab because a byte range covers Kano; there
is no equivalent of a byte range for "papers about bats".

What the download is good for is **deriving a small table once, elsewhere**, and bringing that in — the pattern
`census-tables` already uses for census counts: a derived file with its provenance, its digest and a review date.
That buys no rate limit, no key, exact reproducibility, and **it works offline**, which in a field setting outweighs
the rest. The cost is a machine, a pipeline, and a refresh whenever a release moves.

Its terms are **not** the API's. The release README places the datasets under AI2's Terms of Use and states that
AI2 *"does not claim ownership of any materials on this site unless specifically identified"*, which is not the
settled CC0 that OpenAlex offers. Whether a derived table may be redistributed is **unestablished** and would have
to be read before anything derived from it entered a repository.

## Question 1 — one widget, or two?

A table of search terms is easy: **Tabular data**'s Type or paste tab already makes one. What is not settled is
whether the thing it feeds is one widget or two, because the two uses differ in both shape and judgement.

| | Wikidata | OpenAlex |
| --- | --- | --- |
| A term yields | **0 or 1** entity | **0 to n** works |
| The answer is | an *identity* | *evidence* |
| The output is | the same table, plus a column | a **new** table, one row per work |
| The judgement is | **disambiguation** — pick exactly one | **screening** — include or exclude each |
| Getting it wrong means | the row names the wrong thing | the review rests on the wrong papers |

Both are `table` in and `table` out, so the port contract does not separate them. What separates them is that
**picking one of many and keeping many of many are different acts**, and the receipt each owes is different: one
owes the entity chosen and how many candidates it beat; the other owes how many works were found, screened,
included and excluded, and why — which is a PRISMA-shaped count, and is what makes a search reportable.

**Options.** (a) One widget whose output shape follows the source chosen, with precedent in `summarize_combined_area`
and `sample_raster`, which already change what they make according to what they are given. (b) Two widgets sharing
one appraisal component. (c) One lookup widget plus a separate appraisal step that any set of candidates can be
passed through.

**Not settled here.** The author's reading is (b), because the two judgements are different enough that one dialog
would have two modes and one sentence would have two meanings — but the case for (a) is real and the precedent is
in the tree.

## Question 2 — appraisal, and a proposal

Yes, and a stronger version is worth considering: **record the reason, not only the verdict.**

A dialog that collects include/exclude with a reason makes three things true at once. The receipt can state a
reportable method — *n identified, n screened, n excluded with reasons, n included* — which is what a search has to
report to be a method rather than an anecdote. The trainee has to say why, which is the whole of critical
appraisal and is the only form in which this project will carry a judgement at all. And a later reader can
disagree with a specific reason rather than with an opaque list.

The open-access status belongs **in the dialog**, beside each work, because the standing rule is that closed papers
are of little use in the settings this serves: that judgement should be made with the fact visible, not discovered
afterwards.

## Question 3 — what it is called

Not answered here; it is the practitioner's. What the convention requires is recorded so the options can be
weighed: a transform verb is followed by what it acts **on**, and a second operand is stated with a preposition —
`summarize_points_to_polygon`, `snap_to_network`.

| If the answer to question 1 is | Candidate | Reads as |
| --- | --- | --- |
| Two widgets | `map_terms_to_vocabulary` | "Link a column's terms to Wikidata" |
| | `find_literature_for_terms` | "Find literature for each term" |
| One widget | `look_up_terms_in_source` | "Look up each term in a published source" |
| | `search_sources_for_terms` | "Search published sources for each term" |

"Literature search" and "critical appraisal" are the words practitioners already use, which the writing rules
prefer to anything invented here. One release file **is** cut, under the first of these, because
the alternative was leaving built and tested code unregistered and failing every paperwork ratchet. It is immutable
and provisional at once, which is a cost this record names rather than hides: answering question 3 differently means
a new release and a migration.

## Settled, 2026-11-27

The practitioner: *"Regarding #1: Two widgets for 232. Agree with plans for #2 and #3."*

1. **Two widgets**, sharing one appraisal dialog: `map_terms_to_vocabulary` (an identity: pick one) and
   `find_literature_for_terms` (evidence: include or exclude each).
2. **Appraisal records the reason**, not only the verdict, with each work's open-access status beside it when it is
   judged.
3. **The names** are those two. `map_terms_to_vocabulary` 0.1.0 stands; no migration.

## The literature search, designed 2026-11-27

The practitioner asked for one query generator translating for both sources, and: *"We need the results to be
reproducible and the query to be part of provenance, ontology tracked"*; *"Make sure searches are also timestamped"*;
*"timestamped and user recorded as the one who did the search"*.

**One query, two translations.** The step's settings are the query: concept blocks (a term and its synonyms, OR'd),
blocks AND'd, a NOT block, and filters (years, open access, language, type). The terms table supplies the blocks, one
column for the concept and one for the term; Map to a vocabulary's names and aliases can become synonyms. Each source
gets its own string, shown verbatim before it runs:

| | OpenAlex | Semantic Scholar |
| --- | --- | --- |
| Endpoint | works `search`, or title and abstract only | the **bulk** search: the relevance search ignores operators |
| Operators | `AND`, `OR`, `NOT`, parentheses, quoted phrases | `+`, `\|`, `-`, quotes, `*`, parentheses |
| Filters | separate filter parameters | separate parameters; a filter a source lacks is said to apply to the other only |

Both syntaxes are from knowledge, **to be read against each API's current documentation before the translators are
written**. Each translation is a pure function from the query to a string, pinned by unit tests.

**Reproducible.** **Search** saves what came back with the step, by digest: each work's identifiers (DOI, OpenAlex ID,
Semantic Scholar ID), its metadata and its open-access status. A run reads the saved result and does not search
again, as Street network and Find health facilities read what was fetched. **Search again** saves a new result and
says what changed; every earlier result is kept.

**Timestamped and attributed.** Each search against each source: its start and end in UTC (ISO 8601), and the person
who ran it, from their open identity ([218](218-an-identity-you-carry.md)). Each include or exclude: its reason, its
time and who made it; a changed decision keeps its earlier one. With no identity open, the dialog asks for one before
it searches (proposed; the alternative, a search recorded as not identified and flagged, is for the practitioner).

**Provenance, in the ontology.** The query a `prov:Plan`; each search a `prov:Activity` with `prov:startedAtTime`,
`prov:endedAtTime`, `prov:wasAssociatedWith` the person and `prov:used` the plan; the saved result a `prov:Entity`
generated by it; the appraisal the person's activity, each decision at its `prov:atTime`. The method reported as
PRISMA-S counts: found per source, after duplicates (by DOI), screened, excluded by reason, included. New terms
(search strategy, search, search result, screening decision) through the admission review in
[the ontology audit](../audits/ontology-audit.md), reusing PROV-O, Dublin Core terms and the SPAR ontologies (FaBiO,
CiTO) where they fit, and versioned in `fieldwork-ontology`. Competency questions for [44](44-ontology-competency-questions.md):
*which works did this search find that the earlier one did not?*; *why was this work excluded, and by whom?*

**Checked by:** unit tests of the translators and of the counts from a saved result; a browser test answered from
recorded responses, the service worker blocked; a validation-lab check that rederives the counts from the saved
result and its decisions.

## What exists (inventory, by input and output)

| Widget | In | Out | Could it do this? |
| --- | --- | --- | --- |
| Relate a column from another table | two tables | table | brings a column across a key that already exists; nothing makes the key |
| Apply ruleset | table | table | concludes a term from a **local** declared vocabulary; resolves nothing outside |
| Find health facilities (from a list) | table | points | **the near neighbour**: resolves names against outside registers, classifies the outcome, keeps ranked candidates and records the practitioner's choice. One kind of thing, and it returns points |
| Tabular data (Type or paste) | — | table | already makes the table of search terms question 1 starts from |

**Found:** nothing resolves a local term to anything outside the workflow, and nothing carries a person's appraisal
of what a search returned.

## What this does not establish

That Wikidata or OpenAlex is right about anything. Four terms and one search are enough to rule out taking the top
hit and nowhere near enough to state a rate. Nothing is known here about what share of any country's administrative
units resolve, or about coverage of literature from low- and middle-income settings — which is the coverage that
would matter most and is the likeliest to be thin. Whether a generic client name satisfies Wikimedia's User-Agent
policy for a tool many people run is unresolved. No worked example uses any of this.

## A finding along the way

`validate:ontology` **passed** a class declared `rdfs:subClassOf fw:SemanticOperation` when no such class exists.
An undeclared superclass slips through both the SHACL check and the coupling ratchet. The term was removed rather
than invented into existence; the hole is still open and nothing currently catches it.
