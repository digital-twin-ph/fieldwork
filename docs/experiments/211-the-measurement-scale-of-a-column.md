# 211 · The measurement scale of a column, declared with its meaning

_Created 2026-11-13 · Updated 2026-11-13_

**Status:** tried — the dictionary as a project asset, the scale and codes, and the profile built on Tabular data,
2026-11-13, Chromium. Chart does not read the scale yet; Point data has no Columns dialog.

## The question

The practitioner, 2026-11-13, of Hagelloch's `class`: *"In the Table input the class column is treated as numeric, with
min, median, max. The Chart treats class as categorical. What is class really? Did we have a data dictionary or did we
use the data dictionary feature of Table input?"*

The answers on the day:

- **What `class` is.** The source's dictionary, the outbreaks R package's documentation of `measles_hagelloch_1861`,
  says *School class (factor: 0, preschool; 1, 1st class; 2, 2nd class)*: three codes for categories.
- **Which was used.** Neither. Hagelloch's cases are read by Point data, which has no Columns dialog; the dictionary was
  never connected. The profile reads `class` as numbers because its values are numbers. Chart drew it as categories
  because grouping and splitting by a column always yield categories.
- **Why they disagree.** Nothing in Fieldwork can say what scale a column is on. Each step guesses from the values.

So the question: **can a column's measurement scale be declared where its meaning already is, in the Columns dialog of
experiment 172, and can the steps that read the column follow the declaration rather than guess?**

## This is not new

Three records already found the gap and none closed it.

| Where | Found | What it proposed |
| --- | --- | --- |
| TODO, *Measurement scale on a field binding* (2026-10-17) | a binding's `kind: term` cannot tell *clinic / pharmacy* from *NoDeaths / Few / Many* | declare the scale on the field binding |
| [117](117-data-quality.md), finding 3 | `class` profiles as a quantity with a median | the same gap meeting a real file |
| [118](118-cartographic-judgment-as-rules.md), *What would close it*, 1 | no colour rule can be written without the scale | nominal, ordinal, interval, ratio on a binding |

What is new is where the declaration goes. A binding is per ruleset; a column's meaning is per table and already has a
home, a dialog and a dictionary path (172). Declaring the scale there means a dictionary can propose it, and every step
reading the table sees one answer.

## The dictionary as an asset of the project

Asked the same day, *"Do we ever enter the data dictionary as a first class asset in projects?"*, the answer was no:

| What | Kept |
| --- | --- |
| A dictionary file loaded in the Columns dialog | read once, then dropped |
| The descriptions accepted from it | on that one Table input node |
| A dictionary the practitioner makes | this browser's local storage only: not in the project, not exported |
| Point data's columns | no Columns dialog at all |

The practitioner, 2026-11-13: *"The data dictionary as a first class asset should be importable and viewable with the
table input that first imports the two."*

What that settles, as said: the dictionary is the project's, it is imported with the table, by the Table input that
first reads them, and it can be viewed there. What is still open, and decided when built:

- **One per source.** A dictionary describes a source, known by its file's digest. Another node reading the same file
  finds the same dictionary rather than a copy.
- **What is kept.** The dictionary file's rows as read, so it can be viewed as it was published, and the descriptions
  accepted from it, including the scale and codes below.
- **A dictionary made here** becomes the same kind of asset, so it leaves this browser with the project.

## The design

**Terms.** *Measurement scale* as 117 and 118 use it, with its four values. The dialog says them in plain words:

| Scale | In the dialog | Example |
| --- | --- | --- |
| nominal | Categories, in no order | gender, hospital |
| ordinal | Categories in an order | school class; *None / Few / Many* |
| interval | Numbers with no true zero | a date, °C |
| ratio | Amounts counted from zero | age, cases, ppb |

**Codes.** A column may also list its codes and what each means: `0 = pre-school`. For an ordinal column the list is the
order. This is 172's *value codings*, built here because a scale without its codes cannot say what order 0, 1, 2 are in.

**Where each piece goes.**

1. `ColumnMeta` gains `scale` and `codes`. Same origin and confirmation as the rest: a proposal until accepted. They are
   kept with the project's dictionary for the source, above, not on each node.
2. **The Columns dialog** shows both, per column.
3. **A dictionary proposes them.** An R description of the form *(factor: 0, preschool; 1, 1st class)* proposes the codes
   and **nominal**, because R calls an unordered category a factor and an ordered one `ordered`. Whether school classes
   are in order is the practitioner's to say; the dictionary did not say it.
4. **The profile follows it.** A nominal or ordinal column shows its counts, ordinal in its declared order, and no
   min, median or max. A ratio or interval column is profiled as numbers, as now.
5. **Chart's Draw list follows it** (210's proposer): a declared category is a category, so the bands of a pyramid and
   the bars of a count are read from the declaration before the values.

**Not in this experiment.** Point data's Columns dialog, so Hagelloch's own `class` is not yet describable where it is
read; that is the next step and is recorded as one. The map's colour scheme by scale (118's rule). The ruleset binding's
`kind`, which stays as it is.

## Admission review

No new widget and no new port: an extension of Table input's column descriptions (172) and of what two readers do with
them. D1 to D9 do not apply.

| Distinction | Enforced as |
| --- | --- |
| A code is not a quantity: no median of a nominal or ordinal column | **run-time check**: the profile does not compute one |
| A dictionary's word is a proposal, not a fact | **validation rule**: unconfirmed until accepted, as 172 |
| *Factor* does not mean *ordered* | **limitation**: the proposal says nominal; nothing stops the practitioner choosing ordinal |
| The file's values are never rewritten by a code's label | **hard stop**: codes are shown beside values, never substituted |

## What it commits to, written before the result

- A unit test: a description in R's factor form proposes codes and nominal; the profile of a declared ordinal column has
  no `numeric` and lists counts in code order.
- A browser test on Table input: declare `class` ordinal with its three codes, save, and the profile shows counts in the
  order 0, 1, 2 with their meanings and no median.
- **Practitioner observation, which can come out badly:** shown Hagelloch's `class` proposed as *Categories, in no
  order*, does the practitioner change it to *in an order*, and say why? If they accept nominal without reading it, the
  proposal is doing the deciding, which 172 exists to prevent.

## Validation record, 2026-11-13, Chromium

| Check | Result |
| --- | --- |
| `tests/column-metadata.test.mjs`: R factor and `ordered` read; codes written and read back; a proposal not followed until accepted; a malformed kept dictionary dropped | pass |
| `tests/column-profile.test.mjs`: ordinal `class` has no `numeric`, counts in code order with meanings; ratio `age` keeps its median | pass |
| `tests/data-dictionary.browser.mjs`: Hagelloch's 188 cases imported with four variables of the outbreaks dictionary; kept across a reload; viewed; `class` proposed nominal with three codes; declared ordinal; Data quality shows *In order 0 preschool 90, 1 1st class 30, 2 2nd class 68* and no median | pass |
| `tests/columns-dialog.browser.mjs` (NYC, Salmonella), unchanged behaviour | pass |

**What was built, against the design.** Points 1 to 4. Point 5, Chart following the scale, is **not built**: a scale is
declared on Table input and the table reaches Chart through other steps, which do not carry it. The project lists each
dictionary but has no view of the list yet; the dictionary is viewed from the Table input that imported it, as asked.

**Decided while building.** A dictionary read from a fetched archive (NYC's zip) is read and proposed from, not copied
into the project: the project keeps where a fetched source came from, not its contents. The practitioner has not
been asked about this.

**The practitioner observation above has not been made.**

## What it does not establish

- That the four scales are the right ones for every column a practitioner meets. A date is interval here, and nothing
  yet treats it differently from °C.
- That a declared scale changes any figure but Chart's Draw list.
- That a practitioner reads the scale at all.
