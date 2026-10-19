# 121 · Storage beyond localStorage

_Created 2026-10-19 · Updated 2026-10-19_

**Status:** asked — the ceiling is measured and the alternative is not. What a study area may
hold is currently decided by the smallest store the browser offers, which nothing chose.

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

## What this does not establish

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
