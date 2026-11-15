# Transmission chains

_Created 2026-11-14 · Updated 2026-11-14_

**Each case its chain.** It takes a table of cases, each naming its recorded source, follows the sources back to the
case each chain starts with, and hands on every row with four more columns.

## What it does

| Column | What it holds |
| --- | --- |
| `chain` | the id of the case the chain starts with |
| `generation` | 0 for that case, 1 for the cases it is the source of, and so on |
| `offspring` | how many cases name this one as their source |
| `chain_size` | how many cases are in its chain |

MERS, 2015: the 162 cases with their recorded sources make 67 chains. One starts with SK_1 and holds 94 cases over 4
generations; one starts with SK_76 and holds 3; 65 cases have no source recorded and are chains of one. Split an
epidemic curve by `generation` and it shows the waves inside SK_1's chain; total by `chain` and it lists the chains by
size.

## What you connect

A table on **Cases, each with its recorded source**: one row per case, or several rows for a case with several
recorded sources. The step after it can be anything that reads a table: **Case series** split by `generation` or
`chain`, **Total within groups**, **Relate a column**, a **Table** or a **Chart**.

## How to use it

- **Each case is named in**: the case id column.
- **Its recorded source is in**: the column naming each case's source, by the same ids.
- **Written for "no source recorded"**: a value such as `none recorded`, where the table writes one. An empty cell
  always means no source.
- **Order each case's children by**: a date, optional; it only orders the cases under each source.

The preview shows what the last run's table makes with these settings.

## What it will not do

- **It will not drop a case.** A case naming no source, naming a source the table does not hold, or caught in a loop
  of sources starts a chain of its own, and the step's sentence counts each. A row with no case id is handed on
  without a chain, and counted.
- **It will not choose between sources.** A case recording more than one source is placed under the first, and the
  sentence says how many did.
- **It will not overwrite a column.** A table already holding a column named `chain`, `generation`, `offspring` or
  `chain_size` is refused; rename it upstream.
- **It does not establish who infected whom.** It follows the links the record holds. A recorded link is not a proven
  infection, and the step's note in Methods says so.

Chart's **Who infected whom** tree is drawn by the same computation, so the tree and these columns agree.
