# Rate with a denominator

_Created 2026-11-08 · Updated 2026-11-08_

**Counts divided by a population at risk, with what the population counts said.** Cases per 100,000 people,
deaths per 1,000 houses.

## What it does

It divides a numerator, what was counted, by a denominator, the units at risk, for each group, and multiplies by
1, 100, 1,000, 10,000 or 100,000. The denominator's unit, the period the numerator covers and the vintage of the
denominator travel with the result, because a rate whose denominator is unstated cannot be compared with any other.

## What you connect

**Records arrive as** decides the input:

- **points, one per subject**: each point carries the numerator and the denominator as attributes.
- **a table**, in one of two forms, chosen under **The table holds**:
  - **one row per measure, named in a key column**: Snow's South London table, where `measure` says population or
    deaths, or Brazil's, where `variable` says `casos` or `pop`.
  - **both numbers on each row, as columns**: Sierra Leone's cases by district, with the 2021 census brought beside
    each count by **Relate a column from another table**.

Changing **Records arrive as** disconnects the input, because points and a table are not the same shape. So choose
it first, apply, then connect.

It gives back a table of groups and rates, which **Join a table to the study area** can map and **Chart** can draw.

## How to use it

The step's panel holds its **Name**, its input, one sentence saying what it divides by what, and **Configure…**,
where every setting is. The dialog's preview shows each group's numerator, denominator and rate before you apply,
once the table can be read.

| Setting | What it decides |
| --- | --- |
| **Numerator** | What is counted: a measure's name, or a column |
| **Denominator** | The units at risk: a measure's name, or a column |
| **The denominator counts** | people, houses, households, person-time, or other |
| **Kind** | **proportion**, where the numerator is part of the denominator and cannot exceed it; or **ratio**, events per unit, which can |
| **Per** | 1 to 100,000 |
| **Group by** | The column each rate is for, such as a district; none gives one rate for everything |
| **Band width** | For a numeric grouping, the width of each band |
| **Smallest denominator that gets a rate** | Groups below it report their counts and no rate |
| **Period the numerator covers**, **Vintage of the denominator** | Recorded and compared |

## What it will not do

- **It will not compute a rate from a value it cannot read.** A row without a number for the numerator or the
  denominator stops the run and names the row.
- **It will not let a proportion exceed one.** That is a ratio, or a numerator that is not part of its denominator.
- **It will not give a rate for a small denominator.** Below the stated minimum, a rate is unstable rather than
  precise, so the counts are reported and the rate is not.
- **It will not decide whether the numerator's period and the denominator's vintage match.** It records both; a
  2019–2023 count over a 2021 census is a choice you state.

## Where it is used

South London (deaths per 1,000 people, by sub-district), Brazil (notified cases per 100,000 residents, by
municipality), and Sierra Leone (cases per 100,000 people by district, over the 2021 census).
