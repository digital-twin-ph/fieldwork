# Fieldwork's glossary of terms

_Created 2026-10-10 · Updated 2026-10-17_

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

## The first six

If you read nothing else, read these. Everything else is built on them.

_Was "the first four" until 2026-10-19. **Workflow** and **Project** were added because neither
had ever been defined here: the application said "project" in its title bar, meaning the current
workflow's name, and had no project entity at all until
[122](experiments/122-a-project-holds-many-workflows.md). Four of the eleven worked examples were
one investigation the model could not say was one._

| Term | Meaning |
| --- | --- |
| **Widget** | One kind of operation, with a fixed identity, a version, declared inputs and outputs, and a written contract. The palette you drag from is a list of widgets; there are 39. **Not** a user-interface component |
| **Node** | One widget placed in one workflow, with its own settings. Place the same widget twice and you have two nodes |
| **Workflow** | One question, asked as a graph: nodes, the connections between them, and one selected output. A workflow has its own canvas and its own name. Nothing forbids drawing several disconnected graphs on one canvas — the rulesets example is four — but that is a drawing, not four workflows: they share one selected output, and the cost of the clutter lands when you try to communicate the answer |
| **Project** | One investigation: a subject, and a workflow for each question asked about it. The 1854 cholera outbreak in London is one project holding four workflows — catchments, network reach, extent, and what the source coordinates disclose. A workflow may belong to no project, and can be moved into one later. **Not** a word for the application, and **not** a synonym for workflow: it was both until 2026-10-19, when it became an entity ([122](experiments/122-a-project-holds-many-workflows.md)) |
| **Worked example** | A complete workflow with real data, expected results, and at least one thing it refuses to do — used both to teach and as a test that catches breakage. Old Naledi and John Snow are the two to start with |
| **Experiment record** | A numbered, dated entry in `docs/experiments/` recording what was designed, what was tried, what that revealed, and what remains unknown. There are 62. They are the project's memory, and most questions you have are answered in one |

### The state a workflow or a project is in

_Added 2026-10-23. The practitioner, after a day in which they could not find their own backup
and could not tell which results were current: "Our UI has become confusing to navigate... how
should the UI represent project and workflow lifecycles." The application already said four of
these things in four different places and defined none of them. A word the interface uses and the
glossary does not is how terminology drifts._

A workflow is in exactly one **state**, and moves between them: a draft that is run becomes run,
a run one whose canvas is edited becomes stale, running it again makes it run or refused. The
state answers "can I trust what is on screen".

Its **size** is not one of these. It is an attribute — true of the workflow whatever state it is
in, changed only by acquiring or dropping data, and answering a different question: "what will
this cost me to open, keep, or send". The two are shown differently for that reason: a state is
one word that is either true or not, a size is a number.

| Term | Meaning |
| --- | --- |
| **Draft** | A workflow with widgets on its canvas that has never been run. It has no results, and nothing about it is stale |
| **Run** | The run finished and its results match the canvas they came from. The application has said `Run complete` since before these words existed |
| **Stale** | The canvas changed after the run, so the results on screen answer an older question. Said today as `Changed · rerun to update` |
| **Refused** | The last run stopped and said why. A refusal is a result: it names what was missing or too large, and it is not an error to be cleared |
| **Size** _(attribute, not a state)_ | How much of the data store a workflow accounts for — a downloaded street network, a raster window — as against the workflow itself, which is small. It is why a workflow is slow to open, expensive to delete, and sometimes too large to package. Said in megabytes, beside the workflow, in the words the header already uses: `Storage 2.4 / 5.2 MB · data 73.2 MB` |

A project is **backed up** or it is **not backed up**, and the significance is loss: a project
that has never been exported exists only in this browser's storage, and if that storage is
cleared, corrupted, or the browser refuses to open the application, the work is gone. Everything
else about a project's history is detail beside that.

| Term | Meaning |
| --- | --- |
| **Backed up** | An export of this project was performed, at a time this application recorded. Said with that time, because an export taken before the last change does not hold the work done since |
| **Not backed up** | No export of this project was ever performed here. If this browser loses its data, this work is lost |

**What this cannot know.** A browser hands a file to the download machinery and loses sight of
it: it cannot read the filesystem, cannot tell whether the file was kept, moved to another
machine, or deleted an hour later, and cannot age it. What it can age is the PROCESS -- when an
export was last performed. So "backed up" is a claim about something this application did, not
about something that still exists, and the interface should say it that way: an export was taken
three days ago, not a backup is safe.

The state is DERIVED rather than recorded, from when the project last changed and when an export
was last performed. Neither moment was kept before 2026-10-23, so every project carried over from
before then is not backed up -- which is not a guess but the honest reading: an export nobody
recorded is an export nobody can produce.

### Where you work, and where you look at what you have

_Added 2026-10-23, because the word was about to mean a fourth thing. Experiment 131 proposed
calling the project-level view the **Workspace**, nine times, and the application already used
that word for a storage slot, for a single saved workflow, and for itself. The practitioner
stopped the build to ask: "What is workspace definition in FW?" There was none, which is the
whole answer -- a word used in three senses and defined in none is not a word, and the view was
one commit from making it four. Named **Project view** instead, because a new view is cheap to
name and `workspace store` is already in storage labels, usage.md and test names a practitioner
has read._

| Term | Meaning |
| --- | --- |
| **Canvas** | One workflow, open: build it, run it, read its results. Where analysis happens |
| **Project view** | One project and the workflows filed under it: what each holds, what is backed up, what may be deleted and what that frees. Where setting up and reviewing happen. A route, not a dialog — a capability behind a door nobody can see is the failure this view exists to end |
| **Workspace store** | The browser storage that holds saved workflows and their settings. A store, not a place a practitioner works: it is what fills up, what refuses a save, and what the storage readout in the header is counting |

**Workspace on its own is not a term here.** It appears in `NAMED_WORKSPACES`, in "your saved
workspaces are untouched" meaning workflows, and in the header's "Research workspace" meaning the
application. Those are not corrected by this entry, because they are already in front of
practitioners; what this entry does is stop the word being given a fourth sense in a view built
after the rule against exactly that was written down. Where it means the store, it is written
**workspace store**.

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
| **Out of scope** | The capability could have been built and was deliberately not, with the reason on the record | Boundary data could easily be bundled from GADM, and is not: its licence forbids redistribution, and a pack publishes its data. geoBoundaries is named as the redistributable alternative, and nothing in `src/` consumes it yet: there is no polygon ingestion path for it to use ([14](experiments/14-gadm-jurisdiction-assets.md) is unimplemented). Its licence is also **per boundary, not per source** — six distinct licences across eleven country-levels, three of them share-alike ODbL ([probe](research/geoboundaries-probe-2026-10-17.md)). Practitioners may still use GADM on their own machine ([47](experiments/47-sea-level-pack.md)) |

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

In their general form, outside this project:

- **Syntactic interoperability — format.** Systems use a compatible structure, grammar or
  vocabulary to package and transmit data: XML, JSON, CSV.
- **Semantic interoperability — meaning.** Systems understand the same real-world meaning for
  the same element: that a field named `temp_c` is a temperature in Celsius.
- **Pragmatic interoperability — intent and effect.** Systems align on *why* the data was sent
  and what should happen as a result: a sensor reporting a high temperature triggers a shutdown
  rather than being logged as a number.

The third is the one most often skipped, and it is the one that makes a system act. It is also
where this project's proposed **progressive reveal** lives: a canvas that offers the next widget
because of what its facts MEAN is a system acting on intent, not matching a format.

Here:

| Level | The question it asks | What carries it | Passes here and is still wrong |
| --- | --- | --- | --- |
| **Syntactic** | Can this data be carried and read at all? | The **port type** | A keyed table flattened into points: it parses, and the key is gone |
| **Semantic** | Does the same field mean the same thing on both sides? | **Roles**, each with a type, a unit and a value set | A column of counts where each row stands for several cases — 250 rows holding 489 deaths |
| **Pragmatic** | Is this data fit for the **use** the other widget will make of it? | **Fitness conditions**, read from declared provenance | Two lengths in metres, measured from different references, compared to each other |

**Almost every distinction in this project is a pragmatic failure.** The data parses, the terms
mean what they say, and it is still the wrong input for the job. That is why checking a type
name — which is all a connection checks today — catches so little, and why so much is checked
by hand inside each widget instead.

### The parts a connection is made of

| Term | Meaning |
| --- | --- |
| ~~**Carrier**~~ | **Withdrawn 2026-10-12.** It was asked for, defined as "a `prov:Entity` that travels between ports", then withdrawn when no standard could be shown that defines such a class — PROV-O, DCAT, DCMI Terms, GeoSPARQL, OGC Simple Features and ISO 19107 name none. The definition reached was derivable rather than new: an Entity `prov:wasGeneratedBy` one node's activity and `prov:used` by another's already *is* that, and the graph says so. Nothing consumed the class. **Say what you mean instead**: `prov:Entity` for the value, **port type** for what a connection is checked against, and the value's own structural class — `geo:FeatureCollection`, `fw:PointDataset`, `fw:DataTable` — for how it travels |
| ~~**Carrier kind**~~ | **Withdrawn with it.** A kind of a term that does not exist is a kind of nothing, and the five categories it named were a second taxonomy laid over classes the values already assert — `geo:FeatureCollection`, `fw:PointDataset`, `fw:DataTable`. Use those |
| **Port type** | The declared name of what one port carries, and the thing a connection is actually checked against: `validateWorkflow` compares these as strings, so two ports connect when their port types match exactly. There are **13** in the live set across those five kinds — and **nine of the thirteen are the same kind**, "features with geometry". That gap is why saying "carrier" alone misleads: at the granularity that matters, the kind barely distinguishes anything |
| **Producer-named port type** | A port type named after the widget that emits it rather than after what it carries — what [D4a](../audits/ontology-audit.md) calls a **custom stud**. `gradedFacilities` was one: emitted by one widget, consumed by two, and retired on 2026-10-12 when the grading moved into a general point layer's attributes. It is a failure of the same kind D7 names for port *names*, one level up |
| **Thick port type** | One whose value carries fields beyond what its name implies, which consumers then quietly depend on. `access` was thick: besides its rows it carried a boundary, the filter's settings and counts, where the subjects came from, and the study area's provenance. **Four of those surfaced only when it was decomposed**, each as a failing assertion rather than a design note — which is the argument for frozen tests in one line. A thin port type carries what it says and no more, and makes its consumers ask the nodes that know |
| **Role** | What a widget needs, described by meaning rather than by column name: *a numeric distance in a length unit*, *an evidence level from this list*. A widget cannot know what your columns are called, so it asks for roles |
| **Binding** | Which of your fields plays which role. Chosen by you from what the connected data offers, never guessed, and recorded in the receipt so a later reader knows which column meant what |
| **Fitness condition** | What a widget requires to be *true of the provenance* before it will run: an elevation whose reference can be related to the projection's baseline; a denominator whose period covers the numerator's. Checked against declarations, not against the numbers |
| **Port contract** | The whole of the above for one port — the value's structural class, roles and conditions — declared rather than implied, so it can be read, tested and queried. *Corrected 2026-10-14: this read "carrier kind, roles and conditions", naming a term withdrawn two rows above on 2026-10-12. The structural class is what replaced it — `geo:FeatureCollection`, `fw:PointDataset`, `fw:DataTable` — as that row says.* |
| **Pin** | A reference a node holds in its own parameters to a versioned artefact defined outside it. **Unique in three senses, and it is only one of them.** *As a lookup key in a build:* yes — `rulesetKey(id, version)` indexes one document, and `resolveRuleset` returns it or throws naming the versions this build does carry. *As a content identity:* only where the pin carries a digest. A **composition member pin** is `{node, type, version, sha256}` and `validateComposition` refuses a digest that is not that release's. A node's **ruleset pin** is `{id, version, title, inputs, output}` with no digest, and nothing checks one, so two builds can resolve `extent-review@1.1.0` to different text and neither will notice. *As an identity for the node:* no — two nodes may hold the identical pin, which `validateWorkflow` accepts, and node ids are separate from it. **What the middle one costs:** `rulesetCitation` records id, version, title and basis, so a run receipt names the rules it applied and cannot prove their content. |
| **Supersession** | A newer version of a pinned artefact exists in this build. Reported, never applied: a pinned version keeps running because a rule change changes results, and a saved workflow replays the rules it was built on. `supersession(id, version)` returns the newest version together with the declared changes of every version *between* the pin and it, so a pin two versions behind is told about both, and `incompatible` when any of them moved a port. Surfaced from 2026-10-15 in the Inspector and at the run; before that the fact was computable and computed by nothing. Distinct from **drift**, which is a composition member whose pinned digest no longer matches what the registry publishes ([77](experiments/77-composition-drift-detection.md)) — supersession says a newer version exists, drift says the pinned one changed underneath. Not available for an ordinary widget node, and not meaningful there: a widget version labels code, one build compiles one version of each widget, and a node could only pin what the workflow was authored against rather than what can run it. A ruleset version labels data, every published version ships in the same build, and a node selects one at run time — which is why supersession is a ruleset mechanism. |
| **DE moment** | A point at which the evidence says the direction should change. Named by the practitioner on 2026-10-15, for the map-output discussion that settled a model on 2026-10-14 and changed no code: *"a moment when things should head in a different direction, and it did not."* The failure is not disagreement but **recording instead of building** — the new model goes into a widget page, a glossary entry or an ontology term, the code keeps the old one, and the record now says the matter is settled while the running application contradicts it. A widget page is not a work item and no ratchet reads prose, so nothing catches it. [docs/directions.json](directions.json) is the register: what each settled direction requires IN CODE, which work item carries it, and a dated check inside a seven-day window, enforced by `validate:directions`. Distinct from a **blocker**, which says something cannot be done yet: a blocker rots by being lifted and not noticed, a direction rots by being agreed and not built. |
| **Applies a declared artefact** | What two widgets do, and what makes them different in kind from the rest. `apply_ruleset` runs a **configured ruleset** over its input; `micro_workflow` runs a **configured composition**. The contract is the *application* — take the artefact this node pins, check the input against what that artefact declares it expects, run it, return what it declares it produces — and that contract is complete, stated once, and the same for every node of the widget. The artefact supplies the rest: `extent-review 1.1.0` declares its own `expects`, ports, parameters and projection, so a node pinning it takes `polygons` and gives `polygons`; a node pinning `outreach-criteria 1.0.0` takes `distances` and `alert` and gives `decisions`; one pinning `nb06-evidence 2.0.0` takes `facilities` and gives `points`. |
| **Late binding** | The ports of a node that applies a declared artefact are bound when the artefact is chosen, not when the widget is defined — so the widget's own definition cannot state them. `TYPES.apply_ruleset` records `inputs: []` and `output: null`; `outputOf(node)` reads `node.params.ruleset.output`; `widgets/port-contracts.json` records `lateBoundTo` with an empty contract list. **Not the same as Binding above**, which is field-to-role and chosen by you: this binds *ports to types* and is decided by the artefact. *Called a "deferred port contract" when first written on 2026-10-14 — the practitioner replaced it with the standard term the same day, and the data field was renamed with it.* Four failures that day came from tools treating the port system as the whole contract: a composition validator refused a valid composition because `TYPES` said its terminal member emitted null; a reveal rule over types hid both widgets permanently; an enumeration of legal connections missed ten edges that run in shipped examples; and the receipt rule could not see them either. It also explains why the palette offers one entry per ruleset and per composition rather than one per widget: the artefact is what a practitioner is choosing. |
| **Per-node port** | A port that three widgets gain from a parameter: `map_output` and `table_output` take `pointInputCount`, an integer from 1 to 8, and a node set to *n* accepts `points`, `points_2` … `points_n`, all of type `points`. Default 1, so the extra ports exist only where someone raised it. `nodeInputs(node)` builds that list from the node's own parameters; `TYPES.map_output.inputs` lists `points` and stops, and cannot be made to list the rest, because how many there are is not a fact about the widget. **What this costs:** a connection to `points_3` is valid and runs — `validateWorkflow` checks it through `nodeInputs` — while anything reading the widget definition cannot see that the port exists. *Measured 2026-10-14: an enumeration of every legal connection, built from the type-level declaration, missed exactly one such edge (`point_input → map_output:points_2`, in the John Snow isochrone example) and had no way to know it had.* |
| **Layer** | What a map draws. **Ports receive or transmit; layers are displayed** — the distinction stated by the practitioner on 2026-10-14, and they do not correspond one to one. The shipped isochrone map has **two ports and four layers**: a boundary, four time bands, 250 death locations and eight pumps. The deaths arrived at no port — `summarize_points_to_polygon` keeps the points it counted on the value it returns — so they are drawn without having been wired, and the receipt records that with `fw:layerWithin` rather than claiming a port. A layer's kind (`fw:BasemapLayer`, `fw:AreaLayer`, `fw:PolygonsLayer`, `fw:PointsLayer`, `fw:RasterLayer`, `fw:NetworkLayer`) decides *how* it is drawn, not whether it may be there. A layer has one of three origins: a port it arrived at (`fw:layerPort`), another layer's value it arrived inside (`fw:layerWithin`), or a tile service it is fetched from (`fw:layerTileProvider`, basemaps only). Measured 2026-10-14: **1 of the 10 published maps can show a basemap and none does**, because the control exists only on the interactive presentation of the polygons input — so almost every shipped layer stack has no ground under it. *A map declares itself to be a map of one kind of thing through `inputMode`; what that costs, and the three mechanisms built to work around it, are in [the Map widget page](widget-specs/map_output.md).* |
| **Subject and context** | Which layer a map is asking you to look at, and which is there so you can see where it came from. **A reading, not a property of the data**: the pumps are the subject of a map asking where the pumps are, and context in a map asking how deaths fell around one. *Named here on 2026-10-14 because the application fixes the judgement in a port called `context` and a parameter called `contextPoints`, and because `catchmentPlot` draws the computation's inputs red at radius 3.5 and the observations gray at 2.7 — so the thing each John Snow map exists to show is drawn smaller and duller than the thing that produced the shape.* |

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
| **H3 cell** | One hexagonal cell of the H3 index at a stated resolution, and the unit points are counted into. The cells come from a **fixed global index**, not a lattice fitted to this data — so two runs at the same resolution use the same cells wherever the data came from, which is what makes counts comparable between them. Commonly called a hexbin; this project says H3 cell, because a plotting library’s hexbin is fitted to its data and these are not. A cell boundary is an index unit, **not** a catchment and **not** an anonymity guarantee | `aggregate_points_to_h3_cell`, `fw:HexCell` |
| **Hexbin** | What this operation is called in practice, and the word to search the palette for. Kept as a pointer rather than a definition: see **H3 cell**, which says why the two are not quite the same thing | `aggregate_points_to_h3_cell` |
| **Tide gauge** | An instrument fixed at one coastal point that has measured sea level there for years. AR6 publishes projections at gauges because each has a long local record to project from. A gauge is **where a projection exists**, not a place you care about, so the distance from your facility to it is part of the result | [72](experiments/72-manila-coastal-exposure.md) |
| **Baseline period** | The period a change is measured against. A projection of 442 mm means 442 mm higher than that period — not 442 mm of water | [47](experiments/47-sea-level-pack.md) |
| **Dataset family** | Which published family a value came from — for sea level, whether vertical land motion is included. Values from different families are not comparable | [47](experiments/47-sea-level-pack.md) |
| **Vertical reference** | *Proposed.* The datum an elevation is on, and whether it is a sea-surface baseline or a geodetic datum. Currently free text, which is why a comparison can be invalid while every check passes | [62](experiments/62-workflow-traversal.md) |

## Workflow stages

_A workflow has three stages: **input**, **process**, **output**. Everything below
decomposes one of them. If a stage does not map to one of the three, it is not a
stage._ How these replaced an earlier six, and what was wrong with them, is in
[73](experiments/73-workflow-stage-vocabulary.md).

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

What you do to an input: check it is fit, compute from it, relate it to other
data, summarise it, and classify against a criterion to get the answer.

This is a GIS studio, so most inputs are spatial. The same five things are done
to a table and to a layer, but spatial data changes what each one means.

| Stage | On a table | On a layer |
| --- | --- | --- |
| **Check** | Duplicates, missing values, unique keys, stated units | Is the coordinate system stated? Is the geometry valid? What falls outside the study area, and why | 
| **Compute** | Derive a value for each row from values you have | Derive geometry for each feature — buffer, clip, catchment, reproject, sample a raster onto points — and **local** statistics, one value per feature |
| **Relate** | Join on a key. It matches or it does not | Join by location. **A measurement, not a match** — nearest within a distance, inside or outside, which cell — and the result records how good it was |
| **Summarise** | Many rows become fewer: counts, rates, and descriptive statistics — mean, median, spread | The same, by zone, plus **global** statistics describing a whole layer: where it centres, how far it spreads, whether it clusters. And **the zone is a choice that changes the answer** |
| **Classify** | Sort by a stated criterion | The same, on a stated datum |

Two things spatial work demands that tabular work does not.

**A stated frame.** Every spatial operation needs its coordinate system, zone or
vertical datum named, and the application refuses without one. A comparison
against an unstated vertical datum is not a weaker comparison; it is not a
comparison. Reprojection changes the frame and must not change the claim.

**A record of how well things lined up.** `slr_site_assignment` keeps the
distance to the gauge it assigned. `sample_raster` counts points sampled, with no
data, outside the grid, and unlocated. A spatial relationship can be close,
distant, or absent, and a result that hides which is overstating what it knows.

**Compute or summarise? Count the rows.** One result per record is computing;
many records becoming fewer is summarising. Descriptive statistics are therefore
summaries, whether the data is spatial or not. The test happens to match the
split spatial statisticians already draw: **global** statistics describe a whole
layer in one number and are summaries, **local** statistics give every feature
its own value and are computations.

**Spatial statistics is thin.** Today it is the mean centre and a comparison of
two of them — `mean_center`, `compare_point_sets` — both global. There is no
clustering, no spatial autocorrelation, no kernel density and no hot-spot
detection, local or global. For a studio serving public health that is a
conspicuous absence, and it is recorded here so nobody reads "statistics" above
as a claim that they exist.

**Fieldwork does not judge.** It classifies against criteria someone else
stated, and surfaces what does not fit. Whether the threshold is the right
threshold, and what to do about the answer, stays with the practitioner.

These five are not a grouping imposed afterwards. The application types them
apart: checking produces `coverage-check`, classifying produces `decisions`,
computing, relating and summarising produce data ports.

"Produce results" is not a stage of its own, because every stage above produces
something and the name would not tell you which one you are in. What it points at
is **Classify** — where a criterion is applied and an answer follows.

### Output — communicating the result

| Stage | What it produces | Status |
| --- | --- | --- |
| **View** | One map, chart or table of a result. A view presents a result and must not create one | Built |
| **Fieldwork story** | Several views and text as one product: a field report, story map, infographic or dashboard. Named by the practitioner on 2026-10-24 -- *"Let's just call it the fieldwork story for now"* -- and **provisional**: `for now` is part of the decision and is recorded rather than tidied away. This row read **Composition** until that day, when the practitioner ruled: *"We cannot use composition, that is for workflows."* It is -- `composition` is a saved sub-workflow used as one step, in `src/types.ts`, `composition-registry.ts`, `compositions.ts` and ten other files, and the Micro-workflow widget says so to a practitioner: *"A saved composition used as one step"*. The glossary's only definition of the word contradicted the shipped one | **Designed, not built** ([17](experiments/17-workflow-publication-products.md), [36](experiments/36-communication-layer.md)). Output nodes are terminal today, so composition needs an output contract that is not |

**Two senses, and the built one wins.** `story map` is not the name either: it implies one map where this is a played sequence that may hold several maps, charts and tables, and it is a vendor's product name. `computational narrative` is taken by literate-computing notebooks and describes the wrong thing anyway -- a notebook interleaves code with prose, this interleaves evidence already produced with prose, and the computation is in the workflows. So the thing is the **Fieldwork story** and `story map` is one way of presenting one, not the thing itself. The name enters the glossary before anything is built under it, which is this project's own rule, and [133](experiments/133-the-planning-stage-and-historical-notes.md) is where it would be revised if a better one arrives.

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
| **Developmental evaluation** | The stance of the whole project: the framework is watched as it emerges rather than built to a specification. Finding that a design was wrong counts as a result, not a failure. So do dead ends, and capabilities deliberately left unbuilt — all of it gets written down ([AGENTS.md](../AGENTS.md)). The practitioner's formulation of the method: **look back, forward, sideways, above and below** — back at what was already admitted, forward at what would close an open question, sideways at whether it exists already under another name, above at whether it serves the goal, below at whether the implementation does what the declaration says. The five are part of the stance and are stated in [AGENTS.md](../AGENTS.md#the-five-directions), not only in the experiment that derived them: *"105 cannot be retired as it embodies the DE approach"* (2026-10-15). Forward is the only one derived rather than observed. Which of the five this project can currently see in, and with what, is audited in [105](experiments/105-five-directions.md), and whether the sweeps are actually being made is tracked with a clock in [directions.json](directions.json) |
| **Semantic admission review** | The review a primitive passes before it is built: term and limits, roles, reuse comparison, typed ports, units, provenance, missing-data policy and validation evidence ([the audit](audits/ontology-audit.md)) |
| **Primitive design audit** | Checks D1–D10, run before a primitive is built and again before its release file is written. A check that cannot be answered is a failure, not a deferral. **Not the route distance legs** below: same token, different subject |
| <a id="route-distance-legs"></a>**Route distance legs (D1, D2, D3)** | **D is distance.** A route from a site to a destination over a street network has three: **D1** from the origin to the network, **D2** along the network, **D3** from the network to the destination. The practitioner's framing, taken from the [Cholera Advanced 1 notebooks](https://github.com/PHI-Case-Studies), which use OSMnx and are the same upstream work that produced the `soho.graphml` this project ships (see `examples/john-snow/NOTICE.txt`). Used in `src/catchments.ts`, where D1 is charged against the travel budget. **Collides with the primitive design audit's D1–D10**, which are checks and not distances; where both could be meant, the audit keeps the bare form and the legs are written out |
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
