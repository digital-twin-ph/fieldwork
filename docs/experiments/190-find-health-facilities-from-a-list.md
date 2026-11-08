# 190 · Find health facilities from a list

_Created 2026-11-08 · Updated 2026-11-08_

**Status:** tried (Fieldwork 0.60.0, 2026-11-08). Built as proposed, on the standard Inspector and dialog: Find health
facilities 0.3.0. The Sierra Leone example's workflows are not yet built. The measurements it rests on are [189](189-a-measles-line-list-made-safe-to-teach-with.md)'s.

## The question

The practitioner, 2026-11-06, of the Sierra Leone line list: *"It has an organizational unit column which are facility
names and I am wondering if those could be geocoded."* And: *"What if Find health facilities is a list and the widget
can geocode?"* On 2026-11-08: *"We planned for find health facilities to take a list and either geocode it or match it
with OSM's."*

## What the measurement showed

The 333 facility names of the line list against GRID3's Sierra Leone facility list (CC BY 4.0, 1,616 facilities, each
with a DHIS2 identifier): 219 exact, 62 allowing for spelling, 14 ambiguous, 38 not found. Leaving DHIS2's bracketed
place out finds 9 more. Some spelling matches differ in **type** (MCHP against CHP or CHC). Of those not found, several
are **"… Communities" units**, community reporting for a chiefdom, with no point; several are hospitals run by NGOs or a
university, for which OpenStreetMap is the second source.

## The proposal

**Find health facilities gains a second way in: from a list.** Today it fetches every facility inside a study area. From
a list, it reads a table, and for each row finds the facility its name column names:

| Setting | What it decides |
| --- | --- |
| **The list** | A table, on a new input `list` |
| **Name column** | Which column names the facility |
| **District column** | Optional: narrows the candidates for a name found in more than one district |
| **Sources, in order** | A national list first (GRID3 for Sierra Leone), OpenStreetMap for what is left |
| **Spelling tolerance** | Jaro-Winkler, 0.88 as Deduplicate records' default; a review band below it |

**Each row is marked, and none is dropped or guessed:**

| Mark | Meaning |
| --- | --- |
| exact | The name, folded for case and punctuation, is one facility's |
| allowing for spelling | One facility's name within the tolerance, the same type |
| type differs | The name matches but the type does not (MCHP and CHP): for review |
| ambiguous | Several candidates: listed, for the practitioner to choose, and the choice recorded |
| an area, not a facility | "… Communities" and the like: no point, said |
| not found | In no source |

**It hands on one point per matched row**, with the row's columns, and on each point: the source, the matched name and
identifier (the DHIS2 identifier where GRID3 gives one), the mark, and the score. The counts of each mark are on the
result, in the receipt and in a machined note.

**On the standard Inspector and dialog, in the same pass.** The practitioner, 2026-11-08: *"As we touch widgets let's be
opportunistic and standardize them"* ([186](186-one-standard-inspector.md)). The Inspector says in one sentence what the
step finds and from where; *Inside the study area* or *From a list*, the sources, the name and district columns and the
tolerance are set in its Configure… dialog, whose preview is the marks and their counts before Apply, and whose
decisions are the ambiguous rows.

**Nothing is Sierra Leone's in the code.** The practitioner, 2026-11-08: *"Let's just make sure these steps are not hard
coded for Sierra Leone."* So:

| What could be fixed in code | Where it lives instead |
| --- | --- |
| The national list | **A catalogue of national facility lists**, as data, as the extract catalogue is: per entry, the country, where the list is served, which fields hold the name, type, district, identifier and coordinates, the licence and the citation |
| The facility types (CHC, MCHP, CHP) | Each list's own type field: a name's type is read against what that country's list calls its types |
| Names that are areas ("… Communities") | A setting of the step, the words that mark an area, pre-filled from the catalogue entry where a country is known to use them |

A bracketed place is DHIS2's way of writing a name in any country, and OpenStreetMap is worldwide.

**GRID3 publishes such lists for other countries**, read from its catalogue on 2026-11-08, each CC BY 4.0: Sierra Leone
v1.0, Nigeria v4.0, DR Congo v9.0, Zambia v01 (beta). Only Sierra Leone's fields were read; each entry's fields are read
and recorded when it is added. **The test that holds this:** the matcher runs against a second, made-up catalogue entry
whose fields and type words differ from Sierra Leone's, and gives the same marks it would from the real one.

**In the ontology before it is built.** The practitioner, 2026-11-08: *"We should record this in our underlying ontology
so it becomes system knowledge."* Declared in `ontology/fieldwork.ttl`, 2026-11-08: `fw:FacilityRegister` (a
`dcat:Dataset`, its type words its own), `fw:FacilityListMatching` (a `prov:Activity`, and said in its definition not
to be deduplication or a key join), the closed vocabulary `fw:FacilityMatchOutcome` of six (`owl:oneOf`: matched
exactly, allowing for spelling, type differs, ambiguous, an area not a facility, not found), and on each point
`fw:matchOutcome` (functional: one per row), `fw:matchedRegister`, `fw:registerFacilityName`, `fw:registerFacilityId`,
`fw:nameMatchScore` and `fw:positionIsRegisters`; on the step, `fw:areaNameMarkers`. The shapes conform. When the
widget is built, its release declares these as the terms it asserts, and the coupling check holds the two together.

**The registers are in the ontology too** (the practitioner, 2026-11-08: *"Info about GRID3 countries should be in the
ontology"*): four `fw:FacilityRegister` individuals, each with its country code, publisher, version, licence, service,
record count, the date read, and its own field map.

| Register | Facilities | Name | Type | Area | Identifier |
| --- | --- | --- | --- | --- | --- |
| GRID3 Sierra Leone v1.0 | 1,616 | `fac_name` | `type` | `district` | `dhis2_id` |
| GRID3 Nigeria v4.0 | 70,235 | `facility_name` | `facility_type` | `lga_standard` | `nhfr_facility_code` |
| GRID3 DR Congo v9.0 | 38,957 | `essnom1` | `esstype` | `zonesante` | `dhis2` |
| GRID3 Zambia v01 beta | — | not readable: the service gave no layer | | | |

Congo's fields are in French, which is the case the catalogue exists for. **The widget's catalogue is generated from
these individuals and checked against them**, so the code and the ontology cannot say different things about a register.

**Found while declaring them:** `fw:matchedName`, a deduplication property, is declared with a decimal range though its
name says a name. Not changed here; the new property is `fw:registerFacilityName` so as not to inherit it.

## The design audit

**D1, what it is.** Decomposed: fetch a facility list (exists: this widget's three sources), match names (exists once:
Deduplicate records' `jaroWinkler` and `normaliseName`), make points from coordinates (exists: Point data from a table).
**Residual distinction:** matching a *name in a list* to a *facility in a register* is not deduplication, which asks
whether two records are the same thing in two layers, and it is not a key join, which compares keys exactly or folded.
It must compare a name and a facility type apart, keep a bracketed qualifier to tell two names apart, and know that some
names are areas. **Kind:** a composite over shared primitives, with the matcher a primitive shared with Deduplicate
records. **Placement:** on the palette, as a way into Find health facilities, because a practitioner asks for it by
name: *"geocode my facility list"*.

**D2, does it exist already.** Searched: Relate a column from another table (joins on a key, exactly or folded; no
spelling tolerance, no type, no review of candidates); Deduplicate records (matches records across point layers by name
and distance; needs points on both sides, and a list has none); Point data from a table (needs coordinates the list does
not have); Join a table to the study area (names to boundary parts, not to points). None performs it. **The alternative
weighed:** fetch the facilities as points, then Relate their coordinates onto the list by name, then Point data from a
table: three nodes, and Relate would need spelling tolerance, type and review added, which changes what a key join
means for every other use. Rejected for that reason, and on D9.

**D3, distinctions and how each is enforced.**

| Distinction | Enforcement |
| --- | --- |
| A matched point is the register's position, not where the case was | Limitation, said on the result and in the receipt |
| A type that differs is not a match | Run-time check: marked for review, never handed on as matched |
| A spelling match is a candidate, not a fact | Run-time check: marked and scored on each point |
| An area unit has no point | Run-time check: marked, kept, no point |
| No row is dropped | Run-time check: counts on the result sum to the list's rows |
| A source's licence travels with its points | Run-time check: the receipt names source, licence and when it was read |

**D4, ports.** A new input `list`, type `table`: a table is the wrong kind for `area`, so the canvas refuses the edge
there. Whether `area` or `list` is used is a setting of the step; a step set to *from a list* with no list connected is
a validation rule at the run, as an unconfigured step stays a valid draft. Output: `points`, unchanged.

**D5, qualifiers on the input.** The name column and the district column are declared on the step from the table's own
columns, never guessed from a column's name.

**D6, the practitioner's workflow, end to end:** a line list (Tabular data, present) → facility points from it (this
proposal) → cases counted by facility or by district (Total within groups, present) → a map of counts by district
(Join a table to the study area and Map, present), or by facility above a minimum count (**missing**: a Map has no
minimum count per point; [189](189-a-measles-line-list-made-safe-to-teach-with.md) asks for one).

**D7, the name.** *Find health facilities* still says what it does; the way in is named on the step: *Inside the study
area* or *From a list*. The new input is `list`, not `records`, because it holds names, not located records.

**D8, the evidence.** Real data on both sides: the semi-synthetic line list's 333 names against GRID3's list, with the
counts above as the expected result, and a hand-checked sample of the spelling and type matches. Negative cases: a type
that differs, an ambiguous name, an area unit and a name in no source, each marked and none handed on as matched.

**D8a, port cases.** The table refused on `area`; points refused on `list`; a list with no name column chosen refused at
the run, naming the setting.

**D9, effort.** One node from a list to facility points, where the alternative is three, and where today nothing does
it. It adds no palette entry.

**D10, a worked example.** The Sierra Leone example, built with it.

## As built, 2026-11-08

On Sierra Leone's 333 names against GRID3 (tests/facility-matching.test.mjs), by name and rows: matched exactly 247
(2,188), allowing for spelling 15 (66), type differs 34 (244), ambiguous 5 (10), an area 14 (38), not found 18 (60);
every row once. **Hand-checked:** of the 15 spelling matches, 13 are plainly the same facility; two are uncertain
("United Methodist Church Jaiama Clinic" to "… Nimikoro Clinic"; "Kabiyama MCHP" to "Kagbiama MCHP").

**Found while building it:** Jaro-Winkler rewards a shared beginning, so a name that is another's words and more
("Makump" and "Makump Bana") scored as a spelling. A spelling is now a word misspelt, never a word missing. And the
standard dialog had no style for its checkbox lists, which moved there from the Inspector for Select rows and Relate:
each box floated away from its words. Fixed for all of them.

**Not yet:** a minimum count per point on a Map.

## OpenStreetMap as a second register, 0.61.0

**The question:** does OpenStreetMap find what GRID3 lacks? It is read from the Humanitarian OpenStreetMap Team's
country export, the same download *inside the study area* uses. It is declared in the ontology as a register for any
country, served as that export, matched by name only (fw:OpenStreetMapHealthFacilitiesCountryExport). Sierra Leone's
export of 2026-05-06 holds 399 points: 375 named, none with a district, 165 with a city.

**Measured, 2026-11-08, on the same 333 names:**

| Read as | Adds after GRID3 | Alone: exact | Alone: allowing for spelling |
| --- | --- | --- | --- |
| With no type words | 2 names, both wrong | 4 | 32, mostly wrong |
| By the other registers' type words, or the list's | none | 4 | 10 |
| The same, and an exact name in any register first | 1 name, 7 rows, right | 4 | 10 |

The two wrong additions were "Makump CHP" to "Makondu MCHP" (0.892) and "Connaught Chest Clinic" to "Connaught
Hospital" (0.883). With no type field, OpenStreetMap's names keep their type words, and the shared endings raise the
score. The ten spellings found alone were checked against GRID3's position for the same list name, where it had
one. Three stood at GRID3's position, 0.0 km away. Four stood 26 to 274 km away. Three could not be checked.

**What changed:** a register with no types reads names by the type words of the other registers chosen. With none
to borrow, it uses the list's own: the last words at least five of its names share. A spelling it allows is held for
review: counted with the spellings, no point until chosen, and counted in the receipt as fw:heldForReviewRowCount.
Its exact matches are handed on. Points matched from it carry ODbL's share-alike in the method sentence, and its
attribution in the Inspector.

**Found while measuring it:** the registers were searched once, in order, so GRID3's loose candidate stopped the
search before OpenStreetMap's exact name was looked at. "Magbenteh Community Hospital" was a type that differs from
GRID3's "Sengbeh Community MCHP", about 97 km away, when OpenStreetMap has it by that name. Now an exact name in any
register is taken first, and a spelling only after. Against GRID3 alone nothing changes.

**For Sierra Leone,** OpenStreetMap after GRID3 adds that one hospital (7 rows) and nothing wrong. The 18 names not
found in GRID3 are not in OpenStreetMap either. It is there mostly for a country with no GRID3 register.

## What it will not do

- Geocode an address or a place that is not a facility. It matches a name to a facility register, nothing else.
- Choose between candidates. Ambiguous rows wait for the practitioner, and their choice is recorded.
- Place a case at its home. A facility point is where the case was seen.

## What this does not establish

- How much OpenStreetMap adds elsewhere: one name of 333 on Sierra Leone's, one country's export.
- That OpenStreetMap alone is a usable register for a country: on Sierra Leone it held 375 named points against
  GRID3's 1,616, and 4 of 7 checkable spellings were wrong. That is why they are held.
- That five names sharing a last word make it a type word: chosen, not measured; one country's list was read.
- That 0.88 suits facility names: it is Deduplicate's default, chosen for other names; the hand-checked sample will say.
- That GRID3 covers other countries in the same form: only Sierra Leone's list was read.
- How a "Communities" unit is told from a facility other than by its name; a list of such patterns is a guess until
  another country's names are read.
