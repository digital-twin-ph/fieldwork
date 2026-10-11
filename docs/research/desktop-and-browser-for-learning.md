# Desktop and browser, from a learning perspective

_Created 2026-10-11 · Updated 2026-10-11_

Fieldwork is a browser application. A desktop build has been raised three times
for different reasons — cross-origin acquisition
([69](../experiments/69-healthsites-acquisition.md)), STAC assets behind CORS or
authentication ([91](../experiments/91-stac-browser-integration.md)), and a
durable learning record ([93](../experiments/93-gamification-spike.md)). This
compares the two **for learning**, which is a different question from which is
the better application.

**Nothing here is observed.** Nobody has learned anything with either form of
this tool. What follows reasons from properties that have been measured, and
says which is which.

## Decision, 2026-10-11

**The browser application stays focused on field work. Learning belongs to the
desktop build, along with acquisition that no browser will permit.**

This is a positioning decision rather than a conclusion drawn from the table
below, and it resolves the table's split verdict by declining the premise that
one surface must serve both. Three surfaces, each with one job:

| Surface | Job |
| --- | --- |
| **Fieldwork in a browser** | Field work. Offline, sandboxed, nothing to install, one version for everyone |
| **Validation Lab** | Independent recomputation, and the Dive Deeper materials that explain what a widget does ([94](../experiments/94-where-explanation-belongs.md)) |
| **Fieldwork on the desktop** | Field work, plus a durable learning record, plus acquisition free of CORS |

The reason is stronger than storage. A tool used during an outbreak should not
have points on the screen. Attention during fieldwork belongs to the work, and
a progress indicator competes with it — which is a sufficient argument on its
own, and holds even where `localStorage` would have been durable enough.

It also supersedes the recommendation in
[93](../experiments/93-gamification-spike.md) that the stateless half of the
measurement could ship in the browser because it accumulates nothing. It could
have; it should not. "This can go here" is not "this belongs here", and the
split that argument proposed was a way of avoiding a deferral rather than a
reason to put learning in a field tool.

### What it changes elsewhere

[79](79-emergent-palette-slicing.md) proposes filtering the palette on two axes,
and the decision separates them. **Scenario** — outbreak investigation,
surveillance, service access — is field work and stays in the browser.
**Skill level** is learning and moves to the desktop build. They looked like
one feature with two parameters and they are two features for two surfaces.



## The dimensions that actually differ

### Getting started

A browser application is a URL. In a workshop, a classroom, a borrowed laptop or
a government office where software installation needs approval, that is the
difference between starting and not starting. A desktop build is an install, a
platform, a version and often a permission.

This matters most at exactly the moment learning is most fragile — the first
hour — and it matters least to someone already committed.

**Browser, decisively, and the gap is largest for beginners.**

### Keeping a record over time

`localStorage` is per-origin and per-device, cleared when site data is cleared,
and does not survive a move to another machine. The application already treats
it as fallible: `save()` reports whether it persisted and `change()` takes a
`requirePersistence` option.

A lost workflow is recoverable; a lost learning record is not
([93](../experiments/93-gamification-spike.md)). A desktop build has a file the
practitioner owns, can back up and can carry.

**Desktop, decisively.**

### Teaching a group at once

One URL means one version. Everybody in a cohort sees the same build, gets the
same fix at the same moment, and a facilitator can say "open this link" without
asking what anyone installed. A desktop cohort diverges the moment one person
skips an update, and a facilitator debugging a build they cannot see is the
common failure.

**Browser, decisively.**

### A shared machine, which is the Philippine case worth naming

A rural health unit may have one computer used by several staff. This cuts both
ways and neither is comfortable:

- A **browser** with no accounts cannot keep a per-person record on a shared
  machine. Everyone shares one `localStorage`, so a learning record is
  attributed to a device, not a person.
- A **desktop** build has operating-system users, which is a real identity —
  but on a shared machine people routinely share one login, so the identity is
  nominal and the record is still attributed to a desk.

**Neither.** A per-person record on shared hardware needs an account, and an
account is the thing [27](../experiments/27-workflow-learning-and-gamification.md)
A92 refuses, with good reason. Worth stating plainly rather than resolving by
preferring the form that merely looks like it has an answer.

### Getting real data into an exercise

Measured on 2026-10-10 across 45 public STAC APIs: catalog metadata is broadly
reachable from a browser, and **asset bytes often are not** — WorldPop sends no
CORS header and ignores `Range`, while Sentinel-2 on AWS answers a ranged `GET`
with `206`. Healthsites sends no header at all
([69](../experiments/69-healthsites-acquisition.md)). A desktop build is not
bound by any of it.

This bears directly on the Dive Deeper materials
([94](../experiments/94-where-explanation-belongs.md)), which teach by varying
an assumption against real data. The browser can do that today for the data it
can reach, and a desktop build widens what an exercise can be built from.

**Desktop, for the range of material; browser is sufficient for a good deal of
it.**

### Handling sensitive locations

The browser sandbox is a safety property, not only a limitation. A tool that
cannot read the filesystem cannot read the wrong file. For a project that ships
donut geomasking and encrypted project packages, and whose worked examples
carry real death locations, a learner experimenting inside a sandbox is a
smaller risk than a learner experimenting with filesystem access.

**Browser, and this is underweighted in most desktop arguments.**

### Engine variance

A desktop build does not escape browser engines; it chooses them per platform.
Tauri runs WKWebView on macOS, WebView2 on Windows and WebKitGTK on Linux.
[70](../experiments/70-webkit-parity.md) measured what that costs: 37 WebKit
failures, including that WebKit cannot store a `Blob` in IndexedDB, all
invisible to a Chromium-only gate.

**Browser is not better here, but desktop is worse than it looks.** Packaging
increases engine variance rather than removing it, which is why that experiment
requires a WebKit gate before any packaging decision.

## Four objections, and what they change

Raised 2026-10-11. Two revise rows of the table below; two do not.

### Cohort divergence is a drift problem, and this project has a drift answer

The table says desktop cohorts diverge. That is true of the *binary* and need
not be true of the *material*. Teaching content can be governed exactly as
everything else here is: a widget release is pinned by version and digest, a
composition pins every member and reports drift when one moves, and a pack
catalog carries a digest the build recomputes. Teaching material could declare
the application version and widget versions it was written against, and say so
when they differ — which is the composition drift report in another costume.

That does not make the binary uniform. A facilitator still cannot assume
everyone installed the same build. What it does is make the divergence
**visible and specific** instead of mysterious, which is the difference between
"it doesn't work on mine" and "this exercise was written for 0.7.0 and you have
0.6.2". **Row revised: desktop cohorts diverge, and the divergence can be
reported rather than discovered.**

### A shared machine: durability and attribution are different properties

The objection is right and my row conflated two things.

- **Durability** improves unconditionally on the desktop. A file survives a
  cleared cache, a different browser and a move between machines. A shared
  login does not make a file less durable.
- **Attribution** does not follow. If three nurses share one Windows login, the
  operating-system user identifies the desk, not the person.

They are separable, and the separation suggests the answer: a **local profile
chooser** inside the application — pick who you are when you sit down, with no
server, no roster and no account in any networked sense. That is not what
[27](../experiments/27-workflow-learning-and-gamification.md) A92 refuses; A92
refuses accounts and rosters as infrastructure, and a local name on a local file
is neither. **Row revised: desktop is decisively better for durability, and
attribution needs a local profile, which is a small feature and not an account
system.**

### Tauri does not reduce engine variance, but it may not add much either

Measured against [Tauri's own reference](https://v2.tauri.app/reference/webview-versions/):
Windows uses WebView2, which is Chromium and self-updating; macOS uses
WKWebView; Linux uses webkit2gtk 4.1; Android uses the system WebView, which is
Chromium.

So the engine **families** are exactly the two already gated here: Chromium and
WebKit. A documented two-engine gate covers the families a Tauri build would
run on, which is better than the original row implied.

What changes is **who controls the version**. A browser auto-updates, so users
converge on recent engines. WKWebView is tied to the macOS version and cannot be
updated independently; webkit2gtk is tied to distribution packaging. For a
managed fleet that is more predictable; for an unmanaged one it means older
engines persist. And Playwright's WebKit is a build of WebKit rather than
WKWebView or webkit2gtk, so the gate approximates those targets rather than
being them.

**Row revised: desktop does not multiply engine families beyond the two already
tested, and the real difference is version control and currency, not variety.**

### CI already carries most of the governance

Checked rather than assumed. Every validator has a corresponding unit test —
`ontology-shacl`, `widget-registry`, `compositions`, `pack-catalog`, `parity`,
`ontology-coupling` — and `npm run check`, which the Pages workflow runs on
every push, executes the whole unit suite plus the documentation and coupling
validators and the browser tests. So the registry, ontology, composition and
parity rules are enforced by machine, not by memory.

**The gap is engines, not rules.** The workflow installs Chromium only
(`npx playwright install --with-deps chromium`), so the WebKit suite that has
run at parity all day runs only here, by hand. Adding WebKit to CI is a
one-line change and is the thing that makes the gate real.

**So yes: CI minimises the governance work, and it already does for everything
it runs.** It does not reduce the work of deciding what a rule should be, and a
rule outside CI is a rule somebody has to remember — which is what the WebKit
suite currently is.

## Summary

| Dimension | Browser | Desktop |
| --- | --- | --- |
| Getting started | **Decisive** | Install, platform, permission |
| Record over time | Erasable by design | **Decisive** |
| Teaching a cohort | **Decisive** — one URL, one version | Versions diverge |
| Shared machine | Record belongs to a device | Record belongs to a login that may be shared |
| Real data for exercises | Limited by CORS | **Wider** |
| Sensitive locations | **Sandboxed** | Filesystem access |
| Engine variance | One engine per user | Three engines to support |

## What this suggests

**They suit different phases rather than competing.** First contact, workshops
and cohort teaching are browser work: nothing to install, one version, a safe
sandbox. Sustained individual practice with a record that accumulates is
desktop work, and so is any exercise needing data the browser cannot fetch.

**A desktop build should not be justified by learning alone.** It converges with
two acquisition reasons already recorded, and that convergence is the case. A
desktop build whose only job is to remember points would be a large amount of
platform work for a feature nobody has yet shown helps.

**The measurement waits too, and not for a technical reason.** Parsimony and
provenance completeness could be computed in the browser from the workflow in
hand, since they accumulate nothing. The decision above says they should not
be: a field tool keeps the field's attention.

## What would settle it

Watching somebody learn with each. None of the above is observation: it is
inference from measured properties — CORS results, WebKit failures, storage
behaviour — applied to a question those measurements were not taken to answer.
The first workshop would likely overturn at least one row of that table, and
the most likely candidate is the shared-machine row, because it is the one where
the honest answer is that neither form works.
