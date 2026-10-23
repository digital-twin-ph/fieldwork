# 131 · What a project and a workflow are, while you are using them

_Created 2026-10-22 · Updated 2026-10-22_

**Status:** asked — a model and a plan, with nothing built. The states described here are not in
the application; three of them are not in the glossary either. What follows is a proposal and the
test that would show it was wrong.

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

**Weight** is the second state and is invisible: a workflow holding 215 MB of street network is
not the same object as one holding none. Weight is what makes a workflow slow to open, refused by
a package, and expensive to delete. The practitioner met all three of those in one afternoon
without the application ever showing the number that explains them.

### A project is one investigation, and its state is about safety

| State | Means |
| --- | --- |
| Backed up | exported since its last change |
| Unbacked | changed since the last export, with how long ago |
| Never exported | no copy exists outside this browser |

This is the state that was missing when Chrome would no longer open the application. The remedy
offered was a URL that deletes data; what was wanted was to know, beforehand, that a copy existed.

## Two modes, and the shift between them made visible

The answer was *both, at different times*: setting up and reviewing is project work, analysis is
workflow work. So there are two places, not one crowded one.

- **Workspace** -- the project and its workflows: their progress, their weight, what is backed up,
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
| Projects dialog behind the storage pill | the Workspace; the pill links to it rather than being the only way in |
| `New project`, `Add workflow`, `Delete workflow`, `From a template`, `New empty canvas` | creation and deletion live in the Workspace; the canvas toolbar keeps switching only |
| Storage pill, totals only | weight per workflow, summed per project, so *where data lives* is answerable |

## What has to happen before any of it is built

- **The words must be in the glossary.** `validate:vocabulary` gates this, and three of the
  proposed states -- draft, stale, backed up -- are not in it. Either they enter the glossary
  first or the existing phrasings are reused. Coining them in the interface and declaring them
  afterwards is the failure this project already has a ratchet against.
- **The Workspace is a route, not a dialog**, or it inherits the discoverability problem it
  exists to solve.

## How it would be known to have worked

One browser test, and it is the question that failed on 2026-10-22: **from a cold start, with a
project open, can the backup for that project be reached without being told where it is?** Today
that path is: notice the storage readout is a button, open it, find the project block, find a
text link between two separators.

Weight is the second: **does the application say how much data this workflow holds, where a
practitioner would ask?**

## What would say this was wrong

- The Workspace adds a step to the thing done most often -- opening a workflow and running it --
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
3. Then the states can be computed, and only then is there a Workspace worth building.

Weight needs none of this: the payload store already knows bytes per digest and the storage
readout already sums them. It wants attributing per workflow, not recording.

Had this been built UI-first, the view's main column would have been blank, and the state that
answers the practitioner's worst pain point would have been a label over facts that were not
there.

## See also

- `docs/directions.json` · `a-backup-carries-the-work-not-the-data`
- Experiment 121 · Storage beyond localStorage -- where weight is measured
- Experiment 130 · The GIS kernel owns the graph -- why weight is what it is
