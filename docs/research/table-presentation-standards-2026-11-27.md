# Table presentation standards

_Created 2026-11-27 · Updated 2026-11-27_

Research for an enhancement to the **Table** widget, built in Table 0.15.0 (its manual page, History). Read from open
sources on 2026-11-27.

## What was asked

The practitioner, 2026-11-27: *"Since table outputs are render facing, we should be able to style them according to
established table presentation standards."* A Table output is read on screen and goes into the write-up. Which
standards apply, what do they agree on, and what would Fieldwork's tables change to meet them?

## What Fieldwork's tables did before Table 0.15.0, read from the code

- A tinted header row, held at the top as the table scrolls, and a line under every row.
- No caption: the table's name is the Results tab's, outside the table.
- Numbers right-aligned with equal-width digits only where a cell is marked `number`; elsewhere every cell is left.
- An absent value is written *unknown*.
- Decimal places as the data hold them, not set per column.

## What the standards agree on

Read from open sources on 2026-11-27 (below). Each rule is one a renderer can apply on its own, from what the table
already knows.

| Rule | Supported by |
| --- | --- |
| A title above the table saying what, where and when, in a `<caption>` so a screen reader announces it | APA, ICMJE, MMWR, EID, CDC's *Principles of Epidemiology*, the Field Epidemiology Manual, the UK Analysis Function, W3C |
| Real header cells (`<th>` with `scope`), short; explanation goes in notes | W3C, ONS, Analysis Function, ICMJE, APA |
| Units once, in the heading or title, never in each cell; a rate names its denominator ("per 100,000") | EID, Analysis Function, CDC *Principles*, Remshard and Queenborough |
| Numbers and their headings right-aligned, in equal-width digits; text left | Analysis Function, ONS, Remshard and Queenborough, the Field Epidemiology Manual (decimal point) |
| One number of decimal places per column, set by the measurement; a leading zero (0.6) | APA, Analysis Function, ONS, Remshard and Queenborough, the Field Epidemiology Manual |
| Thousands separators from four digits, never on years | Analysis Function, Remshard and Queenborough |
| Few rules and no vertical lines: top, under the header, bottom, and one above totals | APA, EID, Analysis Function, Remshard and Queenborough, the Field Epidemiology Manual |
| Grouping by space, not blank rows (which confuse screen readers) | Analysis Function, APA, Remshard and Queenborough |
| Totals at the edge, set off by a rule; say where rounded parts do not add to the total | Analysis Function, APA, CDC *Principles*, ONS |
| Notes below: abbreviations, definitions, exclusions, then the source | APA, ICMJE, EID, MMWR, CDC *Principles*, the Field Epidemiology Manual, Analysis Function |
| Rows in a meaningful order: natural order for age or time, otherwise by size | Analysis Function, the Field Epidemiology Manual (MMWR differs, below) |
| Colour never the only carrier of meaning; text, never an image | Analysis Function, WCAG |

**For epidemiology in particular:** the count beside every rate or percentage (ICMJE; STROBE item 11); the number
missing for each variable, so a visible *Unknown* row rather than dropped records (STROBE 14b); a confidence interval
with every estimate of association, written as a range with an en dash, "2.1 (1.4–3.0)" (STROBE, ICMJE, MMWR); small
cells suppressed for confidentiality or reliability by a threshold that differs by agency (CDC WONDER under 10, United
States Cancer Statistics under 16), so a declared setting, stated in the table's note.

## Where the standards disagree

The standards disagree on five things:

| Question | The positions |
| --- | --- |
| How an absent value is marked | APA: blank, a dash where that could confuse. MMWR: never blank, an em dash or "not calculated". EID: "NA" or "ND". Analysis Function: bracketed codes saying why: [x] not available, [z] not applicable, [c] confidential, [u] low reliability, [low] rounds to zero. Fieldwork today: *unknown* |
| Footnote markers | APA: letters a, b, c. MMWR and EID: *, †, ‡, §. Analysis Function: none in data cells, "[note 1]" in titles and headings, because screen readers miss superscripts |
| Shading alternate rows | The Field Epidemiology Manual: yes, light. Analysis Function: no, or at 3:1 contrast and never the only carrier |
| A count and its percentage, or an estimate and its interval, in one cell or two | MMWR: one, "120 (34.5)". Analysis Function, for spreadsheets: one value a cell |
| Order of geographic rows | MMWR: alphabetical unless a gradient is shown. Analysis Function and Wainer: by size or natural order |

## Sources

All read as web pages on 2026-11-27; no file was downloaded.

- APA 7 tables: the official page returned nothing; read through [Purdue OWL](https://owl.purdue.edu/owl/research_and_citation/apa_style/apa_formatting_and_style_guide/apa_tables_and_figures.html). To verify against APA before citing it directly.
- [Remshard and Queenborough, *Design of tables*, Ecology and Evolution, 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10346464), CC BY.
- [ICMJE Recommendations, preparing for submission](https://www.icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html).
- [STROBE explanation and elaboration, PLoS Medicine, 2007](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0040297), CC BY.
- [MMWR author guide](https://www.cdc.gov/mmwr/author_guide.html); [Emerging Infectious Diseases, tables](https://wwwnc.cdc.gov/eid/pages/tables.htm).
- [CDC, *Principles of Epidemiology*, Lesson 4](https://archive.cdc.gov/www_cdc_gov/csels/dsepd/ss1978/lesson4/section2.html); [CDC Field Epidemiology Manual, *Describing Epidemiologic Data*](https://www.cdc.gov/eis/field-epi-manual/chapters/Describing-Epi-Data.html).
- [United States Cancer Statistics, suppression](https://cdc.gov/united-states-cancer-statistics/technical-notes/suppression.html); [NCHS, statistical reliability](https://www.cdc.gov/nchs/hus/sources-definitions/statistical-reliability.htm).
- UK Government Analysis Function: [tables](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/), [symbols in tables](https://analysisfunction.civilservice.gov.uk/policy-store/symbols-in-tables-definitions-and-help/), [releasing statistics in spreadsheets](https://analysisfunction.civilservice.gov.uk/policy-store/releasing-statistics-in-spreadsheets/).
- ONS service manual: [rounding](https://service-manual.ons.gov.uk/content/numbers/rounding), [table component](https://service-manual.ons.gov.uk/design-system/components/table/).
- W3C: [tables tutorial](https://www.w3.org/WAI/tutorials/tables/), [caption and summary](https://www.w3.org/WAI/tutorials/tables/caption-summary/).

**Not opened or closed:** Schwabish, *Ten Guidelines for Better Tables* (2020): only the abstract read; whether it is
open was not confirmed, and the guidelines' titles came from a blog. Tufte's book is closed; Wainer's papers closed
or PDF only. The WHO style guide and the STROBE checklist are PDF only. CDC WONDER's threshold came from search
snippets. None of these carries a claim above on its own.

## What this does not establish

That following these rules helps a practitioner read a Fieldwork table: the sources are style guides and a survey of
published tables, not trials of reading. That one house style suits every reader: the five disagreements are real, and
the standards were written for print journals and statistical releases, not for an interactive table on screen. No
source covers sorting, scrolling or frozen headers beyond ONS's component, nor tables in a locale that writes decimals
with a comma.
