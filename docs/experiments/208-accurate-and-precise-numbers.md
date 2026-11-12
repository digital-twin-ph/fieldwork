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

**Corrected the same day:** the hull is not a finding. Its receipt holds 139230.01 m² and the sentence says 139230.0, the
same value to the one decimal it shows. The script compared exactly; it now compares each number with the result
rounded to the decimals the sentence gives.

## Second measurement, 2026-11-12: every example, and run twice

The script now runs the built-in examples and every example pinned in `widgets/examples.json` whose repository is beside
this one, at its pinned commit, its fetched tables read from that commit. A number may come from the step's receipt,
output and table, its settings, or what its inputs carried; a percentage is compared with a share; dates, standards'
names, numbers inside a name and "and 157 more" are set aside. `--twice` runs each workflow again and compares every
output and table by digest.

| | |
| --- | --- |
| Steps with a sentence | 176 |
| Numbers in them | 420 |
| Found in no result of the step | **0**, after the fixes below |
| Run twice | every output and table identical |
| Not run | 9: the empty canvas and an unset map image; two Sierra Leone workflows that need the reasoner; four that read satellite files or IndexedDB, which need a browser; NYC's NO₂, which needs a worker |
| Time | 1 min 46 s |

What it found, each fixed:

| Found | What it was | Fixed |
| --- | --- | --- |
| Hagelloch's serial interval named four records as every value they hold ("case-141 · Case 141 · 141 · 50 · 4 · f …") | A record from a table was named by joining all its key columns | Named by the declared key, else the first key column that tells every row apart: "case-141, case-173, case-174, case-184" |
| "Dropped 12582 records" in the sea-level example | A total only the sentence held; three of its four parts were in no receipt either | Find health facilities 0.4.2 records all four and the total |
| Five tables in four example repositories fetched from commits the 2026-11-11 history rewrite replaced | GitHub still serves them, but only until it collects what nothing points to | Pointed at the rewritten commits, the same files and digests; re-pinned |

**Now in the gate:** `npm run validate:sentence-numbers` (`--strict --twice`) in `npm run check`, since its findings are
only real ones.

## MERS end to end: Validation Lab check 49, 2026-11-12

Fixture `mers-korea-001` holds Fieldwork's results for both workflows, the commit, and each source file's digest; no row
of the source. The check reads the two CSVs at that commit and recomputes, with pandas: each of 162 cases' days and three
verdicts, the four count tables, Relate's 165 rows and its counts, the tree's 8 counts and 67 chains, and 6 counted data
issues.

| Found | Status |
| --- | --- |
| Relate said "2 keys matched several rows, adding 3 rows", and the run's record of the step did not carry it | Fixed: carried |
| One setting of exposure is "Family member " in the file, with a trailing space; Fieldwork shows "Family member". Every key value is trimmed as a table is read (`src/data-table.ts`), and nothing recorded that it was | Decided by the practitioner the same day, *"Trim, and say so"*: still trimmed, now a finding per column and the data issue **Spaces trimmed** (`fw:ValueTrimmed`), recounted from the file by the check |
| Everything else | Agrees exactly |

**Result, 2026-11-12: check 49 agrees** (Validation Lab ca09fb5 and after; parity entry `49-mers` on Apply ruleset
0.13.1): 162 cases' days and verdicts, four count tables, 165 Relate rows, the tree's 8 counts and 67 chains, and 7 data
issues, exactly, in CPython and through the notebook.

Observed, and not judged by either side: **7 cases** have a report dated before their diagnosis, so a negative interval
counted as Met; and Relate's retention line reads "age: 59.1% of 8,962 retained", a share of summed ages, which means
nothing for a line list.

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
