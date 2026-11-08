# Apply ruleset

_Created 2026-11-08 · Updated 2026-11-08_

**Rules over records.** Each rule says *if* some conditions hold *then* a record gets a category, such as a band, or a
new value computed from its columns. The rules are written in the step's dialog, or read from a published ruleset.

## What it does

It checks every rule against every record and gives each record what the rules concluded, as new columns. A record no
rule matched keeps no conclusion, and the run says how many.

## What you connect

**Records**: a table, points or polygons. A table imported **wide**, one row per subject and a column per variable,
is read that way: one record per subject, its columns as the file named them. It gives back the same records with the
new columns.

## How to use it

**Edit these rules** opens the dialog. Each rule has conditions and conclusions.

| Part | What it decides |
| --- | --- |
| **if** | A column, a comparison (*is*, *is more than*, *is at most*, *is less than*, *is at least*, *is recorded*, *is not recorded*) and a value: a typed number or one of the step's settings |
| **+ and**, **+ or** | Conditions that must all hold; alternatives, any of which will do |
| **then** a category | A new column and the value a matching record gets: *band* is *Short* |
| **then** a computed value | A new column and a sum: *houses without a death* is *houses* minus *deaths*. Plus, minus, times or divided by; each side a column, a value another rule computed, or a typed number |

**+ Add a value computed for every record** writes a rule with no condition: every record gets the value.

**One rule can read what another computed.** *deaths per house* is deaths divided by houses; *deaths per 10,000
houses* is deaths per house times 10,000. The order the rules are listed in does not matter.

**Before and after.** Under the rules, the dialog shows the records as they arrive and as these rules would leave
them, on every edit: each new column, and which rule each record matched. Each rule's heading says how many records it
matched. The first 50 records are drawn; the counts are of all of them.

## What it says instead of guessing

- **A division by zero** gives an empty value, and is counted and named: *1 record has an empty value, from a division
  by zero: Harbour.*
- **A value to compute from that is missing** gives no value, and is named.
- **Two rules giving one record different values** give it none, and both rules are named.
- **A number without a unit** stops the rules from running until its unit is stated, and a rule comparing two
  different units is refused while it is being written.

On a wide table, a computed value is a new variable of each subject: in the table it is one more row per subject,
named for the new column, as **Derive a value** adds it.

## What it will not do

**It will not read the previous row.** New cases from a cumulative column, and sorting the table first, are not built
yet (experiment 188).

**It will not describe the new column for you.** What it measures, and its unit, are yours to state.

## What this does not establish

That a rule is right for its question. Rules do exactly what they say, including what was meant and not written.
