# Fieldwork release notes

The application version follows the policy in [AGENTS.md](AGENTS.md). A version
shown in a local build is not a claim that it has been published.

## 0.12.0 — In development

_A note on the number: `package.json` read 0.11.0 while the newest section below was 0.10.0, so
0.11.0 shipped without a section and some of the work recorded under 0.10.0 belongs to it. The
earlier sections are left as written rather than reshuffled — the dated record is the point — and
this section covers the work of 2026-10-25 and 26._

- **An Epidemiology group, and a rate ratio with an interval.** Rate with a denominator and Cases
  by period already existed, in a generic Summaries group beside twenty-one spatial operations,
  and an epidemiologist looking at the framework reported seeing no epi widget at all. **Rate
  ratio** divides one group's rate by another's: Snow's water companies give 8.40 with a 95%
  interval of 6.84 to 10.32 per house, and 5.35 (3.35 to 8.53) per person from the declared
  supply groups. Which group goes on top is yours to choose and is shown as a sentence before the
  run, because a ratio and its reciprocal are the same finding and not the same sentence. A group
  with no events is refused rather than given an undefined interval; a count below five is
  reported with a warning naming it. The interval assumes the events are independent, which a
  transmitted disease is not — so it is narrower than the data warrants, and the result says so.

- **A table of values can be put onto the parts of a study area.** **Join a table to the study
  area** matches each row to the boundary part it names, so a table of rates becomes a map of
  rates rather than a map of where people live. Names are compared for equality and never for
  resemblance: ignoring punctuation joins "St. George, Camberwell" to "St. George  Camberwell"
  and still refuses an abbreviation. A part no row names is drawn empty in a neutral shade,
  never in the lowest class.

- **Two-key tables are drawn as a grid.** A table keyed by two columns — supply by outcome,
  district by measure — is shown with categories across the top and down the left rather than as
  a list of triples, with totals as a fourth column and row where the cells are commensurable.
  A table that states its unit is saying its values count the same thing; one that does not gets
  no totals rather than a wrong one.

- **A result can state its finding in words**, beside the rows it was computed from.

- **The catalog counts the widgets you actually run**, in this browser. A use is a widget
  connected and run in a workflow — a shipped example nobody runs is not one, and neither is a
  node left on a canvas. Nothing is sent anywhere, and the count is this browser's alone: a
  second browser keeps its own.

### Retired

- **Heat alert**, into the rule application. It was a declaration wearing a node type — two
  parameters, no inputs, and a port type whose only consumer had itself been retired. The
  condition is now declared on the step that applies the ruleset, beside that ruleset's
  threshold. **A saved workflow holding one still runs.**

- **Sea-level projection extract**, into Apply ruleset with a new `extract-contract` ruleset.
  None of its five operations was about sea level: four were assertions about a table and one
  derived a column's distinct values. The key columns, units, vocabulary, baseline and the three
  obligatory AR6 citations are declared data now, the citations as DOIs a reader can resolve.
  **A workflow saved before this refuses to open rather than running differently** — a retired
  widget never runs — and the Manila example produces identical numbers through the new path.

### Validation limits

- `rate_ratio` carries an independent check against statsmodels (lab check 27), which found on
  its first run that the 95% quantile had been the textbook 1.9600 rather than 1.959963984540054.
  `join_table_to_area` has no independent check yet.
- The contingency table in South London is prepared outside the application: nothing here joins
  one table to another on a shared column, nor computes a column from other columns.
- A table output can state only its label. A map states a title, a subtitle and a source note; a
  table cannot, so a table that leaves the application carries no source.

## 0.10.0 — In development

- **Epidemiology is a group in the palette.** Rate with a denominator and Cases by period were
  already here, sitting in a generic Summaries group beside twenty-one spatial operations, and an
  epidemiologist looking at the framework reported seeing no epi widget at all. The capability was
  there and the identity was not, which for someone opening this is the same thing. They stay
  standard widgets: a rate with a declared denominator is not an epidemiological quantity, it is
  an ordinary one epidemiology leans on, and where you look for a thing is a different question
  from whose vocabulary it belongs to.

- **A rate ratio, with an interval and the counts behind it.** Two rates side by side are not a
  comparison until something divides them, and a reader comparing them by eye is doing arithmetic
  without an interval. Snow's own figures: houses supplied by Southwark and Vauxhall against
  houses supplied by Lambeth is a rate ratio of 8.40, 95% interval 6.84 to 10.32; the same
  argument with people as the denominator, from the declared water supply of each sub-district, is
  5.35 (3.35 to 8.53), with the intermingled sub-districts sitting between the two at 2.31. They
  differ because the second assigns a whole sub-district to one supply and averages away the
  intermingling within streets. Neither is the right one, which is why the denominator is named on
  every result.

  **A group with no events is refused**, rather than given an undefined interval: Dulwich recorded
  no cholera deaths in those seven weeks, and the usual repair of adding half an event to every
  cell is a choice somebody made and not a fact about Dulwich. **A count below five is reported
  with a warning naming it** — Putney's single death buys an interval spanning more than
  twentyfold, which is not wrong, just carrying almost no information.

  **The ratio is dimensionless.** The rate's multiplier cancels, so changing it to per 100,000
  moves neither the ratio nor its bounds, and there is nowhere on the result to write a unit.

  Which group goes on top is yours to choose and is shown as a sentence before the run, with a
  swap, because a ratio and its reciprocal are the same finding and not the same sentence. The
  groups are offered from the connected table rather than typed. The interval method is stated
  rather than offered: a dropdown holding one option is not a choice.

- **A table of values can be put onto the parts of a study area, and the map shades them.** Join a
  table to the study area matches each row to the boundary part it names and hands on polygons that
  carry the value, so Snow's Table VIII of deaths and population becomes a map of mortality rather
  than a map of where people lived. Names are compared for equality and never for resemblance: the
  match can ignore punctuation and spacing, which is what joins "St. George, Camberwell" to
  "St. George Camberwell", but it will not match an abbreviation to a full name and says so instead
  of guessing. A part no row names is drawn and left empty in a neutral shade, never in the lowest
  class, because an unmatched boundary drawn pale reads as a finding of low incidence. Two parts
  sharing a name both take the value — true of a rate, and not true of a count. Streatham is two
  polygons, so south London draws 33 parts for 32 sub-districts.

- **A shaded figure carries its class breaks and says how it was classed.** The breaks are values
  that occur in the data, so a reader can find the sub-district sitting on one, and the key states
  that quantile classes show rank rather than magnitude. A shade without its breaks says only
  "more" and "less".

- **A figure's key names the marks the figure actually carries.** Every figure this renderer drew
  carried a fixed line — "Squares: sites · dots: observations · polygons: modeled catchments" —
  including figures with no site, no observation and no modeled catchment on them. A key is the
  part of a figure a reader trusts without checking, so one that describes absent marks is worse
  than none. Polygons shaded by a joined value are now called measured rather than modeled.

- **Two study areas can be combined into one study area.** Combined area takes areas as well as
  polygons and yields whichever kind it was given, so two adjacent provinces become one area that
  the street network, the facility sources, the clip and the buffer all accept. Before, its only
  output was a polygons result, which nothing that wants an area will take — the widget that does
  exactly this was one port type away from being usable for it. No new widget: the existing one
  recognises areas. Combining areas keeps each published outline as a part rather than dissolving
  the shared border, because two authorities describe that border differently and welding them
  would assert a line neither drew.

- **Street network says which published extracts cover your study area, and links to them.**
  Finding the right `.osm.pbf` was an errand outside the application; it is now a line in the panel,
  matched geographically and smallest first — Soho is offered Greater London before England, and an
  area straddling a border is told that no single country covers it rather than offered the
  neighbour. The catalogue is Geofabrik's own index taken at build time and dated, because that
  host serves neither its index nor its files with a CORS header. That is also why the download is
  your browser's own: nothing passes through fieldwork, and the file lands on your computer, where
  every province after the first can use it.

- **A street network read from an extract is clipped to the study area, not to its bounding box.**
  A box is a convenience owed to services that only accept one; it is not what anybody drew, and on
  a province-shaped area the difference is a network of two countries — Ituri's box reaches into
  Uganda. The engine indexes the outline by latitude band, so a province's nodes are each tested
  against the handful of edges crossing their own band rather than against 7,759 of them: the box
  still rejects most of a country in two comparisons and the outline decides the rest. The same
  extract gives 122,061 junctions for Ituri's box and 41,425 for a wedge inside it, at comparable
  time.

- **Reading an extract no longer freezes the page.** A province is twenty to thirty seconds of
  synchronous WebAssembly; on the main thread that is twenty to thirty seconds in which the page
  answers nothing, and Chrome offers to kill it. It runs in a worker now, with the extract
  transferred rather than copied in and the graph transferred back out, so neither crossing
  duplicates the bytes and the status line keeps reporting throughout.
- **"signal is aborted without reason" is gone.** A download whose attempt ran past its three-minute
  budget rejected with the browser's own words, which reached a practitioner as a toast while a
  province was downloading. The budget belongs to this client, so the sentence does now: it names
  the 180 seconds, says nothing was changed, and points at the extract path, which asks no service
  at all. The three time budgets are declared caps like the rest.
- **Every cap is declared, queryable, and sorted by whether it is reasonable.** Six magnitude
  limits refused a practitioner's work in sequence over two days, each discovered only after the
  cost of the previous had been paid, because nothing could list them: blockers and directions have
  had a ledger and a validator since October, and caps had a prose inventory. `widgets/caps.json`
  now declares all twenty — value, unit, what it refuses, where the number came from, and the test
  that would replace it with a measurement — `npm run check` fails on any magnitude constant that
  is not in it, and each one is an `fw:Cap` individual in the ontology, so a street-network receipt
  now asserts `fw:governedBy` for the caps that bound the run with `fw:capValueInForce` for what a
  knob was actually set to.
  **And they are sorted by kind.** An *artefact* cap bounds something this application makes — a
  292-pixel drawing, a batch size — and is reasonable by construction. A *platform* cap reports a
  limit the environment imposes. A *discovery* cap bounds what a practitioner can find out, and
  decides in advance the answer to a question this project exists to ask. Only the last kind is
  ratcheted, and only where the number was chosen rather than measured: that count stands at **2**
  — the graph-limit ceiling and the edge-length check — and may fall and never rise.

- **A street network can be read from an extract you already have.** Street network gains a third
  input method: choose a published `.osm.pbf` — a Geofabrik country file, say — and it is read where
  it sits, clipped to the study area as it is decoded, with only the resulting network kept. The
  file is never copied into either browser store, and because most countries publish no
  province-level extract, the same file serves every province and every workflow after the first.
  Nothing is downloaded twice and no service is asked. The work is done by Graphways' Rust core
  compiled to WebAssembly and shipped in this build (`vendor/street-engine.wasm`, MIT, see
  `vendor/street-engine-NOTICE.txt`); OpenStreetMap data stays © OpenStreetMap contributors under
  ODbL 1.0, and the attribution travels in the network's own source line. Measured 2026-10-22: a
  province's driving network, 122,061 junctions, from a 416 MB extract; and the engine is precached,
  so a network can be built with no connection at all.

- **A province-sized network no longer overflows the call stack.** `Math.min(...coordinates)`
  passes every junction as an argument, so at 1,837,939 of them a 300 MB download ended in
  "Maximum call stack size exceeded" while computing how much of the study area it covered. The
  bounds are folded in a loop, and the same spread is gone from the catchment figure, the column
  histogram and the hull's widest pair.

- **A project exports as one document.** Export and Encrypted ZIP are workflow-scoped, so four
  workflows about one province travelled as four unrelated files with nothing recording that they
  belonged together. **Export project**, in the projects list, writes the investigation and every
  workflow in it as one file — each workflow exactly as its own Export would produce it, bundles
  included, nothing re-encoded. Opening it through **Import** recreates the project with a key of
  its own for every workflow, so importing twice makes two projects rather than overwriting the
  first, and every workflow is written before any is opened. The export says how many datasets are
  kept on this device by reference and therefore not in the file.

- **A refused edit says so in the failure tone.** The rollback toast used the same green as
  "saved on this device", so *"Invalid or oversized network provenance"* arrived looking like
  success.
- **Network provenance is checked for being a record, not for its length.** The 100,000-character
  cap was the last of the size refusals that fire after a response has been downloaded and parsed;
  the record carries the study area's outline, so a province failed it.
- **A download the workflow refuses takes its payload back out of the store.** The bytes are
  written before the workflow is asked to accept them, so every late refusal left a payload nothing
  referred to — a device was measured holding **416.2 MB** beside a Street network widget reading
  "0 nodes · 0 directed edges". New ones are rolled back, and the projects list reports the ones
  already there with a control that removes them.

- **The Inspector has one shape, and the way in is the first thing on it.** Every panel now opens
  with the widget's name, one line of what it does, and a block holding **Manual** and **Dive
  deeper** at the size of a control — they were a 10-pixel text link and a collapsed summary,
  placed after whatever alerts a run had raised, so their position moved with the state of the
  workflow and their size said they were an afterthought.
- **Commentary is leaving the Inspector, and a ratchet keeps it out.** It is a control surface, not
  a record: measured at 11,838 characters on 2026-10-20, it had reached 22,855 by 2026-10-21. The
  Street network panel is cut by two thirds and the longest paragraphs elsewhere with it;
  `npm run check` now measures what the panels emit against a ceiling in
  `widgets/inspector-prose.json` that may fall and may never rise, and refuses a measurement left
  sitting far below its ceiling so a trim is recorded rather than banked. What a paragraph was
  explaining belongs in `docs/widgets/<node_type>.md`, which the panel now links to properly.

- **The header says how full this browser's store is.** Everything a workflow holds sits in a
  store this device accepts 5.2 MB of, and nothing said how much was left — so the first news of
  the ceiling was work that would not save. The figure is in the header, turns amber at three
  quarters and red at nine tenths, and says what to do about it.
- **Both stores are reported, not just the one that refuses a save.** A node's records are kept by
  digest in IndexedDB, which this browser offers by the gigabyte, so a figure covering only the
  5.2 MB workspace store can read comfortably beside hundreds of megabytes of street network. The
  header carries the data store beside the workspace one when it holds anything, and the list shows
  them as two sections — what the payloads come to, which store they are actually in, and the
  browser's own estimate of the site, labelled as the browser's and not as this application's count
  (measured on 2026-10-21, Chromium's estimate does not include the workspace store at all).
- **One list of what is on this device.** Clicking the storage figure opens every project and
  workflow held in this browser, each with what it costs, and **Open**, **Export** and **Delete**
  on every row — so a workflow can be exported or removed without being opened first, and a project
  can be deleted from the same place. A worked example appears only once it has been opened, since
  the list is what is here rather than what is published.
- **The download is refused from the service's own count, with the setting it would need.** The
  widget asked Overpass how many *ways* an area holds, and a street download returns the ways plus
  every node they reference — most of the bytes. So a ways count sat inside every limit for an area
  whose response was over 60 MB, and the only way to find the right graph limit was to download the
  cap's worth and throw it away, twice. The count now asks for what would actually be sent, and the
  refusal reads: this area holds N ways and M elements, about X MB at the measured 150 bytes each,
  set the graph limit to Y junctions or draw a smaller area — with no download made and none of the
  service's work spent. It also says that a rate measured on two small extents is not a measurement
  of a large one.
- **A street network is no longer refused for its size.** The ceiling came from the graph knob,
  and the number behind it was measured on *isochrone construction* in central London — applied to
  every network in every workflow, whether or not an isochrone exists in it, and applied after the
  response had been downloaded, parsed and normalized, where a refusal protects nothing and
  discards everything. A province downloaded on 2026-10-21 was thrown away at 1,837,939 junctions
  and 3,755,832 directed segments for that reason. What bounds a download is the byte cap, set
  before the bytes are spent; what bounds an isochrone is the isochrone's own worker, boot check
  and timeout, whose message now says the limit is that step's and that the graph is intact; what
  bounds a saved graph is the store, which reports its own refusal. The 30,000-vertex cap on edge
  geometry went with it. The Inspector picture samples at 20,000 segments and the caption says so,
  because a 292-pixel figure is a limit on a drawing, not on a dataset.
- **An acquired province defaults to driving.** The travel mode defaulted to walking everywhere,
  which is right for a neighbourhood and wrong for an ADM1 unit: nobody walks across a province,
  and footways, paths and steps are most of what makes its download too large. The level is read
  from the acquired boundary's own identifier, so a drawn box has no level and stays on walking —
  a box can be any size, and its extent is not evidence of intent. An explicit choice is never
  overridden, and the panel says why the default is what it is.
- **A refusal says what the other travel mode would cost.** At the scale of a province the mode
  decides whether there is a download at all — footways, paths and steps are most of what a walking
  network holds — and the choice was being made blind. When an area is refused, one more count
  answers whether the other mode fits at the current setting, and the message says which to switch
  to, or that neither fits.
- **The graph limit can be raised, so a province can be attempted.** Its ceiling was the default
  itself — 50,000 junctions — so the download byte cap derived from it, 30.0 MB, could never be
  raised by anyone, and a province download stopped there. 600 bytes per junction is roughly double
  the 270 measured on two real extents, so the cap was a projection enforced as a boundary. The
  ceiling is now one million junctions and the default is unchanged; above the largest graph this
  project has downloaded and drawn (27,181 junctions, 7.4 MB) the widget says what is not known —
  the tab may stop responding, and a failed download saves nothing — rather than refusing. See
  experiment 125.
- **A street-network download that is cut at the limit no longer states a size nobody read.** A
  response that declares its length is refused with that length and the junction setting that would
  accept it; a response that streams past the cap is stopped, and the refusal says the size was
  never read rather than reporting the cap as the measurement. The bytes received are charged
  against the pause before the next request, because the service sent them whether or not they were
  kept.

- **A template fills the canvas you are on, when that canvas is empty.** The ask was *"can I
  import the North Kivu workflow into this blank one?"* and the answer minted a third workflow
  named after the source, leaving the blank one untouched beside it. It now fills the open canvas
  in place and keeps the name you gave it for its own question, and mints a new workflow only when
  the canvas already holds work. Undo puts the empty canvas back.
- **A template is a workflow.** Clearing material by removing the parameter left a street network
  without its `data.nodes` and a drawn study area without the `geometry` key the validator
  requires, and the result was never validated — so a template saved and then could not be opened,
  which also meant it could not be deleted. Material now clears to the empty value of the same
  shape (`null` for an outline, `{nodes:[],edges:[]}` for a graph, empty rows for a table), a
  retrieved collection is removed together with the record of where it came from, and the template
  is validated before it is saved: a template that cannot be made says so instead of becoming a
  row that does nothing. A setting that happens to share a name with material is also kept —
  `boundary` is a provenance record on a study area and the `include` / `exclude` setting on
  Summarize points to polygon, and clearing it by name emptied the setting.
- **A workflow that will not open can still be deleted.** Choosing such a row did nothing at all;
  it now says what is wrong with it and offers **Delete it** on the spot, and deleting works on any
  row rather than only on the canvas that is loaded.
- **Reset example is in the bar only where there is a published example to reset to.** On a
  workflow a practitioner made there is nothing to reload it to, so the button was a control for a
  thing that does not exist, beside the ones that do apply.
- **A workflow can be deleted.** A project could be deleted and a workflow could not, so the only
  way to lose one was to delete the investigation around it — which keeps every workflow and
  removes only the grouping. **Delete workflow** removes it and its project registration, opens the
  next workflow of the same project, and is refused for a worked example, which ships with the
  application and has *Reset example* instead.
- **Rows that were never workflows are gone.** Registering a key in a project and saving the
  workflow are two writes, and the second can be refused by a full store; the first stood anyway,
  so the switcher listed rows labelled with their raw key — `test-project/w7` — that could not be
  opened and could not be removed. Those rows are cleared on arrival with a notice saying what they
  were, choosing one now says there is nothing to open rather than silently leaving the canvas
  where it was, and a refused save no longer leaves the registration behind. A new key is also
  minted from what is taken rather than from a count, which had reused the key of a deleted
  workflow and overwritten its neighbour.

- **A refused save says why it was refused.** Applying a study area into a device whose store is
  full reported only *"Study area could not be saved. Retry Apply."* — advice that cannot work,
  because the next Apply fails identically. Reported 2026-10-21 on an Ituri outline applied beside
  North Kivu's. The refusal now names the cause: the store's own wording when the store is full
  (what to export, and that every worked example opened is kept beside this one), or the name the
  device reported for anything else. The outline stays in the editor either way, so the work is not
  lost with the refusal.

- **A result table no longer supplies a value for a missing one.** Cells with nothing in them read
  *"Not supplied"* — a phrase a reader cannot tell from a source that contains those words, which
  sorted and matched the row filter as if it were data, and which said the same thing about a field
  a record **does not have** as about a field it has and left **empty**. The cell is now empty and
  marked as absent, the two kinds are kept apart, and how many are absent is a property of the
  column, reported where a column is reported. The receipt was silent about an absent field while
  the table showed a confident phrase for it; it now asserts `fw:fieldAbsent` for a field the
  record does not have and `fw:missingValue` for one it has and left empty, **for every column of
  every record**.
- **An output table gets the data-quality check an input gets.** The same dialog — the column
  profiles, the mismatches, and the *Shapes and gaps* view with its missingness and its co-absence
  between columns — opens over a result table, which is the last point before a figure or a count
  leaves the application, and is where OSM's many absent fields are actually read. It opens as a
  **report**: a result is not repaired, you repair the input it came from, so there is nothing to
  press.
- **A workflow can be taken as a template.** *"Can the workflow be imported as a template to be
  filled up?"* — with North Kivu built and Ituri to build. Exporting and re-importing carries the
  material **and the identity**: a 16,547-vertex boundary, 961 retrieved records, 48 decisions, and
  the storage key of the workflow it came from, which the import would then overwrite. **From a
  template…** beside *Add workflow* copies the shape of the investigation instead — which widgets,
  how they are wired, and every decision about *how* to work — into a workflow of its own. The
  **sources are kept**: ask OpenStreetMap, Overture and HDX again, at the same radius, with the
  same clip and the same deduplication thresholds. What a run happened to acquire is cleared: the
  geometry, the records, the street graph, the raster, and the judgements made about those
  records. It says how much it cleared and in how many widgets, because a template that silently
  emptied something is worse than one that says so. **One thing it does not do:** an acquired study
  area keeps no half of its provenance record. The level is a source and the unit is material, but
  the record is one thing, and writing it with the unit fields emptied would be a record of a
  retrieval that did not happen — so the study area is chosen again.
- **A new primitive: Deduplicate point records.** Two sources over one study area draw the same
  hospital twice, and a count of facilities is then wrong by however many of those there are.
  This compares records **across** sources and merges the pairs that agree. It asks two questions
  of each pair — do the names agree, and are they in the same place — and each agreement is worth
  one point. **Two merges on its own; one asks you.** A pair in the review band stays two records
  until somebody answers with a reason, and that reason is pinned to the records as they were, so
  editing either one lapses the judgement rather than letting a stale answer ride on changed data.
  The method is the one in the practitioner's own `EPIAI RECORDLINK`: blocking first, so pairs
  beyond a declared distance are never compared; binary contributions, so a similarity of 0.87
  against a threshold of 0.88 contributes nothing rather than 0.87; and a missing value that never
  agrees with another missing value. Every threshold is a knob, and the receipt carries all of
  them plus each candidate's score, distance and name similarity — so a figure reporting a
  deduplicated count can say what produced it. **The thresholds that ship are proposals, not
  measurements:** what they should be is a property of your sources, and the first run on real
  data is what answers it.
- **Results is a tab, beside Workflow and N3.** *"It would be easier to see the whole workflow or
  the whole Result panel than to see half of each."* One view is on screen at a time, so the canvas
  gets the work area it had been sharing — 767 pixels where the split gave it 432, at a
  1,100-pixel viewport — and the results panel gets the same when you select it. Three controls
  went with the split, because they existed to manage a compromise a tab removes: the **Expand**
  button that decided which half won, the **divider** between the panels, and the remembered
  results **height**. The two *Full screen* buttons became one, which applies to whichever tab is
  showing and follows you if you switch while in it. A finished run does not move you; the count on
  the Results tab says there is something to look at.
- **The map takes the panel.** It had a fixed 320-pixel band inside a 335-pixel panel — numbers
  chosen when the results were the lower half of a split. It is 438 pixels now, and 771 in full
  screen.
- **A run no longer stops on one unreadable coordinate.** A source whose coordinate column would
  not parse produced `[NaN, NaN]`; the point-in-polygon test answers *false* for anything it cannot
  place, so the record was called **Outside**, carried to the map, and handed to Leaflet, which
  refused it and took the whole run with it — *"Workflow stopped: Invalid LatLng object: (NaN,
  NaN)"*. *Outside* is a finding about a place; a coordinate that is not a number is a finding
  about the data. Such a record is now counted apart, listed as unplaceable, and the run finishes.
- **Three stale map controls removed.** The checkboxes under the map set `display:none` on the
  static plot's marks, so over an interactive map — which has Leaflet's own layer control — they
  did nothing; they are shown only for the plot now. The amber notice named a colour the map
  stopped using when hue was given to the source layer, and repeated counts that sit above the map;
  what remains is the part they do not carry, that a record with no usable location is listed
  rather than plotted.
- **Check spatial coverage is retired.** It asked where each point stood in relation to the study
  area and passed every one of them on, labelled. *Keep points inside the area* asks the same
  question and acts on the answer, and a map draws inside and outside without being asked — so two
  widgets had grown into the question this one existed to answer. A saved workflow migrates on
  open: the node becomes a clip, an edge into a map's or table's *coverage* port becomes an
  ordinary points edge, and the rewrite is stamped so the change is visible rather than silent. A
  check that held **more than one point layer** cannot become one clip, so the loader refuses and
  names the node instead of quietly dropping a layer. **What goes with it:** the ability to exclude
  a single record by judgement with a written reason, pinned to a signature of the record's content
  so that editing the record lapsed the exclusion. Nothing replaces that; exclusions in saved files
  are carried in the migration stamp, inert, and the gap is recorded in the TODO.
- **Point symbols carry a dark outline.** Over a terrain basemap, whose colours run through the
  same values as the categorical palette, a hollow mark was nearly invisible. The outline is a
  neutral rather than a seventh hue, and a checkbox on the Map turns it off for a pale ground or a
  printed figure.
- **The example ledger read a copy of the example list.** `scripts/widget-evidence.mjs` held a
  hand-written map of nine examples while the application offers twelve, and counted one John Snow
  example four times under four keys. So the ledger reported that `coverage_check` had no worked
  example while the Spatial coverage exercise was built around it, and inflated `voronoi`,
  `clip_polygons`, `reproject` and `summarize_points_to_polygon`. There is now one list,
  `src/example-templates.ts`, which the application and the ledger both read.
- **A new primitive: Keep points inside the area.** A health-facility search over North Kivu
  returned 961 places, of which **526 stood in Uganda and Rwanda** — every source is bounded by a
  rectangle, and a rectangle is not a jurisdiction. The membership test existed in five modules
  and was *reported* by two widgets, but no widget answered "keep the ones inside this area", so
  the decision could only be made privately inside whichever widget needed it. `clip_points_to_area`
  takes an area and a point layer and passes on the points inside, with a receipt naming the OGC
  predicate, whether boundary points were kept, and the counts inside, on the boundary and
  outside. A point exactly on the outline is kept by default, and the opposite choice — strict
  `sfWithin` — is a tick box, because the two give different counts on the data where it matters.
  The facility sources clip to the outline too, and say how many they set aside.
- **Every widget that can be labelled is labelled the same way.** Find health facilities had no
  label control at all; three different shapes existed elsewhere. One form, one **Apply label**
  button, one handler.
- **A street network download asks what it would cost before asking for it.** A study area across
  the DRC–Uganda border — some 600 km — spent three instances, two attempts each, and ended on
  `HTTP 504`: the service saying it gave up computing the answer. Overpass will answer `out count;`
  instead, with the number of ways a query would return, so the widget now asks that first and
  refuses an area beyond what it normalizes **with the number**, after one cheap request instead of
  six expensive failures. A count the service itself declines to compute is read the same way —
  that is what a public instance says when an area is beyond it. This is not the span cap that was
  removed on purpose: that refused an area for its width before anything was measured, and this is
  a measurement the service makes.
- **A layer is named for where its points came from.** With a *Keep points inside the area* step
  between a search and the map, two searches of two different registries both announced themselves
  as **"Points inside the area"** — the clip's label — and the map's receipt attributed every record
  to the clip rather than to the registry. A layer's identity was being re-derived from what was
  plugged in, while the identity the data carries travelled correctly and was ignored. The data's
  wins now; what is connected is the fallback for points that carry none. The mark also changes
  from the *first* layer instead of once the six hues are exhausted, so two sources differ in both
  channels and not just in colour.
- **What the fill channel means is carried by the map, not compiled into it.** The renderer read
  `relation`, `status` and `excluded` and decided filled, hollow or grey itself, which fixed that
  channel to one variable for ever. The map now resolves its own rows and hands the renderer an
  encoding that says which variable the channel carries and what each class means; the renderer
  draws classes. The legend reads the same encoding and lists **only the values the map drew**, so
  a map where nothing was clipped no longer offers a key for points a clip set aside.
- **A point layer is drawn as itself.** Two Find health facilities widgets wired to one map — one
  reading OSM, the other Overture Places — drew in the same colour, and the layer control had
  nothing to list, so there was no way to see which points came from which source. Hue now carries
  **which layer** and the fill carries **where the point stands**: filled inside the study area,
  hollow outside, grey where there is no usable location. Each layer also gets a **mark** — circle,
  square, triangle, star, cross or X, named as OGC Symbology Encoding names them — which can be
  chosen per layer in the Map widget's settings, because colour alone is not an encoding everybody
  can read. The marks are drawn on the map and repeated in the legend, which now lists one entry
  per layer instead of three spatial relations in three hues. The ordered bands of a catchment use
  a **ColorBrewer** sequential ramp rather than the categorical palette, since minutes are ordered
  and categories are not. The map receipt records the encoding itself: which channel carries which
  variable, the palette and the authority it comes from, and each layer's mark and colour with
  whether it was chosen or derived.
- **Full screen fills the screen.** Both full-screen controls — the one on the results panel and
  the one in the map's own toolbar — sized the container and left the map at its authored height,
  so the map sat in a band at the top of an otherwise empty screen in both Safari and Chrome. The
  map now takes the room: measured at a 1,100-pixel viewport, 520 pixels of map before and 691
  after, with the rest being the panel's own heading, tabs, figure title, toolbar and source note.
  The map toolbar's button also says *Exit full screen* while full screen is on, uses the WebKit
  names where those are the only ones, and says so rather than appearing to work where neither
  exists.
- **A map's layer control lists only layers that hold something.** *Observations* and *Sites /
  context* were offered on maps that had neither, which claims the workflow holds data it does not.
- **A result no longer outlives the node that made it.** Deleting the widgets that produced a run
  clears their outputs; deleting all of them clears the panel. Changing a *parameter* still keeps
  the previous run, which is how you compare before and after.
- **A large published boundary applies in under a second, instead of freezing or crashing.** The
  study-area dialog built one draggable marker per vertex, so acquiring North Kivu — 16,548
  vertices, admitted whole — meant 16,547 divs with listeners: **8.2 s** of frozen interface in
  Chromium and a **crashed page** in WebKit. Found by profiling, after four plausible guesses that
  measured as nothing. Handles are capped at 400, which is far more than anybody draws by hand,
  and a larger outline is drawn without them and says so: **0.7 s** in Chromium, **0.6 s** in
  WebKit. A **published jurisdiction carries no handles at any size** — dragging a vertex of one
  would change the shape, the provenance and the authoritativeness of an outline that is somebody
  else's — and the dialog says so rather than omitting them silently. Each phase of Apply also names itself, and validation and the N3 preview are recomputed
  only when the shape, its name or the clip settings change rather than on every map movement.
- **An encrypted project can carry what the browser can now hold.** The package refused a
  workflow over 5 MB — a number set when a workflow could not be much larger, because its payloads
  lived in a 5,226,496-byte store. Payloads moved to IndexedDB the same day, so the export cap
  refused the street network the storage work had just made downloadable. One cap was doing two
  jobs: export protects nothing (the data is already yours, already in memory), while import
  defends against a crafted ZIP that decompresses into gigabytes. They are two numbers now, and
  the refusal says what the workflow weighs. Measured in Chromium on a 40,000-junction graph: an
  **8.17 MB package written in 2.4 s**, opened, verified and saved on a clean device in **1.5 s**.
  Carrying a real project between two browsers found two defects in the morning's storage work
  that no unit test reached — an imported payload was dropped on the first save, and then, once
  written, was kept inline because the store was asked what it held before the write rather than
  after.
- **Projects are chosen, read and edited where they are named.** A project could be created and
  then never renamed or described, its subject existed only as a tooltip, and its workflows were
  reachable only as optgroup labels inside the worked-example picker — one control doing two
  unrelated jobs. There are now two: **Project**, then **Workflow** within it, with the eleven
  worked examples listed as the seven built-in projects they already were. The project bar carries
  a details disclosure — name, subject, the workflows it holds, the project id — editable for your
  own projects and read-only for the built-in ones, which say so. **Both titles are renamed by
  clicking them** — the project name in the eyebrow, the workflow name in the heading, with Enter
  to apply and Escape to abandon. `+ Add workflow` creates a canvas
  inside the project instead of an unrelated one you then assign. Deleting a project removes the
  grouping and leaves the work. The picker was the fourth copy of the example vocabulary; it is
  built from the project registry now, so `index.html` names no example at all.
- **The wordmark gives way before the version badge does.** On a narrow window the header's
  mark could not shrink, so its contents overflowed and the version badge sat on top of the
  controls — 94px² of overlap at 330px here, 403px² at 300px, and far enough forward on Linux
  WebKit's wider fonts to hit at 375px, where it had been failing CI and blocking publication for
  half a day. The name now truncates and the badge and icon hold their size. The check that was
  meant to catch it compared left edges, which is only an overlap test while two things share a
  row; it measures the intersection now, prints both rectangles when it fails, and runs at the
  widths where the layout is actually under pressure.
- **A downloaded street network no longer has to fit in a 5 MB store.** Workflows are kept in
  `localStorage`, which accepts 5,226,496 bytes measured in both engines and is written twice on
  every save — and the graph was inside the workflow. A town-sized download therefore succeeded
  and was then discarded, because a network is kept only if it persists. Payloads now live in
  IndexedDB and the workflow keeps a digest that points at one; measured, an 8,096,643-byte graph
  beside a 64,924-byte workflow, surviving a reload. Proving it turned up a second copy: the
  project manifest inventoried every junction id and every edge pair, 2.25 MB for a 40,000-junction
  graph, and now carries counts and the payload's own SHA-256 instead. Where the large store is
  blocked or refuses a write, the Street network widget says so **above the Download button**, and
  a toast says it the moment it happens: a fallback nobody is told about turns the larger ceiling
  back into the smaller one while the application goes on reporting that everything was saved.
- **A street network is downloaded for walking or for driving.** There was one filter and it was a
  walking one, while the reachability widget already offered walking, cycling, driving or other —
  so a driving question was asked of a graph that excluded motorways and trunk roads and included
  steps, and nothing objected. On the Soho graph this repository ships, 56.7% of edges and 48.1% of
  edge length are types a driving filter excludes, and 28.1% carry a vehicle one-way restriction
  the walking parser ignores. Driving now keeps motorways and trunk roads, drops footways, paths
  and steps, honours vehicle one-ways and roundabouts, and reads `motor_vehicle` and `motorcar`
  restrictions; the highway exclusions follow OSMnx's drive filter so the two are comparable. The
  mode is part of the request, so a cached walking graph cannot be served to a driving download; it
  is saved with the graph, shown on the widget and asserted in the receipt; and a downstream widget
  asking for a mode the graph cannot carry is refused rather than answered. Walking remains the
  default. A driving graph still carries no speed limits, no junction delay and no congestion —
  travel time is one speed applied to every street.
- **A project is an investigation, and holds several workflows.** "Project" had been a word in the
  title bar bound to the current workflow's name. It is now an entity: a subject, and a workflow
  for each question asked about it. The four cholera workflows are one project; Old Naledi's two
  are another. Membership is optional in both directions and a workflow in no project is still
  reachable. Starting an empty canvas now asks what you are investigating before it asks where.
  A payload used by several workflows is held once, and the reference exists only on disk — a
  workflow in memory always carries its data, so nothing downstream changed.
- **The palette offers every widget once the canvas holds an input.** Four hand-curated lists
  decided what was addable, and nine widgets were reachable only from the examples whose templates
  named them — `measure_distance` among them, on one example that is slated for retirement. Eight
  of the nine carried an open evaluation obligation, so the gate was asking for judgement on
  widgets a practitioner could not open.
- **Street networks are judged on what they cost.** A fixed 6 km envelope refused a study area for
  its width before anything was measured; Buvuma Island's bounding box is mostly Lake Victoria.
  The byte and feature limits are now their own numbers rather than following the isochrone's
  memory limit, and the default graph size admits a real town — 50,000 network nodes, where 2,000
  refused Buvuma's 11,359 and Bunia's 42,796.
- **The OSM client follows the service.** Each instance's `/api/status` is read — free slots, rate
  limit, when the next slot frees — and a busy service is waited for rather than treated as
  failed. A six-second health check had been declaring a live service dead for answering slowly,
  which is how Overpass expresses load. Responses are kept on the device and reused for the same
  query; pressing Download again when a network is already saved fetches a fresh one. The widget
  shows endpoint status before a download, progress on the button during it, which instance served
  the saved graph, and why a download failed.
- **Mean center can be weighted by a record attribute.** 250 addresses carrying 489 deaths have two
  different centres; the receipt asserts the field and the weight total beside the unchanged point
  count. A weight that is missing, non-numeric or negative is refused with the count of records it
  applies to; a weight of zero is kept.
- **Two widgets renamed to say what they act on.** `summarize_polygons` became
  `summarize_points_to_polygon` and `hex_aggregate` became `aggregate_points_to_h3_cell`. Saved
  workflows naming the old identifiers are rewritten on open.
- **Refusals name the action.** A workflow holding a study area was told to add a study area; an
  empty street network did not say the download is a separate button; a six-megabyte boundary
  download reported nothing while it ran. Each said what the state was and not what to do.
- **Manual pages for Study area, Street network and Point data**, and a default label now names its
  widget: every Map was born called "Study area and points", which was one example's label.

**Migration.** None required. The two renamed node types migrate on open and keep their
connections; `projectId`, `workflowKey` and `dataRef` are optional and absent from every saved
workflow written before this version.

**Validation limits.** The caps that are measurements are separated from the caps that are guesses
in `docs/experiments/125-caps-below-the-limit-we-are-testing.md`; four remain unmeasured and are
listed in TODO.md with the artifact that would stress each. Parity for the renamed widgets and for
`mean_center` still covers their previous release, and the catalogue says so.

## 0.9.0 — In development

- **Reachable junctions attaches its own origins.** It refused any point without a
  `networkNodeId` and told the practitioner to add a `snap_to_network` step first, which made a
  whole widget a prerequisite for one nearest-neighbour search. It now finds the junction itself,
  by the same `nearestNetworkNode` over the same projection, so the two paths agree junction for
  junction and metre for metre — asserted, not assumed. A point that arrives already snapped is
  used exactly as it arrives. This is steps 1 and 2 of the `snap_to_network` retirement, which
  turned out to be one step: a zone with nothing to project is not worth adding on its own.
  **The step does not move the point** — it reads the nearest junction, charges the distance
  against the budget, and leaves the origin where it stands.
- **The new `zone`, `hemisphere` and `maxSnapM` are optional, so nothing had to be migrated.**
  The widget's reason for having no zone stays true whenever origins arrive snapped: nothing in
  the Dijkstra re-measures geometry. Requiring a zone for a run that never projects would demand
  a figure the widget does not use, so completeness is refused at **run** time, naming the
  origins that needed it, and every saved workflow keeps working untouched.
- **Reachable junctions had no Inspector panel at all** — not merely none for the new parameters.
  Its travel time, speed, mode and direction have been declared, implemented and tested since
  experiment 83, and the only way to set any of them was to edit the workflow file. The node fell
  through every branch of the Inspector's type chain. `palette.ts` could not have caught it: it
  asserts a widget is **addable**, and addable is not configurable.
- **A successful edit could throw while rewriting the Inspector.** The same focus-versus-innerHTML
  hazard fixed in the rollback path earlier the same day, on the path where the edit succeeds.
  Found by a test that types a UTM zone. Both paths drop focus first now.

- **The Run workflow button was invisible whenever it was disabled.** Not removed — rendered at
  **1.22:1** against its own background, in both colour schemes, measured with this project's own
  `contrastRatio`. `.button.primary:disabled{opacity:.45}` dims the whole element, which moves the
  white label and the green fill *towards each other* until they meet in the same pale mint. Every
  worked example auto-runs on load and the button is disabled while it runs, so the slower ones —
  06, eighteen nodes — spent that whole time with no button a practitioner could see. Replaced with
  declared `--button-disabled` / `--button-disabled-ink` tokens: **5.94:1 light, 4.77:1 dark**. The
  generic disabled opacity went from `.4` to `.55`, which takes secondary buttons from 2.15:1 to
  3.12:1 in light mode — better, and still short of the 4.5:1 text threshold, which is recorded
  here rather than claimed as fixed. WCAG 1.4.3 exempts disabled controls; exempt from the
  requirement is not an argument for unreadable.

- **Result tables rank by a column.** Every column header is a button; clicking it orders the
  table, clicking again reverses it, and the active column declares `aria-sort`. Which matters
  less than what an order over a result table has to decide: **records with no value for that
  column are held at the end in both directions**, and counted in the controls, because "which
  clinic is furthest from a road" must not be answered by a clinic nobody measured. And the
  comparison is chosen per column from the values present — every known value a number makes it
  numeric, anything else is compared as text with numeric-aware collation, so a column holding
  both `3` and `'3'` is not quietly coerced into looking sound at the moment somebody is reading
  it. Found missing while decomposing that question: `snap_to_network` had claimed since
  2026-10-14 that its displacement was *"a point attribute a practitioner can map, sort and argue
  with"*, and nothing in the application sorted anything.
- **A rule says what its setting is set to.** A condition read *"DEATHS is at most the cluster
  setting"* — the practitioner, 2026-10-17: *"does this not look like fixed on context"*. It did.
  The name was real and declared; `the … setting` was a sentence composed around it, carrying
  nothing the name did not, while the figure the rule turns on sat two panels away. Both the
  editor and the Inspector now show `cluster · 4 deaths`. Third time this shape has come back,
  after `{{threshold}}` (the stored form) and *"Deaths at this address"* (a label over a column);
  each time the fix is to show what is there.
- **Clearing a setting is refused by name, not by range.** `Number('')` is 0, so an emptied
  setting box was stored as zero and bounced off the declared minimum — *"busy must be between 1
  and 20"*, about a figure nobody typed — and a setting declaring no minimum would have run on
  that zero in silence. The run now says it needs a value for that setting.
- **A refused edit no longer throws while rewriting the panel.** Rolling an edit back re-rendered
  the Inspector while the control that made it still held focus, which Chromium refuses with *"the
  node to be removed is no longer a child of this node"*. Focus is dropped first. Any refused
  edit typed into a field could raise it; it took a test that clears a required setting to find.

- **A map says which design rules it was held to.** Four rules are applied while a visualisation
  is assembled, and its receipt states every one — including the ones that did not apply, so a
  reader can tell a rule that passed from a rule that was never run. Text and mark contrast are
  **measured** against WCAG SC 1.4.3 and 1.4.11 with the number in the receipt; the palette and
  the no-data colour are **categorical** checks, and each rule declares which it is. Expressed in
  **EARL** (the assertion), **DQV** (the measurement) and WCAG's own IRIs (the criteria) — only
  the threshold is new vocabulary, because EARL states it does not carry one.
- **A shapes-and-gaps tab in the data quality dialog**, with a **nullity matrix** adapted from
  [missingno](https://github.com/ResidentMario/missingno): every column against the same records,
  one mark per record in file order, plus a completeness sparkline that makes the worst *records*
  findable. Opening the damaged worked-example input shows its gaps are every fourth record,
  which "63 of 250" cannot say. Sharing one row axis is what lets two columns that go missing
  together be told from two that do not. Also: how much of each column arrived, a distribution
  per numeric column with the 1.5×IQR fence drawn where it falls, and frequencies per category —
  except where every value is unique, which is named as an identifier rather than charted. File
  order may carry meaning or none, and the tab says so.
- **A data quality dialog, per input widget.** One card per column: what is declared, what does
  not match it, what is absent, and the shape of what is there. It is where a repair is declared
  **and where it is taken back** — removing the declaration restores the originals, which were
  never overwritten. An unbound column says *"nothing has declared what they should be, so there
  is nothing here to be wrong against"* rather than implying a clean bill it cannot give.
- **Every toast tone was unreadable, in both themes.** White text on mid-tone fills: light
  warning 3.81, light failure 3.72, dark warning **2.08**, dark failure 2.41, against a 4.5 floor.
  Each tone now has a foreground token paired with its background per theme, and a test holds all
  six tone/scheme combinations above 4.5.
- **Column profiles, and one repair you can act on.**
  [Experiment 117](docs/experiments/117-data-quality.md). Every column in the quick look now
  carries what the file says about it: values that do not match a declared kind (**marked in the
  cells**, not just counted), how many are absent, and for numbers min/median/max with a count
  **beyond a 1.5×IQR fence** — a prompt to look, never called an outlier, because whether a value
  is one is a judgement about what was measured. Categories show their most frequent values and
  how many are distinct.
  A column declared numeric that holds numeric text offers **Read N values as numbers**, stating
  its count before you press it. The repair is never automatic — this application refuses to
  convert silently, and `"3"` → `3` is the same class of act as a unit conversion. It reports
  both sides, leaves what it cannot read exactly as it was, is reversed by Undo, never writes to
  the source file, and is **stated in the run evidence** as `fw:ColumnRepair`.
  **The repair never overwrites what the input holds.** It is a declaration — which column, read
  as what — applied to a copy on the way out, so the records a node carries stay byte for byte
  what was imported and removing the declaration restores them without an Undo.
  **No repair is offered for a missing value.** Filling one is imputation, which is a modelling
  decision belonging to the practitioner and their method, not to a widget's convenience.
- **A rule names the column, not a label written over it.** The rule editor and the Inspector
  showed a binding's human-readable `label` — so a rule read `Deaths at this building` for a
  column the file calls `DEATHS`, and a practitioner checking the rule against their data had to
  translate. They name the column now. A label is a gloss beside a binding, never a substitute
  for it in a rule.
- **"Is it recorded" is a comparator, not a pseudo-field.** Every bound field has a generated
  companion saying whether a record had a readable value. It was offered as a second entry in the
  field list, so a rule read `IF whether Deaths at this building is recorded is false` — a double
  negative wrapped around a question, and worse for an unlabelled column: `IF whether n_deaths is
  recorded is false`. `is recorded` / `is not recorded` now sit beside `is more than` in the
  comparator list, which reads whatever the column is called and halves the field list. The
  stored rule and its N3 are unchanged.
- **The ruleset example bands buildings, not "addresses".** The provenance for that file says
  "250 buildings with death counts" and the upstream table is `deaths_by_bldg`; "address" was a
  word this example coined. In 1854 Soho one building routinely held several addresses, so the
  old wording stated a unit of aggregation the source does not have.
- **Quick look: a table at a width you can read it.** A tabular input offered a filename, a row
  count and a block of JSON describing the table's *shape* — everything about the table except the
  table — inside a 292px panel. **Quick look at the table** opens its rows in a wide dialog with
  every column, a filter, and absent values shown as *not recorded* rather than as blank cells.
  Point inputs get the same button, for the same reason. It reads; it changes nothing.
- **A republished worked example says so.** A saved workspace wins over the published template —
  it must, or your edits would vanish on every visit — so rebuilding an example reached nobody who
  had already opened it, and nothing mentioned it. The workspace now records which published
  version it came from, and a newer one offers itself in one click. Nothing is replaced without
  asking: your copy keeps your edits until you choose.
- **The alert and failure colours were split in the keyframes too.** Splitting the static rules
  was not enough: the pulse hard-coded the danger token and runs for over four seconds, so a node
  that had merely *found* something rendered red for the whole animation and turned amber only
  once it stopped.
- **A widget that fails glows red, and keeps its own colour.** A step whose run was refused used
  to keep the **running** state for ever — `onProgress(id,'done')` is the last line of the loop
  body and a throw skips it — so the canvas showed the one widget that had stopped as the one
  still working. It now reports which node failed, and that node is drawn in the danger colour.
  **Alerts on a completed run moved to amber** so the two can be told apart: amber means there is
  a result and part of it needs reading differently; red means this step produced nothing. They
  were the same red, which made "your answer has a caveat" look like "you have no answer".
- **The fail conditions are in the ontology.** A run that read a value as "not recorded" records
  why, in the evidence: `fw:ReadingProblem` on the rule application, naming the attribute, the
  count, the records considered, and which of `fw:ValueAbsent` or `fw:ValueUnreadable` applies.
  Both produce the same fact for the reasoner, so the receipt is the only place they can be told
  apart afterwards. A step that read everything says so rather than staying silent.
- **A step says what it could not read.** A ruleset applied to records whose values it cannot
  use tells the rules those values are not recorded — which is correct, and was silent. It now
  reports them: as an amber notice after the run that names the steps and **stays until it is
  closed**, as a badge on the widget, and in the Inspector with the column, the count and what it
  saw. It separates a value nobody collected from a value somebody collected that this step could
  not read: both produce the same word in the output and they are not the same problem.
- **The ruleset example carries two more workflows, over deliberately damaged data.** C is Snow's
  Table 1 with three dates' counts removed; D is his mapped locations with a quarter of the counts
  written as text. Both run the *identical* rules as A and B — from one factory, so they cannot
  drift — and both inputs say in their label that the damage is simulated. The missing-value
  branch, which Snow's own data never reaches, fires in C.
- **Advice now fits the finding.** Every node alert ended with "Raise the snap limit or the travel
  time… extend the street network", including alerts about undeclared fields, which have nothing
  to do with streets.
- **A ruleset can read a table.** The authored path took a point layer and nothing else, so rules
  could be written about places and not about rows — half of the data anybody has, and all of
  Snow's Table 1. Both ends now normalise to a record: a table row's attributes are its key
  columns plus its declared value field, the conclusions come back as further key columns beside
  the number they were made about, and the rule layer between them is unchanged. A point layer
  behaves exactly as before.
- **The ruleset worked example is now two workflows on one canvas, over John Snow's own data** —
  Table 1 banded by the deaths on each date, the mapped locations banded by the deaths at each
  address. The halves share nothing, because Table 1 carries no place and a location carries no
  date, and a rule reads neither differently. It replaces twelve invented clinics. **It invents
  no records**, so a branch fires only where Snow's data put something in it: the missing-value
  branch is now unexercised, and boundary records are the next thing to add.
- **An input shows its records** as a table of columns and rows, and as the JSON they actually
  are, with a control for how many to show. It previously listed twelve record names and no
  column at all, while the ruleset beside it asked which column meant which field.
- **A published ruleset's rules can be read in the rule editor**, laid out as rules rather than
  as N3, with every control disabled — it is pinned and versioned, and a reader of a workflow has
  to be able to tell which rules ran. Each published document now carries the authored source its
  N3 was compiled from, and the build fails unless the two still agree.
- **A failed run says so.** Every toast used success green and faded after five seconds, so
  "Workflow stopped" looked exactly like "Complete in 280 ms". A failure is red, stays until it
  is closed, and no longer has its canvas status overwritten by the render that follows it.
- **A rule refers to a setting by name**, not by typing `{{threshold}}`. The placeholder belongs
  to the compiled rules, which are text that `bindParameters` fills; it had been carried into the
  form a practitioner edits.

## 0.8.1 — In development

- **A map has layers, not modes.** `map_output` no longer asks which kind of thing it is before
  it will accept one. It declares every layer port it can draw, the renderer is read from what is
  connected, and the canvas shows the layers a map draws plus **one configurable port**: drop any
  drawable result on it and it binds to the port its type belongs to, with a second point source
  opening the next slot rather than replacing the first. The Inspector is the same — one picker
  per layer, one *Add a layer* picker. **Migration:** saved workflows keep their stored
  `inputMode`; it is read only as a fallback for a map with nothing connected, and nothing writes
  it, so what a saved workflow drew is what it draws. A map node now carries more handles than
  before and a canvas laid out tightly around the old shape may need a Tidy. Widget release
  `map_output` **0.10.0**.
- **Presentation and basemap are available on every map**, not only on one input mode of one
  presentation. Choosing a basemap switches the map to the presentation that can draw it. Nine of
  the ten maps in the worked examples previously had no basemap control at all. Tiles are still
  excluded from the SVG export, and the receipt now records a basemap in use as layer 0 with the
  provider it came from.
- **Connecting a raster no longer deletes a map's other connections.** A raster is a layer; the
  others stay wired and recorded. The renderer still draws one picture at a time.
- **A superseded ruleset says so.** A step pinned to an older ruleset version names the newer one
  in the Inspector and at the run, with what changed, what it deprecates and whether moving is a
  drop-in. The Inspector also says what the offered version of a widget changed, folded for an
  ordinary release and open for a breaking one.
- **Undeclared provenance on a projection extract is an alert, not a refusal.** A missing dataset
  IRI, version or third citation used to stop the run; no provenance field changes a computed
  number. **Migration:** a workflow that previously refused to run will now run and report the
  gaps, so a result can be published from an extract whose source is undeclared — the alert is
  what makes that visible. Fields that decide how numbers are *interpreted* — baseline period,
  basis kind, value unit, key columns, declared families — still refuse.
- **The progressive-reveal playback is reachable** from the workspace bar as *Play back the
  build*, rather than only by typing `?playback=1`. It changes nothing that is saved and leaves
  the ordinary palette untouched: the reveal rule is measured and prototyped, not adopted.
- **Rules can be written, not only chosen.** A ruleset step can carry rules authored in the
  workflow instead of a published ruleset picked from a list. **Edit these rules** opens a dialog:
  conditions grouped by *and*, alternatives by *or*, a list of conclusions, add and remove
  throughout. The rules are compiled as you write them, so the limit on how many a ruleset may
  have — and any refusal — appears while you are writing rather than afterwards, and *Keep* stays
  disabled while they cannot compile. Nothing is written to the step until you keep it. The
  Inspector reads authored rules back in plain words, with the columns they read and the settings
  they use.
- **A measurement must state its unit.** A numeric field and a numeric setting each declare one,
  and a comparison between two that disagree is **refused by name** rather than converted —
  checked while you write the rule and again when the workflow runs. Where no rule can help, the
  editor shows the field's unit beside the box its value is typed into: a bare number takes the
  field's unit and nothing can tell what you meant by it.
- **A new worked example: *09 · Rulesets · how a rule is put together*.** Four steps, one way of
  writing a condition each — banding a number, alternatives reaching one conclusion, two
  conclusions at once, matching a category, and bounds from below — over twelve synthetic service
  points chosen so every branch of every rule has a record in it, including a missing value and a
  category no rule names.
- **A canvas offers the input stage first.** With nothing on the canvas the palette offers the
  widgets that need no input, and opens fully as soon as one is placed. There is no sensible
  process step before there is something to process.
- **The street network download asks four Overpass instances, not one.** Every instance is asked
  a one-line question first, so a download is not spent discovering the first three are down, and
  the instance that answered is recorded in the run evidence. A regional mirror that answers for
  an area it does not hold is reported as a coverage limit rather than as a study area with no
  streets. **Migration:** none; the saved network format is unchanged.
- **The study area suggests the metric zone**, before any step that measures exists to carry it,
  and when the area spans more than one zone it names each candidate with the worst stretch it
  would cost. It sets nothing.
- **A canvas alert can be closed.** The badge on a node has an ×. Closing it keeps the finding —
  the node still glows and the Inspector still carries every detail — and the next run raises it
  again.
- **Fixes.** A toast's buttons could not be clicked, so *Reload*, *Later* and *Update now* never
  did anything; they work now. A stale cached build is named in the header — **v0.7.0 · cached** —
  with an offer to update, and `?reset-cache=1` clears a cached build from a browser with no
  developer tools, leaving saved workspaces untouched. The widget manual is legible in dark mode.
- **The manual is for the person using the widget.** Each page says what kind of widget it is,
  what it does, what to connect, how to use it, which worked examples exercise it and what it will
  not do. The design records moved to `docs/widget-specs/`.
- **Validation limits.** 511 unit tests and 133 browser tests pass, with the browser suite run on
  Chromium, Firefox and WebKit in CI. No practitioner other than the author has used any of this,
  and the rule editor in particular has been used only by the person who wrote it.

## 0.8.0 — In development

- **A rule about a shape now hands the shape back.** The extent ruleset used to return a table of
  judgements and drop the geometry, so a decision about a polygon could be listed and never drawn,
  clipped or summarised. `extent-review` **1.1.0** returns the polygons it judged, each carrying its
  status and the comparison behind it, and the polygon table shows both along with the area the
  polygon derived. The John Snow outbreak-extent example draws the judged outline. A workflow
  pinning 1.0.0 keeps working and keeps its old table.
- **A saved composition can hold a ruleset.** `classify_extent` is one step that expands into a
  convex hull and the extent ruleset, with the threshold exposed for a practitioner to set. It is
  private and unreviewed, as the other composition is. Building it fixed two limits that any future
  composition would have hit: a parameter can now address a nested field, and a member whose output
  port comes from its own pin is no longer refused as emitting nothing. One limit is left open and
  recorded — a composition pins its widgets, not the ruleset they apply, so nothing reports a
  ruleset moving underneath it.
- Widgets that measure a shape and widgets that judge one now link to the Validation Lab notebook
  explaining what those steps assume, reachable from the Inspector.

- **A travel-time catchment now charges all three parts of the walk, and draws the whole
  route.** The walk off the street at the end — from the last junction to a door — used to be a
  fixed 25 m strip drawn around every reached street, including the streets at the very edge of
  the budget, so the region claimed 25 m of ground beyond its own time all the way round. It is
  now a leg with a budget: the full width where that much time is left, narrowing to nothing
  where it runs out. The setting is renamed **Final walk off the street** and means the furthest
  anyone is assumed to walk off a street at the end of a route. **Results change again**: on the
  John Snow example the bands shrink by 39.3%, 13.8%, 4.2% and 0% — the longest band does not
  move, because there the network runs out before the time does — and the one-minute band falls
  from 35 locations and 89 deaths to 21 and 65. Of the 110 deaths that band claimed before any of
  this work, 45 were inside only because two of the walk's three segments were free.
- **Travel-time catchments now charge the walk onto the street network.** A route has three
  parts — from the site to the nearest junction, along the streets, and from the last junction
  to the door. The first was measured, published in the evidence and then thrown away, so every
  isochrone reached further than its minutes allowed. It is now deducted from the budget, in
  both **Network isochrone** and **Reachable junctions**. **Results change**: on the shipped John
  Snow example the one-minute band falls from 48 to 35 locations and from 110 to 89 deaths, and
  the band areas shrink by 18.5%, 7.8%, 1.7% and 0% as the budget grows. A workflow rerun after
  updating will show smaller catchments; that is the correction, not a regression.
- **A site far from the streets is no longer thrown out of the run.** Past the snap limit it used
  to raise an error that discarded every other site's result. It is now routed anyway, with the
  straight line to the nearest junction charged against the budget, and marked: the catchment
  carries `fw:offNetworkMetres` and the site is listed in `fw:offNetworkSites`. **Snap sites to
  the network** drops nothing either; the points it emits say which of them crossed ground no
  street covers. A straight line assumes a walk that may not exist, so those results are
  optimistic in a stated direction rather than missing.
- **The widget tells you, in red.** A widget that could not connect a site glows on the canvas
  with a count, and the Inspector names each site, what happened to it and the distance that
  decided it. The finding travels downstream, so a summary over seven of nine catchments glows
  too. Sites whose walk alone spends the whole budget get no catchment at all — nothing is
  reachable, and the only drawable shape would be a disc around a junction they cannot get to —
  and are named in `fw:unconnectedSites`. That disc was being drawn silently before, whenever the
  snap limit was set wider than the travel budget.
- **Snap sites to the network** keeps each site's own coordinates on the point it moves, which
  is what lets anything downstream draw the first leg of the route. The four-widget chain
  (snap → reachable junctions → band → corridor) reproduces the one-widget catchment to 2×10⁻⁵ of
  area at every band.
- Validation limits: both straight legs — onto the network and off it at the end — are charged at
  the street walking speed and assume ground that can be walked, so a catchment over sparsely
  mapped ground is still optimistic. The 25 m default for the final walk is plausible for Soho
  and calibrated nowhere. Measured only on the well-mapped Soho network. See
  [experiment 114](docs/experiments/114-the-three-segments-of-a-walk.md).
- Removed two internal corridor builders (`bufferedCorridor`, `reachedStreets`) that nothing
  could reach once the corridor stopped having a single width.

- Add the **Manila coastal exposure** worked example, the first increment of the sea-level work:
  published IPCC AR6 projections for eight Philippine tide gauges against 60 real OpenStreetMap
  health facilities, each assigned its nearest gauge with the distance recorded. It runs offline
  and reaches no source. It stops deliberately short of comparing a projected level to an
  elevation, because none has been supplied and a comparison against an invented one would look
  exactly like a real result; tests assert that neither the threshold widget nor a raster output
  appears.
- Building it found two defects. Facility identifiers were minted as `node/3090641351`, which the
  application's own point rule rejects — the widget stores points in its own parameters and never
  met that validator, so the slash passed everywhere until the same points were put into an Input
  data node. They are now `node-…`. And `exampleKey` fell through to Old Naledi for any workflow
  holding a study area, so the new example was silently given Old Naledi's title, description and
  licence note.

- Add **Find health facilities**, one widget with three sources a browser can actually reach, none
  needing an account: a live OpenStreetMap query through Overpass, the Humanitarian OpenStreetMap
  Team country export published on HDX, and Overture Maps Places read directly from GeoParquet in
  cloud storage. The study area bounds the query rather than filtering it afterwards. Retrieval
  happens in the interface and never during a run, so a workflow runs from stored facilities with
  the network off; `core.ts` imports the value and validation functions and deliberately not the
  download function, and two checks hold that in place. Verified live: 47 facilities from
  OpenStreetMap and 30 from the HDX export for the same Manila area, 488 from Overture.
- **Overture Maps Places counts differently, and the widget says so.** It catalogues commercial
  places, which is broader than a health facility: unfiltered it offered 1,120 health places in a
  Manila study area where OpenStreetMap found 47, the extras including individually named doctors,
  a wellness spa and a training course, and it reported 207 places under "hospital" where
  OpenStreetMap returned 47 hospitals and clinics together. So it filters on the confidence it
  states for each place, defaulting to 0.70, and its categories map onto facility kinds
  conservatively with the vaguest three not mapped at all. Each facility keeps Overture's own
  category and confidence, and the receipt states that counts are not comparable between sources.
  Overture is CDLA Permissive 2.0 rather than share-alike, so the licence is read from what the
  retrieval recorded instead of assumed.
- Remove `healthsites_discovery`. It needed an API key and healthsites.io sends no cross-origin
  header, so the application could never read its response and acquisition meant asking the
  practitioner to download a file and hand it back. A saved workflow holding one migrates to the
  OpenStreetMap source, carrying its facility kinds but not its data: relabelling a hand-back of a
  file this application never saw as an OpenStreetMap retrieval would be a false provenance record.
- **Attached PDFs and retained raster windows could not be stored in Safari at all.** Local storage
  wrapped every value in a `Blob`, and WebKit aborts any IndexedDB transaction that puts a `Blob`
  or `File` into an object store. Bytes are stored instead; a database written by the previous
  version is still read. The failure was hidden because the abort handler asserted a full disk and
  discarded the error that said otherwise — it now reports what it observed and claims no cause it
  has not seen.
- WebKit now passes the whole browser suite, 88 scenarios, the same as Chromium. It stood at 42
  passed and 37 failed, unchanged since 0.5.x. Of the failures, 23 were one Playwright fault in
  navigating while offline, fixed by the dependency bump; 11 were the Safari storage defect above;
  and 2 were tests whose simulated network conditions silently did not apply, because a controlling
  service worker hides requests from the harness in WebKit. Those two now assert the behaviour with
  `setOffline`, which works in both engines, and the one test that substitutes a fixture blocks the
  service worker rather than being skipped and counted as covered.
- Add **Sample raster at points**, which reads raster values at point locations, and **Area around a
  point**, which derives a study area from one named point and a radius. The study-area editor
  gains a point-and-buffer mode with a draggable circle and an adjustable radius, replacing a
  circle made of 128 draggable vertices.
- Sea-level projection values are keyed on a declared `basis` with its `basisKind` rather than on a
  workflow identifier. Measured 2026-10-09: the AR6 confidence output files carry no workflow
  dimension and are p-boxes over several workflows, so a key component assuming one workflow could
  not describe them. A p-box bound is not a quantile of one distribution.

- Fix the results pane taking over the screen when a comparison result was opened. Expanding to full
  width was triggered on every render of a comparison, so selecting the comparison node — which now
  shows that node's result — expanded the window behind a click aimed at a node. It happens on the
  render following a run and is otherwise the reader's choice, guarded by
  `tests/results-expand.browser.mjs`.
- Rework both John Snow workspaces to carry place and time together: Snow's own 1855 daily table is
  imported, turned into a series declared as deaths by date of death, and drawn as an epidemic curve
  beside the catchment map. The two are deliberately **not connected**, because his death locations
  carry no date and his daily table carries no place; the 45 attacks of unknown date are excluded by
  the import and the node says so.
- Bundle the 1,852-house General Board of Health digitisation at `examples/snow-gboh/`, verbatim and
  unmodified, with a NOTICE recording its stated GPL licence, the absence of a licence file and
  version in the download, its 1855 HMSO origin, and the limits that apply: the denominator counts
  houses rather than people, the numerator and denominator come from different years, and the
  coordinates are OSGB 1936, so no modified or reprojected copy is distributed.

- Make the running build identifiable, and announce updates. The service worker answers from its cache
  first and never revalidates, so a tab keeps running old code until it is reloaded — which meant a
  feature could be deployed, verified and still absent for the person looking at it, with no way to
  distinguish that from a defect. The controlling worker now reports its own build identity, shown in
  the catalog as **Serving this page**, and an installed update raises a notice with a **Reload**
  action that stays until it is used or dismissed. The identity comes from the worker rather than from
  the page, so it names the build actually answering. This also protects against a subtler failure: an
  old page can request content-hashed chunks that the new cache no longer holds.

- Link the canvas to the Results panel: selecting an output node opens that node's result tab and
  marks it, so the two panels agree about what is being looked at. A node that produced two tabs, as a
  coverage check does, keeps whichever of its own is already open rather than jumping between them,
  and selecting a node with no result leaves the open tab alone while clearing the mark.

- Add **Rate with a denominator**, the first widget on the person axis: divides counted events by a
  declared population at risk, grouped by an attribute or by bands of a numeric one. The declarations
  are the point — what the denominator counts (people, houses, households, person-time), whether the
  result is a proportion or a ratio, the multiplier, the smallest denominator that gets a rate, and the
  numerator period beside the denominator vintage, which are compared rather than assumed to match. A
  proportion exceeding one is refused, a zero or small denominator reports its counts and no rate, and
  a non-numeric or negative value is refused rather than read as zero. `fw:RateResultShape` requires
  the unit and the kind, so a rate that does not say what it is a rate of cannot conform.
- Record what the surviving John Snow data sets can and cannot support in
  [a research note](docs/research/john-snow-data-sets.md): the 578-point digitisation is a stacked
  cartographic device rather than case locations and was withdrawn from the Chicago compilation; the
  bundled 250-building file has an unknown licence; a denominator exists only as **houses** in the
  1,852-house General Board of Health digitisation, so a rate per house is defensible and a mortality
  rate per person is not; the numerator and denominator come from different years; and the GPL on that
  digitisation permits redistribution, so the file can be bundled verbatim with its licence and
  attribution, while a reprojected or filtered copy would itself have to carry the GPL. Measured there:
  186.7 deaths per 100 houses within 50 m of the Broad Street pump against 2.0 beyond 300 m, and 55.6 %
  of houses within 50 m having at least one death against 5.0 % at 250–300 m.

- Add **Cases by period**, the first widget on the time axis: counts cases per day, week or month
  from a declared date attribute and a declared **kind** of date, reading either a point layer or a
  keyed table, and optionally weighting by an attribute where one row stands for several cases. A
  Chart output gains a case-series mode that draws the result as an epidemic curve, so the curve is a
  presentation of the series with no smoothing or interpolation. Periods with no cases are retained,
  because a gap is a fact about the outbreak; records whose date is not ISO 8601 are excluded and
  counted rather than guessed at, since a widget that chose between day-first and month-first ordering
  would be silently wrong for a third of the year; and a non-numeric or negative weight is refused,
  naming the record. `fw:CaseSeriesShape` requires the kind and the period, so a series that does not
  say what it is a series of cannot conform.
- Bundle **John Snow's own daily table** (1855, Table 1) at `examples/john-snow/snow_dates.csv` with
  its citation chain, digest and retrieval route. It supplies the time axis his map cannot: 616 deaths
  and 571 dated attacks between 19 August and 30 September 1854, with **attacks peaking on 1 September
  and deaths on 2 September** — the historical demonstration of why the kind of date must be declared.
  Recorded limits: the file's final row carries 45 attacks with no date, which a keyed table cannot
  represent, and the two Snow files cannot be joined case by case because one has places without dates
  and the other dates without places.
- Record a measured contrast finding: an amber palette icon is 2.83:1 on its own wash, a pre-existing
  defect the new widget surfaced in the node library for the first time. The widget uses the Summaries
  group's teal instead, and the amber token is left for a deliberate decision rather than changed as a
  side effect. See [experiment 46](docs/experiments/46-colour-theme.md).

- Implement the sea-level pack's three contracts in the application, since the pack ships no code and
  the application loads none: **Sea-level projection extract** declares an imported long-format table
  as a bounded AR6 extract, requiring the full key of site, scenario, workflow, family, year and
  quantile, metre units, the dataset and version, the baseline period, three obligatory citations and
  which family value includes vertical land motion; **Assign projection site** gives each point its
  nearest published site and keeps the distance, reporting unlocated points rather than dropping them;
  and **Compare level to elevation** compares one fully keyed projected change against a
  practitioner-supplied elevation on a stated datum, refusing to run without the datum, without a
  named elevation attribute, or with a partial key, and treating equality as reaching the elevation.
  The output uses the existing decisions port, so Map, Table and Chart present it unchanged and it
  cannot reach a raster output that would resemble a flood map.
  The pack's vocabulary stays authoritative: the host mints no sea-level term and vendors the pack's
  two TTL files at the digests `widgets/packs.json` pins, which `validate:widgets` now verifies and a
  negative test covers. The pack retires its widget declarations and records each deviation. Three
  deviations were argued before the code, in
  [experiment 58](docs/experiments/58-sea-level-widgets.md): a table input rather than a second CSV
  reader, three inputs for site assignment because a table has no geometry, and the decisions output.
  Validation: 11 new unit checks within 145, 2 Chromium scenarios within 74 with 1 skipped, receipts
  conformant to the pack's own SHACL shapes with a negative case, registry valid at 37 widgets and 69
  releases, catalog 0.2.0 verified at 5 pinned digests. Projections are **imported, never produced**,
  and the worked example here uses synthetic values with the published key structure rather than AR6
  numbers.

- Show widget packs in the catalog, with the admission state, the pinned commit, each required
  review's state and the recorded reason — labelled as decisions read from this build's catalog
  rather than checks performed by the page. The view also states why no pack can be added here:
  nothing is fetched or executed at runtime, and the sea-level pack is declaration-only, carrying
  no widget code. Experiment 49 had excluded admission state on the grounds that a bare badge is an
  unverifiable trust claim; showing it with its basis keeps that objection satisfied while
  answering the question the omission left hanging.

- Show the widget catalog in the application, reachable three ways: **▤ Catalog** in the header,
  **Widget catalog ›** beside the node library, and `?catalog=1` for a direct link. The first
  version had only the library link, at 10px, which was too easy to miss. The header control is
  hidden below 850px because the header measures 395px wide with it at a 390px viewport and 390px
  without, even reduced to its icon, so phone width keeps the labelled library entry instead. The
  dialog, beside the node library, lists every
  compiled definition with its version, release digest, declared ports and independent-check
  outcome, together with the application version, the pack-catalog version and digest, and how
  many widgets have parity evidence. The inspector shows the same identity for the selected node,
  with the measured result of its check. Nothing is fetched and nothing is installable, which the
  dialog states. Adding it tripped the light-theme contrast ratchet at 47 pairs against a baseline
  of 46 — a "not checked" badge at 3.26:1 — which was fixed by differentiating outcomes through
  the foreground only, since an invented light background had left dark mode light-on-light. See
  [experiment 49](docs/experiments/49-catalog-in-the-interface.md).

- Record the curated pack catalog in run provenance. A run asserts `fw:PackCatalog` with the
  catalog version and the SHA-256 of `widgets/packs.json` as built, and every node plan states
  `fw:widgetDefinitionSource "host-registry"`, which the runtime shape requires from a closed
  set. The application still loads no pack — `runtimeFetching: "none"` is an admission rule —
  and that is why the receipt now says so positively instead of being silent, since an absence
  cannot be checked. Recorded metadata only: not a claim that any pack was reviewed, admitted,
  available or used. The identity is generated into `widgets/pack-catalog.json` by the build.
  Validation: 5 new unit checks within 128, 71 Chromium scenarios with 1 skipped, SHACL
  conformant, registry valid at 34 widgets and 66 releases, catalog verified at 8 pinned
  digests. See [experiment 49](docs/experiments/49-catalog-in-the-interface.md).
- Record parity evidence for widget releases in `widgets/parity.json`: which external
  implementation recomputed a release, under what criterion, with what measured result. Release
  files are immutable once committed, so evidence about a release accrues in a separate record
  pinned to a Validation Lab commit. `validate:widgets` checks its shape and registry agreement
  offline; the new `validate:parity` verifies each claim against the Lab's own result file and
  lists the widgets with no evidence. Recorded so far: `reproject` 0.1.0 agrees with pyproj within
  6.70e-5 m, and `clip_raster` 1.0.0 is partial — cell-centre agrees exactly, all-touched differs
  by 2 cells at a pixel-aligned cutline, and the margin case is an unresolved comparison. Also recorded, working through the Spatial
  operations group: `measure_area` 0.1.0 agrees with an independent spherical computation to
  4.8e-14 relative, while the same check quantifies the approximation the widget declares — 0.30 %
  against great-circle edges for an oblique triangle, and +0.45 % to -0.56 % against WGS84 between
  the equator and 60 N; and `mean_center` 0.1.0 agrees with pyproj to 4.1e-10 m. Parity is
  4 of 34 widgets, and the other 30 are printed by name. See
  [experiment 57](docs/experiments/57-parity-evidence.md).
- Make the pack validation report citable. `validate:packs` now records what it validated
  against — host version, registry digest, catalog version and digest, widget count — plus the
  rules it evaluated and, per pack, files verified against files pinned and the state of each
  required review. A review state is a claim; this is the evidence a curator attaches to it. See
  [experiment 56](docs/experiments/56-basis-behind-identity.md).

- Add **Tabular data**, a source widget that imports a long-format CSV: one row
  per observation, with the columns that identify a row declared as keys and one
  column holding the value. The key tuple must be unique, so a wide table or a
  dropped key column is refused by name rather than silently collapsed onto one
  row. A unit is recorded only as the person states it and is never inferred from
  the file; an absent value is kept as unknown and counted, never read as zero.
  The widget claims no geometry: `fw:DataTable` is declared disjoint from
  `fw:PointDataset`, so a table cannot be mistaken for a point set by the
  reasoner. Table output gains a Tabular data mode that displays an imported
  table with its unit stated or marked unstated. Limits: 2,000 rows and 5 MB, the
  same as point input. Validation: 8 new unit checks and 2 Chromium scenarios
  within 123 unit tests and 71 scenarios, SHACL conformance for
  `fw:DataTableShape`, and registry validation at 34 widgets and 66 releases. See
  [the design record](docs/experiments/48-tabular-input.md).

## 0.6.0 — 2026-10-08

- Add a colour theme: light, dark, or following the device, chosen from the
  header and saved on this device. The default follows the device, so a first
  visit matches the operating system, and an explicit choice beats a later device
  change. Every colour the interface used keeps its exact released value in
  light, verified by screenshot at 2,162 differing pixels of 1,760,000, all but
  71 of them the new control itself. Canvas node colours are authored separately
  for dark so the widget roles stay distinguishable. Exported SVG and GeoTIFF
  artifacts are unaffected and stay light. No workflow migration is required.
  Dark meets WCAG AA for every rendered text element, measured: fixing 38 colours
  written as the keyword `white`, which had left panels light in dark mode, and
  adding contrast tokens for text on filled accent and danger surfaces. The
  released light theme has 144 long-standing low-contrast labels which are
  recorded rather than changed, and a check ratchets them so they cannot get
  worse. Validation: 115 unit tests and 69 Chromium scenarios with 1 skipped.
  Colour-vision accessibility, non-text contrast and Firefox or WebKit rendering
  are not established; see [the design record](docs/experiments/46-colour-theme.md).
- Fix a latent defect in the encrypted-project dialog: opening it again before the
  previous one had closed left two elements sharing one id, which is invalid and
  made the dialog ambiguous to find. Opening is now idempotent. This was
  intermittent and predated the theme work.

## 0.5.0 — 2026-10-08

- **Change the All touched clipping rule to match GDAL.** A cell is now included
  only when the clipping boundary covers part of its area or crosses its
  interior. A boundary edge lying exactly on the border between two cells no
  longer pulls in the cell outside it, and the cropped window is no longer
  padded by a fraction of a pixel. Measured cell by cell against rasterio 1.5.2
  with GDAL 3.12.2, differences over a deliberately pixel-aligned cutline fall
  from 35 cells to 2, and the window now agrees; the residual 2 cells come from
  GDAL burning cells along a cutline vertex lying exactly on a cell border,
  which is an artifact of its line rasterizer rather than a stateable rule.
  **Migration:** re-running a saved All touched clip can retain fewer boundary
  cells, so a total derived from one can change. Cell center inside is
  unaffected. `clip_raster` is released as 1.0.0 with that effect recorded.
- Validation: strict TypeScript, production build, **112 unit tests**, ontology
  SHACL conformance, widget-registry validation at 33 widgets and 64 releases,
  and **63 Chromium scenarios with 1 skipped** (the local WorldPop raster, which
  is not bundled). Independent recomputation in the Validation Lab confirms
  reprojection against pyproj and cell-centre clipping against GDAL, and records
  a 2-cell residual on all-touched. **Not established:** scientific suitability,
  privacy effectiveness, cartographic suitability, or Firefox and WebKit
  behaviour. A first WebKit run passed 31 of 64 scenarios, with 21 of the
  failures attributable to the test harness rather than the application and the
  remainder untriaged.
- Record the inclusion rule and the outer margin in N3 evidence as
  `fw:rasterMaskConvention` and `fw:rasterMaskMarginPixels`, constrained by
  SHACL. Receipts previously stated only a method name, so two clips made under
  different rules, or with different margins, were indistinguishable in their
  evidence. Receipts exported before this change carry no convention and were
  produced by the earlier, more inclusive rule.
- Add a **Reproject input** source widget that imports a local CSV or GeoJSON in
  WGS84 UTM metres and converts it to CRS84 longitude/latitude, so projected
  files can reach the existing point widgets for the first time. The conversion
  runs once on import and replays offline; the output is the ordinary CRS84
  points contract, so no downstream widget changes.
- Record the declared source EPSG code, exact proj4 definition, axis order,
  units, operation, library version, converted and unconverted counts, maximum
  round-trip error and an explicit `datumShift: none` with the imported points.
- Admit WGS84 UTM zones only. A file on another datum needs a datum shift this
  prototype does not implement, and is refused rather than approximated.
  Coordinates outside the UTM easting/northing ranges, points outside the
  declared zone's validity guard and round-trip disagreements above 0.01 m are
  refused with an explanation.
- No workflow migration is required; existing saved projects are unaffected.
- Validation of this work in progress: strict TypeScript, production build, 111 unit tests, ontology and
  widget-registry checks (33 widgets, 63 releases) and 63 Chromium scenarios
  with 1 skipped. Unit checks assert UTM definitional invariants, round-trip
  tolerance and guard refusals. **Not established:** agreement with PROJ or
  GDAL to a stated tolerance, any datum other than WGS84, that a declared zone
  or hemisphere is the correct one for a given file, or Firefox and WebKit
  behavior. Raster warping is specified in
  [experiment 40](docs/experiments/40-reprojection-primitives.md) but not built;
  `raster_input` keeps its no-resampling contract.

## 0.4.0 — 2026-10-07

- Make Map outputs standalone communication views with configurable title,
  subtitle, visible map key, source/method note and local SVG export. Interactive
  polygon maps can choose no basemap, OpenStreetMap streets or OpenTopoMap
  terrain; online tiles are requested only for the current view and are absent
  from the SVG. Record the bounded map plan in N3 and validate it with SHACL.
  Existing saved maps default to local geometry; no migration is required.
  Validation covers structural evidence and Chromium interaction, not
  cartographic suitability or the correctness of source citations.

- Add an opt-in, locally bundled Vega-Lite Chart enhancement for the existing
  categorical counts: bar or dot marks, orientation, title, subtitle, axis
  labels, optional color legend, source note, SVG export,
  an underlying values table and an inspectable specification. Classic bars
  remain the default for saved workflows; no migration is required.
- Record the bounded chart specification in N3 and validate its structure with
  SHACL. This does not establish scientific correctness, chart suitability or
  practitioner comprehension. Local browser and cross-browser validation are
  recorded in [the spike note](docs/experiments/37-vega-lite-chart-spike.md).
- No saved-workflow migration is required. The release build passed 101 unit
  tests, ontology and widget validation, and a Chromium desktop/narrow-screen
  version check. Scientific suitability and Firefox/WebKit behavior remain
  unverified for this release.

## 0.3.0 — 2026-10-07

- Add a collapsible widget library and full-screen workbench and Results views,
  with Escape to restore the normal layout. No workflow migration is required.
- Add a John Snow geoprivacy experiment with configurable donut displacement,
  H3 cell aggregation, private before views, derived after maps/tables, and demo
  GeoJSON downloads. Compare original and moved locations in side-by-side maps
  with mean centers and pump context. The notebook map-encryption transform and contextual hide
  operation remain planned. No workflow migration is required.
- Expose Mean center as a reusable processing widget on both original and moved
  branches; Compare point sets consumes their typed outputs and verifies source
  identity, CRS, and counts. Existing saved comparisons retain their earlier
  three-input behavior.
- Local validation passed 99 unit tests and 60 Chromium browser scenarios,
  including the Botswana WorldPop GeoTIFF, desktop and narrow-screen version
  badge, positive and negative SHACL cases, and N3/evidence inspection.
  Privacy effectiveness and Firefox/WebKit behavior are not established.

## 0.2.0 — 2026-10-07

- Display the application version next to the Fieldwork mark, sourced from the
  root package version.
- Establish a versioning policy that distinguishes application releases from
  widget, ontology, workflow schema, and project revision versions.
- Add this release-note record.
- No workflow migration is required. The local build, widget and ontology checks,
  and a desktop/narrow-screen browser check passed. Broader browser regression
  runs are part of the publication pipelines.

## 0.1.0 — 2026-10-07

- Publish the browser-based visual GIS prototype to GitLab Pages and replicate
  the same source commit to GitHub Pages.
- Add shared study-area, point, raster, network, catchment, map, table, and chart
  workflow primitives, including the Old Naledi and John Snow worked examples.
- Export N3 and provenance evidence, validate runtime RDF with SHACL development
  checks, and package local projects with their binary reference assets.
- Validate the release with 94 unit tests and 57 distinct Chromium scenarios.
  Firefox, WebKit, and scientific outcome validation remain open.
