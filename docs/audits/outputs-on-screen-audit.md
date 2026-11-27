# Audit — maps, charts and tables on screen, and the design proposed for them

_Created 2026-11-26 · Updated 2026-11-26_

Asked by the practitioner on 2026-11-26, after the palette, Inspector and canvas had been drawn: *"What about the
outputs - Maps, Charts and Tables? I still think the appearance and components can be improved to enhance user
understanding and use."* Then, of the proposal that came back: *"Write this as its own audit of itself."* So this
record audits the outputs as built and the proposal, and then the proposal and the method that produced it.

**How it was done.** Read from the code at commit `4f2c008a` (0.168.0), then drawn on a private Design canvas as three
artboards: the Results panel as built, the proposal, and a table linking each change to its source. Nothing was run.
No app was opened and no browser test was run. None of the seven checks in [Kinds of validation](validation.md) was
applied, and no practitioner has seen the proposal.

**Beside the [target outputs audit](target-outputs-audit.md)** (2026-11-19). That audit read three drafts printed to
A4. This one reads the screen. Three findings overlap, marked below; whether those print findings have been fixed
since 2026-11-19 was not checked.

## As built

The Results panel sits under the canvas. It holds a heading with the run summary, one tab per output, a metrics line,
and the map, table or chart panel.

| # | Output | Finding | Source |
| --- | --- | --- | --- |
| O1 | All | One output at a time, in a panel 943 × 335 px at a 1,440 px window (380 px tall above 1,600 px). The map's legend and the table's pager are below its fold. | `styles.css`, `.results-panel` |
| O2 | All | Records left out are reported differently by each output: buttons under the map (`#map-missing-records`), a pager count in a table. Some steps also count them in their own notes. | `app.ts`, `table-output.ts` |
| O3 | All | Downloads are separate buttons per output. The chart's sits beside the note "The figure is drawn from the result, so it is the same file whichever renderer is on screen." | `index.html` |
| O4 | Map | Drawn in an 850 × 295 viewBox, almost three times wider than tall, whatever the shape of the area. | `index.html`, `#map` |
| O5 | Map | The legend under the map is four fixed slots, relabelled for each output kind. Its defaults are Review, No flag, Unknown and Cooling center, which is the heat demo's vocabulary. Overlaps print finding A7. | `app.ts:4254–4260` |
| O6 | Chart | An axis with no title given falls back to "Category". Overlaps the print audit's "Value" axis. | `chart-vega.ts` |
| O7 | Chart | The chart says nothing about the records it leaves out. | `chart-vega.ts` |
| O8 | Table | Two renderers. Point tables sort, show 100 rows a page and 12 attributes at a time, with Layer, Record ID, Name and both coordinates first. Data tables show 40 rows and do not sort. | `table-output.ts`, `data-table-ui.ts` |
| O9 | Table | Every table's filter placeholder reads "Name, evidence, or service…". | `index.html`, `#result-search` |
| O10 | Table | A point table shows "—" for both a missing field and an empty one; only the `data-absent` attribute tells them apart. Data tables show "—" and "unknown". | `table-output.ts:60`, `data-table-ui.ts` |
| O11 | Table | Column roles exist in the code (`ColumnRoles`, `frame-attribute`), but little of them reaches the reader. Overlaps the print audit's "units in heads". | `data-table-ui.ts` |

Already sound, and kept by the proposal: the chart palette is Okabe–Ito with roles, so a colour means the same thing
on every figure (`presentation.ts`). Cross-tabs right-align numbers in tabular figures. The map draws a scale bar
from its own frame. Maps can already carry a title, subtitle, key, source and attribution (`map-communication.ts`).

## The proposal

One figure frame for all three outputs, opened at full work-area size from the Results tab:

- **Top:** the title (what, where, when) and one line on what a reader should see in it.
- **Middle:** the figure. The map is shaped to its area. The chart takes its axis titles from the columns and names
  what it leaves out. There is one table design, with sort and filter everywhere, the key column first, a role and
  unit over each header, and absent values written as "not recorded" or "blank".
- **Foot:** source, licence, and the version and run date.
- **Side column:** *What was counted* (records read, shown, left out and why), a key built from the layers drawn with
  a count and show/hide box for each, one Download menu, and the write-up section.

## The proposal audited against itself

The project's [five directions](../experiments/105-five-directions.md), pointed at the proposal.

| Direction | Finding |
| --- | --- |
| **Backward** | It failed once and passes now. The first draft drew a north arrow, which `map-conformance.ts` rules out on a north-up map; the arrow is withdrawn. It keeps A7's rule: what the map does not draw goes in *What was counted*, not in the key. |
| **Sideways** | Most of it is reuse, not new parts: the map's title, key, source and attribution; the layer list; the scale bar; `ColumnRoles`; the counts Cases by period 0.8.0 and Rate 0.5.0 keep of what they leave out; the write-up section select. What is new is where these sit, and that one frame holds them. |
| **Above** | The frame has the same shape as the standard Inspector of [experiment 186](../experiments/186-one-standard-inspector.md): fixed sections, the same order on every step. Here that is a frame on every output. |
| **Below** | What it alone adds is *What was counted*: every record read is accounted for beside the figure, including those the figure cannot show. Nothing else in the proposal is needed for that. |
| **Forward** | Derived from the four above: the counts are the part to try first, because they are new and the rest is rearrangement. They are also what the observation below tests. |

## The method audited

The canvas was built by reading code and drawing what it said. On 2026-11-26 that went wrong five times. Each was
caught by reading one more file, and none by looking at the app.

| Drawn | What was true | Found by |
| --- | --- | --- |
| The palette 360 px wide, widgets in an order of my choosing | 205 px; order is the order the code defines them in | `styles.css` `.studio`; `TYPES`' order in `core.ts` |
| Port names printed beside each dot on the canvas | Hidden until hover (`opacity:0`) | `build/canvas.css` `.handle-name` |
| The Inspector without Duplicate and Remove node | Both at the foot of every Inspector | `app.ts` `#duplicate-node`, found while drawing the canvas |
| A north arrow on the proposed map | `map-conformance.ts` holds that a north-up map needs none | Searching for "scale bar" |
| The canvas 240 px down the window | About 270 px, estimated from the CSS and still not measured | Adding up the bars' heights |

So a drawing from code is a claim about the code, and has to be checked like one. Each artboard now says what it was
drawn from and which parts are illustrative.

## Observation that could come out badly

Written before anyone has seen the proposal:

1. Shown the proposed map, can someone say how many records are not on it without being told where to look?
2. Does a reader take "not recorded" and "blank" as different things, or as two ways of saying the same thing?
3. Is the side column read, or passed over as chrome?

## What this does not establish

- That anything here is drawn as the app draws it at run time: it was read from code, at one window width (1,440 px),
  with illustrative geometry, values and names.
- Whether any finding gets in a practitioner's way, or whether the proposal helps anyone read a result.
- Whether the print audit's A7, A13 and table fixes have landed since 2026-11-19.
- Any of the seven validation checks. The canvas is private, and outside the repository.
