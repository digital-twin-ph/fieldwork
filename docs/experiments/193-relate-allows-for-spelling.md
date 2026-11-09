# 193 · Relate allows for spelling

_Created 2026-11-09 · Updated 2026-11-09_

**Status:** tried. Relate a column from another table gains two settings: the second table's key column, where
it is named differently, and **allowing for spelling**, which folds names, drops words named as whole words, and
matches a name to the one spelled closest above a threshold, 0.88 by default and adjustable. Deduplicate records,
which was first proposed for this, keeps its two ways in and moves to the standard Inspector and dialog
([186](186-one-standard-inspector.md)).

## The question

Sierra Leone's cases by district ([189](189-a-measles-line-list-made-safe-to-teach-with.md)) are to be divided by each
district's population and mapped on OCHA's districts. The line list writes "Bo District" and "Falaba District" in a
column it calls *Residential District*; the population and the boundaries, from OCHA's COD-AB, write "Bo" and, for
Falaba, "Fabala", in a column called *district*. Relate matched names after folding case and punctuation, and only on
a column both tables name alike, so none of the sixteen met.

Ways weighed on 2026-11-09:

1. A crosswalk column written into the derived files. It hid the step from a trainee, and the practitioner set it
   aside: *"The match columns have to normalized as much as possible for the match to succeed."*
2. The pandas shape: derive a key on each side, merge exactly, fix the leftovers by an explicit mapping.
3. Deduplicate records gaining a third way in, two tables, writing the match as a new column for Relate to use. The
   practitioner asked for it, and it was begun.
4. Relate itself. The practitioner, seeing that the link step would hand its result straight to Relate: *"Maybe
   that's the one we need to extend because the output and outcome desired is the same"*, and on the threshold: *"We
   can make .88 the default but adjustable."*

**Why Relate.** It already takes the two tables and hands on the first with the second's column beside each row,
already folds keys (`normaliseName`), already refuses a key the folding makes ambiguous, and already asks a person
what happens to unmatched rows. A separate link step would have been a second widget doing half of Relate's job.

## What was built

| Setting | What it decides |
| --- | --- |
| **Matched on, in the first table** | Any column of the first table: *Residential District* |
| **The same, in the second table** | The second table's column, named as the first's by default: *district* |
| **Compare keys** | Folding punctuation and case; exactly; or **allowing for spelling, and dropping words** |
| **Words to drop** | Removed from both sides before comparing, as whole words: *District* |
| **Spelling allowed** | Jaro-Winkler similarity a name must reach: 0.88 to start, 0.5 to 1 |

With spelling allowed, each distinct name of the first table's key is matched once:

| Outcome | When | What the row gets |
| --- | --- | --- |
| matched exactly | the folded names are equal | the second table's row |
| matched allowing for spelling | one name within the threshold, none other within 0.02 of it | the second table's row; its score is said |
| ambiguous | two or more within 0.02 of the best | nothing until a person chooses, under Decisions |
| not found | no name within the threshold | nothing: an unmatched row |
| decided | a person chose a name, or none | what they chose |

A row is then related on the second table's own spelling. **A name with no match is one of Relate's unmatched rows**,
listed by the first table's spelling and decided as any is: dropped, or kept under a category the practitioner
names. The result gains one column, *Residential District match*, saying how each row matched. With spelling
allowed, the second table's key column can be brought across: *district* beside *Residential District* gives the
boundary's spelling to join on.

The dialog's preview lists each name, how it was compared, what it matched and how; Decisions lists the ambiguous
names with their candidates and scores, above the unmatched decision.

**What it will not do:** allow for spelling on the second and further key columns (they compare as *Compare keys*
says for the first's folding); combine spelling with a date matched to a period, refused by name; guess between two
equally close names; change either table's own values.

## What followed: the census denominator

Building Sierra Leone's rates on this, on 2026-11-09, met three further gaps:

1. **Rate read one long table.** Cases by district and population by district were two tables, and Append rows
   refuses to stack a count and a population, because one column would mean two things. The practitioner chose Relate
   bringing the population **as a number**, and then: *"If there is a census, we should get the population from
   it."* So the second table's value column, brought across, is now declared numeric with its unit, and Rate reads a
   table **with both numbers on each row**, beside the long form. The denominator is the 2021 Mid-Term Population and
   Housing Census; WorldPop stays in the file for comparison.
2. **OCHA's districts were refused** for repeated vertices and a spike: [194](194-the-boundary-repair.md).
3. **Rate, after Relate after a count, was not offered the count** before a run: the column a count is named
   (`rows`) was not followed through Total within groups. Fixed.

The workflow, from an empty canvas, Chromium: cases → Relate allowing for spelling (OCHA's name onto each case, the
cases with no district dropped and the reason recorded) → count by district → Relate (the census, as a number) →
Rate (per 100,000 people) → joined to OCHA's 16 districts → map. Rates run from 1.86 to 116 per 100,000.

Found and not fixed: the map's key printed a class **"6.72 to 6.72"**, two quantile breaks equal. Recorded in TODO.

## Validation

- Unit (`tests/spelling-match.test.mjs`, 4 tests): words dropped as whole words only; each outcome on made-up names;
  a decision settles an ambiguous name and "none" leaves it unmatched; through Relate, the unmatched named by the first
  table's spelling and still needing a decision, the match column, the value column matched the same way, and the two
  refusals. Relate's 28 existing unit tests pass unchanged.
- Browser, Chromium (`tests/relate-spelling.browser.mjs`): the second table's column, spelling allowed, each name's
  outcome in the preview, an ambiguous name decided, the threshold adjusted to 0.99 and a bad one refused. Relate's
  existing browser tests pass, as do Sierra Leone, Brazil and NYC from an empty canvas. WebKit runs in CI.
- Sierra Leone: all 16 residential districts linked to OCHA's, Falaba to "Fabala" by spelling; the cases with no
  district dropped and the reason recorded.
- Validation Lab check 40, CPython only: pandas, rapidfuzz and jellyfish agree on three cases (0.88 with District
  dropped: 15 exact, Falaba by spelling at 0.956; 0.96: Falaba not found; 0.88 with nothing dropped: 13 by spelling,
  3 not found). Four names in the last case score exactly 0.88; both sides pass them. Not yet run in the browser
  kernel.

## What would close it

WebKit passing in CI, and check 40 run in the lab's browser kernel.

## What this does not establish

That 0.88 suits district names in general: it was set for facility names, which is why it is adjustable. That a
spelling match is always the same place: "Fabala" is Falaba because COD-AB's district list has no other F-district,
which a person can see in the preview and the step cannot.
