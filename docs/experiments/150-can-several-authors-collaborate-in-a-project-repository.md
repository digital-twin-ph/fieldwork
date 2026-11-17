# 150 — Can several authors collaborate on a publication in a project repository?

_Created 2026-10-29 · Updated 2026-11-16_

**Status:** tried — the layout is published as `digital-twin-ph/fieldwork-project-template`,
competency question 1 was decided by measurement, and **from 2026-10-31 the application WRITES the
layout**: a project exports as a repository, and the 24 files it emits for South London are the
same 24 the hand-made conversion produced. Reading one back is unbuilt, so the converter is half
done and the half that exists is the half a practitioner needs first — it is how work leaves the
application and reaches a colleague. Step 1 of the pilot below is done, and what exists was measured; those measurements already rule one option out. What exists was measured, and the
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


## Can a solo project become collaborative?

The practitioner, 2026-10-29. The answer is yes, and most of the conversion is mechanical — a
repository from the template, the contents written into it, collaborators added, an identity
attested. Three of those four are steps 0a, 5, 0a and 6 above. **What is not mechanical is the
authorship**, and measuring the current state shows why.

**Nothing today records when a project began.** `Project` carries `changedAt` (when any workflow
last changed) and `exportedAt`, and **no `createdAt`**. A converted project therefore cannot say
when it started, only when it was last touched.

**Every project that exists is unattributed.** All seven built-in projects have no `authors` field,
and so does every project any practitioner has made before 2026-10-29.

**And the record of a converted project begins at conversion.** Notes written before carry no
author — only `authored` notes take one, and none of the existing ones were written under an
identity. Study areas drawn before carry no `drawnBy`. So the contributions statement, which is
assembled from exactly those two surfaces ([141](141-organising-snows-notes.md)), will **under-credit
the solo author for all of their prior work** and say so honestly, because it reports the record and
the record starts late.

### The distinction this exposes, which has no term yet

`fw:identityBasis` answers **"is this login real?"** — `declared` or `attested`. It does not answer
**"did this person do this work?"**, and those are two different claims:

- **Observed.** The application saw it happen: a project created while an identity was current, a
  note written under one, a study area drawn under one.
- **Asserted.** Somebody said so at conversion time, about work done before anything was watching.

An `attested` login on an asserted authorship claim is the dangerous combination, because the
confirmation attaches to the wrong half: GitHub confirmed *who is typing*, not *who did the work*.

**And conversion is the one moment this matters**, which is the mirror of a rule already shipped.
`importProjectDocument` refuses to add the importer, because opening somebody's project does not
make you an author of it. Conversion *must* add somebody — otherwise a solo project becomes a
collaborative one with an empty byline — so the refusal is not available and the distinction has to
carry the honesty instead.

### Ruled on the same day, and it retires most of the question

The practitioner, 2026-10-29: *"Login and Work attestation are two different things but related, and
the fact that this is a browser based app on one laptop means there is only one user, and that's the
one logging into GitHub."*

Which is right, and for a reason stronger than the framing above gave it credit for. **An attested
login means the person held that account's token.** One browser profile, one `localStorage`, one
current identity — so work created in this browser while an attested identity is current was done by
the holder of that account's credential. For work going forward, login attestation *is* work
attestation, and no second term is needed. The two claims are different, as the practitioner says,
and under a single-user assumption one entails the other.

**The code already draws the line the assumption needs**, which is why nothing has to be built for
it. `newProject` and `importProjectDocument` are separate paths, and they already behave
differently: the first records its creator, the second deliberately records nobody. So:

| how it got here | what can be said |
| --- | --- |
| created locally under a current identity | **observed** — single user, credential held |
| imported | **not ours** — the import adds nobody, and demonstrably the work was not done here |
| created locally **before** any identity existed | the only ambiguous case |

And the moment is already recorded: an attested `Author` carries `at`, and a project created under
one keeps it, so a project's author list states when its attestation happened without a `createdAt`
being added for the purpose.

**What survives of question 12 is the third row only** — work done on this device before identities
existed, which is finite, shrinking, and attributable by the same single-user argument with the
honest caveat that nobody was watching. The assumption to record rather than prove: one laptop, one
practitioner. A shared lab machine breaks it, and the breakage is social rather than technical.

12. ~~Does an authorship claim record whether it was observed or asserted?~~ **Narrowed and largely
    answered.** Under one laptop and one user, an attested login entails the work attestation for
    anything created locally under it, and the created/imported paths already distinguish the rest.
    What remains is pre-identity local work, and a conversion that claims it should say it is
    claiming rather than reporting.


## The layout, decided by measurement — 2026-10-31

The measurement this document named as the next step was run, on eight workflows rather than one,
and it decided competency questions 1 and 2 by demonstration. **Every workflow graph is small**
once payloads come out:

| workflow | in the bundle | graph alone |
| --- | ---: | ---: |
| Snow's Map 2, as published | 351,988 | 4,593 |
| Cholera in 1849 compared with 1854 | 9,742 | 4,628 |
| Deaths per house, by water company | 5,595 | 5,033 |
| Deaths per 1,000 people, by sub-district | 25,067 | 6,240 |
| The ground | 287,964 | 8,370 |
| Died or survived, by water supply | 21,385 | 11,378 |
| Deaths per 1,000 people, mapped | 465,822 | 11,119 |
| The river as it runs | 1,247,622 | 40,942 |
| **total** | **2,415,185** | **≈92,000 — 3.8%** |

Three findings the 2026-10-29 version could not have had:

**`params.data` behind `params.dataRef` already is the externalisation mechanism.** Stripping it
alone takes 2,415,185 to 181,232. Question 2 asked whether a node could reference an asset instead
of inlining it; the payload store has been doing exactly that since experiment 121, and what is
missing is only its spelling on disk.

**A study area's geometry is the last inlined asset, and it is the entire outlier.** The choropleth
stays at 99,600 after `data` comes out because its `sub-districts` node carries 85,435 bytes of
geometry and 3,066 of boundary provenance, and `AreaParams` declares neither `data` nor `dataRef`.
Externalising it brings that workflow to 11,119. This is the same gap the study-area reuse control
met on 2026-10-31 from the other side: reusing that boundary copies 85 kB because there is no
digest for geometry to be shared by.

**The largest legitimate graph is a decision, not data.** *The river as it runs* is 41 kB because
`hidden` is 14,415 bytes — the 859 OpenStreetMap feature ids a practitioner set aside, beside the
seven reaches merged. That is precisely what co-ownership needs in a diff: a reviewer can see which
features a co-author discarded. It is an argument for the format rather than a cost of it.

Notes measure **646 bytes each**, so one file per note costs nothing.

### What the template ships, and the two rulings behind it

Published at `digital-twin-ph/fieldwork-project-template`, `is_template` set:

```
project.json            the project: name, subject, authors, createdAt, workflow list
workflows/<name>.json   one workflow graph per file          ← the unit of collaboration
notes/<id>.json         one note per file
assets/manifest.json    payloads by path + sha256 + bytes, or as a declaration
.fieldwork/format.json  the version of this layout
```

**A file is a workflow.** Two authors on different workflows must not collide; two on the same one
must, because a canvas is a graph and a silently merged graph is a graph neither author drew.

**A file is named for the workflow, never for its key** — written here as `<key>.json` until
2026-10-31, when the distinction turned out to matter. The conversion had slugged the name all
along, so nothing in the layout changed; what changed is that the reason is now known. A workflow
KEY is minted by `mintWorkflowKey` as `${projectId}/w${n}` and is the only kind of key the
application can produce, so the key is `w5` and the project id carries a dedupe counter that
increments every time the project is rebuilt. Three validation-lab fixtures were resolving
`south-london/contingency` and `south-london/choropleth`, and all three stopped building the day
the eighth workflow was added, because the rebuilt bundle carried `…-1854-4/w1` through `/w8`.
Nothing had been renamed. Those fixtures now find a workflow by its name, which is what the
layout does and what a reader of a pull request needs: `died-or-survived-by-water-supply.json`
says what a reviewer is looking at and `w7.json` does not. The cost is that a rename moves a file,
which git records as a rename and a key would have hidden.

**An acquired payload is not committed — the declaration that reproduces it is.** The practitioner
ruled this on 2026-10-31 for question 3, over the river workflow's 1.07 MB OSM read. The cost is
stated in the template rather than left to be discovered: a clone rebuilds by reading the extract
again, so reproducibility depends on that extract still being obtainable, and Geofabrik rotates
them. **The digest proves you got the right file; it does not get you the file.** A project that
must survive its source going away commits the read and accepts the size.

**No `LICENSE` ships in the template**, deliberately: a template that picks one picks it for every
project copied from it.

### What this changes about the steps above

- **Step 0a is done** — the repository exists and is a template. Its layout *is* step 5, as this
  document predicted, so both are settled together.
- **Step 5 is done**, by measurement rather than by argument.
- **Step 6 is built** — `attestIdentity` calls `GET /user`, and `currentIdentity` /
  `setCurrentIdentity` exist. This document's *"there is no current identity anywhere in `src/`"*
  is stale, as is *"nothing today records when a project began"*: `Project.createdAt` exists and
  `newProject` sets it.
- **Step 7 is not** — nothing in `src/` writes to the Contents API, and no converter reads or
  writes the layout above. A repository made from the template is a place to put work, not a thing
  the application can open.
- **Step 4 is open** — sea level rise is still a widget pack, not a project repository.

### And the divergence this document predicted is now permanent

South London's notes were *"stored twice"* on 2026-10-29 and *"diverged within hours"*. Measured
2026-10-31: the bundle holds **13** notes and `notes/snow-quotations.json` holds **9**. The nine
quoted ones are in both; the four authored ones exist only inside the gzip. The plain file is not
a second copy any more, it is a stale subset — which is what happens to the readable half when the
opaque half is the one the application writes.

## The two-author test, run — 2026-10-31

South London was converted into the layout on the branch `repository-layout` of
`example-1855-cholera-south-london`, cloned twice, and edited by two authors. Steps 8 and 9 of
the pilot were run against it, with the current format as the control. Nobody was helped: these
are `git merge`'s own answers.

### The control — today's format, the same two edits

Amina renames a layer on *The ground*; Ben widens an interval on *Deaths per house*. **Different
workflows, nothing in common.**

```
 fieldwork-project.json.gz | Bin 1001476 -> 1008632 bytes
 1 file changed, 0 insertions(+), 0 deletions(-)

warning: Cannot merge binary files: fieldwork-project.json.gz (HEAD vs. origin/main)
CONFLICT (content): Merge conflict in fieldwork-project.json.gz
```

Two things, and the first is as bad as the second. **A reviewer is told nothing**: zero insertions,
zero deletions, 7 kB of binary moved. And **two edits that share nothing conflict**, with no
resolution available except to take one author's whole project and discard the other's. This is
the prediction of 2026-10-29 measured rather than argued.

### Step 9 — different workflows. Passes.

Clean merge. `1 file changed, 1 insertion(+), 1 deletion(-)` — the diff is the rename.

### Step 8 — the same note, from stale state. Passes.

Conflicted, and this is the whole of what the step asks:

```
<<<<<<< HEAD
 "establishes": "That circumstances, not the investigator, assigned the exposure.",
=======
 "establishes": "That the comparison was a natural experiment and not a designed one.",
>>>>>>> origin/repository-layout
```

Two versions of one sentence. 150 predicted that is *"a thing an epidemiologist can adjudicate"*,
and it is.

### And the case this document guessed at, which it got wrong

> *"Two authors on the **same** workflow probably must [conflict] — a canvas is a graph, and a
> silently merged graph is a graph neither author drew."*

Right about what should happen, **wrong that choosing the file would deliver it.**

| | without `.gitattributes` | with `workflows/*.json -merge` |
| --- | --- | --- |
| different workflows | clean merge | clean merge |
| same workflow, **different nodes** | **merged silently** | conflict |
| same workflow, same node, different field | conflict | conflict |
| same workflow, same node, same field | conflict | conflict |

**Git merges by hunk, not by file.** Two authors renaming two different nodes of one workflow
produced, with no warning, a graph neither of them drew — which is the precise outcome the
granularity rule was chosen to prevent. File granularity delivers the *good* half of the rule and
not the half it was argued from.

**One line fixes it**, and it is now in the template and on the branch:

```
workflows/*.json -merge
```

### The lesson that generalises: granularity is only half the merge strategy

The other half is **which write path is used**, and the two substrates did not agree until that
line was added:

- **A checkout** merges by line. Silent interleave was its default.
- **The Contents API** from the browser merges not at all: the blob `sha` precondition refuses a
  stale write for the whole file.

A project co-owned by one person using the application and one using a git checkout therefore had
**two different conflict regimes on the same file**. `-merge` makes the checkout behave like the
precondition. This document had measured the browser path carefully and had not asked what the
other path would do with the same bytes.

## What the conversion itself cost and saved

| payload | what happened to it | count |
| --- | --- | --- |
| the OSM water read, 1,095,655 B | **declaration only** — `acquired` in the manifest, not committed | 1 |
| table data with `convertOnRun` | **dropped** — the node already declares how to rebuild it | 6 |
| the plate, 347,405 B of base64 ×2 | **referenced** — `geo/map2.jpg`, already in the repository, digest matched exactly | 2 |
| boundaries, intakes | written once to `assets/`, **shared by two nodes each** | 3 written, 2 shared |

The plate is the clearest case: two nodes carried 694,810 bytes of base64 between them for a file
the repository already held, at 260,535 bytes, whose digest the node was already recording.

**And the geometry gap is worse here than in the bundle.** The eight graphs are 306,289 bytes on
disk pretty-printed; **133,910 of that is one study area's geometry**, the node `sub-districts` on
the choropleth — 44 per cent of the whole `workflows/` directory, for one boundary, because
`AreaParams` declares no payload reference and indentation multiplies what cannot be externalised.
Compact it is 85,435. Take it out and the eight graphs come to 168,743.

So the gap this document found from one side and the study-area reuse control found from the other
is the same gap, and it is now the largest single item in a format whose whole argument is that
graphs are small.

## Discussions, measured — 2026-10-31

The practitioner asked whether GitHub has a discussions API that can download and submit
discussions. Probed from the deployed Pages origin, unauthenticated, because the standing reminder
in this document is that `*` is measured per request and not per host.

| request | result |
| --- | --- |
| `GET /repos/{owner}/{repo}/discussions` on a public repo with them enabled | **200**, `access-control-allow-origin: *`, `x-ratelimit-limit: 60`, `Link` pagination |
| the same on a repo without them | **410** — *"Discussions are disabled for this repo"*, CORS headers intact |
| `GET /repos/{owner}/{repo}/discussions/{n}/comments` | **200** |
| `OPTIONS` preflight, `POST` on the collection, `authorization,content-type` | **204**, `allow-methods: GET, POST, PATCH, PUT, DELETE`, `allow-origin: *` |
| `OPTIONS` preflight, `POST /graphql` | **204**, `allow-origin: *`, Authorization allowed |
| `POST /graphql`, no token | **403**, `x-ratelimit-limit: **0**` |

**Both download and submit are reachable from a browser with no backend**, and the correction worth
recording is that **this is REST, not only GraphQL.** Discussions are widely described as a
GraphQL-only feature; the 410 above carries GitHub's own
`documentation_url: .../rest/repos/discussions#list-discussions-for-repository`, and the 200 on a
repository that has them enabled returns whole objects — `number`, `title`, `body`, `category`,
`comments`, `reactions`, `labels`, `author_association`, `answer_chosen_by`, `state`, `locked`.

Three consequences for this thread:

1. **Reads need no token**, exactly as `raw.githubusercontent.com` reads do. That matches the trust
   model the example catalogue already has, and it is the opposite of GraphQL, whose
   `x-ratelimit-limit: 0` means there is no unauthenticated access at any volume. Choosing REST
   here keeps reading a project's conversation available to someone who has no credential.
2. **It is a different permission from the one step 0b specifies.** That token grants
   **Contents: Read and write and nothing else**. Writing a discussion needs **Discussions: Read
   and write**, so submitting from the application widens the token or adds a second one — a
   decision, not a detail, and the reason to make it deliberately is the same reason Workflows was
   refused.
3. **A discussion is not in the clone — and the practitioner ruled that this is not a defect.**
   2026-10-31: *"the fact that the discussion is hosted on GitHub is good enough. That is the joint
   public record of a collaboration like any open source project. This actually promotes open
   research."*

   The objection this replaces was that discussions are not pinned by commit, not digest-verified
   and not carried by `git clone`. That conflated two needs. **Pinning answers "did I get the same
   bytes", which is a question about artifacts.** A record of deliberation needs to be public,
   attributed, timestamped and linkable, and Discussions is all four — the substrate open-source
   projects have used for years, and a better record of reasoning than most published research
   produces, because the argument is visible and not only the conclusion.

   **And it fixes something these documents do badly.** The rulings in this corpus reached the
   record by being transcribed — every practitioner quote above, this one included, is the
   assistant's rendering of what was said. That is one point of paraphrase and it has no
   co-author. A discussion is the practitioners writing in their own words under their own
   accounts. For the multi-author case that is a stronger record than an experiment file, not a
   weaker one.

   **What survives is narrow, and it is a rule this corpus already applies one level in:** a
   decision that reaches only the thread has not been acted on, in the same way a direction that
   reaches only the docs has not. The deliberation belongs in the discussion; the ruling still has
   to land in a parameter, a note or an experiment record, carrying a link to the thread that
   settled it.

   The measurement strengthens the ruling rather than qualifying it. Because the REST read path
   needs **no token** and answers `access-control-allow-origin: *`, a thread can be archived into
   the repository at a decision point by anyone, with no credential. *"Outside git"* is therefore a
   choice about when to snapshot, not a durability gap. Citing a discussion is stable; preserving
   one is cheap.

   It remains the wrong home for a **note**, which [149](149-the-notes-spike.md) established is
   material the write-up is made of rather than talk about the write-up — and it is the natural
   home for the conflict adjudication competency question 7 asks about.

None of our three repositories has Discussions enabled (`has_discussions: false` on `fieldwork`,
`example-1855-cholera-south-london` and `fieldwork-project-template`), so nothing was submitted and
no write is claimed here. The read path is measured; the write path is measured only as far as its
preflight, which is the same standard the Contents API write was held to on 2026-10-29.

## Governance the authors exercise — 2026-10-31

The practitioner, extending the ruling above: *"research discussions should have user exercised
governance. For example always document decisions and free text can also have some structure the
ways issues are described on GitHub."*

**The mechanism exists and was verified rather than assumed.** `.github/DISCUSSION_TEMPLATE/<category-slug>.yml`,
on the issue-forms schema — `body:` of `textarea` / `input` / `dropdown` with
`validations.required` — bound to a discussion category by file name. Confirmed by reading
`vercel/next.js`'s `ideas.yml`, which is that schema in production; four other large repositories
probed carry no such directory, so this is a feature in real use rather than a documented one
nobody has adopted.

**The property that answers the governance question is that a form is a FILE.** Discussions live
outside the clone; the rules for them do not. A project changes how it deliberates by opening a
pull request against a YAML file, which is reviewable, diffable, attributable and carried by the
template — so the governance is version-controlled even though the conversation is not. Nothing in
Fieldwork reads or enforces it, which is the same division this document already applies to
permissions: **authorization is GitHub's, structure is the authors', and the application
implements neither.**

**One form, not four.** Shipped in the template as `decisions.yml`. Structure imposed on
exploration is friction and the mission is to decrease friction, so a decision is the only kind of
post with required fields. Four of them are the record — what was decided, what it rules out, the
evidence (*"if nothing was measured, write that plainly"*), and what this does not establish, which
is this corpus's own experiment vocabulary reused rather than a new one coined. Two of them are the
governance:

- **Where the ruling lands**, which makes the rule from the section above structural rather than
  remembered: a decision that reaches only the thread has not been acted on.
- **Who carries it out**, asked for rather than inferred, because attribution is a claim about who
  did the work.

**Unverified, and named rather than assumed:** whether discussion *categories* travel when a
repository is generated from a template. The form is a file and certainly does; categories are
repository settings and may not. Worth checking at the first generation, like the question this
document already records about whether git history comes across.

## The repository checks its own claims — 2026-10-31

A format that says a payload is named by path and digest is worth nothing if nothing checks it,
and the failure it prevents belongs to somebody else: a co-author commits a graph referencing an
asset they forgot to add, and the project is broken for every other author rather than for them.
That is the review problem co-ownership creates, and it is answerable without any application.

`scripts/validate-project.mjs` ships in the template and runs on every push and pull request. No
dependencies and no Fieldwork — a project repository stands on its own. It checks only what the
format promises: that the workflows listed and the workflows present are the same set, that every
payload a node references is named in the manifest and matches its digest and byte count, that
every declared read carries what would rebuild it, that every edge joins two nodes that exist, and
that a note's id is its filename.

**Proven both ways.** It passes on the real conversion — 8 workflows, 43 nodes, 14 of them
referencing a payload, 13 notes, 4 assets, 1 declared read — and it was then broken six times on
purpose: a deleted asset, an asset changed under its digest, a workflow file nobody lists, a note
whose id stopped matching its filename, a node pointing at an undeclared asset, and an edge to a
node that is not there. Each was named by file and by discrepancy. A check that has only ever
said yes is not a check.

## What would answer it

Not a design document. The measurement above came from unpacking one file, and the next step is the
same kind:

- ~~Re-express one workflow as files~~ — **done 2026-10-31**, for all eight, above.
- ~~Then run the two-author test on it~~ — **done 2026-10-31**, above. Steps 8 and 9 pass; the
  same-workflow case failed and was fixed with `.gitattributes`.
- **Now: a converter, in the application.** Everything above was done with a Python script against
  the bundle. Nothing in `src/` reads or writes the layout, so a repository made from the template
  is still a place to put work rather than a thing Fieldwork can open. That is step 7's
  prerequisite and the whole of the remaining work.
- **Give a study area's geometry a payload reference**, so the one asset this layout cannot
  externalise stops being 44 per cent of it.
- Question 6 is answerable separately and cheaply, because identity is a name and a handle attached
  to a note, not a login.

## The application writes it — 2026-10-31

The practitioner, on why this could not stay recorded-and-unbuilt: *"it is a selling point of FW,
to decrease friction everywhere in the epidemiologist's workflow, from designing an investigation,
implementing its workflows and managing evidence generation, and publication. That is the
compelling vision we are trying to sell."*

`src/project-repository.ts` emits the layout as paths and contents, and `exportProjectRepository`
in `app.ts` zips it. **Measured on South London the same day: 24 files emitted against the 24 the
hand conversion produced** — 8 workflows, 13 notes, `project.json`, `assets/manifest.json`,
`.fieldwork/format.json` — with all eight workflow file names reproducing the published ones
exactly, truncation rule included.

**Three decisions the writing forced, none of them visible while the conversion was a script.**

- **An unnamed workflow is refused, not filed under its key.** The first version fell back to the
  storage key, which would have written `p-w1.json` — the `w7.json` problem this layout exists to
  avoid, done silently on the one workflow nobody had named.
- **A filename clash is refused, never suffixed.** Two workflows slugging alike means two names a
  reader cannot tell apart either, and `-2` would hide that in a pull request.
- **Machined notes are not committed; authored ones are.** Found by exporting and counting: the
  first version wrote 11 files where the conversion has 24, because it read a field the write-up
  store does not have. Fixing it exposed the better question — a machined note is prose the
  application wrote from a run, stamped with its build, and committing it would put derived output
  in a repository and guarantee a conflict on every re-run. **The same rule the layout already
  applies to payloads**: the acquired thing is not committed, the declaration that reproduces it
  is. A clone regenerates machined notes by pressing Run.

**A FORKED NOTE IS COMMITTED, and that is what makes the rule above coherent.** The practitioner
asked. `forkMachinedNote` returns `kind:'authored'` and `writeNotes` puts it on the project, so a
fork travels with the authored notes — as it must, being somebody's own sentence and the one
thing in the write-up no run can regenerate.

It works only because **a fork is self-sufficient**: it embeds the machined wording it diverged
from, with the node and the moment. So `forkHasDrifted` can still tell a reader that the run has
moved under an edited sentence **in a clone that never carried the machined note at all**. The
repository can leave out the regenerable half precisely because the kept half carries what it
needs to be checked. Measured and pinned by a test, because if that provenance ever stopped
travelling a repository would hold edited prose with no record of what it edited, and nobody
could tell a current sentence from a stale one.

**The format declaration the application writes is not the template's.** The template's says
*"NOTHING IN FIELDWORK READS OR WRITES THIS LAYOUT"*, which stopped being true for writing and is
still true for reading. What is emitted now says it writes and cannot yet read, because a
declaration that implied a round trip would invite somebody to export a repository and expect to
open it again.

## Governance the authors exercise, and the two files that do not divide

The practitioner, 2026-10-31: a study needs *"a study governance recommendation, where authors
cleanly divide up the work to avoid clashes and use the discussion feature to avoid those
clashes."* And earlier, on what a discussion is for: *"research discussions should have user
exercised governance. For example always document decisions and free text can also have some
structure the ways issues are described on GitHub."*

**This layout makes a clash legible and cannot make it rare.** `workflows/*.json -merge` means git
refuses rather than interleaves, because there is no merge base in a browser — so two authors on
one workflow get a conflict that no machine can settle and that a person has to resolve by
choosing one graph over another. That is the right behaviour and it is a last resort. Avoiding the
collision is social, and the recommendation below is what the layout implies rather than general
advice about communicating.

### Divide by workflow, because that is the unit the layout makes atomic

One file is one workflow. Two authors on different workflows never touch the same blob, however
much they each change. So the division of labour should follow the file boundary exactly: an
author owns workflows, not topics, not sections, not "the analysis".

### THE TWO FILES THAT DO NOT DIVIDE, which is the finding

Writing the exporter on 2026-10-31 made the shared surface visible, and it is small and specific.
Of everything a project emits, exactly two files are shared by construction:

| File | Why every author touches it |
| --- | --- |
| `project.json` | carries the workflow list, so **adding** a workflow edits it |
| `assets/manifest.json` | carries every payload reference, so **adding** an asset edits it |

Everything else is per-author: a workflow file has one owner, and a note file is one note.

So the recommendation is not "coordinate" but something a person can act on: **divide workflows
freely and without ceremony, and coordinate on the two acts that touch shared files — adding a
workflow, and adding an asset.** Both collide on ADDITION, which is append-shaped and resolvable
by hand in a way a graph is not; neither carries the `-merge` attribute, so git will attempt them
and usually succeed.

### What a discussion is for, and what it is not

Claiming a workflow before editing it, and recording a decision after making it. Not review —
that is a pull request — and not the work itself.

The template already ships `.github/DISCUSSION_TEMPLATE/decisions.yml`, which is the structure the
practitioner asked for: a decision form rather than free text, on the reasoning that an issue is
legible because its shape is agreed. It binds only once a category with the slug `decisions`
exists, and enabling Discussions is an account action that belongs to a person rather than to this
application.

**ONE ASYMMETRY TO STATE BEFORE IT IS DISCOVERED.** A repository is self-contained and clones; a
discussion is hosted and does not. The artifact travels and the conversation stays behind. The
practitioner has ruled that hosting on GitHub is good enough — *"That is the joint public record
of a collaboration like any open source project. This actually promotes open research."* — so this
is not an objection to the choice. It is a limit on where the decision record is durable, and an
export of decisions back into the repository is what would close it. That belongs to experiment
155, not here.

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

## What changed our minds

**That choosing the file chooses the merge.** This document argued granularity from the browser's
constraint — no merge base, so conflicts are made rare and legible rather than merged — and
concluded that *"file granularity is the merge strategy"*. One line of that is wrong, and two
authors found it in ten minutes: git merges by **hunk**, so a file is the unit of *collision
detection* only on the substrate that has no merge at all. On a checkout, one file per workflow
bought clean different-workflow merges and silently interleaved same-workflow ones. The rule the
document stated had to be asserted separately, in `.gitattributes`, rather than following from the
layout.

The general form, which is the part worth carrying: **a storage format does not decide a merge
policy; the tool that writes it does.** Two co-owners on two different write paths had two
different conflict regimes over identical bytes, and nothing in the format said which was intended.

**That the heavy thing was the data.** It was, until it wasn't. With payloads externalised the
largest remaining item is a *study area's geometry* — 133,910 bytes pretty-printed, 44 per cent of
all eight graphs — because `AreaParams` alone declares no payload reference. The 92%-is-data
finding of 2026-10-29 was right about the bundle and stops being the interesting number the moment
the bundle is taken apart.

## Trust, without a catalog — 2026-11-10

The practitioner: *"We have to remember a collaborative project will not be in a manifest so we will have trust
challenge."* A worked example is vouched for by Fieldwork's catalog, which pins its repository, commit and file
digests. A project repository is not, so opening one is opening content nobody has vetted. What can still be made
trustworthy:

- **A commit, not a branch**: what is opened is exactly that version.
- **Who and what, before opening**: *not vouched for by Fieldwork*, the repository, the commit, its author, and whether
  GitHub shows the commit as signed. The person decides.
- **Data, never instructions**: Fieldwork reads workflows, tables and notes and runs its own widgets; a project's
  rulesets run in the reasoner's worker and need a time limit; sizes are held to the measured limits.
- **Checked on import** as any import is, findings reported rather than the data refused, and **labelled** in the
  application as not vouched for.
- **Later, if needed**: signed projects, or a list of repositories a team trusts.

**The order of work, proposed the same day**: reading a repository back into a project (the round trip); a second
author on a real project, with conflicts shown in the application; pushing from Fieldwork with the scoped token; the
Discussions of [155](155-discussions-as-the-governance-surface.md); products published to the repository's Pages
([202](202-one-record-several-products.md)).

## The sequence a person follows, 2026-11-16

The practitioner: *"Lets build the manual for the collaborative project. And I don't think we have a config item in
the new project dialog to configure it as collaborative. We need to think about the sequencing of the steps for the
user to follow."* The order follows what each step needs:

| Order | Step | Needs |
| --- | --- | --- |
| 1 | Who you are: the identity file of [218](218-an-identity-you-carry.md), the key linked to GitHub | nothing; once per person |
| 2 | Where it lives: a repository from `fieldwork-project-template`, Discussions on, co-authors invited | a GitHub account; a human act |
| 3 | What Fieldwork may do there: a fine-grained token for that repository only (Contents and Discussions, read and write; never Workflows), in the credentials file | the repository, to scope the token to it |
| 4 | The project in Fieldwork, made as shared and pointed at the repository | 1 to sign, 3 to write |
| 5 | Working: get the latest, save as one commit, talk in Discussions | 4 |

A co-author does 1, accepts the invitation in place of 2, does 3, and opens the shared project in place of making it.

**New project, proposed:** *Where this project lives*: on this device (as today), or shared through a GitHub
repository, with the repository's name; beneath it a readiness list that ticks itself and blocks nothing (identity
open, key linked, a GitHub credential unlocked, the repository answering and writable). Beside **Import project**:
**Open a shared project from GitHub**. The manual, drafted for the practitioner's edit, is
`demo-drafts/collaborative-project-manual.md` in the workspace. Nothing of steps 4 and 5 is built.


## The first read of a real repository, 2026-11-16

**Check the repository** (Project, New project, *Shared through GitHub*) reads a repository through a token from the
credentials file and writes nothing: `src/repository-check.ts`. The practitioner ran it against
`digital-twin-ph/project-test-collaboration`, a private repository made from `fieldwork-project-template` under an
organisation, with a fine-grained token scoped to it.

| Line | First run | After the practitioner's change |
| --- | --- | --- |
| Answers through the token, private | Yes | Yes |
| The template's layout (`.fieldwork/format.json`) | Yes | Yes |
| `project.json`, empty | Yes | Yes |
| Discussions on | Yes, GitHub's 6 default categories | Yes, 7 |
| Discussions held | Yes, 0 | Yes, 0 |
| A `decisions` category | **No** | Yes |
| The token may write | Not checked | Not checked |

**Found:**
- A repository made from the template does not carry the template's Discussion categories, so the decision form
  has no category to post in until the lead author makes one by hand: **Decisions**, Open-ended discussion. The
  manual now carries it as a set-up step, and the check names it when it is missing.
- Discussions, with categories readable through a fine-grained token, works on a private repository under this
  organisation.
- The token's expiry date was not shown, and no layout version was printed. Either the token has no expiry or the
  browser is not allowed to read GitHub's expiry header. The template's `format.json` may carry no `version`.

**The first write, the same day.** **Post a discussion**, beneath the check, sends one GraphQL `createDiscussion` with
the title and message the person types (`postDiscussion` in `src/repository-check.ts`). The practitioner posted
*Test post*, #1, in Decisions. GitHub shows it as started by the token's owner, marked Maintainer. Posted through the
API, it carries the typed text only: the category's form applies on GitHub's own page, not to a post sent from
Fieldwork, so a decision posted from Fieldwork has to carry the form's questions itself.

**What this does not establish:** that the token may write to the repository's contents, which a discussion does
not touch; that a co-author's or a reviewer's token reads and posts the same; whether Discussions is available on a private repository under a
personal account on GitHub's free plan.

## The process as it emerged, 2026-11-16

Each step below came from trying the one before it with the practitioner's own repository, not from the plan of
2026-10-31. Recorded in the order it happened, because the order is the finding.

1. **The manual first, then the order of its steps.** Drafting the manual showed that the repository has to exist
   before a token can name it: *"First probably is create repo from project template."* The manual's order became
   repository, token, project, invitations.
2. **A read before any write.** **Check the repository** read the practitioner's repository through their token
   (above). It found that a repository made from the template has no `decisions` category.
3. **The first write was a discussion, not a file.** *"We can also test the project chat feature through
   Discussions."* Discussion #1 posted. It showed that a post sent through the API carries no form.
4. **Then a file.** *"We also have not tested uploading a workflow to a remote project."* The same files Export as
   repository makes, as one commit through the Git Data API: blobs, a tree on the last commit, a commit, then the
   branch moved, never forced.
5. **Roles.** *"How do we know if a user has a certain GitHub role?"* GitHub's answer about the repository carries
   the person's role. The token can allow less than that role, and nothing says how much less; only a write shows it.
6. **What Discussions is in Fieldwork.** The practitioner asked whether a count and a link were enough. Yes, with
   two corrections. It counts what changed *since you last looked here*, not "unread": GitHub keeps read state in
   its notifications, which these tokens cannot read (expected, not tried). And it shows the latest titles, each
   linking to GitHub. Reading and replying stay on GitHub.
7. **Where the share is recorded.** *"So the user should also be able to save collaborative project specs on his
   laptop?"* Yes, in the project's record on the device. The repository's name travels with a backup. The
   credential's reference, the commit last read or saved, each file's digest at that moment, and when Discussions
   was last looked at stay on the device. The token stays in the credentials file.
8. **Two kinds of save.** *"How will the user save the workflow to GitHub, simultaneous with saving to local
   storage?"* They are not simultaneous. Saving on the device stays automatic. Saving to GitHub is a press, with a
   line the person writes, made into one commit. A commit on every edit would bury the history the co-authors
   review, and would need the network and an unlocked token at every keystroke.

**Built, not yet tried against a real repository:** in **This project**, a project can be shared with a repository
made from the template. **Save to the repository** compares each file's digest with the last read or save, and
refuses when nothing changed. It also refuses when the branch has moved since this device read it ("get the latest
first"); nothing is written. **Get the latest** asks before replacing changes made here. **Check GitHub** reports
both sides and the latest discussions. **Stop sharing on this device** leaves the repository untouched. In **New
project**, a checked repository that holds a project can be opened as a shared project, by the importer a backup
uses. `tests/shared-project.browser.mjs` runs all of it against a GitHub kept in memory.

**Found while building:** every workflow file carried this device's `projectId` and `workflowKey`. Both are minted
per device, so every author's save would have rewritten every workflow file. They are now left out of the repository
(`withoutDeviceKeys`), and opening the repository mints them again.

**Who shows as whom.** A collaborator invited on GitHub appears in Fieldwork only by their GitHub login, beside what
they post in Discussions. They are not added to the project's authors: access is not authorship, the rule the
importer already keeps. An author is added as an author, from their identity file.

**What this does not establish:**
- That any of this works against GitHub itself. Every request has been seen only by the fake.
- What happens when two authors change the same workflow. A save is refused rather than merged. Showing both
  versions and asking which to keep is not built.
- That a token whose owner has the Read role is refused at the first write. The role line says Read; no write has
  been tried with such a token.

## People, project roles and repository roles, 2026-11-16

The practitioner: *"From a FW project perspective, how do I add JLT? How do we map GitHub roles to FW project roles?
I don't think we have this mapping yet. This is in addition to me manually adding JLT as a co-maintainer on GH. And
this needs an ontology entry."* Then: *"How do co-authors' ORCIDs and RORs end up on my copy of the
notes/publication?"* and *"How do we use GitHub to exchange ORCIDs and RORs?"*

**Two things kept apart, and neither is authorship.** A **repository role** is GitHub's term for what a person may do
in the repository (Read, Triage, Write, Maintain, Admin), and only GitHub grants it. A **project role** is a person's
place in the investigation (Lead author, Co-author, Reviewer). Who did what stays CRediT, proposed from the record.
The practitioner chose the term *project role*; *role* alone is the glossary's word for what a widget needs from a
column.

**In the ontology, from a standard rather than minted.** The W3C Organization Ontology (Recommendation, 16 January
2014; read in the specification, not recalled) already relates a person, an organisation and a role:
`org:Membership`, `org:member`, `org:organization`, `org:role`. Declared: `fw:Project` (an `org:Organization`, not an
`org:OrganizationalCollaboration`, whose members are organisations), `fw:ProjectRole` (an `org:Role` and a
`prov:Role`) with `fw:LeadAuthor`, `fw:CoAuthor` and `fw:Reviewer`, `fw:ProjectMembership` (an `org:Membership`), and
`fw:minimumRepositoryRole`.

| Project role | Least repository role | Proposed from |
| --- | --- | --- |
| Lead author | maintain | admin |
| Co-author | write | maintain, write (the practitioner's choice for Maintain) |
| Reviewer | read | triage, read |

**Adding a person.** Invite them on GitHub. In the shared project's **People**, Fieldwork lists everyone GitHub
reports with access, with their repository role and a proposed project role. The lead author gives the project role,
and it is saved in `project.json` (the practitioner's choice), so every author sees the same team. A repository role
below what the project role needs is flagged, never refused.

**Who a member is is theirs to give.** With their own identity open, the person presses **This is me**. Their name and
ORCID iD are written into their entry, signed with their identity's key. Each copy checks the signature, so nobody can
put an ORCID iD on the project in someone else's name. **The exchange is the repository itself.** The entry travels
in `project.json` with their next save and reaches the others when they get the latest. Before this, a co-author's
ORCID iD reached another author only inside the notes they had signed. The project's author list held a login and a
name, and no affiliation was held anywhere except as typed text.

**What this does not establish:**
- That GitHub lists collaborators to a fine-grained token with only Contents and Discussions. If it refuses, People
  says so and shows the project's own members.
- ROR: affiliations are not yet held with an identifier. The question is put to the practitioner. *Answered the same
  day: "Yes to RORs", below.*
- That the publication's author line is drawn from the members. It is not yet.

## Affiliations with ROR IDs, 2026-11-16

The practitioner: *"Yes to RORs."* An identity file now holds **affiliations**: each an organisation's name as written
on a paper, and its ROR ID where it has one, in the order a paper lists them. Made or changed in the Identity dialog
(**Change your avatar or affiliations** for a file already made). **Find on ROR** searches ROR's open API by name and
offers up to five matches. **Check on ROR** looks up a typed ID. A typed ID is first checked offline by its checksum:
ISO 7064 Mod 97-10 over the six base-32 characters. That rule was confirmed on five real ROR IDs, and a one-digit
change fails it. Found on ROR is not verified, as with an ORCID iD: anyone can type an organisation they do not
belong to.

**This is me** now signs the affiliations with the name and ORCID iD, so they travel in `project.json` the same way.
Each copy shows each affiliation with a link to its ROR record.

**Validation, 2026-11-16, Chromium only:**
- `tests/identity-file.test.mjs`: the checksum, tolerant reading, the file round trip, a change keeping the avatar,
  and a bad ID refused.
- `tests/identity.browser.mjs`: found by name on a stubbed ROR, a mistyped ID caught, and the affiliation on the open
  identity's line.
- The accessibility scan of the Identity dialog passes, but it opens the dialog with no affiliation rows, so the
  rows themselves are not scanned.

**What this does not establish:**
- ~~That ROR's live API answers in the shape the stub does.~~ *Established the same day by the practitioner:* **Find on
  ROR** against the live service found the Centers for Disease Control and Prevention, ROR `042twtr12`. Only the
  search was seen; **Check on ROR** has not been tried against the live service.
- That the publication's author and affiliation lines are drawn from the members. They are not yet.


## New project in two paths, 2026-11-16

Built in four turns, each answering the practitioner's last look:

1. A **Check the repository** block below **Create project**, which could check an empty repository and do nothing
   with it. Neither copy held a project to share, and the repository had only its template commit. *"Still not
   there."*
2. A **Create the project above, shared with this repository** button under the check. *"There is only 1 Create
   Project button and it's above the Shared through GitHub which does not look intuitive."*
3. A **Where it is kept** choice above the one **Create project**. *"The UI taxonomy should be New Local Project or Open
   Shared GitHub Project. Now under each Import project from backup should also work."*
4. **Two paths at the top of New project.**
   - **New local project**: the form as before, then **Or import a project from a backup**.
   - **Open shared GitHub project**: the repository is checked first. A repository holding a project offers **Open
     the shared project**. One holding the empty template, where the person may write, offers **Create the project
     in it** (name and subject) or **Import project from backup** into it; the imported project is shared with the
     repository.
   - *"If Credential is locked, there should be no Open Shared GitHub Project"*: the second path is not offered
     while Credentials are locked.

The two forms that were tests of the first writes moved or went. **Post a discussion** moved to the shared project's
Discussions, as **Start a discussion**, where a refresh had been resetting the chosen category: a post went to the
first category until the choice was kept (found by the test). **Save a project to the repository** went, superseded
by the shared project's own save.

**Validation, 2026-11-16, Chromium only:** `tests/shared-project.browser.mjs`, four tests against a GitHub kept in
memory. They cover: the path hidden while locked; a project started in the empty template, listed and saved; a backup
imported into it and shared; Open offered and start not offered where a project exists; and a discussion posted to
the chosen category. Its neighbours pass too (project view, projects, export, identity, citations, manual tab).

**What this does not establish:** any of it against GitHub itself. The practitioner's repository still holds only
the template.

## The tokens are the list, 2026-11-16

The practitioner: *"So essentially there should be a match between credentials for projects in the credentials file
(since each token is for only one project) and the projects that show up on the shared project list."* **Open shared
GitHub project** now lists one row for each GitHub token in Credentials. Each row shows the repository GitHub says the
token reaches (`/user/repos`, `tokenRepositories`), and either **Go to it** (a project here is already shared with it)
or **Check it**, which runs the same check as before. Typing a repository is kept, folded, as **Type a repository
instead**.

**What this does not establish:** that a fine-grained token given one repository lists only that one. It is
expected, and the row lets the person choose when there are several. It has been seen only with the fake.

**Corrected the same day, by the practitioner's first run:** *"The token reached 86 repositories!"* GitHub's list of
the repositories a token reaches is not scoped to a fine-grained token's chosen repository: it held every repository
the person can see, public ones included. So the list cannot say which project a token is for. **A GitHub credential
now names its repository** (an optional `repository` field, owner/name; credentials files made before it still open).
A credential that names one gets one row. One that does not is asked once, from what the token reaches with private
repositories first, and the answer is kept in the credential. The credentials file has to be downloaded again to keep
it, and the row says so. Validated against the fake only: `tests/shared-project.browser.mjs` (five tests) and
`tests/credentials.test.mjs`.

*"The drop down is still 86 repositories."* Asking once was still a choice among 86. Now a repository whose name
matches the credential's label or reference is offered alone ("For digital-twin-ph/project-test-collaboration? **Yes,
this one**"), and the list stays folded behind **Choose another**. The list shows private repositories only, with
**Show public ones too** for the rest. A name match is offered, never assumed: the person says yes.

*"We just opened a GitHub project why create a project in it?"* The repository is the project, so it is opened
whether it is new or not. A new one says it has no name or subject yet. Its name starts as the repository's, for the
person to change, and the button is **Open the shared project**, as for one that holds a project. **Or start it from
a backup** replaces "Or import a project from a backup into it".

*"First there's check it. If it's the right one, the next button should be 'Load the Project'."* Both buttons that
follow **Check it** now read **Load the project**.

## Get the latest merges, 2026-11-16

Before tomorrow's test with two authors, the practitioner chose to fix this first. **Get the latest** replaced the
project here with the repository's, so a second author whose save was refused would lose their new workflow on
getting the latest. It now merges file by file (`mergeLatest`):

| A file that changed… | Becomes |
| --- | --- |
| only on GitHub, or is new there | GitHub's |
| only here, or is new here | this device's, still "changed here", to be saved |
| on both, to different contents | the person's choice, asked by name |
| removed on GitHub, unchanged here | removed |
| removed on GitHub, changed here | kept |

`project.json` is taken whole when one side changed it. When both did, it is GitHub's, with the workflows both sides
hold and every member either side names.

**Found while building it:** this device regenerates the repository's files when it loads a project, and the
regenerated bytes need not match GitHub's. Measured against one baseline, an unchanged workflow would have looked
changed on both sides and asked a needless question. Each side is now measured against its own baseline:
`repository.files` for this device and `repository.remote` for GitHub.

**Validation, 2026-11-16, Chromium only:**
- `tests/shared-project.test.mjs`: every row of the table, and that byte differences alone are not a change on GitHub.
- `tests/shared-project.browser.mjs`: another author adds a workflow while this device adds its own. This device's
  save is refused; Get the latest brings theirs and keeps this one without asking; the next save holds both. Run twice.

**What this does not establish:** a merge of one workflow's contents. Two authors who change the same workflow
choose one version; nothing combines them. Against the real GitHub, it is untried until 2026-11-17.
