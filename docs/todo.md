# Open work, in priority order

_Created 2026-10-11 · Updated 2026-10-11_

What is committed to and not yet done. Items leave this list by being done or by
being recorded as decided against, not by being forgotten. Dated so that an item
sitting here for weeks is visible as a choice.

## The goal this list is answerable to

To empower public health practitioners in the practical use of GIS in field
workflows — where it matters, and where resources and connectivity may be
scarce. Not to get everything working perfectly.

Read against that, the items below do not all serve the same people, and two
tensions are worth seeing before choosing what to do next.

**Reaches a practitioner in the field, offline.** Fieldwork itself precaches and
reports *Available offline*. A user manual shipped with it would too. Widget
correctness reaches them indirectly and certainly: they rely on the widget being
right and will never run the notebook that checks it.

**Written for people with connectivity, and that is correct.** The Validation
Lab is for Fieldwork developers and contributors, who work where there is a
network. Its need for connectivity on first use is a property of its audience,
not a defect — the earlier version of this section treated it as a failure
against the goal, which was wrong. What it does need is to **say so**: a
practitioner who wants to review a check offline has to learn the prerequisite
before they are in the field, not after.

**The Dive Deeper material is a different audience and a different problem.**
Learners are not contributors, and the material is the explanation surface
[94](experiments/94-where-explanation-belongs.md) assigned to the lab. They
reach the page while online — that is unavoidable, it is how they get it — so
the answer is to use that moment: **run every notebook once while connected**,
which both caches what the kernel needs and surfaces any failure while there is
still a network to fix it with. Offline availability becomes a setup step a
learner performs deliberately rather than a property they discover they lack.

**Serves us, not them.** The experiment-document standard, done 2026-10-11, was
an internal instrument, and [96](experiments/96-the-experiment-document.md) says
so in its own closing section: its beneficiaries are us and future contributors,
not a practitioner in the field.

## Urgent

**1 · Notebook CI: plan it, then test it.**
The Validation Lab's notebooks are the instrument that checks Fieldwork's
computations. On 2026-10-11 all seven were run end to end for the first time, by
hand, in CPython; all passed, and `scripts/run_notebooks.py` now does it in CI
and fails the build on an error cell. **The browser half is the remaining work**:
it runs in CI but with `continue-on-error`, because `02-clip-vs-rasterio` does
not complete in Pyodide within twelve minutes and the cause is not established,
and notebooks 05–08 are unverified in the browser since the fixture integrity
fix of 2026-10-11. The published site was
three notebooks out of date until it was rebuilt the same day.

Two environments matter and only one is easy. CPython execution is a few lines
with `nbclient`. The browser kernel is the environment learners actually use,
and a notebook can pass in CPython while failing in Pyodide — which is
reportedly what happened to `01-reproject-vs-pyproj`, unreproduced so far.
Whatever is built has to fail the build on an error cell, in both.
Design record: [41](experiments/41-validation-lab.md).

**One mechanism, two uses.** "Run every notebook and report any error cell" is
the same operation whether it runs in CI or in a learner's browser on the setup
visit. In CI it fails the build; in the browser it warms the kernel, caches what
Pyodide needs and tells a learner what works before they lose the network.
Build it so both callers can use it rather than twice.

**2 · The 26 computing widgets with no lab check, and no Dive Deeper material.**
31 widgets compute something; 5 have a check. Plan and test the work, do not
simply start writing notebooks: a coverage ratchet like
`ontology/coupling-debt.json` should come first so the number is visible in
every run and can only fall. Item 1 comes before this one, because adding 26
unexecuted notebooks adds 26 unverified files.

Each notebook now has two jobs, not one ([94](experiments/94-where-explanation-belongs.md)).
A **parity** section recomputes independently for a reviewer. A **Dive Deeper**
section varies the assumption the widget inherits and shows what it does to the
answer — which is where a practitioner comes to understand what the widget
actually does, since the canvas cannot carry an explanation. Checks 07 and 08
already do this without having named it: the walking speed taking the reached
set from 69 junctions to 246, and the corridor half-width taking the area from
0.51× to 1.53×. That is the pattern to follow, and it raises what each of the 26
is worth writing.

**3 · There is no user manual.**
[docs/usage.md](usage.md) is a reference for what the application does, written
when the practitioner detail moved out of the README. It is not a manual that
teaches a method, and two things have now been found to need one:

- **Composing micro-workflows as problem decomposition.** The skill is in
  building one, not reading one ([94](experiments/94-where-explanation-belongs.md)),
  so it needs instruction and an exercise rather than a feature description. The
  exercise should start away from the canvas: understanding the problem is where
  the time pays, and a manual that opens by placing nodes teaches the opposite
  ([93](experiments/93-gamification-spike.md)).
- **What a widget actually does**, at the level a practitioner needs before
  choosing it. The Dive Deeper notebooks carry the depth; a manual has to carry
  the route to them.

Not urgent against the items above, and recorded now because it has been
implied twice in two days and never written down.

## Done

**The experiment document is standardised.** Done 2026-10-11:
[docs/experiments/README.md](experiments/README.md) states the form,
`validate:experiments` gates the two parts a machine can honestly read, and it
runs inside `npm run check` and so in CI. The five questions are deliberately
**not** enforced — they are a reading test, and a validator demanding
`## What happened` would have produced 96 conforming documents and no better
reading. 9 of 96 conform; 87 are recorded in
[standard-debt.json](experiments/standard-debt.json) and the list only shrinks.
Record: [96](experiments/96-the-experiment-document.md).

The new **what changed our minds** element is in place on four documents and
counted in every run. It is not required, because not every document had its
mind changed; it is counted so that it does not quietly become a rule nobody
follows. If the count sits still for a month, that is the finding.

## Known and recorded, not yet scheduled

**Four widgets cannot be added from the palette as drafts.**
`slr_extract_import`, `slr_threshold_comparison`, `rate` and `case_series`
validate their full contract on every edit, so `change()` rolls back and the
canvas appears to ignore the click. Recorded in
`tests/palette-add.browser.mjs`, which fails if the set grows. That test's
comment referred to this list before it existed.

**Numeric Inspector fields revert visually after a change.**
The model updates and the field does not. Affects every numeric parameter, not
one panel; measured on `mean-center-zone`, which predates the micro-workflow
work. Recorded in [92](experiments/92-micro-workflow-on-the-canvas.md).

**A desktop build now has a settled rationale and no plan.**
Three reasons converge on it: acquisition no browser will permit
([69](experiments/69-healthsites-acquisition.md)), STAC assets behind CORS or
authentication ([91](experiments/91-stac-browser-integration.md)), and a
durable learning record, which as of 2026-10-11 is where learning belongs at all
([desktop and browser for learning](research/desktop-and-browser-for-learning.md)).
Nothing is scheduled, nothing is designed, and the WebKit gate below comes
first. Recorded so that "the desktop app will do it" stops being a way of
agreeing with an idea without doing it.

**The documented gate is Chromium only, and so is CI.**
`playwright.config.mjs` says so, and `.github/workflows/pages.yml` runs
`npx playwright install --with-deps chromium`, so the WebKit suite runs only on
a developer's machine by hand. Both suites have in fact run at parity all day at
94 checks each. [70](experiments/70-webkit-parity.md) requires a WebKit
gate before any desktop packaging decision, and
[93](experiments/93-gamification-spike.md) now gives a second reason to want
one. Making WebKit part of the documented gate is small and unblocks that
question.

**The Validation Lab had no execution gate.** Fixed 2026-10-11:
`scripts/run_notebooks.py` executes every notebook and fails on any error cell,
and the Pages workflow runs it before building the site, so a broken notebook
blocks publishing. CPython only; the browser kernel is still unchecked, which is
the remaining half of item 1.

An earlier version of this entry said `_output` was "a committed artifact that
nothing checks". That was wrong — it is gitignored, and CI builds the site fresh
from `content/` on every push, so the published site was never stale. What was
three notebooks behind was a local build directory, which matters to nobody.
