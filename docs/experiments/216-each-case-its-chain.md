# 216 · Each case its chain: handing the transmission chain on

_Created 2026-11-15 · Updated 2026-11-15_

**Status:** tried — option B, a new step, chosen by the practitioner on 2026-11-14 and built; admission review below, written before the code. Not yet in a worked example.

## The question

MERS's epidemic curve coloured by transmission chain (the practitioner approved MERS's visualisations on 2026-11-14:
*"Yes but after that let's work on our TODO"*). The curve exists: Case series splits a curve by a column (experiment
210), and Chart stacks it. What is missing is the column. Which chain a case belongs to is worked out today inside
Chart's transmission tree (experiment 200, step 5), and Chart is an output: it hands nothing on. So no step can split a
curve, colour a map or total a table by chain.

## What exists (inventory, by input and output)

| Widget | In | Out | Could it carry the chain? |
| --- | --- | --- | --- |
| Chart, tree figure | table | nothing (an output) | computes chain, generation and offspring per case, then only draws them |
| Apply ruleset | table | table | adds a value per record from declared rules; a rule can already read the **previous** row (`AuthoredOrder`), not a row named by a column |
| Total within groups | table | table | counts offspring per infector (MERS's offspring distribution, 0.116.0); cannot follow a chain |
| Relate a column | two tables | table | brings a value from another row matched on a key, one step only; a chain needs every step to its start |

## Options

**A. Apply ruleset follows a link (recommended).** A rule operand that follows a column naming another row (in MERS's
probable links, `from` to `id`) until it ends, and reads a value there: *chain = the id at the end of `from`*;
*generation = the number of steps taken*. Declared, like every rule; general beyond epidemiology (an area inside a
district inside a province; a referral to the facility that received it). Evaluated over the table directly where N3
cannot follow a path. Rows whose link names a case the table does not hold, or that loop, get no value and are
counted, as the tree counts them.

**B. A new step, Transmission chains**: table in, the table with `chain`, `generation` and `offspring` columns out;
Chart's tree reads the same computation. Clear to name and find; one more widget, which needs its admission review
(D1–D9) and an example of its own.

**C. Chart hands on a table.** An output becoming a computation breaks the rule that outputs compute nothing.
Not proposed.

## What either gives MERS

The curve by chain (Case series split by `chain`, stacked), the map coloured by chain, and a table of chains by size
and generations, from the example's 98 probable links between its 162 cases.

## Chosen: B, Transmission chains

The practitioner, 2026-11-14, offered A (Apply ruleset follows a link, recommended) and B: *"New step: Transmission
chains"*.

**Measured on MERS before building** (the example's own relate step, 162 cases, by the computation the tree already
uses): 67 chains. One of 94 cases from SK_1 over 4 generations, one of 3 from SK_76, and 65 cases with no source
recorded, each a chain of one; 95 links; 27 cases undated. So a curve coloured by chain is one colour for nearly every
linked case and 65 more for single cases. Coloured by **generation** it shows the waves inside SK_1's chain. The step
hands on both, and the size of each case's chain, so either can be drawn and single cases told apart.

### Admission review

| | |
| --- | --- |
| **D1** | Decomposes into: follow `from` to the first case (a path, not a join); count steps; count children; group by first case. The path is the residual distinction: no existing widget follows a link more than one step. **Primitive**, on the palette: a practitioner asks for chains by name. |
| **D2** | Relate (one step, not a path); Total within groups (counts offspring, cannot follow a chain); Apply ruleset (per record, or the previous row); Chart's tree (the same computation, in an output that hands nothing on). None performs it. The tree's computation is the general one; Chart's tree and this step share it, one implementation. |
| **D3** | A table has rows, not a graph: **hard stop** by port type (table in, table out). The id and infected-by columns must be named: **validation rule** at run, as the tree's. A source the table does not hold, a loop, several sources: **run-time check**, each counted in the step's sentence and receipt, never dropped. A recorded link is not a proven infection: **limitation**, stated in the step's note. |
| **D4** | Port type only for kind; column choice at run request; an unconfigured step stays a valid draft. |
| **D5** | The column meanings (id, infected-by, the written value meaning none) live on the step's settings, as on the tree's. |
| **D6** | MERS: the cases with their sources (Relate) → Transmission chains → Case series split by generation or chain → Chart; and → Map coloured by chain. |
| **D7** | *Transmission chains*; port `records` in, `table` out; columns `chain` (the first case's id), `generation` (0 for the first case), `offspring`, `chain_size`. |
| **D8** | Unit tests on the distinctions: a loop, a source not in the table, several sources, a written "none", a case in two rows; and MERS's 67/94/3/65 measured. |
| **D9** | One step where none could do it before. |
| **D10** | MERS. |

## What this does not establish

That the recorded link is who infected whom: the example's source records *probable* links. A chain here is the
record's chain, and the curve says so.
