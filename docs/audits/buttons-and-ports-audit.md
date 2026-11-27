# Audit — buttons and ports

_Created 2026-11-27 · Updated 2026-11-27_

Comprehensibility items 2 and 4 in TODO, next in the practitioner's UI order of 2026-11-26 after the commentary
sweep. Item 2: *one style per role (primary action, secondary, link-like, label), one place for a step's primary
action. Measure: buttons whose style does not match their role.* Item 4: *choose one model [of input ports], or two
with a stated rule, and draw only the ports a step can use. Measure: ports drawn and ports connected, per widget, in
the worked examples.* Read from the code at 0.203.0 (branch `sweep-second-pass`, from `c7b25d6a`). Nothing was
changed for this audit.

**Decided by the practitioner, 2026-11-27:** the four button roles, applied to every button in one release; and
ports by the practitioner's model, below (it replaces model A, chosen earlier the same day on the first, wrong
counts).

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
`blank`), three ways, because they differ (corrected 2026-11-27 from pull request 9's review, which counted the
drawn handles in Chromium; the first count here took the declared ports for the drawn ones):
- **declared:** the ports the step's contract lists, as `nodeInputs` gives them;
- **drawn:** the input handles the canvas renders, counted in Chromium on each example's canvas (`.react-flow__handle.target`);
- **connected:** the ports an edge arrives at.

| | Declared | Drawn | Connected | Drawn, not connected |
| --- | --- | --- | --- | --- |
| All eleven workflows, 89 nodes | 260 | 164 | 95 | 69 |
| Map, 14 nodes | 117 | 49 | 35 | 14 |
| Point data, 16 nodes | 32 | 32 | 0 | 32 |
| Table, 14 nodes | 56 | 28 | 14 | 14 |
| Chart, 9 nodes | 18 | 18 | 9 | 9 |
| Every other widget together, 36 nodes | 37 | 37 | 37 | 0 |

**Findings.**

1. **Map and Table already draw close to what is connected.** Each draws its connected layers and one free port to
   add the next (14 free on 14 Maps, 14 on 14 Tables). Of the 117 ports Map's contract declares, 49 are drawn.
2. **Point data and Chart draw ports that are not used.** Point data's two optional ports, a table and an area, are
   drawn on all 16 nodes and connected on none: 32 of the 69 drawn and unused. Chart draws both its ports and uses one.
3. **Four port models** (fixed, inferred from the wiring, switched by a setting, counted), as TODO records. Map's
   point layers are counted (`pointInputCount`), its others fixed.
4. **A port is unnamed until hovered on most widgets.** Nine of the 53 live widgets draw a named row per input
   (`spatialPorts` in `src/canvas.tsx`, with `PORT_NAMES` and `PORT_GROUPS` in `src/port-names.ts`: Map, Table, Chart,
   Raster input, Clip raster, Sample a raster, Join a table to the study area, Geometry buffer, Travel time over
   ground). On the other 44 a port is
   an 11 px dot whose name (`.handle-name`) is at opacity 0 until hovered, and is the port's id (`records`,
   `candidates`), not its name in words. The Inspector's Inputs section names every port in words, and is the way in
   for anyone who cannot hit an 11 px dot.
**Measure, today:** 164 input handles drawn and 95 connected in the eleven worked examples, so 69 drawn and unused;
260 declared.

**The two models put to the practitioner; A was chosen, 2026-11-27:**

- **A. Draw what is connected, and one free port of each kind.** Map and Table nearly do this already; Point data and
  Chart would draw their optional ports only as one free port, or behind the Inspector's Inputs list. One model for
  every widget with optional or counted ports; the others are unchanged, since they use every port they draw.
- **B. Keep every port, and name each one on the node in words**, as the nine widgets with named rows do, so nothing is
  learned by hovering. More honest about what a step can take, and taller nodes.

Either way the port's name on the canvas becomes its name in words, the one the Inspector already shows.

**The practitioner's model, 2026-11-27, after the corrected counts:** *"I want nodes to not present too many ports
that confuses users which port to connect to. Nodes should automatically detect the shape of the incoming input on
an unconnected input port and once connected should display in words what came in. Then it adds a blank port to
accommodate another input if it's configured to receive more."*

What it means for the code, read at 0.203.0:

- **One blank port, any kind.** A node with an input still free draws one open port, which takes any kind the step
  can use. Map and Table already have it (the `layer` handle, bound by `layerPortFor` in `src/app.ts` from what the
  source emits, `outputOf`). It becomes the model for every widget with inputs.
- **Once connected, the row says what came in**, in words: what kind it is and where it came from (a points layer
  from *Health facilities*), not the port's id.
- **A further blank port appears only while the step can take more:** a declared port still free, or a counted one
  that can grow (`pointInputCount` and the like). A node whose inputs are all connected draws none.
- **Where two free ports take the same kind for different roles**, the shape alone cannot choose: Measure distance
  (from, to), Travel time over ground (start from, places), Relate tables, Compare point sets, sea-level site
  assignment. Proposed: fill them in the order the step declares, name the role on the row, and let the Inspector's
  Inputs list swap them. Ports of one kind with one role (Append rows, Deduplicate points, a border's two areas) fill
  in order with nothing to choose.
- **Unchanged underneath:** the declared ports stay what saved workflows, receipts and port contracts are written
  in, as Map's eight already do; and the Inspector's Inputs list stays the way in by keyboard.

## What this does not establish

That any of these get in a practitioner's way: they are read from the code and counted, not observed. Labels built
at run time may differ from the label written. The port counts are the shipped worked examples, not workflows people
have built; the drawn count is Chromium's, at the size the canvas opens.
