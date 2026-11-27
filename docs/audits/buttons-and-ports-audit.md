# Audit — buttons and ports

_Created 2026-11-27 · Updated 2026-11-27_

Comprehensibility items 2 and 4 in TODO, next in the practitioner's UI order of 2026-11-26 after the commentary
sweep. Item 2: *one style per role (primary action, secondary, link-like, label), one place for a step's primary
action. Measure: buttons whose style does not match their role.* Item 4: *choose one model [of input ports], or two
with a stated rule, and draw only the ports a step can use. Measure: ports drawn and ports connected, per widget, in
the worked examples.* Read from the code at 0.203.0 (branch `sweep-second-pass`, from `c7b25d6a`). Nothing was
changed for this audit.

**Decided by the practitioner, 2026-11-27:** the four button roles, applied to every button in one release; and
ports by model A, the connected ports and one free port of each kind, each named on the node in words.

## Buttons

**How it was counted.** Every `<button>` written in `index.html`, `src/*.ts` and `src/*.tsx`, with its class and its
label as written. A label built at run time is counted once, as written. Buttons drawn by a library (React Flow's
zoom controls, Leaflet's) are not counted.

| Class | Buttons |
| --- | --- |
| `button small` | 176 |
| `button` | 124 |
| `button primary` | 82 |
| `text-button` | 24 |
| `chip` (and `chip notes-open`, `chip lab-only`, `chip flowlink`) | 19 |
| `icon-button` | 10 |
| `button danger`, `button small danger` | 9 |
| one-offs: `manual-button`, `learn-link`, `config-close`, `grow`, `manual-copy`, `identity-button`, `column-sort`, `storage-pill`, `pub-write`, `library-toggle`, `app-version` | 17 |
| no class | 23 |

**Findings.**

1. **Twenty labels are drawn in more than one style.** *Close* in four (`button`, `button grow`, `button primary`,
   `button small`); *Remove* in three (`button small`, `chip`, `text-button`); *Manual* in three (`chip`, `tab`,
   `text-button`); *Next* in three; *Apply*, *Configure…*, *Edit*, *Find*, *Data quality*, *Previous*, *Start
   again*, *Stop*, *Copy*, *Open*, *Notes audit*, *Clear draft*, *Download GeoTIFF*, *Open my identity*, *Use zone…*
   and the close mark *×* in two each.
2. **Primary marks things that do not commit.** Among the 33 labels styled `primary` are *Close*, *Next*, *Step*,
   *Open*, *Done* and *Keep them open*, beside the ones that do commit: *Apply*, *Save*, *Run workflow*, *Create
   project*. A primary button reads as "this is what the surface is for"; on *Close* it says the dialog is for
   closing.
3. **Size stands in for role.** `button` and `button small` are the same role in different places: 176 small and 124
   regular, with the same label small in one dialog and regular in the next (*Data quality*, *Find*, *Previous*).
4. **Four ways to look like a link.** `text-button`, `learn-link`, `manual-button` and `chip` all lead somewhere
   rather than act. *Manual* alone is a chip, a tab and a text button.
5. **The step's primary action is in one place on the standard Inspector**, *Configure…* under Settings, and is
   `button primary` there, except on Street network (`src/network-input-ui.ts`), where it is a plain `button`.

**Measure, today:** 20 labels in more than one style; 6 labels styled primary that do not commit.

**The rule, adopted 2026-11-27.** Four roles, one style each, size set by where a button sits
(toolbars and bars small, dialogs regular) and never by role:

| Role | Style | For |
| --- | --- | --- |
| Primary | `button primary` | The one action a surface or dialog is for, which commits: Apply, Save, Run, Create. At most one per surface. |
| Secondary | `button` | Every other action: Close, Next, Previous, Data quality, Find. |
| Destructive | `button danger` | Removes or discards: Delete workflow, Remove node, Start again where it discards. |
| Link | `text-button` | Leads somewhere and changes nothing: Manual, Evidence, Version. |

Chips stay for labels and filters, not actions; a chip that acts (the note card's *Open*, TODO's first instance)
becomes a link or a button.

## Input ports

**How it was counted.** Each worked example's workflow as it ships (`EXAMPLE_TEMPLATES`, the eleven keys other than
`blank`), each node's input ports as `nodeInputs` gives them, and the edges arriving at each. These are the ports
the step declares; the canvas draws the same list, except that grouped ports (`PORT_GROUPS`) are drawn as one choice.

| | Ports drawn | Connected |
| --- | --- | --- |
| All eleven workflows | 260 | 95 (37%) |
| Map, 14 nodes | 117 | 35 |
| Table, 14 nodes | 56 | 14 |
| Point data, 16 nodes | 32 | 0 |
| Chart, 9 nodes | 18 | 9 |
| Every other widget together | 37 | 37 |

**Findings.**

1. **Ports a step does not use are most of what is drawn.** Map draws about eight per node and uses two or three;
   Table four, using one; Point data two optional ports, connected in none of the sixteen.
2. **Four port models** (fixed, inferred from the wiring, switched by a setting, counted), as TODO records. Map's
   point layers are counted (`pointInputCount`), its others fixed.
3. **A port is unnamed until hovered on most widgets.** Nine of the 53 live widgets draw a named row per input
   (`spatialPorts` in `src/canvas.tsx`, with `PORT_NAMES` and `PORT_GROUPS` in `src/port-names.ts`: Map, Table, Chart,
   Raster input, Clip raster, Sample a raster, Join a table to the study area, Geometry buffer, Travel time over
   ground). On the other 44 a port is
   an 11 px dot whose name (`.handle-name`) is at opacity 0 until hovered, and is the port's id (`records`,
   `candidates`), not its name in words. The Inspector's Inputs section names every port in words, and is the way in
   for anyone who cannot hit an 11 px dot.
4. **Every widget outside the four output and source widgets uses every port it draws** in these examples: 37 of 37.
   The clutter is in Map, Table, Point data and Chart.

**Measure, today:** 260 ports drawn, 95 connected, in the eleven worked examples.

**The two models put to the practitioner; A was chosen, 2026-11-27:**

- **A. Draw what is connected, and one free port of each kind.** Map shows its two or three layers and one open
  point, polygon and raster port; a new connection opens the next. One model for every widget with optional or
  counted ports; the others are unchanged, since they use every port.
- **B. Keep every port, and name each one on the node in words**, as the nine widgets with named rows do, so nothing is
  learned by hovering. More honest about what a step can take, and taller nodes.

Either way the port's name on the canvas becomes its name in words, the one the Inspector already shows.

## What this does not establish

That any of these get in a practitioner's way: they are read from the code and counted, not observed. Labels built
at run time may differ from the label written. The port counts are the shipped worked examples, not workflows people
have built.
