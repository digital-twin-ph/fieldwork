# 223 · A table step shown on a small example

_Created 2026-11-19 · Updated 2026-11-19_

**Status:** tried. Built for Relate, Append rows, Select rows and Total within groups (2026-11-19).

## The question

The practitioner, 2026-11-19: *"We have table processing widgets that need an animated visual aid to demonstrate step
by step with dummy data what happens during table joins, appends, selects, etc. I think we prototyped this before."*

**What was found first.** No animated walkthrough on made-up data exists in Fieldwork, the lab, dive-deeper or the
example repositories. The nearest work:

| Where | What it is | How it differs |
| --- | --- | --- |
| [146](146-which-join-and-what-it-commits-you-to.md), 2026-10-28 | The join's key overlap and, per numeric column, the share an inner join keeps (South London: population 68.2%, deaths 61.2%, a rate 3.109 becoming 2.787 per 1,000) | On the person's own data; static; designed, not built as a panel |
| Before and After (2026-11-05) | Relate's and Select rows' preview: the table before and after, keys and brought columns marked | Built; static; the person's data, at full size |
| [184](184-heuristic-evaluation-in-the-lab.md) | Spatial steps "visually and even animated" | Not built; spatial, not tables |
| `output/visualizations/scratch-example.html` (2026-11-07, workspace) | A Scratch-blocks program with a Run button | Not about tables; the play-a-small-example idea only |

## The widgets it is for

Every widget that takes tables and gives back a table, from the registry's ports:

| Widget | What the small example must show |
| --- | --- |
| Relate a column from another table | Keys compared row by row; a key on one side only, and what happens to it; a key that matches twice |
| Append rows | The second table's rows land under the first; a column only one table has is empty, not zero, in the other's rows |
| Select rows by value | Each row checked against the rule; kept or set aside; an empty value matching neither side of the rule |
| Total within groups | Rows gather into their groups and add up; a row with no group named |
| Derive a value | The new column computed row by row, with its formula; an empty input giving an empty result |

Transmission chains and Sea-level projection extract also take and give tables, but their operation is not a table
operation a small example explains; they are left out.

## The design

| Part | What it is |
| --- | --- |
| Where | **Show me how it works** in the widget's Configure… dialog, beside the settings it explains |
| The data | Five or six rows per table, made up and named as made up, each chosen to show a case that goes wrong as well as the easy one; never the person's data |
| The settings | The ones chosen in the dialog, not yet applied: the key, the rule, the groups, the formula. A choice changed redraws the example from its first step |
| The steps | Back, Step and Play. It never starts by itself. Each step is one sentence of plain words under the tables, and the row or cell it is about is outlined |
| Motion | A row moving or fading over 0.4 s at most. Under *prefers-reduced-motion*, no motion: each step is drawn as its end state |
| Reading | At least 14 px. Kept, set aside, matched and unmatched are said in words and by shape, never by colour alone. The step sentence is announced to a screen reader |
| The end | The result table, and the counts the real step reports in the same words, so the example and the run read alike |

| Distinction | Enforced as |
| --- | --- |
| A made-up example is not the person's data | **hard stop**: the example's tables are fixed in the code, never read from a port, and headed *Made-up example* |
| The example does what the step does | **validation rule**: a unit test runs each example's tables through the widget's own computation and compares the result with the walkthrough's last step |
| The walkthrough sets nothing | **hard stop**: it reads the dialog's choices and writes none; Apply is still the only thing that changes the step |

**Order:** Relate first, because it carries 146's question of which join is being made; then Append rows, Select rows
and Total within groups; Derive a value last.

## What it does not establish

Whether a trainee who has watched the example chooses the join, rule or grouping they meant to more often than one
who has not; whether five rows are enough to show a key matching twice without confusing it with a duplicate row;
whether following the dialog's settings helps or distracts compared with a fixed example. **To observe, written before
the result:** does a trainee, after the Relate example, say in their own words what happens to a key on one side only?

## Validation

To come with the build: the per-widget unit test above, and one browser test per widget opening the walkthrough,
stepping to the end and reading the result, on Chromium and WebKit.

## Built for Relate, 2026-11-19

`src/table-walkthrough.ts` is the player every table widget will share; `src/relate-walkthrough.ts` is Relate's
example. Two tables, *Cases by district* (4 rows) and *Water supply by district* (5 rows), and seven steps: the
comparison chosen, then each of the four districts, then the district only the second table has, then the result.

**The result is the step's own.** The last step runs `relateTable` on the made-up rows with the dialog's choices. The
narration before it is computed apart, from the same comparison (`normaliseName`), and a unit test holds the two
together under all twelve combinations of comparison (folding or exact), a key matching twice (stop or one row per
match) and unmatched rows (drop, keep under a name, not decided).

**Found while building:**

- Reading the step's result through the table viewer (`tableViewOf`) pivoted it, and the last step showed four rows
  with empty suppliers where Relate had made five. The test written for the validation rule is what showed it; the
  rows are now read as Relate wrote them.
- The Configure… dialog is a native modal, so an overlay added to the page sat behind it, invisible and unclickable.
  The walkthrough is a native modal of its own, which the browser stacks above the one that opened it.
- Safari does not give a button focus when it is clicked, so focus could not return to **Show me how it works** on
  closing; the button is now passed in.

**A limit found:** what to do with unmatched rows is chosen under Decisions, which the dialog shows only once both
tables are connected and have run. Before that, the example can only say that the step would stop and ask.

**Validation:** `tests/relate-walkthrough.test.mjs` (3: the twelve combinations against `relateTable`; each case said;
every step headed *Made-up example*, numbered and marked in words) and `tests/relate-walkthrough.browser.mjs` (1: from
Configure…, stepped to the end, Back, the dialog's own choice followed, focus returned, nothing applied), Chromium and
WebKit.

## Built for Append rows, Select rows and Total within groups, 2026-11-19

`src/table-walkthroughs.ts`, on the same player. **Derive a value is not among them:** it was retired into Apply ruleset
on 2026-11-07 (experiment 188). The registry still lists it with a table in and a table out, which is how it reached
the list above; the list is corrected here, not rewritten.

| Widget | The made-up example | Follows from the dialog |
| --- | --- | --- |
| Append rows | *Cases, week 1* (district, cases; 2 rows) and *Cases, week 2* (district, sex, cases; 2 rows) | Whether rows say which table they came from, the column's name and the labels |
| Select rows | *Cases by district*, 5 rows, one with no region and one with no week | The way of choosing: values to keep (North and East), values to leave out (North), or a range (weeks 2 to 4) |
| Total within groups | *Cases by district*, 5 rows in two regions, one case count empty | The summary (all six) and whether empty cells are left out |

Each shows what is easy to get wrong: a column one table lacks is empty, not zero, and Alpha appears twice after
stacking; an empty region is set aside by keeping values but kept by leaving one out, as the step does; a group with an
empty cell has an unknown total unless empty cells are left out, and a count of rows counts the empty one.

**Found while building:** the Configure… dialog puts focus on the first control in its settings, which became **Show
me how it works**; the first setting is still where focus starts, and the button is marked to be passed over
(`data-show-me`). Found by Relate's existing dialog test.

**Validation:** `tests/table-walkthroughs.test.mjs` (3: Append with and without a source column, Select under all three
ways, Total within groups under all six summaries with and without empty cells left out, each against the step's own
function) and `tests/table-walkthroughs.browser.mjs` (3), with the existing Relate, Select and grouping dialog tests:
26 passed on Chromium and WebKit.
