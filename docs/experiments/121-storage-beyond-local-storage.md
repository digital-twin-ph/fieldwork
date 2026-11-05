# 121 · Storage beyond localStorage

_Created 2026-10-19 · Updated 2026-11-05_

**Status:** tried — the payload store is built and in use. It holds a node's `data`, a wide table's source
(`sourceRef`, experiment 175) and, since 2026-11-05, an acquired study area's outline and revisions (`areaRef`).
Repairs, decisions, raster assets and hand-drawn areas still sit in `localStorage`, written twice per save. What it
costs in time, and what happens under eviction, is still unmeasured.
_Status corrected 2026-11-05: it said "what a study area may hold is still decided by the smallest store the browser
offers"; for an acquired outline it no longer is._

## The question

The practitioner, 2026-10-19, on finding the study-area budgets sized against a 5 MB limit:

> *"Just curious can be we storage that can store bigger sizes of artifacts?"*

Yes, by two to three orders of magnitude — and the number was already in hand from the probe
that set the budgets in the first place.

| store | measured quota, Chromium | measured quota, WebKit |
|---|---|---|
| `localStorage` | **5,226,496 B** | **5,226,496 B** |
| IndexedDB / Cache / OPFS (`navigator.storage.estimate()`) | **10,737,418,240 B** | **1,048,576,000 B** |

Roughly **200× to 2,000×**. The budgets in decision A03 — 1 MiB for one extent, 1.5 MiB across an
area's revisions — exist because `localStorage` is where a workflow is written, twice per save,
beside every other saved workspace. They were measured honestly against the wrong store.

For scale: all 189 DRC ADM2 units at full fidelity are 5.7 MB of JSON. That is already past
`localStorage` and unremarkable for IndexedDB.

## Why this is not a tweak

- **`localStorage` is synchronous and IndexedDB is not.** `save()` writes two keys and rolls both
  back in one synchronous pass, and reports "Storage unavailable — export to keep" when it
  cannot. All of that becomes asynchronous, including the rollback, which is the part that
  protects a practitioner's work when a write fails halfway.
- **Quota is not a guarantee.** Browsers evict under storage pressure unless
  `navigator.storage.persist()` has been granted, and WebKit is the stricter of the two. A study
  area that silently disappeared would be worse than one refused up front, which is the whole
  reason the budget refuses with a size named.
- **The engines differ tenfold**, so a budget is still needed. A larger one, chosen against a
  measured persistence guarantee rather than against whichever store happened to be in use.

## It stopped being hypothetical, 2026-10-20

The practitioner set the new driving mode on the Street network widget, downloaded Bunia, and got
*"This could not be saved on this device, so it was not kept."* The download had worked. The save
had not, and because a network download is kept only if it persists, the graph was rolled back and
nothing survived the attempt.

The numbers, with their basis stated:

| | |
| --- | --- |
| localStorage, measured on this device, both engines | 5,226,496 B |
| Writes per save (the open workflow and the saved workspaces) | 2 |
| So a workflow may cost, at most | ~2.6 MB |
| Bunia, measured 2026-10-19 | 42,796 vertices |
| Cost per vertex, measured on the Soho graph this repository ships (738 nodes, 1,619 edges, 61.8 B per node and 123.3 B per edge at 2.19 edges per node) | ~332 B |
| **Bunia, estimated from those two** | **~14.2 MB, written twice ~28.4 MB** |

The vertex count is measured and the per-vertex cost is measured; the product is an estimate,
because no Bunia graph has been serialized and weighed. It does not need to be exact to settle the
question: the graph is between five and six times the entire quota.

**So the advice the application gave was wrong.** The refusal said to export the workflow or open
fewer worked examples. The second half is sound when a workflow would fit beside less company and
is false here — clearing every other example would have freed nothing like enough. The message now
weighs the workflow first and says plainly that it will not fit however much else is cleared, and
quotes what a saved network *can* carry on this device: about **7,900 junctions**.

That figure is the finding. The widget's graph limit knob offers **50,000**, raised on 2026-10-19
under the principle that a framework testing the limits of the browser must be allowed to reach
them. It still should be — but 50,000 is a limit on what this application will *normalize*, and
7,900 is a limit on what the device will *keep*, and the second was never stated anywhere. A
practitioner meets it after the download, after the wait, after the service has been asked.
[125](125-caps-below-the-limit-we-are-testing.md) is the mirror of this: there the caps were below
the limit being tested, here a cap is six times above what the store can hold.

## What was built, 2026-10-20

`src/payload-store.ts`: an IndexedDB store for the payloads a workflow refers to, with the
workflow itself left in localStorage, where a synchronous read at boot and a synchronous write on
every edit are what the editor is built on. What moves is the data, not the document.

The reference machinery already existed — `dataRef`, `payloadDigest`, `dehydrateWorkflow` and
`hydrateWorkflow`, built for sharing one payload between the workflows of a project
([122](122-a-project-holds-many-workflows.md)). It had no store that could hold what it addressed.
Now a downloaded or imported street network is written to IndexedDB **before** the workflow records
the digest that points at it, because a reference written first and a payload written later is a
workflow that reloads into a refusal.

**Measured in Chromium on the day**, on a synthetic 40,000-junction graph built to be larger than
the whole old quota:

| | |
| --- | --- |
| The graph | 8,096,643 B — 1.55× the entire localStorage quota |
| The saved workflow beside it | 64,924 B |
| Survives a reload | yes, hydrated back from the store |

**A second copy was found while proving it.** The first attempt still wrote 2.25 MB to
localStorage with the graph already gone. The project manifest ([24](24-encrypted-project-packages.md))
inventoried **every junction id and every `from:to` pair** — a duplicate of the graph's topology
inside the workflow, written twice per save. It now carries counts and the payload's own SHA-256,
which says the same thing in constant space and says it better: a content digest is a
cryptographic identity, where a rebuildable id list is not. The manifest schema is at 2, and a
manifest at schema 1 is treated as legacy and replaced on its next save — the accommodation that
already existed for a workflow with no manifest, because refusing them would make every workflow
saved before today unloadable.

**The fallback was the next defect, and it was worse than the one being fixed.** The practitioner,
reading the first version:

> *"Store fallback is dangerous especially when the primary mode keeps on failing."*

The code proved the point on itself. `putPayload` returned a boolean, and it returned `true` when
a write had fallen back to the **small store** — so a database that OPENED and then refused every
write looked, to the migration, exactly like one that had accepted everything. The migration then
deleted the legacy localStorage key, which at that moment held the only copy. A practitioner whose
IndexedDB was blocked would have lost their saved payloads on the next page load, in the change
that existed to stop them losing a download.

Three things changed:

| | |
| --- | --- |
| `putPayload` returns **where** it landed — `indexeddb`, `local` or nothing — never a boolean | the middle case can no longer be read as the first |
| The migration drops a legacy entry only when the **large store** confirms that payload, and rewrites the rest | a partial move keeps what it could not move |
| A write is confirmed by the transaction **completing**, not by the request succeeding | the IndexedDB trap where a `put` reports success and the transaction then aborts on quota |

And the degradation is loud. One toast in the failure tone the moment the store changes, and the
Street network widget carries a warning **before** a download rather than a status line after a
save: *"This device is keeping saved data in the small store, which holds about 5 MB in total."*
A silent fallback is the hazard, because it turns a 10 GB ceiling back into a 5 MB one while the
application goes on reporting "Saved on this device".

## The geometry never moved, 2026-10-21

The practitioner built an Ituri workflow beside the North Kivu one and was told *"Study area could
not be saved."* That is this experiment's ceiling reached from the other direction: the payload
store holds a node's `data` behind a `dataRef`, and that is **all** it holds. `dehydrateWorkflow`
drops exactly one field, and only when the large store confirms the digest. A study area's
geometry, its revisions, a repair, a decision and a raster asset all stay in `localStorage`, written
twice on each save, beside every other workspace in the project. So the 200×–2,000× headroom this
experiment measured is not available to the thing that most often runs out: an administrative
outline, which is 39.2 bytes per vertex and which the practitioner acquires rather than clicks.

Two separate guards exist and neither covers the case. `validateAreaParams` refuses an area whose
extents exceed 1.5 MiB, which the Ituri outline did not, and `storageRefusal` explains a full store
— but `save()` caught the failure, rolled back, returned `false`, and discarded the reason, so every
caller could say only *"Retry Apply."* Retrying fails identically when the cause is a full store.
Fixed the same day: the reason is kept and the refusal names it. That is a better report, not a
larger store, and the store is what the practitioner needs.

What this adds to the direction: moving `data` was the easy half, because a digest already
identified it and a reference already stood in for it. The rest of a workflow has no such handle,
so the asynchronous `save()` this experiment calls "not a tweak" is the only route for geometry.
Until that is built, a project with two acquired provincial outlines is at the ceiling.

## The geometry moved, 2026-11-05

The practitioner picked Uganda at ADM0 in the Study area dialog: *"nothing showed up on the dialog map."* Reproduced
against geoBoundaries' file: one unit, a MultiPolygon of 48 parts, 43,116 vertices. Three defects:

| Defect | What it did |
| --- | --- |
| The 1 MiB extent budget (`GEOMETRY_BYTE_BUDGET`) | Refused the mainland alone, 37,760 vertices and 1,215 KB, and advised *"a coarser administrative level"*, which at ADM0 does not exist |
| The refusal's place | A muted line under the unit list, while the map moved to Uganda and drew nothing |
| One unit, one part | `publishedRings` kept the largest part and dropped the other 47, the Ssese Islands of Lake Victoria among them, under a note that one outline is what a study area holds, untrue since several units became several parts |

The section above said the geometry could only move with an asynchronous `save()`. It did not need one. Experiment
175 had since given tables a synchronous content key (cyrb53, computed on every save), and the same key serves an
outline: `areaPayloadKey` over the geometry and its revisions, so an edited outline gets a new key and a stale one can
never stand in for it. `dehydrateWorkflow` drops `geometry` and `revisions` behind `areaRef` when the store holds it;
`hydrateWorkflow` puts them back, and refuses when it is missing, as for `data`. `payloadsOf` lists every payload a
node holds, so `save()` and the project import write all three kinds from one list.

**Only acquired outlines move.** One whose `boundary` record says it came from a published source or a file. A shape
drawn by hand stays inline: small, and read as it sits by the sibling-area picker and by eight browser tests. The same
line polygon layers draw. Templates clear `areaRef` with the outline, or a fresh template would have its outline
restored from the store.

**Both budgets are removed**, the extent's 1 MiB and the area's 1.5 MiB: what they protected was localStorage. A store
that falls back to localStorage still refuses at save, and `storageRefusal` says why. Each was registered in
`widgets/caps.json` as a discovery cap with the lift test *"geometry leaves localStorage"*; the test was met, so both
leave the register and the ontology (`urn:fieldwork:cap:geometry-bytes`, `urn:fieldwork:cap:area-bytes`), and the
ceiling on unmeasured discovery caps falls from 12 to 10. The gate's caps check found them first: a cap whose
constant no file exports governs nothing. A first attempt kept them as deprecated terms; the vocabulary shapes require
a deprecated term to name its replacement, and a lifted limit has none. **Every part is carried**, and a
refusal is also said in the dialog's status line, as an alert.

### Validation, 2026-11-05

| Check | Platform | Result |
| --- | --- | --- |
| Uganda ADM0, geoBoundaries' file, in Node | Node | 48 parts, 43,068 vertices, 1.43 MB; `validateDrawnGeometry` 140 ms; the key 9 ms |
| `tests/project.test.mjs` | Node | the area round trip: key, strip, restore, refuse when missing, a new key for an edited outline |
| `tests/boundary-source.test.mjs` | Node | 27 of 27: a boundary past the old budget admitted; a unit's three parts all carried |
| `tests/boundary-picker.browser.mjs` | Chromium | 10 of 10, two new: a country of three parts past 1 MiB applied with every part, kept in the store, back after a reload with the workflow under 200 KB; a crossing outline refused in the status line as an alert |
| The real Uganda ADM0 through the dialog, once, from geoBoundaries (a scratch test, not kept) | Chromium | 48 parts drawn; *Use the selected units* 0.88 s, *Apply* 0.89 s; the outline in the store, the saved workflow 73,513 bytes |

**What this does not establish.** WebKit, which CI runs and which has been slower on large outlines (North Kivu, 7.7 s
where Chromium took 0.1). A size at which the dialog stops being usable: Uganda is the largest tried. Eviction: an
outline in IndexedDB can be evicted by the browser, and a missing payload then refuses the workflow rather than
emptying it, which has not been observed.

## What this does not establish

- **Whether the Ituri refusal was the store being full or something else.** The reason is now
  reported rather than discarded, and the quota branch is covered by a test that leaves no
  headroom. What the practitioner's device actually reported has not been read back.
- **That Bunia now works.** It establishes that a graph larger than the old quota is kept and
  reloads. Nobody has downloaded Bunia since the store was built; the practitioner's next attempt
  is the test, and the graph has still never been serialized and weighed.
- **Nothing is ever deleted from the payload store.** A payload whose last reference is gone stays
  on disk, because reference counting across saved workspaces, projects and the undo history is a
  separate piece of work and guessing at it would delete a practitioner's data. The store grows.
- **No measurement of what the IndexedDB write costs in time**, against the synchronous write it
  replaces. The download it follows takes seconds; a write that takes tens of milliseconds would
  not be noticed, and that is an assumption rather than a reading.
- **That 14.2 MB is Bunia's actual cost.** It is a product of two measured numbers and no Bunia
  graph has been serialized and weighed. The conclusion it supports — that the graph is several
  times the quota — holds at any plausible error in it.
- **That a larger store would make the graph usable.** It would make it keepable. Whether a graph
  of that size is workable on the canvas, in the isochrone worker and in a receipt is a separate
  question, and 125's unmeasured caps are where it gets asked.

- Nothing has been measured about `navigator.storage.persist()`: whether either engine grants it
  without a user gesture, what it is granted in response to, and what eviction actually does to a
  database that was not granted it. That is the fact the decision turns on and it is not in hand.
- `navigator.storage.estimate()` reports a quota, not an allocation. Neither engine was asked to
  write anything near it, and a reported 10 GB that fails at 200 MB would change the answer.
- No measurement of what IndexedDB costs in *time* for a workflow-sized write, against the
  synchronous write it replaces.
- Nothing here says artifacts other than geometry — rasters, PMTiles extracts, network downloads
  — belong in the same store. OPFS suits large binaries and IndexedDB suits structured records,
  and this note does not choose between them.
- It does not establish that the budget should rise. A ceiling nobody chose is a bad reason for a
  limit; it is not by itself a reason to remove one.

## What would close it

Probe `navigator.storage.persist()` in both engines and record what is granted and on what
condition. Write a workflow-sized record and a raster-sized one to IndexedDB and OPFS in both,
and time them against the current synchronous write. Then put the budget back to the practitioner
as a decision about what a study area may hold, which is what A03 turned out to be.

Carries the open questions from [PMTiles as the offline basemap](../TODO.md) — where a downloaded
extract should live — and the storage half of
[01](01-study-area.md)'s restated decision A03.
