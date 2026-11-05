# Table

_Created 2026-10-27 · Updated 2026-11-05_

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

### It states its own shape in the write-up

Every run machines a note into **Results** on the Notes tab stating what this table is made of. It names the columns as the table spells them, says how many rows, reports empty cells as unknown rather than zero, and names the source file and digest where the table came in as a file. Only in the table mode: the point, polygon and decision views are not published tables.

Column names are shown as they are, in `code`, rather than bent into a sentence. A generator cannot tell whether `measure` or `group` is a noun, so it states them and leaves the prose to you.

**The caption is yours.** A caption states the subject, the population, the place and the period
in your words, and none of that can be read off a table. What this writes is what the table
declares about itself — the material you write the caption from, sitting beside it in the same
section.

**And it carries no number.** A figure's number depends on where it sits in the write-up and on
the venue you are preparing — set one figure aside and the ones after it move up — so the number
is worked out when the document is rendered. Nothing here says "Figure 1".

Edit it and it forks into a note of your own, like any machined note; the machined one goes on
being rewritten by every run.

### Where it goes in the write-up

**In the write-up, under**, just below **Results tab name** in the Inspector, chooses the part of the Notes write-up this output's figure and its note go in:
Introduction, Methods, Results or Discussion. **Results** is the default. A map of the study area belongs in the
Introduction; a figure that shows how the analysis was done can go in Methods. References is not offered, because it
holds works and not figures. The run's receipt states the section and whether you chose it, and a validation rule
checks that the note describing the figure is filed in that same section.

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
