# Find health facilities

_Created 2026-11-08 · Updated 2026-11-08_

**A source of facility points**, two ways: every facility a source records inside a study area, or the facility each
row of a list names.

## What it does

Inside a study area, it fetches the health facilities a source records there. From a list, it finds the facility each
row names in a national register, and marks how sure the match is. Either way it hands on points, each carrying where
it came from.

## How to use it

Add it from the library, then choose the way in under **Configure…**: *Inside the study area* or *From a list*. Each is
described below.

## Inside the study area

Connect a **Study area**: it is the scope of the query. In **Configure…**, choose the source (OpenStreetMap live, the
Humanitarian OpenStreetMap Team's country export, or Overture Maps Places), the kinds of facility, and whether to keep
only named ones; each source's licence is shown before anything is fetched. Then **Retrieve facilities**. The Result
says how many were kept and how many were dropped, and why.

## From a list

For a list that names facilities, such as a line list's organisation units. In **Configure…**, choose *From a list*,
then:

| Setting | What it decides |
| --- | --- |
| **Column naming the facility** | The list's column holding each row's facility name |
| **Column naming its area** | Optional: a district or similar, to tell apart two facilities of one name |
| **Registers, matched in this order** | Facility lists from the registers declared in the ontology: GRID3 for Sierra Leone, Nigeria and DR Congo, and OpenStreetMap for any country. A name is looked for in the first register, then the next. A register that cannot be read is shown and cannot be chosen |
| **Country to read OpenStreetMap for** | Shown when OpenStreetMap is chosen. It starts as the other registers' country |
| **Spelling allowed** | How similar a name must be to count as a spelling of another, 0.88 to start |
| **Words that mark a name as an area** | Such as *Communities*: a reporting unit for an area, which has no point |

Then **Fetch the registers**: a register is fetched once and kept on this device.

**OpenStreetMap is matched by name only.** It has no facility types, so a name it matches allowing for spelling is held
for your review under Decisions. It has no point until you choose. A name it matches exactly is handed on. Put it after
a national register, for what that register does not have. Its points are under the Open Database License, which is
share-alike: anything made from them is under it too.

**Every row gets one outcome, and none is dropped:**

| Outcome | What it means |
| --- | --- |
| matched exactly | The name and its type are one facility's |
| matched allowing for spelling | One facility's name within the tolerance, the same type. From OpenStreetMap, held for your review |
| type differs | The name matches and the type does not, as MCHP against CHP: for your review |
| ambiguous | Several facilities could be the one named: choose, under Decisions |
| an area, not a facility | No point, said |
| not found | In no register chosen |

The dialog's **Preview** counts them, by name and by row, before you apply. **Decisions** lists each ambiguous name,
each type that differs and each spelling held, with its candidates, so you choose the facility it means, or none. Rows with a facility become
points carrying the outcome, the register's name and identifier, and the score.

## What it will not do

- Place anyone at home. A point is where the register places the facility.
- Guess. A type that differs, an ambiguous name, a spelling held, an area and a name not found have no point until you decide.
- Geocode an address or a place that is not a facility.

## What this does not establish

That a source records every facility that exists: an absence is not evidence of absence. That 0.88 suits every
country's names: it was checked by hand on Sierra Leone's. That OpenStreetMap's spellings can be trusted anywhere: on
Sierra Leone's names, 4 of 7 that could be checked against GRID3 were the wrong facility.
