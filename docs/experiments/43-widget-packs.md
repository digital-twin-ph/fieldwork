# Experiment 43: widget packs

_Created 2026-10-08 · Updated 2026-10-08_

Date: October 8, 2026. Status: design specification and developmental-evaluation
questions. No pack format, loader, manifest or dependency is implemented by this
document, and nothing here changes the current registry.

## The question

The widgets in this prototype are knowledge and workflow engineering, not only
user interface. A **widget pack** would group related widgets, their vocabulary,
their constraints and their worked examples into one versioned, separately
maintained unit, distributed as a GitHub repository, that remains semantically
consistent with the base widgets and the main ontology.

Most of the machinery already exists. The [widget registry](../../widgets/README.md)
gives every widget a stable `urn:fieldwork:widget:<nodeType>` identity, an
independent semantic version, a release file with a SHA-256 digest, declared
port contracts, an `implementationStatus` and an ontology mapping. That is a
package manifest in embryo. What a pack adds is grouping, a distribution story
and an admission procedure that applies to a third party.

## Two kinds of pack, and why the declarative one comes first

The registry README is explicit that it is "not an executable plugin loader":
node types are compiled into `TYPES` in [core.ts](../../src/core.ts) and into the
add-node chain in [app.ts](../../src/app.ts). A pack today can therefore ship
contracts, not code. That boundary is worth keeping on purpose for the first
slice.

| | Semantic pack | Code pack |
| --- | --- | --- |
| Ships | Vocabulary, SHACL shapes, N3 rules, widget contracts, worked examples | The above, plus executable operations |
| Execution risk | None: every artifact is data the existing engines already consume | Third-party JavaScript in the application's own origin |
| Offline behaviour | Fetched once, then travels inside the project package | The same, except code must also be pinned and cached |
| Trust | Rules are inspectable in the N3 & evidence view | Runs with the application's own access to local workflows, stored assets and session credentials. Curation reviews that code; it does not isolate it. See the governance section below |

N3 rules are data that EYE already evaluates, and SHACL shapes are data that the
development tooling already validates, so a semantic pack introduces no new
execution surface. A code pack is a separate decision with its own threat model,
and it should not be smuggled in behind the first one.

## Governance: the packs are curated, which changes who may publish

Decided: pack repositories are **owned, governed and curated by this project**
rather than accepted from arbitrary authors. That is the primary risk control,
and it is a real one — it removes the open-ecosystem problem of code arriving
from strangers, and it makes the admission review in
[the audit procedure](../ontology-audit.md) enforceable, because a pack cannot
reach a practitioner without passing through a review this project performs.

It should be recorded precisely, because curation addresses the **trust** model
and not the **execution** model. Pack code, if packs ever carry code, would run
in the application's own origin with access to the unencrypted workflow store,
the locally stored PDFs and raster windows, and the session-only credential
manager, and with the ability to make network requests. Curation means that code
is reviewed before it ships; it does not isolate it afterwards. So a code pack is
best understood as **application code maintained in another repository**, held to
the same standard as `src/`, and the declaration-only format stays the right
first slice for reasons that survive governance:

- A semantic pack has no dependency tree, so there is no transitive supply chain
  to audit. A curated repository can still take a dependency.
- Its artifacts are reviewable by reading them. A reviewer can check a vocabulary
  and a set of shapes; auditing a bundler output is a different undertaking.
- Its failure mode is a wrong inference, visible in the N3 & evidence view, not
  an action taken on the practitioner's machine.

Mechanisms that carry the governance weight, none of them implemented yet:

| Control | Purpose |
| --- | --- |
| Organisation-owned repositories with branch protection and required review | A pack change cannot reach a release without a reviewer |
| `CODEOWNERS` naming who may approve a pack's vocabulary | Separates reviewing the semantics from reviewing the code |
| A curated catalog in this repository, listing approved packs by **digest** | A moving tag is not an approval; a digest is. This mirrors how `widgets/registry.json` records release digests, and would be validated the same way |
| Digest recorded in the run receipt | An affected run can be identified later, which is what makes withdrawal possible |
| A published admission checklist | The reviewer and the pack author work from the same contract |

### Required reviews before a pack version is catalogued

Curation is only as strong as what the review actually examines. Three reviews
are required, they are recorded per pack **version and digest**, and a changed
digest requires them again. They are separable concerns and need not be done by
the same person; `CODEOWNERS` should reflect that.

**1. Semantic review** — the admission procedure already specified above:
namespace discipline, reuse versus new operation, typed ports with units, CRS and
missing-data policy, and positive and negative fixtures.

**2. Security review** — what the pack can reach and what it can cause.

| Item | What to establish |
| --- | --- |
| Run-time network access | Whether the pack fetches anything when a workflow runs. A declaration-only pack should assert none, and `owl:imports` or a remote data reference inside a rule or shape is a network request |
| Data egress | Whether anything leaves the browser. The viewed graph, a study area's coordinates and a point table are all sensitive in some contexts |
| Local reach, for code packs | Access to the unencrypted workflow store, locally stored PDFs and raster windows, and the session-only credential manager, all of which a same-origin script can read |
| Rule cost | Whether supplied N3 rules can be made to loop or explode. A declarative pack cannot exfiltrate, but it can deny the practitioner their session |
| Embedded data | Whether example data contains real personal or precise location data presented as synthetic. The geoprivacy work makes this concrete: a plausible-looking demonstration file can be a disclosure |
| Dependencies and licences | For code packs, the transitive tree, its licences against this repository's Apache-2.0 bundle, and the bundle-size cost against the offline budget |

**3. Regression review** — what the pack does to results that already exist.
This is the review most easily skipped and the one practitioners feel.

| Item | What to run |
| --- | --- |
| Existing results unchanged | The host's full gate with the pack admitted, and a comparison of the base worked examples' receipts before and after. Diff the N3 and evidence, not screenshots |
| Saved work still loads | The frozen-workflow replay already used by `workflows-compatibility` coverage, since a pack must not change what a saved project means |
| Merged vocabulary still sound | SHACL fixtures and the OWL 2 DL check from [experiment 42](42-ontology-structure-and-meaning.md) over the base ontology merged with the pack's, which catches a pack that makes the union inconsistent or breaks an existing shape |
| The pack's own examples | Executed, with their stated expected results and their declared negative composition case actually refused |
| Numeric claims | Checked independently in the [Validation Lab](41-validation-lab.md), without the pack installed |

Each review is recorded with its date, the versions exercised, what was run and
**what it did not establish**, in the same form as the validation notes in this
repository. A pack that passes all three can still be scientifically wrong: these
reviews establish that it is reviewable, bounded, and does not disturb existing
work. They do not establish that its operations suit a public-health question.

### The catalog is the trust root, so it is checked first

Pinning a digest protects the pack. Nothing protects the file that holds the
digests, and that file is where an unreviewed entry would do the most damage: a
single added line could point the host at anything. So the catalog carries its own
schema and governance rules, and the checker validates **the catalog before
anything it points at**.

`widgets/packs.json` declares the curated owners, the required reviews and the
permitted admission states, and `npm run validate:packs` enforces, with each rule
negative-tested:

| Rule | Caught |
| --- | --- |
| A pack may be admitted only from a curated owner | `owner "some-stranger" is not a curated owner` |
| Only at a full 40-character commit SHA | `a tag or branch is not an approval` |
| Not while it declares a missing host capability | admission refused |
| Not until every required review has passed and names the host version | refused, with the failing review named |
| Every pinned digest must match the fetched file | `digest 5ec42087… does not match the pinned 00000000…` |
| A pack may not declare a node type the host already defines | refused, so a saved workflow cannot be ambiguous about which definition produced a result |
| The catalog's outstanding capabilities must agree with the pack manifest | `catalog lists "tabular-import" as an outstanding host capability; the manifest does not`, and the converse |
| A capability declared present must name host widgets the registry releases | `names urn:fieldwork:widget:table_input@9.9.9, which the host registry does not release`, and an unknown widget identity |
| A catalog entry's stage statuses must match the pack manifest's | `catalog records stage import as "blocked"; the manifest declares "proposed"` |

The stage rule was added after the drift it describes had already happened. The
catalog still read `import: blocked` after the pack had moved that stage to
`proposed`, and nothing noticed until the catalog was read aloud. The general
lesson is about the catalog's design rather than this entry: **every field a
catalog entry restates from a pack manifest will drift**, because the two are
edited in different repositories at different times. A restated fact therefore
needs either a check or a reason to exist. Digests and the commit SHA are restated
deliberately — that is the pin, and it is verified on every run. Stage statuses and
capability names are restated for readability, so they are now checked against the
manifest instead of trusted.

The last two rules were added when the sea-level pack's blocker was cleared, and
they exist because of what that moment makes possible. A capability moving from
`missing` to `present` is a claim about the **host**, written in the **pack**, and
previously checked by nobody: the pack could assert a port it does not have, or
the catalog could record a pack as unblocked while the pack still said otherwise.
Both sides must now say the same thing, and the named host widget and version must
exist in `widgets/registry.json`. Clearing a blocker is therefore no longer a
matter of editing one word.

`CODEOWNERS` requires an owner's approval for the catalog, the widget registry and
the vocabulary, separately from ordinary source review.

> **Corrected, 2026-10-09.** This record's own checklist asks "Does installing a pack change any
> existing result?", so installation was always part of the concept. The catalog's
> `runtimeFetching: none` rule was later read as *no pack is ever installed*, which does not follow:
> the rule forbids fetching **while running**, not **installing at build time** — vendoring a pack's
> files at a pinned commit, verifying digests, type-checking and compiling them in. Build-time
> installation keeps every property the rule protects, and it permits a pack to ship widget source,
> since `PortType` is closed at compile time rather than at runtime. The host has already done this
> by hand for the sea-level pack's vocabulary and shapes; what is missing is the operation, not the
> possibility. See [experiment 59](59-pattern-for-engineered-knowledge.md) for what the exercise cost
> and [experiment 58](58-sea-level-widgets.md) for the hand-rolled version.

The checker is **development tooling and needs network**, so it is deliberately
not part of `npm run check`, which stays offline and deterministic. `--local`
checks a working copy instead. The application still loads nothing: admitting a
pack is a recorded review decision, not a runtime fetch.

Curation also creates an obligation this design should state rather than
discover: **withdrawal**. An approved pack may later be found wrong. Because the
catalog pins digests and receipts record them, the affected runs are
identifiable, and a withdrawn pack needs a deprecation note that says what was
wrong, which results it affects and what replaces it. A curated ecosystem without
a withdrawal path quietly converts review into endorsement.

## Continuous integration: fitness for integration is a property of a pair

The three reviews above should be executed by CI wherever they are mechanical,
so that a reviewer spends attention on meaning rather than on checking things a
script can check. The important design consequence is that **fitness for
integration is not a property of a pack**. It is a property of a (pack digest,
host version) pair, and it decays when either side changes. That shapes where
each job runs.

**Pack-repository CI** — self-contained, fast, no host checkout required. It
answers "is this a well-formed pack?"

| Job | Fails when |
| --- | --- |
| Manifest | `pack.json` is missing a required field, or its version is not a semantic version |
| Namespace discipline | The pack mints any `urn:fieldwork:` term, which is the host's namespace and not the pack's |
| Vocabulary and rules parse | Turtle or N3 does not parse, independently of each other, as the audit procedure already requires |
| Declared fixtures | A positive SHACL fixture fails, or a negative one passes |
| No run-time fetching | A rule, shape or `owl:imports` references a remote resource, which makes the security assertion machine-checkable rather than a promise |
| Example workflows | A bundled workflow does not validate against the current workflow schema |
| Data identity | A bundled data file's hash disagrees with its provenance record |
| Attribution | A `NOTICE` is absent for bundled data or dependencies |

**Integration CI** — the gate the user's phrase names, and the one that needs the
host. Published from this repository as a reusable workflow so every curated pack
calls the same gate rather than copying a variant of it, in the way
`.github/workflows/pages.yml` and the GitLab `functional-regression` job already
centralise the host's own checks.

| Job | Fails when |
| --- | --- |
| Merged vocabulary | The base ontology merged with the pack's is inconsistent, has an unsatisfiable class, or breaks an existing shape — the check from [experiment 42](42-ontology-structure-and-meaning.md) |
| Host gate with the pack admitted | `npm run check` does not pass: type checks, build, unit tests and browser scenarios |
| Existing results unchanged | A base worked example's receipt differs before and after admission. The N3 and evidence are diffed, so a changed number fails loudly rather than being noticed later |
| Saved work still loads | The frozen-workflow replay no longer restores and reruns |
| The pack's own examples | They do not execute, do not produce their stated expected results, or their declared negative composition is not refused |
| Numeric claims | A claim the pack makes disagrees with an independent recomputation in the [Validation Lab](41-validation-lab.md) |

**Re-verification on either side.** Because fitness is a pair, the catalog entry
records the host versions a digest was verified against, and a new host release
re-runs integration CI for every catalogued pack. A pack that was fit for
0.4.0 is not thereby fit for the next release, and discovering that at a
practitioner's desk is the failure this design exists to prevent.

**What CI emits.** A machine-readable integration report — pack digest, host
version, jobs run, results, and what the run did **not** establish — which
becomes the evidence attached to the catalog entry. A green pipeline is not an
approval: it shows mechanical fit, and the semantic review still gates
admission. Browser coverage is Chromium only today, as the host's own validation
notes state, so an integration report should name the browsers actually
exercised rather than implying cross-browser fitness.

## Worked examples are part of the pack, not documentation about it

This is the component that makes a pack reviewable. In this repository a worked
example is already both a teaching artifact and a regression fixture: the browser
suite executes the actual examples, and `workflow-compatibility.browser.mjs`
replays a frozen workflow to prove saved work still runs. A pack's worked example
plays the same double role, and it is the **only** artifact that demonstrates the
pack's widgets composing with the base widgets rather than merely declaring that
they could.

A pack example must therefore carry more than a canvas layout:

| Component | Requirement |
| --- | --- |
| Workflow | A workflow at the current schema, naming every node it uses |
| Composition | The base widgets it connects to, by widget identity and accepted version range, so the example states what it is compatible with rather than implying it |
| Data | Bundled source data with provenance and hashes, or a deterministic generator, with synthetic and real content labelled separately as the heat and Old Naledi examples already distinguish them |
| Expected results | Results at stated settings, in the "try three comparisons" form the [Old Naledi guide](../examples/old-naledi.md) uses, so a reviewer can tell a changed result from a changed assumption |
| Evidence | The N3 and receipt structure the run should produce, so a reviewer can diff evidence and not only pictures |
| Negative composition | At least one connection the pack **refuses**, with the explanation. A pack that only shows what works has not shown where its semantics end |
| Limits | What the example does not establish, in the pack's own words |

The negative case matters as much as the positive one, for the same reason the
audit procedure requires failing SHACL fixtures beside passing ones. A
syntactically connectable port is not a scientifically compatible input: a pack
offering a burden-weighted centre must not connect silently where an unweighted
mean centre is expected, and its example is where that refusal becomes visible.

Because every one of these artifacts is data — workflow JSON, GeoJSON, N3,
Turtle — a pack's examples do not change the execution risk profile. Numeric
claims an example makes can be checked independently in the
[Validation Lab](41-validation-lab.md) without the pack being installed at all.

## Keeping meaning consistent with the base ontology

A pack ecosystem turns the gap measured in
[experiment 42](42-ontology-structure-and-meaning.md) from a documentation
problem into an interoperability problem. The vocabulary currently asserts no
disjointness, so **nothing today would prevent a third-party pack from declaring
its class `owl:equivalentClass fw:StudyArea`**, or from typing one individual as
both a catchment and an isochrone, and no reasoner would object. Closing that gap
is a precondition for admitting packs from anyone outside this repository, not a
later refinement.

Admission for a pack is the existing
[semantic admission review](../ontology-audit.md) applied to a group rather than
to a single primitive. A pack must:

1. Mint terms **only** in its own namespace. `urn:fieldwork:` is not for packs.
2. State, per term, whether it reuses an existing `fw:` class, specialises one,
   or introduces a genuinely new operation — and prefer reuse with parameters
   over a synonymous widget, exactly as AGENTS.md requires internally.
3. Declare typed ports with units, CRS, cardinality and missing-data policy, and
   say which base port types it consumes and produces.
4. Ship positive and negative SHACL fixtures for everything it declares.
5. Record what its validation does not establish.

Two structural gaps must close before any of this is executable. `PortType` is a
closed TypeScript union, so packs need an open port registry together with
semantic port descriptions rather than bare strings. And saved workflows do not
yet pin widget versions, which is tolerable while every widget ships with the
application and becomes incoherent once a workflow can reference a pack that
evolves separately. With packs, version pinning stops being optional.

## Distribution as GitHub repositories

One repository per pack, resolved by **URL and commit digest rather than by
name**. That avoids operating a registry service, matches how the Gaborone source
commit is already pinned, and keeps provenance auditable. A proposed layout:

    pack.json                      identity, version, namespace, required base widget versions
    ontology/<pack>.ttl            the pack's own vocabulary
    ontology/shapes/*.ttl          positive and negative SHACL shapes
    rules/*.n3                     inference rules, as data
    widgets/<nodeType>/<version>.json   contracts in the existing release format
    examples/<id>/                 workflow, data or generator, provenance, expected results, README
    NOTICE                         licences and attribution for bundled data

A pack is admitted at a pinned digest, and the digest travels in the run receipt
beside the widget versions. Offline use requires that a pack be fetched once and
then carried inside the project package, as referenced PDFs and raster windows
already are; a workflow that silently needs network access at run time would
break the offline guarantee this prototype makes.

The first candidates are already separable from the core: the geoprivacy
vocabulary with its donut, H3 and comparison terms, and the STAC and processing
profile. Either could be lifted into a pack without inventing new semantics,
which makes it a test of the mechanism rather than of the content.

## Developmental-evaluation questions

These are what to ask of practitioners and reviewers, not acceptance criteria
for code.

1. Can a practitioner tell which widgets on a canvas came from a pack, which are
   base widgets, and who vouches for each?
2. Does a run receipt name the pack, its version and its digest, so a result can
   be traced to the operation definitions that produced it?
3. Does installing a pack change any existing result? If it can, is that change
   visible before it happens?
4. Can two packs claiming the same operation be compared, rather than one being
   silently preferred?
5. Can a practitioner reproduce a pack's worked example offline, and then
   transfer the pattern to their own data — the transfer question
   [experiment 27](27-workflow-learning-and-gamification.md) also asks?
6. When a pack's example disagrees with the base widgets' behaviour, is it clear
   which one is wrong?

## A pack must say which pipeline stages it supplies

Writing the first use case exposed a gap in this contract. A pack description
that begins "the widget consumes dataset X" has already assumed away the hardest
parts. The stages are distinct, and conflating them is how a design comes to look
finished while its first step is undefined:

| Stage | Produces | Who supplies it |
| --- | --- | --- |
| **Discovery** | A request naming a resolved location, never data | A widget, or an external procedure the pack documents |
| **Acquisition** | Bytes with a digest and byte identity | Only possible where the format and transport allow it in a browser |
| **Extraction** | A bounded artifact from something too large to read here | Outside the application, in the Validation Lab or a recorded procedure |
| **Import** | The artifact inside a project, with provenance | A widget, whose provenance duty is heavier than an acquisition's |
| **Application** | A result computed from the artifact | A widget, which must not imply it produced the underlying science |
| **Presentation** | A view | Base widgets, reused |

Two naming rules follow, both learned the hard way. A widget that reads a file
somebody else produced is an **import**, not an acquisition: an acquisition can be
replayed from its request, while an import can only be trusted if it records
where it came from. And a widget that applies published results is a **consumer**,
not a model. Experiment 39 corrected the first error when `stac_input` became
`stac_discovery`; the second is the same error one level up, and a pack that
called itself a model would be claiming scientific work it did not do.

A pack's manifest should therefore state, per stage, whether it supplies it,
assumes it, or declares it out of scope. "Assumes" is an acceptable answer. Silence
is not.

## First use case

[Experiment 47](47-sea-level-pack.md) works the contract above through a real
subject: sea-level rise over the IPCC AR6 projections produced by FACTS. It is a
useful first test because the science is external and authoritative, the data is
far too large to read in a browser, the result is easy to over-read, and the
existing worked examples cannot host it — Gaborone is landlocked — so the pack
must arrive with its own data and still compose with the base widgets.

It also supplies a concrete answer to what a pack's refused connection looks
like: a projected water level connected to a raster map would render something
that looks like a flood map, the ports would appear compatible, and the pack must
refuse it because a level is not an extent.

## Bounded first slice

Not implemented here. Proposed: lift one existing vocabulary into a
**declaration-only pack** in its own repository, with one worked example that
connects its widgets to base Study area, Input data, Map and Table nodes, a
negative composition case, and a `pack.json` pinned by digest. Add validation
that a pack mints no `urn:fieldwork:` term and that its SHACL fixtures pass and
fail as declared. Load nothing at run time: the application continues to compile
its own widgets, and the pack is exercised by the development tooling and the
Validation Lab only.

That slice tests the manifest, the admission review, the example contract and the
digest pinning while no executable code crosses a repository boundary. Runtime
loading, port-registry changes and version pinning in saved workflows are
separate experiments, and each needs its own migration note.
