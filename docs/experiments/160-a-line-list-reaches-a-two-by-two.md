# 160 · A line list reaches a two-by-two, at 43 nodes

_Created 2026-11-02 · Updated 2026-11-02_

**Status:** tried — the Oswego church supper runs from an empty canvas on the published CSV. Whether
a practitioner would build it by hand is not observed, and the node count suggests not.

## The task

Build a second outbreak example, not hand-crafted for South London. Oswego, 1940, is a person-level
line list: 75 people, 21 columns, a Y or N under each of 14 foods. South London never tested this
shape, because its tables already hold counts.

## What happened

| Step | What the app did | Result |
| --- | --- | --- |
| Import | Reading one value column as wide is refused with a suggestion to read it as long | Long shape, `ID`, `Ill` and the foods as keys, `Age` as the value |
| Import | Every column starts ticked as a key, including `Date of onset`, blank for 29 people | Blank columns unticked by hand |
| Count | **Nothing could count.** Values must be numbers and `group_table` only summed or took an extreme | **Count rows added**, `group_table` 0.2.0 |
| Map | The mapping dialog is disabled until the step before it has run, and does not say why | The Inspector's fields work unrun; dialog left as it is |
| Run | Told plainly that an output is needed | A Table output per food |
| `?` | One person's `?` for two foods stays out of both groups and is named above the table | No change needed |

## The result

Every risk below was compared with counts computed from the CSV in the test, not copied from a paper.

| Food | Ate: ill / all | Did not eat: ill / all |
| --- | --- | --- |
| Baked ham | 29/46 | 17/29 |
| Spinach | 26/43 | 20/32 |
| Mashed potato | 23/37 | 23/37 |
| Cabbage salad | 18/28 | 28/47 |
| Jello | 16/23 | 30/52 |
| Rolls | 21/37 | 25/38 |
| Brown bread | 18/27 | 28/48 |
| Milk | 2/4 | 44/71 |
| Coffee | 19/31 | 27/44 |
| Water | 13/24 | 33/51 |
| Cakes | 27/40 | 19/35 |
| **Ice cream (vanilla)** | **43/54** | **3/21** |
| Ice cream (chocolate) | 25/47 | 20/27 |
| Fruit salad | 4/6 | 42/69 |

Vanilla ice cream gives a ratio of row proportions of 5.57 (1.94 to 16.03, Katz log). No design is
declared, so the app names it by its arithmetic.

## Why Count rows, and what it cannot do

A count never reads the value, so the argument that keeps averages out does not reach it: how many
rows agree means the same thing over counts, rates and ages. The alternative was a column of 1s in a
published line list, which edits the source to suit the tool.

**It counts rows, not people.** Two value columns give two rows per person, and the step cannot
detect that. The manual and the Inspector say to import one. This is a limitation, not a check.

`Age` is ballast. A line list must name a numeric column it does not use, because a table here has
one value per row. Nothing in this example reads it.

## The finding: 43 nodes for one question

One table, then count, two-by-two and output for each food. **43 nodes**, 42 wires, and about 16
actions per food, so over 200 by hand. A study area, the church point and a map bring the project to
46 nodes and 44 wires. It ran in about 0.2 seconds; building it took the test 48.

The investigator's product is **one** table: foods down the side, attack rates across. That table does
not exist here. It is spread over 14 result tabs, so the comparison that identifies the vehicle is
left to the reader. South London's rule is that a worked example can be rebuilt by hand. This one can,
and few would.

## The place

Oswego is still a place, so the project carries a locator map: a 2 km box and one point at 174 Miner
Road. No source read names the church. The point rests on Gross's caption and the single church on the
1943 USGS map, so it is **inferred**, and the example's README gives the chain. The map shows a setting;
nothing is computed from it.

## What this does not establish

- That a practitioner can follow this build. A test drove it.
- That Count rows belongs in `group_table`, whose palette line still says it adds up.
- Anything about the epidemic curve or incubation periods. Times are text here and were not tried.
- That the vanilla ratio is causal, or a cohort estimate. No design is declared.
- That the app's estimates agree with a classic analysis package. Nothing here checks it.

## Validation

`tests/oswego-from-scratch.browser.mjs` and the `COUNT READS NO VALUE` unit test; runs are recorded
in the commit that lands this. Rule fired: none. The gap was in implementation, and only a second
example could find it.

_Updated 2026-11-02: the finding led to [161](161-the-epi-kernel-one-table-many-exposures.md). Oswego is now two
workflows of 3 nodes each. The 46-node project stands in the example's history at its first pinned commit._
