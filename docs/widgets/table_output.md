# Table

_Created 2026-10-27 · Updated 2026-10-27_

## What it does

Shows what you connect to it, as a table in its own Results tab.

It takes four different things, and it works out which it is showing from what you wire:

- a **keyed table** from any step that produces one — Relate a column, Total within groups, a rate,
  a two-by-two, an imported table;
- **point data**, with coordinates and attributes;
- **catchment polygons** and their summaries;
- **reasoning results**, with their decisions.

## What you connect

Every port is on the node from the moment you add it. There is nothing to choose first.

Connect a step's output to the matching port and the table shows it. If you wire more than one,
the more specific wins: a keyed table before polygons, polygons before decisions, and the point
path is the general one.

## How to use it

1. Add it, or use **Quick Look** on a step and open its table from there.
2. Drag from the step's output to the port that matches what it produces.
3. Name the Results tab.

Nothing is required. A table with nothing connected is **unfinished**, not broken, and says so.

## What it will not do

- **It will not ask you what shape your data is.** There is no mode to set, and connecting
  something never removes a connection you already made. **Map** works the same way.
- **It will not chart the table.** Charting one means choosing which key varies and whether to
  aggregate, which is a decision rather than a port. Use **Chart**.
- **It will not total anything.** It shows the rows it is given. Use **Total within groups**.

## Where it is used

The South London example, five times: the mortality rate table, both water-company tables and both
contingency tables.

## How it was checked

Unit tests over the port list, the renderer the connections imply, and the fallback to a stored
mode for a workflow saved before the mode was removed. One pins the defect directly: a freshly
added table offers a `table` port with no mode set.

What no test establishes is whether the four renderers should be one widget at all. The split is
inherited and is recorded as open in
[experiment 21](../experiments/21-shared-result-outputs.md).
