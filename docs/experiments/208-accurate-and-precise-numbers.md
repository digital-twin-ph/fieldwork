# 208 · Accurate and precise numbers, everywhere they are shown or recorded

_Created 2026-11-12 · Updated 2026-11-12_

**Status:** tried. The practitioner, 2026-11-12, after a step's warning read "189 records the rules could not read" of
MERS's 162: *"We do not need a specific SHACL rule just for this use case 189 out of 162. What we need is a validation
to make sure the results of counts and computations are accurate and precise."* Then: *"Ok to proceed with open items."*

## The question

Can every number Fieldwork shows or records be checked, against an independent recomputation for accuracy and against
itself for precision, rather than one rule being written for each error found?

## What exists, and the gap the 189 fell through

| Checked today | By | Leaves open |
| --- | --- | --- |
| Each computing widget against a reference library, on its own fixture | the lab, 32 of 40 widgets | a whole example's chain, from its source files |
| The ontology's shapes | SHACL | whether a number is right |
| Unit and browser tests | hand-worked cases | numbers no test names |

The 189 was neither: a number the interface composed for a sentence by adding two counts. No check compared a sentence's
numbers with the result they describe.

## Decided

| Checks | How | Enforced as |
| --- | --- | --- |
| **The words**: a number in a sentence comes from the step's own result | `scripts/sentence-numbers.mjs` runs each built-in example and looks for every number in each step's sentence among that step's results and receipt facts | Observed first; a gate once the findings are only real ones |
| **Accuracy, end to end** | for each shipped example, the lab recomputes every count and computed value its run produces from the source files (pandas), against a fixture of Fieldwork's results | Lab check per example, run by the gate's lab step |
| **Precision** | each example run twice gives identical results, compared by digest; each check states its tolerance; a shown number rounds as its column declares | Unit test, and the lab's stated tolerances |

The SHACL rule written for the one case was withdrawn the same day. The union counter it guarded stays: counting a record
once is right whatever checks it.

## First measurement, 2026-11-12

`scripts/sentence-numbers.mjs` on the built-in examples: **58 steps, 163 numbers in their sentences, 24 found in no
result of the step**, none a made-up count:

| Found | Cases | What it is |
| --- | --- | --- |
| "ISO 8601" | 5 | a standard's name, not a result |
| record names quoted in Hagelloch's serial interval sentence ("case-141 …") | 18 | the input's names, which the script does not yet read |
| "Encloses 139230.0 m²" in Snow's extent | 1 | **precision**: the sentence rounds to one decimal, the receipt holds the unrounded value |

So the measurement needs two refinements before it can gate: standards' names, and the names of the records a step read.
The hull's area is a real finding about precision.

## MERS end to end, the first example

The source has no licence stated and is used only in its own example repository (decided 2026-11-11). So the lab's
fixture holds Fieldwork's results, the source commit and each file's digest, not the data; the check reads the CSVs from
example-2015-mers-korea at the pinned commit. It recomputes: each case's days to detect and to notify, each verdict and
its count; cases per source and per setting of exposure; the rows Relate keeps one per match; the tree's chains, links
and further links; and each data issue's count.

## What this does not establish

That every number shown is covered: only the steps that write a sentence, in the examples that run without a learner's
input, and the examples the lab recomputes. That agreement with pandas is correctness: two implementations can share a
wrong reading of a definition, which is why each check states the definition it computes.
