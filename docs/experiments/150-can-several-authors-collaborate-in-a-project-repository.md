# 150 — Can several authors collaborate on a publication in a project repository?

_Created 2026-10-29 · Updated 2026-10-29_

**Status:** asked — the question is posed and nothing is built. What exists was measured, and the
measurement already rules one option out. What would answer the rest is named at the end.

The practitioner, 2026-10-29, after [149](149-the-notes-spike.md) showed that notes carry their own
edges:

> *"The most important component of this is can several authors actually collaborate on a
> publication? If an outbreak investigation project is set up as collaborative, can the artifacts
> exist in a git repository, including the notes and the publication? Authors merely are co-owners
> of the project repo."*

And the architectural half of it: *"many related to how a FW project is architectured — workflows,
and their graphs, assets downloaded and configured. Can these end up as repo components? How should
the project repo be formatted and organized? We already have credentials management, what we do not
have is user identity, which we can probably synchronize with GitHub."*

Why this is a developmental-evaluation question and not a feature request: the mission says we
decrease friction for evidence generation from the use of these workflows. A publication with one
author has no coordination cost to decrease. An outbreak investigation does not have one author.

## What already exists, measured

**A Fieldwork project already lives in a git repository.** `example-1855-cholera-south-london` is
not a data drop. It carries, beside its `README.md` (33,306 bytes), `LICENSE`, `NOTICE.txt` and
`provenance.json`:

| | |
| --- | --- |
| `fieldwork-project.json.gz` | 394,503 bytes — the project, six workflows, nine notes |
| `geo/` | 10 entries |
| `data/` | 4 entries |
| `notes/` | 1 entry — `snow-quotations.json`, the nine quoted notes |

And `widgets/examples.json` already pins it the way a collaborator would need it pinned: a
`repository`, a `commit`, and 19 files each with a `sha256` and a `bytes`, with `validate:examples`
refusing when the bytes on disk disagree. **The distribution half of the problem is solved.** A
reader fetches a named commit and can prove they got what was pinned.

So the question is not whether the artifacts *can* sit in a repository. They do. The question is
whether two authors can both change them.

## The measurement that rules one option out

Unpacked, the bundle is 815,252 bytes of JSON in **one file**, and the weight is not evenly spread:

| workflow | bytes of JSON |
| --- | --- |
| `south-london/choropleth` | 464,137 |
| `south-london/ground` | 287,549 |
| `south-london/mortality` | 25,025 |
| `south-london/contingency` | 19,348 |
| `south-london/1849-and-1854` | 9,192 |
| `south-london/water-company` | 3,998 |

**Two workflows are 92% of the project.** That weight is embedded data — geometry inlined into node
parameters — and it duplicates files already sitting in the same repository as plain text. Probing
the bundle for each `geo/*.geojson`:

```
IN BUNDLE  sub-districts-csds.geojson        120,806 bytes on disk
IN BUNDLE  thames-reaches.geojson            182,704 bytes on disk
IN BUNDLE  thames-tidal-limit.geojson          1,114 bytes on disk
IN BUNDLE  water-intakes.geojson               3,470 bytes on disk
not found  map2-water-supply-zones.geojson     10,324 bytes on disk
```

**308,094 bytes are stored twice** — once as a mergeable text file, once inside an opaque gzip.

This is the finding. The project format is *already* in a repository and is organised in precisely
the shape that defeats co-ownership:

- **One file.** Two authors editing different workflows of the same project produce a conflict on
  the same blob.
- **Gzipped.** Git cannot diff it, cannot three-way merge it, and `git log` on it says only that
  394KB changed. A reviewer cannot see what a co-author did.
- **Assets inlined.** Changing a boundary file means re-exporting the whole project, so an edit to
  one asset rewrites every author's bytes.

Beside it, `notes/snow-quotations.json` is plain JSON with one note per object. It merges. It took
nine edges on 2026-10-29 as a readable diff. **The repository already contains both the format that
collaborates and the format that cannot, and the one that cannot is the one holding the work.**

## Competency questions

Numbered so an answer can cite one.

1. **Granularity.** Is the unit of a file a project, a workflow, or a node? Two authors on different
   workflows must not conflict. Two authors on the *same* workflow probably must — a canvas is a
   graph, and a silently merged graph is a graph neither author drew.
2. **Assets.** Does a workflow reference `geo/thames-reaches.geojson` by path and digest instead of
   inlining it? `examples.json` already shows the vocabulary: path, `sha256`, `bytes`. If a node
   held that instead of the coordinates, the 92% goes away and the asset has one home.
3. **Downloaded and configured assets.** A PBF extract is 100s of MB and nobody should commit it.
   What gets committed — the *declaration* that reproduces it (source URL, bounding box, tiling,
   digest of the result) rather than the result? That is the from-scratch rebuild claim from the
   worked-example audit, re-used as a storage format.
4. **The publication.** Notes are per-note objects and merge. Is the write-up itself a file, or is
   it assembled from notes at render time? [149](149-the-notes-spike.md) and the IMRaD-as-directed-graph
   framing of 2026-10-29 argue assembled: the apparatus — title, abstract, references — hangs off
   the graph rather than being authored in a place.
5. **Attribution.** Which author wrote which note? An `authored` note carries no author today. A
   publication's author list is a claim about who did what, and we cannot currently substantiate it
   from our own data.
6. **Identity.** There is none. `grep -n "identity\|user\|author\|owner" src/credentials.ts` returns
   nothing: credentials management holds secrets for *services*, not a person. Synchronising with
   GitHub is the practitioner's proposal and is the obvious one — the co-ownership model is already
   GitHub's, so the identity may as well be too.
7. **Conflict as a first-class outcome.** When two authors do collide, what does the application
   show? A merge conflict in a gzip is unreadable; a conflict in a note is two versions of a
   sentence, which is a thing an epidemiologist can adjudicate.
8. **What a browser can do.** Fieldwork is offline-first and runs in a browser. It cannot shell out
   to `git`. Does a collaborative project mean the application speaks to GitHub's API, or that it
   reads and writes a directory a practitioner syncs by other means? This bounds every answer above.

## What would answer it

Not a design document. The measurement above came from unpacking one file, and the next step is the
same kind:

- **Re-express one workflow as files** — `south-london/ground`, 287,549 bytes, with its four assets
  referenced by path and digest instead of inlined — and measure what is left. If the graph is a few
  KB of readable JSON, questions 1 and 2 are answered by demonstration.
- **Then run the two-author test on it**: two clones, two authors, one changing a note and one
  changing a node parameter, and see what `git merge` does without being helped.
- Question 6 is answerable separately and cheaply, because identity is a name and a handle attached
  to a note, not a login.

## What this does not establish

- **That the current format is wrong for its current job.** One gzipped bundle is a good *export*:
  it is what [149](149-the-notes-spike.md) showed travelling, and a single file a practitioner can
  download and re-import is the offline-first guarantee working. The claim here is narrower — it is
  wrong as a *co-owned* format, and those may both be true, in which case the answer is two
  representations and a conversion, not a replacement.
- **That git is the right substrate.** The practitioner proposed it and the distribution evidence
  supports it, but nothing here tested it against the alternative of a sync service, and a browser
  cannot run `git` on its own.
- **That the 92% is all removable.** `choropleth` and `ground` were probed for four known files;
  what remains in those 751,686 bytes after the assets come out has not been measured.
- **Anything about scale.** Nine notes, six workflows, one investigation, one author.
