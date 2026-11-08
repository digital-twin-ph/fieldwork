# 189 · A measles line list, made safe to teach with, and its facilities found

_Created 2026-11-08 · Updated 2026-11-08_

**Status:** asked. The data are de-identified and semi-synthetic in
[example-2019-sierra-leone-measles](https://github.com/digital-twin-ph/example-2019-sierra-leone-measles), **public
since 2026-11-08** (commit cd6d766), and the facility names were matched against an open list by a script outside
Fieldwork. No workflow, manual or widget change is built.

## The question

The practitioner, 2026-11-06: *"take a look at a new example repo example-2019-sierra-leone-measles. It has a barebones
README and a CSV data file that I have not reviewed yet."* And: *"It has an organizational unit column which are
facility names and I am wondering if those could be geocoded."* On 2026-11-08: *"That CSV is used for FETP training but
we need to check for geoprivacy risks"*; *"Sierra Leone FETP produced the file. Let's deidentify, remove addresses,
names, we can make the data set semi-synthetic"*; and *"we can also assess whether the semi-synthetic data outputs
approximate that of the original data set by looking at the epidemic curve and spatial and temporal distribution."*

## The file, as found

2,606 suspected measles cases, 41 columns, as a DHIS2 tracker export names them (an organisation unit, lab fields
prefixed LRQ and LRS, measles fields MEA). Seen at a facility from 2019-01-08 to 2023-12-29, most in 2022 (1,073) and
2023 (1,297). 333 facility names, most ending in a type: CHC 105, MCHP 80, CHP 71, Hospital 35, Clinic 28. A residential
district for 2,142 rows (82%), in 16 districts. A lab result for 570; the case definition stated for 1,229. *District
where symptoms started* is empty in every row. One date of birth in 1904; one onset before 2019, in 2017.

## The geoprivacy review

| Risk | Found |
| --- | --- |
| Free text naming homes and people | Four address columns, filled for 2 to 19 rows each, held street addresses with house numbers and what reads as a person's name |
| Exact date of birth | 1,118 rows unique on it alone; 2,335 (90%) unique with sex and facility |
| A visit as an event | 745 rows were the only case at their facility that week, so the row was that child's record whatever else was changed |

**A finding about the method.** The first profile printed each column's values where it had twelve or fewer, to save
a second pass, and the four address columns qualified. They were printed into the working conversation, nowhere else.
A profile of a file not yet reviewed for privacy now shows values only for columns found to be coded.

## What was done

By `scripts/make_semisynthetic.py` in the example's repository, with a fixed seed:

- the four address columns, date of birth, age in months and days, the travel and contact dates (each under twenty
  rows) and the empty district column are removed, leaving 30 columns;
- **whole records are swapped** within residential district and month seen: age, sex, status, symptoms, lab result,
  doses, case definition and their dates, as days from the visit, move together; a group of one widens to the
  quarter, the year, the country's month, then the whole file; no record keeps its own details where another can
  give them;
- each visit moves by up to seven days either way, its dates with it;
- every date is the Monday of its ISO week.

**Measured against the original:** 62 of 2,606 rows carry details equal to their own child's in their own week, by
coincidence of common values (a one-year-old, alive, untested), not marked. Cases by district and by facility, and the
file's totals of age, sex, lab result, status and case definition, are identical. The script rebuilds the file byte
for byte from the original.

**The history was rewritten, then the repository recreated.** The original had been committed with the README. Rewriting
left GitHub serving the old commit to anyone with its id, so the practitioner deleted the repository and created it
again, and only the clean history was pushed.

## Does the semi-synthetic file tell the same outbreak?

| Comparison | Correlation | Cases in another period | Peak, original and semi-synthetic |
| --- | --- | --- | --- |
| Weekly, by date seen | 0.968 | 11.2% | 13 Feb 2023 (92); 6 Feb 2023 (81) |
| Weekly, four-week rolling mean | 0.996 | 4.4% | 6 Mar 2023 (80); 20 Feb 2023 (76) |
| Weekly, by onset | 0.956 | 12.5% | 30 Jan 2023 (75); 30 Jan 2023 (74) |
| Monthly | 0.983 | 6.5% | Mar 2023 (313); Feb 2023 (303) |
| District and month | 0.972 | 8.8% | Western Area Urban: Mar 2023 (138); Feb 2023 (120) |
| District, whole period | identical | 0% | — |
| Facility and year | 1.000 | 0.9% | Ola During Children's Hospital, 2023 (283; 276) |
| Age band and year | 1.000 | 1.0% | 1 to 4 years, 2023 (672; 665) |

The two waves, early 2022 and early 2023, keep their timing and size; where cases were and who they were is kept.
Weekly peaks are lower and spread by about a week, which is the move doing its work. An exercise on the exact peak
week or a weekly alert threshold would answer differently from the original; one by onset or by month would not.

## The facility names, matched

Against the **Sierra Leone National Health Facilities Dataset v1.0** (GRID3 and the Ministry of Health and Sanitation,
2023): 1,616 facilities, each with a DHIS2 identifier, 1,561 with coordinates, licensed **CC BY 4.0** as its catalogue
record states. Read from its public feature service, `sle_htlfac_grid3_v01`, on 2026-11-08. Matched by a script outside
Fieldwork, case and punctuation folded, Jaro-Winkler at 0.88 as Deduplicate records' default:

| Result | Names | Rows |
| --- | --- | --- |
| Exact | 219 | 2,129 |
| Allowing for spelling | 62 | 323 |
| Ambiguous: close candidates | 14 | 24 |
| Not found | 38 | 130 |

Of those not found, **9 match once DHIS2's bracketed place is left out** ("Sumbuya (Koya) CHP"). Of the rest, several are
**"… Communities" units**, community reporting for a chiefdom, which have no point; and several are hospitals run by
NGOs or a university, for which OpenStreetMap is the second source. **Among the spelling matches, some differ in type**
("Sanya MCHP" to "Sanya CHP", "Foredugu MCHP" to "Foredugu CHC"): a facility upgraded, or a different one.

## What this suggests for Find health facilities, not yet decided

The design recorded in TODO on 2026-11-06, *"What if Find health facilities is a list and the widget can geocode?"*,
with what the matching showed it must do:

- read a table's facility name column, and its district where there is one;
- match against an open list (GRID3 first, OpenStreetMap for what is left), reusing Deduplicate records' matcher;
- compare the name and the type apart, so *MCHP* against *CHP* is a type that differs, said for review, not a match;
- leave a bracketed place out to match and keep it to tell two names apart;
- mark each row exact, allowing for spelling, type differs, ambiguous (candidates listed), an area unit with no point,
  or not found; drop none; put the counts on the result;
- carry on each point its source and how it was matched.

The admission review comes before any build.

## Before it is public

The practitioner, 2026-11-08: *"Let me know when I can also make the repo public."* Not yet:

1. ~~the old commit purged~~: **done 2026-11-08.** The practitioner deleted the repository and created it again; the
   clean history was pushed, and GitHub answers *No commit found* for the old commit. The original is kept only by the
   practitioner, outside the repository;
2. ~~the Sierra Leone FETP's agreement~~: **settled 2026-11-08.** The practitioner: *"We have the agreement to use the
   file for development of distributable training materials and our geoprivacy amendments further enhances the safety
   of distribution. The geoprivacy amendments also makes us co-authors of the data set."* Recorded in the README as
   *"modified for use on a public teaching repository"*, with credit to the FETP for the original and to the Fieldwork
   project for the modification, and in a CITATION.cff (commit after ab8bae2). No open licence is claimed: the
   agreement covers distributable training materials, which is narrower;
3. ~~the credit and this comparison in the README~~: done.

## What this does not establish

- That the semi-synthetic file cannot be linked to a child by someone who knows more than the file: swapping and moving
  lower the risk; no measure here bounds it.
- That a three-day move would not serve an exercise better; the seven days were chosen, not measured against a use.
- That the spelling matches are right: they are candidates, and the type differences show some are not.
- The licence of the original line list beyond training.
- Anything about OpenStreetMap's coverage of the names not found: not yet queried.
