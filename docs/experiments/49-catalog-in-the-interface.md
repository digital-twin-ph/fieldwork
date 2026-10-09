# 49 · The pack catalog in the interface

_Created 2026-10-08 · Updated 2026-10-08_

**Status:** design record. Nothing in this record is implemented, and one of its
three options is recommended against being implemented at all.

The curated pack catalog (`widgets/packs.json`, [experiment 43](43-widget-packs.md))
is currently legible only to someone reading the repository. Asked how to see it,
the honest answer was: open the file, or run `validate:packs`. That answer is
correct about the mechanism and wrong about the concern. The catalog exists to
support a judgment — whether a result can be trusted, and what the thing that
produced it refuses to claim — and the people making that judgment never meet it.

## Why this is a developmental-evaluation concern

Developmental evaluation asks what an intervention teaches while it is still
forming, and treats use as evidence about the design rather than as a later phase.
Three of the catalog's eight rules exist because something had already drifted by
the time anyone looked at it: a stage status, a restated capability, a pinned
digest. Each was found by a reader, not by the design.

That is the pattern worth naming. The catalog's failures are **failures of
legibility**, and legibility failures are only observable in use. So the question
is not "should the application list the packs". It is:

> Which decisions does a practitioner make that the catalog should inform, at the
> moment they make them, and what would we learn from watching them make those
> decisions badly?

A storefront answers neither half.

## The decisions, and who makes them

| Who | Decision | What they need | Where they are when they need it |
| --- | --- | --- | --- |
| Practitioner | Can I rely on this result? | Which definitions produced it, at which digests; whether any came from a pack; **and what the methods and models rest on, with their sources** — a pack is a technical workflow, not a bundle of code ([experiment 56](56-basis-behind-identity.md)) | Looking at a Results tab or a run receipt |
| Practitioner | May I say what this output means? | What the producing vocabulary **refuses** to claim | Before writing the result down, not before running |
| Reviewer | Is this pack admissible? | The three reviews, the diff, the digests | In the repository, with the pack open |
| Curator | Is the catalog itself sound? | Rules, owners, pinned commits, **and the validation results** — what was checked, against which host, registry and catalog, and when ([experiment 56](56-basis-behind-identity.md)) | In the repository, at review time |

Only the first two are in the application at all. The reviewer and the curator are
already served by the file and the validator, and moving their work into a
rendered page would weaken it — review needs a diff, not a view.

## Correction: offline-first is a lifecycle, not a state

This record originally treated "offline-first, no runtime fetch" as a flat
constraint. That was wrong, and the error mattered, because it ruled out the one
moment when showing the catalog is obviously right.

The actual flow is a **lifecycle with a preparation phase**:

| Phase | Network | What happens |
| --- | --- | --- |
| Prepare | **Online, deliberately** | The practitioner or learner downloads everything the field activity will need |
| Field | **Offline** | The work happens; nothing may depend on a network |
| Exception | Online only if necessary | A return to connectivity is a recoverable event, not the normal case |

So there is a legitimate online moment, it happens before departure, and the
practitioner is making exactly one decision at it: **am I ready to go offline?**
That is a real decision, at a known moment, with a consequence that is discovered
in the field where it cannot be fixed. It is a far better DE subject than anything
in the original record.

It also means staleness is manageable rather than fatal. A catalog shown during
preparation can be refreshed while online and stamped with the time it was read,
instead of being frozen at build time.

### What the preparation phase currently does not tell you, measured

Two findings, both from reading the shipped code rather than reasoning about it:

1. **Cross-origin resources are never cached.** The service worker handles
   same-origin GETs only; a request to another origin is not intercepted at all and
   falls through to the network. Every cross-origin dependency is therefore
   field-fatal, and there are three: OpenStreetMap and OpenTopoMap basemap tiles,
   the Overpass API for street-network download, and any remote raster acquisition.
   The study-area editor draws on an online map. A practitioner who prepares by
   opening the application, seeing "Available offline" and leaving will lose the
   basemap in the field.
2. **Nothing said which build was serving the page, which is the third defect in this family and
   the one that wasted the most time.** The service worker answers from its cache first and never
   revalidates, so a loaded tab keeps running old code until it is reloaded; nothing announced that a
   newer build had installed. A feature could therefore be live, deployed and verified, and still be
   absent for the person looking at it, with no way to tell the two cases apart. **Fixed, 2026-10-09**:
   the controlling service worker now reports its own build identity, which the catalog shows as
   "Serving this page", and an installed update raises a notice with a Reload action that stays until
   it is used. The identity is reported by the worker rather than compiled into the page, so it names
   the build actually answering rather than the build the page came from.
3. **"Available offline" is inferred from one asset.** The indicator reports ready
   when a single cached file is present — the EYE engine — standing in for roughly
   140 precached assets plus everything above that is not cached at all. It is a
   liveness probe presented as a readiness claim.

The first of those is not inevitable: a basemap delivered as a single PMTiles archive
is one same-origin or locally stored file rather than thousands of cross-origin
requests, measured in [experiment 52](52-cacheable-basemaps.md).

Neither is a defect in the service worker, which precaches the application shell
and the bundled example data correctly. Both are defects in **what the interface
says about readiness**, which is the same class of problem as the catalog's
invisibility: a governance or readiness fact that exists and is not legible.

## The constraints, which conflict

1. **No pack is fetched or executed at runtime.** `runtimeFetching: none` is an
   admission rule and is unaffected by the lifecycle above: preparation may
   download *resources*, never widget *definitions*. Caching a pack's documents and
   admitting its widgets are different acts, and conflating them is the one
   mistake a preparation view could make that governance could not recover from.
   What the interface shows about the catalog is as-of a stated time — refreshable
   while online, never implicitly current.
2. **Proposed is not implemented.** The project's documentation discipline
   separates the two deliberately. A list of packs inside the application reads as
   a list of things you can use.
3. **The application cannot verify a review.** Displaying `admitted` would make the
   interface a republisher of a claim it has no way to check. A review state shown
   without its date, reviewer and host version is a badge, not evidence.
4. **Provenance must nonetheless be complete.** A receipt that is silent about pack
   origin is not neutral; it leaves the reader to assume. The absence of pack
   definitions is itself a fact worth asserting.

Constraint 4 pulls toward showing something. Constraints 1–3 pull against showing
almost all of it. The resolution is that the interface should carry **provenance
and refusals**, and should not carry **inventory or status**.

## Three candidate surfaces

### A. A pack browser — still recommended against, but it was hiding a real surface

A panel listing catalog entries with their admission states. It is the obvious
reading of "see the catalog", and it is the wrong one. It implies installability
that does not exist; it turns `admitted` into a trust badge the application cannot
stand behind; and it answers a question nobody in the application is asking, since
a practitioner cannot act on the list. It would also make the first real
disagreement between a snapshot and the live catalog into a user-visible
falsehood rather than a validator problem.

If the demand for it recurs, the honest form is a link out to the file, not a
rendering of it.

**What the browser was standing in for, though, is worth building: a preparation
view.** The question "how do I see the catalog" is downstream of "what do I need
before I go offline", and that question deserves a surface of its own:

- what is cached and what is not, enumerated rather than inferred from one probe;
- which widgets in the current workflow need a network, named before departure —
  the study-area basemap, street-network download, remote raster acquisition — with
  the size of each outstanding download, since the study area is known from the start
  and the practitioner, not the application, knows whether the link will carry it;
- the pack catalog as read at a stated time, with a refresh available while online,
  and an explicit statement that no pack definition is or can be loaded;
- what to do about each gap, since a readiness view that only reports is a
  worry-generator.

This subsumes the legitimate part of A without becoming an inventory: it lists what
*this activity* needs, not what exists. The distinction between a cached document
and an admitted widget must be stated on the surface itself, not left to the
reader.

### B. Pack provenance in the receipt — **implemented, 2026-10-08**

The run receipt already names, per node, `fw:widget`, `fw:catalogVersion` and
`fw:catalogDigest` from the **widget registry**. The slot therefore exists; what is
missing is one assertion about the **pack catalog**: which catalog version and
commit this build was made from, and that every definition used was host-defined.

Stated positively rather than as an absence, so it can be checked:

- the build's pack-catalog version and short commit, labelled as compiled, not live;
- that every widget definition in this run came from the host registry;
- nothing about admission, review state or availability.

This adds no promise, survives staleness because it names its own vintage, and is
falsifiable: if a pack definition ever does execute, the assertion fails loudly
instead of the receipt quietly staying the same. It needs vocabulary terms, which
means it is subject to the [semantic audit](../ontology-audit.md) before it is
declared, not after.

**Built.** A run now records the catalog it was built from, and every node states where its
definition came from:

- `fw:PackCatalog` with `fw:packCatalogVersion` and `fw:packCatalogDigest` — the SHA-256 of
  `widgets/packs.json` as built — asserted once per run, in the receipt section already marked
  recorded metadata rather than rule premises. A digest replaced the "short commit" proposed
  above, because the build knows the file and not the repository state. The vocabulary comment
  states what it is not: not a claim that any pack was reviewed, admitted, available or used.
  `fw:PackCatalog` is disjoint from `fw:WidgetDefinition` and from both plan classes, so a
  catalog cannot be read as a definition or a plan.
- `fw:widgetDefinitionSource "host-registry"` on every plan, canvas and runtime alike, with the
  runtime shape requiring exactly one value from `("host-registry" "pack")`. Silence cannot pass
  for host provenance, and a pack-supplied definition would have to say `"pack"` or fail SHACL.
- The identity is generated into `widgets/pack-catalog.json` by the build. A bundle-time define
  was tried first and rejected: it did not reach the separate compilation in `validate:widgets`,
  and defaulting the constant would have let a receipt name a catalog nobody built — the
  silent-failure pattern this project keeps rediscovering.

Checked by five unit tests: that the digest recomputes from `widgets/packs.json`, so a stale
bundle fails; that a catalog without a digest or with a non-semver version fails SHACL; that a
plan whose source is removed or invented fails; and that the catalog never appears as something
a step `prov:used`.

### C. A refusals surface — the actual DE experiment

The most valuable thing the catalog points at is not the pack list but what each
pack's vocabulary **refuses to answer** — the five refusals in
[experiment 44](44-ontology-competency-questions.md), and for the sea-level pack,
the inundation claim it must decline ([experiment 47](47-sea-level-pack.md)).
Refusals are what a practitioner most needs, at the moment they write a finding
down, and unlike admission state they are verifiable from the vocabulary that is
compiled in.

This is where a DE observation is worth running, because the outcome is genuinely
uncertain: a refusal shown too early is noise, shown too late is useless, and shown
too often is dismissed. We do not know where the moment is.

## What to observe, if C is tried

Developmental evaluation needs disconfirming observations, so these are written so
they can come out badly:

| Observation | Would disconfirm |
| --- | --- |
| Shown a result, can the practitioner say where the definitions came from? | That provenance in the receipt is legible at all |
| Asked what the output does **not** establish, do they name a refusal unprompted? | That a refusals surface changes anything |
| Does the refusal get read, dismissed, or resented? | That this is the right moment or wording |
| Does anyone, after seeing it, ask how to install a pack? | That the interface successfully avoided implying inventory |
| Does a practitioner who prepared, went offline and lost the basemap describe it as their mistake or the application's? | That readiness was legible before departure |
| After a preparation view exists, does anyone still go to the field missing something? | That enumerating readiness is sufficient, rather than needing a blocking check |

The last one is the test of option A's exclusion. If people ask anyway, the
exclusion is not working and the design, not the user, is wrong.

## Competency questions

Answerable, if B is built:

1. Which widget definitions produced this result, at which versions and digests?
2. Was any definition in this run supplied by a pack?
3. Which pack-catalog version and commit was this build made from?

The application must **refuse** these, and should be seen to refuse them:

4. Has this pack passed its security review? — the application cannot verify a
   review; it can only point at the catalog and the report.
5. Is this pack safe to use? — not a question any artifact answers about itself.
6. Can I install this pack? — there is no runtime loading, by rule.
7. Is the catalog shown here current? — no: it is as read, at a stated time.

Answerable, if the preparation view is built:

8. Which resources this activity needs are cached, and which are missing?
9. Which widgets in this workflow will stop working without a network?
10. When was the pack catalog last read, and by what route?

## Practitioner exercise

Run any workflow, open its run receipt, and answer from the receipt alone: which
widget produced each output, and at what digest. Then try to establish, from the
application only, whether a widget pack contributed anything. Note what you had to
assume. That assumption is what option B exists to remove, and the difficulty of
answering is the measurement.

## Decision

A pack browser remains excluded. **A preparation view is now the recommended
surface**, and it is where the catalog belongs: it is the one moment the
practitioner is online on purpose, deciding something consequential, with the cost
of being wrong deferred to a place where it cannot be fixed. Option B, receipt
provenance, is **implemented**, recorded above — and so, as of 2026-10-09, is the practitioner
half of it: a **widget catalog** in the interface.

The distinction this record drew between a pack browser and provenance is what made that
buildable. A pack browser was refused because it lists things that cannot be used; the widget
catalog lists the definitions that **are** running, with the version and release digest a receipt
cites, the declared ports, and whether an external implementation has independently recomputed
the widget ([experiment 57](57-parity-evidence.md)). It is opened from beside the node library,
states the application version and the pack-catalog version and digest, and says plainly that
nothing is installable and no widget is individually certified. The same identity appears in the
inspector for the selected node, which is where the question "which definition produced this"
is actually asked.

**Revised the same day.** The catalog now does show pack admission state, which this record had
excluded. The owner's reaction to the first version — "I thought that the catalog will allow me to
add the sea-level rise widget" — showed the exclusion had the opposite effect from the one
intended: hiding governance did not prevent an expectation of installability, it left the
expectation unanswered. The original objection was that a bare `admitted` badge is a trust claim
the application cannot verify, and that still holds, so the view shows the state **with its
basis**: the pinned commit, the three review states, the recorded reason, the count of pinned
files, and an explicit note that these are decisions read from this build's catalog rather than
checks performed by the page.

It still offers no way to add a pack, and the view now says why rather than being silent: the
application fetches and executes no pack, and the sea-level pack is declaration-only — vocabulary,
shapes, widget contracts and a worked example, with `implementation: {files: [], definition: "not
implemented"}` for all three of its widgets. There is nothing in it to run. A button could not have
changed that. Option C, refusals,
remains the open DE question.

The two measured readiness findings above are **defects, not design options**, and
should be fixed independently of anything in this record: an enumerated cache
report rather than a one-asset probe, and a pre-departure statement of which
widgets in the current workflow need a network. They are recorded here because the
lifecycle correction is what exposed them.

This record changes no code. The catalog remains reviewable as a file and checkable
by `npm run validate:packs`, which is correct for reviewers and curators, and
insufficient for a practitioner about to go offline.

The form a preparation surface should take is **not settled here**, and is carried
as its own developmental-evaluation item in
[experiment 50](50-preparation-checklist.md): a checklist is a theory of failure
wearing a user interface, and the formats are not interchangeable. The two readiness
defects above are prerequisites for it, because a checklist derived from an
unenumerated cache would report confidently and be wrong.
