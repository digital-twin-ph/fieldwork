# Audit — the three target outputs against the documents they follow

_Created 2026-11-19 · Updated 2026-11-19_

Asked by the practitioner on 2026-11-18: after the vegetation reader and Clip raster, a quality audit of the target
outputs. Three drafts, each in the kind it is meant to show:

| Example | Drafted as | Printed (A4, Chromium) | Compared with |
| --- | --- | --- | --- |
| South London 1854 | Publication | 22 pages | the three model papers in `reports/South London publication, model papers.md` (Coleman 2020, Barnett 2020, Stang 2022) |
| MERS Korea 2015 | Situation report, WHO style | 29 pages | WHO's summary and risk assessment of 3 June 2015 (4 pages), the ECDC rapid risk assessment, and the open sit rep templates in `reports/Sit rep and surveillance report templates.md` |
| NYC asthma 2016–2025 | Report, MMWR style | 9 pages | McArdle et al., MMWR 2023;72(34):926–32, read at cdc.gov |

**How it was done.** Each example was opened from its own repository at 0.149.0, every workflow run, and the draft
printed to PDF in the print view, the way a person would save it. NYC's table was fetched from a local copy of the
authors' Zenodo package; its satellite source was blocked, so that workflow's part is whatever the run left. Each PDF
was read page by page against its references, and every finding traced to the code that makes it.

**What counts as a defect.** The person writes the prose; Fieldwork writes none. An unwritten section is not a defect.
What Fieldwork makes itself is: the masthead, captions, the notes the steps write, figures, maps, tables, legends,
numbering, references and print layout, and any interface text that reaches the printed page.

## The finding

**As printed, each draft is the run record laid end to end, not the document it follows.** Every result of every
workflow goes in, in record order, on its own line; the steps' notes print as Methods or Data notes; every display
formula gets an appendix; tables print up to 50 rows and will not split across pages. That is why the sit rep is 29
pages against WHO's 4, and why the publication's Results is 7 tables and 6 figures with nothing between them. Most of
the large items are experiment 202's open gaps (4, 7, 8, 9, 10, 13); this audit shows them on paper.

Beneath that, a set of defects appears in **all three** drafts, each small to fix:

| # | Defect | Where | Cause |
| --- | --- | --- | --- |
| A1 | Tables cut off at the right edge in print | MERS Tables 1, 6, 8, 12, 22; NYC Table 2 | `.notes-figure{overflow-x:auto;white-space:nowrap}` prints as a clip (`styles.css`) |
| A2 | Empty headings and boxes print with nothing under them | Abstract, Conclusions (SL); Highlights, Situation in numbers, Risk assessment (MERS); Summary box, Abstract (NYC) | print hides `.pub-prompt`, but `publication.ts` has already counted the prompt as content and emitted the heading |
| A3 | Interface text in print: "See N3 & evidence for method.", "The step shows all of them.", "Connect a study design to say what they measure." | maps and charts in all three; MERS two-by-two | `map-communication.ts:82`, `chart-vega.ts:64`, `write-up-figures.ts:134`, `two-by-two-view.ts:113` |
| A4 | Caption row counts contradict the table: "64 rows" over 32, "165 rows" over 50 of 162, "16 rows" over 4 | all three | the caption counts the long table before it is pivoted (`artifact-notes.ts:85`) |
| A5 | Captions describe internal shape: "keyed by `supplier` and `measure`", "Each value is age", "one bar per row" | all three | `artifact-notes.ts:85–98`, `chart-output.ts:79` |
| A6 | ~~Basemap credited, not drawn~~ **Withdrawn 2026-11-19: not a defect.** The drafts were printed inside the browser tests' setup, which answers every OpenStreetMap tile with a blank one (`tests/fixtures.mjs`); the figures held 16, 9 and 42 tiles, each 1 × 1 pixel. A map that states no basemap draws OpenStreetMap (`DEFAULT_BASEMAP`), NYC's and South London's included | every map | the capture, not Fieldwork |
| A7 | Map keys list what the map does not hold ("Inside the study area (filled)", "Missing location (not plotted)") and do not tell the drawn layers apart ("Polygons · 34 features") | every map | `presentation.ts:358,362`; `map-communication.ts:63,75` |
| A8 | Fine print: legend, credit and tick text about 7–10 px once the SVG is scaled to the column; MERS transmission tree about 6 px | every figure | SVG text sized for the screen, scaled down in print |
| A9 | Table text grey on a grey panel | all three | `.notes-figure` colours carried into print (rule not pinned) |
| A10 | Data-quality findings printed as the study's Limitations: "8 of 8 kept columns have no stated meaning" | SL, MERS, NYC (five near-identical lines in NYC) | `isLimitation` takes every note whose function is limitation (`publication.ts:70,217`) |
| A11 | An unlabelled date under the title is the day the draft was made, read as the data date | MERS, NYC | `publication.ts:242` |
| A12 | Mostly empty pages and a stranded "3. Results" heading; a grey block after the last line | all three | `break-inside:avoid` on tables and figures, no `break-after:avoid` on headings; view background not reset for print |
| A13 | Every chart has two titles, one drawn inside and one in the caption | SL, NYC | the chart keeps its own heading; maps already drop theirs (`withoutHeading()`) |

## By product

### South London as a publication

**Text.** Methods is six pages of the steps' notes read as logs ("Rules evaluated directly over 3 records… Rule 1:
3."; "Method: log-normal (no primary source read)"), where the model papers state each method once in a few
sentences (gap 4). Twenty-one bare pointers "(Equation A10, in the Appendix.)" follow one another (`lifted()`,
`publication.ts:167`). There is no citation in the text: quoted notes are never numbered and Coleman (2019) is not in
References (gap 10); no figure or table is cited in the text. One quotation prints twice and another stops at "(No."
(the quoted notes' boundaries). Source sentences start lowercase and print twice, in Methods and in Data availability.

**Maps.** Labels clipped at the right edge ("Thames at Batt", "Hungerford Ma"); Figures 2 and 6 near-duplicates;
Figure 5 a choropleth over Snow's coloured plate, two colour codes competing; the example's own map credit says "see
NOTICE.txt" and "see the run receipt" (the example's `mapSourceNote`, fixed in its repository).

**Charts.** Figure 4's caption, "Chart. count by water_supply", is wrong: the bars are a ratio of 1854 to 1849 deaths,
the axis says "Value", and two category labels are truncated. Figure 1's caption carries tool commentary ("a withheld
value and a measured zero are drawn the same way here").

**Tables.** No table puts Snow's printed values beside the run's (the model papers' core; gap 13): 315.387 and 37.538
where Snow printed 315 and 37. Decimals inconsistent within a table (5.114 beside 1.56; 0.031539 beside 8.4). Tables
3–5 and 6–7 show the same houses three and two ways.

**References.** "Derived in Fieldwork from the sub-district layer" and "from the plate's world file" are listed as
works; Woolf (1955) is listed for a link the text never makes.

**Good.** The house-level rate ratio of 8.40 (6.84–10.32) matches Coleman exactly; cohort and ecological designs are
kept apart and labelled; the transcription check (224 of 224 cells) is stated; Vancouver references with DOIs; body
text, tables and captions at least 14 px.

### MERS as a WHO-style situation report

**Why 29 pages.** Every result of all 10 workflows (22 tables, 5 figures) goes into the situation, none left out by
default; 63 Methods notes print as Data notes over pages 21–25, where the templates keep data notes as footnotes or a
short annex; 13 equations get a two-page "Annex: equations", which no sit rep has; three line lists print 50 rows
each, where no reference prints a line list; seven pages are left half empty by tables that will not split.

**Text.** The five sources print twice, under Data notes and under References. The body points to "the Appendix"
under a heading that says "Annex". Each equation is captioned with its workflow's question and "ran 2026-11-19". "184
rows with no key value" in a line list of 162 rows (not traced). A node's default label, "Tabular data", is the
subject of a sentence. No contacts role, which the templates end on.

**Maps.** Double punctuation in a caption ("in hospital?."); classes for 13 points with the palest nearly invisible
on the pale ground; no hospital named, not even Samsung's 80 cases, where ECDC names them; the inset labelled
"Gyeonggi" with a leader line near Seoul.

**Charts.** The epi curve is Figure 5 on page 18; the reader first meets a 162-row line list, where WHO and ECDC
lead the update with the curve. Its caption says "4 values, one per `Date of onset, by day`" (one per generation is
meant). Secondary cases on a categorical axis spacing 0, 1, 2, 4, 21, 26, 38 evenly, hiding the tail; y axes say
"Value".

**Tables.** Table 14's headers left-aligned over right-aligned numbers, so 85 sits under "Dead"; rows in first-seen
order (weeks 27, 26, 24, 25, 23); intervals at mixed precision ("0.67476 to 4.71").

**Masthead.** The title falls back to serif: `.pub-kind-sitrep` does not match the class `pub-kind-sitrep-who`.

**Good.** The section order follows the templates' common core; unwritten parts are empty, not drafted; Korean column
names kept as KDCA spells them; the two-by-two shows its cells; undated records counted, not hidden; the curve by
generation is legible and right.

### NYC as an MMWR-style report

**Policy first.** Tables 1 and 2 print rows of NYC DOHMH's daily counts. Table 2 is the raw source file, 50 rows over
two pages, against the renderer's own rule that a source table is not printed in the body (`publication.ts:11`). A
shared PDF redistributes the counts, which the example must never do.

**Masthead.** The kicker prints "MORBIDITY AND MORTALITY WEEKLY REPORT" (`report-formats.json`), so a shared PDF could
pass for a real MMWR. No authors, affiliations, corresponding author or suggested citation: the format has no
masthead roles.

**Text.** No Discussion heading; Limitations stands alone where MMWR keeps it inside Discussion. No References,
although captions cite the Zenodo DOI: `sources` fills only from notes tagged as a source, and this project has none.
Methods prints the steps' fragments with no subject ("kept date from 2023-06-01 to 2023-06-14…") and a missing
thousands separator ("16538 rows"). The satellite workflow did not run, and the print never says so, though Figure 1
promises the comparison.

**Maps.** The key's black dot stands for "Inside the study area (filled)", but every monitor is drawn blue; the layer
keeps its default name, "My study area"; a map of the monitors, which is methods material, sits in the Introduction.

**Charts.** Figure 4's caption says "368 bars, one per date" over four panels of which one is bars. Panel axes are
raw column names (`tmean`, `pm25`, `o3`), the smoke fortnight's shading has no key, dates print as rotated ISO
strings. The authored note's paragraph prints between the diagram and its "Figure 1." label.

**Tables.** Values to 13–14 decimals; heads are raw names with no units; Table 3 prints p as "0" where MMWR prints
p<0.001; `tmean_lag03` is adjusted for and absent from the table.

**Good.** The Summary box's three questions match McArdle exactly; numbering is sequential; Table 2's header repeats
across the break; the regression note is complete; the chart source lines name the Zenodo DOI; Figure 4's aligned
panels with the smoke shaded are MMWR-grade in concept.

## Fixes, grouped

**Text** — small: A2, A3, A10 (data-quality findings stay in the data quality tab), A11 (label the date "Drafted",
and print the data-as-of where the format has one), the NYC kicker, sources printed once, Appendix or Annex as one
term, the serif fallback, double punctuation, thousands separators, a line saying which workflows did not run.
Medium: References filled from the inputs' declared sources; masthead roles (authors, affiliations, citation) and a
contacts role. Large, and 202's to design: Methods from the steps' notes as a method stated once per analysis (gap 4),
citations and cross-references in the text (gap 10).

**Maps** — small: A7's keys listing only what is drawn; the default layer name; clipped labels. Medium: credits and
keys under the figure as page text, at page size (A8); naming the largest places on a point map. A6 was withdrawn: the capture's blank tiles.

**Charts** — small: A13, the axis quantity in place of "Value", wrong captions (South London Figure 4, MERS Figure 5,
NYC Figure 4), commentary out of captions. Medium: readable date ticks; a numeric axis for counts; the tree's text
size.

**Tables** — small: A1, A4, A5, header alignment, rows sorted by key, rounding to a stated precision, p<0.001. Medium:
units in heads. Large, and 202's: a comparison table of the source's printed values beside the run's (gap 13).

**Per format, a design question for the practitioner:** what goes in by default. The publication and the MMWR report
can take every result and let the person leave some out; a sit rep cannot, at 29 pages. Options: a sit rep starts
with figures and tables left out and the person brings in what the situation needs; or source tables, line lists and
equations stay out of sit reps and MMWR reports by default (which also closes NYC's counts). Not settled here.

## What this does not establish

- One browser (Chromium), A4 print, one project each; no screen-view reading, no WebKit print, no project with its
  sections written.
- Font sizes and contrast were judged from the page images, not measured.
- No numbered WHO sit rep exists for Korea 2015, so the sit rep's right length is a judgement from the 4-page WHO
  summary and the ECDC assessment, not a measured standard.
- The numbers were not checked against their sources beyond 8.40, 315 and 37.5 (South London); MERS's 162 cases
  against KDCA's 185 was not reconciled.
- The causes of MERS's "184 rows" and the grey table text were not
  traced to a line.
- Whether a trainee or a reviewer would take any of these drafts for the document it follows: a reader study, not this.
