# 150 — Can several authors collaborate on a publication in a project repository?

_Created 2026-10-29 · Updated 2026-10-29_

**Status:** asked — the question is posed and the architecture is unbuilt. Step 1 of the pilot below is done, and what exists was measured; those measurements already rule one option out. What exists was measured, and the
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
   graph, and a silently merged graph is a graph neither author drew. **This is now the decision
   that unlocks the rest**, for the reason the measurement below gives: the write path commits one
   file at a time and detects collisions per file, so file granularity *is* the merge strategy.
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
   **Measured 2026-10-29 and answered — see the next section.**

## What a browser can do, measured 2026-10-29

Question 8 bounded every other answer, so it was measured before anything was designed on top of
it. Nothing here is a capability check against documentation; these are the responses, and the
whole plan rested on one header.

**Fieldwork already clones, read-only.** The example fetch is a clone by manifest rather than by
git: `rawBase` plus a pinned 40-hex commit plus 19 files each with a `sha256` and a `bytes`.
`fileURL` refuses a path the catalog does not pin and refuses a branch or a short hash, and
fetched bytes are verified with a refusal rather than a warning. That is a narrower trust root
than `git clone` has — path-restricted and digest-verified — and it was buildable because of the
2026-10-23 measurement that `raw.githubusercontent` answers `access-control-allow-origin: *` even
at a commit SHA and for a binary asset.

What it is **not**: writable, complete (a sparse checkout — the 5,341,773-byte plate is
deliberately unpinned), or historied. The last is the real constraint. **There is no merge base in
a browser**, so three-way merge is not available at any granularity.

**The write path exists.** `api.github.com` was probed from the deployed Pages origin,
`https://digital-twin-ph.github.io`, with no credentials — a browser never sends credentials on a
preflight, so the decisive request needs none:

| request | result |
| --- | --- |
| `OPTIONS` preflight, `PUT`, `authorization,content-type` | **204**, `access-control-allow-origin: *` |
| | `access-control-allow-methods: GET, POST, PATCH, PUT, DELETE` |
| | `access-control-allow-headers: Authorization, Content-Type, If-Match, If-None-Match, …` |
| | `access-control-max-age: 86400` |
| `OPTIONS` preflight, `DELETE` | 204, `access-control-allow-origin: *` |
| `GET /user`, no token | 401, `access-control-allow-origin: *`, `x-ratelimit-limit: 60` |
| `GET` contents | 200, `access-control-allow-origin: *`, **`etag:` present** |
| `HEAD` contents | 200, `access-control-allow-origin: *` — **no trap here** |
| `PUT` contents, no token | 401, `access-control-allow-origin: *` |
| preflight from `https://example.invalid` | 204, `access-control-allow-origin: *` |

**So the GitHub Contents API is reachable from the browser, for writes, with no backend.** Five
consequences, each from a line above:

1. **Per-file commits with collision detection built in.** `PUT /repos/{owner}/{repo}/contents/{path}`
   takes the blob `sha` as a precondition, and `If-Match` is an allowed header with `ETag`
   exposed — so a stale write is refused by GitHub rather than detected by us. **This is why
   question 1 is now the decision that unlocks the rest.** Against one 394,503-byte gzip the
   precondition buys nothing, because every save is a whole-project collision. Against one file
   per workflow and one per note, a collision is *"you both changed this note"* — a thing an
   epidemiologist can adjudicate, and a thing a conflict inside a gzip cannot even express.
2. **Conflicts are made rare and legible, not mergeable.** With no merge base, that is the only
   honest design, and it is a reason to choose granularity on what people edit rather than on what
   is convenient to serialise.
3. **One credential does both jobs.** The token that writes a file also answers `GET /user`, which
   is exactly the `attested` tier of `src/identity.ts`. Identity and persistence are not two
   integrations.
4. **`access-control-allow-origin` is `*`, not the echoed origin** — the last row confirms it is
   not origin-bound. That is a security property rather than a gap: with `*` a browser refuses
   `credentials: 'include'`, so this can never ride on the practitioner's GitHub session cookies.
   A token has to be explicit, which is the behaviour we want and did not have to build.
5. **Authorization is never Fieldwork's.** "Authors are co-owners of the project repo" is a GitHub
   collaborator list. The application implements no permission model, and a write it is not
   entitled to make is refused by GitHub with the CORS headers intact, so the refusal is readable
   rather than an opaque network error.

The credential store has never made an authenticated request — `credentials-ui.ts` says so in its
own copy, *"Existing input nodes do not yet make authenticated requests"* — so this would be its
first consumer, with a fine-grained token scoped to contents on one repository.


## What belongs to the publication thread, not here

Two things were worked on 2026-10-29 that this document is **not** the home for, recorded here only
so a reader of 150 can find them. The practitioner's ruling the same day, after they had started to
blur: *"We are seesawing between notes/publication and collaborative projects/publications so let's
be sure we put the documentation in the right experiment. They are connected but for clarity we
have to separate."*

- **Equations as notes**, and the MMWR survey behind them, are in
  [141](141-organising-snows-notes.md). They concern what a report carries, not who can co-own one.
- **The author contributions statement** is in the same place, for the same reason: it is
  publication apparatus, assembled like a title or a reference list. It *depends* on this document
  for the identities it names — `fw:Author`, and the two tiers of `fw:identityBasis` — and the
  dependency runs one way. Identity is a prerequisite for co-ownership; a contributions statement
  is a thing a publication prints.

- **Degrees of reproducibility** are [54](54-degrees-of-reproducibility.md)'s, which already
  grades inputs on a six-rung ladder — retained, pinned, versioned, dated snapshot, seeded, live —
  and holds the two rules that matter: a figure's grade is the **minimum** over its inputs, and the
  grade is capped by producer identity. A discussion on 2026-10-29 of what this thread contributes
  to reproducibility re-derived a weaker version of that from the worked-example audit's counts
  before 54 was cited. The corpus standard is explicit that this is the failure mode: *"an
  experiment that re-derives existing work is worse than no experiment, because it adds a second
  account to disagree with the first."* 54 is the account.

The boundary, so it stays put: **this document is about the repository** — its format, its
granularity, its assets, its write path, and who is entitled to change it. Anything about what the
write-up itself says belongs with the notes.

## The pilot: sea level rise, with a second author

The practitioner, 2026-10-29: *"We can prototype the collaborative project with sea level rise. I
have a colleague working with me on this project and we can develop the workflows together and test
the collaboration aspect on GitHub, beginning with tracking identity in downloaded projects."*

**Why this is the right example to pilot on, and it is not convenience.** Sea level rise is one the
practitioner already named as unfinished — *"Old Naledi, sea level rise (incomplete), heat,
raster"* — and the worked-example audit measures the gap: two of its nodes carry data and declare no
source, `facilities` from `find_health_facilities` and `projections` from `table_input`. So the
workflows have to be **developed**, not demonstrated, and a collaboration test over work that is
already finished would test nothing. It is also **not** a sibling repository yet: unlike South
London it ships bundled in the application, so the pilot includes making it one, which is the
repository question itself rather than a step before it.

**And there is a second author who is a real person.** Every measurement in this document so far has
one name in it. A conflict, a stale `sha`, an unfamiliar login in a receipt — none of those can be
observed with one person at one keyboard.

### Step 0 — the repository, the token, and where the token is kept

The practitioner, 2026-10-29: *"Steps begin with creating the repo, obtaining API token including
what permissions to give to the token, (this becomes a spec) and recording them in credentials
manager."* So the three things below come before everything that follows, and the middle one is
written as a specification because a token granted too widely is the kind of mistake that is
discovered later and cannot be undone by apologising.

**0a. Create the repository — from a template.** The practitioner, 2026-10-29: *"What we should
have is a template repo to clone."* GitHub has this natively: a repository with `is_template` set,
instantiated by *Use this template* or by `POST /repos/{template_owner}/{template_repo}/generate`.
Owned by the account or organisation that will hold the project, with the colleague added as a
collaborator with write access. Co-ownership is GitHub's model and the permission layer is GitHub's;
nothing in this application decides who may write.

**Two things follow from the template, and the first protects the token spec below.**

**Creating the repository stays a human action in the browser.** The generate endpoint's own
documentation says *"OAuth app tokens and personal access tokens (classic) need the `public_repo`
or `repo` scope to create a public repository, and `repo` scope to create a private repository"* —
repository *creation* is an account-level power, not a per-repository permission, so a token that
could do it would be far broader than the one 0b specifies. There is no reason for this application
to hold that power: a practitioner clicking *Use this template* once per project costs nothing, and
the token stays confined to the contents of one repository. **The template makes repository creation
cheaper without making the token stronger**, which is the best possible outcome for this step.

**And making the template IS deciding competency question 1.** A template is a directory layout, and
the layout is the format — so whatever the template ships with becomes the project format by
default, for every project anyone starts from it. A template built today around a single
`fieldwork-project.json.gz` would entrench the one thing the measurement above rules out, and it
would do it quietly, in every repository created afterwards. So the template is not a step before
the granularity decision; it is that decision, written down where it will be copied. **Step 5 moves
here, or the template waits for step 5.**

Worth checking when the template is made, because the documentation does not say: what is actually
copied. The page documents `include_all_branches` — *"Set to true to include the directory structure
and files from all branches in the template repository, and not just the default branch"* — and says
nothing about whether git history comes across. A project repository whose history begins at the
template's first commit is the expected behaviour and the one the contributions statement would want;
it should be confirmed rather than assumed.

**0b. The token specification.** Checked against GitHub's own permissions reference on 2026-10-29
rather than written from memory.

| | |
| --- | --- |
| **Kind** | **Fine-grained** personal access token. **Not** a token (classic) |
| **Resource owner** | the account or organisation that owns the project repository |
| **Repository access** | *Only select repositories* → the one project repository |
| **Repository permissions** | **Contents: Read and write** — and nothing else |
| **Expiration** | short, and reissued rather than extended |

Why each line is there:

- **Not classic.** A classic token's `repo` scope reaches *every* repository the account can see, and
  the endpoint docs say so plainly: *"OAuth app tokens and personal access tokens (classic) need the
  repo scope to use this endpoint."* A fine-grained token can be confined to one repository, and
  this one should be.
- **Contents: Read and write** is the exact permission. `PUT /repos/{owner}/{repo}/contents/{path}`
  is listed under **Contents** with **write** access.
- **Do not grant Workflows.** The same endpoint also appears under **Workflows (write)**, which is
  needed *only* to write files under `.github/workflows`. A project repository may well carry a
  Pages workflow, and the token that saves a practitioner's notes has no business being able to
  rewrite CI. If a workflow file ever needs changing, that is a separate token and a separate
  decision.
- **No user permission is needed for attestation**, which is the useful finding. `GET /user` does
  not appear in the permission tables at all, and the users documentation says tokens without
  `read:user` *"receive the public user response"* — which still carries `login`. Attestation needs
  the login and nothing else, so turning a `declared` identity into an `attested` one costs no
  additional grant.
- **Reads need no token.** `raw.githubusercontent.com` serves a public repository unauthenticated,
  which is how the example catalogue already works. The cost is the rate limit measured above:
  `x-ratelimit-limit: 60` per hour unauthenticated, which a fetch-heavy session could reach.

**0c. Record it in the credentials manager.** The store exists, encrypts at rest and locks after
fifteen idle minutes. The fields it validates map onto this without being bent:

| field | value |
| --- | --- |
| `provider` | `github` |
| `origin` | `https://api.github.com` — exactly, no path; the validator refuses anything else |
| `ref` | a name of the practitioner's choosing, letter-initial |
| `secret` | the token |

**Tested 2026-10-29, before anything was built on it**, at the practitioner's direction: *"let's
test credentials manager first."* Exercised against the built module with the credential the spec
above describes, not against a simplified one:

| check | result |
| --- | --- |
| the spec'd GitHub credential validates | accepted |
| `list()` withholds the secret | only `ref`, `provider`, `label`, `origin` returned |
| `resolve` binds the **origin** too | `github` @ `api.github.com` resolves; the same ref at `raw.githubusercontent.com` is **refused** |
| `resolve` binds the **provider** | `gitlab` @ `api.github.com` refused |
| encrypted file | 468 bytes; the token does **not** appear in it, and neither `provider` nor `label` leaks in plaintext |
| round trip | the secret is recovered byte for byte |
| wrong passphrase | refused, with a message that does not say which part was wrong |
| passphrase under 12 characters | refused at encryption |
| idle lock | unlocked at 14 minutes, locked at 15 minutes and one millisecond |

Its four unit tests and three browser tests pass. **The store itself is not the risk in this plan.**
The origin binding is worth noting as measured rather than assumed, because it confirms the
consequence stated above: an authenticated read of `raw.githubusercontent.com` genuinely cannot
reuse this credential.

### Authenticating first, and what that reorders

The practitioner, 2026-10-29: *"The first thing user does when working on a project is
authenticate."*

**Today it is neither first nor prompted.** `Credentials` is a button in the project bar beside
Import, Back up and Run — a detour a practitioner has to know to take — and `openProjectDialog`
collects a name and a subject and nothing else. Authentication is optional and late.

**And the reordering solves a dependency rather than just moving a button.** The authorship default
above needs a *current identity*, and there is none anywhere in `src/`. Unlocking a credential is
exactly where one can be obtained: the token answers `GET /user`, which returns a `login`, which is
an **attested** identity at no additional grant. So authentication and identity are one step, not
two features — unlock, and the application knows who you are well enough to make you the first
author of what you create.

**One tension to settle before it is built, because it cuts against the mission.** A credential is a
file plus a passphrase. Putting that in front of *every* project would charge a passphrase to a
practitioner who wants to draw a study area and go home — and most projects need no token at all,
South London included, since reads are public. So the honest form of the rule is **authenticate
first when opening a *collaborative* project** — one that names a repository — and not as a gate on
all work. A decrease in friction for evidence generation that adds friction to everything else has
not been measured, only relocated.

Two honest notes on this step. **The credential store has never made an authenticated request** —
`credentials-ui.ts` says so in its own copy, *"Existing input nodes do not yet make authenticated
requests"* — so the pilot is its first consumer and the plumbing from a stored credential to a
`fetch` is unbuilt. And **a credential carries one origin**, so an authenticated *read* of
`raw.githubusercontent.com` would need a second entry. Today it needs none, because reads are
public.

### The authorship default: the repo owner is the first author

The practitioner, 2026-10-29: *"But a project starts from scratch so the owner of the repo is first
author by default."*

This completes a rule whose other half shipped the same day, and the two are consistent because
**authorship follows creating, not opening**:

- **Creating** a project makes you its author, and its first — which is the byline position, and
  `contributions()` already preserves the author order it is given rather than re-sorting by volume.
- **Importing** somebody's project does not. `importProjectDocument` deliberately does not add the
  person importing, because an application that quietly appended the importer would manufacture
  authorship on a publication.

**What this depends on, and it is not yet built.** `newProject(name, subject, all)` takes no
identity, because the application has no notion of who is using it: there is no current identity
anywhere in `src/`. The default cannot be applied until there is somewhere for *my own* login to
live — which is also what step 3 below needs in order to add a colleague. So the sequence is:
a current identity first, then this default, then step 3.


### Step 1 — identity in a downloaded project. **Done 2026-10-29, and it found a defect.**

The practitioner put this first, and it was the right place to start because the answer was no.
`importProjectDocument` mints a project from the name and the subject:

```
const project=newProject(document.project.name,document.project.subject,allProjects());
```

So a downloaded investigation arrived **crediting nobody** — and a project whose notes name an
author it does not list is a publication with an unlisted author. This is the same omission, in the
same function, that [149](149-the-notes-spike.md) found for the notes nine hours earlier, and the
notes fix sitting two lines above it did not generalise on its own.

Fixed: `project.authors` is carried, read tolerantly, an unreadable identity dropped. **What is
deliberately not done: the importer is not added as an author.** Opening somebody's project does not
make you an author of it, and an application that quietly appended the importer would manufacture
authorship on a publication.

Proven at unit level (`readAuthors`, and the `AuthoredNote.author` reader fixed the same day). **Not
yet proven in the browser** — the import path has browser tests and none of them yet asserts an
author survives the round trip, which is step 2's first task.

### The remaining steps, in order, with what each one answers

2. **Round-trip one author through export and import, in a browser test.** Cheapest possible check
   that identity survives the only path a colleague will use. Answers nothing architectural; it
   stops step 1 from being a claim.
3. **Give the colleague a login, in the application, and both authors to the project.** The first
   time `Project.authors` holds two names. Watch the author contributions statement, which is now
   assembled from the record ([141](141-organising-snows-notes.md)) and which has only ever been
   rendered for one person.
4. **Make sea level rise a sibling repository**, pinned like South London — commit, `sha256` and
   `bytes` per file, `validate:examples` refusing on drift. This is the clone-by-manifest path that
   already works, so it should be unremarkable; if it is not, the format is why.
5. **Decide granularity before writing anything back — competency question 1.** Which is also what
   step 0a's template settles, since a template's layout *is* the format; whichever happens first
   decides for the other. The pilot is the forcing function. South London's bundle is one gzipped file and its notes are stored *twice*, and
   on 2026-10-29 the two copies diverged within hours: nine edges written to the plain file reached
   the bundle only when they were synced by hand. Two authors will reproduce that divergence
   continuously rather than once.
6. **Attest one identity.** `GET /user` with a fine-grained token, turning a `declared` login into
   an `attested` one. The preflight is measured and the token also writes, so this is the same
   credential as step 7.
7. **Write one file back through the Contents API**, with the blob `sha` as the precondition. One
   author, one file, no conflict: establishes the path works from the browser.
8. **Then collide on purpose.** Both authors change the same note from stale state. Does GitHub
   refuse the second write, and does the application say something a person can act on? This is
   the question the whole document exists for, and it cannot be answered alone.
9. **Then collide on different files.** Both authors change different workflows of the same project.
   This must *not* conflict. If it does, step 5 was decided wrongly, and that is the finding.

### What the pilot cannot settle

- **Two authors is not a team.** Ordering, review, and who arbitrates a conflict are social
  questions that two cooperating people will not surface.
- **A colleague who is also a co-owner tests no permission model.** Everything here runs with write
  access on both sides. A reviewer, a reader, and someone whose access was removed are untested, and
  authorization is GitHub's rather than ours precisely so that it need not be built — but that is an
  argument, not a measurement.
- **Nothing about the epidemiology.** Whether the sea level rise workflows are any good is
  [147](147-table-shells-begin-with-the-end-in-mind.md)'s question and the study-design audit's, not
  this document's.


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
- **That an authenticated write works.** The preflight was measured and the unauthenticated `PUT`
  was refused with its CORS headers intact, which is what a browser needs to proceed and to read
  the refusal. No token was presented, so no write was performed and no write is claimed here.
- **The authenticated rate limit.** `x-ratelimit-limit: 60` is the *unauthenticated* figure, which
  is what these probes carried. What a signed-in practitioner gets was not measured, and a
  per-file write path makes the per-hour ceiling an architectural quantity rather than a detail.
- **That `*` holds for every endpoint.** Contents, `/user` and the preflights were probed. GitHub
  may answer differently elsewhere, and the 2026-10-23 `HEAD` trap is the standing reminder that
  this is measured per request and not per host — though `HEAD` on `api.github.com` does *not*
  reproduce it.
