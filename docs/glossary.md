# Fieldwork's glossary of terms

_Created 2026-10-09 · Updated 2026-10-09_

## Start here

A map can be wrong in ways that look completely right. A projected sea level rendered as
a surface looks like a flood map. A count of 250 rows looks like 250 deaths when the rows
hold 489. A rate looks sound when its population came from a different year than its
cases. Nothing crashes, nothing is flagged, and somebody makes a decision.

Fieldwork exists to make that harder. Every step in a workflow states what it means, what
it needs, and what it must not be read as — and the vocabulary below is how those
statements stay precise. **The words are not overhead. They are the thing the project is
made of.** Learning a few of them is how you get to work on something that is genuinely
hard and now, with capable tools to hand, genuinely reachable.

**You do not need all of this.** Sixty terms are defined here. Four will get you started,
about twenty matter if you add a widget or connect two, and the rest exist for the people
designing new operations and reviewing them. The sections are ordered by what you are here to
do, and each says what it unlocks. Skip to yours.

The fastest way in is not reading. Open the Old Naledi worked example, run it, and open
one receipt. You will have met a **workflow**, a **node**, a **run** and a **receipt**
without looking anything up, and the rest of this page will read like labels for things
you have already seen.

### How to read an entry

Where a term is commonly misread, the entry says what it does **not** mean — those are
usually the entries worth reading twice. Each entry links the record where the idea was
worked out, so you can follow the argument rather than take it on trust. But you should
never *need* the link to understand the entry. If you do, the entry is badly written;
please say so, and it will be fixed.

### Where a public health term already exists, we use it

The enforcement levels below are **hard stop**, **validation rule**, **run-time check**
and **limitation** — the words health informatics and data management already use, not
invented ones. A **limitation** here means what it means in a paper's Limitations section.
A **validation rule** means what it means in DHIS2 or REDCap. Qualifiers like period,
denominator and reference year are **metadata**, as they are everywhere else.

Three words are used here in a sense that differs from their public health meaning, which
is worth knowing before you trip over one:

| Word | Here | In public health |
| --- | --- | --- |
| **Parity** | Agreement between this project's computation and an independent external one ([57](experiments/57-parity-evidence.md), [kinds of validation](audits/validation.md)) | Number of births a woman has had. "Concordance" would have been the better choice |
| **Usage** | Whether a worked example exercises a widget — `npm run usage:widgets` | Not a collision, but note **coverage** is deliberately avoided for this, since coverage means the proportion of a target population reached |
| **Receipt** | The per-step record of what ran and what it used | Closest familiar equivalent is an **audit trail** |

Two neighbouring glossaries are not repeated here. The vocabulary of ontology engineering
(IRI, triple, SHACL, OWL) and the standard vocabularies reused rather than reinvented
(GeoSPARQL, PROV-O, QUDT) are in [the audit procedure](audits/ontology-audit.md). The domain
terms that must not be confused with each other — study area against clipping boundary,
catchment against isochrone — are in that document's own table.

## The first four

If you read nothing else, read these. Everything else is built on them.

| Term | Meaning |
| --- | --- |
| **Widget** | One kind of operation, with a fixed identity, a version, declared inputs and outputs, and a written contract. The palette you drag from is a list of widgets; there are 39. **Not** a user-interface component |
| **Node** | One widget placed in one workflow, with its own settings. Place the same widget twice and you have two nodes |
| **Worked example** | A complete workflow with real data, expected results, and at least one thing it refuses to do — used both to teach and as a test that catches breakage. Old Naledi and John Snow are the two to start with |
| **Experiment record** | A numbered, dated entry in `docs/experiments/` recording what was designed, what was tried, what that revealed, and what remains unknown. There are 62. They are the project's memory, and most questions you have are answered in one |

## Evidence and records

_For reading the project's records. Start here if you are catching up on why something is the way it is._
| Term | Meaning |
| --- | --- |
| **Worked example** | A teaching artifact and a regression fixture at once, carrying a workflow, bundled data with provenance and digests, expected results at stated settings, the evidence structure a run should produce, at least one composition it declines, and its own limits. The **only** artifact that demonstrates composition rather than declaring it ([43](experiments/43-widget-packs.md)) |
| **Receipt** | The per-node record of what a step used, did and produced, as inspectable facts. One per executed node |
| **Experiment record** | A numbered, dated entry in `docs/experiments/`, written before the code where possible so decisions are reviewable separately from the diff. The instrument of the evaluation, not a byproduct |
| **Supersession note** | A dated block added when a later finding overturns an earlier analysis. The original analysis stands: rewriting it would destroy the evidence of how the framework moved. Navigation — status lines, counts, cross-references — must still be true of today |
| **Parity** | Agreement with an independent external implementation of the same computation. Unavailable where no external implementation exists, in which case unit checks are the honest evidence and no parity claim is made ([57](experiments/57-parity-evidence.md)) |
| **Competency question** | A question the vocabulary must be able to answer, or must refuse, recorded in [experiment 44](experiments/44-ontology-competency-questions.md). The questions it must *refuse* matter as much as the ones it can answer — a term that appeared to answer one would be a bug |
| **Not established** | The explicit closing statement of what a record's evidence does not support. Required, and distinct from a finding |

## The three things that get counted

_For reading or writing about the project precisely. These three get counted separately, and mixing them produces numbers nobody can compare._
Conflating these produces numbers that cannot be compared. Keep them distinct in prose
as well as in code.

| Term | Meaning |
| --- | --- |
| **Widget** | The versioned contract: a stable `urn:fieldwork:widget:<nodeType>` identity, an independent semantic version, declared ports, an ontology mapping and a release file. The registry lists 39. **Not** a user-interface component, and not an instance of anything |
| **Node** | One instance of a widget in one workflow, carrying its own configuration. Two nodes of the same widget are two nodes |
| **Workflow step** | One execution of one node, binding a plan to its output and receipt. **Not** interchangeable with a node: a shared upstream node executes once however many branches consume it |

So **coverage** (does any example actually use this widget?) and **firing** (how
many steps ran?) are different measurements. `npm run usage:widgets` reports the first;
the second is derivable from a run's receipts, which already carry one per executed node.

## What a widget knows, and how strongly that is enforced

_For adding or reviewing a widget. This is the project's central idea, and the most useful dozen minutes on this page._
A Fieldwork widget carries knowledge like *a projected sea level is not a flood map*, or
*a table has no geometry*. Writing that down is one thing. Stopping someone from doing it
anyway is another. These terms keep the two apart, because in a design document they look
identical — and this project has more than once believed it had built the second when it
had only written the first ([62](experiments/62-workflow-traversal.md)).

| Term | In plain words |
| --- | --- |
| **Distinction** | One piece of hard-won knowledge, written in the form *X is not Y*. *Detection is not infection.* *A count per week is not a rate.* Working these out takes real expertise — sometimes days of reading — and they are the most valuable thing a widget carries ([59](experiments/59-pattern-for-engineered-knowledge.md)) |
| **Enforcement level** | What the software actually *does* about a distinction. There are five levels, listed below from strongest to weakest. Every distinction has to say which one it uses. Health informatics uses **hard stop** and **soft stop** the same way |

The five, strongest first. The practical question is: **what would someone have to do to get
the wrong answer anyway?**

| Term | What it does | Example |
| --- | --- | --- |
| **Hard stop** | The wrong thing cannot be built at all. The canvas will not draw the connection and the workflow will not validate | You cannot connect a sea-level result to a map that paints surfaces, so no one can produce something that looks like a flood map |
| **Validation rule** | You can wire it up, but it will not run until the missing thing is supplied | A layer whose rows are case *counts* will not run through a widget that counts rows, until you name the column holding the count |
| **Run-time check** | The run starts, then stops with a message when it meets the bad input | An import stops when two rows share the same key. Weaker than the two above, because it only fires if that input actually arrives |
| **Limitation** | It tells you. Nothing stops you | "This accounts for no drainage, defences or waves." True, necessary, and it prevents nothing — someone can read it and carry on |
| **Out of scope** | The capability could have been built and was deliberately not, with the reason on the record | Boundary data could easily be bundled from GADM, and is not: its licence forbids redistribution, and a pack publishes its data. geoBoundaries is used instead. Practitioners may still use GADM on their own machine ([47](experiments/47-sea-level-pack.md)) |

Out of scope only counts when the thing was **possible**. If nobody could have chosen
otherwise, nobody chose, and calling it an exclusion makes the category meaningless.
Record that as a capability limit instead. The test is whether a reasonable project
could have decided the other way: bundling GADM, adopting a CSVW mapping, or adding a
chart mode for keyed tables were all available and all declined for stated reasons
([48](experiments/48-tabular-input.md)).

**This paragraph used to illustrate the rule with "we cannot read 38 GB of data in a
browser", and that example was wrong** — corrected 2026-10-10, and worth keeping as a
warning rather than quietly deleting. It confused the size of a store with the bytes a
reader transfers. Chunked formats hand over what you ask for: a study area took 55,649
rows of 81,455,423 from 11 GB of Overture GeoParquet, and one AR6 summary file is 71.7
MB inside a 9.24 GB archive on a host that sends `access-control-allow-origin: *` and
honours Range. So the sea-level pack's "impossible in a browser" was a decision wearing
an impossibility's clothes, and the rule this paragraph states is exactly what should
have caught it ([71](experiments/71-health-facility-sources.md)).

A capability limit is a real category — a browser genuinely cannot read a response from
a host that sends no cross-origin header, however small it is. The difference is that
one is a property of the environment and the other is a judgement someone made. Before
writing either, measure.

The first two cannot be worked around without changing the code. The third depends on the
data reaching that step. **The last two depend entirely on the reader.** So a distinction
described as enforced, but actually only written down, is the characteristic mistake here —
and it is easy to make, because discovering a distinction is expensive while writing a
sentence about it is free.

A note on the word **refusal**. These documents used it for all six terms above, which hid
the difference, so it is no longer used as a category. It survives as an ordinary verb:
*the importer refuses a duplicate key* describes something you can test.

## Kinds of widget

_For adding a widget — it decides whether yours belongs on the palette._
Two questions decide what a candidate widget is, and both have to be asked. **First:** if
you broke it into the widgets that already exist, would anything be left over — some piece
of knowledge the parts do not have between them? **Second:** would a practitioner ask for
this operation by name? The answers decide *where it lives*, not whether it is allowed to
exist ([the audit](audits/ontology-audit.md), D1).

| Term | Meaning |
| --- | --- |
| **Primitive** | Something is left over when you break it up — knowledge of its own — and that knowledge is enforced, not merely mentioned. Practitioners ask for it by name. It goes on the palette |
| **Internal primitive** | The same, except nobody asks for it by name. Joining two tables on a shared column is the example: genuinely reusable, worth building once, and not something to put on the palette |
| **Composite** | Nothing left over when you break it up, but practitioners do ask for it by name. It keeps its place on the palette and is built out of shared parts underneath, instead of its own private copy of them. Splitting it up *inside the code* is good housekeeping; splitting it up *on the canvas* would be a worse tool, because someone asking "how many cases per barangay" should place one node, not three |
| **Example node** | Neither of the above: it bakes in the specifics of one demonstration, like a particular facility list or a particular evidence hierarchy. It belongs in a worked example, not on the palette. Several are on the palette today, which makes them look like general tools ([60](experiments/60-from-gis-studio-to-public-health-studio.md)) |

**Standard** and **domain** are a separate axis, derived from a widget's vocabulary
namespace: standard means *ships with the application*, domain means *belongs to a pack*.
Standard does **not** mean "applies to any domain", and reading it that way makes the
universal layer look complete when two of its three axes are missing.

## Widget interoperability

_For connecting widgets: the section to read before you wonder why a connection was refused,
or why one that worked gave a strange answer. These are the three levels health informatics
already uses, in their usual sense._

Two widgets interoperate when one's output can be used by the other. That turns out to be
three questions, not one, and they fail independently.

| Level | The question it asks | What carries it | Passes here and is still wrong |
| --- | --- | --- | --- |
| **Syntactic** | Can this data be carried and read at all? | The **carrier kind** | A keyed table flattened into points: it parses, and the key is gone |
| **Semantic** | Does the same field mean the same thing on both sides? | **Roles**, each with a type, a unit and a value set | A column of counts where each row stands for several cases — 250 rows holding 489 deaths |
| **Pragmatic** | Is this data fit for the **use** the other widget will make of it? | **Fitness conditions**, read from declared provenance | Two lengths in metres, measured from different references, compared to each other |

**Almost every distinction in this project is a pragmatic failure.** The data parses, the terms
mean what they say, and it is still the wrong input for the job. That is why checking a type
name — which is all a connection checks today — catches so little, and why so much is checked
by hand inside each widget instead.

### The parts a connection is made of

| Term | Meaning |
| --- | --- |
| **Carrier kind** | How data travels: features with geometry, a keyed table, a raster grid, a graph. A real distinction, not a label — a table has no geometry, so turning one into points is a loss rather than a conversion |
| **Role** | What a widget needs, described by meaning rather than by column name: *a numeric distance in a length unit*, *an evidence level from this list*. A widget cannot know what your columns are called, so it asks for roles |
| **Binding** | Which of your fields plays which role. Chosen by you from what the connected data offers, never guessed, and recorded in the receipt so a later reader knows which column meant what |
| **Fitness condition** | What a widget requires to be *true of the provenance* before it will run: an elevation whose reference can be related to the projection's baseline; a denominator whose period covers the numerator's. Checked against declarations, not against the numbers |
| **Port contract** | The whole of the above for one port — carrier kind, roles and conditions — declared rather than implied, so it can be read, tested and queried |

### Why the answer is definite, and the one thing it cannot settle

A widget's input is always another widget's output, and every widget is **governed**: admitted
to the registry with a declared contract. So the facts a fitness condition needs are there
because the producer was obliged to supply them, and the answer is definite — satisfied, or
refused naming the node responsible.

Where something was never stated at the point data entered, that gap travels with the data as a
*known* unknown. A widget that needs it does not shrug; it refuses and says **where it was
lost**. So the verdict is always definite, even when the data is incomplete.

What no condition can settle is whether a declaration is **true**. A widget that says metres and
faithfully carries millimetres satisfies every check in the system. That is a claim about the
world rather than about the workflow, and only comparison against an independent
implementation reaches it — which today covers four widgets of thirty-nine
([66](experiments/66-ports-as-schema-binding.md),
[kinds of validation](audits/validation.md)).

## Qualifiers

_For adding a widget that takes data in. The single most repeated lesson in the project._
The finding this project has made most often: a number means nothing on its own. It needs
something alongside it — what period it covers, which population it divides by, what one row
stands for. Each time, the fix has been the same shape: ask for it **on the input**, from a
fixed list of choices, leave it blank by default, and have everything downstream either use
it or refuse to run.

A free-text box that is only checked for being non-empty does not do this. It looks like a
validation rule and behaves like a limitation, because any wrong answer typed into it passes.

| Term | Meaning | Established by |
| --- | --- | --- |
| **Key / key tuple** | The declared columns identifying one row of a data table, in long format. Must be unique; a duplicate tuple is rejected | [48](experiments/48-tabular-input.md) |
| **Unit status** | Whether an author stated a unit. Never inferred, and absence is recorded rather than assumed dimensionless | [48](experiments/48-tabular-input.md) |
| **Vintage** | The edition and date of a denominator or boundary frame. A rate refuses when denominator year, frame vintage and numerator period disagree | [51](experiments/51-dataset-profiles.md) |
| **Row meaning** | What one row stands for — `one-case`, `count-of-cases`, `not-cases` — with a case weight where aggregated. A count means nothing without it. And it only goes one way: once rows are totals, you cannot get back to individual cases | [61](experiments/61-input-dimensions.md) |
| **Event date kind** | Which date a date column is: onset, report, death, specimen collection. Report dates lag onset, so the same outbreak peaks later and looks flatter | [61](experiments/61-input-dimensions.md) |
| **Baseline period** | The period a change is measured against. A projection of 442 mm means 442 mm higher than that period — not 442 mm of water | [47](experiments/47-sea-level-pack.md) |
| **Dataset family** | Which published family a value came from — for sea level, whether vertical land motion is included. Values from different families are not comparable | [47](experiments/47-sea-level-pack.md) |
| **Vertical reference** | *Proposed.* The datum an elevation is on, and whether it is a sea-surface baseline or a geodetic datum. Currently free text, which is why a comparison can be invalid while every check passes | [62](experiments/62-workflow-traversal.md) |

## Workflow stages

_A workflow has three stages: **input**, **process**, **output**. Everything below
decomposes one of them. If a stage does not map to one of the three, it is not a
stage._

### Input — getting the data

| Stage | What it produces |
| --- | --- |
| **Discovery** | Learning enough about data to decide whether to fetch it — where it is, what it covers, how big it is, its format and licence — without transferring it. If it cannot fail, it is a guess at an address rather than a discovery |
| **Acquisition** | Bytes with a digest and byte identity |
| **Extraction** | Taking the part of a larger dataset a workflow needs, and recording which part it was |
| **Import** | The artifact inside a project, with provenance. **An import is not an acquisition**: an acquisition replays from its request, an import can only be trusted if it records where it came from |

The study area is an input, not a stage of its own: it is a source node with an
output port, and it carries the scope of the question.

### Process — working with the data

| Stage | What it produces | Example |
| --- | --- | --- |
| **Review** | What does not belong, and why. Exclusions carry a reason | `coverage_check` |
| **Derivation** | The same claim in a new shape — buffered, clipped, reprojected, sampled, joined | `buffer_point`, `sample_raster`, `slr_site_assignment` |
| **Summary** | Fewer rows than it started with. The detail is gone and does not come back | `rate`, `case_series`, `hex_aggregate` |
| **Classification** | Sorting records by a criterion the practitioner stated — a threshold, a rule, a case definition. The result records which criterion was applied | `slr_threshold_comparison` |

**Fieldwork does not judge.** It classifies against criteria someone else
stated, and surfaces what does not fit. Whether the threshold is the right
threshold, and what to do about the answer, stays with the practitioner. A
comparison against an unstated vertical datum is refused for this reason: the
software cannot supply the judgement the comparison needs.

These four are not a grouping imposed afterwards. The application already types
them apart: review produces `coverage-check`, classification produces
`decisions`, derivation and summary produce data ports.

### Output — communicating the result

| Stage | What it produces | Status |
| --- | --- | --- |
| **View** | One map, chart or table of a result. A view presents a result and must not create one | Built |
| **Composition** | Several views and text as one product: a field report, story map, infographic or dashboard | **Designed, not built** ([17](experiments/17-workflow-publication-products.md), [36](experiments/36-communication-layer.md)). Output nodes are terminal today, so composition needs an output contract that is not |

Output ends at the export. **Releasing — publishing, sharing, redistributing — is
outside Fieldwork**, and the application should not claim a stage it does not
perform. What is Fieldwork's responsibility is that the export carries what the
next person needs: provenance, the licence and its obligations, and a snapshot a
later run cannot silently change.

### The six pack stages are an input taxonomy

A pack declares, per stage, whether it supplies it, assumes it or rules it out
([43](experiments/43-widget-packs.md), [47](experiments/47-sea-level-pack.md)).
Its six are discovery, acquisition, extraction, import, application and
presentation — **four of them input**, because a pack supplies data and
vocabulary and little else. That taxonomy is correct for packs and was reused as
the workflow vocabulary, which is why process and output stayed undecomposed for
so long.

**Application** is not a workflow stage. In the pack contract it is a claim about
whose science a result rests on: *a consumer is not a model — a widget applying
published results must not imply it produced them.* That is a property of a
widget, not a step in a workflow.

## Packaging

_For sharing work between projects, or reviewing something shared with you._
| Term | Meaning |
| --- | --- |
| **Widget pack** | A separately maintained, versioned unit of vocabulary, shapes, rules, worked examples and widget contracts, distributed as a repository and pinned by digest ([43](experiments/43-widget-packs.md)) |
| **Semantic pack / declaration-only** | A pack containing no runnable code — only vocabulary, rules, examples and contracts, all of it data the application already knows how to read. Nothing new can execute, which is what makes it safe to accept. The flip side: **it cannot add new capability**, only new meaning and new worked practice. New capability has to be built in the application ([62](experiments/62-workflow-traversal.md)) |
| **Code pack** | A pack shipping executable operations. A separate decision with its own threat model, not to be smuggled in behind the first |
| **Pack catalog** | `widgets/packs.json`, the trust root. Digest pinning is only as strong as review of the file holding the digests |
| **Admission** | Whether a pack version is accepted into the catalog, at a full commit SHA, from a curated owner, with a complete review record. Recorded in the host, never in the pack |
| **Specification** | What a pack that cannot ship code actually is. Specifications are implemented by the thing that can execute them ([59](experiments/59-pattern-for-engineered-knowledge.md)) |

## Method

_For understanding how the project works, and why it is organised around experiments rather than a plan._
| Term | Meaning |
| --- | --- |
| **Developmental evaluation** | The stance of the whole project: the framework is watched as it emerges rather than built to a specification. Finding that a design was wrong counts as a result, not a failure. So do dead ends, and capabilities deliberately left unbuilt — all of it gets written down ([AGENTS.md](../AGENTS.md)) |
| **Semantic admission review** | The review a primitive passes before it is built: term and limits, roles, reuse comparison, typed ports, units, provenance, missing-data policy and validation evidence ([the audit](audits/ontology-audit.md)) |
| **Primitive design audit** | Checks D1–D10, run before a primitive is built and again before its release file is written. A check that cannot be answered is a failure, not a deferral |
| **Thin domain layer** | The target shape for domain-specific work. A thick one means a primitive is missing underneath; a thin one may still sit over a gap, since pushing a step outside the application makes the layer look thin either way ([59](experiments/59-pattern-for-engineered-knowledge.md), [62](experiments/62-workflow-traversal.md)) |

## Not yet defined, and open to you

Named so the gaps are visible rather than discovered one reader at a time. If you are
looking for somewhere to start contributing, any of these is a real contribution — and
writing a definition usually means reading the records and asking whether the thing is
clearly enough understood to define.

- The canvas and port vocabulary in full: port direction, dynamic port limits, and why
  the list of port types is closed and compiled into the application.
- Encrypted project packages and credential files.
- The communication layer and its products — reports, story maps, dashboards.
- Degrees of reproducibility ([54](experiments/54-degrees-of-reproducibility.md)) and
  dataset profiles ([51](experiments/51-dataset-profiles.md)).
- The person-axis and laboratory terms that
  [experiment 60](experiments/60-from-gis-studio-to-public-health-studio.md) lists as
  needed but unbuilt: case definition, denominator population, linkage, reporting
  completeness, result with method and limit of detection, quality-control status.

That last group is deliberately undefined. Experiment 59 found that building a mechanism
before the operation it serves created more problems than it solved, and the same holds
for naming something before anyone needs it. These become entries when the work needs
them — not before.
