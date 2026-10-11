# Open work, in priority order

_Created 2026-10-11 · Updated 2026-10-11_

What is committed to and not yet done. Items leave this list by being done or by
being recorded as decided against, not by being forgotten. Dated so that an item
sitting here for weeks is visible as a choice.

## Urgent

**1 · Standardise the experiment document, because it is the DE instrument.**
Placed first, which is a change from how these were listed on 2026-10-10: the
other two items produce work that has to be written down, and this decides how.
Say so if that ordering is wrong.

A reader — a contributor, a reviewer, or one of us in a week — should be able to
answer five questions from any experiment document without reading all of it:

1. **What question did we ask?**
2. **How did we try to answer it?**
3. **What happened?**
4. **What did we decide?**
5. **How did that shape the architecture or the framework?**

**Most of the structure already exists and is unnamed.** Measured 2026-10-11
across 94 documents, the recurring second-level headings are:

| Heading | Documents |
| --- | --- |
| "What this does not establish" / "What this cannot establish" | 18 + 8 |
| "Competency question(s)" | 10 + 6 |
| "Practitioner exercise" | 9 |
| "Design checks" | 8 |
| "Distinctions" | 7 |
| "Validation this commits to" / "Validation record" | 6 + 3 |
| "Evaluation" / "Developmental evaluation" | 6 + 5 |

So the strongest convention in the corpus — stating what a document does **not**
establish — appears 26 times under two different spellings, and the question
heading 16 times under two more. The work is mostly naming what is already
there and closing the splits, not inventing a form.

**It also needs a status**, because 46 of 94 documents have one and those 46 use
free prose: `asked`, `tried`, `validated`, `retired`, as proposed in
[the rule audit](audits/rule-audit.md). Half the corpus currently gives a reader
no way to tell a proposal from a finding, which is how a spike re-derived
experiment 27 five days after it was written.

**One element to consider adding, which nothing currently has.** This project
records the provenance of data obsessively and the provenance of its own
decisions not at all. Several of the best findings this week came from a
correction — the 1854 walking speed, parsimony as the measure, "no baseline
until a problem recurs", known against validated — and a reader cannot see which
claims survived challenge and which were never tested by one. A short **what
changed our minds** element would make the evaluation visible in the record
rather than only in the commit messages.

Apply it the way `ontology.emits` was applied: require it of new documents, add
it to existing ones as they are touched, keep the count visible. Do not migrate
94 documents in one pass.

**2 · Notebook CI: plan it, then test it.**
The Validation Lab's notebooks are the instrument that checks Fieldwork's
computations, and nothing executes them. On 2026-10-11 all seven were run end to
end for the first time, by hand, in CPython; all passed. The published site was
three notebooks out of date until it was rebuilt the same day.

Two environments matter and only one is easy. CPython execution is a few lines
with `nbclient`. The browser kernel is the environment practitioners actually
use, and a notebook can pass in CPython while failing in Pyodide — which is
reportedly what happened to `01-reproject-vs-pyproj`, unreproduced so far.
Whatever is built has to fail the build on an error cell, in both.
Design record: [41](experiments/41-validation-lab.md).

**3 · The 26 computing widgets with no lab check, and no Dive Deeper material.**
31 widgets compute something; 5 have a check. Plan and test the work, do not
simply start writing notebooks: a coverage ratchet like
`ontology/coupling-debt.json` should come first so the number is visible in
every run and can only fall. Item 2 comes before this one, because adding 26
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

**4 · There is no user manual.**
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

**The Validation Lab has no gate at all.**
`_output` is a committed artifact that nothing checks against `content/`, which
is how it fell three notebooks behind. Item 1 should fix this as a side effect
rather than leave it separate.
