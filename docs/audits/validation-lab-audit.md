# Audit — the Validation Lab

_Created 2026-11-26 · Updated 2026-11-26_

Asked by the practitioner on 2026-11-26, in two questions:

1. Does every computational widget have a lab notebook that checks its results independently?
2. Does every notebook work as intended? Is each one written to one standard, in plain language, with its goal, the
   Fieldwork computation it checks, the expected result and its known limits?

Read at Fieldwork 0.200.0 (branch `code-review-remaining`, commit 6b1b3593) and the lab at 202cc775, which is the
commit `widgets/parity.json` pins. The lab's working copy held one uncommitted edit, to notebook 50. That edit was not
made by this audit and was left alone.

## What was run

| Run | Where | Result |
| --- | --- | --- |
| Every fixture exported again from the 0.200.0 build | a scratch copy of the lab | 46 of 47; the ruleset exporter fails |
| Every Python check, against those new fixtures | the same copy, CPython 3.13 | 44 agree, 3 now disagree, 1 still partial, 3 not compared |
| Every notebook, as published, by the lab's own runner | a second copy, CPython 3.13 | 51 of 51 ran with no error cell |
| The lab's CI, last 60 runs | GitHub Actions, read only | last success 2026-10-15; 40 failures since |
| `validate:check-coverage` and `validate:parity` | Fieldwork | both pass |

The lab repository and its fixtures were not changed. Nothing was pushed. The browser kernel was not run locally; its
results here are CI's, from the run of 2026-11-22.

## Question 1: does every computational widget have a check?

**No. 31 of the 42 widgets that compute something have a check, which is what `check-coverage.json` says.** That
count holds, but four of its judgements are out of date, and most checks cover an older release.

### The ledger's count

| Kind | Widgets |
| --- | --- |
| Checked | 31 |
| Owe a check, none written | 11: Keep points inside the area, Compare point sets, Move points in a donut, Network isochrone, Measure distance, Point grid, Polygon layer, Rate with a denominator, Transmission chains, Line layer, Travel time over ground |
| Blocked | 1: Find health facilities, whose input is a live service with no frozen response yet |
| Nothing to recompute | 10 |

### Where the ledger is out of date

- **Study area** is listed as computing nothing. It repairs published boundaries as it reads them (experiment 194),
  and check 41 verifies that repair against shapely. The check exists, so the widget is covered, but the ledger
  doesn't count it.
- **Tabular data** is listed as "a supplied long-format CSV, retained as given". It now converts wide files to long,
  applies edits made by hand, and profiles every column for the data quality tab. All three could be recomputed
  independently, and none is checked.
- **Transmission chains** is listed as owing a check. Its core is `transmissionTree`, which check 44 recomputes with
  networkx, and check 43 covers the offspring counts. Both checks credit other widgets, Chart and Relate. What remains
  unchecked is the step's own output.
- **Seven lab results have no `parity.json` entry:** checks 36, 37, 38, 40, 41, 47 and 52. Checks 37 and 38 verify
  Regression's strata and lag models, and check 40 verifies Relate's spelling match. These features came after the
  releases the ledger credits, and the ledger doesn't know they are checked.

### Most checks cover an older release

46 of 48 parity entries name a release older than the current one. Together, 425 recorded changes came after them.
Reading the changes doesn't settle which ones matter. So this audit exported every fixture it could again from
0.200.0, which was 44 of the 47 the exporter names, and reran each check that could run. The exceptions are listed
below.

| Result at 0.200.0 | Checks |
| --- | --- |
| **Still agree, on a fresh fixture** | 40 results, among them 05, 06, 12, 22, 33, 37, 38, 46 and 53 |
| **Still agree, on the old fixture only** | 4: 18, 25, 27 (rate ratio) and 30. Nothing can export these fixtures any more |
| **Now disagree** | 3: 07 Reachable junctions, 31 Area join, 47 QR links |
| **Still partial** | 1: 26 Deduplicate, the known divergence |
| **Not compared** | 3: 02, 23 and 50 (below) |

That is 51 result files; check 27 has two.

The three new disagreements are all in the checks, not in Fieldwork:

- **Check 07.** Since release 0.4.0, the walk from a site onto the street network (10.91 m here) is charged against
  the budget. The fixture declares this rule. The lab's reference still spends the full 375 m, so it reaches 6
  junctions that Fieldwork rightly does not.
- **Check 31.** Since release 0.3.1, the parts of one unit, such as Streatham's two polygons, are no longer flagged as
  sharing a row. The pandas reference still counts parts, not units. The lab should decide whether Fieldwork's rule
  is right before changing its reference.
- **Check 47.** Every code Fieldwork draws reads back exactly. The failure is the control: OpenCV cannot read segno's
  own code for one new address (the NYC ozone example). By the check's own logic that makes the address
  inconclusive, but the check counts it as a disagreement.

Four checks could not be compared at 0.200.0:

- **Check 02, Clip raster.** The exported output changed form: `includedValues` was a list and is now an object keyed
  by index. That is how `JSON.stringify` writes a typed array. The fixture also fails its own integrity test,
  because JavaScript orders integer-like keys numerically and Python sorts them as text. This breaks any fixture with
  an object of ten or more integer keys, and so far only this one has such an object.
- **Check 23, Apply ruleset.** The ruleset exporter imports `build/old-naledi.js`, which was removed on 2026-11-11.
  Its three fixtures cannot be made again. Check 23 also has no command-line entry point, so it runs only from its
  notebook.
- **Check 50, population models.** The rasters are on this machine, but not in the folder layout the exporter names
  (`POP_FILES`).

Four fixtures have no exporter at all: two-by-two-snow-001 (check 30), extent-soho-001 (check 25), and two that belong
to retired widgets (checks 18 and 27). Their checks still agree, but only on the old export. That says nothing about
0.200.0.

### Nothing keeps coverage current

- `validate:parity` is not in `npm run check` and no workflow runs it.
- No validator compares a parity entry's `coversRelease` with the widget's current release.
- The lab's notebook runner fails only on an error cell. A check that prints `agrees: False` passes it.

## Question 2: do the notebooks work, and are they written to one standard?

### Do they run?

| Kernel | Result |
| --- | --- |
| CPython, run for this audit | **51 of 51** ran with no error cell |
| Pyodide in the browser, CI 2026-11-22 | **43 of 51.** 8 fail: 26, 31, 33, 40, 49, 50, 51, 52 |

The browser kernel is the one a learner gets, and it is failing. CI hasn't passed since 2026-10-15, so the
published lab is six weeks old and stops at check 25. Checks 26 to 53 have never been published.

| Failure | Notebooks |
| --- | --- |
| A requested package is not in Pyodide (rapidfuzz, jellyfish), so the whole request fails, pandas with it | 26, 31, 40 |
| Imports from the lab's `scripts/` folder, which the site doesn't ship | 33 |
| Reads sibling example checkouts two folders up, which a browser can't have (`IndexError: 2`) | 49, 50, 51 |
| Needs OpenCV, which Pyodide lacks; 47 handles this and 52 doesn't | 52 |

"Ran" is not "agreed". In this run, notebook 50 read nothing (`agrees: None`) and still passed.

Experiment 41's status line says *"every notebook executes in CI and fails"*. That has not held since 2026-10-15.

### Is the format standard?

There is no notebook template. The README's rules are the only written standard, and one of them is *"The tolerance
is stated in the notebook before the comparison runs."* The notebooks fall into two styles. 01 to 30 vary, and most
end with a written reading of the result. 31 onward share one short shape: Question, Here, Parity, What this cannot
establish.

The search below found each element by its usual wording. It was spot-checked by reading 06, 22, 38, 45, 46 and 51.
Counts are of 50 notebooks, leaving out 00, the kernel check.

| Element | Present | Missing |
| --- | --- | --- |
| **Goal**, as a stated question | 50 | none |
| **Computation checked**: the widget | 50 | none, though often by working name, not the widget's title |
| **Computation checked**: the release | 7 | 43. The release is in the fixture, not in the text |
| **Independent reference**, named and why it is independent | 50 | none |
| **Expected result**, criteria stated in the notebook before the run | 39 | 11: 23, 31, 37, 38, 45, 46, 47, 48, 51, 52, 53. Their criteria are in the `.py` file only, which breaks the README's rule |
| **Known limitations** | 46 | 4: 05, 11, 15, 16 |
| **The result, in words** | 20 | 30, including every notebook from 31 to 53 |
| **Saved output** | 0 | 51. A reader sees no result until the notebook is run, and in the browser 8 can't be |

**Plain language: mostly not.** 23 of 50 notebooks average over 20 words a sentence, and the longest average 28.
The late notebooks are short, but they name methods without saying what they are ("Katz's log interval", "Pearson
scaled", "Besag and Clifford"). They also cite repository vocabulary a newcomer can't follow, such as "experiment
185" and "workflows 6 to 8". The early notebooks explain more, and are long; notebook 01 runs to 1,101 words.

## What this does not establish

- **Pyodide.** The browser results are CI's from 2026-11-22, not a local run.
- **Plain language.** Sentence length is a rough measure. Whether a notebook is plain enough is for its readers to
  say.
- **Agreement and correctness.** Agreement shows that two implementations compute the same thing. It doesn't show
  that the method suits the question. Each notebook's limits section says this.
- **Features each check never exercised.** A check that still agrees at 0.200.0 agrees on its original cases. Modes
  added since, such as new parameters or input forms, are covered only where a later check (37, 38, 40) took them on.

## Order of return

1. **Get the lab's CI green**, so checks 26 to 53 publish. Two ways in:
   - fix the eight browser failures (load packages one at a time, ship `scripts/`, give 49 to 52 a CPython-only
     path);
   - or declare those notebooks CPython-only, which the browser check honours.
2. **Bring checks 07, 31 and 47 up to the rules Fieldwork declares**: charge the walk, count units, and treat a failed
   control as inconclusive. Then rerun and record.
3. **Repair the fixture path:**
   - write typed arrays as lists;
   - make the canonical digest independent of key type;
   - remove the `old-naledi` import from the ruleset exporter;
   - restore exporters for two-by-two-snow-001 and extent-soho-001.
4. **Correct `check-coverage.json`**: Study area covered by check 41, Tabular data owing a check, Transmission chains
   partly covered by 43 and 44. Add `parity.json` entries for checks 36, 37, 38, 40, 41, 47 and 52.
5. **Make staleness visible.** Run `validate:parity` somewhere, report each entry whose `coversRelease` is behind
   the current release, and make the notebook runner fail on `agrees: False`. Report age, not fail on it.
6. **Agree a notebook outline** with the practitioner: goal, the widget and release, the reference, the criteria
   before the run, the result in words, limits. Then the practitioner writes, or guides the writing of, the plain
   language version of each notebook. This audit doesn't write that prose.
7. **The 11 widgets awaiting a check**, plus Tabular data, in whatever order the practitioner sets.

## Acted on, 2026-11-26

The practitioner agreed the order of return. Items 1 to 5 were done the same day, item 6 is drafted for review, and
item 7 is not started. Fieldwork's changes are in 0.200.0; the lab's are on its `ci-green` branch.

| Item | Done |
| --- | --- |
| 1 · Lab CI | 45 of 51 notebooks run in the browser kernel. Packages load one at a time. 49 and 51 read from GitHub when no checkout is beside them. 26, 33, 40, 47, 50 and 52 say they run in CPython only, and why, and skip their later cells. |
| 2 · Checks behind the rules | 07 recomputes the walk onto the network; 31 counts units; 47 reads with both OpenCV detectors. All three agree at 0.200.0. |
| 3 · Fixtures | Clip raster is exported as lists, with NaN read as outside. The canonical digest refuses a typed array or an integer-like key. The ruleset exporter is removed. Check 30's fixture is made again from the South London people workflow. |
| 4 · Ledger | Study area is covered by check 41. Tabular data owes a check. Apply ruleset rests on check 49. `parity.json` has entries for 36, 37, 38, 40 and 41. |
| 5 · Staleness | `validate:parity` is in `check` and `check:fast` and lists entries behind the current release. Both lab runners fail a notebook that prints `agrees: False` where its record agrees. A mutation, check 07's tolerance set to 1e-12, turned the CPython runner red. |
| 6 · Notebooks | Drafted in plain language to one outline, for the practitioner's review. Not yet on the lab's `main`. |

What the 51 recorded results now rest on, at lab commit 4eb4cb0:

| Fixture | Results |
| --- | --- |
| Fresh, exported from 0.200.0 | 46: every check except the five below |
| Older, rerun on 26 November 2026 | 3: 18 (Buffer study area), 25 (the extent rule) and 27's rate ratio (Rate ratio). Each covers a retired widget or rule, so nothing can export its fixture again |
| Not rerun | 2: 23, whose rulesets are retired and whose check has no command-line entry, and 50, whose rasters are not in the layout the exporter needs. 50's result is from 13 November 2026 |

| Measure | Before | After |
| --- | --- | --- |
| Results on a fixture from the current build | 40 agree, 3 disagree, 1 partial, 3 not compared | 44 agree, 0 disagree, 2 partial (02 and 26, as recorded) |
| Parity entries behind the widget's current release | 46 of 48 | 2 of 53. Checks 25 and 50 run on fixtures nothing can make again |
| Browser kernel | 43 of 51 run; CI red since 2026-10-15 | 45 run, 6 CPython only and say so |
| Ledger | 31 covered, 11 awaiting, 10 none, 1 blocked | 32 covered, 12 awaiting, 8 none, 1 blocked |

### Corrections to this audit

- **CPython-only notebooks.** Item 1 offered "declare those notebooks CPython-only, which the browser check honours".
  The browser check honoured nothing of the kind, and that mechanism had to be built.
- **Checks 47 and 52.** Item 4 said to add `parity.json` entries for them. They check the QR codes a write-up prints,
  which is a component, not a widget, and `parity.json` records widgets. They have no entry.
- **Apply ruleset's coverage.** It rested on checks 23 and 25. Both cover rulesets that were retired: the three that
  went with Old Naledi on 2026-11-11, and the extent rule. Of the rulesets bundled now, 7-1-7 is checked by 49 and
  compare-level-to-elevation by 42. extract-contract has no check.
- **The first rerun of check 33** failed on an import only because the scratch copy lacked the lab's `scripts/`
  folder. It agrees.
- **The excluded name.** Check 30's code, result and fixture named another product. The check was rewritten without
  it. The lab's commit messages and history still carry it; they were not rewritten.

### Dive Deeper is out of the lab

Raised by the practitioner during item 6. Dive Deeper is pedagogy, in its own repository, and was deferred until the
widgets are mature enough to teach from. Sixteen lab notebooks still ended in twenty teaching sections, linked from
widgets through `parity.json`. They were taken out, and their text stays in the lab's history at 202cc775.

- **The Inspector's Dive Deeper panel** offers only the lessons in the dive-deeper repository.
- **`validate:dive-deeper`** fails if a lab notebook or a parity entry carries a teaching section.
- **The UTM zone.** The eight widgets that take a zone had linked to the projection section, which the practitioner's
  rule of 2026-10-13 requires: a reachable explanation of the zone choice. The practitioner chose a manual page for it,
  `docs/surfaces/utm-zone.md`. Each of those widgets' learn blocks now opens it.

### Still open

- **Item 6.** The notebook prose waits for the practitioner's review.
- **Item 7.** 12 widgets owe a check, and one is blocked.
- **Checks that no longer rerun.** 23 and 25 record retired rulesets, and 50 needs its rasters laid out for the
  exporter.
- **extract-contract** has no check.
