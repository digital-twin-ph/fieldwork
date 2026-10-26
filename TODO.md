# TODO

_Created 2026-10-10 · Updated 2026-10-26_

The project's one list of open work. **Merged 2026-10-26 from two**: a root `TODO.md` of
deferred work created 2026-10-10 and a `docs/todo.md` of committed work created 2026-10-11, one
day apart, with the same subject and no declared split outside their own preambles. The
distinction they drew was real — committed to, against decided-to-do-later — and no name carried
it, so an item could only be routed by reading both files first. The practitioner, closing it:
*"I cannot say add TODO to TODO."*

It had already cost what duplication costs. One entry here records a capability sitting in one
file as "not built" while the other said "now done", so the project held a claim and its
refutation at the same time. The distinction survives below as sections, where a heading carries
it and a filename does not have to.

Items leave this list by being done or by being recorded as decided against, not by being
forgotten. Anything abandoned is struck with a reason rather than deleted, so the record of what
was declined survives. Dated, so that an item sitting here for weeks is visible as a choice.

## The goal this list is answerable to

To empower public health practitioners in the practical use of GIS in field
workflows — where it matters, and where resources and connectivity may be
scarce. Not to get everything working perfectly.

Read against that, the items below do not all serve the same people, and two
tensions are worth seeing before choosing what to do next.

**Reaches a practitioner in the field, offline.** Fieldwork itself precaches and
reports *Available offline*. A user manual shipped with it would too. Widget
correctness reaches them indirectly and certainly: they rely on the widget being
right and will never run the notebook that checks it.

**Written for people with connectivity, and that is correct.** The Validation
Lab is for Fieldwork developers and contributors, who work where there is a
network. Its need for connectivity on first use is a property of its audience,
not a defect — the earlier version of this section treated it as a failure
against the goal, which was wrong. What it does need is to **say so**: a
practitioner who wants to review a check offline has to learn the prerequisite
before they are in the field, not after.

**The Dive Deeper material is a different audience and a different problem.**
Learners are not contributors, and the material is the explanation surface
[94](experiments/94-where-explanation-belongs.md) assigned to the lab. They
reach the page while online — that is unavoidable, it is how they get it — so
the answer is to use that moment: **run every notebook once while connected**,
which both caches what the kernel needs and surfaces any failure while there is
still a network to fix it with. Offline availability becomes a setup step a
learner performs deliberately rather than a property they discover they lack.

**Serves us, not them.** The experiment-document standard, done 2026-10-11, was
an internal instrument, and [96](experiments/96-the-experiment-document.md) says
so in its own closing section: its beneficiaries are us and future contributors,
not a practitioner in the field.

## Urgent

**N3 evidence is unreadable, and colour is the smaller half of it.** Asked by the
practitioner on 2026-10-25: *"looking at N3 evidence, is there a way to make the N3
readable, like add color coding?"* Measured the same day before answering: a receipt for
two records already carries a **452-character line** — one subject with a dozen predicates
separated by `;`, which soft-wraps in `<pre id="n3-preview">` into a paragraph with no
structure. A real workflow is worse. So pretty-printing at the `;`, with predicates
indented under their subject, is the larger gain and turns that line into about twelve
readable ones. Collapsing the identical `@prefix` header into a `<details>` and grouping
triples by subject are cheap alongside it.

Syntax colour is then worth adding and needs no dependency: N3 has few token classes, so a
tokenizer is about forty lines. Three constraints decide how it is built. The panel is set
with `textContent` today and therefore cannot inject; highlighting means `innerHTML`, and
this N3 carries user data — node labels, filenames, IRIs out of imported files — so
escaping has to happen per token while tokenizing, never on the assembled string.
`tests/contrast.browser.mjs` already asserts WCAG AA for every rendered text element in
dark and holds light to its baseline, so the colours are enforced in both themes without
new machinery. And the displayed N3 must not become different N3: the receipt download and
the bytes the reasoner saw stay exactly as generated, so formatting is a display transform
and that boundary belongs in the code rather than in a comment.

**An interactive map should be able to reveal points in time order.** Proposed by the
practitioner on 2026-10-25: *"The data set for Hagelloch has time column and on the
interactive map we can actually have a progressive point reveal using the time column to
dictate display sequence using a 'play' button."* The data supports it — each Hagelloch
case carries `date_of_prodrome`, and `case_series` already declares which kind of date a
series was built from — and Snow's Soho deaths carry dates too, so one control would serve
both worked examples.

**Scoped by the practitioner the same day:** *"We only need the playback for maps where the
zoom level has all the data."* That is a refusal rule rather than a convenience. An
animation run over a viewport that excludes some cases shows a partial outbreak while
looking complete, and the reader has no way to see what was left out — the figure would be
wrong in the one direction a spot map is read for. So the control is offered only at a view
that contains every record being animated, with a fit-to-all-cases gesture to reach it
(`#fit-button` is the established one), and it says what is outside the view rather than
playing on. Settled by the practitioner the same day, on what the
condition means for a case-cluster layer: **all data points visible**. So it is not enough
that the records are present — each case must be drawn as itself. A clustered map does not
qualify while its cases are merged into aggregates, because a cluster of twelve animates as
one mark and the reader counts one. Two conditions together, then: every record drawn
individually, and every one of them inside the view. Where no zoom satisfies both — dense
data that only separates by zooming past the extent — playback is not offered at all, which
is the honest answer rather than animating something the reader will miscount.

**The naming is settled, and the two are told apart by what they replay.** The practitioner,
2026-10-25: *"the other playback is workflow build. This one is point and time column
related."* So `src/reveal-playback.ts` keeps "Play back the build" — it replays how the
*workflow* was assembled, widget by widget — and this one is named for the points and the
date column it reads. Neither may be called "playback" unqualified in the interface or in
the glossary, because the word alone no longer identifies either.

**And it must say which date it is animating.** `case_series` already carries a declared
date kind — onset, report, death, specimen collection — precisely so that a chart cannot
quietly relabel the series it was built from, and check 22 states that limit in as many
words. A time-ordered map is the same claim in another form: cases appearing by date of
death tell a different story from the same cases appearing by date of onset, and a reader
watching an animation has even less opportunity to check than a reader of an axis. The
declared kind travels with the control and is stated on the figure.

**Where the control lives, settled the same day.** *"the date column should be selectable
on the map Inspector panel"*, and *"play back options should only be visible when
interactive map is selected."* Both follow from the rule above rather than sitting beside
it: a static plot cannot animate, so offering the control there would be offering something
that cannot run, and the presentation select is already what decides between a static plot
and an interactive map.

Choosing the column on the map has a consequence worth taking with it. `case_series` picks a
date column AND declares its kind, and the pair is what stops a figure relabelling the
series it was built from. A column chosen on the map with no kind beside it loses exactly
that, so the Inspector asks for both — or inherits them from an upstream `case_series`
where one is wired, which is the better answer when it is available because then the curve
and the map cannot disagree about which date they are showing.

A new capability, so it wants an experiment record before the diff.

**A catalog entry should name the workflow it opens as.** The Worked examples section reports
FETCHABLE or AVAILABLE from a list of ids fetched on this device, because it cannot derive it: the
catalog id is `urn:fieldwork:example:south-london-1854` and the workflow carries
`exampleId: snow-south-london-1854`, which do not match. A record of what was fetched is honest
but it is not the same question as "is this example's workflow open here", and the two will
disagree the moment a practitioner deletes the workflow. An `opensAs` field naming the workflow id
would let the state be read from what is actually on the device.

**A WebKit service-worker error failed one gate, once.** `ruleset-example.browser.mjs` failed in
the 2026-10-24 gate on a page error reading `/127.0.0.1:4174/sw.js due to access control checks.`
-- not on its own assertions, which all passed -- and then passed 5 of 5 in isolation. The
signature matches the two messages already in `BROWSER_OWN`: suite pressure, not a defect.

**It is deliberately not filtered yet.** `tests/page-errors.mjs` filters by exact message and
documents the evidence for each, and one sighting is not evidence. Filtering this one is also
riskier than the other two: a service worker that fails to register means offline support is
silently gone, which is the application's central promise, and the string carries the test port so
an exact match would be brittle across `FIELDWORK_TEST_PORT`. Watch for a second sighting before
deciding; if it recurs, the question is whether registration is actually failing under load or
whether WebKit reports a cancelled fetch this way.

**DONE 2026-10-24 — the refusal says what actually happened.** `change()` returns false while
`busy` without attempting a save, so `lastSaveFailure` stayed null and `saveFailureMessage` fell
through to the caller's storage sentence: "Study area could not be saved. Retry Apply.", over a
workspace holding 169 KB, where retrying would fail identically until the run ended. Fixed in
`saveFailureMessage` rather than at each caller, so every refusal routed through it gets the true
reason. Third sighting of the same family: the first swallowed a New project click in silence, the
second disabled the controls that open with the guard, and this one misdirected, which is worse.

**Still open from that family:** `input-data-ui` says "Edits could not be saved on this device" on
its own, without going through `saveFailureMessage`, so the same misdirection is available there.
It was not touched because it was not what was reported, and a fix applied to a fraction of the
places that need it is how the swallowed-click problem kept being rediscovered.

**A table still cannot colour the boundaries it is keyed on.** study_area 0.5.0 brings polygons in
and keeps `units[i]` naming part i, so the South London example's 32 sub-districts can now reach a
canvas. Joining the 32 mortality rates to them cannot: nothing takes a table and an area and
returns the area with a value per part. That join is the choropleth, and it is the figure the
example has been arguing in prose since 2026-10-24.

**DONE 2026-10-24 — a polygon comes in through the study area.** This entry said no widget took a
polygon and that the first of its two gaps was a `polygon_input` beside `table_input`. The
practitioner settled it differently and better: *"a study area is actually a polygon input."* Of
the five port types only `polygons` lacked a source, and `polygons` is a catchment result
carrying sites and a method, so a new source emitting it would have made imported boundaries
masquerade as a computation nobody ran. study_area 0.5.0 takes a GeoJSON polygon file and holds
units that share a border. The second gap is still open and is its own entry below.

**Measure OPFS against IndexedDB for large rasters, before changing anything.** A raster asset
currently goes through `storePDFs` into `evidence-storage.ts` as a single IndexedDB value. That is
fine for the 5.3 MB Snow plate and is the wrong shape for WorldPop: the national extracts measured
on 2026-10-24 are 293 MB and 1.18 GB, and an IndexedDB `put` of that size has to hold the whole
buffer in memory, while reading a window of the GeoTIFF has to pull it back out whole. OPFS would
allow a streamed write and a ranged read through `createSyncAccessHandle().read(buf, {at})`, which
is what geotiff.js wants.

That is an argument, not a measurement, and it is not a reason to rebuild storage yet. What would
settle it: write one 293 MB file both ways in both engines, and record whether the write succeeds
at all, the wall time, whether a ranged read works without materialising the file, and peak memory
where the engine reports it. Chromium offers `measureUserAgentSpecificMemory`; WebKit does not, so
that column will be partial and should say so. The Linux WebKit container
([experiment 135](experiments/135-linux-webkit-in-a-container.md)) is the instrument for half of
it. Run it at several sizes rather than one, because the useful result is where IndexedDB starts
to fail rather than how fast it is when it does not.

Constraints that apply whatever the measurement says: `createSyncAccessHandle` is worker-only,
which is no obstacle since three dedicated workers already exist, but raster IO would have to move
into one. Engine parity cannot be assumed -- handle locking, `flush()`, `getSize()` and error names
are reported to differ between Firefox and Safari -- and Safari still lacks `createWritable`, so
sync access handles rather than writable streams. Fieldwork gates on WebKit because of Tauri, so
this is tested rather than read off a support table.

**Should deleting a project be refused while a workflow is running?** `deleteProject` carries no
busy guard, unlike every neighbouring handler. Found 2026-10-24 while surveying the controls that
silently swallow a click during a run ([experiment
135](experiments/135-linux-webkit-in-a-container.md)), and deliberately left alone: the others were
a control saying nothing when it had a guard, and this is the opposite question — whether it should
have one. Deleting the project whose workflow is mid-run is a different risk from opening a dialog.

**One chromium failure is still unexplained.** `large-network-storage.browser.mjs:25` spent 4.4
minutes against a 240-second budget on a runner, 2026-10-20. It was not reproduced in the Linux
container and is not covered by either finding in experiment 135: the resource reading was
retracted for the two WebKit tests, not for this one.

**Storage is capped by the smallest store the browser offers, and nothing chose it.**
_Acted on 2026-10-20 for payloads: street networks now live in IndexedDB and the workflow keeps a
digest. What remains is below — the study-area budgets are still sized against `localStorage`,
nothing is ever deleted from the payload store, and the write has not been timed._
The study-area budgets in decision A03 — 1 MiB per extent, 1.5 MiB across revisions — are sized
against `localStorage`, measured at 5,226,496 bytes in both engines. The same probe measured
IndexedDB, Cache and OPFS at **10.7 GB in Chromium and 1.0 GB in WebKit**: 200x to 2,000x more.
The practitioner, 2026-10-19: *"Just curious can be we storage that can store bigger sizes of
artifacts?"* Recorded as [121](experiments/121-storage-beyond-local-storage.md).

The blocking unknown is not capacity but persistence: nothing has measured what
`navigator.storage.persist()` grants in either engine, and a study area that is silently evicted
would be worse than one refused up front. That probe is what 121 names as its closing condition,
and it also decides where a PMTiles extract should live.


**A mechanism for "below": nothing compares a release's claims to its code.**
The practitioner's method is to look back, forward, sideways, above and below
([105](experiments/105-five-directions.md)). Back and forward were mechanised on 2026-10-12;
sideways is half-mechanised; above cannot be and should not be. **Below has nothing**, and it is
where today's substantive findings came from: `implementationStatus: 'retired'` is a declared
state no file in `src/` reads; eight sites convert metres through a constant that no release
mentions; four port names encode a use and port names are not in the release files at all. Each
was found by hand. The narrowest useful start is a check that a declared `implementationStatus`
has an effect — which Phase 2 of the shrink needs anyway.

**1 · Sweep the four criteria that have never reached the existing set.**
`npm run validate:admission` reports 8 of 12 criteria swept since they last changed and 3 across
the whole set of 51. Outstanding: **D3 and D4 sampled at 6 of 39 rather than applied** — the
audit's own "separate task", named in October and never scheduled — **D4a partial** with the
custom-stud port types enumerated and undispositioned, and **D5, D8, D8a, D6 never swept**. D5
and D8 are recorded as contestable: whether a qualifier sits on the input, and whether a test
exercises a distinction, are both readable off built code, so calling them design-time only was
quicker than true. Record: [104](experiments/104-admission-is-not-permanent.md).

This comes before the merges because it may change what merges. D1, D2 and D7 were swept on
2026-10-12 and each sweep found something: two kinds not four, a merge D2 had recorded without
deciding, and four port names encoding a use. Four unswept criteria across 51 widgets is the
larger remaining unknown.

**2 · Shrink the widget set. The plan exists and was never executed.**
Confirmed as the direction by the practitioner on 2026-10-12: *"as the framework emerges we
should respect the outcome of the emergence direction. Right now we have too many widgets that
should be retired because they are duplicates or composites."*

[64](experiments/64-widget-streamlining.md) is that refactor, sequenced by risk to saved work
and written on 2026-10-09 against 39 widgets. **Phase 1 is done** — `raster_input`'s
description was corrected and the release records it. **Phases 2 to 6 are not**, and the set
has since grown to **51**, which is the thing 64 warned about in its own opening: every finding
"gets more expensive as the set grows", and three of them "are already being copied by each new
widget that follows the existing pattern". Twelve widgets were added without going through D1
in the audit's table.

The retirement mechanism is already designed, in Phase 2, and is the reason this is safe: a
retired node type **stays executable**, so every saved workflow and every frozen fixture still
runs; and its release file **records the retirement and what replaces it** rather than being
deleted.

**A retired widget never runs**, which is the practitioner's rule of 2026-10-12: a saved
workflow holding one should cease to work unless the widget can be replaced by an existing one.
Replaceable means the adapter rewrites the node *and says so*; not replaceable means the
workflow refuses to open, naming the widget. Half of this already works —
`healthsites_discovery`, `output`, `places` and `centers` all migrate today, and an unknown type
is already refused — but the migrations are **silent** and the refusal says only "Invalid or
duplicate node". Those two are the work. It also answers *"by whom?"*: there are no external
owners, only the seven shipped examples and the frozen fixtures this project owns, so the
"risk to saved work" that sequenced [64](experiments/64-widget-streamlining.md) was weighted for
owners who do not exist.

**Retired means archived, not merely unaddable** — the practitioner's correction of 2026-10-12:
a widget absent from the add-palette but still in the catalogue, the counts and search is still
occupying attention. It must be absent from the palette, from node search, from the catalogue
list and its count, from `classification.json`'s counts and from `check-coverage.json` — so a
retired widget stops owing a lab check — and absent from the Inspector too, since a retired widget never
runs. `docs/usage.md` keeps it in a retired section so an old workflow can still be looked up.

**~~And Phase 2's first task is not retiring anything.~~ DONE, and this line was still being
read as a reason not to start.** It said `implementationStatus: 'retired'` was a valid value no
release used and **no file in `src/` read**, so the state was declarable and inert and honouring
it came first. That was true when written. It is false now: `src/palette.ts` derives
`RETIRED_FROM_PALETTE` from the declared status, its own comment records that this is what makes
a retirement take effect *"everywhere at once — palette, node search, the catalogue and its
counts"*, and **eight widgets are retired through it today**.

So the prerequisite is met and the only thing between this plan and a smaller palette is the
decision to remove. Corrected 2026-10-25, on the practitioner's: *"we keep on relitigating what
we have solved already by putting up blockers for why we cannot remove them. I think it's about
time we remove with impunity."* This paragraph is the instance they are describing. The
remaining caution in this section was weighted for external owners that [64](experiments/64-widget-streamlining.md)
itself later found do not exist — *"there are no external owners, only the seven shipped examples
and the frozen fixtures this project owns"* — so the adapters protect work this project can fix
in the same commit.

What is retirable without contradicting D1:

| | |
| --- | --- |
| **Duplicates** | `nearest`, `access`, `slr_site_assignment` are three implementations of nearest-neighbour-with-distance. **`nearest` is the general one and the other two merge into it** ([103](experiments/103-duplicates-should-merge.md)), but it must be made general first — its ports are named `places` and `centers` after the heat demo, and the three emit three different port types, so this is port work ([66](experiments/66-ports-as-schema-binding.md)) and not a rename. `output` is a generic display against three typed ones. `summarize_points_to_polygon`, `aggregate_points_to_h3_cell`, `case_series` are one group-and-aggregate over three keys, but each is asked for by name, so that is code factoring and not a palette retirement |
| **Example-bound** | `places`, `centers`, `alert`, `facilities`, `samples`, `xpert`, `policy`, `access_policy`, `comparison_map`. `places` and `centers` already migrate into `observations`, so seven remain |

Roughly ten palette retirements, taking 51 to about 41, plus code-level factoring that changes
no palette entry.

**A table cannot be joined to another table, and no widget does arithmetic on columns.** Found
2026-10-26, building South London's contingency table. The 2x2 of people by supply and outcome is
derived from two published tables -- Table XII declares each sub-district's water supply, Table
VIII gives its population and deaths -- and needs two operations the application does not have:
a **table-to-table join** on the sub-district name, and a **derived column**, survivors being
population minus deaths.

`join_table_to_area` joins a table to a BOUNDARY, which is the same matching problem against a
different second operand; nothing joins two plain tables. And nothing computes a column from
other columns at all: `rate` divides two declared measures and emits a rate, which is the only
arithmetic over columns in the application.

So the workflow carries prepared data with its provenance stated, as the other inputs do. That
is honest and it is not the same as the example demonstrating the operation -- a practitioner
with the same two published tables cannot reproduce the step in Fieldwork, which is what
[the glossary](glossary.md) says a worked example is for: the only artifact that demonstrates
composition rather than declaring it.

Neither operation is epidemiological. A join of two tables on a shared key and a column derived
from others are the two most ordinary things in tabular work, and their absence is why the one
genuinely checkable epidemiological table in this project had to be computed outside it.

**Utilisation is runs, not appearances. BUILT 2026-10-26; what remains is below.** The
practitioner, defining the term: *"use is defined as widget connected to another and run in a
workflow, that's a use instance, regardless of whether it's in a worked example, a user developed
one or an imported one."*

That is a different measure from the one this project has. `npm run usage:widgets` counts **node
types appearing in example templates** — an appearance in something shipped — and AGENTS.md names
it as the instrument for D10. Under the definition above it answers a narrower question, and the
two should not be confused: a widget can appear in five examples nobody runs, or be run daily in
workflows nobody shipped.

**The data already exists and is discarded.** `WorkflowRun.trace` is
`{nodeId, type, milliseconds}[]`, produced by every run, so each execution already records which
widget types ran, connected, in a real workflow. `src/app.ts` reads it for a one-line summary and
drops it. The smallest honest implementation is to accumulate it: a local tally of type → count
and last-run date, written where the app already writes, surfaced in the widget catalogue beside
each entry.

**What was built**, the same day: `src/widget-usage.ts` accumulates a tally from every run's
`trace`, `src/app.ts` records it when a run completes, and the widget catalogue carries a **Runs
here** column with the limit stated beside it. A run counts once per widget TYPE, not once per
node — a workflow with three map outputs is one use of `map_output`, because counting nodes would
make a habit of duplicating a step look like evidence of its worth. A node placed and abandoned
never counts: the tally is written from what executed.

**What remains:**

- **Nothing reads the tally but a human.** It informs no ratchet. The obvious use is the
  retirement argument — a widget at zero runs is a candidate — but a count from one browser is
  thin evidence for a decision affecting everyone, so what it may be used FOR needs deciding
  before it is wired to anything.
- **Two measures now have similar names.** `usage:widgets` counts appearances in shipped
  examples and AGENTS.md names it as the D10 instrument; this counts runs here. They should be
  named apart before somebody cites the wrong one.
- **No way to clear it on request.** `forgetRuns()` exists and nothing calls it, so a
  practitioner who wants the count gone must clear all site data and lose their workflows with it.
- **Untested in the browser.** No test asserts that running a workflow increments the column.

**The limit, in the practitioner's own words**, 2026-10-26: *"since the app is browser based and
does not include what other browsers do, the use stats is only good for that one specific browser
for that one specific user."* Not that person's use — a second browser keeps its own tally — and
certainly not the field's.

**Strictly local, and that is not a limitation to apologise for.** This application sends nothing
and is built to run offline; a utilisation count that phoned home would contradict the premise
([the directions register](directions.json)'s `fieldwork-bounds-what-it-controls`). What it buys
is still real: a practitioner can see which widgets they actually use, and this project can see
which of the 47 earn their place on the evidence of runs rather than on the evidence of being
mentioned in a template. That is the measure
`streamlining-measures-confusion-and-duplication` says does not exist, arriving from the one
direction that needs no new instrumentation at all.

**A third category, and the one that changes the count: a declaration wearing a node type.**
Added 2026-10-25, when the practitioner looked at the palette and asked *"why do we still have
the heat alert as a widget under inputs?"*, then *"that looks to me like a ruleset widget
function"*, then *"so that sea-level projection extract sounds about the same"*. All three are
the same observation, and the table above splits them across two rows that hide it.

A declaration is not an operation. `alert` declares `{active, date}`, takes no input, emits a
bespoke port type consumed by exactly one widget, and contributes two facts — `fw:alertKnown`
and `fw:heatAlert` — asserted inside the rule application's own fact generator. The *other*
declared value that same ruleset needs, the distance threshold, is already a parameter on
`policy` carried by `bindParameters`. So the mechanism exists and is in use, and `alert` is the
one declared value that was given a node type instead of a knob.

`slr_extract_import` is the same shape: it computes nothing, hands its input table back with a
provenance bag attached — `projectionTable` is `{...extract.table, projection:{…}}` — and every
knob is a declaration. It is the harder case, because its domain content is in TypeScript rather
than in data: `PROJECTION_KEYS`, `BASIS_KINDS` (`workflow` / `confidence-pbox`), `VALUE_UNITS`
(metre / millimetre) and the vertical-land-motion family pair. The generic operation underneath
is domain-agnostic and worth having — *declare an imported table as an extract of a published
dataset, with its citations, baseline, units and key columns, and refuse to proceed until that
is stated* — and it would serve WorldPop, a census or a ministry's facility register equally.
Those four constants are what make it sea-level-specific, and they are data. The precedent for
moving exactly this kind of thing out of code is `rulesets/outreach-criteria/1.0.0.json`, which
is what the `ruleset-as-declared-data` blocker was lifted for.

**And the pack is gone, which removes the place a domain widget could live.** The practitioner,
same day: *"widgets are supposed to be domain agnostic"* and *"we abandoned the pack idea (e.g.,
sea-level rise)"*. This file says in two places that pack work is **postponed**, citing
[67](experiments/67-sample-raster-at-points.md), and the coverage analysis leans on it — *"its
weakness is owned — all pack work is deliberately postponed and the record says so."* Postponed
is now the wrong word. Those sentences are left standing with their dates; this is the
correction. Recorded as `domain-belongs-in-data-not-in-widgets` in
[directions.json](directions.json).

What that exposes is not three awkward widgets but a check nobody was making. `classifyWidgets`
derives standard-vs-domain from the **pack namespace alone**. Measured 2026-10-25: 3 of 49 live
widgets are classified `domain` and all three are the sea-level pack, and nothing verifies that a
widget classified `standard` is actually domain-agnostic — which is how `alert` passes as
standard while its own release says `example-specific`, its title is "Heat alert" and it asserts
`fw:heatAlert`. That check is mechanisable, which AGENTS.md says to prefer over a rule people
must remember.

The three sea-level widgets have three different dispositions and must not be swept together:
`slr_site_assignment` is already in the Duplicates row as a one-off of
nearest-neighbour-with-distance; `slr_extract_import` is a declaration, as above;
`slr_threshold_comparison` this file has judged *"genuinely domain-bound"*, which under the new
direction is a question rather than a settled exemption.

**The sea-level knowledge is kept, and it already has a home.** The practitioner, asked whether
retiring the pack meant losing it: *"we already address that in the Manila example."* It does —
`src/sea-level-example.ts` is Manila coastal exposure, shipped as worked example 08, carrying 60
OpenStreetMap health facilities in a Manila box, the eight published AR6 tide gauges for the
Philippines and the 288-value projection extract, with both licences travelling with it. So this
is a refactor and not a deletion.

It also settles why the pack was never needed. A worked example is defined in the
[glossary](glossary.md) as a teaching artifact and a regression fixture at once, carrying a
workflow, bundled data with provenance and digests, and its own limits — and it is the **only**
artifact that demonstrates composition rather than declaring it. That is already the sanctioned
place for domain knowledge, and it is data. The pack was a second mechanism for the same job,
aimed at external owners [64](experiments/64-widget-streamlining.md) later found do not exist:
*"there are no external owners, only the seven shipped examples and the frozen fixtures this
project owns."* Manila was carrying the domain the whole time while the pack carried the
governance for carrying it.

**AR6 as a ruleset — and this was settled on 2026-10-15, not today.**
[115](experiments/115-decomposing-the-projection-extract.md) reads `slr_extract_import`
operation by operation, finds that **none of its five operations is about sea level** — four
are assertions about a table and one is a derivation over a column — and records the
practitioner's decisions the same day: P1, the contract is the ruleset's own declaration via
`inputContract.expects`, so no new widget and no ruleset power to stop a run; P2, provenance is
an alert rather than a blocker; P3, the distinct values are a knob on the input widget. The
blocker ledger had already reached the verdict too: *"`slr_` names a pack, not an operation.
Becoming a ruleset makes that correct rather than needing a fix."* **The build has not started**,
and 115 still reads `asked`.

On 2026-10-25 the practitioner said *"AR6 as a ruleset"* and Claude re-derived the same
conclusion from the ruleset format as though it were new, which is the relitigating this
section is about. The practitioner: *"I remember the AR6 ruleset work as it was a significant
amount of time."* They were right. What follows is a field mapping that supports 115's P1 and
does not replace it; the decisions above are the ones to build.

Checked against `fieldwork/ruleset/1` on 2026-10-25, the format has a slot for every constant:

| In `src/sea-level.ts` today | Ruleset field it belongs in |
| --- | --- |
| `PROJECTION_KEYS` — the six key columns an extract must carry | `inputContract.expects`, which already lists what a fact generator requires |
| `VALUE_UNITS` metre / millimetre, with `UNIT_IRIS` holding `qudt:M` and `qudt:MilliM` | `parameters[].unit`, which is already a QUDT IRI in every shipped ruleset |
| `BASIS_KINDS` — `workflow` / `confidence-pbox` | an enumerated vocabulary, as `outputVocabulary.predicates[].values` already is |
| the vertical-land-motion family pair | `parameters`, with `meaning` carrying what each names |
| baseline period and the three obliged citations | `basis.evidence` and `basis.unresolvedCitations` |

The field that makes the case is `mustNotBeReadAs`. `src/sea-level.ts` carries this as a code
comment: *"wf_1e is one workflow, 'medium' is a p-box over several, and a p-box bound is not a
quantile of one distribution."* That is a distinction in the glossary's sense, it is the most
valuable thing the widget holds, and it is sitting where no reader of the application will ever
meet it. `mustNotBeReadAs` is the declared, versioned, citable place for exactly that sentence,
and `access-review 1.0.0` already uses it.

One adaptation to settle before the work: a ruleset today carries N3 `rules` applied by the
reasoner, and AR6's domain content is **refusals rather than inferences** — a missing key column,
an uninterpretable unit, an undeclared basis kind. Either those become N3 rules, which would make
each refusal declared and explainable rather than a `throw` in TypeScript, or the format admits a
ruleset that is a contract with no rules. The first is the more interesting answer and is what
"semantic reasoning" would mean here; neither is chosen yet.

The disposition of `widgets/packs.json`, `validate:packs`, `src/pack-catalog.ts` and
`src/catalog-ui.ts` is a separate question and is not answered here — it is governance for a
mechanism no longer used, which is a different thing from the domain knowledge it was meant to
carry.

**The order is not retirement-first**, which is where this started and was wrong. Checked
2026-10-12: no affected workflow is completely replaceable, because "replaceable" means a current
widget declares a `migrationFrom` adapter and only four types in the registry have one. The
cheapest real move is making `nearest` general, after which two widgets have something to merge
into; and four of the candidates — `alert`, `policy`, `access_policy`, `xpert` — need a general
rule-application widget to merge into, which would be one widget in for four out.
*(Reworded 2026-10-19 off the withdrawn term; the claim that it does not exist predates
`apply_ruleset` and is worth re-checking.)*

**One fork needs deciding before the work starts.** 64 states flatly that **no composite leaves
the palette**, and D1 agrees: a composite asked for by name stays, because factoring it on the
canvas makes a practitioner wire three nodes to ask one question. That is also what
[94](experiments/94-where-explanation-belongs.md) concluded about cognitive load and what
[93](experiments/93-gamification-spike.md) recorded as the practitioner's own measure — fewest
widgets to reach an output. So "retire composites" has two readings: the narrow one above
(duplicates, and composites nobody asks for by name), or retiring all 19 composites, which
would shrink the palette and grow every workflow. The narrow reading is the one the record
supports; the wide one is a reversal and would need saying so explicitly.

**3 · The 13 computing widgets still with no lab check.**
32 widgets owe an independent check and 19 have one, counted by
`validate:check-coverage` and visible in every run.
[widgets/check-coverage.json](../widgets/check-coverage.json) declares what each of the 51
owes, with a reason for every exemption; the awaiting count can only fall.
Record: [98](experiments/98-the-coverage-ratchet.md), which groups the remaining 13 by the
external implementation that would check them, because the cost is the reference and the
fixture rather than the widget. Seven of the thirteen done came from the shapely group and
shared two fixture helpers, so they were cheaper than the rest. The two buffer widgets, checked
against theory because nothing equivalent exists to compare them with, and the two that left
the group entirely — `21-hex` against h3-py, `22-case-series` against pandas — cost more per
check and found more.

Each notebook has two parts, not one ([94](experiments/94-where-explanation-belongs.md)).
**Parity** recomputes independently for a reviewer. **Dive deeper** varies the assumption the
widget inherits and shows what it does to the answer. `10-hull` through `22-case-series` are the worked
instances. Two reported a consequence that argued against the warning the section was
written to make, and one found that its own fixture does not contain the hard case at all —
no location on a polygon edge — so the notebook constructs it. Expect that to recur.

Two constraints on the grouping, both learned rather than designed:
`sample_raster` needs its own notebook, because requesting `rasterio` beside `pyproj` kills
the kernel ([97](experiments/97-the-browser-kernel-gate.md)); and `buffer_area` and
`buffer_point` will not agree exactly with shapely, so their criterion must state an area
tolerance with the quadrant count declared rather than claim an agreement that is not there.

**4 · There is no user manual.**
[docs/usage.md](usage.md) is a reference for what the application does, written
when the practitioner detail moved out of the README. It is not a manual that
teaches a method, and two things have now been found to need one:

- **Composing micro-workflows as problem decomposition.** The skill is in
  building one, not reading one ([94](experiments/94-where-explanation-belongs.md)),
  so it needs instruction and an exercise rather than a feature description. The
  exercise should start away from the canvas: understanding the problem is where
  the time pays, and a manual that opens by placing nodes teaches the opposite
  ([93](experiments/93-gamification-spike.md)).
- **What a widget actually does**, at the level a practitioner needs before
  choosing it. The Dive Deeper notebooks carry the depth; a manual has to carry
  the route to them.

Not urgent against the items above, and recorded now because it has been
implied twice in two days and never written down.

**The input-stage palette looks like a palette that failed to load.** _Found 2026-10-26, by the
practitioner misreading it twice in ten minutes on the live build — first as missing widgets,
then as "the Pages palette is truncated to only around 6 widgets"._ An empty canvas offers four
widgets: `network_input`, `table_input`, `study_area`, `point_input`, plus any saved
micro-workflows. That is the input-stage gate and it is right — *"there is no sensible process
step before there is something to process"* — but **nothing on the screen says more will
appear**. The panel reads "Click to add. Connect matching ports." and then shows four things,
which is indistinguishable from a broken load, and worst on a fresh tab where a reader has no
prior to compare against.

The person who wrote the rule misread the screen twice, which is the strongest available
evidence that a practitioner will. The fix is a sentence, not a redesign: say that the rest of
the palette appears once something is on the canvas. Costs one line in `renderLibrary` and a
build; the demo on 2026-10-30 is the deadline that makes it worth doing before the larger items
above.

**A table figure cannot carry its own source, where a map can.** Recorded as a 0.12.0
validation limit and raised again 2026-10-26 by the margins review: a map output states a title,
a subtitle and a source note; `table_output` states a label and nothing else, so a table that
leaves the application carries no provenance at all. The three fields exist on `map_output`
already (`mapTitle`, `mapSubtitle`, `mapSourceNote`), so this is symmetry rather than design.

It is the nearer half of the notes problem above: the 1851-against-1854 vintage mismatch belongs
on the figure that shows it, where it travels with the figure, while the narrative around the
investigation waits for notes to be built. Small, and it would put a source line under the 2x2
before the demo.

**A stated unit is read as permission to add, and prose cannot be checked.**
_Found 2026-10-26, read-only, while asking why the derived 2x2 shows no margins._ `crossTab`
decides whether a grid may carry totals with `addable=Boolean(table.unit?.trim())`: **any**
non-empty string permits addition. The rule it means to enforce is "a table that states its unit
is saying its values count the same thing", and a free-text field cannot carry that claim.

South London contains the counterexample already. The mortality table's unit is
`"people or deaths, as the measure says"` — prose that explicitly DENIES commensurability — and
its seven measures are `population` beside six death counts. Connected to a table output it
would draw a 32x7 grid whose totals add population to deaths. It does not manifest today only
because that table feeds the rate node instead, which is one connection away in a worked example.

This is the same hole as the missing-margins item below,
seen from the other side: one table claims commensurability it does not have, the other has it
and cannot say so. Both come of making a free-text unit carry a yes/no claim. Candidates: a
separate declared flag the practitioner sets and the receipt records; a unit per measure rather
than per table, which is what is actually true of a long table; or totals asserted at the output,
where a person composes a figure and takes responsibility for it.

Do not fix by pattern-matching the prose.

**PARTLY DONE 2026-10-26 — a 2x2 that became commensurable shows no margins.**
_Found 2026-10-26, building South London's contingency table in the application._ Totals are
drawn only where a table states a unit — "a table that states its unit is saying its values count
the same thing; one that does not gets no totals rather than a wrong one". Snow's Table IX states
none, correctly: as imported it holds houses beside deaths, and a total across those is
meaningless.

But `select_rows` leaves `deaths` beside `houses without a death`, and those **both count houses**.
The table is now commensurable and nothing in it records that, so the figure an epidemiologist
reads loses exactly the margins they read first. The rule is right in general and wrong here.

**Settled for the figure, not for the model.** A tabular output can now assert that its cells
count the same thing, and the grid draws its margins; the figure says underneath that somebody
asserted it, because nothing checks it. South London's derived 2x2 reads 40,046 and 26,107, the
published house counts. A separate "state a unit" widget was rejected: it would take the budget
from 49 to 50 and add a palette entry, which is the cost this project keeps paying.

**What is still open is the model.** A unit belongs to a table and each measure of a long table
may count something different, so the right answer remains a unit per measure — which reaches
every consumer of `valueField` and is not a four-day change. Until then a reader of a totalled
grid is trusting a person, which the figure at least says out loud.

Three candidate answers, one taken: a step that states a unit on a table it passes through;
a unit per measure rather than per table, which is a change to `DataTable` and reaches every
consumer; or letting the output state its own margins where a reader has asserted the cells are
commensurable. The first is smallest and the second is the one that is actually true of long
tables, where each measure may count something different.

**Revisit the Manila sea-level example, which reports no sea level.**
_Raised 2026-10-26 by the practitioner: **"that is a useless worked example if titled sea level
rise."** Checked, and the criticism holds._ `assignSites` reads the AR6 extract **only to narrow
which gauges are usable** — `usable` is the set of sites whose `site_id` appears in the extract —
so the 288 projected values are imported, contract-checked, carried through a ruleset with three
obligatory AR6 citations, and never read. The output is facility → gauge → distance. As a
sea-level example it delivers no sea level, and its title claims the one thing it does not do.
This is the D7 overclaim failure applied to a worked example rather than to a widget.

Refusing to model inundation stays right, and the answer given on 2026-10-26
dressed the gap up as that virtue, which it is not: not claiming inundation and never computing
a projection are different omissions.

**What it should report**, and can report honestly: the projected change at each facility's
assigned gauge, with scenario, year, quantile and vertical-land-motion family named in the
output — "+X mm by 2100 under SSP2-4.5, median, with VLM". Real, uses the data it ships, and
still not an inundation model.

**What blocks it is one named limit.** The extract is keyed `site_id, scenario, basis, family,
year, quantile`; the assignment is keyed `point_id, projection_site`. Carrying the value across
is a join of two tables on a shared column, which the 0.12.0 release notes already record as
missing. Slicing the extract to one scenario, year, quantile and family is `select_rows`. The
example stops exactly where the application stops.

Until it reports a value, the note should say the projections are validated but not reported —
today it says what it will not claim and is silent about what it never computed.

**Check the two remaining sea-level widgets in the same pass**, which the practitioner has
flagged to review: `slr_site_assignment` is listed in the Duplicates row as a one-off of
nearest-neighbour-with-distance, and `slr_threshold_comparison` this file has called *"genuinely
domain-bound"*, which under the domain-agnostic direction is a question rather than a settled
exemption. Both are still classified `domain` in `widgets/classification.json`.

## Deferred — decided to do later, which is not a decision to do it

_Carried over whole from the root `TODO.md` of 2026-10-10 in the merge above, headings
demoted one level and nothing else changed. An item here is a decision to do it later._

### In progress

- **Act on [the widget design audit](docs/audits/widget_audit.md)**, run 2026-10-09 against
  all 39 widgets. Complete on D1, D2, D7 and D10; sampled on D3, where the first sample
  found an unenforced distinction, so the exhaustive D3 pass is the next step. Its six
  ordered actions are the near-term work.

### Snow's denominator: wire up `snow-gboh`, then South London

**Raised in priority 2026-10-23 at the practitioner's direction**, on the day they met the same
lesson in their own work: a WorldPop raster is a denominator for health zones in Ituri, and a
case count without one is the Soho map again. This is that lesson on data where the answer is
known.

Two steps, deliberately in this order. Both came out of the practitioner asking, 2026-10-19,
*"what other epidemiological computations are possible with Cholera Outbreak data aside from
epidemic curve?"*

### 1. Wire up the data already in the repository

`examples/snow-gboh/` has been present since 2026-10-09, with a `provenance.json` that records the
source digest, the four limits and the licence reasoning — and **no file in `src/` references it.**
It holds `deaths_nd_by_house.csv`: 1,852 houses from the 1855 General Board of Health map,
**including the 1,483 where nobody died**, 706 deaths (661 residents, 45 non-residents), and
precomputed distances to the Broad Street pump, the former pest field and the nearest sewer grate.

Those zero-death houses are a denominator, which is what the 250 mapped death locations do not
have. The difference it makes, measured 2026-10-19:

| band from the pump | houses | deaths | deaths/house | % houses affected |
|---|---|---|---|---|
| 0–50 m | 45 | 84 | **1.867** | 55.6% |
| 50–100 m | 140 | 186 | 1.329 | 59.3% |
| 100–150 m | 283 | 204 | 0.721 | 41.3% |
| 150–200 m | 429 | 150 | 0.350 | 20.3% |
| 200–300 m | 724 | 78 | 0.108 | 7.5% |
| 300 m+ | 231 | 4 | 0.017 | 1.3% |

Monotone across a 110-fold range. The same gradient computed from the 250 mapped points — which
condition on a house having had a death — runs 3.33 down to 1.00 and is barely a gradient at all.
**Same outbreak, same pump, and the selection decides the finding.** That contrast is a better
teaching artifact than either table, and it is this project's "a number needs a denominator" lesson
in its own data.

Three things this makes possible that no workflow does today:

- A rate with a real denominator. `validate:evidence` reports `rate` as one of four widgets at the
  **weakest evidence rung**, and this is the example where `minimumDenominator` and `rateKind` do
  actual work.
- The competing 1854 hypotheses tested against each other. `dis_pestf` and `dis_sewers` are the
  miasma explanation's own candidate exposures, sitting in the same file as `dis_bspump`.
- Resident against non-resident deaths. 661 and 45, and the file's own limits note warns that
  `deaths` "mixes a numerator that includes visitors with a denominator of dwellings".

**Two constraints, both already recorded in that `provenance.json` and neither to be worked
around.** The coordinates are OSGB 1936 / Airy 1830 and this application deliberately performs no
datum shift, so the analysis is tabular and uses the distance columns — there is no map. And the
licence is *"GPL, version not stated by the publisher"*: redistribution verbatim is aggregation and
does not affect this repository's Apache-2.0 licence, but **"a reprojected, filtered or otherwise
modified copy would be a modified work and would have to carry the GPL and be marked as
modified"**. So a workflow reads these columns; it does not ship a transformed copy of them.

### 2. South London, as its own repository, imported as a bundle

Snow's other 1854 investigation — Southwark & Vauxhall against Lambeth, two companies whose mains
ran down the same streets, one drawing from the sewage-laden tidal Thames and one from Thames
Ditton after the Metropolis Water Act of 1852. Roughly 315 deaths per 10,000 houses against 37, a
risk ratio near 8.5, with exposure assigned by a chloride test because residents often did not know
their supplier. It is the study with the denominator, and the ancestor of the cohort design.

It is **not** in this repository, and adding it as a worked example is the expensive route: example
data is imported at build time, and a new `exampleId` touches the closed union in `types.ts`, the
`template()` dispatch, `NAMED_WORKSPACES` twice, the static picker options in `index.html`, the
deep-link allowlist and `loadExample`'s per-example selection — the *"examples are the default
world"* problem in the one place it is least visible.

So: a separate repository, imported as a `fieldwork/bundle/1` workflow into the **1854 Cholera
Outbreak in London** project ([122](docs/experiments/122-a-project-holds-many-workflows.md)). A
project holding imported workflows is the practitioner's own request from the same day — *"create
project, import workflows into project"* — and a South London table is kilobytes against a 500 MB
bundle ceiling (20 MB when this was written; raised 2026-10-22 and again 2026-10-23). The separate repository earns its keep on licensing rather than architecture: it
isolates third-party data and lets a derived copy carry the source's own licence without touching
Fieldwork's.

**Settled 2026-10-23: it does.** `geodacenter.github.io` answers `access-control-allow-origin: *`
for HTML and for a `.zip` asset, `pages.github.com` the same, and `raw.githubusercontent.com` the
same on GET. So runtime loading from another repository does not hit the DHIS2 and geoBoundaries
wall and vendoring is not forced. One trap recorded with it: **HEAD on `raw.githubusercontent.com`
returns no such header and GET does**, so a HEAD-only probe would have sent this the other way.

**A caution worth keeping in view.** The South London study's power is not spatial — it is a 2x2
contrast of two intermingled populations. A worked example in a semantic GIS studio whose central
computation is a table with no map is defensible, and it is a departure. Mapping it needs 1850s
sub-district boundaries, which is the hard acquisition; the table is the easy part.

**Neither started.** Step 1 needs no acquisition, no new repository and no licence manoeuvre — only
a workflow — which is why it comes first.

### A workflow keeps being called the example it started as

The practitioner, 2026-10-23, looking at a canvas holding a study area, a WorldPop raster, a
clipped raster, a street network, health facilities and a map, under a caption instructing them to
draw and run a rule:

> *"The text 'Experiment 01 · draw → inspect facts → run the rule' before the Reset Layout button
> seems to be stale content."*

It is, and not in one place. `exampleKey` resolves to `blank` and the `blank` branch of `render`
sets **four** captions unconditionally: `#example-note` ("Experiment 01 · draw → inspect facts →
run the rule"), `#canvas-example` ("STUDY AREA · EXPERIMENT 01"), `#project-description` and
`#footer-context`. All four are pinned to the example IDENTITY and none to the content.

**There is no divergence check anywhere.** The application knows a worked example ships and stays,
and offers Reset example to discard edits to it, and nothing compares a canvas to the template it
came from. So the one workspace designed to be built in is the one that goes on describing itself
as a scripted exercise.

It compounds through the project level: `exampleKey` returns `blank` for ANY workflow carrying a
`projectId`, so a workflow inherits Experiment 01's captions the moment it joins a project --
which is the thing [131](docs/experiments/131-project-and-workflow-lifecycles.md) is encouraging.

**What it would take.** `template(key)` already exists and is what Reset example restores, so
divergence is computable by comparing the canvas against it. When they differ the note stops
asserting a recipe and the eyebrow stops claiming EXPERIMENT 01. The test is a canvas built on the
blank workspace that is no longer called Experiment 01.

**Where it belongs.** With 131 rather than beside it. "No longer the example it started as" is a
lifecycle fact about a workflow, and Draft, Run, Stale and Refused have no word for it. Whether it
needs one, or whether the captions should simply fall silent, is the design question -- and by the
rule this project already has, the word goes in the glossary before it goes in a panel.

### Parity is keyed to a version, so a cosmetic release invalidates real evidence

Found 2026-10-23 by the gate, not by reading. `clip_raster` was bumped 1.0.0 -> 1.1.0 for a node
label field, and the widget catalog immediately began reading **`partial · earlier release`**: its
parity entry carries `coversRelease: 1.0.0`, and `src/catalog-ui.ts` marks any entry whose covered
release is not the current one.

The ledger is right and the cost is real. **The bump could not have changed the clipping the
parity run measured** -- a label field is not a raster mask -- and the evidence was still
invalidated, because parity is pinned to a version string rather than to what the release changed.
`validate:widgets` now lists clip_raster beside `access_policy` and `xpert`, which are stale for
the same reason, and parity is recorded for 23 of 55 widgets, so the pool this erodes is already
small.

**What it would take.** Either parity entries say which release range they still cover, or a
release declares whether it touched the computation parity measured -- `changes[].kind` already
distinguishes `fix` from `changed`, so the information is half there. Re-establishing parity needs
a run in the validation lab and cannot be edited into the ledger, which is the right constraint
and also why the stale list only grows.

**Not a reason to stop bumping.** The alternative is a release note that does not exist for a
control a practitioner can see, which is the fault paid off earlier the same day.

### The planning stage: where a note about the world goes

Raised 2026-10-24, reading Snow's chloride measurements: *"The tide part is interesting because
Cholera vibrio survives inside copepods."* ... *"we do not have a dive deeper class for historical
notes. Perhaps we can now incorporate it in the planning part of the workflow (that's pre-workflow
and undeveloped) as we have planned earlier? That way we can capture Snow's narratives, and with
the historical notes we can then create our story map."*

There are three places a sentence can go today and none of them fits. `provenance.json` is for
claims about the DATASET; Dive Deeper notebooks are keyed to a `nodeType` and are about a widget's
method; Inspector prose is scored per explanation against a 240-character limit and is where a
control is explained. A note about the world the data came from has no home.

[Experiment 27](docs/experiments/27-workflow-learning-and-gamification.md) already proposed one --
a side notepad to plan, prototype and reflect, with dated iteration notes and a stated boundary
against source citations -- and it has never been built.

**The task is not the filing.** Sharpened the same day: *"The elegant part comes in if we include
story map structure as the frame for both the historical notes and the workflow. How to combine
them is a genuine DE question."* So
[133](docs/experiments/133-the-planning-stage-and-historical-notes.md) asks whether a story map's
structure can be the frame a workflow is PLANNED in rather than a presentation applied to one
afterwards -- sections written first, each binding a claim, the context that motivates it, and
the outputs that evidence it. That binding is what would make assurance expressible: a reader
asking "was this made under conditions I would accept?" asks it of a claim, and this application
has no object that is a claim.

**And the danger is the question.** Writing the story first is how evidence gets fitted to a
narrative. The discipline that makes it honest is 27's own prompt -- *What do I predict?* -- and
the test is whether a section contradicted by its run survives and says so.

**Why it is more than tidiness.** [119](docs/experiments/119-can-this-tell-a-story.md) found the
three measurable conditions for a good story already present and *scattered*, with assurance
missing; [17](docs/experiments/17-workflow-publication-products.md) wants a story map as an end
product. A story map needs the sentences between the layers, and there is nowhere to write one
that belongs to the investigation rather than to a widget, a dataset or a control.

**First subject if built**: the copepod note on the South London example, which must read as
modern knowledge about the world Snow worked in and not as something his 1855 text claims.

_The design below, and the test of it against Snow's own publication, are written up in
[141](experiments/141-organising-snows-notes.md). Read that first: it is where the shape was
tried before anything was built, and it names three things this list does not._

### Why notes, stated by the practitioner 2026-10-26

*"Notes are user documentation that provides the contextual scaffolding for the workflows. Like
in a Jupyter Notebook, the computations are not as useful by themselves. Only when they are woven
together by narrative will they begin to make sense and become a story."*

This is the premise the three levels below answer to, and it is not a request for metadata. A
notebook's markdown cells are not annotations ON the code; they are the medium the code is read
IN, and removing them leaves something that runs and does not mean anything. The claim is that a
workflow is in the same position: a canvas of correct computations that no reader can assemble
into a finding.

**It corrects an objection made the same day.** This file argued that a note widget "is not an
operation" -- it takes no ports and computes nothing -- and costed it against the widget budget
at 49 against a target of 41. A markdown cell is not an operation either, and no notebook treats
that as a defect. The budget exists to stop DUPLICATE AND CONFUSING COMPUTATION; narrative is
not competing in that space, so the widget count is the wrong instrument for it. If a note is
refused, it must be refused for a reason that applies to notes.

**What a notebook has for free and a canvas does not: reading order.** A notebook's narrative
order IS its execution order, so weaving needs no extra machinery. A workflow is a graph with no
single order, and that is the real obstacle to "woven together" here -- not the writing.

Except this project already computes an order. `src/reveal-playback.ts` plays a worked example
back **one widget at a time**, and says the order "is computed here and nowhere else" so the
measurement and the interface cannot disagree. That is the spine a story needs, built for a
different purpose (experiment 112). A story, on this reading, is the playback sequence with the
narrative attached to its steps -- which would also give [17](docs/experiments/17-workflow-publication-products.md)'s
story map its sentences between the layers, and answers [119](docs/experiments/119-can-this-tell-a-story.md)
in the affirmative with a mechanism rather than a hope.

Not a decision. It is the connection worth testing first, because it costs a view over existing
data rather than a new object in the model.

### The shape notes should take, specified by the practitioner 2026-10-26

Three levels, all **markdown so they can be formatted**, each answering a different question.

| Level | Role, in the practitioner's words | What it extends |
| --- | --- | --- |
| **Widget** | notes on a widget "so their outputs can carry the notes" | `map_output` already carries `mapTitle`, `mapSubtitle`, `mapSourceNote`; no other output carries anything |
| **Workflow** | "its own widget ... its role is to provide context for the workflow. If it's a workflow for a methods section of a publication, it describes the method in detail, and its limitations" | nothing. `Workflow` has `name` and no prose field |
| **Project** | "describes how the workflows are sequenced and stitched and rationale for selection and sequencing, also synthesized project findings" | `Project.subject`, which is one line |

The three are not one feature repeated at three scales. A widget note is **about a result** and
travels with it; a workflow note is **a methods section**, which is a claim about how something
was done and what it cannot show; a project note is **synthesis**, which is the only one that
can say what the whole investigation found. Only the second is proposed as a widget.

**Each note is mapped to a purpose.** The practitioner, 2026-10-26, completing the shape. A note
is not free prose with a location; it carries a declared purpose, which is what lets anything
check it. The candidates the project's own gaps name — not a settled vocabulary:

| Purpose | What it answers | Already wanted by |
| --- | --- | --- |
| **source** | where these numbers came from, and of what vintage | the 1851 census against 1854 deaths, which has nowhere to sit on the 2x2 |
| **method** | how this was done | a workflow standing in for a methods section |
| **limitation** | what this cannot show | *"describes the method in detail, and its limitations"* |
| **rationale** | why this step, and why here | project-level *"rationale for selection and sequencing"* |
| **context** | what a reader needs that the data does not say | the copepod note in [133](133-the-planning-stage-and-historical-notes.md) |
| **finding** | what it means | project-level *"synthesized project findings"* |

**A narrative purpose, which is a second axis.** The practitioner, 2026-10-26: *"notes can be
used to provide the meat for research publications so organized around Title, Abstract,
Introduction, etc. In fact epidemiologists have a structure for it."* Named the same day:
**IMRaD**, and *"it's in the FETP training materials"* — the Field Epidemiology Training
Programme, which is where the practitioners this application is for learn to write up an
investigation. That is the frame, not a journal reporting checklist: STROBE and its RECORD
extension exist and are a different instrument, aimed at manuscripts rather than at teaching the
structure of a report.

Choosing the one the audience was trained in matters more than choosing the stricter one. An
epidemiologist meeting a Methods heading in this application should meet the heading they were
taught, in the order they were taught it.

So a note has two coordinates, and they answer different questions:

| Axis | The question | Example |
| --- | --- | --- |
| **Functional** | what this note does for a reader of the workflow | `source`, `limitation`, `rationale` |
| **Narrative** | where it belongs in the write-up | Introduction, Methods, Results, Discussion |

A `limitation` note belongs in Discussion; a `source` note belongs in Methods under data
sources. The same note carries both and neither determines the other, which is the argument for
two fields rather than one merged vocabulary.

**What this makes possible, and the line not to cross.** With a narrative purpose a project can
report which parts of the structure carry a note and which do not — a completeness view, which
is a real practice. It must never report that a write-up IS an IMRaD report, or that it meets any
checklist. Whether a section is adequately written is a judgement by a person; this application
can see only that text exists under a heading. Claiming the former from the latter is the
overclaim this project names as D7, and it would be the worst instance of it yet, because a
reader would take it as a credential. Say "Discussion carries no note", never "report complete".

The headings must be taken from the FETP materials rather than recalled here.

**Why this is the load-bearing part.** A purpose makes a note CHECKABLE, and that is the
difference between documentation and scaffolding. A figure leaving the application with no
`source` note can be named; a workflow offered as a methods section with no `limitation` note is
incomplete in a way a gate can see; a `source` note is the one that must travel with an output.
None of that is possible over undifferentiated text. It is the same discipline the rest of this
project already uses — declared data over prose — and the unit field is the standing
counterexample of what happens without it.

**The risk, from the practitioner's own rule.** A closed vocabulary too narrow forces a writer to
file a note under a purpose it does not have, and *"if you design the text as non-editable, that
destroys the flexibility of the widget."* Whether the list is closed, closed-with-an-other, or
open and merely suggested is undecided, and the honest default is to watch which purposes get
used before fixing the set.

**What is NOT settled, and should not be inferred from the above.**

- **A note widget is not an operation.** Every other palette entry takes ports and computes
  something; this one would take nothing and compute nothing. It costs a palette entry and takes
  the budget from 49 to 50, against a target of 41 — which is the cost this project keeps
  paying and has twice refused to pay for lesser reasons. Whether context belongs on the canvas
  or in the Workflow tab beside the name is the first question, not a detail.
- **How far a widget note travels.** "So their outputs can carry the notes" settles that it
  reaches the figure. Whether it reaches a DOWNSTREAM widget is the provenance-as-output-port
  question raised on 2026-10-26, and the answer there was that a ruleset requiring provenance
  transmits it and the receiving widget must display it. A note is weaker than an obligation and
  should probably not inherit that machinery.
- **Markdown needs a runtime renderer, and there is none.** `scripts/widget-manual.mjs` converts
  markdown at BUILD time with a hand-rolled escape-then-regex pass and no dependency. A note is
  typed by a person, saved in a workflow, and **shared** — so it renders in someone else's
  browser from text this project did not write. Escape-first is the right order and already the
  precedent; one converter with two callers beats a second implementation.
- **What a note does to a run.** Receipts record acts rather than performing them, so editing a
  note is an act and not a recomputation. Whether a run records the note it was current with, and
  whether changing one marks results stale, is undecided — and getting it wrong makes a figure
  carry a methods section that was written after the method changed.

**Second subject, found 2026-10-26 reviewing the contingency margins with the practitioner:**
*"These are the details that need to get into the workflow notes — 3 years apart."* The
people-denominated 2x2 divides **1854 deaths by an 1851 census population**. South London was
growing fast, so the denominators are understated and every rate correspondingly overstated;
it biases all three supply groups the same way, which is why the ratio survives it better than
any single rate does. A reader cannot see this anywhere on the figure. `survived` is the same
kind of claim one layer further out — a residual, population minus cholera deaths, counting
everyone who did not die of cholera in seven weeks including those who died of something else.

Both belong to the investigation rather than to a widget, which is exactly the gap above. Note
what already exists and does not reach this figure: `rate` carries `numeratorPeriod` and
`denominatorVintage` as declared fields and **compares them** — South London's rate nodes
already say "the seven weeks ending 26 August 1854" against "the census of 1851" — but the
contingency workflow is `table_input → table_output` with no rate in it, so nothing carries the
mismatch. A note is the general answer; see also the nearer one below.

### What is actually blocked

Everything else in this file is waiting on one of these, or is a defect that nothing is waiting on.

**Both of the two blockers recorded here were wrong when re-derived on 2026-10-12**, which is
why they now live in `widgets/blockers.json` with a liftTest and a revisit clock rather than in
prose. The practitioner's rule: even blockers are not permanent, and each should be revisited in
DE mode.

1. ~~**No widget can put a raster value onto a point.**~~ **Lifted.** `sample_raster` 0.1.0 is
   registered, implemented and executable — points + raster → points — and has been since
   2026-10-12. This entry still read "Designed in
   [67](docs/experiments/67-sample-raster-at-points.md); not built" while `docs/todo.md` had
   already noted "now done" in the middle of a paragraph about something else, so the project
   held the stale claim and its refutation at the same time.
2. **There is no typed field schema beyond point attributes.** True, and **narrowed**: it was
   recorded as blocking the ruleset widget outright and it blocks only the *general* form of it,
   where any field of any input binds to a declared role. It does not block the merge that
   reduces the widget count, because the three fact generators take typed carriers rather than
   attribute tables — `makeN3(NearestRow[])`, `accessN3(AccessRow[])`, `facilityN3(Facility[])`.
   A blocker stated one size too large had been stopping work it did not block.
   `src/attribute-schema.ts` still covers `PointCollection` only; table, raster and network have
   nothing, and that is what remains true.

### Known defects, not blocking

Recorded because they are real, ordered by nothing in particular. Each says what it waits on.
A defect is not a blocker unless something is waiting on it — filing them as "correctness,
highest first" overstated every one of them, and led to patching two things that need
rebuilding (lesson 13 in [62](docs/experiments/62-workflow-traversal.md)).

- **`slr_threshold_comparison` compares a projected change to an elevation on an unchecked
  datum.** Valid only when the elevation is referenced to the projection's baseline sea
  surface; the field is free text checked for non-emptiness, and the unit fixtures satisfy
  the condition implicitly so the suite cannot see a mismatch.
  [62](docs/experiments/62-workflow-traversal.md) ·
  [58](docs/experiments/58-sea-level-widgets.md)
- **Postponed, deliberately: all sea-level pack work.** The exercise's major gap is that no
  widget can put a raster value onto a point, so the worked example cannot be completed with
  real facility elevations however good the extraction script is. The script's *interface* is
  also wrong, not only its internals — it is shaped around the 38 GB sample store rather than
  the summary files, and takes one `--site` where it should resolve a site set from a study area
  against the Philippine index the pack already ships
  ([62](docs/experiments/62-workflow-traversal.md)). Patching it in place would cost a pack
  version bump and a catalog re-pin to ship a patched version of something due for rebuild, which
  is lesson 13. **Build the sampling primitive first** — now done.

  **Measured from the real data, 2026-10-09.** The first AR6 file this project has ever read:
  `total_ssp245_medium_confidence_values.nc`, pulled from the Zenodo archive by range request
  without downloading the 9.24 GB zip.

  | Fact | Value |
  | --- | --- |
  | `sea_level_change` units | **`mm`** — so `value_m`, the provenance's `unit: metre` and the host's throw-unless-metre are wrong by 1000× |
  | Dimensions | `(quantiles: 107, years: 14, locations: 66190)`; years 2020–2150 by decade; the 66,190 locations match what 47 records |
  | Quantiles 0.17 / 0.5 / 0.83 | Present as **exact** float64 matches, so selecting on them directly is sound |
  | Manila, location 145 | Present at 14.58 N, 120.97 E, matching the bundled site index |
  | Manila ssp245 2100 | 963 / **1124** / 1366 mm at q0.17 / q0.5 / q0.83 — a median change of 1.124 m |
  | Baseline period | **No global attribute carries it.** The script's warn-and-refuse-to-assume fallback is correct and is vindicated |
  | `source` attribute | `pboxes/pb_1f/ssp245/total-workflow.nc` and `pb_1e` — the medium-confidence file is a **p-box across workflows 1e and 1f**, not a single-workflow output |

  **A real extract now exists.** `validation-lab/content/results/ar6-philippines-gauges-extract.csv`
  — 288 rows, 0 missing, keyed `site_id, scenario, confidence, family, year, quantile, value_mm`
  over the 8 published Philippine tide gauges, three scenarios, 2050 and 2100, the median and the
  likely range, both dataset families. Produced by `validation-lab/scripts/extract_ar6_philippines.py`
  from 447 MB of archive members fetched by HTTP range rather than 18 GB of zips.

  **The two dataset families differ by up to 87%, and in both directions.** ssp245, 2100, median,
  in millimetres:

  | Gauge | with VLM | without | difference | ratio |
  | --- | --- | --- | --- | --- |
  | **MANILA** | **1124** | **602** | **+522** | **1.87** |
  | SAN_JOSE | 857 | 604 | +253 | 1.42 |
  | LEGASPI | 778 | 612 | +166 | 1.27 |
  | DAVAO | 605 | 598 | +7 | 1.01 |
  | TACLOBAN | 603 | 614 | −11 | 0.98 |
  | CEBU | 578 | 608 | −30 | 0.95 |
  | SURIGAO | 586 | 614 | −28 | 0.95 |
  | JOLO | 542 | 600 | −58 | 0.90 |

  Without vertical land motion every gauge clusters at 598–614 mm, because the ocean and ice
  contribution is near-uniform across the archipelago: **all of the spatial variation is land
  motion.** Manila is subsiding hard enough to double its projection, while Jolo's land is rising
  enough to reduce it. A practitioner who did not know which family they held would be wrong by
  half a metre in Manila and wrong in the *opposite direction* in Jolo.

  **The land-motion term is linear in time, measured from the data.** The ratio of the
  with-minus-without difference at 2100 to the same at 2050 is 2.10–2.11 at every gauge carrying
  a meaningful signal, against 2.11 for a term strictly linear from the baseline midpoint of
  2005; the implied rate is constant to two decimals (Manila 5.51 mm/yr at 2050, 5.49 at 2100).
  Gauges whose difference is only 4–11 mm scatter, which is integer-millimetre rounding at that
  magnitude.

  That matters for how the example must describe the number. A linear term **extrapolates an
  observed trend** and represents no future change in groundwater policy, so it can show neither
  a crackdown on extraction nor an acceleration. And Manila's implied 5.5 mm/yr is roughly
  **half** the ≈10.1 mm/yr subsidence measured at the Port of Manila from tide-gauge and
  satellite records, with Bulacan extraction hotspots reaching 109–124 mm/yr. The with-VLM
  figure is therefore likely to **understate** Manila's subsidence rather than overstate it —
  the opposite of what a reader might assume about the "higher" family.

  [Experiment 47](docs/experiments/47-sea-level-pack.md) predicted exactly this — "where land is
  subsiding appreciably, the two answers can differ enough that a reader who did not know which
  they were looking at would reach a different conclusion" — before anyone had opened a file. It
  is now measured.

  The known defects, now including one only the real data could reveal:

  - **The `workflow` label is wrong for these files.** The script defaults `--workflow wf_1e`
    and records it as the workflow. The medium-confidence file is a p-box combining `pb_1e` and
    `pb_1f`, so labelling it `wf_1e` asserts a single workflow the data is not — and the pack's
    own vocabulary says *a quantile is not a p-box bound*. The extract must carry the p-box
    identity, not a workflow id, or carry a workflow id only for files that have one.
  - **The unit must be read, not assumed.** `units: 'mm'` is in the file. Read it, and either
    convert explicitly with the conversion recorded in provenance, or refuse when it is not the
    expected unit. Do not keep a column named `value_m` fed by millimetres. `scripts/extract-projection.py` in the
  pack repository loops over scenarios but never selects on scenario, so one file yields
  identical values under three scenario labels; `workflow` and `family` are likewise
  unverified CLI labels; the output column is `value_m` and the provenance asserts
  `unit: metre` while AR6 publishes millimetres and nothing reads the file's `units`
  attribute; and the input is hashed with a whole-file read despite the stated 38 GB
  source sizes.
- **`check-pack.py` fails before any check runs.** Retiring `contents.widgets` to
  `retiredWidgets` left the validator reading a key that no longer exists, so pack CI is
  red. The validator is part of the contract.
- The three sea-level widget release files still say `implementationStatus: blocked` /
  `proposed`, `definition: "not implemented"` and "No implementation exists", with no
  retirement marker pointing at the host widgets that now implement them.

### Primitives and ports

- **A street network from a CSV edge list** (raised 2026-10-14, not an experiment yet —
  investigate first). `network_input` takes OSM or a GeoJSON-shaped file today. A network is
  also, commonly, two CSV columns: `node1` and `node2` (or `connects_to_node`), one row per
  edge. That is how a network arrives from a field survey, a spreadsheet of paths between
  settlements, or any system that never held geometry. Questions to settle before designing it:
  where do node *coordinates* come from (a second CSV of node id, lon, lat? a join to a point
  layer already in the workflow?); where does `lengthM` come from when the CSV carries no
  geometry — computed straight-line between node coordinates, which makes every edge a lower
  bound, or taken from a column the surveyor measured; and whether an undirected edge list
  means one row or two, since `prepareEdges` works on directed edges. Reuses the CSV import
  this project already has. It would let a network be *authored*, not only downloaded, which
  matters where OSM is thin — the same places experiment 114's off-network leg is about.

- **Settle [66](docs/experiments/66-ports-as-schema-binding.md) before any port work.** A
  connection is a schema binding: eight of fifteen port types are private wires between two
  named widgets, tracing the Old Naledi and heat pipelines, and `mean-center` has no consumer
  at all. Fifteen types resolve into roughly four carrier kinds plus declared contracts. This
  supersedes the port advice in [62](docs/experiments/62-workflow-traversal.md) and Phase 4 of
  [64](docs/experiments/64-widget-streamlining.md), and shares one mechanism with
  [61](docs/experiments/61-input-dimensions.md) and
  [65](docs/experiments/65-ruleset-as-data.md).

- **A ruleset widget, with the ruleset as declared data.** Designed in
  [65](docs/experiments/65-ruleset-as-data.md): replaces `policy`, `xpert` and
  `access_policy`, puts the configuration knobs on the ruleset rather than the widget so
  each declares its own parameters with units, and retires `gradedFacilities` — one of the
  six producer-named port types — onto the general `decisions` stud.

- **A primitive that samples a raster at a point.** Nothing in the application can put a
  raster value onto a point, so the elevation attribute `slr_threshold_comparison` requires
  cannot be produced here at all. Generic: serves population density, rainfall, temperature
  at a location. [62](docs/experiments/62-workflow-traversal.md)
- **Move the vertical reference from the comparison node to the input.** The enforcement is
  done — `slr_threshold_comparison` now refuses an undeclared or non-baseline reference instead
  of silently comparing incommensurable numbers, with three tests — but the declaration sits on
  the comparison node as a parameter, and this item and
  [62](docs/experiments/62-workflow-traversal.md) both say it belongs **on the input**, so the
  elevation-bearing layer declares its reference once and every consumer reads it. The
  behaviour is durable; the location is interim and moves with the typed field schema.
- **A vertical reference as an enumerated declaration on the input**, following
  [61](docs/experiments/61-input-dimensions.md)'s pattern, with the comparison refusing when
  the elevation's reference and the projection's baseline cannot be related.
- **Narrow the port types for the four wrong-producer run-time checks** — `assignments`,
  `series`, `projection-extract` — so a plain table cannot be connected where a specific
  producer is required. Makes those checks unreachable. The other eight `Connect …` checks
  are presence, arity or graph-shape conditions and belong in `validateWorkflow`, not in
  port types. [62](docs/experiments/62-workflow-traversal.md)
- **A keyed join as an internal primitive**, replacing three separate implementations of
  nearest-neighbour-with-distance and underpinning the six composites that currently carry
  their own copy. Internal only: not a palette entry.
  [60](docs/experiments/60-from-gis-studio-to-public-health-studio.md)
- Move the example-specific nodes off the palette into templates. Reduces what a
  practitioner must scan and stops `xpert`, `facilities` and `alert` reading as general
  tools.

### Reconstitute `xpert`

Not a blocker and not a bug to patch: `xpert` is one sound operation welded to one example at
every joint, and the disposition is to dissolve it rather than fix it. The name-keyed facility
match **was** a defect and is fixed (id-keyed, with two tests), but that is interim protection
for the current shape, not the destination.

What reconstitution means, from [65](docs/experiments/65-ruleset-as-data.md) and the bottom-up
derivation below:

- The operation is **rule application with a declared ruleset** — the general primitive. There
  is no `xpert` afterwards, only that widget plus a ruleset named for what it is.
- The NB06 hierarchy becomes a **declared ruleset**: its seven rules, its citations (Baik 2019,
  Mokomane 2024, Dickinson 2017 — from source notebook `06-Gaborone-Health-Facilities.ipynb`,
  not a published standard), and its declared output vocabulary of four evidence levels and
  four service categories.
- The named-evidence claims become **an attribute on the facility records**, bound to a declared
  role. The interim `NB06_NAMED_EVIDENCE` table in `src/old-naledi.ts` disappears with them.
- Input becomes the general features carrier with declared roles — ownership, facility kind,
  named-evidence status — replacing the private `facilities` port.
- Output becomes the general `decisions` carrier with the ruleset's declared vocabulary, which
  **retires `gradedFacilities`**, one of the six producer-named port types.
- Zero parameters becomes the ruleset's own declared knobs, bound per
  [66](docs/experiments/66-ports-as-schema-binding.md).

This needs the typed field schema that [61](docs/experiments/61-input-dimensions.md),
[65](docs/experiments/65-ruleset-as-data.md) and
[66](docs/experiments/66-ports-as-schema-binding.md) all converge on, so it follows that work
rather than leading it.

### Primitives derived bottom-up from NB06 / Old Naledi

Traced from the actual 12-node workflow on 2026-10-09, asking of each node what the general
operation inside it is. The workflow uses three primitives that exist — point import, study
area, the three outputs — and four example-welded nodes that contain **six general operations
between them**. That is the thick-domain-layer test from
[59](docs/experiments/59-pattern-for-engineered-knowledge.md) with a number attached.

| Needed by the workflow | Currently welded inside | Exists? |
| --- | --- | --- |
| **Select features by spatial relation to a polygon**, returning a filtered layer | `facilities` | **No.** `coverage_check` does point-in-polygon but returns a check, not a layer |
| **Representative point of an area** (a geometric centroid) | `facilities` | **No.** `mean_center` is the statistical mean centre of a point set, with its own refusal — a different operation |
| **Buffer a point by a radius** to form a selection region | `facilities` | Partly: `buffer_area` is area → area only |
| **Filter records by an attribute predicate** | `access` ("meeting your evidence criteria") | **No** |
| **Nearest join with distance** | `access`, and separately `nearest` and `slr_site_assignment` | **No** — already identified in [60](docs/experiments/60-from-gis-studio-to-public-health-studio.md) |
| **Rule application with a declared ruleset** | `xpert`, `access_policy`, `policy` | **No** — designed in [65](docs/experiments/65-ruleset-as-data.md) |

Two observations worth keeping. This workflow touches no table, raster or network — it is pure
vector — so every gap it reveals is **basic vector GIS**: select by location, select by
attribute, centroid, buffer, nearest. That is the core of any GIS toolbox, and it is absent
because each example that needed it received a welded widget instead. And `samples` is framed
as generating "demonstration points", which undersells it: sampling locations within a boundary
is a general operation and should be named and documented as one.

Four of the six are new findings from this derivation; the join and the ruleset were already
known. Doing the derivation on a second example — the heat workflow, or John Snow — would show
whether the same four recur, which is the test of whether they are general or particular to
this one.

### Seven widgets could not be added from the palette

Found 2026-10-09 by clicking Find healthsites facilities and watching nothing happen. The cause
is the one [experiment 48](docs/experiments/48-tabular-input.md) already recorded: **an
unconfigured node must be a valid draft.** `validateWorkflow` runs on every edit, so a validator
that demands a node's full contract makes that node impossible to add — `change()` rolls the
workflow back, and the canvas appears to ignore the click.

**Fixed:** `healthsites_discovery`, `buffer_point` and `sample_raster`, all added this session and
all repeating the recorded mistake. Each now has draft validation — what is wrong whenever it is
present — separated from a `requireRunnable…` check called at execution.

**Also fixed:** the add handler announced "*X* added" regardless of whether the add succeeded, so a
rollback looked like success. It now returns early when `change()` reports failure, leaving the
rollback's own message visible.

**Still broken, and pre-existing:** `slr_extract_import`, `slr_threshold_comparison`, `rate` and
`case_series`. They are reachable only from a template that already contains them, which is why
nobody noticed. Two of them I made worse today by adding required parameters — `basisKind` and
`elevationReference` — to validators that already ran on every edit. Each needs the same split.

`tests/palette-add.browser.mjs` now clicks every palette entry on a blank canvas and pins that
set, so it can shrink but never grow.

### The study area is Botswana-shaped

Found 2026-10-09 by adding the healthsites node to a blank canvas and trying to scope it to the
Philippines. The node correctly demanded a study area; supplying one was the problem.

- **Fixed.** Every Study area node described itself as "Old Naledi · Gaborone" regardless of its
  parameters, because `describe()` hardcoded that string for the type. A newly added node is
  `source:'drawn'` with no geometry, so the label was simply untrue. It now reports what the node
  holds: a drawn box or polygon, the dataset name, or "No boundary selected yet".
- **No point-and-radius option.** `AreaParams` admits a drawn bbox or polygon, or a named dataset
  — nothing else. `buffer_point` exists but takes a `points` input, so on a blank canvas a scope
  around a place needs a point layer imported first, which is a lot of work for "five kilometres
  around here". Either the Study area node gains a point-and-radius mode, or `buffer_point` gains
  a way to name a coordinate without a layer. The second keeps one scope-making operation; the
  first puts it where a practitioner looks.
- **No way to get to a place.** The map is interactive but has no search or navigation, so
  drawing a study area in Manila means panning from Gaborone. A geocoder is a remote service and
  [39](docs/experiments/39-stac-discovery-and-remote-acquisition.md) measured what that costs in a
  browser; the cheap alternatives are typed coordinates, a bounded gazetteer of the places the
  worked examples use, or accepting a bounding box as text.
- **The examples are the default world.** The blank canvas starts empty but every affordance
  around it assumes Gaborone. This is the same finding as the widget audit's example nodes, in the
  map rather than the palette: one demonstration's content presenting itself as the general case.

### Three widgets built 2026-10-09, none in a worked example

`npm run usage:widgets` after adding the Manila example:

```
never instantiated by any example (7):
  buffer_point, centers, find_health_facilities, places, rate, reproject, sample_raster
```

The first, third and seventh were built that day. D1 passed for each — experiments
67 and 68 argued the admission before the code, as the rule requires. D10 fails
for all three.

**D10 does not measure whether a widget was necessary, and it was read as if it
did.** The audit says what it measures: a widget no example instantiates "has
never been *shown composing* with the rest". It is a question about demonstration
to a newcomer. The practitioner used `buffer_point` and
`find_health_facilities` from a blank canvas on the day they were built — real
use, invisible to a check that only reads the shipped examples and frozen
fixtures. Reporting "zero instantiated" as "were they necessary" was an
over-claim from a tool that answers a narrower question.

The reasons the three are absent from examples still differ, and are worth
keeping.

- **`sample_raster`** has no consumer anywhere. It was called "real blocker #1"
  for reading elevation at facilities, and elevation is increment 2 of the
  sea-level example, which is not built. It should be demonstrated there or not
  kept.
- **`buffer_point`** derives a study area from a named point in a layer. The
  study-area editor gained a hand-drawn circle tool the same day. The two are not
  duplicates — one is derived from data and reproducible, the other is drawn, and
  the project already distinguishes drawn from derived areas — but the derived
  one has never been used, so the distinction is asserted rather than shown.
  Increment 2 would use it: a study area from the Manila gauge rather than a
  hand-drawn box.
- **`find_health_facilities`** was listed here too, with the claim that a
  retrieval widget *cannot* be demonstrated by a bundled example because such an
  example must run offline. **That was wrong and is fixed.** A bundled example can
  hold a network-dependent widget carrying what it retrieved, which is exactly the
  state a workflow is in after one online retrieval. What it cannot do is reach
  the network when it runs. The Manila example now holds the widget with 194
  facilities and its own retrieval record, fetched through the widget's retrieval
  path so the provenance is real, and `npm run usage:widgets` no longer lists it.

  The mistake was reaching for an absolute instead of looking at the online-to-
  offline model already implemented and already covered by a passing test named
  "a stored retrieval replays with the network off, and asks no source for
  anything".

Also fixed: `scripts/widget-coverage.mjs` did not know about the Manila example,
so D10's mechanised check was under-reporting. A check that silently misses an
example is worse than no check for the widgets inside it.

### Reprojection goes one way only, because a layer cannot say where it is

Raised 2026-10-10 from the Inspector: reprojection is useful in more than one
direction and to more than one projection. The widget does WGS84 UTM to CRS84, at
import, and nothing else.

The obstacle is the carrier. `SpatialReference` is a type whose every field is a
fixed literal — datum `WGS84`, geometry CRS `OGC:CRS84`, units `degree` — so a
layer cannot state that it is in anything else. Reprojection can only happen on
the way in, or temporarily inside a widget.

The cost is countable: **five widgets each ask the practitioner for a UTM zone**
(`mean_center`, `compare_point_sets`, `reproject`, `voronoi`, `isochrone`), and
`catchments.ts` carries its own `metric()` helper. The same question is asked
five times because the data cannot answer it. That is D5 firing for the first
time — a qualifier living in every consumer instead of on the input.

Three steps, in order, and the first is a carrier change:

1. A spatial reference that can describe a projected CRS. Belongs with the port
   work in [66](docs/experiments/66-ports-as-schema-binding.md).
2. Reprojection as a Compute widget: a layer in, a layer out, a stated target.
   The present node sits in Sources because it reads a file, conflating input
   with process.
3. Metric widgets reading the CRS of the layer they are given, and refusing one
   in degrees rather than assuming a zone.

Two limits stay whatever is built. A datum shift needs a grid this prototype does
not carry, and a clean conversion does not confirm the declared zone was right —
both already stated in the widget and worth keeping stated.

Full reasoning in [40](docs/experiments/40-reprojection-primitives.md).

### "Junction" counts every point in the graph, not every intersection

`networkFromOSM` adds both endpoints of every consecutive pair in every accepted way, so a network
node is each VERTEX a street is drawn with. The application calls these junctions throughout.

Measured 2026-10-19 on Buvuma Island, Lake Victoria: **11,359 network nodes against 661 places
where two streets actually meet — seventeen to one.** The practitioner met it as a download
refused by a "Graph limit (junctions)" of 2,000, believing that allowed a 2,000-junction network;
on that terrain it allows about 116 intersections. The 2,000 default was measured on Soho, where a
dense grid makes the two counts nearly equal, which is why nobody noticed and why the word is most
misleading exactly where the default binds.

**Not renamed, deliberately.** A first attempt changed the eleven places that COUNT network nodes
and left the term everywhere else, which gave one quantity two nouns. The word is load-bearing in
more than prose:

- **Ontology predicates** — `fw:junctionsInBand`, `fw:junctionsOffered`, asserted in receipts
  and checked by `validate:ontology-coupling`.
- **A widget title** — `reachable_nodes` is "Reachable junctions", so a rename needs a name
  review entry and a release, and its refusals quote it ("Add a Reachable junctions step").
- **A results field** — `coverage.junctions`, which the map caption and its tests read.
- Roughly sixty test assertions.

**Defining it is not available.** The practitioner, 2026-10-19: *"junction versus intersection,
that's a large discrepancy for two terms that mean nearly the same."* That is the whole problem.
`carrier` was an INVENTED term with no standard behind it, so withdrawing it was clean — nobody
had a prior meaning to unlearn. "Junction" is an ordinary English word for where roads meet, used
here to mean something seventeen times larger. A reader has no way to notice the redefinition,
because the ordinary meaning reasserts itself every time. A glossary entry would be read once and
overridden by the language thereafter.

So the resolution is to align the prose to the identifiers rather than the reverse, and the code
has already chosen: `Network.nodes`, `NETWORK_NODE_LIMIT`, and the node type `reachable_nodes`.
Only the human-facing text says junction. **That is this morning's `summarize_polygons` problem
inverted** — there the title was right and the identifier wrong; here the identifiers are right
and the titles wrong.

So this is a vocabulary decision of the same kind as `carrier`, not a find-and-replace: withdraw
the term with a ledger entry and a ceiling. What shipped on 2026-10-19 is
the Inspector saying what the number counts, with the Buvuma measurement, so the limit can be set
knowingly in the meantime.

**Also unmeasured:** whether 2,000 is the right default. It was measured against vertices; nobody
has asked what it should be as a limit on the thing that exhausted a 4 GB heap.

### Demonstrate Fieldwork importing from DHIS2

Requested by the practitioner, 2026-10-19: *"Spin up a DHIS2 instance with data and demonstrate
FW connecting to DHIS2 and importing data into a workflow."*

Three pieces, and the order matters because the second is the one that can fail on grounds nothing
in this repository controls:

1. **An instance with data.** DHIS2 publishes a demo database and a containerised stack, so this is
   a setup task rather than a research one. It has to hold organisation units with coordinates and
   at least one aggregate or event dataset, or there is nothing a spatial workflow can do with it.
2. **Reaching it from a browser.** Fieldwork runs entirely in the page and acquires over `fetch`,
   so a DHIS2 import depends on that instance sending CORS headers and on an authentication method
   a browser can use without storing a password in a workflow — the Web API supports personal
   access tokens, which is the shape that fits how credentials are already handled here. This is
   the same wall the geoBoundaries acquisition hit, and the resolution there was to rewrite the URL
   rather than proxy, **because a proxy would put this project between a practitioner and their
   source.** A DHIS2 server holding real programme data makes that principle sharper, not softer.
3. **An import that records where it came from.** `## Input — getting the data` in the glossary is
   explicit that **an import is not an acquisition**: an acquisition replays from its request, an
   import can only be trusted if it records where it came from. So a DHIS2 import needs the server,
   the API version, the org-unit level, the dataset and period, and the time of retrieval — not
   just the rows.

**What it would establish, and what it would not.** It would establish that Fieldwork can take
data from the system most national health programmes actually keep theirs in, which is a claim
about reach that no worked example currently supports: every example ships its data in the repository.
It would not establish anything about *analysis* — the widgets downstream are unchanged — and a demo
instance is not evidence that a ministry's production instance will permit a browser to read it,
which is the question that decides whether this is useful or a demonstration. Worth recording as a
separate field question when it gets that far.

**Not started.** No experiment record yet; this is the note that precedes one.

### Stress-test the remaining caps, and find the examples that do it

[125](docs/experiments/125-caps-below-the-limit-we-are-testing.md) separated the caps that are
measurements from the caps that are guesses. Two of the guesses were corrected on 2026-10-20 — the
street-network graph limit, which measured isochrone memory and was applied to downloads, and the
download byte floor, which refused an extent this project ships. The rest are listed here with what
would actually stress them, because the practitioner's reason for wanting them loosened is the
project's reason for existing: *"we are here to develop a framework that tests the limits of the
browser — how are we going to make progress if we don't reach the limits?"*

A cap raised without a measurement trades a clean refusal for a hung tab, which is the one failure
worse than a refusal. So each of these wants a real artifact that reaches it, not a bigger number.

| cap | now | what would reach it |
|---|---|---|
| `MAX_TABLE_ROWS` | 2,000 | A real surveillance line list. Hagelloch is 188 rows; a national weekly series or a Project Tycho extract is tens of thousands. The table view, the data-quality profile and `case_series` all walk it. |
| `MAX_RASTER_CELLS` | 262,144 (512×512) | A WorldPop 100 m population raster for a district. The Old Naledi raster example already carries one; a province-sized window is the stress. |
| `GEOMETRY_BYTE_BUDGET` / `AREA_BYTE_BUDGET` | 1 MiB / 1.5 MiB | **Philippines ADM2.** An archipelago is the worst case for vertex count, it is this project's own domain, and DRC ADM2 at 6,386,010 bytes already shows a single level can exceed the whole store. Measured against `localStorage` when IndexedDB reports 200–2,000× more ([121](docs/experiments/121-storage-beyond-localstorage.md)). |
| workflow size | 50 nodes, 100 edges | An inline literal in `validateWorkflow` with no constant and no comment. A bundled composition explodes into its members, so exploding two or three in one canvas reaches it; the rulesets example is already four workflows on one canvas. |
| `MAX_POINT_LAYERS` / `MAX_POLYGON_LAYERS` | 8 / 6 | A map carrying every layer a cholera workflow produces — deaths, pumps, catchments, hull, network, reachable nodes, corridor. |
| `MAX_FACILITY_RECORDS` | 20,000 | Measured on Metro Manila. A country-level `find_health_facilities` query is the stress, and is also the courtesy question: whether this application should ever ask for one. |
| `OSM_PAUSE_MS` | 60,000 | Superseded rather than stressed: `/api/status` now reports the pause the service wants, so the fixed floor should become the fallback for when that read fails, which is what OSMnx uses it for. |

**What closing this looks like.** For each row, an artifact in `examples/` or a recorded acquisition,
the measurement of where the browser actually fails, and then a number — or a declaration in the
code that the number is a guess, which is honest and revisitable where an unexplained constant is
neither.

**Not started.** The two corrected on 2026-10-20 are the pattern: both turned out to be a downstream
widget's constraint applied upstream, which is worth checking for in each of these before assuming
the number itself is the problem.

### Let practitioners compose their own routine primitives

Four experiments: [78](docs/experiments/78-trying-compositions-on-isochrone.md) is the trial, on the isochrone case, where a control exists. Three admission reviews behind it: [75](docs/experiments/75-compositions-as-nodes.md) proposes the mechanism, [76](docs/experiments/76-composition-governance.md) the governance, and [77](docs/experiments/77-composition-drift-detection.md) drift detection. The notes below are what they were built from.

Proposed 2026-10-10. The project ships **core primitives**; a practitioner wires
the sequence they keep repeating and saves it as a reusable node of their own —
a routine primitive. A composite stays expandable, so opening it shows the steps.

Already specified twice and never built:

- [31](docs/experiments/31-facility-access-primitives.md): "Common tasks may be
  presented as a reusable subworkflow with an expandable internal graph, rather
  than requiring a beginner to configure every step."
- [prior art](docs/research/prior-art.md), on the QGIS Model Designer: "Future
  reusable subworkflows should expose a small public parameter set and retain the
  internal graph."

What is new in this proposal is **who composes**. The prior art reads as though
the project ships the subworkflows. If practitioners make them, the project can
stop guessing which composites are worth shipping — and the audit's nine example
nodes, which bake one demonstration's specifics into a palette entry, are the
case for it. Those should have been somebody's saved composition.

It also dissolves the teaching tension above without a tier scheme: one node for
whoever wants the answer, an open graph for whoever wants to learn.

### Governance is inherited, because a composition is closed over the registry

A composition may contain **only widgets in the registry**. That single rule
makes most of the governance free rather than new.

The application already enforces it. `core.ts` rejects any node whose type is not
in `TYPES`, so every workflow is already closed over the registry and a
composition built as a workflow fragment inherits the check without new code.

What that closure buys:

| Property | Where it comes from |
| --- | --- |
| Every member is versioned and digested | the widget registry |
| Every member passed the design audit | D1–D10, at admission |
| Every member emits a receipt | the execution contract |
| Every edge type-checks | `validateWorkflow` already does this |

So a composition needs no audit of its parts. What is genuinely new to govern is
small: its **name**, its **public parameter set**, and its **claim** — what it
says it does, which is where D7 applies and where a composition can mislead.

### Levels of governance, which already exist at both ends

A **widget** has a registry entry, a version, a digest, a release file and an
audit. A **pack** has a repository, a commit SHA, an admission status, named
reviews and a curated owner. A composition sits between them and can move up:

1. **Private.** Saved in one browser. Governed by nothing, which is correct —
   nobody else is relying on it.
2. **Shared.** Exported and sent to a colleague. Needs a name that does not claim
   more than it does, and the versions it was built against.
3. **Published.** In a composition repository. Pack-shaped: owner, commit, review
   state, admission.

The naming convention for compositions is the one piece with no prior art. The
widget convention governs node types the project controls. A practitioner naming
their own routine primitive is not bound by it, and should not be while the
composition is private — but a published one read as equivalent to a reviewed
widget is exactly the `xpert` problem with more authors.

### Version drift is not hypothetical. It already happens, silently

Not designed for. Forced instead, and measured, on 2026-10-10 —
`tests/composition-drift.test.mjs` with a fixture holding a widget removed the day
before.

**Fieldwork already floats.** A saved workflow names widget *types*, never
versions: every node is `id, params, type, x, y`, and all 76 release files declare
`versionPersistence: "not-yet-persisted"`. There is no field in which a version
could be recorded, so nothing can be compared and nothing can go stale. A workflow
opened after a widget changes gets the new widget, whatever it now does.

What a workflow saved on 2026-10-08 does today, when the widget it used was
removed on the 9th:

| | |
| --- | --- |
| Does it open? | Yes |
| Is the node rewritten? | Yes, to `find_health_facilities` |
| Is the practitioner told? | **No.** No warning, no note on the node, nothing in a receipt |
| Does any trace of the old type survive? | No |
| Its stored facilities? | Dropped, correctly — their provenance could not be carried — and **silently** |
| `country: "Philippines"` | Became `"PHL"`, a value nobody typed |

The dropping is right: that data's provenance was a hand-back of a file this
application never saw, and relabelling it would be a false record. The finding is
not the drop. It is that **everything above happens with no notification at all**,
and a practitioner reopening the workflow would see a configured node, a changed
country and no facilities, with nothing to explain any of it.

So the question for compositions is not how to prevent drift. It is what a
practitioner should be told when it happens, which can now be argued from a case
rather than from a hypothetical. The tests record today's behaviour; if loud
failure is introduced, they fail, and the change becomes visible.

### Label the worked examples with their public health scenario

Smallest step toward [79](docs/experiments/79-emergent-palette-slicing.md), and
the only one needed before the rest can be computed rather than argued.

Worked examples are named for their case — "heat outreach", "old naledi access",
"snow voronoi" — not for the kind of work they are. Adding one field, the public
health scenario, makes widget-to-scenario a computation over data that already
exists, the same way `usage:widgets` computes widget-to-example.

The structure is already visible without it. Measured across seven examples:
`observations`, `map_output`, `table_output` and `area` appear in six or seven;
`clip_polygons` and `summarize_polygons` appear together in the two catchment
cases and nowhere else. Nobody declared those four core. They emerged.

Two cautions, both recorded in 79. "Appears once" conflates scenario-specific
with newly added — `voronoi` and `find_health_facilities` are both at one, for
opposite reasons. And a filter that hides rarely used widgets is a quiet deletion:
the least used may carry the hardest-won distinction.

### GIS workflows 101: is there a teaching tier in the palette?

Raised 2026-10-10. Voronoi and isochrone hide their steps deliberately, because
composing them from parts asks a non-GIS public health professional to make too
many leaps at once. Taking a workflow apart is also how skill advances. Both are
true, so this is a question to observe rather than settle by argument.

The audit cannot express it. Both widgets are classified **Primitive** on D1's
axes — residual knowledge, asked for by name — and D1 has no axis for whether a
learner should see inside. `classification.json` has two values, `standard` and
`domain`, and no notion of a tier; the primitive-versus-composite judgement sits
in an audit the application never shows anyone.

Suggestive: **the three gaps the cholera notebooks exposed are all steps those
notebooks teach and the palette collapses** — weighted mean centre, convex hull,
routing. That is what you would expect if the palette were optimised for reaching
an answer rather than for learning how it is made.

Two things would settle it, and both are observations rather than designs:

- Does a learner who only used composites later compose something new?
  [27](docs/experiments/27-workflow-learning-and-gamification.md) already has the
  progression vocabulary and an exercise sequence; that is where to look.
- Does showing a composite's steps, without requiring anyone to wire them, reduce
  the leaps or add to them? The obvious risk is a palette that looks harder.

Not started, and deliberately not turned into a tier scheme. Reasoning in
[74](docs/experiments/74-notebook-first-worked-examples.md).

### Three primitives the cholera notebooks ask for

Derived 2026-10-10 by reading eleven notebooks across the Basic, Advanced-1 and
Advanced-2 case studies and mapping each operation to the palette. Full table in
[cholera-notebooks-to-primitives.md](docs/research/cholera-notebooks-to-primitives.md),
method in [74](docs/experiments/74-notebook-first-worked-examples.md).

These are wanted because an analysis performs them, not because they seemed like
good ideas.

- **Weighted mean centre.** `mean_center` records its method as "Unweighted
  arithmetic". Snow's data is 250 locations carrying 489 deaths; the centre of
  the locations is not the centre of the deaths, and one of this project's own
  practitioner questions is whether a reader can tell those apart. `case_series`
  already takes a weight field, so the concept exists and this widget lacks it.
  Smallest of the three, and it sharpens a distinction already being taught.
- **Convex hull.** Both Advanced studies derive a boundary from the data rather
  than drawing one. Already recorded in `docs/research/john-snow-voronoi.md` —
  hull and buffer "should not be hidden inside Voronoi" — and still hidden.
- **Routing between two points.** Advanced-1 NB02 computes a shortest path.
  `isochrone` answers what is reachable within a time, which is a different
  question from how to get from here to there and how far it is.

Before building any of them, write the notebook in the lab. That is the point of
the method: the notebook is the evidence the primitive is needed, and three
widgets were built this week without one.

### Widget use tracking

Proposed by the practitioner during the widget audit, raised again on 2026-10-10,
and not recorded until now — which is itself the kind of lapse experiment 73
describes.

`npm run usage:widgets` counts nodes across shipped examples and frozen fixtures.
It cannot see a widget a practitioner adds to a blank canvas, so a widget in daily
use and a widget nobody has ever added look identical to it. That is the evidence
missing when asking whether a widget earns its place.

What would need deciding first:

- **What is counted.** Adding a node is not using it; a node that never runs is
  not evidence. The existing vocabulary already separates these — a **widget** is
  the contract, a **node** an instance, a **workflow step** one execution — so
  the count should say which it means.
- **Where it is kept.** Workflows are in browser `localStorage` and nothing is
  sent anywhere. Any count stays local, and should be readable by the practitioner
  rather than only by the project.
- **What it must not become.** A usage count is not a quality measure. The least
  used widget may be the one that carries the hardest-won distinction, and a
  number that invites pruning by popularity would delete exactly those.

Not started.

### A WASM geometry kernel, instead of the JavaScript one

Raised 2026-10-14, **not urgent** and not an experiment yet. The question was which
widgets could use a Rust/WASM GIS kernel — `geo`, `geos-wasm` or similar.

The split is between the widgets that *compute geometry* and the widgets that do graph
or table work. Only the first group would gain anything.

| Would use it | Would not |
| --- | --- |
| `isochrone`, `reachable_corridor` — buffering and unioning the route; this is where the time goes | `reachable_nodes`, `snap_to_network` — Dijkstra and a nearest-point search over arrays |
| `clip_polygons`, `fill_interior_gaps`, `summarize_combined_area`, `buffer_area`, `buffer_point` — polygon clipping | `travel_time_band`, `rate`, `case_series`, `table_input` — table work |
| `voronoi`, `summarize_hull`, `hex_aggregate`, `summarize_polygons` — half-plane intersection, hulls, point-in-polygon | the ruleset and reasoning widgets — already WASM, through EYE-JS |
| `clip_raster`, `sample_raster` — masks and sampling | the import, output and presentation widgets |

**Why it might be worth it.** The measured cost of a catchment is almost entirely
`polygon-clipping` and `turf`'s buffer: 4.1 s of the 4.7 s a four-band Snow isochrone
takes, and the 4 GB heap exhaustion recorded at London scale was a single buffer call
([experiment 114](docs/experiments/114-the-three-segments-of-a-walk.md), the blocker
`isochrone-does-not-scale`). Those calls are already behind a handful of functions —
`taperedCorridor`, `clipPolygons`, the area helpers — so the surface to swap is small.

**What would have to be settled first.**

- **Offline.** The studio precaches and reports *Available offline*. A kernel is another
  WASM payload beside EYE-JS, and the service worker has to carry it.
- **Every pinned number moves.** A different engine gives different vertices, so every
  pinned area, gap count and death count in the suite shifts, exactly as today's work
  shifted them. That is measure-and-repin, not a regression, but it has to be planned as
  one exercise rather than discovered.
- **Which engine, and whether it is the same one the Validation Lab checks against.**
  The lab uses Shapely/GEOS. A GEOS-based WASM kernel would make the two agree by
  construction, which is either reassuring or circular depending on what the check is for.
  That question belongs in the experiment, not in the swap.
- **Is it a kernel or a widget?** Nothing here needs a new palette entry; this is an
  implementation swap underneath existing widgets, so it is not a primitive admission.

### Gap: spatial statistics

Named 2026-10-10 while decomposing the process stages. The studio computes the
mean centre of a point layer and compares two of them. That is the whole of its
spatial statistics.

Absent: clustering, spatial autocorrelation, kernel density, hot-spot detection,
nearest-neighbour index. For a GIS studio serving public health, hot spots are
the obvious one — "where is this concentrated, and more than chance would
explain" is a question practitioners ask constantly and this cannot answer.

Worth settling before building any of it:

- **What question each answers, in a practitioner's words.** `mean_center` passed
  that test; a Moran's I widget that reports a coefficient and a p-value may not.
- **What the result must not be read as.** A hot spot is not an outbreak, and a
  cluster of reports is not a cluster of cases — reporting effort varies by
  place. This is the same shape as the sea-level limitation, and a statistic that
  arrives without it will be over-read faster than a map is.
- **Whether it needs a new carrier.** A global statistic over a layer is a value
  with a significance, not a point layer, and nothing today carries that. A local
  statistic gives every feature its own score and fits the existing points
  carrier, so the two are not one piece of work.
- **The zone problem.** Any cell- or area-based statistic changes with the
  zoning. The glossary now warns about this for summaries; a statistic makes it
  sharper, because the number looks more authoritative.

Not started.

### Proposed: a data quality widget, with an editable table

Asked for 2026-10-10. One widget that reports on the quality of whatever is connected to it —
duplicates, missing values, and the rest — and an editable table beside it where a row can be
inspected and corrected.

Why it fits now rather than being a nice extra: every input this application has gained lately
hands over data whose faults are real and currently invisible. The facility sources drop records
and count them by reason, but what survives still holds duplicate facilities under slightly
different names, missing kinds, and coordinates that are precise and wrong. A practitioner can see
the drop counts and has nothing to act on them with.

What it would need to settle first, because these are the decisions that make or break it:

- **What it reports, per carrier kind.** Duplicates mean something different for a point layer
  (same facility, two records) than for a table (repeated key tuple, which `table_input` already
  refuses). The report has to adapt to the input the way the ruleset widget was argued to in
  [65](docs/experiments/65-ruleset-as-data.md), and that argument should be reused rather than
  redone.
- **Whether editing is an edit or a correction.** A changed value is a new claim about the world,
  and the provenance has to say who changed what and why, or the output is a dataset nobody can
  defend. The evidence and receipt machinery already exists for this; what is missing is the
  decision that an edit is recorded rather than applied silently.
- **Whether it is one widget or two.** Reporting is a check and belongs with the comparisons and
  checks group; editing produces a derived layer and is an operation on data. The naming convention
  says the name states the operation, and "data quality" names a category, not an operation — the
  same defect the audit found in `policy` and `access`. Likely `check_data_quality` plus
  `correct_records`, or a single `review_records` if the two cannot usefully be separated.
- **Where the editable table lives.** There is already a table editor for `table_input` and a pushpin
  editor for points; a third editing surface would be the third place the same decisions about
  validation and attribute schemas could drift apart.

Not started. Recorded in full because the question "what should it report" is the design, and
answering it in passing while building something else is how a category noun becomes a widget.

### Closed: health facilities come from sources a browser can read

**Resolved 2026-10-09.** This section previously argued about whether to split healthsites
discovery from acquisition, then recorded the decision to combine them. Both arguments are moot:
`healthsites_discovery` is gone. Kept as a short note because the sequence is instructive.

The widget was built against healthsites.io, which needs an API key and — measured in
[69](docs/experiments/69-healthsites-acquisition.md) — sends no cross-origin header, so the
application could not read its response at all. Acquisition therefore required the practitioner to
download a file themselves and hand it back. Two alternatives were then measured and both answer
with `access-control-allow-origin: *`, with no account: Overpass, and the Humanitarian
OpenStreetMap Team country export on HDX. Both are OpenStreetMap-derived, as healthsites.io itself
is, and both are ODbL. `find_health_facilities` 0.1.0 uses them, always requires a study area, and
is recorded in [71](docs/experiments/71-health-facility-sources.md).

The uncomfortable part is worth keeping: **the project had been downloading from Overpass since
the street-network widget**, with pacing, provenance and a licence record already in place. A
credentialed source was reached for before the open one already wired into the application was
checked. The general lesson is to measure what the application can actually reach before designing
around a source, not after.

What survived: the licence treatment, which was the good part. ODbL is share-alike, so the licence
travels in the ontology as a resolvable IRI attached to the data rather than only to the request,
the attribution travels with it, and the links are shown before anything is downloaded.

Done 2026-10-10: **Overture Maps Places** is the third source, at `find_health_facilities` 0.2.0.
Independent of OpenStreetMap, CDLA Permissive 2.0 rather than share-alike, and it states a
confidence per place. A Manila study area reads 55,649 of 81,455,423 rows — 3 row groups of 1 of 16
parts — in about 1.5 s. The important finding is that it **counts differently**: 1,120 health
places unfiltered against 47 from OpenStreetMap, because it catalogues commercial places including
individual practitioners and wellness businesses. Hence a 0.70 confidence default and a
deliberately conservative category mapping that leaves the generic buckets unmapped. Numbers in
[71](docs/experiments/71-health-facility-sources.md).

Still open and unblocked: a **general licence gate**, since those terms, links and the acceptance
step are not source-specific and any licensed source needs the same. It is a refactor of one
dialog, not a port change.

### A licence declaration on imported data

Prompted by the proposal for a healthsites.io input widget. Three measurements shape it.

**A person can download it in a browser; the application cannot fetch it.** Two different
things, measured 2026-10-09 and worth keeping apart.

- `/api/v3/shapefile/Philippines` with a key returns **200, `application/zip`, 52.5 MB,
  `content-disposition: attachment`** — so pasting that URL into a browser downloads the file.
  Without a key it is 403. CORS does not apply to a user-initiated download, because no script
  reads the response.
- The same API returns **no `access-control-allow-origin` header**, so the Fieldwork page cannot
  `fetch()` it and read the result. That is the WorldPop finding of
  [39](docs/experiments/39-stac-discovery-and-remote-acquisition.md) again, and a proxy is out by
  precedent: [32](docs/experiments/32-john-snow-primitives.md) records that "no proxy or browser
  security bypass was introduced".

So the practitioner path is the one the project already uses everywhere: **download outside,
import bounded, record provenance.** What is built is an import of a prepared extract, not an
acquisition, and must not be named as one ([47](docs/experiments/47-sea-level-pack.md)'s naming
rule). The API key is a credential and belongs to
[experiment 30](docs/experiments/30-local-credential-files.md)'s subject, not inside a widget.

**The licence obligation is general, not healthsites-specific.** An imported layer needs to carry
its source, licence, attribution and share-alike status whatever the source is: ODbL for
healthsites, CC BY 4.0 for geoBoundaries and the AR6 extract, open for OCHA COD-AB, and
redistribution-prohibited for GADM, which is why the pack excludes it. So the capability belongs
on `observations` as a **declaration from an enumerated set of licences**, each carrying its
obligations — not as free text, which would let someone type "open" and lose a share-alike
requirement, and not as a source-specific widget, which would need rebuilding per source.

**The filters are a missing general primitive.** Selecting records by an attribute predicate —
`healthcare in (hospital, clinic)`, `completeness >= n` — is one of the six primitives the
bottom-up NB06 derivation named. Baking a healthcare-kind filter into a healthsites widget would
be a thick domain layer over a primitive that does not exist, which is
[59](docs/experiments/59-pattern-for-engineered-knowledge.md)'s engine firing for the fourth time
this session. Filtering should be visible and adjustable in the workflow rather than fixed in a
script or a source-specific node.

So: an enumerated licence declaration on imported data, plus select-by-attribute, rather than a
healthsites widget. What is genuinely source-specific — the osm_type/osm_id identity and the
recorded selection — travels as provenance in the extract, which
`validation-lab/scripts/fetch_healthsites.py` already writes.

### Worked examples

- **A service-coverage rate example.** `rate` and `reproject` are in the registry and in no
  worked example (`npm run usage:widgets`). The rate example is also the second-domain test
  that [59](docs/experiments/59-pattern-for-engineered-knowledge.md) and
  [60](docs/experiments/60-from-gis-studio-to-public-health-studio.md) both propose, and it
  forces the vintage-bearing denominator [51](docs/experiments/51-dataset-profiles.md)
  identified as the most common serious error.
- **Runbooks: a guided tour of a worked example from the `?` button.** Designed in
  [63](docs/experiments/63-worked-example-runbooks.md); deferred. Two decisions must be
  settled in that record before code: how a step names its node, and what a tour does on a
  modified workflow.
- Complete the sea-level worked example with a real extract. Needs the AR6 summary files,
  not the 38 GB sample store, and site-id resolution from the Philippine site index the pack
  already ships.

### Registry format

- **Per-port evidence in widget metadata**, per
  [66](docs/experiments/66-ports-as-schema-binding.md): each port records its carrier, roles,
  fitness conditions, how each is enforced and which test covers it. `validate:widgets` must
  resolve every named test and fail on a missing one, or the field becomes a place to make
  claims. The widget-level `validationStatus` then becomes **derived** from the weakest level
  across its ports, like `classification.json`, which also raises the ceiling that currently
  forces all 39 releases to declare `application-only`.
- **A generated connection matrix.** 1,700 candidate producer-to-input pairs, 200 allowed,
  1,500 refused, and one unit test asserting a refusal. The matrix is a pure function of the
  declarations, so it can be computed and frozen as a fixture where a contract change shows up
  as a diff.

### Records and vocabulary

- Add the ten sea-level competency questions to
  [44](docs/experiments/44-ontology-competency-questions.md), including the four the design
  refuses to answer. [47](docs/experiments/47-sea-level-pack.md) committed to this.
- Correct the stale navigation in [47](docs/experiments/47-sea-level-pack.md): its header
  still says the host lacks the tabular port, and it claims eight pinned file digests where
  the catalog pins five.
- **Done 2026-10-10**, and the answer was not the one this item expected. The pack manifest's
  two `excluded` stages were to be split into a decision and a capability limit. Measuring the
  capability limit showed there wasn't one: Zenodo sends `access-control-allow-origin: *`,
  honours Range, and one AR6 summary file is 71.7 MB inside the 9.24 GB archive. Both stages are
  decisions, and acquisition is now recorded as `out-of-scope` with the measurement attached.
  The general lesson is cheap and was skipped: this item asked for a *category* to be applied to
  a claim nobody had tested. Measure first, then classify.
- The same conflation sat in the glossary, where "we cannot read 38 GB of data in a browser" was
  the worked example of a capability limit. A store's size is not the bytes a reader transfers.
  Corrected in place rather than deleted, because a rule that failed on its own illustration is
  worth keeping visible.
- **Decision:** rename `parity` to `concordance`. In public health, parity is the number of
  births a woman has had. Touches [57](docs/experiments/57-parity-evidence.md) and
  `validate-widgets.mjs` output.
- **Decision:** whether the design audit should be ten checks or fewer. A ten-check gate
  with its own vocabulary is a real barrier to contribution, but it is what caught the
  defects above.
- Rename the node types that the [naming convention](docs/audits/ontology-audit.md) would not
  choose, each riding with the work that touches that widget rather than as a renaming pass:
  `xpert` (names a diagnostic product; the operation classifies facility evidence), `policy`,
  `access_policy`, `access`, `nearest`, and `output`. Renaming is a migration and uses the
  experiment 18 adapter. Listed in
  [the widget audit](docs/audits/widget_audit.md).
- Drop "internal primitive" as a term — it is a sentence pretending to be a term.
- Link [the glossary](docs/glossary.md) from the README.
- Add a term rule to AGENTS.md: a new term must be explainable in one plain sentence with
  an example, or it is not ready to be named.

### Browser coverage

**Resolved 2026-10-09: WebKit is at 84 passed, 0 failed, 1 skipped — the same as Chromium.**
Full account in [70](docs/experiments/70-webkit-parity.md). The position had been unchanged
since the 0.5.x CHANGELOG, at 42 passed and 37 failed, with the failures untriaged.

Three causes, in the order they were found:

- **Playwright 1.63.0 could not navigate while offline in WebKit.** 23 of the 37 failures were
  this one message. Four workarounds were measured and all four failed before the dependency
  itself was suspected; upgrading to 1.64.0 fixed it and recovered 24 tests. The dependency
  should have been the first suspect, not the last.
- **WebKit cannot store a Blob or a File in IndexedDB.** `storePDFs` wrapped every value in a
  Blob, so in Safari no attached PDF and no retained raster window could be stored at all —
  a shipped feature that did not work, found only because a second engine ran. Fixed by storing
  bytes. It was hidden for as long as it was because the abort handler asserted a full disk and
  discarded `tx.error`.
- **A controlling service worker hides requests from Playwright in WebKit.** The last two
  failures were tests whose simulated network conditions silently did not apply, so the app was
  correct and the tests were wrong. Behavioural claims now use `setOffline`, which works in both
  engines; the one test that substitutes a fixture uses `serviceWorkers: 'block'`.

Remaining here:

- **Decide whether WebKit joins the gate.** The stated condition — "add WebKit once the reload
  fault is resolved, so a red run means the application rather than the harness" — is now met,
  and the engine has already paid for itself once. Against it: the run costs about four minutes
  and `FIELDWORK_BROWSERS` already makes it one command. The honest argument for adding it is
  that Chromium-only was green throughout the entire period in which Safari could not store a
  single PDF.
- **Firefox has never been run.** `playwright.config.mjs` supports it and nothing is claimed
  for it.
- `tx.error` was not the only place a failure path asserts a cause it has not observed. Worth
  a sweep: an error message that guesses is believed.

### Toolchain

- Four of 39 widgets have parity evidence recorded; `clip_raster` is partial, where
  all-touched with a one-pixel margin differs from the reference on 61 cells because the
  reference models the margin as a 3×3 dilation.

### Dashboards

- **chartgpu.io** — practitioner's note, 2026-10-23: worth looking at when dashboards come up.
  Nothing has been read or measured yet, so nothing is claimed for it. The question to put to it
  when we get there is whether a GPU chart renderer answers the volume problem the 1,011,401
  polylines already demonstrated for Leaflet (769 ms to add, 824 ms to zoom), or only moves it.

## Known and recorded, not yet scheduled

**`case_series` has taken a table since 2026-10-16 and has never offered a control for it.** Its
`source` param switches the `cases` port between points and a table, and nothing in the Inspector
sets it, so table mode is reachable only by opening an example workflow that already has it — the
Soho curve. `rate` gained the same param on 2026-10-24 and got the control at the same time
([experiment 134](experiments/134-a-rate-from-a-table.md)), which is what made the older gap
visible. Two widgets with the same shape should not differ on whether the practitioner can reach
half of it.

Its release is stale for the same reason: `widgets/releases/case_series/0.1.0.json` declares the
points port only, and the table variant arrived without a release. That is not a registry
violation — the port check compares the release against the static `TYPES` declaration, not against
`nodeInputs`, so a per-param variant is invisible to it and lives in the release note instead. Both
`rate` 0.2.0 and `case_series` state the variant in prose. Whether a port whose type depends on a
param should be expressible in the release schema rather than described in a note is the open
question, and it governs every widget that does this.

**The South London example carries no workflow bundle.** The widget gap is closed — `rate` reads
the five rows directly — so what remains is the workflow document, its export into the example
repository and the digest re-pin. The example is pinned at a commit that carries data and
provenance only.

**A record can no longer be excluded by judgement, and nothing replaces that.** `coverage_check`
was retired on 2026-10-21 at the practitioner's decision, as redundant with `clip_points_to_area`
and the map — which it was, for the SPATIAL question. It also did something no widget now does:

- A reviewer could exclude one record with a **written reason**, and the reason travelled into the
  N3 as `fw:exclusionReason`.
- The exclusion was pinned to a **signature of the record's whole content**, so editing the record
  lapsed the exclusion instead of letting a stale judgement ride on changed data.
- The decision came from an **N3 rule the reasoner evaluated** — `{ ?r fw:excluded true. } => { ?r
  fw:coverageDecision fw:Excluded. }` — rather than from code, which is one of the few places this
  application reasoned rather than computed.

A clip answers "is this point in the area". It cannot answer "this record is wrong, and here is
why", and the two are different questions. Saved workflows that held exclusions carry them in the
migration stamp, inert, so nothing was lost from a file — but there is no way to make a new one.

What would settle it: whether the capability belongs to a widget of its own (a record review that
takes any point layer and emits decisions with reasons), to the existing `apply_ruleset`, or
nowhere because a judgement about a record belongs in the source data. That is a question for the
practitioner, and it is recorded here rather than assumed.

**Worked examples as repositories, starting with Snow's South London water supply study.** The
practitioner, 2026-10-20: *"We also have the potential to set up a downloadable worked example from
a repo - the water provider study by John Snow in South London"*, and *"worked examples do not have
to occupy space in the downloaded app, we can set them up as repos read from a curated manifest."*

Recorded in [experiment 127](experiments/127-examples-as-repositories.md) with the measurement and
the rule analysis. Three things are known and are the reason it is here rather than in progress:

- **The rule already permits it.** Experiment 49 records that preparation may download *resources*,
  never widget *definitions*; an example declares no node type, so `runtimeFetching: "none"` does
  not reach it. No admission rule has to change, and nobody should propose amending one.
- **The saving is 9% today.** 1.0 MB of an 11.25 MB precache is example data, 640 KB of it a single
  GraphML. The case rests on the examples not yet written — the cross-border archetype's would carry
  ten countries of boundaries, rasters and routes.
- **The cheapest first step is a read, not a build.** `examples/snow-gboh/provenance.json` pins
  `snow.zip` at a digest and its documentation names **8 datasets**, of which 2 were extracted. If
  the sub-district table is among them, the licence analysis and the NOTICE already exist. This has
  not been checked, and it needs network this environment does not have.

The example would be the first in the project to divide by a population: `rate` has zero example
uses, and it already refuses to compute without `numeratorPeriod` and `denominatorVintage`. The
geographic frame — 1851 registration sub-districts — is the piece most likely to carry
non-commercial terms, which is the GADM problem again.

**Built 2026-10-21: `deduplicate_points`.** The practitioner asked for it on 2026-10-20 — *"health
facilities can be deduplicated by name and point location. By name can be algorithmic match or
exact match, but we can study the OSM and Overture Places data sets before we decide what would
work"* — and this entry said the rule was the unknown and should be measured first.

What changed is where the rule came from. On 2026-10-21 the practitioner pointed at `EPIAI
RECORDLINK` in their own `epi-info-ai` repository, where the contracts were already settled:
blocking before comparison, binary contributions rather than a blended score, three classes rather
than merge-or-not, missing never agreeing with missing, and an authority boundary that classifies
without deciding. The widget takes those and adds the spatial comparison.

So the rule is not guessed — but **the thresholds still are**, and the release says so: they are
proposals, not measurements. What this entry asked for is still owed, and is now cheaper to get
because the widget reports it: run it over North Kivu's OSM, Overture and HDX layers with a
generous blocking distance, and read off how many pairs match exactly by name, how many only after
normalisation, and the distance distribution of the candidates. That is the evidence the defaults
should be set from.

**Worked examples as repositories, starting with Snow's South London water supply study.** The
practitioner, 2026-10-20: *"We also have the potential to set up a downloadable worked example from
a repo - the water provider study by John Snow in South London"*, and *"worked examples do not have
to occupy space in the downloaded app, we can set them up as repos read from a curated manifest."*

Recorded in [experiment 127](experiments/127-examples-as-repositories.md) with the measurement and
the rule analysis. Three things are known and are the reason it is here rather than in progress:

- **The rule already permits it.** Experiment 49 records that preparation may download *resources*,
  never widget *definitions*; an example declares no node type, so `runtimeFetching: "none"` does
  not reach it. No admission rule has to change, and nobody should propose amending one.
- **The saving is 9% today.** 1.0 MB of an 11.25 MB precache is example data, 640 KB of it a single
  GraphML. The case rests on the examples not yet written — the cross-border archetype's would carry
  ten countries of boundaries, rasters and routes.
- **The cheapest first step is a read, not a build.** `examples/snow-gboh/provenance.json` pins
  `snow.zip` at a digest and its documentation names **8 datasets**, of which 2 were extracted. If
  the sub-district table is among them, the licence analysis and the NOTICE already exist. This has
  not been checked, and it needs network this environment does not have.

The example would be the first in the project to divide by a population: `rate` has zero example
uses, and it already refuses to compute without `numeratorPeriod` and `denominatorVintage`. The
geographic frame — 1851 registration sub-districts — is the piece most likely to carry
non-commercial terms, which is the GADM problem again.

**A deduplication primitive, after the data says how to match.** The practitioner, 2026-10-20,
with an OpenStreetMap search and an Overture Places search on one map: *"The other primitive we
would need is a deduplication widget. For example, health facilities can be deduplicated by name
and point location. By name can be algorithmic match or exact match, but we can study the OSM and
Overture Places data sets before we decide what would work."*

The need is visible already: two sources over one study area draw the same hospital twice, and a
count of facilities is wrong by however many of those there are. What is NOT yet known is the rule,
and that is the point of recording it here rather than building it:

- **Name.** Exact match is cheap and will miss "Hôpital Général de Référence de Goma" against
  "HGR Goma". A token or edit-distance match will join things that are not the same clinic. Which
  errs where is a property of these two datasets, not of the algorithm.
- **Location.** Two records of one facility sit metres or hundreds of metres apart depending on
  whether a source digitised the building, the compound or the signpost. The threshold is a
  measurement, not a default.
- **What the study would produce:** on one real area — North Kivu is already loaded — how many
  pairs match exactly by name, how many within an edit distance, the distance distribution between
  candidate pairs, and how many are in one source only. That is the evidence a matching rule can be
  argued from.

Asked up front, because the project keeps finding the same defect: `compare_point_sets` already
pairs two point layers and `nearest-neighbour` already measures proximity. A deduplication widget
either uses those or duplicates them, and D2 should settle which before a third implementation
exists.

**The street network has no travel mode, and a travel time has no bound.** The download applies
one walking filter, while `reachable_nodes` already offers walking, cycling, driving or other with
per-mode speed bands — the mode is declared where it cannot be honoured and absent where it would
be. On the Soho walk graph this repository ships, 56.7% of edges and 48.1% of edge length are
types a driving filter excludes, and 28.1% carry a vehicle one-way restriction the parser ignores.
The practitioner, 2026-10-20: *"For current day investigations, these speed limits matter as a
ceiling (best case travel time). Worst case travel time can be researched."* So a time computed
from a posted limit is a bound, and the bound points the wrong way for an access claim: it can
rule a site out of a catchment and cannot rule one in. `maxspeed` is read nowhere today, is free
text where it exists, and covers 66.9% of drive-usable edges in central London. Recorded as
[126](experiments/126-travel-time-as-a-bound.md), with the two directions
`street-network-declares-a-travel-mode` and `travel-time-from-a-posted-limit-is-a-best-case`.

**A narrative framing stage, before the first widget.** The practitioner, 2026-10-17: *"There
must be something in the beginning that helps the user design the frames of the story … And this
step precedes the use of the study area widget."* Recorded as a **framework incompleteness**
rather than a caveat in [119](experiments/119-can-this-tell-a-story.md), because under
developmental evaluation finding the framework incomplete is a result. Today the first question
this application asks is spatial; nothing asks what the work is for. Frames are **not** the
medium — *"could be a scientific publication or a poster or an infographic but nevertheless needs
the rigor required to achieve the narrative goal"* — so the structure and the form are separate
choices. Candidates: person/place/time (native, already this project's vocabulary), STROBE (22
items, and notably silent on figures and maps), Segel and Heer's genres (form, not frame). The
smallest useful step is one declared frame that a run reports against, **including when the run
does not support it**.

Refined the same day, and this is what makes the idea safe. **A frame states a question, not a
conclusion** — *where did the outbreak reach*, not *it clustered around one pump*. **Or, for a
scientific publication, it declares the result as a null hypothesis**, which is the falsifiable
form the field already has: STROBE's item 3 asks for specific objectives *"including any
prespecified hypotheses"*, so a frames stage would be producing what the reporting standard
already requires. Prespecification is also the recognised guard against **HARKing** —
hypothesising after results are known — which is the formal name for the hazard of fitting data
to a frame.

**And the arc must be revisable, with the revision recorded.** Mintzberg's deliberate, emergent
and realized strategy applied to an account: what was intended before the data was seen, what
contact with it forced, and what the published thing actually argues. All three are provenance,
which this project already knows how to carry. The difference between the first and the third is
the number nothing records today — and it is also the evidence that a prespecified hypothesis was
not quietly rewritten after the fact.


**Revisit the Gaborone ABM notebooks for smaller worked examples.** Worked example 02 Old
Naledi was derived from them, and the practitioner, 2026-10-17: *"That's a complex set of
notebooks and has a lot of potential smaller examples."* 02 currently carries two pinned
rulesets and a whole diagnostic-access chain in one canvas; the notebooks behind it are a
source of narrower exercises that would each demonstrate one thing. Map them the way
[`cholera-notebooks-to-primitives.md`](research/cholera-notebooks-to-primitives.md) maps the
cholera studies — operation by operation, against the palette — before deciding which become
examples.

**Retire worked example 01 Heat outreach.** The practitioner, 2026-10-17: *"we can get rid of
that example as we generate better ruleset examples. That one was for starters and has outlived
its usefulness."* It is the oldest example and the one that gave `outreach-criteria` its only
use outside the teaching example. Retiring it needs the workspace key, the example template, the
tests that load `?example=heat`, and `apply_ruleset`'s evidence rung all checked — the widget
loses an example use and may drop a rung.

**Correct the geoBoundaries licence claim, in two places.** Experiment 47's table records
geoBoundaries as *"CC BY 4.0 … attribution obligation only"*, and the glossary's **Out of
scope** entry says *"geoBoundaries is used instead"*. Testing the service
([probe](research/geoboundaries-probe-2026-10-17.md)) found **six distinct licences across
eleven country-levels**, including **ODbL, which is share-alike** — and the three ODbL levels
are the DRC and Uganda ones. The glossary sentence also reads as a capability: nothing in
`src/` references geoBoundaries, and there is no polygon ingestion path for it to use. Both
statements are mine to flag and the practitioner's to correct.

**The two buffers, and what the edge decides.** `buffer_point` imports `validateBuffer`
from `area-buffer.ts`, so the distance knob and its 0–50,000 m range are already one thing.
What differs is the Turf step count — 8 against 32 — justified in `buffer-point.ts` by
*"8 … is ample when expanding an existing boundary; here the edge decides membership, so
the finer setting is used"*. **The cross-border case breaks that premise.** Expanding a
district to catch Ebola cases that crossed from the DRC into Uganda is an expansion whose
edge decides membership: whether a case falls inside it decides whether it is counted. So
8 steps is justified by an assumption that use violates, and `fw:AreaBuffer` records no
equivalent of `fw:circleAreaFraction`, so the under-coverage is not even a number. Fix the
approximation reporting before deciding whether the two widgets merge — a merge that
carried the wrong step count into the cross-border case would be worse than two widgets.

**Multi-member study areas.** The widget stays — `fw:studyArea` is
`rdfs:subPropertyOf prov:used` with `rdfs:range fw:StudyArea`, so a parameter could not
satisfy the declared range and the receipt would weaken. But `fw:StudyArea`'s own comment
already proposes membership: *"multiple named, disconnected features without requiring a
dissolved aggregate geometry"*. That turns the three-cities comparison from three nodes
into one area with three members — the clutter the practitioner described, removed without
touching twelve port contracts or any receipt.
[120](experiments/120-the-study-area-as-a-declared-resource.md).

**The study area as a declared resource, not an edge.** Twelve active widgets take an
`area` port and only three are ingest, so a picker inside ingest widgets removes a quarter
of the wiring. [120](experiments/120-the-study-area-as-a-declared-resource.md) measures it,
records the practitioner's lean — *"there's pros and cons to doing this but I am for
decreasing unnecessary friction"* — and names the three things a change must not lose: the
deliberate difference between an acquisition bound and an analytical extent, pinning and
drift on a reused area, and the `prov:used` assertion the edge currently provides for free.

**Measurement scale on a field binding.** A binding declares `kind: number | boolean | term`,
and `term` covers both *clinic / pharmacy / health post* (unordered) and *NoDeaths / Few / Many*
(ordered). The ruleset worked example produces the second kind and nothing records the order, so
a map drawing those bands cannot know a sequential ramp is right and a qualitative palette is
wrong. Found 2026-10-17 while assessing cartographic design research
([research/cartographic-ontologies.md](research/cartographic-ontologies.md)); it blocks any
honest design advice, and the place to declare it is the authored rule form, where the bands are
written and the practitioner already knows the answer. Nominal, ordinal, interval, ratio — a
second fact, orthogonal to `kind`.

**Cluster detection.** Named by the practitioner on 2026-10-17 as a future widget, with a source
of example data attached: *"When we get into cluster detection (a future widget) SatScan.org has
example data sets as well."* Surveyed in
[research/data-sources.md](research/data-sources.md#satscan--for-a-cluster-detection-widget-that-does-not-exist-yet)
— nine sets, including two **benchmarks** whose right answer is known, which is what a new
detector needs before it is pointed at anything real. It would be the first widget here to need
cases, denominators and places at once; the three port types exist, and `rate` already insists a
denominator declare what it counts. Terms are "educational as well as research purposes", which
is enough to use and not enough to ship.

**An on-surface guide — a tour, and something that answers questions.** Asked for as an
exploration by the practitioner on 2026-10-15: *"add a Clippy like agent on the UI surface as a
guide to the UI — can provide a guided tour and answer questions."*

**Three different things wear that description, and they have almost nothing in common.** Which
one is meant decides everything about the cost, so they are separated here rather than scoped
together:

| | What it is | Needs | Offline |
| --- | --- | --- | --- |
| A | **A scripted tour.** Steps through the interface pointing at things, in a fixed order, with text written by hand | nothing new | yes |
| B | **An assistant that answers from the canvas.** "Why is this step refused?", "what produced this number?", "what can I connect here?" — answered from the workflow, the port contracts and the run receipts | query surfaces over things that already exist | yes |
| C | **An assistant backed by a language model** | a network call carrying the practitioner's canvas to somebody else's service | **no** |

**What already exists and should be counted first.** The playback behind *Play back the build*
is a guided tour of a worked example — it steps a real workflow one widget at a time and says
what each step revealed. The manual is one page per widget. Dive Deeper explains the assumption
behind ten of them. Experiment [44](experiments/44-ontology-competency-questions.md) is
literally a list of questions the graph is supposed to answer, several of which it does. A
guide built on those would be assembling what is here; one built on a model would be answering
beside it.

**C has a cost this application has otherwise refused to pay.** Everything here runs locally:
no widget is fetched at run time, the reasoner is WASM on the device, and the one feature that
contacts an outside service — a basemap — says so in the interface and is off by default. An
assistant that sends the canvas away would be the first thing to break that, and a canvas is
not neutral: it holds case locations.

**What Clippy actually got wrong is worth keeping in view.** Not that it was an assistant, but
that it **interrupted** — it appeared uninvited, read what you were doing, and offered help
nobody asked for. The feature to copy is the one a practitioner opens.

**What would decide it:** which of A, B or C is wanted. A is small and could be built now. B is
the interesting one for this project, because every answer it would give has to come from
something the application can already show — which is a test of whether the ontology and the
receipts are good enough to answer a practitioner's question, and that is a finding worth having
either way. C needs a decision about sending a canvas off the device, which is a bigger
question than a help feature.

### The proposed shape: a **Field guide**, running an OODA loop

**The name.** A field guide is a book you carry and open *when you choose* — the invitation is
in the metaphor, which is the one thing Clippy got wrong. Its organising question is *"what is
this thing in front of me?"*, which is option B. It absorbs the manual rather than competing
with it: a field guide has an entry per species, so the per-widget pages become its entries.
And it claims no intelligence — nobody expects a field guide to be clever, only accurate and
indexed. *Assistant* and *Helper* claim agency and invite questions it cannot answer; *Compass*
implies it tells you which way to go; *Scout* implies going ahead unasked. A character or a
person's name is worse than all of them: anthropomorphism makes a reader trust a thing past its
evidence, which is what most of the effort in this project goes into preventing.

**What it looks like.** No face, no animation, no idle presence. An entry in the header beside
Help, opening a dialog in the same family as the manual and the catalog, which is a pattern
already here. Three sections: **this step** (the selected widget's entry, its ports, what it
will not do), **this canvas** (answered from the workflow, the port contracts and the last run's
receipts), and **a tour** (the playback, which exists, pointed at the current example).

**It opens when asked.** One exception is worth allowing: a refused run already names its cause,
so an *explain this* link there opens the guide at that entry — invited by a failure rather than
by idle watching.

**The loop.** The practitioner's framing, 2026-10-15: *Observe → Orient → Decide/Act.* It fits
because each phase maps onto something the application already computes, which is the whole
argument for building B rather than C:

| | What it does | Where it comes from |
| --- | --- | --- |
| **Observe** | what is on the canvas, what cannot run, what the last run found, what is declared and what is not | listed below — all of it exists |
| **Orient** | name the problem in the practitioner's terms, **with the evidence it came from** | the citation rule, below |
| **Decide / Act** | the options with what each costs, and where the action is unambiguous, a button that takes it | the zone advice already works this way: it states the cost and offers *Use zone 30N* |

**Twelve things Observe could read today, without anything new being computed:**

| | Signal | Already computed by |
| --- | --- | --- |
| 1 | a step with no ruleset chosen | `executionPlan`, which refuses it by name |
| 2 | a required input not connected | `requiredInputs` |
| 3 | a map with nothing wired to it | the run's refusal, in layer terms |
| 4 | a UTM zone that disagrees with the data, and what it costs | `suggestUTM`, `utmScaleFactor` |
| 5 | a ruleset pinned to a superseded version | `supersession` |
| 6 | provenance a step has not declared | `DeclarationGap` |
| 7 | sites the street network could not reach | the run alert |
| 8 | records no rule matched | `fw:unmatchedSubjectCount` in the receipt |
| 9 | a comparison whose units disagree | `authoredUnitProblems` |
| 10 | rules near the compile ceiling | `compiledRuleCount` |
| 11 | a cached build older than the one installed | the service worker's version report |
| 12 | a download that failed, and which instances were tried | the Overpass failover's message |

**The rule that makes it this project's rather than a generic help bot: every answer cites
where it came from — a receipt, a port contract, a manual page, a measurement — and links to
it. When it has no citation it says it does not know.** That is the provenance discipline
applied to a help feature, and it is also the honest constraint: it knows the application, not
the epidemiology. It must not guess, must not paraphrase a receipt into something friendlier
and less true, and must not answer a question about what the data *means*.

**The cheapest thing building it would prove.** Six of the eight refusals measured in
[112](experiments/112-progressive-widget-reveal.md) already name the step that should have come
first. A Field guide that can answer *"why was this refused?"* from the receipt is reading
something the application already writes — and if it cannot, that is a finding about the
receipts rather than about the guide.


**Four concepts worth taking from ArcGIS Model Builder**, from the sideways sweep in
[116](experiments/116-model-builder-sideways.md) over screenshots the practitioner uploaded on
2026-10-15. Each is independently useful and none depends on another:

1. **Ask which role when more than one port fits.** Dropping a layer on a tool there opens a
   menu — *Input Features*, *Extent*, *Precondition*. Our Map binds by type silently, which
   already needed a workaround: `context` is points-typed and means *drawn beside polygons*, so
   it had to be excluded from automatic binding to stop it taking a role nobody chose. Binding
   silently when one port fits and **asking when more than one does** is the honest rule, and it
   extends the configurable port from the Map to every widget.
2. **Validate without running.** `executionPlan` already computes whether a canvas is coherent
   and only Run reaches it. **Smallest of the four:** the reason first given — that a run
   downloads street networks — was wrong, and the practitioner corrected it. `network_input`
   downloads on its own button before the run, so the expensive unreliable part is already
   outside it, and a run costs seconds of local reasoning.
3. **Say on the node that it cannot run yet.** An unconfigured step says so in the Inspector, to
   somebody who has already selected it. The canvas is where the shape of the work is read.
4. **Declare the metric frame once per workflow.** *Partly built 2026-10-15: the study area now
   suggests the zone and, when an area straddles a boundary, names each candidate with the worst
   stretch it would cost. What remains is the Environments shape itself.* ArcGIS calls it an *Environment*: declared
   for the model, inherited by every tool, overridable per tool. Ours is a UTM zone in every
   measuring widget's parameters, refused when two disagree, with the cost of a wrong one
   measured in [100](experiments/100-choosing-the-metric-crs.md). The better shape, and the only
   one of the four that changes what a saved workflow holds.


**A building-footprint widget.** Asked for by the practitioner on 2026-10-15. Specified in
[docs/widget-specs/find_building_footprints.md](widget-specs/find_building_footprints.md),
which carries the source evaluation from
`digitaltwin-aas/gaborone/03a-Building-Footprint-Augmentation.ipynb` — five products compared
against one city, with Overture and 3D-GloBFP used for their height and Google Open Buildings
and Microsoft GlobalML excluded because they have none and their counts in informal settlements
are inflated by sliver detections. **The data question is closed; the contract question is
open:** of the five, only OpenStreetMap is reachable from a browser, so the widget either
acquires from OSM alone or imports a file prepared elsewhere. The specification recommends
import first and says why.

**OpenFreeMap tiles and themes for the Map widget.** Asked for by the practitioner on
2026-10-15. Today the only basemaps are OpenStreetMap's raster tiles and OpenTopoMap, both
third-party services that see the viewed extent of every pan. [OpenFreeMap](https://openfreemap.org)
serves **vector** tiles free and without an API key, with several styles, and can be
self-hosted — which is the part that matters here, because it is the first basemap option that
could remove the disclosure objection rather than trade against it. Vector tiles also mean themes:
a light, dark or minimal ground chosen to sit under the data rather than compete with it, which
raster tiles cannot offer. **What would decide it:** whether a vector renderer is worth the
dependency. Leaflet draws raster tiles with no help; vector tiles need MapLibre GL or an
equivalent, which is a substantial addition to a project that currently ships one mapping library.
Related: the three basemap options recorded in [the Map specification](widget-specs/map_output.md),
where PMTiles is the other offline-capable candidate.


**Nothing converts a table into points.** Moved here from the blocker ledger on 2026-10-15, where
it had been `standing` while gating nothing. No widget takes `table` and outputs `points`, and no
widget anywhere names which columns hold coordinates — there is no `latField`, `lonField` or
equivalent in `src/`. So a practitioner who imports a CSV with latitude and longitude columns
cannot make it spatial. Three widgets consume `table` and all three emit a table or decisions; the
only ways to obtain points are the data editor, the grid generator and the facility search. Two
consequences are already paid for: `case_series` builds a FeatureCollection of null geometries and
casts it `as unknown as PointCollection` to reuse the point path, and `SpatialRelation` keeps a
`MissingLocation` value that conflates "the source omitted a location" with "this has no
location". **Lifts when** a widget takes a table plus a declared binding of which columns are
longitude and latitude, with a CRS, and outputs points; `SpatialRelation` becomes three-valued;
and `case_series` consumes the table directly. This is experiment 61's problem exactly — *"the
ability to say which column means what"* — and the same role-binding mechanism 65 needs for
rulesets, so whichever lands first should be built for the other to use.

**Three of six rule applications carry their rules outside a declared ruleset.** Moved here from
the blocker ledger on 2026-10-15 for the same reason. `coverage_check` holds six N3 rules in a
template literal; `facility_audit` and `slr_threshold_comparison` classify with a TypeScript
ternary and call no reasoner at all. The standardization ratchet sees none of the latter two kinds.
What makes it worth doing is not tidiness: `coverage_check`'s policy is stated in a code comment —
*"Boundary points are included by policy"* — and two of its rules map **different** relations to
the **same** decision, Outside→Review and MissingLocation→Review, so the policy collapses
outside-ness and unknown-ness where a declared ruleset would have to say which it meant. Hosting
it also needs a form extension the authored ruleset shape lacks: one of its rules concludes about
the **activity** rather than a subject, and `slr_threshold_comparison` compares field to field.
**Lifts when** all six resolve a declared ruleset with a basis and an output vocabulary including
an unknown value, with byte-identical conclusions on the frozen fixtures.


**A workflow cannot require an old widget version, because a widget version labels code and only
one version of it is in the build.** Established 2026-10-15, correcting a claim made the same day
and withdrawn within the hour. The practitioner's question: *"Isn't the widget version a
representation of the overall code version?"* It is, and that settles it.

A widget release file declares *about* code — `implementation.files` lists source paths — rather
than carrying any. One build compiles one version of each of the 53 widgets, so there is no
mechanism by which a saved workflow could run an earlier one and nothing a node could usefully
pin: a per-node version would record what the workflow was *authored* against, not what can run
it. A ruleset is the opposite, and that is the whole reason the alert was buildable there: rules
are data, every published version ships in the same build, and a node selects one at run time.

**Withdrawn:** the claim that *"a receipt's widget version describes the build that wrote the
receipt, not the code that produced the result."* False. No receipt is persisted — only the
workflow is saved, and `result` is cleared on load — so every receipt is written by the build
that ran it, about the code that ran. `fw:catalogVersion` is truthful for its run.

What is left is smaller and is a real gap: nothing records which version a workflow was authored
against, so re-opening it under a later build cannot say "this was built against map_output 0.7.0
and you are now on 0.9.0, which changed the following." That is a question about authorship
rather than about computation, and whether it is worth a field on every node is the
practitioner's call — the Inspector already says what the current version changed, which may be
enough.

**The release change vocabulary has ten values and no definition.** Measured 2026-10-15 across
147 release files: `initial` (44), `baseline` (20), `added` (13), `changed` (4), `enhancement`
(1), `feature` (1), `minor` (48), `major` (6), `patch` (10), and one entry with no `kind` at all.
Four are semver, six are prose categories, and nothing says which means a practitioner must act.
`scripts/release-notes.mjs` derives `breaking` from three signals — `kind: major`, an explicit
`breaking`, a stated `migration` — and records the vocabulary in its output rather than quietly
normalising it, because a warning derived from a vocabulary nobody has agreed will be wrong at
some point and should be readable when it is. The ruleset layer is now the stricter of the two:
`major | minor | patch`, enforced.


**Nine of the ten published maps cannot show a basemap, and the tenth ships with it off.**
Raised by the practitioner on 2026-10-14: *"Our map_output layers do not even have a basemap!"*
Measured the same day — the control is rendered only when the input is `polygons` **and** the
presentation is `interactive` (`src/app.ts:94`), because tiles are Leaflet's and `interactive`
is the only presentation that mounts Leaflet. Every other map is a local SVG, which cannot hold
a tile without fetching and embedding one. So a reader of any worked example sees geometry on
blank ground. Recorded, not fixed: the basemap in use is now layer 0 in the receipt
(`fw:BasemapLayer`, `fw:layerTileProvider`) instead of a property of the specification, and
OpenTopoMap's CC-BY-SA style is credited separately from OSM's ODbL data. The two ways to close
it are not equivalent and the choice is the practitioner's — a static tile composite embedded in
the plot SVG (self-contained figure, one request per render, an embedded raster in every export)
or more maps made interactive (cheap, but an interactive view has no scale bar and exports
without its ground). Both in [the Map widget page](widget-specs/map_output.md).


**Nine widgets bake in one demonstration's specifics, and two of them are already fixed.**
The kind/placement distinction behind this was corrected on 2026-10-12: there are two kinds of
widget, primitive and composite, and being example-bound is a placement problem rather than a
kind. D1 and the audit's table both said four kinds and now say two.
Found by [the widget design audit](audits/widget_audit.md) on 2026-10-09 and restated by the
practitioner on 2026-10-12: `places`, `centers`, `alert`, `facilities`, `samples`, `xpert`
(a product name — GeneXpert), `policy`, `access_policy`, `comparison_map`. `places` and
`centers` already carry `migrationFrom` adapters into `observations`, so the principle and the
mechanism are both established; seven remain. None of the nine has parity evidence and none is
pinned by a composition, so renaming them costs only the adapters — which makes them the
cheapest group to do first. The sea-level three are a separate decision: pack work is postponed
([67](experiments/67-sample-raster-at-points.md)), `slr_site_assignment` is a one-off of
nearest-neighbour-with-distance, and `slr_threshold_comparison` is genuinely domain-bound.
Scope not chosen, because "a name so general it says nothing" is a worse failure than the
present one.



**The zone guard is still a zone too wide.** Fixed 2026-10-11: the palette default is now
derived from the workflow's own data, and a disagreeing zone is reported in the Inspector with
its measured cost and a button that applies the suggestion
([100](experiments/100-choosing-the-metric-crs.md)). What remains is the guard itself —
`metric()` allows ±6° from the central meridian where a zone spans ±3°, so an off-by-one zone
still passes, costing +0.17% at London's latitude and **+0.47% at 15°N**, which is where the
Philippines is. Tightening it to ±3° is one character and would start refusing workflows that
run today, so it needs checking against the shipped examples first.

**Metres and angles are related through a constant, in nine places, with the same error.**
Audited 2026-10-12 by `npm run audit:metres`, which measures every site against a Vincenty
geodesic, in both directions. Metres into angles: `buffer_point`, `buffer_area`, `area` (circle
and box dimensions), `donut_geomask`, `samples`, `network_input`, `measure_area`. Angles into
metres, via the shared `distanceKm` haversine: `nearest`, `access`, `facilities`,
`slr_site_assignment` — the same magnitudes with the sign reversed. Three conversion methods that
look unrelated — a Turf buffer, a great circle on a mean radius, a flat 111,195 m per degree —
give the **same** answer to two decimals, because they are one approximation written three
ways. The error is directional and latitude-dependent: **−0.56% to +0.11% at the equator**,
−0.49% to +0.13% at Manila, 0.06% to 0.32% at Soho. So it is worst in the tropics, which is
where this project is aimed: a 500 m buffer in Manila is 497.6 m north–south and 500.7 m
east–west, and a 5 km scope spans 31 m. The two directions differ in consequence: a reported
distance that is 0.5% out is a reporting error, while `facilities` uses a radius as a
**membership** test, where a facility on the boundary can fall either side. Nothing is
corrected, because correcting it changes every one of those outputs and means re-pinning the
Lab's parity for the buffer widgets and everything downstream. Record: [101](experiments/101-metres-into-angles.md).



**Four widgets cannot be added from the palette as drafts.**
`slr_extract_import`, `slr_threshold_comparison`, `rate` and `case_series`
validate their full contract on every edit, so `change()` rolls back and the
canvas appears to ignore the click. Recorded in
`tests/palette-add.browser.mjs`, which fails if the set grows. That test's
comment referred to this list before it existed.

**Numeric Inspector fields revert visually after a change.**
The model updates and the field does not. Affects every numeric parameter, not
one panel; measured on `mean-center-zone`, which predates the micro-workflow
work. Recorded in [92](experiments/92-micro-workflow-on-the-canvas.md).

**A desktop build now has a settled rationale and no plan.**
Three reasons converge on it: acquisition no browser will permit
([69](experiments/69-healthsites-acquisition.md)), STAC assets behind CORS or
authentication ([91](experiments/91-stac-browser-integration.md)), and a
durable learning record, which as of 2026-10-11 is where learning belongs at all
([desktop and browser for learning](research/desktop-and-browser-for-learning.md)).
Nothing is scheduled, nothing is designed, and the WebKit gate below comes
first. Recorded so that "the desktop app will do it" stops being a way of
agreeing with an idea without doing it.

**The widget audit covers 39 of 51 widgets.** It ran on 2026-10-09 and twelve widgets have
been added since without going through D1 in that table: `buffer_point`, `fill_interior_gaps`,
`find_health_facilities`, `micro_workflow`, `reachable_corridor`, `reachable_nodes`,
`sample_raster`, `snap_to_network`, `stack_polygons`, `summarize_combined_area`,
`summarize_hull`, `travel_time_band`. Each had an admission review at the time, which states a
kind, so the gap is in the audit's counts rather than in the record — but the counts should not
be read as current. Noted 2026-10-12 while restructuring the table.

**The documented gate is Chromium only, and so is CI.** ~~Done 2026-10-13.~~ The default in
`playwright.config.mjs` is now `chromium,webkit` and the Pages workflow installs both. It was
changed after measuring that all 102 browser checks pass under WebKit unmodified, so the gate
began at parity rather than with exemptions. This was the precondition
[70](experiments/70-webkit-parity.md) set for any desktop packaging decision, raised again when
the practitioner asked whether the application could be compiled to Tauri -- which runs WKWebView
on macOS. Firefox remains opt-in.

**The Validation Lab had no execution gate.** Fixed 2026-10-11:
`scripts/run_notebooks.py` executes every notebook and fails on any error cell,
and the Pages workflow runs it before building the site, so a broken notebook
blocks publishing. CPython only; the browser kernel is still unchecked, which is
the remaining half of item 1.

An earlier version of this entry said `_output` was "a committed artifact that
nothing checks". That was wrong — it is gitignored, and CI builds the site fresh
from `content/` on every push, so the published site was never stale. What was
three notebooks behind was a local build directory, which matters to nobody.

**A source should be able to declare the CRS of its output port.** Proposed
2026-10-13, from the pandas/geopandas analogy the project already follows: a
`GeoDataFrame` carries its CRS and `to_crs` is a method on it, so acquiring data
in UTM and wanting it in WGS84 is one call, not two objects. Today `reproject`
is the second node, and it is filed under Sources because it imports its own
data — which is why the naming ratchet flags it twice
(`widgets/naming.json`). Giving each geospatial source an output-CRS knob saves
that step for the common case.

The knob is honest by the test experiment 107 derived — the contract does not
move with it. The output port type stays `points`; what changes is the
`spatialReference` travelling on the value. That is the precedent `nearest`
already set with its distance unit: *the unit travels on the output, because a
distance without its unit is not interpretable*. Coordinates without their CRS
are not interpretable either, and `SpatialReference` is currently frozen to
WGS84/EPSG:4326 in `src/types.ts`, so this makes a field that pretends to be
constant actually vary — which `checkRange` and the UTM advice already assume it
does.

`reproject` is still needed, and not as a leftover: a practitioner may want a
mid-workflow translation, or two versions of the same data in different CRSs
side by side, which a knob on the source cannot express because it has only one
output. So this is a split, not a replacement — the source gains a knob and
`reproject` becomes a true `points → points` transform under Spatial
operations. Renaming it is a migration under the
[experiment 18](experiments/18-shared-input-standardization.md) adapter, and the
two naming entries say so.

## Done

**DONE 2026-10-25 — a static figure carries its own ground.** A raster basemap is fetched
once and baked into the figure as `data:` URIs, cached in the payload store so a later visit
redraws it offline, and credited in the figure because ODbL attaches to the copy. Each tile is
placed by its own corners, since tiles are Web Mercator and this plot is equirectangular.
[Experiment 137](experiments/137-a-static-figure-can-carry-its-ground.md). **Written without
reading the prior art, which is the finding worth keeping**: [52](experiments/52-cacheable-basemaps.md)
had already concluded "PMTiles for interactive navigation, Natural Earth for static figures" and
measured 215 kB for Natural Earth context, and [53](experiments/53-reproducible-maps.md) had
already recorded that a live tile basemap cannot be reproduced at all. **Still open:** reconcile
137 with 49, 51, 52 and 53; Natural Earth for static figures is the recorded answer and is
unbuilt; the OpenFreeMap styles are vector and still cannot be baked.

**DONE 2026-10-25 — the figure defects the practitioner found by looking at figures.** A raster
was a mode that threw away every other wired layer; `oldMap` and the isochrone plot each drew
colours and marks their own keys contradicted; the orphan prune discarded any output whose node
id ended `-map` or `-table`, which would have thrown away the whole geoprivacy run on any node
delete; `deleteWorkflow` asked whether a key had a slash rather than whether the application
ships the example; the Hagelloch curve drew 87 overlapping labels under an axis titled
"Category", sourced to a run UUID. Each is in its own commit with what it does not establish.

**DONE 2026-10-25 — Snow's own map, and mark size as a setting.** Both John Snow workspaces drew
a catchment map and neither drew the figure the outbreak is remembered for. Mark radius is now
per layer, because eight pumps across a parish and 250 addresses in four streets are one figure
and no single default serves both.

**DONE 2026-10-25 — the interface stopped assuming a travel mode.** Six runtime messages said
"the walk" whatever mode was declared, including the note that travels into a published figure.

**DONE 2026-10-25 — gates run in a worktree.** `scripts/gate.sh` gates a commit in
`../fieldwork-gate` on port 4184, so the main tree stays usable for the 25 minutes and what is
validated is what would be pushed. [CONTRIBUTING.md](../CONTRIBUTING.md) carries the pipeline and
the merge policy for human developers; AGENTS.md carries the same for agents.

**The ruleset widget stopped being pinned.** Done 2026-10-15, in two halves on the
practitioner's reports. First *"this is not the design we discussed, the rules are pinned not
very flexible"*: experiment [106](experiments/106-rule-builder-ui.md) had specified the authored
form on 2026-10-12 and none of it was built, so a practitioner met a dropdown of four bundled
rulesets whose text was fixed. The compiler and B1 followed — all three shipped rulesets rebuilt
in the authored form reach identical conclusions under the real engine. Then *"I see the ruleset
widget but it's not editable"*, and *"perhaps the rule editor should be a modal dialog so there
is enough space"*: `src/rule-editor.ts`. **Still open:** two comparators are offered that have
never been executed against the real engine (B2), and conclusions are free text, so two rules
can disagree and only a run catches it.

**A measurement states its unit.** Done 2026-10-15. Numeric fields and settings declare a QUDT
unit, a comparison whose sides disagree is refused by name rather than converted, and the check
runs while a rule is written as well as when it runs. What no rule can catch — a bare literal
takes the field's unit — is met by showing that unit beside the box. Closes A7, the second of
106's three debts; the example and its tests exercise all three.

**A map has layers, not modes.** Done 2026-10-15, a day after the direction was settled and
written into the docs without the code changing — which is what
[docs/directions.json](directions.json) now exists to catch. Every layer port is always
declared, the renderer is read from the connections, and the node carries the layers it draws
plus one configurable port. Basemaps became reachable on every map as a consequence: the
interactive renderer had required polygons, which is why nine of the ten shipped maps could not
have one.

**A practitioner is told when the version they are running is not the current one**, and a stale
cached build can be cleared without developer tools. Done 2026-10-15. The service worker served
a cached build forever and the page could not say so; navigations are network-first with a cache
fallback, the header names a cached version, and `?reset-cache=1` clears it from an embedded
browser. Ruleset versions declare what they changed and whether moving is a drop-in.

**The manual is for the person using the widget.** Done 2026-10-15. Four pages rewritten to one
shape — what kind of widget, what it does, what to connect, how to use it, which examples
exercise it, what it will not do — with the design records moved to `docs/widget-specs/` and the
split enforced from both sides.


**A practitioner is now told when the version they are running is not the current one.**
Done 2026-10-15, on the practitioner's instruction of 2026-10-14: *"We should not offer up old
widget versions in the palette, only updated versions. When new versions appear, and a workflow
is run that requires an old version, we have to alert the user that there is a newer version. The
widget manual should explain what was changed in the current version, and to warn of deprecated
or incompatible functionality."* The palette half shipped that day. The other two halves shipped
now, and both were **available in the data already and read by nothing**: widget releases have
carried `changes` since the registry existed — 148 descriptions across 147 release files — and
the ruleset layer has carried them since 2026-10-12. Computed, published, and inert, for the
sixth and seventh time.

What is built:

- **A superseded ruleset pin says so, in the Inspector and at the run.** `supersession()` reads
  the change notes of every version between the pin and the newest, so a pin two versions behind
  is told about both, and styles the notice as a danger when any of them declares an
  incompatibility — because then the choice is not "update when convenient" but "rewire or stay".
  The run names every superseded pin it just used, since that is the moment a result is produced
  by rules the practitioner may not know are superseded.
- **Every newer version now declares what it changed and what moving costs.** `incompatibility`
  and `deprecates` are typed and required: `scripts/validate-rulesets.mjs` fails a version that
  supersedes another and declares no changes, and fails a version that moves a port and states no
  incompatibility. Verified by removing one and watching the gate fail.
- **The Inspector says what the offered version of a widget changed**, folded for an ordinary
  release and open for a breaking one, from `widgets/release-notes.json` — generated by
  `scripts/release-notes.mjs` from each widget's current release, checked by
  `npm run validate:release-notes`. All 53 current releases say what they changed; 4 are breaking.

Two findings fell out of doing it, both recorded above under what is not scheduled: a widget
version labels code that only ships one version at a time, which is why the alert is a ruleset
mechanism and not a widget one, and the release change vocabulary has ten values.


**The lab check coverage ratchet exists, and thirteen of the 26 are done.** Done
2026-10-11. The classification could not be derived — `implementation.definition` names
`src/core.ts#TYPES` for 39 of 51 widgets, so the registry does not record where most
widgets are implemented — so it is declared and reviewed instead, and the validator
enforces completeness and the ratchet rather than the judgement. Verified by breaking it
four ways. Thirteen widgets now have checks, all agreeing. Three recompute the
John Snow Voronoi example, which is independently verified end to end, and the four primitives
of the isochrone decomposition are now all checked. (An earlier version of this entry said
`isochrone` could therefore be compared against its own decomposition. That is wrong and
[41](experiments/41-validation-lab.md) forbids it — both sides would be Fieldwork. What is
cheaper is that the reference code in checks 07 and 08 composes into a reference for the
monolith.) Three checks failed on their first run and in every case the
criterion was wrong, not the widget — most instructively `22-case-series`, whose own docstring
named the week as the dangerous rule before the code got that rule wrong. Awaiting fell
26 → 13.



**Notebook CI is complete, in both environments.** Done 2026-10-11.
`scripts/run_notebooks.py` executes every notebook under CPython -- 20 of them as of
2026-10-11, in 14 s -- and
`node/check_09_notebooks_browser.mjs` executes them in the browser kernel in
58 s; both fail on any error cell and **both block publication**. The browser
half was the open item, blocked on `02-clip-vs-rasterio` not completing in
twelve minutes. Cause: requesting `pyproj` alongside `rasterio` makes
`rasterio.open` kill the kernel outright, and a fatal kernel error produces no
error cell, so the runner waited for an execution count that could never arrive.
Each notebook now requests what it imports, and the runner races cell completion
against kernel death. Record: [97](experiments/97-the-browser-kernel-gate.md).

Two things that followed and are **not** resolved: the Pyodide distribution is
loaded from a CDN pinned by nothing in the lab, so an upgrade would be found out
by the gate failing; and the crash is an unexplained upstream defect with a
two-package reproduction that has not been filed.



**The experiment document is standardised.** Done 2026-10-11:
[docs/experiments/README.md](experiments/README.md) states the form,
`validate:experiments` gates the two parts a machine can honestly read, and it
runs inside `npm run check` and so in CI. The five questions are deliberately
**not** enforced — they are a reading test, and a validator demanding
`## What happened` would have produced 96 conforming documents and no better
reading. 9 of 96 conform; 87 are recorded in
[standard-debt.json](experiments/standard-debt.json) and the list only shrinks.
Record: [96](experiments/96-the-experiment-document.md).

The new **what changed our minds** element is in place on four documents and
counted in every run. It is not required, because not every document had its
mind changed; it is counted so that it does not quietly become a rule nobody
follows. If the count sits still for a month, that is the finding.

**Hypothesis, the practitioner's, 2026-10-12: a decision class is its own widget.**
Not scheduled, and recorded so it is not re-derived. The claim: *"the policy widget after all may
be just a ruleset based widget that emits a decision class which can be defined externally within
a decision class widget."*

What makes it worth an experiment rather than a note is that today's work points the same way
without having set out to. With its ruleset extracted, `policy`'s only residual is an explanation
sentence, and that sentence restates the ruleset's conditions in prose — so the widget is already
close to "a ruleset-based widget and nothing else". The part the hypothesis adds is where the
**output vocabulary** lives. Today each ruleset declares its own: `fw:decision` over
Review/NoFlag/Unknown, `fw:zone` over five values, `fw:evidenceLevel` and `fw:service` over four
each. Under the hypothesis those are not ruleset-internal — they are a declared artefact of their
own that a ruleset *targets*, and that a practitioner can define.

Three things that would decide it, none of them done:

- **Do two rulesets ever target the same class?** `outreach-criteria` and `access-review` both
  conclude `fw:decision` over the same three values, which is evidence for the hypothesis: one
  class, two rulesets. `nb06-evidence` concludes two predicates nothing else uses, which is
  evidence against, or evidence that a class can be private to one ruleset.
- **Would it collapse widgets or add one?** A decision-class widget is a new palette entry, so it
  must retire more than it adds or it is the failure this project spent 2026-10-12 undoing.
  Against: the four rule widgets are already collapsing to one.
- **Where does the unknown value belong?** Every vocabulary must include one
  ([65](experiments/65-ruleset-as-data.md)), and if the class is external then the class owns that
  rule rather than each ruleset repeating it.

Related: the explanation gap named in [65](experiments/65-ruleset-as-data.md) may belong to the
decision class too — a class that owns its values is the natural owner of how each value reads.

**Old Naledi is an incomplete example that was never revisited**, and a slice of the Gaborone TB
ABM notebooks is the way to raise it. The practitioner's point, 2026-10-12. Not scheduled.

Measured the same day, per worked example, from `widgets/evidence.json`:

| Example | Widgets | Lab-checked | Check owed |
| --- | --- | --- | --- |
| snow-voronoi, snow-geoprivacy, snow-epidemic-curve | 10 each | **4** each | 0 |
| snow-isochrone | 12 | **4** | 1 (`isochrone`) |
| **old-naledi** | 10 | **1** | 3 — `access`, `facilities`, `samples` |
| sea-level | 8 | **0** | 3 |
| heat | 6 | 1 | 1 |

So the claim holds and is sharper than "incomplete". The four snow examples carry four
independently checked widgets each; Old Naledi carries one of ten. Sea-level is weaker still and
its weakness is **owned** — all pack work is deliberately postponed and the record says so. Old
Naledi's was not owned by anything until now.

Three things follow, and the first is a correction to today's own work:

- **It was being used as an oracle.** The blocker `ruleset-as-declared-data` named "every frozen
  fixture and Old Naledi classification replays identically" as its liftTest, and that test passed,
  and the lift is recorded. But an incomplete example's frozen expectations are weaker evidence
  than that liftTest implied. The merge is not thereby wrong — 356 unit and 97 browser tests pass,
  and check 23 verifies the rulesets exhaustively and independently — but the Old Naledi half of
  that argument should be read for what it is.
- **It is where the example-bound widgets live.** Of the widgets still declaring themselves
  example-specific, `access`, `facilities` and `alert` are Old Naledi's or the heat demo's, and
  `facility_audit` is Old Naledi's presentation widget with a decision rule hidden in a ternary.
  An example nobody revisited is where widgets accumulate that nobody generalised.
- **A real slice beats a synthetic one.** Its sample locations are a generated grid with
  Old Naledi's spacing, and `NB06_NAMED_EVIDENCE` carries two facilities keyed by registry id
  after a name-string match was found and fixed. A slice from the Gaborone TB ABM notebooks would
  replace generated demonstration points with real structure, which is also what would let
  `samples`, `access` and `facilities` be checked against something.

What would settle the size of the slice: the smallest one that exercises the same four stages the
example claims to teach — a boundary, a facility registry, an access proxy, and a classification
with its basis — without needing a widget that does not exist.

**Audit the worked examples for their exact derivation and source.** The practitioner's
request, 2026-10-12. Not scheduled. What is already known, measured the same day, is enough to say
the audit will find something:

Nine example variants ship. **Four** carry a `provenance.json`, and the four use **four different
schemas** — no shared key beyond `files`:

| Example data | Declares |
| --- | --- |
| `john-snow` | `retrieved`, `pointsRevision`, `networkRevision`, `files`, `transforms`, `notice` |
| `snow-gboh` | `retrieved`, `source`, `sourceDigest`, `publisher`, `documentation`, `originalSource`, `licence`, `files` |
| `manila-sea-level` | `builtAt`, `builtBy`, `environment`, `projections`, `sites`, `facilities` |
| `old-naledi` | `repository`, `commit`, `files`, `notes` |

So only one of the four declares a **licence** and a **publisher**, and only one declares an
`originalSource` distinct from where the file was fetched from. Nothing validates any of this,
because there is no shape to validate against — which is the same failure the widget releases had
before `validate:widgets`, one level out.

And the heat demo, the geoprivacy example and the raster example have **no data directory at all**:
they are synthetic, built in code. That is legitimate and it is not declared anywhere a reader or a
script can see. "Synthetic, authored for this demonstration" is a provenance claim, and an absent
file is not that claim — it is indistinguishable from an omission.

What the audit should answer per example, which is the shape the four files between them already
half-declare: what the original source is, who published it, under what licence, what was retrieved
and when, what digest it had, what transforms were applied, what is synthetic, and what a reader may
not conclude from it. `snow-gboh` is the closest thing to a model.

Why it matters beyond tidiness: [56](experiments/56-basis-behind-identity.md) is about the basis
behind an identity, and the ruleset work of 2026-10-12 found that the one ruleset claiming a
*published* basis cites three papers that resolve to nothing a reader can open. The examples are the
other half of that question, and nothing has asked it of them yet.

**A `table` → `points` widget: the gate by which table values become GIS coordinates.**
The practitioner's framing, 2026-10-12, and recorded rather than built because it is a **new
widget** — plus one against a target of 41 at 46 — and that trade should be made deliberately.

**It would be the first addition where adding is clearly right.** The budget is answerable to
empowering practitioners in field workflows, and today a practitioner who imports their own CSV
with latitude and longitude columns **cannot make it spatial inside a workflow**. Measured: three
widgets consume `table` and all three emit a table or decisions; the only ways to obtain `points`
are `observations` (edits data), `samples` (generates a grid) and `find_health_facilities`
(fetches from a source). None converts.

**The conversion already exists in code and is unreachable from the graph.** `csvPoints` in
`src/input-data.ts` is exactly `points_from_xy`: it names the x and y columns and declares the
unit. It is called from two **file-import dialogs** only — the ordinary import, which reads
degrees, and `reproject-ui`, which reads UTM metres and converts. So the capability exists for a
*file* and not for a `table` already in the workflow.

The contract, which the 2026-10-12 work already settled:

- in `table`, out `points`
- the x column and the y column, chosen by the practitioner, with the explicit mapping longitude
  is x and latitude is y
- `units`, required and undefaulted — `'degree'` or `'metre'`, because geopandas will not build a
  GeoDataFrame without a CRS and this project's one CRS is an invariant, not an absence
- for metres, the UTM zone and hemisphere, reusing `reprojectToCRS84`, since a projected CSV is
  the case `reproject` exists for

**What it must say it cannot do.** An axis swap is undetectable by range whenever |longitude| ≤ 90,
which includes both worked examples this project ships: a swapped Soho pump lands off Somalia and a
swapped Gaborone facility lands in Algeria, both as perfectly valid coordinate pairs. What catches a
swap is the study area — every record reads Outside and `coverage_check`'s `canProceed` goes false.
The widget should not imply otherwise.

**What it unlocks beyond the obvious.** `case_series` builds a FeatureCollection with every
geometry null from a table and casts it `as unknown as PointCollection` to reuse the point-based
path; with a real conversion it consumes the table directly and the cast goes.

**Shared mechanism, not a second one.** Choosing which column means what is
[61](experiments/61-input-dimensions.md)'s problem, and the role binding
[65](experiments/65-ruleset-as-data.md) needs for rulesets is the same mechanism. 65 already says
whichever lands first should be built so the other can use it; this is the second caller arriving.

**Finish aligning the vocabulary to standards.** Started 2026-10-12 and parked deliberately, so
housecleaning is not displaced by it. The ledger is `ontology/vocabulary-basis.json`.

Where it stands: **3 of 263** declared `fw:` terms carry an alignment, up from **0**. The three are
`fw:byteSize` ≡ `dcat:byteSize`, `fw:member` ≡ `rdfs:member`, and `fw:memberOf` ⊑
`dcterms:isPartOf`. SHACL conforms.

**The decision is settled and makes this cheap: align, do not rename.** An axiom is data — no
migration, no saved workflow touched, receipts byte-identical — so this can be done a term at a
time with no big-bang. That is why it can wait.

What remains, in the order it should be done:

- **Read three specifications.** The candidates were *recalled*, not searched, and the ledger says
  so: **CiTO** for `fw:referenceRole`'s four citation roles, **ADMS** for
  `fw:implementationStatus`, and **VoID** for the roughly fifteen count properties. Partial
  coverage is the interesting answer — two roles aligned and two not would be a more useful result
  than either extreme.
- **Search the ten likely-conduct terms** rather than assume them cleared. `fw:claimsNoComputation`,
  `fw:valueUnitStatus`, `fw:basisStatus` and the rest are recorded as **unsearched**, which is not
  the same as none-found.
- **Then the ratchet**, in the shape `rulesets/ledger.json` already uses: a departed count that may
  fall and never rise, and every *none-found* entry carrying which standards were checked and on
  what date. That last part is the practitioner's point that the DE work is the discovery — a
  negative search result is a dated claim like any other, and a term cleared in October may not be
  cleared in November.

**One limit, recorded so its absence is not misread.** Equivalence and disjointness need a
counterpart of the same kind, property against property or class against class. The distinction most
worth asserting here is that `fw:MeanCenterResult` is **not** a centroid — `mean_center` is the mean
of point coordinates, and the names invite the confusion — but GeoSPARQL exposes centroid as a
*function*, so there is no class to be disjoint with. That one stays in an `rdfs:comment`, and the
missing axiom does not mean the question went unasked.
