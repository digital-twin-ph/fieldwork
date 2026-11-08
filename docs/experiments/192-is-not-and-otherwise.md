# 192 · "Is not" and "otherwise" in Apply ruleset

_Created 2026-11-08 · Updated 2026-11-08_

**Status:** tried (Fieldwork 0.63.0, 2026-11-08). Apply ruleset 0.8.0 has *is not* and *otherwise*, draws rules as
coloured blocks, and is on the standard Inspector and dialog ([186](186-one-standard-inspector.md)). The Sierra Leone
classification it was built for is not yet made, so the counts below are not yet checked inside Fieldwork.

## The question

WHO's measles classification is an ordered list: a laboratory result first, then an epidemiological link, then the
symptoms, and what is left cannot be classified. The Sierra Leone line list
([189](189-a-measles-line-list-made-safe-to-teach-with.md)) is to be classified by it.

Apply ruleset has no order among its rules, by design: *"conclusions must be mutually exclusive by construction rather
than by order"* (authored-rules.ts, after [106](106-rule-builder-ui.md)). It also has no *is not*, and no rule for what
is left. So every exclusion is spelled out as each combination of values: "not linked" is the two link columns' nine
combinations of `No`, `Unknown` and not recorded. Counted on 2026-11-08: **about 45 rules**, under the ceiling of 64,
and a manual of several hundred steps that would teach the editor's limits rather than the case definition.

The practitioner chose to add the two, 2026-11-08 (option B of three: author the 45 as they are, add these two, or
load the 45 from a file).

## The proposal

| | What it says | How it runs |
| --- | --- | --- |
| **is not** | A recorded value that is not this one: *rash is not No*. A value not recorded is not "not No": it matches *is not recorded*, never *is not* | Compiles to N3 (`log:notEqualTo`), so a ruleset using it still runs in the reasoner |
| **otherwise** | One per column: *otherwise, lab_result is none*. A row that no rule gave this column a value gets this one | Evaluated directly: N3 cannot conclude from absence, as authored-rules.ts says, so a ruleset with an otherwise is run as a ruleset that computes a value is ([188](188-rules-that-compute-and-show-their-table.md)) |

**Rules stay unordered.** *Otherwise* is not first-match: it reads only whether a column has a value, after every rule
that could give it one has run. A column whose rules read another column waits for that column's otherwise first, so
WHO's order is carried by columns read in stages (lab result, link, how the definition was met, then the class), each
of which a reader can check.

**What it will not do:**

- **Override a rule.** A row a rule gave a value keeps it. Two rules giving different values is still a conflict,
  reported; an otherwise does not settle it.
- **Apply between columns that read each other.** Refused while the rules are written.
- **Take conditions.** An otherwise is the column's default and nothing else; a condition belongs in a rule.

**The evidence says which rows took a default**, by column, so *cannot be classified* is never mistaken for a rule's
conclusion.

**On the Sierra Leone file**, with *is not* and *otherwise*: 17 rules for the classification, and 2 more for the
analysis column of whether any symptom was recorded. Counted from the design, before building.

**The standard (186):** the Inspector has the six sections and one sentence; how the records arrive, the column kinds
and units, the settings and the rules move into the configuration dialog, with the classified records as its preview
and conflicts and unmatched records under Decisions.

**Rules shown as coloured blocks.** The practitioner, 2026-11-08: *"can we color code the logic blocks like Blockly so
it's easy to visualize the rule structure?"* In the dialog and the Inspector, each part of a rule is a block of its own
kind: a condition, the *and* that joins conditions, the *or* between groups, the conclusion, and an *otherwise*. Colour
is never the only cue: each block also carries its word (*if*, *and*, *or*, *then*, *otherwise*) and its own edge, so a
rule reads in greyscale, to a screen reader and to someone who does not tell the colours apart. Text at 14 px or more,
AA contrast in the light, dark and high-contrast themes. Blockly is the inspiration for the colours, not a dependency:
its blocks are dragged, and these are filled in.

## Validation it commits to

- Unit: *is not* in the reasoner and in direct evaluation, the same answers; not recorded never matches *is not*;
  *otherwise* by column, waiting for the columns it reads, refused in a cycle and twice for one column; the
  evidence's count of defaults.
- Browser (Chromium locally, WebKit in CI): the standard Inspector and dialog; writing an *is not* and an *otherwise*;
  each block's word present and its text at AA contrast against its own fill, in light and dark.
- The rulesets example's six workflows built from an empty canvas by their manual against the new dialog.
- On the Sierra Leone file, inside Fieldwork: the counts of [189](189-a-measles-line-list-made-safe-to-teach-with.md)'s
  classification as measured by script (303, 252, 25, 14, 411, 368, 4, 1,229).

## Validation record, 2026-11-08

| Check | Result |
| --- | --- |
| EYE (the vendored reasoner) on `log:notEqualTo` | a recorded value that differs matches; one not recorded does not, as designed |
| Unit, `tests/is-not-and-otherwise.test.mjs` | 4 pass: *is not* the same in the reasoner and directly; a WHO-shaped classification in stages, every record in one class; an otherwise never settles a conflict; two otherwises for one column and a circle refused |
| Browser, `tests/is-not-and-otherwise.browser.mjs` | passes in Chromium, light and dark: the six sections, each block's word at AA against its own fill, an *is not* and an otherwise written in the dialog, the run's count of defaults |
| The rulesets example, built from an empty canvas by its regenerated manual | passes in Chromium |
| Nigeria built by its manual; the rule editor, ruleset choice and sea-level tests | pass in Chromium after their steps open Configure… |

**Found while building it:**

- **What moved out of the Inspector, and what came back.** The records' kind, columns, units and settings moved into
  the rules dialog. A published ruleset's obligation and a newer version came back to the Inspector as notices: they
  are consequences a reader should meet, not settings. The sea-level and version tests caught both.
- **The rules' own title** was the old dialog's heading; the standard heading names the widget and the step. The
  Inspector's sentence now starts with it, which the Snow rules test asked for.
- **A unit removed in the dialog cannot be applied**, so the run-time refusal for a number without a unit is reachable
  only from a saved file. Two tests now remove it there.
- **A table's rows were saved after the workflow pointed at them** ([175](175-how-large-a-table.md)), found by reading
  a CI failure. Fixed in the same release.

WebKit runs in CI.

## A case definition in the rulesets example, 0.64.0

The practitioner, 2026-11-08: *"Let's also add a case definition example in the rules set worked example."* Its seventh
workflow classifies sixteen made-up suspected cases in four stages, 13 rules and 4 otherwise, then counts the classes
with each one's share. Built from an empty canvas by its manual, in Chromium; every class matches
expected/case-classes.csv, worked independently of Fieldwork.

**Found while building it:** the stages could not be written in the dialog. A condition was offered only the records'
own columns, never a category another rule concluded, though direct evaluation read one. Now a concluded category is
offered by its name, with *is* and *is not* only. And a category reached the table spelt as its term, "Cannot_be_classified";
it reads as typed now, in the reasoner's output too.

**And comparators keyed by family** (the practitioner, 2026-11-08: *"color key the conditions … so they are also
recognizable as stable parts of rule structure"*): comparisons of numbers teal, equality slate, recorded or not rose
with a dotted edge, their words AA against their tints, checked in light and dark.

## What this does not establish

That WHO's classification is the one Sierra Leone used: its national guidelines were not read. That an otherwise is
read as a default and not as a finding: the evidence names the rows, and whether a reader notices is a practitioner
observation not yet made.
