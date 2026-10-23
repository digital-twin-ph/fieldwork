# 131 · What a project and a workflow are, while you are using them

_Created 2026-10-22 · Updated 2026-10-23_

**Status:** tried — steps 1 to 3 of the reordered plan are built and the experiment's own test
passes. `Project` carries `changedAt` and `exportedAt` at schema 2, `exportedAt` is written when
an export completes, the words are in the glossary, and the project's safety state is said in the
header and is the route to the backup. The Project view itself is not built: the state has a door
now, and it still opens onto the old dialog. Sections below are left as written on 2026-10-22,
with what the building found recorded at the end rather than folded back into the proposal.

## What was asked

The practitioner, 2026-10-22, at the end of a day in which they could not find their own backup,
were told a dialog exported a project when it exported a workflow, and met a limit measured on
bytes that would never have been written:

> *"Let's also reorganize how projects and workflows are managed. Our UI has become confusing to
> navigate. Let's plan before we implement -- how should the UI represent project and workflow
> lifecycles."*

Asked what they work in, what confuses them, and how much change they would absorb, they answered:
**both project and workflow, at different times**; **where things are saved and backed up**,
**knowing what state something is in**, and **where data lives**; and **rethink the lifecycle**.

## The application has four state words

`Saved on this device`, `Run complete`, `Changed · rerun to update`, `Ready`.

None is about backup. None is about data. Those are two of the three things named as confusing,
and in both cases the application already holds what it would need to say -- when a project last
changed, when it was last exported, how many bytes each node's payload occupies -- and never
assembles any of it into something a practitioner can see.

The naming problems met that day are symptoms rather than the illness. Three exports called
Export, Export project and Encrypted ZIP, at three different scopes, with the word a person
searches for -- *zip* -- attached to the one that is not project-scoped. A project export behind
a storage readout in the header. These are what happens when controls accrete without a model of
what they act on.

## Two objects, and what state means for each

### A workflow is one question, and has two states at once

| Progress | Means | Shown today as |
| --- | --- | --- |
| Draft | widgets on the canvas, never run | nothing |
| Current | the run finished and matches the canvas | `Run complete` |
| Stale | the canvas changed after the run | `Changed · rerun to update` |
| Refused | the last run stopped, and why | a toast, which disappears |

**Size** is the second thing and is invisible: a workflow holding 215 MB of street network is not
the same object as one holding none. Size is what makes a workflow slow to open, refused by a
package, and expensive to delete. The practitioner met all three of those in one afternoon without
the application ever showing the number that explains them.

*This paragraph said **Weight** until 2026-10-23.* The practitioner asked what the word meant --
*"In the 8 words what's weight?"* -- then named it: *"sounds to me more like 'size'"*, and then
separated it from the rest: *"most are 'machine' states, but size isn't it's more like an
attribute"*. The glossary carries Size as an attribute rather than a state, and this now matches
it. The question is recorded because it is the whole method working: a word nobody could define
on sight was not a small problem with the table, it was the table claiming something was a state
when it was a measurement.

### A project is one investigation, and its state is about safety

| State | Means |
| --- | --- |
| Backed up | exported since its last change |
| Unbacked | changed since the last export, with how long ago |
| Never exported | no copy exists outside this browser |

This is the state that was missing when Chrome would no longer open the application. The remedy
offered was a URL that deletes data; what was wanted was to know, beforehand, that a copy existed.

### A third object, found 2026-10-23: an example nobody has opened yet

The practitioner, mid-way through wiring Fieldwork to fetch worked examples from GitHub:

> *"We haven't finished the project/workflow UI update yet. Where does fetch workflow fall
> under?"*

**The result falls under project, and needs nothing new.** [Experiment
127](127-examples-as-repositories.md) settles it: *"A fetched example is an imported workflow with
a different provenance, not a new kind of thing."* It arrives through `validateWorkflow`, the path
the import button and the encrypted package already take, and lands as a workflow inside a
project, which is the practitioner's own shape from 2026-10-20: *"create project, import workflows
into project"*. Draft, Current, Stale and Refused all apply to it from the moment it exists.

**The thing acted on BEFORE the import has no name here.** At the moment of choosing, there is no
workflow and no project — only a catalogue entry — and 127 requires the interface to distinguish
two conditions of it:

| Condition | Means |
| --- | --- |
| Fetchable | listed, pinned and verifiable, but not on this device |
| Available | fetched once, digest checked, cached, and so usable in the field |

That distinction is the one this project cannot leave implicit, because the application is
offline-first and the practitioner is the person who finds out in an airport or a health zone
which of the two an example was. It is also not a state of a workflow or of a project, so the two
objects above do not cover it and a third row in either table would be wrong.

**It is NOT only a readiness question.** Fetching tells a server that this example was opened. The
application has exactly one pattern for that — an explicit practitioner action, named in the
interface, with a note in the receipt — used by the basemaps and by Overpass, and a list that
fetches on load would not meet it. So the control is not a link; it is a named act with a
consequence worth stating before it happens.

**What this adds to the work below.** Two glossary terms before any panel uses them, by the rule
that cost this project a day when `weight` went into a table before it went into the glossary. A
place in the interface where examples are listed with their condition and their LICENCE, which
127 made a per-example field because the mechanism exists so an example may carry terms this
project could not adopt. And a receipt line for the act of fetching.

**What exists already, so the surface is the only thing missing.** Measured 2026-10-23:
`widgets/examples.json` pins the first example at a full commit SHA with a digest per file;
`raw.githubusercontent.com` answers `access-control-allow-origin: *` at a commit SHA; and a file
fetched from that pin digests to exactly what the example's own `provenance.json` records.
`src/example-catalog.ts` holds the verification and the URL construction and **is not wired to
anything, so esbuild does not emit it and its test cannot load it** — which is the honest status
of this: a mechanism proven end to end with nowhere yet to be reached from, deliberately not
bolted onto an interface that is about to be replaced.

## Two modes, and the shift between them made visible

The answer was *both, at different times*: setting up and reviewing is project work, analysis is
workflow work. So there are two places, not one crowded one.

- **Project view** -- the project and its workflows: their progress, their weight, what is backed up,
  what may be deleted and what that frees.
- **Canvas** -- one workflow: build, run, read.

Today the project level is a modal dialog opened by clicking a storage readout in the header.
That is why the backup could not be found, and it is the same failure as the published-extract
links that rendered only inside a mode named for the file one must already have: the capability
existed and the door did not.

A breadcrumb -- `Facilities and Networks › Health Facilities Ituri` -- is the shift between the
two, and is also the first thing in the application that says a workflow is inside a project.

## What this does to the controls

| Today | Becomes |
| --- | --- |
| `↓ Export`, `Export project`, `Encrypted ZIP` | one **Back up**, with scope (this workflow / this project) and form (plain / encrypted) chosen inside it |
| Projects dialog behind the storage pill | the Project view; the pill links to it rather than being the only way in |
| `New project`, `Add workflow`, `Delete workflow`, `From a template`, `New empty canvas` | creation and deletion live in the Project view; the canvas toolbar keeps switching only |
| Storage pill, totals only | weight per workflow, summed per project, so *where data lives* is answerable |

## What has to happen before any of it is built

- **The words must be in the glossary.** `validate:vocabulary` gates this, and three of the
  proposed states -- draft, stale, backed up -- are not in it. Either they enter the glossary
  first or the existing phrasings are reused. Coining them in the interface and declaring them
  afterwards is the failure this project already has a ratchet against.
- **The Project view is a route, not a dialog**, or it inherits the discoverability problem it
  exists to solve.

## How it would be known to have worked

One browser test, and it is the question that failed on 2026-10-22: **from a cold start, with a
project open, can the backup for that project be reached without being told where it is?** Today
that path is: notice the storage readout is a button, open it, find the project block, find a
text link between two separators.

Weight is the second: **does the application say how much data this workflow holds, where a
practitioner would ask?**

## What would say this was wrong

- The Project view adds a step to the thing done most often -- opening a workflow and running it --
  and the breadcrumb becomes a toll rather than a map.
- Progress and weight turn out not to be orthogonal in practice, so two badges say one thing
  twice.
- The three project states are not distinguishable without an export timestamp the application
  does not keep, in which case the state is a promise rather than a fact. **This was checked
  first, and it failed.**

## The first check failed, so the plan is reordered

`Project` is, in full:

```ts
export interface Project {schema:'fieldwork/project/1'; id:string; name:string; subject:string; workflows:string[]}
```

No timestamps. Not when it changed, not when it was exported. `exportedAt` exists only inside
the document that is written out, and leaves with the download. So "backed up", "unbacked" and
"never exported" cannot be computed today: the application does not know.

Which means the order is not UI first. It is:

1. `Project` gains `changedAt` and `exportedAt`; the schema becomes `fieldwork/project/2` with a
   migration in which every existing project arrives as **never exported**, because that is what
   is true of it.
2. `exportedAt` is written when an export COMPLETES, not when it is asked for.
3. Then the states can be computed, and only then is there a Project view worth building.

Weight needs none of this: the payload store already knows bytes per digest and the storage
readout already sums them. It wants attributing per workflow, not recording.

Had this been built UI-first, the view's main column would have been blank, and the state that
answers the practitioner's worst pain point would have been a label over facts that were not
there.

## The view was called the wrong thing, 2026-10-23

This experiment called the project-level view the **Workspace**, nine times, and was one commit
from building it under that name. The practitioner stopped it: *"What is workspace definition in
FW?"*

There is none. The application already uses the word for the storage slot that holds saved
workflows (`WORKSPACES`, "Workspace store · workflows and their settings"), for a single saved
workflow (`NAMED_WORKSPACES`, and `docs/usage.md` telling a practitioner "your saved workspaces
are untouched" when it means their workflows), and for itself (the header's "Research
workspace"). A fourth sense, for the view that lists projects, would have been coined in the
interface and declared afterwards -- which is the failure this experiment wrote its own rule
against, two sections above, about `draft`, `stale` and `backed up`. Those three went into the
glossary. The word for the view itself was never checked.

It is the **Project view**, and `docs/glossary.md` now carries it beside **Canvas** and
**Workspace store**. The existing three senses are not corrected: they are already in front of
practitioners, and renaming a storage label is a separate decision from not making the problem
worse.

## What the building found, 2026-10-23

Steps 1 and 2 landed as written: schema 2 with a migration in which every existing project
arrives as never exported, and `exportedAt` written at the point the file is produced rather than
where the export is asked for. The glossary gained Draft, Run, Stale, Refused, Size, Backed up
and Not backed up before any of them reached a panel, which is the rule this experiment set for
itself.

Then the state was said in the header, where `#save-status` had read **"Saved on this device"** on
every successful save since this application had one. That string is true and answers a different
question: it is about this browser, and the practitioner who could not find their backup was
asking whether a copy existed anywhere else. This file already warned about the same sentence in
another context — a degraded store "turns a 10 GB ceiling back into a 5 MB one while the
application goes on saying Saved on this device".

**The test this experiment named now passes.** From a cold start, with a project open, the state
is on screen without opening anything, and pressing it reaches the backup. It is a control rather
than a label for exactly that reason: the question was never whether the state could be displayed.

### Two defects the test found, neither of which reading the code would have shown

**A warning no action could clear.** The first version rendered the state for any project,
including the built-in worked examples. For those, `touchProject` returns early because they have
no stored record, and the projects dialog offers them no project export — that control renders
only for a project that can be deleted. So Old Naledi would have read **Not backed up** forever,
with a route that could not fix it: the door opening onto a room without the capability, which is
the inverse of the failure this experiment began with and no better. The state is now said only
for projects the application actually tracks.

**A state recorded and not said.** `exportedAt` was written correctly on a completed export and
nothing re-rendered the header, so the status went on reading Not backed up until the next save.
A practitioner who backed up and looked would have been told it had not worked. Recording a state
and saying it are two acts, and this experiment had only specified the first.

### What is still not built

The Project view. The state now has a door and it opens onto the same modal dialog this experiment
calls the problem — `Projects dialog behind the storage pill` becoming `the Project view` is
untouched, as are the breadcrumb, the consolidation of three export controls into one **Back up**
with scope and form, and Size per workflow. Size needs no new data: the payload store knows bytes
per digest and `projectWork` already sums them per project for the risk measure.

## See also

- `docs/directions.json` · `a-backup-carries-the-work-not-the-data`
- Experiment 121 · Storage beyond localStorage -- where weight is measured
- Experiment 130 · The GIS kernel owns the graph -- why weight is what it is
