# 224 · Census counts as a table source

_Created 2026-11-19 · Updated 2026-11-19_

**Status:** asked. A design, written before the code.

## The question

The practitioner, 2026-11-19, after the DR Congo 1984 counts were transcribed into the census repository: *"Since
population counts are important denominators should we create an input widget for it?"*, and then: *"Perhaps this is
where Table input connects with census repo?"*

## What exists

| Where | What it does today |
| --- | --- |
| Tabular data | Reads a table from a file, or fetches it from an address and checks its digest (NYC's counts from Zenodo). The population example's census tables arrive this way, as CSV files in the example's own `data/` |
| Join a table to the study area | Matches a table's names to the study area's units, folding punctuation or exactly |
| Rate | Asks for the denominator's vintage as a sentence the person types |
| The column descriptions | A source's own metadata pre-fills them, and the person confirms them |
| [census-tables](https://github.com/digital-twin-ph/census-tables) | Started 2026-11-19: counts as each statistics office published them, with provenance and licence. DR Congo 1984 transcribed and checked, not yet published |

## The admission review, briefly

| Question | Answer |
| --- | --- |
| D1, a distinction that survives decomposition, and asked for by name? | A census is a table; nobody asks for a "census step", they ask for a country's census |
| D2, does it already exist? | **Yes, in part**: Tabular data fetches a table by address and digest. What is missing is finding a census and its arriving described |
| D11, a function nothing else performs? | Yes: knowing which censuses exist, at which levels and years, under which licence |

So **no new widget**: a source inside Tabular data.

## The design

| Part | What it is |
| --- | --- |
| The repository's index | `index.json` at the root of `census-tables`: per country, its census date or that it has none, the levels it holds and how many units each, the licence as stated, and the folder. Written by a script from each country's `provenance.json` and `counts.csv`, so it cannot drift from them |
| Choosing | In Tabular data, beside a file and an address: **A census, from the census tables**. Choose a country, then a level. The list says what each is: *DR Congo: 1984, the only census; 9 regions, 44 cities and sub-regions*. A country with no census says so, and names the modelled sources as substitutes, never as counts |
| Fetching | The level's rows of `counts.csv`, read at a pinned commit of the repository and checked by digest, as an address is now. Nothing is fetched until chosen |
| Arriving described | Proposals from `provenance.json`, which the person accepts: *men*, *women*, *total*, each in persons; the census date; the source table and page; the licence as stated. Accepted or not, the table records where it came from |
| Downstream | Rate pre-fills its denominator vintage from an accepted census date, and a denominator years from the numerator's period is a finding on the step and in the data quality tab, never a refusal. Join a table to the study area matches by name now, and by P-code once a country's `units.csv` exists |

| Distinction | Enforced as |
| --- | --- |
| A census is a count; an estimate is not | **hard stop**: the repository's `counts.csv` holds counts only, and the index marks a country with no census as having none |
| The table is the one the repository published | **run-time check**: the digest at the pinned commit |
| What a column means is the person's to confirm | **validation rule**: arrives as proposals, as any source's metadata does |
| An old denominator is a finding | **run-time check**: flagged on Rate and in the data quality tab |

## Curated, with stated provenance, 2026-11-19

The practitioner: *"The tables then become curated with stated provenance."*, and *"Yes to DRC."* So the repository is
not a mirror of what statistics offices publish but a curated set: each table transcribed, checked against its own
totals, and published with where it came from, what was corrected and what its licence says, including that none is
stated. DR Congo's 1984 counts were published on those terms (census-tables eab9237): 54 rows, the scan itself
not redistributed.

## Order

1. ~~Publish DR Congo's counts~~ Done 2026-11-19 (eab9237).
2. Move Botswana's and Rwanda's census tables from the population example into the repository, with their provenance.
3. The index and its script.
4. The source in Tabular data; Rate's vintage pre-filled.
5. `units.csv` per country, and the join by P-code.

## What it does not establish

Whether a trainee, offered a 1984 census beside a 2025 raster, reads the gap of forty years as the finding it is or
takes the census as current; whether the index's sentence is read before the table is fetched. **To observe, written
before the result:** does a trainee building a DR Congo rate say, unprompted, how old the denominator is?

## Validation

To come with the build: the index script against each country's files; the source in Tabular data fetching a pinned
level and checking its digest; Rate's vintage pre-filled and the age finding raised; Chromium and WebKit.
