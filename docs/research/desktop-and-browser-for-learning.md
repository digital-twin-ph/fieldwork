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
