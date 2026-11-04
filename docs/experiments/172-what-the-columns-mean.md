# 172 · What the columns mean: column metadata, declared and matched

_Created 2026-11-04 · Updated 2026-11-04_

**Status:** asked — designed, with a first measurement by script; nothing built in Fieldwork.

## The task

The NYC table viewer reads *"Keyed by date, tmean, pm25, no2, o3. One value column, count, in an unstated unit."* A
chart drawn from it is titled with column names. Nothing in Fieldwork says what `o3` measures.

The practitioner, 2026-11-03, in order:

- *"there should be a mapping of raw column fields to human readable labels. That mapping could be cascaded downstream
  or queried upstream for example by the chart and map widgets"*
- *"That also carries semantics so important for receipts"*
- *"The reason why that's important is because that's metadata."*
- *"The metadata is the responsibility of the user. It may not come with the data set that he or she receives but that
  accounting of what the data means is an important step to avoid data quality downstream."*
- *"Some of our worked examples I think come with metadata"*
- *"Matching a codebook to the provided tables is a mechanical, deterministic step and should be tested with the three
  examples we have. It's a way to catch errors, even with historical examples like these, and may be important
  "authored" notes to keep about the example."*

## The design

1. **A Columns step in Table input**, beside Keys: label, unit and description for each kept column. The practitioner
   owns it.
2. **Standard form**: a CSV on the Web (CSVW) table schema. `name` is the column as the file spells it, `titles` the
   label, `dc:description` the description; the unit a QUDT unit, as buffer distances already use.
3. **A source pre-fills; the practitioner accepts.** Stata variable labels, or an imported dictionary (CSVW, Frictionless
   Table Schema, or a CSV dictionary whose columns the practitioner maps), fill the fields as unconfirmed. Evidence
   records where a description started and who accepted it.
4. **Matching a codebook is mechanical**: every column against the codebook, every declared code against the values
   held, every declared missing count against the count. Disagreements are findings.
5. **An undescribed kept column is a finding**, never a refusal: the node is flagged, Data quality lists it, the write-up
   carries a limitation.
6. **It travels on the table.** Pass-throughs keep it; Append and Relate merge it, and a conflict between two
   declarations is a finding.
7. **Where it shows**: figures default to label and unit; Inspectors, the table viewer and findings show the column name
   with the label beside it ([present data as-is](../../AGENTS.md)); receipts name the column and point to its
   declaration as it stood at run time. Editing a declaration makes the run stale.
8. **It is exported with the table** as a CSVW sidecar, including for a remote table whose rows are not republished.

Value codings (`1=case; 0=control`) are metadata too, and the Salmonella codebook is mostly that. They are in scope for
matching, and their display is decided when built.

## First measurement: the three examples with metadata, matched by hand-written script, 2026-11-03

Not yet Fieldwork code. A script read each codebook and its tables; these are the counts it found.

| Example | Metadata | Checked | Result |
| --- | --- | --- | --- |
| NYC | `Metadata/Core/ANALYSIS_DATA_DICTIONARY.csv`, Zenodo package | 92 entries against 92 columns of `analysis_master_raw_rebuild.csv`, 3,653 rows: names, `missing_n`, `nonmissing_n` | All agree |
| London | Stata variable labels in `londondataset2002_2006.dta` (format 115) | 5 columns | 4 labelled (`ozone` "Ozone level in ug/m3", `temperature`, `relative_humidity`, `numdeaths`); `date` unlabelled |
| Salmonella | `Codebook_Luczynska_et_al_2022.xlsx`, German and English | 82 codebook variables against 82 columns in each of two CSVs (298 and 81 rows) | Findings below |

Salmonella:

| Finding | Count |
| --- | --- |
| Columns with no codebook entry under their own name | 68 of 82 |
| …of which match once the `2` or `_apr2` week suffix is dropped | 40 |
| …with no entry at all (`age_group4`, `highestschool`, `bio_ever`, `vdate`, …) | 28 |
| Suffixed food columns holding only declared codes or `NA` | 40 of 40, both files |
| `sex` holds `Male`/`Female`; the codebook declares `1=male; 0=female` (questionnaire: `0=male`) | both files |
| `schule` = `2`, not in the Stata coding (questionnaire: Realschul diploma) | 59 + 12 rows |
| `schule` = `6`, the questionnaire's code where the Stata coding says `0` | 8 rows |
| `ausbildung` = `6`, likewise | 14 + 1 rows |
| `biolm` = `4`, likewise | 2 rows |
| Missing written `NA`; the codebook says blank | throughout |
| Variables coded differently in the questionnaire and in Stata | 46 |

None of the disagreeing columns is used by the Salmonella example, whose numbers come from the food columns, which agree.

## Validation it commits to

When built: the mechanical match reproduces the table above on all three examples, as a test; an undescribed column
raises a finding and still runs; a declaration reaches the receipt; an edited declaration makes the run stale.

## Practitioner observation, written before the result

Whether describing columns reads as a step worth taking or as a form to get past. The finding for an undescribed
column is what would show it: whether it gets resolved or ignored.

## What this does not establish

- Whether the Salmonella authors' analysis met the `sex`, `schule`, `ausbildung` or `biolm` disagreements, or whether
  the published files or the codebook is the wrong one. The files alone cannot say.
- That a label is right. A declaration, from any source, is a claim about a column, not a check of it.
- Mapping columns to shared vocabulary terms, which is out of scope.
