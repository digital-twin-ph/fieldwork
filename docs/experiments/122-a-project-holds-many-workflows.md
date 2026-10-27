# 122 · A project holds many workflows

_Created 2026-10-19 · Updated 2026-10-25_

**Status:** tried — the project exists as an entity and groups the worked examples. What it does
not yet do is share data between the workflows it holds, which is the half that pays for itself.

## The question

The practitioner, 2026-10-19, after asking whether a project can have multiple workflows and
reading the answer that there was no project to ask about:

> *"My thinking is a project should be able to have multiple workflows. Consider the John Snow
> example - voronoi, isochrone, etc. These are all about the same outbreak, but different
> questions are answered by different workflows."*

and then, on what to call it:

> *"the investigation is the project, and an investigation, like John Snow can have multiple
> workflows. That is the reality our current model will hit, and since this is a DE project
> evolving is the prudent thing to do."*

## It had already hit it, twice

Not a prediction. Two of the eleven worked examples were already investigations wearing the
clothes of unrelated workspaces:

| investigation | workflows | what they share |
|---|---|---|
| 1854 Cholera Outbreak in London | `snow-voronoi`, `snow-isochrone`, `snow-geoprivacy`, `snow-extent` | each embeds its own `structuredClone` of `examples/john-snow/points.json` |
| Old Naledi, Gaborone | `old-naledi`, `raster` | both import `boundary` from `examples/old-naledi/data.js` |

`examples/john-snow/points.json` is **42,566 bytes** compact: 250 death locations and eight pumps.
Four workflows embed it, and `save()` writes every workflow twice — once under
`fieldwork-workflow-v1` and once into the `fieldwork-examples-v1` map. **340,528 bytes, 6.5% of
the 5,226,496 bytes `localStorage` was measured to hold ([121](121-storage-beyond-localstorage.md)),
to store one outbreak.** The isochrone's `network.json` adds 225,023 more.

So the model's error was not abstract. It was being paid for in the one store that runs out.

## Why there was nothing to ask the question of

"Project" was a word with two referents and no entity behind either:

- **UI chrome.** `$('#project-title').textContent=workflow.name` in `app.ts`. The project title
  *was* the workflow's name.
- **A per-workflow manifest.** `ProjectManifest` on `Workflow`, whose `projectInventory` takes one
  workflow and returns one flat inventory — and whose failure message reads *"Import a complete
  project."* The thing it called a complete project was a quarter of the Snow investigation.

The glossary defines **Widget**, **Node**, **Worked example** and **Experiment record**, and has
never defined either **Project** or **Workflow**. Both are now entries.

## What was built

`src/project.ts`: `Project {schema, id, name, subject, workflows}`, seven built-in projects
grouping the twelve workspace keys, `validateProject` at the storage boundary, and `newProject`
for one a practitioner creates. A project is deliberately a layer **above** the workflow:

- A workflow keeps its `exampleId`, its own name, its own canvas, and its own **singular**
  `outputId`. One question, one answer. `exampleKey` still identifies a workflow at every one of
  its twenty-five call sites, so no widget and no port changed.
- Two optional fields were added to `Workflow`: `projectId` and `workflowKey`. A worked example
  needs neither. A practitioner's workflow needs both, because the workspace map was keyed by a
  **closed vocabulary of example ids** and a practitioner cannot mint one of those — the
  *"examples are the default world"* problem, reached at last by a real workflow instead of by a
  new example. `exampleKey`'s study-area fallback would have labelled a practitioner's project
  *Old Naledi*; `projectId` is now the discriminator that stops it.
- Membership is **optional in both directions**, at the practitioner's request: *"users can create
  workflows and can import them into projects. Maybe make that optional?"* A workflow may belong
  to no project, one that does can be moved out, and an unfiled workflow is listed under **In no
  project** rather than becoming unreachable.
- The picker is grouped by investigation rather than flat, which is the whole finding made visible
  in one control: four options under *1854 Cholera Outbreak in London*.
- Step 1 on an empty canvas is no longer the study area. The practitioner: *"the first step is not
  even study area - it's create a project."* It now asks what you are investigating, and names the
  study area as step 2.

## The surfaces, 2026-10-20

The model shipped with no way to manage it. A project could be created and then never renamed,
never described, never looked at; its subject existed only as a tooltip; and its workflows were
reachable only as optgroup labels inside the worked-example picker. The practitioner, using it:

> *"Right now I have no way of editing Project Title nor viewing Project metadata. I can only view
> the workflows through the worked example dropdown which seems to be the wrong place to locate
> projects."*

The shape was chosen before anything was written, from three offered: **split the selector and
edit in place**, with the worked examples listed as the built-in projects they already are.

| | |
| --- | --- |
| Choosing | `Project` then `Workflow` — two selects, two questions |
| Reading | a details disclosure in the project bar: name, subject, the workflows it holds, the id |
| Editing | **click the title** — the project name in the eyebrow, the workflow name in the heading; Enter applies, Escape abandons, built-in projects say why they are fixed |
| The rest | the same disclosure: subject, membership, the id |
| Adding | `+ Add workflow` creates a canvas inside the project, named for the question it answers |
| Deleting | removes the grouping; the workflows stay openable under *No project* |


**The disclosure was not enough, and the practitioner said so:** *"There is still no way to edit
project (e.g., title) or workflow (e.g., title) metadata."* It was there, behind a collapsed
`<details>` at the bottom of the bar — somewhere to put a control rather than somewhere anyone
looks. The option chosen on the day said *edit in place*, and its sketch showed a title with
`← click title to rename` beside it; a disclosure is not that. Both titles are now controls, with
a cursor, a hover, a tooltip and a keyboard route in.

Building it produced a small lesson about delegated events. The first version put a `keydown`
handler on the title and opened an input inside it — so Enter in the editor applied the name, the
render redrew the heading, and **the same keystroke bubbled back to the title and opened a fresh
editor**. The title then looked empty, and the rename looked as though it had failed when it had
already been saved. Events from the editor are ignored by the control that opened it.

Two things this found. The picker was a **fourth copy of the example vocabulary** — the
`exampleId` union, the deep-link allowlist, the options in `index.html` and this registry — and
building it from the registry deleted the copy along with the unit test whose only job was keeping
it honest. And *No project* has to be offered **always**, not only while the open canvas is in
none: without it an unfiled workflow becomes unreachable the moment a project is selected, which
is a navigation trap rather than a tidy list.

## A list nobody could prune, 2026-10-21

A screenshot of nine rows, with the report: *"The import workflow template does not seem to work.
Now I have a bunch of workflows I do not need. We do not have a way to delete workflows."* Then,
minutes later: *"test-project/w*, and *-template workflows I find in the list do not load at all on
canvas."* Three defects were sitting behind that one list, and the second message identified the
one the first could only describe.

**A key is registered before the workflow is saved, and the registration stood whichever way the
save went.** `writeProjects` adds `project/wN` to the project; `save()` then writes the workflow —
and on a full store returns `false`, which nothing read. The project then holds a key with nothing
saved under it. `renderProjectOptions` labels a row from the saved workflow's name and falls back
to `workflowTitle(key)`, which returns the key itself for anything outside the closed example
vocabulary, so the row reads `test-project/w7`. Choosing it reached `loadExample`, which found
nothing saved, found the key was not an example, and assigned the canvas to itself: the row did
nothing at all, which is what the practitioner saw. The `· template` rows are the same ghost from
the same cause, which is why they behaved identically.

This is the full store of [experiment 121](121-storage-beyond-local-storage.md) surfacing as a *project* defect rather than a storage one. The
practitioner was not told the store was full — that was the same day's other fix — so what they
saw was a workflow that half-existed.

**A template always minted a workflow.** The ask on 2026-10-21 was *"can I import the North Kivu
workflow into this blank one?"* — said while sitting on a blank canvas already named for the next
province. The build answered the general question instead: it always created a workflow and named
it after the source, so the practitioner ended up with their empty Ituri canvas, a third workflow
called "Health Facilities North Kivu · template", and no way to remove either. The method was
copied correctly and delivered to the wrong place. A template now fills the open canvas when that
canvas is empty and keeps the name it was given, and mints a workflow only when the canvas holds
work.

**And deletion did not exist.** A project could be deleted since 2026-10-20 and a workflow could
not, so the only gesture that removed anything removed the grouping and kept all the workflows —
the opposite of what was wanted. The asymmetry was invisible while the model was new and every
workflow was one somebody had just made on purpose.

**Keys were minted by counting.** `workflows.length + 1` mints a key the project already holds as
soon as one workflow has been removed, so the first deletion built would have made the next
addition overwrite a neighbour. Minting now walks past what is taken.

## What this does not establish

- **That the practitioner's nine rows were all ghosts.** Five of them read as names, so those are
  saved workflows they no longer want, and deletion is the control for those. Which of the nine
  were registrations without workflows has not been read off their device.
- **That a full store was the only way to make one.** It is the cause that is proven to have
  occurred here and the one the code shows; `writeProjects` can also fail on its own, and a key
  could have been left behind by something not yet looked at.

- **It does not share any data.** The four copies of Snow's points are still four copies, and the
  6.5% is still being paid. Moving data up to the project means `point_input` holding a
  content-addressed reference instead of a `FeatureCollection`, and every widget that reads
  `params.data` resolving it. The manifest already dedups PDFs and rasters by `sha256` across
  nodes and does not do it for records; that asymmetry is the shape of the work, not an argument
  that it is small.
- **The manifest still spans one workflow.** `projectInventory(workflow)` is unchanged, so a
  project of four workflows has four manifests and no manifest of itself. Nothing yet exports,
  imports or verifies a project as one artifact, and the error message still says *"Import a
  complete project"* of a single workflow.
- **The project and its workflows are named after different things, on purpose.** The project is
  *1854 Cholera Outbreak in London*; its workflows are still `snow-voronoi`, `snow-isochrone`,
  `snow-geoprivacy` and `snow-extent`, labelled "John Snow ...", with data in
  `examples/john-snow/`. The practitioner chose the outbreak over the investigator, 2026-10-19, and
  the pinned upstream sources are themselves named `1854-Cholera-Outbreak-London-Advanced-1` and
  `-2`. The keys were left alone because they are identifiers: renaming them would break the
  `exampleId` union, the deep links in the manual and every saved workspace. So the subject is the
  outbreak and the questions are Snow's methods. Whether a reader finds that coherent or merely
  inconsistent is not established here.
- **It does not establish that seven is the right grouping of the examples.** Old Naledi's two
  were grouped because they import the same boundary file; `rulesets` runs on Snow's data and was
  left out of the Snow project because it teaches rule construction rather than asking about the
  outbreak. That is a judgement about what an investigation *is*, and a reasonable reader could
  group it the other way.
- **Nothing about several workflows on one canvas is settled by this.** Nothing forbids it, the
  rulesets example is described as *"Four workflows on one canvas"*, and the practitioner's
  judgement is that this is tolerable only while they stay simple: *"the consequence is downstream
  - a very cluttered interface that makes it difficult to communicate the answer to questions."*
  A project gives four questions four canvases. It does not remove the other option or measure
  the clutter.
- **No measurement that grouping helps anyone read the examples.** The picker is grouped because
  the model is; whether a reader finds the Snow material faster is not in hand and is not
  answerable here. See [the field question](../field-questions.md).
- `localStorage` still holds all of it, so a project makes the ceiling in
  [121](121-storage-beyond-localstorage.md) matter more, not less: the same bytes now have a name
  that implies they belong together.

## What would close it

Phase two, which is executable now and does not need anyone outside this repository:

1. Move a dataset up to the project: one content-addressed record, referenced by the workflows
   that use it, with `point_input` resolving a reference rather than owning a `FeatureCollection`.
2. Re-measure the four Snow workflows. The claim to beat is 340,528 bytes; one shared copy written
   twice is 85,132, and the difference is the result.
3. Extend `projectInventory` to span a project's workflows, so *"Import a complete project"* is
   true of the thing it names, and export and import one project as one artifact.
4. Record what breaks in the widgets that read `params.data`, counted, not estimated.

Then phase three, which is what makes the change legible to a reader rather than only cheaper:

5. **Play back the John Snow Project across two of its workflows.** The practitioner, 2026-10-19:
   *"We have two complete workflows -- isochrone and voronoi. We show the two workflows as a
   playback where the second imports the input widgets from the first."*

   Not a twelfth worked example. `cholera-london-1854` already holds both workflows, and a new workspace
   containing copies of them would embed Snow's points a fifth and sixth time — a worked example
   about deduplicating inputs that ships duplicated inputs. **The project is the worked example**,
   and the playback is project-level.

   What it shows, from the measurement above: `snow-isochrone` imports three inputs from
   `snow-voronoi` — the 250 deaths, the eight pumps and Snow's 1855 table, 44,463 bytes — and
   pointedly does not import three more. It keeps its own 225,022-byte street network, its own
   single Broadwick Street pump, and **its own study area**. A playback in which everything is
   shared would teach that sharing is automatic, which is false; the study area staying separate is
   where the acquired-versus-authored distinction becomes visible instead of written down.

   Two things this needs that do not exist. `playbackOrder()` is `buildOrder(workflow)` over the
   single current workflow and `playbackView()` filters that one workflow, so playback must become
   a list of `(workflowKey, nodes)` segments with a load at each boundary — and `loadExample`
   resets `history`, `result` and `statuses`, so the crossing cannot go through it unchanged. The
   comment at `app.ts:197` records that this hazard has bitten once already. And the playback
   control currently demonstrates the progressive reveal rule of
   [112](112-progressive-widget-reveal.md); a project playback demonstrates input reuse. Same
   button, two claims, and they need separating or it teaches whichever the reader guesses.

Closing this document is a measurement and a diff. Whether the model matches how investigations
are actually organised is a different question, asked in
[field-questions.md](../field-questions.md), and this document does not wait on it.
