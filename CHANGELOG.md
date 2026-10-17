# Fieldwork release notes

The application version follows the policy in [AGENTS.md](AGENTS.md). A version
shown in a local build is not a claim that it has been published.

## 0.9.0 — In development

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
