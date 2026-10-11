# Open work, in priority order

_Created 2026-10-11 · Updated 2026-10-11_

What is committed to and not yet done. Items leave this list by being done or by
being recorded as decided against, not by being forgotten. Dated so that an item
sitting here for weeks is visible as a choice.

## Urgent

**1 · Notebook CI: plan it, then test it.**
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

**The Validation Lab has no gate at all.**
`_output` is a committed artifact that nothing checks against `content/`, which
is how it fell three notebooks behind. Item 1 should fix this as a side effect
rather than leave it separate.
