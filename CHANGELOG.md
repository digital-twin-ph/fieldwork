# Fieldwork release notes

The application version follows the policy in [AGENTS.md](AGENTS.md). A version
shown in a local build is not a claim that it has been published.

## 0.107.1 — 2026-11-13

- **No text under 14 px in any figure.** Chart and map figures, on screen and downloaded as SVG or PNG, had subtitles,
  legends, tick labels and notes at 11 and 12 px; they are 14 px now, axis titles 15. Lines wrap sooner, so a figure
  with a long subtitle is taller. The small labels inside catchment, point comparison, raster and study area drawings
  went to 14 px as well. Chart 0.20.1, Map 0.27.2.

## 0.107.0 — 2026-11-13

- **Chart's Configure… previews the chart.** The last run is drawn with the settings as they are being edited, before
  Apply, as Map's preview is. Nothing is run again.
- **Draw, question first.** The forms that suit the data come first, each named by the question it answers ("Who
  infected whom? Transmission tree"), and the reason for the one chosen is said beneath it. Forms that need other data
  are listed after, with what they need. Experiment 210's proposer, for the forms Chart draws today. Chart 0.20.0.
- **Fixed: a chart in Results was cut off at the bottom.** Its box scrolled inside the Results panel and was shorter than
  the figure, so the stacked curve's dates showed only their last characters.

## 0.106.0 — 2026-11-12

- **MERS: where were the cases in hospital?** A third workflow in the MERS example counts the cases by the hospital the
  line list names, relates each count to the hospitals table, and maps the hospitals over South Korea's 17 provinces,
  each mark's area in proportion to its cases (1 to 80). 365 Seoul Yeollin Clinic has no position and is listed, not
  drawn. Example de79282.
- **Fixed: a study area whose units sit inside one another's holes was refused.** South Korea's 17 provinces were
  refused as "one part of the area lies inside another": Gwangju sits in a hole of South Jeolla, Daegu in one of North
  Gyeongsang. Study area 0.9.1.
- **Size by, for points made from a table.** Map offered Size by only for a layer whose records are kept in its step; it
  now also reads the map's last run. Map 0.27.1.
- **The MERS data, researched:** what the package documents, where its data came from, other open data on the same
  outbreak, and dates of the response, in `docs/research/mers-korea-2015-sources-2026-11-12.md`.

- **Chart's ports, standardized.** Two ports, **Table** and **Polygon summaries**, named the same on the canvas and in
  the Inspector; the node used to read Series, Records and Catchment polygons. A case series connects to Table and is
  drawn as its curve, as before. A workflow saved with the old Series port opens with that connection on Table. Chart
  0.19.0.

- **Tabular data's Inspector, standardized.** Settings ends with **Configure…**, as every standardized Inspector does.
  **Fetch the table** is now under Result, beside "Not fetched yet." Table input 0.9.3.

- **Fixed: Manage layers did not change which marks are drawn on top.** The order was saved and not used. Point layers
  are now drawn in that order, on the static map, in its figure and on the interactive map, and a move shows at once.
  Map 0.27.1.

## 0.105.0 — 2026-11-12

- **An epidemic curve stacked by a column.** Cases by period can count each value of a column, and Chart draws the
  curve as stacked bars, one colour a value. Hagelloch's *Who fell ill?* now stacks its weekly curve by school class: the
  first class rises first, then the second, then the pre-school children. Cases by period and Chart 0.18.0,
  experiment 210.

## 0.104.0 — 2026-11-12

- **A chart marks dates.** On a time axis, such as an epidemic curve's, **Marked dates** in Configure… draws a dashed
  line at each day with a label in your own words, several to a chart. John Snow's *When did people die?* marks 8
  September 1854, *Pump handle removed*, where the curve had already turned. Chart 0.17.0, experiment 210.

## 0.103.0 — 2026-11-12

- **Map sizes marks by a number: proportional symbols.** A point layer's marks can take their area from an attribute,
  such as deaths at an address, with the key saying what the size shows and over what range. John Snow's *Where were the
  deaths?* now draws each address in proportion to its deaths, 1 to 15, as Snow drew them in bars, inside a rectangle
  fitted to the deaths and pumps. Map, experiment 210.
- **A tall study area is drawn large.** A static map's frame was a fixed 850 by 295, so an area taller than wide, such as
  Soho's deaths or Hagelloch, was drawn small in a short strip. The frame now follows the area's shape, up to 850 by 650,
  on screen and in the downloaded figure, and the panel scrolls; a wide area draws as before.
- **Fixed in a test only:** `example-updated` waits for the run the cluster example starts on opening.

## 0.102.0 — 2026-11-12

- **John Snow asks one question in each workflow.** *Where were the deaths?*, *When did people die?*, *Which pump was
  nearest?*, *Who lived within a walk of the pump?* and *How far did it spread?*, each named as its question; the epidemic
  curve, drawn three times before, is drawn once. The workflows that were kept keep their addresses. Geoprivacy stays,
  last, until it becomes a worked example of its own. Experiment 210.
- **Chart draws a population pyramid**: two groups back to back by band, the youngest at the bottom, with the rows the
  group column leaves blank said and not drawn. Hagelloch's *Who fell ill?* now draws its cases by age and gender this
  way, where it drew two panels. The first of the forms experiment 210 sets out for Fieldwork to propose from the data.
  Chart 0.16.0.

## 0.101.1 — 2026-11-12

- **Sample a raster names its ports on the canvas**: Points, Areas, Study area, Raster and Satellite files, and its
  output by what it gives, Points → or Areas →, where it showed five unnamed dots. A single point port now reads
  "Points" on any widget, not "Points 1". Sample a raster 0.4.1.
- **Fixed: 0.101.0's checks stopped before its browser tests on GitHub**, because the MERS lab fixture's builder needs
  the MERS repository, which GitHub's runner does not check out. It is now named and skipped there, as other builders
  needing a local copy are.

## 0.101.0 — 2026-11-12

- **Every number in a step's sentence comes from its result, and the gate checks it.** Each worked example, the built-in
  ones and those in their own repositories, is run and every number its steps' sentences state is looked for among that
  step's results: 420 numbers in 176 steps, none made up. Each is run twice, and every output and table is the same both
  times. Experiment 208.
- **The MERS example is checked end to end against pandas** (Validation Lab check 49): every case's days and verdicts,
  every count, Relate's rows and the transmission tree, recomputed from the source files. It agrees exactly.
- **A key value written with spaces around it is still read without them, and now that is said**, on the Data quality tab
  and in the receipt, as *Spaces trimmed*: MERS's contacts write "Family member " once. Table input 0.9.2.
- **A record is named by its key** in a step's sentence: Hagelloch's serial interval named four records as everything they
  held. Apply ruleset 0.13.1.
- **Counts a sentence states are in the receipt too**: Find health facilities records what it set aside and the total
  (0.4.2); Relate records the keys that matched several rows (0.12.1).
- **Where MERS's hospitals are.** The MERS example's repository now has each hospital its line list names, as written,
  with the facility it is, coordinates from OpenStreetMap or Wikidata, and how sure the identification is: 11 of 13 placed
  at the facility, one only at its street, one not at all. Under the ODbL, as it carries OpenStreetMap data.
- **Fixed: tables in four example repositories were fetched from commits the 2026-11-11 history rewrite replaced.** GitHub
  still served them, but only until it collects what nothing points to. They now point at the rewritten commits: the
  same files, with the same digests.

## 0.100.0 — 2026-11-12

- **Compare with a target…** in the rules dialog writes one interval against one target as ordinary rules: the days from
  one column to another, the target as a setting, Met and Not met, and No verdict where a value is missing. 7-1-7 by
  hand is this three times.
- **7-1-7 2.0.0 reads as words**: `detected_within_target`, `notified_within_target`, `responded_within_target`, valued
  Met, Not met and No verdict. 1.0.0 stays for workflows that pin it.
- **A rule's otherwise writes the column its rules name**, rather than a second column under the term's own name.
- **Fixed: a study area reaching just past a raster stopped Raster input.** Botswana's provinces from geoBoundaries
  against WorldPop's file for Botswana, two outlines of one country that differ at the border, read "Boundary extends
  beyond available raster coverage". The step now keeps the part the raster covers and says how far past which edge the
  area reaches; the run records it as a data issue, *Area beyond the raster*. Raster input and Clip raster patched.
- **A whole country's raster fits.** Botswana at 100 m, 123.2 million cells from WorldPop, was read, kept, stored,
  carried in an encrypted workflow, clipped and drawn in Chromium, and the cell cap is now that measurement (it was 16.8
  million, a province). Getting there removed three limits nobody had measured, a 5 MB file, a 64 MB decoding budget and
  10 MB of rasters and PDFs together, and two obstacles: the GeoTIFF library took 32 s to write the window, now 0.2 s,
  and the browser stores no single value over 133 MB, so a large file is stored in parts. A workflow file carries at most
  about 177 MB of files, measured; past that it says to use *This workflow, encrypted*.
- **Regression is on the standard Inspector and dialog.** The panel says in one sentence the model it will fit, and
  after a run what it estimated and which rows it used and left out; every setting is in **Configure…**, applied with
  **Apply**. The model is unchanged. Regression 0.6.0.
- **A long run shows its progress.** After a second, a panel names the step being computed and how many of the
  workflow's steps are done, and a Regression with several exposure columns counts its models as it fits them. Brazil's
  lag workflow had held the page for 35 s with nothing moving. Each model is still fitted on the page, so the page waits
  for one model at a time.
- **A chart in the notes is the chart on screen.** A chart drawn with the enhanced renderer appears in the notes as the
  same figure its SVG download gives; Brazil's rate ratios with their intervals had shown only a line asking for the
  enhanced renderer. Its description counts what is drawn, estimates with their intervals, points on a line or dots,
  rather than calling them all bars. Chart 0.15.1.
- **Chart draws a line**, along the categories in their order. Chart 0.15.0.
- **Every recorded source in a transmission tree.** A case recorded with several sources sits under the first, and each
  other recorded link is drawn dashed and counted. MERS's second workflow now draws who infected whom: SK_39 records
  three sources and SK_107 two.
- **Relate can keep one row per match**, where a key matches several rows, saying how many. Relate 0.12.0.
- **A saved copy of an example says when the example has been updated**, in the bar under the toolbar, with *Load the
  updated example*; it said only "changed since", whether the example had moved on or you had. Hagelloch's cluster
  workflow saved before the day-by-day replay was added is the case that showed it.
- **The rules dialog reads as words.** A published ruleset's names and values showed their vocabulary prefix
  (`fw:detectionWithinTarget is fw:Met`); they now read as the results table shows them (*detectionWithinTarget* is
  *Met*), and a setting is named by what it means (*Days from emergence to detection · 7 days*).
- **Make bands…** in Apply ruleset writes the rules for age bands, or any bands of a number, from cut points, with no
  gap or overlap. Apply ruleset 0.13.0.

## 0.99.0 — 2026-11-12

- **Cases by month of the year**, January to December, every year's January together, all twelve kept: a season across
  years of data. Cases by period 0.4.0.
- **Fixed: a step's warning counted a record once per column it lacked.** MERS's 162 cases read "189 records the rules
  could not read". Records are now counted once each: "27 of 162" for one column, "162 of 162 … in 2 columns" for two. A column no record
  carries, such as 7-1-7's response date on MERS, is one finding, *Field missing*, not a missing value in every record.
- **Table and Apply ruleset describe themselves as they are**: "Show what is connected as a table", and "Apply declared
  rules to each record, to classify it or compute a value". Table still mentioned catchment summaries and review
  decisions. A workflow started blank says it was built on a *Blank canvas*, not a "study area experiment".
- **No count of records can exceed the records.** Each data issue carries the records it found, and one function counts
  across issues by their union, so a record lacking two columns is counted once.
- **Sierra Leone: who were the cases?**, a fourth workflow: cases by sex, and by age band (0, 1 to 4, 5 to 9, 10 to 14,
  15 and over) with one panel per sex.
- **Chart orders bands that begin with a number by that number**: 0, 1 to 4, 5 to 9, 10 to 14, 15 and over, not as text.
- **Fixed: the georeferencing dialog's basemap filled only part of its pane** after the dialog was reopened, at every
  zoom. The map now re-measures its pane whenever the pane changes size.
- **Chart and Cases by period describe themselves as they are**; Chart still spoke of decisions, access zones and
  evidence tiers.
- **Cases by day of the week.** Cases by period counts by day of the week, Monday to Sunday, all seven kept. Hagelloch's
  first workflow shows it beside the epidemic curve: Thursday has most prodromes, 34, which is within chance. Its
  settings are in Configure… now, on the standard Inspector. Cases by period 0.3.0.
- **Data issues have their own ontology**, `ontology/data-issues.ttl`, built on W3C's Data Quality Vocabulary: one kind
  of thing and fifteen kinds, from *No value* to *Rules disagree*. The Data quality inspector, the warning on a step and
  the run's N3 receipt use the same labels, and the receipts of Table input and of Apply ruleset now state each issue.
  Table input 0.9.1.
- **The warning on a step opens whole, in a dialog**, with headings for what its rows are; *Site* and *Distance* showed
  over every warning, left from a retired example.
- **7-1-7's columns are in the ontology**, tied to the milestones and targets of `ontology/response-timeliness.ttl`, and
  each record's dates, days and verdicts are in the receipt.
- **Fixed:** a step whose rules compute values wrote a receipt holding only its timing, beginning "undefined".

## 0.98.0 — 2026-11-12

- **7-1-7 timeliness, a published ruleset.** Days from emergence to detection, detection to notification and
  notification to the end of early response, each Met or NotMet against 7, 1 and 7 days (step settings), and NoVerdict
  where a date is missing. Cited to Bochner et al. 2023. Apply ruleset 0.12.0.
- **Choose which column a published ruleset reads**, in Apply ruleset's Configure…, under *Which column holds each*.
- **Fixed:** a column of rule conclusions holding one value on every row was shown as a table's variable name, and lost
  its own column. Table 0.10.1.
- **MERS-CoV, South Korea, 2015**, a worked example in its own repository: how quickly each of 162 cases was detected
  and reported, against 7-1-7 (94 of 135 detected within 7 days of onset, 161 of 162 reported within 1 day).
  And who infected whom, and where: the 98 probable links counted by source and by setting of exposure.

## 0.97.0 — 2026-11-12

- **WorldPop's newer release, for any year from 2015 to 2030.** Raster input's Configure… offers WorldPop Global2
  R2025A beside Global1 (2000 to 2020), for any of 242 countries; choose the year your project needs. Its citation and
  DOI, its licence and its alpha status are shown with the download. Raster input 0.11.0.
- **Raster input's Configure… is the standard dialog**, with ×, Cancel and Apply.
- **Hagelloch: who fell ill**, a fifth workflow: the 188 children by age and gender, and by school class, as the file
  records them; the 11 with no gender are counted as their own group.
- **Fixed:** a chart's panels drew numbered categories in row order (ages 7, 6, 4 …) and left a panel for a blank value
  empty and unnamed. Numbers now run in order, and the blank panel is drawn and named. Chart 0.14.1.
- **WorldPop's list is checked weekly** against WorldPop's site, and a change comes as a pull request.

## 0.96.0 — 2026-11-11

- **Old Naledi and the heat example retired** as worked examples, after an audit of what only they used
  (docs/audits/old-naledi-audit.md). **Select nearby facilities**, **Evidence register** and **Travel time from
  distance** retired with them; Keep points inside the area, Table and Apply ruleset do what they did. A saved workflow
  holding one refuses to open, naming it.
- **A first visit opens Measles in Hagelloch, 1861**, rather than the synthetic heat example.
- **No ruleset has code of its own any more.** Outreach criteria, Diagnostic evidence, Access review and Extent review
  retired, with the six code paths Apply ruleset kept for them. Rules you write in a workflow keep working, under their
  own name rather than a published ruleset's. Snow's outbreak extent keeps its outline, map and curve without its rule
  step.
- **Map, Table and Chart take no decisions input:** nothing produces one now.
- **Fixed:** a published ruleset is now cited in the run's record wherever it runs, including the sea-level example's.
- **No caption on a static map.** "STUDY AREA · SPATIAL COVERAGE" and "Select a point to review its relation to the
  study boundary" no longer print across the figure; the Study area map's "Go to Old Naledi" button is gone.

## 0.95.0 — 2026-11-11

- **Mean, smallest and largest cell over each area, if you want them.** Sample a raster's Configure… has a box, *Also
  give each area's mean, smallest and largest cell value*. Ticked, each area also carries `cell_mean`, `cell_min` and
  `cell_max`, of the cells with a value. Off by default. Sample a raster 0.4.0.
- **A point layer's colour, in the Map's Configure….** Beside each layer's mark and size: one of six colour-blind-safe
  colours, by name, or the default. The Hagelloch cases on the 1824 sheet are now vermillion, not near-black. Map 0.25.0.
- **Fixed:** the heat example's captions ("Synthetic neighborhoods and cooling centers", and the Inspector's note about
  them) showed on every workflow without captions of its own, Hagelloch's among them. They show on the heat example only.
- **Fixed:** on a phone in Safari the page scrolled sideways by a few pixels (0.94.0). The header's controls now take a
  second line under the mark at phone width, where the storage figure can be read.
- **Fixed:** on a phone in Safari the header's second line sat under the project bar, which took taps meant for the
  storage figure (0.95.0). The header now grows to hold both lines.

## 0.94.0 — 2026-11-11

- **Sample a raster at points or over areas.** One step for sampling a grid. Connect a Raster input and points, as
  before; or a Raster input and areas (a Polygon layer, or a Study area's units) to get each area's **total**: the
  cells whose centre is inside it, added, with how many cells that was, how many had no data and how many lay beyond
  the raster. For a population grid that total is the grid's estimate of the people in the area. A cell counts whole,
  not split by the edge. Sample a raster 0.3.0.
- **Sample satellite files retired into it.** Connect Search a satellite catalog to its **files** port and it reads as
  before. A saved workflow holding the old step opens migrated, its settings kept, and says so.
- **"Available offline" removed from the header.** It came from one cached file and did not mean everything was ready.
  On a phone the storage figure now shortens instead.

## 0.93.0 — 2026-11-11

- **GHS-POP beside WorldPop and GRID3.** Raster input's Configure… offers the JRC's global population grid for any
  country and any year from 1975 to 2030. Only the window over your study area is read, from JRC's copy online, so there
  is no download first. Said with its licence, citations and limits. Raster input 0.10.0.

## 0.92.0 — 2026-11-11

- **Placing a point on today's map, precisely.** The hand moves the map; **Shift + click** places the point, with a
  crosshair while Shift is held; **press and hold** a numbered point, then drag, to move it, its coordinates shown as it
  moves. A plain click says how. Georeferenced map image 0.6.0.
- **Fixed:** the errors in rows marked *check this pair* were light text on a light background in the dark theme.

## 0.91.0 — 2026-11-11

- **Every Configure… dialog reads the same way.** Each control on its own line with its label above and its help below;
  numbered steps and groups as cards with plain headings; boxes and menus lined up; what is still missing in amber, and
  red kept for what failed. A step still carrying its widget's name no longer shows it twice in the title.

## 0.90.0 — 2026-11-11

- **GRID3 beside WorldPop.** Raster input's Configure… offers a population source: WorldPop for every country, or GRID3's
  2025 estimates for the 52 countries of sub-Saharan Africa, one file each, with its size, licence, citation and limits.
  Botswana's is 11.6 MB against WorldPop's 293 MB. Raster input 0.9.0.

## 0.89.0 — 2026-11-11

- **The Polygon layer on the standard panel.** Name, study area, one sentence of what it holds, and **Configure…**, which
  holds where the features come from, what to read and how to name them. **Apply** is the read: the dialog says each
  stage while it works and closes when the layer is kept; if the read fails it stays open and says why. Polygon layer
  0.4.0.

## 0.88.1 — 2026-11-10

- **More room in the workspace store.** A step's large data is now kept in the data store, by content, whatever brought
  it: a worked example's points and street network were saved inline in every workflow, twice. Opening every worked
  example took 1.6 MB of the 5.2 MB store; it now takes 0.25 MB. Workflows already saved are moved on the next start, and
  only where the data store confirms it holds the copy.

## 0.88.0 — 2026-11-10

- **OpenStreetMap under every map, unless you choose otherwise.** A static plot fetches the tiles once and draws them
  into the figure and its SVG and PNG, with the credit. Choose *None* to keep a map offline. Where tiles cannot be
  fetched, the figure says so and keeps its plot.
- **The Map's Configure… in groups**: Presentation, Basemap, Layers, the marks, Lines between records, and Title, key and
  note. On an interactive map, PMTiles import is under Basemap. The preview shows the basemap the settings chose.
- **The layer list is readable in the dark theme.** It was light text on a white panel. A test now measures every map
  control in both themes.
- **Fixed:** the basemap's credit replaced a map's own note, and its limitation was filed apart from the figure, which
  failed the write-up's own check. Map 0.24.0.

## 0.87.0 — 2026-11-10

- **Zoom where you are looking.** Placing a map image by points, a crosshair marks the centre of the image pane, and Zoom
  in keeps what is under it in place; the pane no longer jumps back to the corner after each click.
- **A worked example's pulse only on its own image.** On a different image the example's positions point at nothing, so
  no pulse is shown and the dialog says why. Georeferenced map image 0.5.0.
- **Hagelloch's day-by-day circles say what they mean.** Each day's circle is coloured by that day's p, at or under 0.05
  or above it, and the map's key names both. Before, every circle was the same blue. Space-time scan 0.4.0; the key no
  longer hides under the day panel on a short map, Map 0.23.2.

## 0.86.0 — 2026-11-10

- **What changed, from the version button.** Click the version beside the Fieldwork mark to read the release notes for
  its series, every 0.86.x release together, newest first. Step back through earlier series, and reach the full changelog. The notes travel with the
  application, so they open offline too. The mark itself still goes home.

## 0.85.1 — 2026-11-10

- **Hagelloch's 1824 sheet is served.** *Use this example's image* answered "could not be fetched (404)" on the published
  site: the sheet was in the repository but not among the files the site publishes. A test now checks every file a
  worked example offers.

## 0.85.0 — 2026-11-10

- **A study area across a border.** A study area now states its countries, one or more. **Configure countries…** names
  them, or finds them from where the area falls, each with its share of the area (*86% Botswana, 14% South Africa*), for
  you to confirm. A study area saved with one country opens with a list of one. Study area 0.8.0.
- **WorldPop across a border.** Where the study area states several countries, Raster input offers those and says it
  reads one file, so the rest of the area has no population from it. Raster input 0.8.0.
- Find health facilities still queries one country's register; across a border it asks which.

## 0.84.1 — 2026-11-10

- **A cleared point field is empty, not zero.** Placing a map image by points, a field emptied or replaced before it was
  read put the point at the image's top edge or on the equator. Georeferenced map image 0.4.1.

## 0.84.0 — 2026-11-10

- **Workflows are numbered within their project**, 1 to N: Hagelloch's are 1 to 4, John Snow's 1 to 4, Old Naledi's 1
  and 2. They had run on across projects, with gaps.

## 0.83.0 — 2026-11-10

- **Feedback while you match pairs.** Placing a map image by points, a box under the table now says how far the pair
  you just made is from where your other pairs put it, the scale and turn the placement implies, and the overall error
  as pairs were added. Over today's map it shows how far your cursor is from where the other pairs expect the feature,
  with a reminder to find the feature by looking first.
- **Preview on today's map**, with a see-through slider: the image as placed over today's map, each pair drawn twice.
  Georeferenced map image 0.4.0.
- **Hagelloch's 1824 sheet, placed by hand.** A fourth Hagelloch workflow offers the village's cadastral sheet of 1824
  and four street junctions to find. Placed north up from them, the village sits within 4 m of where the sheet's own
  frame puts it.

## 0.82.0 — 2026-11-10

- **Where to look, in a worked example.** Placing a map image by matching points, an example can now name each feature
  to find and why. A slow pulse marks the area on the image and on today's map, and the dialog says whether your click
  landed on it. Nothing is filled in for you. **Show where to look** turns the pulse off; reduced motion keeps it still.
  Georeferenced map image 0.3.0.

## 0.81.2 — 2026-11-10

- **Hagelloch's houses sit on the houses of the 1824 map.** The cases were fitted to the buildings drawn on the
  cadastral sheet NW III 3: 47 of 56 houses fall on one, north up and at the source's own scale, against 63–68% for
  random points. Every case moved together, 151 m west and 51 m south; no distance between cases changed.
- **Today's buildings agree.** Fitted to today's OpenStreetMap footprints instead, the houses land within 3 m of the
  1824 placement, north up and at the same scale.
- **Correction to 0.81.1.** The scan's circle count does still depend a little on where the village sits: moved to the
  1824 fit, Hagelloch has 1,305 circles, not 1,307. Every cluster and p-value is unchanged; lab checks 45 and 46 agree.

## 0.81.1 — 2026-11-10

- **Hagelloch is where Hagelloch is.** Its cases were placed 3.7 km east, in Tübingen's Waldhäuser-Ost, from a wrong
  coordinate; the 1824 cadastral sheet, OpenStreetMap and the German Wikipedia agree on the village 3.7 km west. Every
  case moved together, so no distance between cases changed.
- **The space-time scan's circles no longer depend on where a place sits.** Houses within 10 cm of the same distance
  join a circle together. Hagelloch's clusters and first day flagged are unchanged. Space-time scan 0.3.1; lab check 46
  re-run.

- **A study area acquired as administrative units hands its country to every step that needs one.** The country was
  read from the wrong place, so an area picked as Botswana's districts stated none: Raster input asked again, and so
  could Find health facilities. Fixed for every saved project, and the country is now found
  upstream, through any step between the study area and the step that needs it; two countries upstream are named and
  one is chosen.
- **WorldPop is reachable from Raster input's Configure… whatever the study area.** Where the area states no country,
  the dialog asks for it, keeps it on the area, and offers the year and the download at once. Raster input 0.7.2.
- **A map image's port is named on the canvas**: *Map image (ground)*, where it read "Points undefined". Any port the
  canvas does not know is shown by its own name.
- **Checked by somebody else's code**: lab check 48 places South London's Map 2 from its four points with GDAL's own fit
  and gets the same placement as Fieldwork, to the last digit.

## 0.81.0 — 2026-11-10

- **Place a scanned map by matching points.** Georeferenced map image's Configure… offers *By matching points on the
  image and today's map*: click a feature on the image, then the same feature on the map, or type the numbers. Each
  point shows its error in metres, and a doubtful pair is marked. Fitted north up, or turned and stretched. Georeferenced
  map image 0.2.0.
- **A turned map image is drawn turned**, on the static figure and the interactive map; a world file that turns the
  image is placed, no longer refused.

## 0.80.2 — 2026-11-10

- **Raster input no longer asks for the country again.** It is read from the study area, and WorldPop's population
  raster, its year and its download are in Configure…. Raster input 0.7.1.

## 0.80.1 — 2026-11-10

- **Map's preview in Configure… no longer raises errors.** It mounted and removed a map on every change, and a canvas
  layer could redraw after its map was gone; the page reported an error, seen first in Safari. Fixed. Map 0.23.1.

## 0.80.0 — 2026-11-10

- **A worked example's write-up says where it lives online.** At the foot of References, two QR codes with their
  addresses printed beneath: Fieldwork with the example opened, and the example's own files at the version it was made
  from. Codes are drawn on your device.
- **A link opens any worked example.** `?example=oswego-1940` (or any catalog example's name) downloads it, checks it
  against its pinned digests, and opens it, as its button does.
- **Checked by somebody else's code**: lab check 47 reads every code back with OpenCV.

## 0.79.0 — 2026-11-10

- **Watch the space-time replay day by day on the map.** On an interactive Map, **Play** or drag the slider: each day
  shows that day's most likely cluster, the cases known by then, and what the scan said. Hagelloch's *Was there a
  cluster?* has it. Space-time scan 0.3.0.
- **Generations in colour, in the tree and on the map.** Chart's transmission tree and Map's lines between records share
  one colour key, darkest for a chain's first case. In the tree, a case's shape now says what it is. Chart 0.13.0.
- **Map's Configure… draws the map**, beside its settings, before you Apply, so a mark's size or a basemap is seen as you
  choose it. **Import tiles** (PMTiles) moved there from the Inspector. Map 0.23.0.
- **The note under an interactive map** no longer describes travel times on a map that has none.

## 0.78.0 — 2026-11-10

- **The space-time scan replays an outbreak day by day.** Under **How to scan**, choose **Day by day**: each day, the
  cases known by then, and only clusters still going on. It says the first day the p-value was at or under 0.05. On
  Hagelloch: 21 November 1861. Each day's p-value is that day's alone, and the step says so. Space-time scan 0.2.0.
- **The scan writes a Methods note and cites its method**, Kulldorff and others 2005, which reaches References.
- **Checked by somebody else's code**: lab check 46 recomputes the scan and the replay in numpy, and agrees. It found
  the scan missing one circle of houses, now fixed (0.1.1); no cluster changed.

## 0.77.0 — 2026-11-10

- **Space-time scan, the first step under Detect.** For a line list of cases with dates and places: the space-time
  permutation scan SaTScan runs, looking for places where cases came closer together in time than the rest of the list
  would lead you to expect. Circles over places, runs of days or weeks, a p-value from shuffling the dates with a
  recorded seed, secondary clusters that share no place. Runs with a progress bar. Space-time scan 0.1.0.
- **Hagelloch has a third workflow, *Was there a cluster?***: one house, 8 cases where 0.55 were expected, at the start
  of the outbreak.
- **Table shows a polygon layer's own properties**, which it used to leave out.
- **Map's lines between records are checked by somebody else's code**: lab check 45, against pandas.

## 0.76.0 — 2026-11-10

- **Lines between records on Map.** In Configure…, choose a column that names another record, such as `infector`,
  and the column it is found by, such as `case_ID`. A line with an arrowhead runs from the named record to the one
  naming it, on the static figure and the interactive map, and the key names it. Every record is counted: drawn, at
  the same place (90 of Hagelloch's 184 links join two children of one house), naming nothing, or naming a record
  that cannot be found or placed. Map 0.22.0.
- **Hagelloch's *Who infected whom* has a map of the links.**
- **Chart's transmission tree is checked by somebody else's code**: lab check 44 recomputes every case's chain and
  generation with networkx, and they agree.

## 0.75.0 — 2026-11-09

- **Who infected whom, drawn: a transmission tree in Chart.** Set **Draw** to *Transmission tree* in Configure… and
  name the case, infector and date columns. Each case is a point at its date; a line runs from its infector, so its
  length across is the serial interval. Drawn by Vega-Lite and exportable. Cases with no infector, an infector not in
  the table, a loop or no date are counted and coloured apart, never dropped. Chart 0.12.0.
- **Hagelloch has a second workflow, *Who infected whom***: the serial interval, secondary cases per child and the
  tree, ready to run.
- **Chart is on the standard Inspector**: name and write-up section, inputs, one sentence and Configure…, which holds
  every setting it had.
- The Sierra Leone, NYC and Brazil examples' manuals set Chart in Configure…; re-pinned.
- Validation: Chromium locally; WebKit in CI.

## 0.74.0 — 2026-11-09

- **Satellite readings are kept on this device.** Sample satellite files keeps what each file gave at your places, a
  few numbers per place, so a file read before the same way is not read again after a reload or on another day. The
  result says how many files came from the device, and the receipt records it. Configure… can read every file again,
  or forget the saved readings. Sample satellite 0.7.0.
- **Sample satellite is on the standard Inspector**: name, inputs, one sentence, Configure… and the last result.
- **Table's inputs are streamlined like Map's**: the node shows what is connected and one + Add an input; the
  Inspector has one Add an input picker. The table port no longer reads "Points undefined". Table 0.9.0.
- **The line under a workflow's title** no longer describes the example it started from once it has changed.
- Experiment 200: resources and procurement are in reach; remote coordination of a multi-site investigation added as
  an open question; open data and studies listed for each 7-1-7 bottleneck theme.
- The Brazil dengue example's manual sets the place column in Configure…; re-pinned.
- Validation: Chromium locally; WebKit in CI.

## 0.73.1 — 2026-11-09

- **John Snow's outputs no longer overlap on the canvas**: Table, 317 px tall, lay under Chart, so a click on Table
  could select Chart. Each output now starts below the one above it.
- Tests: a run's progress is recorded as it happens rather than caught on screen; a request WebKit reports when a
  test's navigation cancels it is no longer counted as an application error; Hagelloch's offline test visits once.
  These failed WebKit, and once Chromium, on every main run since 0.70.
- Validation: Chromium and WebKit locally on macOS; Linux in CI.

## 0.73.0 — 2026-11-09

- **Who infected whom in Hagelloch, 1861, by hand** (200, steps 1 to 3): the serial interval, 184 values with a median
  of 10 days, and each child's secondary cases, 126 of whom infected no one recorded. Validation Lab check 43 agrees
  with pandas on all 188 cases.
- **A table port reads a point layer** as a table: each point a row of its attributes, without its geometry.
- **Relate, Bring it in as**: the brought column is written under a name you give it, so a table can be related to
  itself. **A category you type as a number is written as that number**, and the column stays a number; the dialog
  says to use one only where no match means none. Relate 0.11.0.
- **Apply ruleset reads dates**: year-month-day, and one date minus another gives days. Any other arithmetic with a
  date is refused while the rule is written. Apply ruleset 0.10.0.
- **Point data is on the standard Inspector**, with its table settings in Configure…. Point data 0.6.0.
- **An ontology of response timeliness** (7-1-7): milestones, targets, and the bottleneck and enabler categories of an
  open-access study of five countries, with its source on every term.
- **The blank canvas no longer says "Developmental evaluation"**, which is how Fieldwork is built, not a step for
  you. It says Step 1 of 2.
- Relate's dialog, before a run, now offers a count's column to bring.
- DTU25MSS's 2.9 GB file read in parts in 0.7 s, identical to h5py at all 221 nodes (198).
- Validation: Chromium locally; WebKit in CI, where earlier main runs failed and fixes are pending.

## 0.72.0 — 2026-11-09

- **Raster input reads a NetCDF-4 grid from this device, in parts** (198, step 2): a regular latitude–longitude grid,
  one variable chosen where the file holds several, its fill value, scale factor and offset applied, kept as the
  window around the study area as a GeoTIFF is. DTU25MSS's 2.9 GB file is the case it is for. Raster input 0.7.0.
- **The NetCDF reader is saved for offline use**, so a large file kept on the laptop can be read without the
  connection. It adds 5.7 MB to what Fieldwork stores on first visit.
- **EGM2008 at Manila's gauge, read by Fieldwork, is pyproj's**: 43.0092 m against 43.009 m, now a unit test.
- **Validation Lab check 42** recomputes the sea-level example's third workflow with rasterio, SciPy and NumPy: the
  same heights within 1e-9 m and the same 16 of 194 facilities.
- Validation: Chromium locally; WebKit in CI.

## 0.71.0 — 2026-11-09

- **Which of Manila's health facilities stand on ground below the sea level projected for 2100, by hand** (198): the
  sea-level example's third workflow reads DeltaDTM, EGM2008 and DTU25MSS, with no national datum, and finds 16 of 194,
  as Python on the source tiles does. Not a flood map: no tide, surge, defences or drainage, and the terrain model is
  least certain at the coast. Its write-up has fourteen notes and cites eight works.
- **Raster input reads a GeoTIFF at a URL**, keeping only the window around the study area, and offers **Download the
  whole file** with its size, to keep on the laptop. Grids published at nodes (`PixelIsPoint`), as EGM2008 is, are
  read half a cell over, and that is recorded. Raster input 0.6.0.
- **Sample raster can read bilinearly** between the four nearest cell centres, chosen and stated in the receipt.
  Sample raster 0.2.0.
- **Raster input and Sample raster are on the standard Inspector and dialog** (186).
- **A published ruleset that computes values runs on a table directly**, and its computed columns are numbers.
- **Correction: the two sea-level widgets retire only now.** 0.70.0 to 0.70.2 announced it, but their releases were
  not registered, so the build kept them in the catalogue. They are registered as retired, with the ledgers updated.
- **The widget catalog lists the widgets you can use, and the worked examples that use each one.** It has one way
  in, Widget catalog › beside the node library; the header button is gone. Retired widgets, versions, digests, checks
  and packs are no longer in it; a step's version, digest and check are in its Inspector.
- Experiment 58 closes: the three sea-level widgets it built have all retired into standard widgets and rulesets.
- Tests seed a workflow before the page loads instead of writing storage and reloading, which raced in WebKit in CI.
- Validation: Chromium locally; WebKit in CI.

## 0.70.2 — 2026-11-09

- **The sea-level example finds its facilities by hand**, with Find health facilities from the Humanitarian
  OpenStreetMap Team's Philippines export, rather than shipping them as a file: the same 194, with a true retrieval
  record. The test answers the export's address with the real file (ODbL), rebuilt 2026-05-05.
- The research note records the open estimate of local mean sea level at the eight gauges (DTU25MSS above EGM2008, no
  national datum needed) and a first count of facilities below projected sea level, in Python, for the canvas to
  reproduce.
- Validation: Chromium locally; WebKit in CI.

## 0.70.1 — 2026-11-09

- **The sea-level example's write-up states the Manila datum figures**: EGM2008 and NAMRIA's gravimetric geoid agree
  within 2 mm at the gauge, NAMRIA's mean-sea-level surface is 0.85 m above both, and which years that mean sea level
  stands for is not stated, a gap of 0.1 to 0.76 m by the gauge's record. Six works cited; the TAO paper by its DOI.
- The rules tests wait for Run to be enabled after a reload, which Linux WebKit in CI did not.
- Validation: Chromium locally; WebKit in CI.

## 0.70.0 — 2026-11-09

- **The two sea-level widgets retire** ([197](docs/experiments/197-the-sea-level-widgets-retire.md)). **Assign
  projection site** is **Measure distance** and **Relate**; **Compare level to elevation** is the published ruleset
  *Compare a projected rise with an elevation* 1.0.0, applied by **Apply ruleset**. Neither held anything about sea
  level. A workflow holding either is refused, by name. Removed outright: nobody outside the project uses them.
- **A step that reads a table reads Measure distance's result**: one row per point, its nearest candidate by the
  candidate's own attributes (`nearest_site_id`), and the distance.
- **Measure distance is on the standard Inspector and dialog** (186): the unit and the conditions a candidate must
  meet are in Configure…. Measure distance 0.6.0.
- **A column a table declares numeric reaches rules as a number.** A value Relate brought across was read as text, and
  rules over it concluded nothing.
- **The sea-level example is built from standard steps only**, and its README says its eight gauges match PSMSL's
  stations. **Its write-up is drafted as if for submission**: twelve notes across the four parts, with functions, whose
  words and argument, and five works cited through the citation builder.
- **The note dialog's section, function and source questions are named for a screen reader**: each label is tied to
  its control.
- Validation: Chromium locally; WebKit in CI.

## 0.69.0 — 2026-11-09

- **A note can carry a picture** ([196](docs/experiments/196-a-picture-in-a-note.md)). Under **Image** in a note you
  write, choose a PNG, JPEG, WebP or SVG file and write its alt text and caption; both are required. It is shown above
  the note's words on the board and in the write-up, as an image: an SVG is never put into the page. It is kept on
  this device by its digest, and an exported project carries it.
- **The sea-level example's write-up opens with the vertical-datum diagram**, as a note of its Introduction.
- Validation: Chromium locally; WebKit in CI.

## 0.68.0 — 2026-11-09

- **The sea-level example moves to its own repository, and reports a sea level**
  ([195](docs/experiments/195-the-sea-level-example-reports-a-sea-level.md)).
  [example-2026-sea-level-rise-philippines](https://github.com/digital-twin-ph/example-2026-sea-level-rise-philippines)
  holds the AR6 projections, the gauges and Manila's facilities, with two workflows: which gauge applies to each
  facility and how far, and the rise there by 2100, 1,124 mm under SSP2-4.5 with vertical land motion. Its README
  says what a flood question would need: the terrain models, their datums, and the offset to local sea level. The
  built-in Manila example is removed.
- **Tabular data can list a column's distinct values**, under **List the distinct values of**. Assign projection
  site reads its sites there; before, only code could set it. Tabular data 0.9.0.
- **Relate offers an assignment's columns before a run**, so a projection can be brought beside each point.
  Relate 0.10.1.
- **Table is on the standard Inspector and dialog** (186): Show totals and Display as are in Configure…. A number
  brought beside each row is drawn as a column, never as the headings. Table 0.8.0.
- Validation: Chromium locally; WebKit in CI.

## 0.67.1 — 2026-11-09

- **A map's value classes count each place once.** A place drawn in many parts was counted once per part: Bonthe,
  83 of the 162 parts of Sierra Leone's 16 districts, filled half the values the classes were cut from, so the key
  printed an empty class, "6.72 to 6.72", and moved every other edge. Every part is still drawn in its place's
  class. Map 0.21.1.
- Validation: Chromium locally; WebKit in CI.

## 0.67.0 — 2026-11-09

- **Relate allows for spelling** ([193](docs/experiments/193-relate-allows-for-spelling.md)). Under **Compare keys**,
  *allowing for spelling, and dropping words* folds the names, takes out words you name, such as *District*, as whole
  words, and matches a name to the one spelled closest, at a similarity of 0.88 to start and adjustable. The preview
  lists every name and how it matched; two names equally close wait under **Decisions**; a name not found is an
  unmatched row, decided as any is. The second table's key column can be named differently from the first's, and a
  new column says how each row matched. Relate 0.10.0.
- **Rate can read both numbers from one row**: a count, and a population brought beside it by Relate, which now
  brings a value column as a number with its unit. On the standard Inspector and dialog, whose preview shows each
  group's rate before Apply. Rate 0.4.0.
- **Study area repairs a published boundary, and says so** ([194](docs/experiments/194-the-boundary-repair.md)). A
  point written twice in a row, and the tip of a zero-width spike, are removed as a boundary is read; neither changes
  any outline's area. The dialog says what was removed, and the evidence lists each vertex, as CC BY requires of a
  change. A refused boundary names the unit at fault. On the standard Inspector. Study area 0.7.0.
- **Measles in Sierra Leone gains its third workflow**: cases per 100,000 people by district, over the 2021 census,
  on OCHA's districts.
- **Deduplicate records is on the standard Inspector and dialog** (186). Deduplicate records 0.3.0.
- The file input of a boundary file has an accessible name.
- Validation: Chromium locally; WebKit in CI.

## 0.66.0 — 2026-11-09

- **Map is on the standard Inspector and dialog** ([186](docs/experiments/186-one-standard-inspector.md)). Its name
  is the Results tab's, its layers are its inputs, and one sentence says what it draws. **Configure…** holds the
  presentation, the write-up section, each layer's class, mark name and symbol, and the standalone figure; Apply
  redraws the map without running again. **Manage layers…** is beside it. Map 0.21.0. The rulesets, NYC and Sierra
  Leone manuals open the dialog.
- Validation: Chromium locally; WebKit in CI.

## 0.65.0 — 2026-11-09

- **Measles in Sierra Leone has its first two workflows**: an epidemic curve by month of onset, and the facilities
  that saw ten cases or more, found by name in GRID3's register and coloured by band on a map. Small counts are left
  off the map, as the file's terms ask. Each record of the teaching file carries a case number.
- **A rules step, a map's pin class and Find health facilities read what the step before them gave out**, for a table
  or points it computed: the columns offered were the stored inputs', so a register's columns stood in for the
  facilities matched from it. Apply ruleset 0.9.1, Map patch.
- **A missing value is reported only for a column the rules read.** A district nobody recorded was counted against
  rules that never read it.
- Two actions in a narrow Inspector wrap instead of clipping.
- Validation: Chromium locally; WebKit in CI.

## 0.64.0 — 2026-11-08

- **A case definition in the rulesets worked example**: sixteen made-up suspected cases classified in four stages, with
  *is not* and *otherwise*, then counted with each class's share. Its seventh workflow.
- **A rule can read a category another rule gave**, by its name, so a classification is written in stages. A category
  reads in the table as it was typed: *Cannot be classified*, not *Cannot_be_classified*. Apply ruleset 0.9.0.
- **Comparisons are colour-keyed by family**: comparisons of numbers, *is* and *is not*, and *is recorded*, each with
  its own edge.
- Validation: Chromium locally; WebKit in CI.

## 0.63.0 — 2026-11-08

- **Apply ruleset has "is not" and "otherwise"** ([192](docs/experiments/192-is-not-and-otherwise.md)). *Rash is not
  No* matches a recorded value that differs. An otherwise gives a column a value where no rule did, once the columns its
  rules read are settled, so an ordered classification is written as columns in stages. The records that took it are
  counted. Rules with an otherwise run directly; rules with only *is not* still run in the reasoner.
- **A table's rows are kept before Save closes.** A reload straight after saving a table could lose it: the rows were
  still being written ([175](docs/experiments/175-how-large-a-table.md)).
- **Rules are drawn as coloured blocks**: if, or, then and otherwise, each with its word and its own edge.
- **Apply ruleset is on the standard Inspector and dialog**: one sentence and **Configure…**. The records, columns,
  units, settings and rules are set in the rules dialog; a published ruleset is chosen in its own dialog. Apply
  ruleset 0.8.0. The rulesets example's manual opens the dialogs.
- Validation: Chromium locally; WebKit in CI.

## 0.62.0 — 2026-11-08

- **Total within groups gives each group's share, %** ([191](docs/experiments/191-shares-within-groups.md)), beside its
  count or sum: within the columns you tick, or of the whole table. Shown as two columns. A share of an unknown total
  is unknown. Total within groups 0.3.0, on the standard Inspector and dialog: its settings are in **Configure…**,
  with the table they make as the preview. The Brazil and NYC manuals open the dialog.
- Validation: Chromium locally; WebKit in CI.

## 0.61.0 — 2026-11-08

- **OpenStreetMap is a register for lists** ([190](docs/experiments/190-find-health-facilities-from-a-list.md)):
  the country export Find health facilities already downloads, for any country, under ODbL. It has no facility types,
  so a name it matches allowing for spelling is held for your review and has no point until you choose. On Sierra
  Leone's names it adds one hospital after GRID3 and nothing wrong. Find health facilities 0.4.0.
- **An exact name in any register is taken before a spelling in an earlier one.**
- Validation: Chromium locally; WebKit in CI.

## 0.60.0 — 2026-11-08

- **Find health facilities finds facilities from a list** ([190](docs/experiments/190-find-health-facilities-from-a-list.md)).
  Each row's facility name is matched to national registers (GRID3 for Sierra Leone, Nigeria and DR Congo, declared in
  the ontology), and every row is marked: matched exactly, allowing for spelling, type differs, ambiguous, an area not a
  facility, or not found. None is dropped; you decide the ambiguous ones. Find health facilities 0.3.0, on the standard
  Inspector and dialog.
- **Facility registers and match outcomes are in the ontology**, and the register catalogue is generated from it.
- **Measles in Sierra Leone** ([189](docs/experiments/189-a-measles-line-list-made-safe-to-teach-with.md)): a
  semi-synthetic, de-identified teaching file in its own public repository, compared with the original.
- Checkbox lists in configuration dialogs sit beside their words.

## 0.59.0 — 2026-11-08

- **The built-in rulesets and spatial coverage examples are removed.** What the rulesets example taught is in the
  *Rules on synthetic data* worked example, which gains two workflows: rules the N3 reasoner runs, and rules over
  points coloured on a map, with counts stored as text read as numbers in Data quality. Its six workflows build from an
  empty canvas by its manual. Keep points inside the area now has no worked example, and says so.
- **A column's kind is declared** in Apply ruleset's Inspector: number, category, or true or false. Apply ruleset 0.7.0.
- **A map can be coloured by what rules concluded.** Map patch release.
- **A manual can ask for a file of its repository** to be downloaded and chosen, where a widget takes a file, not a URL.

## 0.58.0 — 2026-11-08

- **Tabular data reads Excel workbooks** (`.xlsx`): choose the sheet, and it is set up as a CSV is. The step says which
  sheet it read. Tabular data 0.8.0.
- **Fixed: Next rows did nothing** in the import dialog's After table, Relate's preview and Select rows' preview. Only
  the Results view listened for it. Relate 0.9.1, Select rows 0.4.1.
- Two browser tests that need the NYC package, and so were skipped in every gate, had gone stale: one expected four
  workflows where the example has six. Both now pass, and the gate is run with the package.

## 0.57.0 — 2026-11-08

- **Tabular data is on the standard Inspector and dialog** ([186](docs/experiments/186-one-standard-inspector.md)).
  The Inspector says in one sentence what the step reads, and **Configure…** opens the import, now headed with the
  step's name and closed by **Cancel** or **Apply**. *Convert the source table on each run* is in the dialog and can be
  changed without reading the file again. Tabular data 0.7.0.
- **Fetch the table is a button of its own**, under Settings, no longer a word inside a notice.
- **The datum diagram** in the terrain models note shows how the heights a terrain model gives relate to the geoid,
  the ellipsoid and local sea level.
- The NYC, Brazil and rules manuals say **Configure…** and **Apply**.

## 0.56.0 — 2026-11-08

- **A computed column states its unit and what it measures**, beside the rule that makes it
  ([188](docs/experiments/188-rules-that-compute-and-show-their-table.md)). The output table carries both. A new column
  without a unit is said, not refused. Apply ruleset 0.6.0. The rules worked example now states every one.
- **The run's notice counts unreadable values apart from empty ones.** "66 records could not be read" is now "63
  records could not be read as declared, and 3 records have no value".
- **Fixed: the offline worker left a failed background fetch unhandled.** In WebKit it surfaced as a page error naming
  `sw.js`, and failed ten to fifteen tests in each CI run. Whether this clears them is known when CI has run.
- **Lab parity records corrected:** every claim now matches the result it names (`validate:parity` passes). The
  corridor's claim is to release 0.2.0, which is the one the lab checked.

## 0.55.0 — 2026-11-08

- **Derive a value is retired into Apply ruleset**
  ([188](docs/experiments/188-rules-that-compute-and-show-their-table.md)). Its four uses in the South London and
  Nigeria examples are Apply ruleset steps now, with one rule for every record; every output of the four workflows
  gives the same rows as before, checked by digest. A saved workflow with a Derive a value step opens with it changed
  into an Apply ruleset step, stamped, and asks for the units of what it combines. Apply ruleset 0.5.0; Derive a value
  1.0.0, retired.
- **A worked example of every rule feature**, on made-up data: *Rules on synthetic data*, four workflows with a manual
  that builds them from an empty canvas.
- **Settings are declared in the rules dialog**: a name, a value and a unit, for a threshold changed without rewriting
  a rule.
- **Only the columns the rules read need a unit.** A sum or difference of two different units is refused while the
  rule is written.
- **Fixed: a condition on a category never held.** A value typed for a category column, such as *clinic is Hillside*,
  was stored as text no record could equal. It is now the category, as the record's value is.
- **An Apply ruleset step lists its input in the Inspector**, as every step does, and the step after it is offered
  the columns and values its rules add.

## 0.54.0 — 2026-11-08

- **A rule can read the previous row** ([188](docs/experiments/188-rules-that-compute-and-show-their-table.md)).
  In Apply ruleset's dialog, either side of a computed value can be a column *in the previous row*: new cases are a
  cumulative count minus the count in the previous row. Apply ruleset 0.4.0.
- **The rows are sorted inside the step**, above the rules: by a column, dates first, within each place or group, and
  the previous row is the row recorded before, or the day, week or month before. The file's own order is never used.
  The preview shows Before, Sorted and After.
- **What has no single previous row is said:** the first row of a place, a missing week, and a week recorded twice
  give no value and are named. A count that falls is kept and named.
- **Not yet:** rebuilding the Nigeria and South London workflows with Apply ruleset, the synthetic repository's
  workflows, and retiring Derive a value.

## 0.53.0 — 2026-11-08

- **Select rows by value is on the standard Inspector and configuration dialog**
  ([186](docs/experiments/186-one-standard-inspector.md)). The Inspector says in one sentence what the step keeps, and
  after a run how many rows it kept and left out. The column, the values or the range are set in **Configure…**,
  which shows how many rows they keep, and the table, before **Apply**. Select rows 0.4.0. Saved workflows open as
  they were.
- **186 has its counts:** of the 24 widgets the published examples use, Relate and now Select rows meet the standard.
  Moving the rest, in order of use, is what closes it.
- The NYC and Brazil manuals are rewritten for the dialog.

## 0.52.0 — 2026-11-08

- **A rule can compute a new column** ([188](docs/experiments/188-rules-that-compute-and-show-their-table.md)). In
  Apply ruleset's dialog, a conclusion can be *a computed value*: *houses without a death* is *houses* minus *deaths*.
  Plus, minus, times or divided by; each side a column, a value another rule computed, or a number. A rule can apply to
  every record. Apply ruleset 0.3.0.
- **The rules dialog shows Before and After**, updated as you edit: the records as they arrive, and with the new
  columns and the rule each matched. Each rule says how many records it matched.
- **Divisions by zero, missing values and disagreeing rules are said in words**, in the dialog and in the run, and
  the record is named. Nothing is filled in.
- **A wide table is read as the file had it:** one record per subject, its columns by their own names. All four
  Derive a value steps in the South London and Nigeria examples give the same table through Apply ruleset.
- **Apply ruleset has a manual page.**
- **Not yet:** rules that read the previous row (new cases from a cumulative count), the sort they need, and
  retiring Derive a value. The worked examples still use Derive a value.

## 0.51.0 — 2026-11-07

- **Cases by period counts weeks starting Sunday** ([187](docs/experiments/187-two-ways-to-an-epidemic-curve.md)).
  Choose *week, starting Sunday (epidemiological week)* for data like Brazil's, whose weeks start on a Sunday. The
  Monday week (ISO 8601) is unchanged. Cases by period 0.2.0.
- **Cases by period can take a table.** *Records arrive as: points, or a table, each row a count.* The run could
  already read a table, but nothing in the Inspector could choose one. A series read from a table keeps its unit.
- **The Brazil epidemic curve uses Cases by period.** The same 51 weekly totals, with the kind of date stated: the
  source does not say whether a week is of onset or notification, so it is *a date of unstated kind*.
- **A weighted curve says what it counted.** Snow's curve said *616 records*; it is 616 deaths from 43 records, and now
  says *616 cases from 43 records*. Chart 0.11.1.
- **Cases by period has a manual page.**

## 0.50.0 — 2026-11-07

- **Experiment 185 is validated** ([185](docs/experiments/185-one-step-for-every-lag.md)). Validation Lab check 38
  compares one Regression fitting a model per lag with pandas lags and statsmodels, in CPython and in Pyodide, and
  agrees. The live MODIS run of the rebuilt 2010–2025 workflow reproduces experiment 182's figures.
- **Each model states its own counts.** With several models, each model's line gives its rows, its strata used and
  dropped, and its own dispersion. The heading gave the first model's dispersion as if it were every model's.
  Regression 0.5.1.
- **No limit on how many shifts Relate brings.** The limit of 24 was chosen, not measured. Measured on 77,740 rows:
  about half a second per shift, linear to 384 with nothing failing. Relate 0.9.0.
- **Not changed:** a shift at which no row matches still stops the step, instead of giving an empty column. Recorded
  in 185 for a decision.

## 0.49.0 — 2026-11-07

- **The Brazil lag workflows use one Relate and one Regression** ([185](docs/experiments/185-one-step-for-every-lag.md),
  stage 3). The 2024 workflow has 14 steps instead of 31, and 2010–2025 has 18 instead of 43. Every model gives the
  same estimates as the separate models it replaced. The lag chart's horizontal axis is now the shift in days.
- **An adjusted variable can follow the shift.** With several models, tick *follows the shift* under an adjusted
  variable, and each model is adjusted for its own column: the rain at its own lag beside the temperature at that lag.
  One column per model, filled in Relate's order and each changeable. Regression 0.5.0.
- **A chart after a several-model Regression is offered its columns**, shift_days among them, before a run.
- **A second Relate with several shifts keeps the first one's shifts.** It replaced them, so the models lost their
  shift_days and the run failed. Relate 0.8.2.
- **Not yet checked:** the live MODIS run, so the 2010–2025 figures recorded in experiment 182 are not yet reproduced
  by the rebuilt workflow; and no Validation Lab check covers the several-model table.

## 0.48.0 — 2026-11-07

- **Regression fits one model per exposure column** ([185](docs/experiments/185-one-step-for-every-lag.md), stage 2).
  Under Exposure, **Also fit, one model each, with** offers the table's other columns, such as Relate's shift columns.
  Each ticked column gets the same model with only the exposure swapped, fitted on its own rows: a week with no value
  at one shift is left out of that model only. The models come out as one table with the columns exposure,
  shift_days (where Relate recorded the shift), role, term and statistic. A column that cannot be fitted is a row
  saying why. Regression 0.4.0.
- **Relate with several shifts offers the right columns to the next step.** A following step was offered the single
  shift's column and period helpers, which a several-shift run does not make, and not the shift columns it does.
  Relate 0.8.1.
- **Not yet done:** the Brazil lag workflows still use one Relate and one Regression per lag. Rebuilding them, and
  comparing every model with Validation Lab checks 36 and 37 and the 2010–2025 figures, is stage 3.
- **Checked:** the unit suite, and the new browser check and the Relate panel checks in Chromium and WebKit; the full
  gate in Chromium.

## 0.47.0 — 2026-11-07

- **Relate is the first step with the standard panel and dialog** ([186](docs/experiments/186-one-standard-inspector.md)).
  Its panel shows the name, the two inputs, one sentence saying what it will do, **Configure…**, one line of what the
  last run gave, the Manual, Evidence and Version links, and Duplicate and Remove. Everything else is in its dialog:
  - **Settings:** what to match on, what to bring across, how keys are compared, a date within a period, and the list
    of shifts, which can now be set: one column per shift.
  - **Preview:** the join these settings would make, with its effect on each numeric variable, the Methods note and
    the table, before anything is applied.
  - **Decisions:** what happens to rows that did not match. Neither choice is ticked to begin with.
  - Nothing changes until **Apply**. Cancel, × and Escape leave the step as it was, and ask first if something was
    changed.
- The NYC and Brazil manuals are rewritten for the new dialog. Saved workflows open as they were.

## 0.46.0 — 2026-11-07

- **Micro-workflows are retired.** No worked example used one. A workflow saved with one refuses to open and names
  it; rebuild the steps it held from the palette, where every one of them still is. Nobody outside the project builds
  on it.
- **Tidy works the same at any zoom.** Pressing it twice now says "Already laid out in order" instead of moving the
  steps again, because it measures each step's own height, which zoom does not change.
- **Relate can bring one column per shift** when a saved workflow lists several shifts: the first step of
  [185](docs/experiments/185-one-step-for-every-lag.md). Every row is kept, and the empty rows are counted for each
  shift. The Inspector does not offer the list yet; it comes with Relate's standard dialog.

## 0.45.0 — 2026-11-07

- **Every word is readable.** Nothing on screen is smaller than 14 px, body text is 16 px, and the faint grey text
  passes WCAG's 4.5:1 contrast in both light and dark themes. Measured on the Workflow tab, the Notes tab and the note
  dialog: words below 14 px went from 96–99% to none, and words below the contrast bar from a third or more to none.
- **A step's inputs can be connected from the Inspector.** Under **Inputs**, each input, named in plain words, lists
  "Not connected" and every step that can feed it; choosing one connects it, as dragging to the port does. Dragging to
  a small port is hard to see and, on a large workflow zoomed out, nearly impossible. Mean center, Point comparison,
  Privacy and Catchments now use this list instead of their own; nine widgets still have their own and move when the
  Inspector is standardised.
- **Tidy stacks steps by their height**, so taller steps no longer land on top of each other.
- The tab bar scrolls sideways on a narrow screen instead of widening the page.

## 0.44.0 — 2026-11-07

- **A lab evaluation form, against Nielsen's ten usability heuristics.** Switch on **Lab evaluation** in Help; an
  **Evaluate** button then appears in the header and in the note dialog. Record what happens and what it costs under
  each heuristic, and **Save to laptop** as Markdown to read and JSON to merge. Hidden unless switched on, so nobody
  using Fieldwork for analysis meets it. Experiment 184.

## 0.43.0 — 2026-11-07

- **A note answers two questions about its sources instead of naming one form: whose words, and whose argument.**
  *Whose words*: the source's exact words, close to the source's wording, my words: one passage, my words: the main
  points, or not sure. *Whose argument*: what the works say, or what I make of them. Both optional. A note saved with
  0.42.0's form keeps it, read into *whose words*. Studies of source use keep these two apart, and none separates a
  précis from a summary (experiment 183).
- **The Add note dialog shows questions to ask of the part being written** — four each for Introduction, Methods,
  Results and Discussion — and follows the note if it moves. Hide them once they are habit; this device remembers.
- **The Notes page of the manual has an entry for each part of the write-up**: what it is for, how to build it, and
  its questions, from the CDC/TEPHINET scientific writing course built for FETP residents, in our own words. The
  examples now show each answer, including a sentence close to its source's wording beside a true paraphrase.
- **The Brazil notes answer both questions**, and the four that reported and argued at once are now two linked notes
  each: fifteen notes.
- Experiment 183 closes: the questions are in each part's manual entry, and a test holds them to the dialog's wording.

## 0.42.0 — 2026-11-07

- **A note that cites literature can say its form: précis, paraphrase or summary.** Chosen in the Add note dialog,
  which says what each means, with an **Examples** button opening a new Notes page of the manual: a few examples of
  each, drawn from the works the Brazil notes cite and from Snow, what each form commits the writer to (how much of the
  source to have read, what to watch for), and what to do with a note that is none of the three. The form shows as a
  label on the note. The form is optional: it opens on unstated, and **not sure** says the writer looked and could not
  tell. A form outside these is kept as written.
- **Experiment 183** asks whether the forms help people write better, and closes on an evidence search about improving
  academic writing.
- **The manual has its first page for part of the application rather than a widget**: the Notes tab.
- **The Brazil example's write-up carries what the mosquito meets.** Twelve notes on the Notes tab, seven of them
  citing thirteen open works, set the lag models' exposure — MODIS daytime land-surface temperature — against what
  *Aedes aegypti* meets: air at indoor resting sites, water in containers, and stored water in droughts. A review
  of the literature behind them is in the example repository. Nothing in the models changed. Experiment 182.
- **The Brazil example's provenance names where `tempmed` comes from**: InfoDengue's alertcity API, from airport
  stations in its Rio pilot and ERA5 reanalysis now. When that changed is not stated.

## 0.41.0 — 2026-11-07

- **The Brazil example widens to sixteen years.** A fifth workflow sets weekly cases 2010–2025 beside Terra's land
  surface temperature at five lags and two leads. Each week is compared only with weeks of the same municipality,
  month and year, and the model adjusts for that week's rainfall. Played back live: 1.020 per 1 °C at 8 weeks before
  and 1.021 at 6, and 1.005 for both leads, a quarter of 2024's 1.061. Still not a finding: the intervals allow nothing
  for correlation between weeks. Experiment 182.
- **Regression takes several strata columns together**, one stratum per combination: choose a column, then
  **Together with**. Validation Lab check 37 agrees with statsmodels.
- **Select rows by value can leave values out**: **Every value except those I tick**.
- **Relate a column can relate a table to itself, shifted**, for rainfall *k* weeks before each week. A second shifted
  date on one table is kept as `_shifted_2`.
- **A satellite search reads every page**, with no 500-item limit, and keeps only the files its reader reads. Sixteen
  years of MODIS over Rio de Janeiro is 2,891 items in 19 s, 5.9 MB stored instead of about 14 MB.
- **A run computes steps that do not lead to an output yet**, when their inputs are connected, so the next step can be
  set up against their table. One that fails is named in its Inspector, and the run goes on.
- Fixed, each found building the sixteen-year workflow:
  - **A large search could not be saved.** Every later edit was lost; searches are now kept in the browser's larger
    store.
  - **Join decisions over many rows were lost on save.** Each was stored with every unmatched key written out; now a
    short digest, and a decision saved the old way still holds.
  - **Relate offered the second table's value column only after a run**; now from the table's declaration.
- Validation: Chromium locally; WebKit in CI.

## 0.40.0 — 2026-11-06

- **Satellite files are read several at once**, and a run of them is about three times faster in a browser: three
  months of MODIS over Rio de Janeiro's 92 municipalities in 23 s instead of 70, ten NYC Sentinel-5P overpasses in 22 s
  instead of 47. The table is the same either way. Experiment 182.
- **A file that fails is tried again**, three times; one that still fails stops the run and is named. On 2026-11-06
  one *Failed to fetch* among 180 files stopped a live run without saying which.
- **A MODIS file is read once per session**, as Sentinel-5P files already were, so the Brazil lag workflow no longer
  reads every file twice.
- Measured and not built: decoding in a worker pool. It blocked the page for a tenth of a second over a whole run
  either way.
- Validation: Chromium locally; WebKit in CI.

## 0.39.1 — 2026-11-06

- **The Brazil lag models get a falsification test, and it fails.** Two lead models, the temperature 2 and 4 weeks
  *after* each case week, sit on the lag-response plot at −2 and −4. Played back live: 1.061 per 1 °C two weeks after,
  against 1.063 eight weeks before. Later weather cannot cause earlier cases, so these models trace one year's season,
  not an effect of temperature. Experiment 180.
- Validation: Chromium locally; WebKit in CI.

## 0.39.0 — 2026-11-06

- **Chart draws an estimate with its interval**: a point with a whisker at each category, from any table that
  declares an interval, as every Regression table now does. For a ratio, a log scale and a dashed line at 1 are on
  by default, and the figure says why. Both can be turned off in the Inspector. A category declared a number is placed
  as one. Experiment 181.
- **Append rows stacks any number of tables in one step**: **＋ Add a table** adds a port, each table gets its own
  label, and the labels can be declared numbers in a unit. A label declared a number that is not one is a data
  quality finding; the rows are kept. Workflows saved with two tables load unchanged.
- **The Brazil dengue example's fourth workflow ends in a lag-response plot**: the five lag models' rate ratios per
  °C with their 95% intervals, from one Append rows, one Select rows and one Chart. Validation Lab check 36 rebuilds
  it with pandas and agrees on every number, in CPython and Pyodide.
- Fixed in Chart's Inspector: *Chart enhancement* read *Classic bars* while Vega-Lite drew the chart, unless Vega-Lite
  had been chosen explicitly.
- Validation: Chromium locally; WebKit in CI.

## 0.38.1 — 2026-11-06

- **A run that reads satellite files shows it is working.** While Sample satellite files at points or over areas
  reads its files, a panel at the foot of the page names the step, turns, and counts the files read, *Reading
  satellite files: 40 of 92*, with a bar; the Run button turns and the run's state says the same. A year of MODIS
  files over Rio de Janeiro takes about five minutes, and the NO₂ month over New York City a few; until now the page
  showed only *Running…*. Motion stops where the device asks for reduced motion; the count stays.
- Validation: Chromium locally; WebKit in CI.

## 0.38.0 — 2026-11-06

- **Relate a column matches a date to the period that contains it, and can shift it first.** Weekly cases against a
  satellite's 8-day periods, and a lag of *k* weeks as a shift of 7*k* days fewer. The shifted date and the matched
  period stay on every row, and a date inside two periods is refused by name.
- **The Brazil dengue example has a fourth workflow**, *Did warmer ground weeks earlier go with more cases?*: Terra's
  land surface temperature 0, 2, 4, 6 and 8 weeks before each week, beside the week's cases, in five Poisson models
  with municipality and month. Played back live. The rate ratios run from 0.963 per °C at 4 weeks to 1.063 at 8; the
  example says plainly why they are a demonstration, not an effect.
- Fixed in Relate's Inspector: choosing the first of the period columns lost the choice and closed the section.
- Validation: Chromium locally; WebKit in CI.

## 0.37.0 — 2026-11-06

- **Buffer study area is retired.** Its two uses are met elsewhere. To fetch data beyond an area, Street network and
  Polygon layer each have their own margin; the Snow isochrone example now sets the network's to 750 m, the same
  extent as before. For a cross-border study, the study area itself straddles the border, drawn or picked on both
  sides. A workflow saved with the widget is refused on loading, as for every retired widget; nobody outside the
  project builds on it.
- **A flaky test made steady:** "Reset example only where there is a published example" pressed New project before
  the page had finished checking itself, and failed twice in CI on slow runners. It now waits.
- Validation: Chromium locally; WebKit in CI.

## 0.36.0 — 2026-11-06

- **Land surface temperature in °C by default, or °F or K.** MODIS states kelvin; Sample satellite files at points or
  over areas now reports degrees Celsius unless told otherwise, with Fahrenheit and the file's kelvin offered. The
  conversion is exact and stated on the result and in the receipt.
- **Every file is read for its own unit and scale factor.** A MODIS file states both in its tags; each one opened is
  checked, a file stating another unit or scale stops the run with its name, and the result says whether every file
  stated them.
- Validation: Chromium locally; WebKit in CI.

## 0.35.0 — 2026-11-06

- **The Brazil dengue example has a satellite workflow**, *How hot was the ground in each municipality?*: MODIS
  land surface temperature over the 92 municipalities for every 8-day period of 2024, from Terra and Aqua. Played back
  live: 180 files read in about 4 minutes in a browser, 8,188 rows, 8,064 with a mean.
- **Sample satellite files at points or over areas takes a study area.** A study area's units, such as municipalities
  picked from geoBoundaries, are read as they are, with no polygon layer in between.
- **Fixed: half the state read as no cell.** Planetary Computer leaves the satellite off some 2024 MODIS items, and
  they were read as a third satellite; the satellite now comes from the product's name where the item does not say.
- **Fixed: the study area dialog's sections remembered being open**, so the click that opens one closed it.
- Validation: Chromium locally; WebKit in CI.

## 0.34.1 — 2026-11-06

- **A step's table is one button away even before a run.** After opening a project or reloading, a table step's
  Inspector said only that the workflow had not run, which read as "no table view". It now offers **Run and view
  this table**. A table read from a URL still has to be fetched first, in Tabular data.
- **Select rows by value greys the rows it dropped**, in its Before view, and says how many and by what rule.
- **Checkboxes sit beside their labels** everywhere in the Inspector. In Total within groups each box had a line of
  its own above its column name.
- Validation: Chromium locally; WebKit in CI.

## 0.34.0 — 2026-11-06

- **Sample satellite files at points or over areas.** The sampler takes a polygon layer as well as points, and reads
  MODIS land surface temperature (8-day, 1 km, on Planetary Computer) over each area: the cells whose centre is in
  it, one row per area per period per satellite, Terra and Aqua kept apart. Every row says how many cells the mean
  rests on and how many days were clear. The quality rule is the practitioner's choice, since MODIS recommends none:
  produced, with an average error of 2 K or less. Sentinel-5P is still read at points. Experiment 180.
- **Find satellite products offers MODIS land surface temperature** under Surface heat, with its licence (NASA
  Earthdata: open, CC0 unless marked) and citation read at source.
- Validation: Chromium locally; WebKit in CI. Read in Node over the 92 Rio de Janeiro municipalities from real files;
  no lab check of the area reading yet.

## 0.33.0 — 2026-11-06

- **New worked example: dengue in Rio de Janeiro state, Brazil, 2024.** Two workflows from an empty canvas: the
  state's weekly epidemic curve, and notified cases per 100,000 residents for each of the 92 municipalities on a map,
  from 54.6 in Nilópolis to 15,081 in Resende. The data are an extract of DATASET_MULTIMODAL_V8 (Zenodo, CC BY 4.0),
  committed to the example with its findings: epidemiological week 1 missing, the last week doubled, and satellite
  columns that are monthly values repeated weekly. It has a Manual tab. Experiment 180.
- **Rate with a denominator and Cases by period can be added from the library.** A new node starts with its fields
  empty, and saving refused that, so neither node was ever created. Known since October and recorded in TODO; fixed
  now because the Brazil example needed Rate. An empty field is now refused when the workflow runs, with the same
  message. One widget remains unaddable: Compare level to elevation.
- **A study area takes units whose rings meet at a single point**, such as an island touching another at a corner,
  as the OGC rule allows. Quatis and Rio de Janeiro city were refused.
- **Reading a file as wide no longer blocks on repeated subjects.** The dialog still suggests reading it as long;
  read as wide, every row is kept and each repeat is reported in Data quality.
- **Join a table to the study area counts units, not parts.** A municipality's islands were each reported as a
  repeated name.
- Validation: Chromium locally; WebKit in CI.

## 0.32.0 — 2026-11-06

- **Sample satellite files at points reads the nearest pixel across the file's chunks** (widget 0.2.1). A point near
  the edge of one of a file's compressed chunks was read from the nearest centre in that chunk, though a centre across
  the edge could be nearer; and a point between two chunks of wide pixels could be missed. Found by the validation
  lab's new check 35, which re-reads a Sentinel-5P-shaped file with h5py and recomputes every pixel and row: it now
  agrees, in CPython and in the browser kernel. Only points within about half a pixel of a chunk edge were affected; a
  real orbit file has chunk edges every 225 ground pixels and every 2,086 scanlines.
- **Products carry their citations.** Find satellite products and Search a satellite catalog show the dataset
  citation the producer asks for, with its DOI as a link. The three Sentinel-5P products on Planetary Computer carry
  ESA's Version 02 citations, for the processor 2.x files served for June 2023, read on 6 November. The receipt states
  the citation read, or that nobody has read one.
- **The Relate dialog's preview marks the join's columns**, Matched on and Brought across, as View this table does.
  The preview was also squeezed to a single line in a short dialog; it now shows its rows.
- Validation: Chromium locally; WebKit in CI. Lab check 35 in CPython 3.13 and in Pyodide.

## 0.31.0 — 2026-11-05

- **Relate a column from another table matches on several columns together.** Choose **And also matched on** for a
  second key, such as `date` beside `site`: a row relates only where every key agrees. It can also bring the second
  table's **value column** across, such as a monitor's reading in ppb.
- **Joins show their keys.** In **View this table**, each key column is tinted and labelled **Matched on** in every
  *Before* and in *After*, and the column added is labelled **Brought across**.
- **Sample satellite files at points names its id column after the points' source**, `site` for the NYC monitors, so
  the result relates straight back to the ground readings.
- **NYC example, sixth workflow: _Did the satellite see the city's NO₂?_** Sentinel-5P NO₂ at the four NO₂ monitors,
  1 to 14 June 2023, beside the monitors' own readings, matched on monitor and day. Days where Queens College 2 has
  no ground reading are kept and named. Played back live in Chromium on 5 November: 19 files read, 76 rows, 22 values
  passing the quality rule, 47 below it, 7 days without an overpass (experiment 179).
- Validation: Chromium locally; WebKit in CI.

## 0.30.0 — 2026-11-05

- **A whole country can be a study area.** Uganda at ADM0 drew nothing: its outline, 1.4 MB, was refused against a
  1 MB limit sized for the browser's smallest store, in a line easy to miss, with advice to choose a coarser level
  that ADM0 does not have. An outline taken from geoBoundaries or a file is now kept in the larger store (IndexedDB),
  as tables and point layers are, and the limit is gone. Shapes drawn by hand are kept as before.
- **Every part of a unit is kept.** A country or district with islands used to keep only its largest part: Uganda
  lost 47, the islands of Lake Victoria among them.
- **A refused outline says so where you are looking**, in the dialog's status line.
- Validation: Chromium locally; WebKit in CI. The real Uganda ADM0 applies with all 48 parts.

## 0.29.1 — 2026-11-05

- **Sample satellite files at points works on Pages.** In 0.29.0 the file reader it loads, h5wasm, was not published:
  files left out of the offline download were also left out of the site. The MapLibre worker behind the vector
  basemaps was missing the same way, which may have stopped those basemaps drawing on Pages. Both are now published
  and still not downloaded for offline use.
- Validation: Chromium locally; WebKit in CI.

## 0.29.0 — 2026-11-05

- **Sample satellite files at points** (new, under Spatial operations): connect your points and the files **Search a
  satellite catalog** found, and run. At each point, for every overpass, it reads the value of the pixel whose centre
  is nearest, fetching only the parts of each file it needs, in the browser. The result is a long table: the value
  where it passed the product's quality rule, the value as read, `qa_value`, and where there is no usable value, which
  gap it is: **no overpass**, **no retrieval**, or **below quality threshold**. Nothing is filled. Sentinel-5P NO₂ on
  Planetary Computer is the first product it reads, with no account. Read live at two NYC ozone monitors on 7 June
  2023: both pixels had `qa_value` 0.74, just below the 0.75 threshold.
- **Quality rule:** the NO₂ product's readme says above 0.75 and its manual's table at or above; the Inspector lets you
  choose, and the result says which. The comparison is made on the stored integer, so a stored 75 is not wrongly
  failed as 0.74999998.
- **One overpass, two items:** Search a satellite catalog now shows each item's processing stream (near real time or
  offline) and orbit, and keeps only the offline item of an orbit by default, so no reading is counted twice. 0.28.0
  called the two NO₂ items over NYC on 7 June 2023 two overpasses; they are one.
- **Cost:** an offline orbit file is about 600 MB, stored in large compressed chunks; expect about 10–15 MB per
  overpass, much the same for 2 points as for 50. From the machine this was built on, the browser read that storage at
  35–55 seconds per MB: the live read took 8.3 minutes.
- New dependency: h5wasm 0.10.3 (NIST), loaded only when a file is read and not stored for offline use.
- Validation: Chromium locally; WebKit in CI. The live read runs only on request (`SATELLITE_LIVE=1`); the gate reads a
  Sentinel-5P-shaped file made on the spot, by range, through the same worker.

## 0.28.1 — 2026-11-05

- **Search a satellite catalog** no longer needs a Study area. With none connected, type the area's west, south, east
  and north edges in the dialog, as in JLT's STAC Browser; the dialog says what is wrong with an edge until the four
  make an extent, and draws the area before you search. A connected Study area still fills it. In 0.28.0 the Search
  button stayed grey without one and the dialog gave no way forward. The run records where the area came from.
- Validation: Chromium locally; WebKit in CI.

## 0.28.0 — 2026-11-05

- **Find satellite products** (new, under Sources): type a research topic or a measurement, such as NO₂, aerosols or
  ozone, and see which satellites and products measure it. Each product says what it measures and its unit, whether it
  needs sign-in, its licence as read from the licence itself, whether a browser can read it, and its quality rule.
  Products needing no sign-in come first. Adapted from JLT's EO Satellite Guide, in Fieldwork's dialog style.
  Experiment 179.
- **Search a satellite catalog** (new, under Sources): connect the chosen product and the study area, choose the dates,
  and search the product's catalog. Three columns, after JLT's STAC Browser: the search, the study area with each
  overpass's footprint, and each file with its sign-in, licence as read, whether a browser can read it and the
  attribution to use. Reads catalog records only; it says that completeness is not known until a file is read.
  Checked against Planetary Computer from a browser: 2 Sentinel-5P NO₂ items over New York City on 7 June 2023.
  _Corrected in 0.29.0: they are one overpass, orbit 29273, in two processing streams, not two overpasses._
- Custom studs and known naming violations are no longer capped by count: each states its own reason.
- Validation: Chromium locally; WebKit in CI.

## 0.27.1 — 2026-11-05

- **In the write-up, under** now sits just below **Results tab name** in a Map, Table or Chart's Inspector. In 0.26.0
  it was the last field, below Definition and Connections, and was easy to miss.

## 0.27.0 — 2026-11-05

- **Point data reads points from a table in the workflow**, as geopandas' `points_from_xy` does. Connect a table and
  name its **x (longitude)** and **y (latitude)** columns. A row whose coordinates are empty, not numbers or out of
  range is kept with no position and counted, never a refusal of the table, and the result says how many rows share a
  position. Read as CRS84. Point data 0.4.0; lab check 34 agrees with geopandas. Experiment 178.
- **The NYC example has a study-area map for the Introduction**: the five boroughs from geoBoundaries and the six
  ozone monitors, read from the authors' site-day file. Its manual builds it from an empty canvas.
- **A boundary unit whose name repeats is listed with where it lies.** US counties carry no state, and five are
  called Richmond; they now read *Richmond · 40.58° N, 74.17° W* and so on. Study area 0.5.1.
- Fixed: ticking several columns at once in Total within groups kept only the first (0.2.1). The Country field's
  label no longer reads as the whole country list.
- A widget under Sources may now read data already in the workflow when it can run without it; only one that
  requires it is treated as a transform. The naming ledger no longer caps how many known exceptions may stand: each
  is held to its own reason and what would clear it.
- Validation: Chromium locally; WebKit in CI.

## 0.26.0 — 2026-11-05

- **Choose where a figure goes in the write-up.** Every Map, Table and Chart output has **In the write-up, under**:
  Introduction, Methods, Results or Discussion. Results is the default. A study-area map can now open the
  Introduction. The receipt states the section and whether it was chosen, and a validation rule checks that the note
  describing the figure is filed in the same section. Map 0.20.0, Table 0.7.0, Chart 0.10.0. Experiment 177.
- Validation: Chromium locally; WebKit in CI.

## 0.25.0 — 2026-11-05

- **The Two-by-two table reports a rate ratio.** Under **The outcome column holds**, choose **events and units at
  risk**, then name the value holding the events and the one holding the units at risk (houses, people, person-time).
  The figure shows each group's events, units at risk and rate in the letters $a_1$, $n_1$, $a_0$, $n_0$; the
  Methods note writes the ratio and its log-normal interval in those letters. Units at risk need not be whole numbers.
  A group with no events keeps its counts and says why there is no ratio. Two-by-two widget 0.7.0.
- **A declared design decides whether a rate ratio may be reported**: under a cohort or an ecological design, as for a
  Poisson regression, and the step stops under any other, naming the reason. With no design connected it keeps its
  name.
- South London's *Deaths per house, by water company* reads Table IX through the two-by-two: **8.40 (6.84 to 10.32)**,
  the same to the last digit. A table of deaths per 10,000 houses sits beside it. Lab check 27 compared the new path
  with statsmodels on all four of its comparisons and it agrees.

### Retired

- **Rate ratio with an interval**, into the Two-by-two table. It could read only a Rate step's result, South London
  was its one user, and its arithmetic was already shared with the two-by-two. Retired outright, with no deprecation
  period, because nobody outside this project uses it. **A workflow saved with one refuses to open**, naming it:
  rebuild the step as a two-by-two on the table the Rate read. Experiment 161, step 6.

### Validation limits

- Chromium locally; WebKit runs in CI.

## 0.24.1 — 2026-11-05

- **A slow download is no longer stopped after two minutes.** Fetching a table from where it is published now shows how
  much has arrived ("1.5 of 8.8 MB") and offers Stop; there is no time limit. Found when Zenodo answered at once and
  then sent the NYC package at about 5 KB/s, and the old limit called a working download a failure.
- Regression is checked by the validation lab (check 33) against statsmodels on the Salmonella and NYC models: it
  agrees to 1e-10 or better. The check found one defect, recorded in TODO: a separated term (no finite estimate) is
  shown as an ordinary odds ratio, without a warning.

## 0.24.0 — 2026-11-04

- **Regression follows the declared study design**, read from the same declaration the Two-by-two table reads. A rate
  ratio is reported under a cohort or ecological design; an odds ratio wherever the two-by-two allows one, named the
  prevalence odds ratio under a cross-sectional design. A Poisson model under a case-control or cross-sectional design,
  or any model under a case series, stops and says why. With no design connected, nothing changes. Experiment 176.
- **A regression appears in the N3 & evidence view**: the fit as `fw:RegressionModel`, each coefficient as an
  `fw:EpiEstimate` naming its term, interval method and level. Two SHACL shapes check it, and the two-by-two's
  estimates are now checked by the same shape. Regression widget 0.2.0.
- Fixed in the ontology: the interval properties were declared for rate ratios only, so under inference every
  two-by-two estimate would have been read as a rate ratio.
- Not yet: the Rate ratio widget does not follow the same licences, and no worked example declares a design for a
  regression.

## 0.23.0 — 2026-11-04

- **A table holds up to 250,000 rows, from a file of up to 40 MB** (was 20,000 rows and 5 MB). The number was measured,
  not chosen: at 250,000 rows importing, saving, reopening, selecting a date range, panel charts, regression and export
  all completed in Chromium; at 500,000 the page stopped answering, and at 1,000,000 the tab crashed. A panel chart of
  250,000 points takes about 30 seconds to draw. Experiment 175.
- Regression fits up to 250,000 rows; panel charts draw up to 250,000 points.
- The regression kernel downloads at 37 KB, down from 117 KB.
- Limits: measured on one Mac in Chromium, with tables of seven columns. Not measured in WebKit or on a smaller machine.

## 0.22.0 — 2026-11-04

- **A table's rows are kept in the dataset store, not in the saved workflow.** Every other input already kept its data
  once in IndexedDB with the workflow holding a reference; Table input kept its rows inline, so a large table (NYC's
  92-column wide read) could not be saved within the browser's local storage. Rows are now stored under a content key
  (`table-<rows>-<hash>`) set on every save. Exports are unchanged and still carry the rows. This removes what held the
  20,000-row cap; the cap itself is not changed yet — experiment 175 measures where the application stops coping.

## 0.21.0 — 2026-11-04

- **Connect a dictionary to the data, explicitly.** After choosing which dictionary column holds what, a Connect step
  lists every column of the table with the dictionary variable that describes it: the same name connected, a near one
  (`sex*` for `sex`, `galiamelo*` for `galiamelo_apr2`) suggested and marked for you to check, the rest "not in the
  dictionary". Proposals and the check follow your connections.
- **Make a dictionary when the source has none.** Accepted descriptions become your dictionary for that source, kept on
  this device and offered to any other table reading the same file; **Download as a data dictionary (CSV)** to share it.
- Validation: Chromium locally; WebKit in CI.

## 0.20.0 — 2026-11-04

- **What the columns mean.** **Describe columns…** on a table opens a dialog for each column's label, unit and
  description. A data dictionary (CSV, Excel or Stata, from disk or from the same fetched zip) proposes them; you
  accept. The dictionary is matched mechanically against the table, missing counts included. A Stata file's variable
  labels are proposed at import. Table input 0.6.0, experiment 172.
- **Undescribed columns are a data quality finding**, in Data quality, on the node and in the write-up's Methods; never
  a refusal. A dictionary that disagrees with the table is one too.
- A regression's terms and a chart's panels show each column's meaning beside its name.
- Validation: Chromium locally; WebKit in CI.

## 0.19.1 — 2026-11-04

- **A fetched table already on this device fills itself.** Opening or running a workflow reads its table from the copy
  the device keeps, with no download and nothing to press; only a file not yet on the device needs **Fetch the
  table**. On the published 0.19.0, each NYC workflow stopped with "Select the node and choose Fetch the table".
- The table says where its rows came from, read from this device or downloaded, and the message stays.
- Notes' **Run workflows** counts only workflows that ran, and names any that still need their table fetched.
- Validation: Chromium locally; WebKit in CI.

## 0.19.0 — 2026-11-04

- **Regression**, a new widget: logistic regression (odds ratios) and Poisson regression (rate ratios) of an outcome
  on an exposure, adjusted for numeric, categorical and spline terms, fitted in Fieldwork's own kernel. Poisson takes
  strata as fixed effects and an offset. Intervals are likelihood-ratio (the default), Wald, scaled for
  overdispersion, or HAC for counts correlated from day to day. A declared case-control design allows logistic only.
  Experiment 167.
- **Published results reproduced on the authors' data.** NYC: ozone 1.061 (1.035–1.088) per 10 ppb, the coefficient
  and HAC standard error equal to the authors' archived R result to 12 significant figures. Salmonella: Galia melon
  adjusted for age group and sex, 96.4 (15.4–2067), published 96 (15–2100); against panel controls 18.4 (4.6–101),
  published 18 (4.6–100).
- NYC and Salmonella each gain a fourth workflow that fits these models; NYC's manual covers its.
- The detached manual opens over the canvas beside the library, lower than before, instead of over the Inspector whose
  fields it tells you to fill.
- Select rows offers its date range even before a fetched table's rows are on the device. Opened from the catalogue,
  NYC's 1 to 14 June showed as an empty text box until Fetch the table was pressed.
- Validation: Chromium locally; WebKit in CI. No independent laboratory check yet.

## 0.18.0 — 2026-11-04

- **A fetched file is downloaded once per device**, not once per workflow. It is kept by its digest and read from the
  device, checked again, whenever a table in any project names the same file. The table dialog reads the device's copy
  of a URL fetched before and offers **Fetch again from the source**. Experiment 170.
- A manual can say to reuse a node from another workflow of the project (**From this project**); NYC's second
  workflow now shares the first's table, so nothing is fetched or set up twice. Experiment 173.
- A fetched wide table's source file is kept by digest too, so several workflows on one file do not fill the save.
- **Every value the manual says to type has a Copy button**: names, subjects, titles, labels, units, dates, and URLs
  such as the Zenodo package's. A step inside a dialog names the dialog where its steps begin, so **New project** and
  **Create project** read as one action.
- A fetch that has not finished after two minutes is stopped and says so, instead of showing "Fetching…" forever.
- **Many columns are chosen in a dialog of their own.** A file with more than 12 columns shows a one-line summary and
  **Choose key columns…**, where names can be pasted (the manual's Copy gives them), found, or all unticked. Read long,
  such a file starts with nothing ticked instead of every column but one. Table input 0.5.0.
- **The detached manual stays usable above a dialog.** Opening Import tabular data (or any modal) no longer blurs it:
  it stays where it is, readable, scrollable and copyable, so the file to choose in a zip can be read off it.
- Validation: Chromium locally; WebKit in CI.

## 0.17.0 — 2026-11-04

- **The manual detaches** into a panel that stays beside you while you build in a project of your own: New project,
  the library and the canvas all stay in reach. Click a step when it is done; progress is kept on this device, the
  panel survives a reload, and **Close** ends it. Detach again from the Manual tab to resume at the first step not
  done. Experiment 173.
- Validation: Chromium locally; WebKit in CI.

## 0.16.0 — 2026-11-04

- **A chart can draw one panel per variable** on a shared axis, each with its own scale: visits, ozone, PM2.5 and
  temperature moving together through time. Bars or a line per panel, a period shaded across them all, a missing value
  as a gap. No second y axis. Experiment 174.
- NYC gains a third workflow, *Did visits move with the air?*, May to July 2023 with the smoke days shaded, and its
  manual covers it.
- A wide table's source file is kept on the device by digest, like other node data, instead of inside the saved
  workflow, which a 92-column file did not fit. An export still carries no rows of a fetched table.
- Validation: Chromium locally; WebKit in CI.

## 0.15.0 — 2026-11-04

- **A worked example can carry a manual**, shown in a new **Manual** tab: how to build each of its workflows by hand,
  step by step, the open one first. NYC is the first. The example's from-scratch test performs the same file, so a
  step that stops matching the screen fails a test. Experiment 173.
- Each step that adds a widget says to find it by name in the library's search.
- CI checks out the London example and keeps failed tests' screenshots and traces.
- Validation: Chromium locally; WebKit in CI.

## 0.14.0 — 2026-11-03

- **Select rows by value keeps a range**: From and To, for a column of dates or numbers. A long list of values can be searched. Experiment 171.
- A fifth worked example: ozone and child asthma emergency visits, New York City, 2016 to 2025. Its counts are fetched from the authors' Zenodo package when it is opened, and never held in the example.
- A table read from CSV can have up to 20,000 rows, as tables allow; points stay at 2,000.
- **A table can be fetched from a URL**, a zip included. The project keeps where it came from instead of the rows, so an export does not republish it, and another device fetches the same file by digest. Experiment 170.
- **Tables can be imported from Stata files**, Stata 8 onward, as well as CSV. Dates read as dates and missing values are empty; value labels are not applied. Experiment 169.
- **An interactive map plays through frames.** A join given **Frames from** keeps one value per frame on every part, such as a year; the interactive map then plays through them with one key for every frame, only while every part is in view. Nigeria's third workflow plays 20 birth cohorts. Experiment 168.
- An interactive map can import an OpenStreetMap extract as PMTiles, once, for the area it draws. The workflow keeps the spec and the device keeps the tiles.
- A polygon layer's key, figure and interactive map now agree on what shades it. A ruleset's classes are keyed by name, and the interactive map draws them.
- Two-by-two: Exposures to compare offers only columns holding the two chosen groups, and reads down one left edge.
- Nigeria carries an illustrative 20-year report and a fifth workflow. All three worked examples are laid out with Tidy.
- **Append rows**, a new widget: stack a second table's rows under the first, as pandas concat does, with the source of each row and a new primary key as options. Experiment 166.
- A fourth worked example: *Salmonella* Braenderup and melons, Germany 2021, a case-control study with two control groups.
- The two-by-two machines its formulas with several exposures too, once and in symbols.
- An interactive map can label polygon parts by any attribute they carry.
- A note cites works from a Citations tab. The note is marked with numbers and References is assembled from what is cited; References no longer holds notes of its own.
- Deduplicate records takes rows of one table: rows repeating the primary key are compared, exact copies merge, and a person decides the rest and which row stays.
- Import tiles works for a map of a study area or points, not only polygons.
- A table is no longer refused for a quality problem. Primary and secondary keys can be declared, and findings flag the node, fill a Findings tab in Data quality and reach the write-up.
- CI: `verify` is pinned to `ubuntu-24.04`, checks out all three examples, and a missing sibling now skips its test instead of failing it.
- **A map says its basemap is context.** Over an online basemap, Methods gains a machined limitation: the
  tiles can change or go, and no value depends on them.
- Validation is as gated per commit: Chromium and WebKit browser tests and the unit suite. The adjusted estimates the new examples publish are not reproduced; the app computes crude measures.

## 0.13.0 — 2026-11-02

Covers the work of 2026-10-30.

- **Fast editing no longer fails in Safari.** Every edit rewrote the page address, and Safari refuses more
  than 100 of those in ten seconds, which stopped the edit. It now writes only when the address changes.


- **Polygons are records.** *Join a table* takes a polygon layer and keeps what each polygon holds, and
  *Apply ruleset* reads polygons and returns classes a map can shade. Nigeria's 774 LGAs now reach a map,
  and a rule over two values, from an empty canvas. A table can hold 20,000 rows and a layer 1,000,000
  vertices, up from 2,000 and 200,000.

- **Study design asks how the exposures were chosen,** and the checklist reports how many were compared
  rather than flagging each as different from the declared groups.

- **A two-by-two compares several exposures on one node.** With a line list, tick the exposures and get
  one table with a row each, unranked, with rows left out counted and the number of comparisons
  stated. Under a declared case-control design it shows odds and no attack rates. Oswego's menu goes from 43 nodes to 3.

- **A two-by-two reads a line list directly.** Tick *Each row is one subject* and connect the list, with
  no count first. Measures now compute in FW's own Rust kernel. Reported values are unchanged.

- **A line list can be counted.** *Total within groups* gains **Count rows**, which says how many
  rows agree without reading their value, so a person-level line list reaches a two-by-two. It counts
  rows, not people: import one value column.

- **Every table widget shows its table, before and after.** **View this table** now sits at the top
  of the Inspector rather than below *Remove node*. It opens on the step's output, with a toggle to
  the table that came in, so a chain can be read one change at a time. A step with two inputs names
  each. If settings have changed since the run, the viewer says it shows the last run.

- **Study design asks what the selected design needs, and reads the workflow against it.** Selecting
  a design now shows its questions, and each answer writes a sentence into Methods. A checklist
  separates what Fieldwork read from the canvas from what you declared. Surveillance is no longer a
  design: it is a source, and a saved surveillance declaration is removed by migration.

- **A two-by-two with no design no longer claims one.** With no *Study design* connected it still
  computes every measure, now named by its arithmetic: ratio of row proportions, cross-product
  ratio, difference of row proportions. A line says so, and the receipt records it. Saved workflows
  run unchanged and give the same numbers, under the new names until a design is connected.

- **The epidemiology widgets write their own equations.** Rate, Rate ratio and Two-by-two now
  machine a note into **Methods** on the Notes tab every time they run, carrying each computation
  twice: once as the formula, once with this run's numbers substituted into it. Snow's two-by-two
  reads `OR = (844 × 19,115) / (166,810 × 18) = 5.37` as typeset mathematics, which is a line a
  reader can check with a calculator — the symbolic form alone would only restate a textbook. The
  claim that this is possible was written down on 2026-10-26 and the renderer that draws it was
  built on 2026-10-30; until now nothing had ever constructed one.
- **The two-by-two is written in a, b, c and d.** The four letters every textbook formula uses, and
  the ones an FETP trainee is taught, with what each one counts. The code has used them internally
  since it was written and showed them nowhere.
- **Each interval method is cited, or the note says no source has been read for it.** Katz 1978 for
  the risk ratio's interval and Woolf 1955 for the odds ratio's, both with DOIs and both looked up
  rather than written from memory. The unpooled Wald risk difference and the rate ratio's
  log-normal interval have **no** primary source and the note says so, because the construction is
  standard and the implementations consulted attribute it to nobody. A plausible-looking reference
  is worse than none: it is the point a reader stops checking.
- **A rate cites nothing, and says why.** There is no interval, so there is no estimator — the
  division is arithmetic and the multiplier is a scale. A reference list that was empty for an
  unstated reason would read as an oversight.

**What this does not do, stated because a typeset formula invites the assumption.** The equations
were read off each widget's own implementation, so they say what this application computes. That
the code matches what Katz and Woolf published is a different question, and the computations audit
that would answer it is recorded in `TODO.md` and does not exist. Nor does anything here check
whether a measure is estimable under the study design it was computed for: a case-control table is
still offered a risk ratio, and this change renders that formula beautifully.

- **Tables, maps and charts state their own shape in the write-up.** The three things a Results
  section is mostly made of could draw a figure, record a receipt for it, and put no words at all
  into the write-up. Each now machines a note into Results: a table names its columns as it spells
  them and reports empty cells as unknown rather than zero; a map lists its layers bottom to top
  with their feature counts, including any layer connected and not drawn; a chart carries the line
  it already stated — which had existed for weeks and reached no reader — and warns where a bar at
  zero may be a withheld value rather than a measured one.
- **The caption stays yours.** A caption states the subject, the population, the place and the
  period in your words, and none of that can be read off a table. What is machined is the material
  you write it from. An earlier build of this version called its output a caption, which claimed
  the writing rather than doing it.
- **Nothing machined writes its own number.** A figure's number depends on where it sits and on
  the venue being prepared, so it is worked out when a document is rendered rather than written
  into the text — right when machined and wrong the first time somebody moved a card.

See [experiment 151](docs/experiments/151-typesetting-an-equation-a-practitioner-wrote.md),
amendment of 2026-10-30, and [experiment 141](docs/experiments/141-organising-snows-notes.md)'s
amendment of the same date for captions, numbering and cross-references.

## 0.12.0 — In development

_A note on the number: `package.json` read 0.11.0 while the newest section below was 0.10.0, so
0.11.0 shipped without a section and some of the work recorded under 0.10.0 belongs to it. The
earlier sections are left as written rather than reshuffled — the dated record is the point — and
this section covers the work of 2026-10-25 and 26._

- **A map draws every layer you connect.** Wire a study area, a point layer and a polygon layer
  to one map and you got the polygons alone — while the Sources line under the figure, built from
  the connections rather than from what was drawn, named all three. A map's *ports* stopped
  depending on a mode in October; its *value* did not, so whichever port ranked highest built the
  figure and the rest were discarded before anything could draw them. That is the fourth layer lost
  this way — the study area, the facilities and the raster each went the same way and were each
  patched one at a time. The map now composes: the study area it sits on, every point layer beside
  it, and the polygons as a layer among them.
- **Polygon layers that carry names are told apart by colour.** Two reaches of a river were drawn
  in one hard-coded blue on the interactive map, and in two steps of a sequential ramp on the
  static plot — a ramp whose whole design is that a reader can rank the shades, over categories
  that have no rank. Named regions now take the categorical palette, and only while the colours
  stay distinct: past eight regions the colours would repeat, and a repeated colour reads as a
  grouping nobody claimed, so the layer keeps a single neutral fill and the names stay in the layer
  list and the popups. Travel-time bands are a sequence and keep the ordered ramp.
- **The map legend names what is on the map.** A figure drawing two reaches of a river carried a
  key reading *Modeled catchment, Observations, Sites* — none of which it drew. The fallback behind
  that had been left in place twice while the case in front of it was fixed. A layer whose features
  are named is now its own key.
- **Collect polygon layers works with the layers you have.** It offers six slots and required all
  six, so a widget for gathering *several* layers refused two with *"needs its polygons_3 input
  connected"*. One layer is required now; the rest are spare slots.
- **A study area reports its own size correctly.** A boundary of several parts — South London's
  32 sub-districts are one shape with 33 — reported *"0 vertices"* on its node, because the count
  read the first part's rings instead of its points. It reads 2,182 now.
- **A chart draws a table.** A rate, a total within groups, a derived value, a two-by-two — every
  one of them produces a table, and no chart in the application could receive one. Chart declared a
  single port, *Reasoning result*, and its Input mode offered a choice between two things that were
  not what you had; a table of deaths per 1,000 people across 32 sub-districts had nowhere to go.
  As the practitioner put it: *"If the table's role is to represent decisions, it's still a table
  and if it has categories with numeric values, it can be presented as a chart."* A reasoning
  result was always rows with a category column — Table already accepted all four shapes on one
  widget — so the distinction was about where the rows came from, not what they were. Chart now
  declares every port it can draw, requires none of them, and lets whatever you connect decide; the
  mode question is gone. A table says itself which column labels the bars and which number they
  carry, so nothing is asked of you. **And the bars are now the numbers.** A rate was being rounded
  to a whole number before it was drawn, which on those 32 sub-districts turned 16 distinct rates
  into 6 distinct bars — Battersea 5.11, Leather Market 5.30 and Camberwell 5.41 drew one identical
  bar, while Clapham 1.47 and Christchurch 1.56, nine hundredths apart, drew different ones. The
  variation between sub-districts is the whole point of the figure. A chart now states what its
  bars measure and carries the unit the table declared, so the axis reads "per 1,000 people"
  instead of "Recorded count", and the rate table carries that unit at all — it used to show a
  column headed *per 1,000 people* above the line *value in an unstated unit*. Snow's South London
  example draws its 32 sub-districts as bars, from the rate's own chart, so the figure keeps the
  caveat that the 1854 deaths and the 1851 census are three years apart.
- **Polygon layer acquires its own features, and has a panel to do it from.** The widget could
  read a GeoJSON file, and nothing in the application could tell it to: its naming property, its
  layer name and its optional study-area port could be set only by editing a workflow file, so the
  only polygon layers anyone ever saw were the ones a worked example shipped. It now has an
  Inspector with both ways in. The new one reads areas of a kind you choose — water, buildings —
  out of a published OpenStreetMap extract on your own computer, within the connected study area's
  bounds plus a margin you set, and offers a download link for the smallest catalogued extract that
  covers that box. The extract is read where it sits and never copied in; the panel records its
  name and digest, says how many features came back and how many were below your vertex threshold
  or outside the box, and states the ODbL terms and that they are share-alike. The read runs in a
  worker and reports each pass by name — a London-sized extract takes about sixteen seconds, which
  on the main thread is sixteen seconds of a page that answers nothing. Acquired features are kept
  on the device by digest rather than inside the workflow: one water layer measured 788 kB of
  workflow against a 5.2 MB budget written twice per save, which is a sixth of everything you have
  saved for one layer. The margin has no ceiling, because the lock this was built to reach sits
  4,460 m outside the study area's bounds. A layer read for one study area is refused for another
  rather than drawing a map with a hole in it. There is a manual page for it now too.
- **A run whose canvas moved on reports honestly instead of looking like a failure.** Opening a
  worked example from the catalog while another run was still computing threw an error, so a run
  that had finished said *"Workflow stopped"*. The results of that run belong to the workflow that
  produced them and are still discarded, which is the existing rule; what changed is that the run
  now names the workflow it belonged to, says its results were not kept, and says to open it again
  to see them — and the canvas you moved to is no longer marked as already run. Found on the
  deployed instance, 2026-10-27.

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
  no totals rather than a wrong one. Having two key columns is not enough to earn a grid: an
  assignment table naming each of sixty points and the site it was assigned to has two, and
  pivoting it drew a 480-cell grid holding sixty numbers. A grid is drawn where the cells are
  at least half filled — every row of a tabulation exists for every column by construction,
  and an assignment's rows do not — and a sparser table stays a list. A grid that is full
  enough but has a hole shows the hole, because nothing was said there.

- **Rules written on a step read the port that step has.** Writing your own rules on a step keeps
  the wiring of whatever ruleset it was holding — the step still takes what it took — but the
  run looked for a port named `subjects` whichever port the step actually had. A step forked
  from the projection extract carries `projections` and never had a `subjects` one, so it
  refused with *"Connect records to classify"* about an input that was connected. Found on the
  Manila extract step.

- **A step fed by a table is offered that table's columns** when writing rules on it. The columns
  were read from a point layer's properties alone, so a table-fed step was told to connect the
  records it already had, and no rule could be written on it at all. A row's attributes are its
  key columns plus the declared value field, which is how the run has read them since 2026-10-16.

- **A published ruleset shows its rules, and a copy can be edited.** A pinned step gave its
  title, version, description, settings and obligations and never what it decides, so the step a
  worked example is built around could not be read — and forking it opened a blank editor. The
  rules are now on the panel, drawn from the form every bundled ruleset already carries. Where a
  ruleset reads the columns you connect — it declares the bindings and names the same fact
  generator rules written here use — **a copy carries its rules and bindings over**, because
  that copy is fed identically. The eight with their own fact generators still refuse to be
  copied, and still say why. Resetting the example puts the step back.

- **A 2×2 can show its margins, when somebody vouches for them.** A grid totalled only where the
  table stated a unit, which is a weak proxy for the claim that matters: South London's mortality
  table states *"people or deaths, as the measure says"* — prose denying that its values are
  commensurable, read as granting it — while Snow's Table IX states nothing and, once two
  house-counting measures are selected, has the property and cannot say so. A tabular output can
  now assert it, and the figure says underneath that it was asserted rather than checked. The
  per-measure unit this really wants is recorded, not built.

- **A grid is drawn only where both axes are categories.** Density was not enough: Manila's 194
  facilities all take one gauge, so the assignment is 194 rows against a single column and
  perfectly dense, and drawing it as a grid hid the distance column a reader came for.

- **A value can be derived from two others, and rows can be kept by value.** a classic analysis package separates
  `DEFINE` and `ASSIGN` from `IF`, and only the `IF` was here: rules conclude a *term* about a
  record and never a number computed from other numbers. **Derive a value** computes one, once per
  group of rows sharing the other key columns — a table here is long, so the two numbers combined
  are two rows and not two columns. **Select rows by value** then selects what a figure should show.
  Together they build South London's 2×2 **in** the application: `houses` minus `deaths` gives
  `houses without a death`, and keeping those two drops the total they partition. Each row sums to
  Snow's published house count. The assumption rides on the node's own label — his 1,263 are
  deaths, not houses in which a death occurred — because it changes what the figure means.

- **A wide file can be read as published.** One row per subject and a column per variable is how
  epidemiological data arrives, and the importer refused it outright, calling a repeated key "the
  signature of a wide table". Every long table here had therefore been melted by hand elsewhere,
  including the ones the worked examples ship. The reader is in, and the Inspector for it is not
  yet, so this is not reachable from the application in this release.

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
  The method is the one in the practitioner's own a record-linkage command the practitioner wrote earlier: blocking first, so pairs
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
