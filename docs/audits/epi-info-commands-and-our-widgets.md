# Epi Info's commands, against the widgets we actually have

_Created 2026-11-01 · Updated 2026-11-01_

**Status:** an audit, not a disposition. Nothing is renamed, built or retired by this document.
Every mapping below was read from `epi-info-ai/COMMAND_SET.md` and from this repository's own
source on 2026-10-31; where something is inferred rather than read, it says so.

## Why this exists

Three table operations were found to be Epi Info commands in a single day, each by needing one:

- `derive_value` is **DEFINE** and **ASSIGN** — named by the practitioner on 2026-10-31.
- `group_table` is **SUMMARIZE** restricted to `SUM` — found while trying to bound Dulwich, and
  its own comment had named the wrong command, `MEANS`, until the source was read.
- `relate_table` is **RELATE** — which that file already knew: its first line says so.

At three it stops being a coincidence. **This application arrived independently at a subset of the
Epi Info Data and Statistics commands and named it inconsistently**: one widget carries the
command in its documentation, one carried the wrong one, one mentions it nowhere. A practitioner
who knows Epi Info has to rediscover each one by reading the implementation.

The practitioner, 2026-10-31: *"since the epi commands are only exercised in the South London
example, we can consider renaming what it is in Epi Info and creating/adapting the complementary
command set equivalents in FW."* This audit is the measurement that proposal needs. It is
deliberately not the proposal.

## What the command set holds

`COMMAND_SET.md` lists **48 command rows** across seven legacy groups: Data 7, Variables 6,
Select/If 5, Statistics 8, Advanced Statistics 7, Output 7, User Interaction 4, plus Options.
Its own status column reads 23 `BV`, 11 `Gap`, 7 `Candidate`.

**That is a catalogue of another application's surface, not a specification of ours.** It is used
here as a map — a place to look when a workflow needs something this application lacks — and the
rule that decides what gets built is unchanged: D10 and the usage ledger admit a widget because a
worked example needs it.

## The mapping, measured

### Commands this application answers

| Epi Info | Fieldwork | How faithful |
| --- | --- | --- |
| `RELATE` | `relate_table` | brings a KEY column across on a matched key. Epi Info relates tables; this brings one column. Narrower. |
| `SUMMARIZE` | `group_table` | `stratifyBy`→`by`, and from 2026-10-31 `SUM`, `MIN`, `MAX` of eleven aggregates. Narrower, deliberately — see `AGGREGATES`. |
| `DEFINE` + `ASSIGN` | `derive_value` | defines one new value of a key column and assigns `left op right` over four operators. No constant operand, no condition. |
| `SELECT` | `select_rows` | keeps rows whose key column takes named values. |
| `TABLES` | `two_by_two` | the four cells and the estimates. Epi Info's TABLES also runs tests; those are not built. |
| `FREQ` | `chart_output` over a table | counts by category, drawn. Not a frequency table with percentages and cumulative columns. |
| `READ` | `table_input` | reads a long-format table. |
| `LIST` | `table_output` | shows records. |
| `GRAPH` | `chart_output` | bars only. |
| `MAP` | `map_output` | listed as `Gap` in Epi Info AI's own column; this application's strongest area. |

### Commands with no equivalent here, that a workflow has already wanted

| Epi Info | What it would do | How it was found |
| --- | --- | --- |
| **`MERGE`** | combine two tables sharing a key so their measures sit in one column | the Dulwich bound needs Table XII's deaths beside Table VIII's populations, and `RELATE` carries categories, not values. Found 2026-10-31 by the by-hand test failing. |
| **`MEANS`** | a report of a measure by a cross-tab | named by `group_table`'s old comment as the command it was not |
| `RECODE` | band a value into categories | `apply_ruleset` does this semantically, by authored rules. Whether that IS RECODE under another name is **not established** and is the obvious next thing this audit would check. |
| `IF` | a conditional | the conditional half of ASSIGN. Rules express per-subject conditions; nothing expresses a conditional assignment into a table. |
| `SORT` | order rows | `chart_output` gained a bar order on 2026-10-31; the table has none. |

### Commands out of scope, and why it is worth saying

`REGRESS`, `LOGISTIC`, `KMSURVIVAL`, `COXPH` and the three complex-sample variants have no
implementation here and none is proposed. The Output group — `ROUTEOUT`, `PRINTOUT`, `REPORT` —
is answered differently in kind: this application has a write-up assembled from machined and
authored notes, which is not a print stream. `DIALOG`, `BEEP`, `HELP` and `QUIT` belong to a
programming environment this is not.

## What the naming actually costs, measured

The practitioner's premise checks out, with two exceptions. Instantiations across every shipped
example and frozen fixture, 2026-10-31:

| widget | South London | elsewhere |
| --- | --- | --- |
| `derive_value` | 2 | — |
| `select_rows` | 2 | — |
| `relate_table` | 1 | — |
| `group_table` | 1 | — |
| `two_by_two` | 1 | — |
| `rate_ratio` | 1 | — |
| `rate` | 3 | not checked |
| `case_series` | — | **Hagelloch, John Snow** |
| `table_input` | 6 | **eleven workflows in all** |

So the set that is South-London-only is **six**, not the whole table group.

**And renaming is established machinery, not a cliff.** `RENAMED_NODE_TYPES` in `src/types.ts`
already maps six old types to new — `samples→point_grid`, `observations→point_input`,
`area→study_area`, `nearest→measure_distance`, `summarize_polygons→summarize_points_to_polygon`,
`hex_aggregate→aggregate_points_to_h3_cell` — and `validate:widgets` refuses a registry that
declares a rename the application does not perform, so a saved workflow migrates on open. This
audit corrects a claim made earlier the same day, that renaming would rewrite every saved
workflow holding the type. It would not; that is what the map is for.

## What this audit does not establish

- **That sharing a name is safe.** A name is a stronger claim than a label, and this project
  already separates "what Epi Info AI prints" from "what Epi Info prints" in
  `epiInfoLabelSource` precisely because the two are different claims. Nothing here is validated
  against either application. A widget called `SUMMARIZE` will be read by somebody as behaving
  like Epi Info's, and whatever is renamed has to say, where a practitioner meets it, that the
  name is borrowed and the behaviour is not certified.
- **That the mappings above are faithful.** Each row was read from one source file and this
  application's implementation. None was run side by side against Epi Info or Epi Info AI, and
  the "how faithful" column is an argument rather than a measurement.
- **Whether `apply_ruleset` is RECODE.** The likeliest duplication in the table above, and
  unchecked. If it is, the honest move is one command with two surfaces rather than two names.
- **That a split vocabulary is coherent.** This is a GIS studio as well as an epidemiological
  one, and `buffer_area`, `isochrone` and `study_area` have no Epi Info equivalent. Adopting Epi
  Info names for the epi half produces a deliberately two-vocabulary palette. That may be right —
  each half named in the words of the practitioners who use it — but it is a decision somebody
  has to make, not a consequence of this audit.
- **That the command set should be completed.** It is a map of another application's surface.
  Building toward it as a target would invert the rule that a widget is admitted because a worked
  example needs it, and the budget already stands at 55 against a reference of 41.

## What a sweep of this would look for next

Whether `apply_ruleset` is RECODE; whether `rate` appears outside South London; and whether the
five commands in the "already wanted" table above are wanted by anything other than the one
example that found them.
