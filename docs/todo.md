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

**1 · The 13 computing widgets still with no lab check.**
32 widgets owe an independent check and 19 have one, counted by
`validate:check-coverage` and visible in every run.
[widgets/check-coverage.json](../widgets/check-coverage.json) declares what each of the 51
owes, with a reason for every exemption; the awaiting count can only fall.
Record: [98](experiments/98-the-coverage-ratchet.md), which groups the remaining 13 by the
external implementation that would check them, because the cost is the reference and the
fixture rather than the widget. Seven of the thirteen done came from the shapely group and
shared two fixture helpers, so they were cheaper than the rest. The two buffer widgets, checked
against theory because nothing equivalent exists to compare them with, and the two that left
the group entirely — `21-hex` against h3-py, `22-case-series` against pandas — cost more per
check and found more.

Each notebook has two parts, not one ([94](experiments/94-where-explanation-belongs.md)).
**Parity** recomputes independently for a reviewer. **Dive deeper** varies the assumption the
widget inherits and shows what it does to the answer. `10-hull` through `22-case-series` are the worked
instances. Two reported a consequence that argued against the warning the section was
written to make, and one found that its own fixture does not contain the hard case at all —
no location on a polygon edge — so the notebook constructs it. Expect that to recur.

Two constraints on the grouping, both learned rather than designed:
`sample_raster` needs its own notebook, because requesting `rasterio` beside `pyproj` kills
the kernel ([97](experiments/97-the-browser-kernel-gate.md)); and `buffer_area` and
`buffer_point` will not agree exactly with shapely, so their criterion must state an area
tolerance with the quadrant count declared rather than claim an agreement that is not there.

**2 · There is no user manual.**
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

**The lab check coverage ratchet exists, and thirteen of the 26 are done.** Done
2026-10-11. The classification could not be derived — `implementation.definition` names
`src/core.ts#TYPES` for 39 of 51 widgets, so the registry does not record where most
widgets are implemented — so it is declared and reviewed instead, and the validator
enforces completeness and the ratchet rather than the judgement. Verified by breaking it
four ways. Thirteen widgets now have checks, all agreeing. Three recompute the
John Snow Voronoi example, which is independently verified end to end, and the four primitives
of the isochrone decomposition are now all checked. (An earlier version of this entry said
`isochrone` could therefore be compared against its own decomposition. That is wrong and
[41](experiments/41-validation-lab.md) forbids it — both sides would be Fieldwork. What is
cheaper is that the reference code in checks 07 and 08 composes into a reference for the
monolith.) Three checks failed on their first run and in every case the
criterion was wrong, not the widget — most instructively `22-case-series`, whose own docstring
named the week as the dangerous rule before the code got that rule wrong. Awaiting fell
26 → 13.



**Notebook CI is complete, in both environments.** Done 2026-10-11.
`scripts/run_notebooks.py` executes every notebook under CPython -- 20 of them as of
2026-10-11, in 14 s -- and
`node/check_09_notebooks_browser.mjs` executes them in the browser kernel in
58 s; both fail on any error cell and **both block publication**. The browser
half was the open item, blocked on `02-clip-vs-rasterio` not completing in
twelve minutes. Cause: requesting `pyproj` alongside `rasterio` makes
`rasterio.open` kill the kernel outright, and a fatal kernel error produces no
error cell, so the runner waited for an execution count that could never arrive.
Each notebook now requests what it imports, and the runner races cell completion
against kernel death. Record: [97](experiments/97-the-browser-kernel-gate.md).

Two things that followed and are **not** resolved: the Pyodide distribution is
loaded from a CDN pinned by nothing in the lab, so an upgrade would be found out
by the gate failing; and the crash is an unexplained upstream defect with a
two-package reproduction that has not been filed.



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

**No automated UTM selector, and the zone guard is a zone too wide.** Nine widgets take
`zone` and `hemisphere` by hand, defaulted to Soho's 30/north. The guard in `metric()` allows
±6° from the central meridian where a zone spans ±3°, so an off-by-one zone passes silently —
costing +0.17% in distance at London's latitude and **+0.47% at 15°N**, which is where the
Philippines is. Separately, several widgets convert metres to an angle on a mean sphere while
every projection is on the WGS84 ellipsoid, which is a direction-dependent 0.06–0.32% at 51.5°N
and 25 times larger than the scale factor. Measured, with four options and none chosen, in
[100](experiments/100-choosing-the-metric-crs.md). Raised by the practitioner asking whether a
selector existed.



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
