# Apply ruleset

_Created 2026-11-08 · Updated 2026-11-08_

**Rules over records.** Each rule says *if* some conditions hold *then* a record gets a category, such as a band, or a
new value computed from its columns. The rules are written in the step's dialog, or read from a published ruleset.

## What it does

It checks every rule against every record and gives each record what the rules concluded, as new columns. A record no
rule matched keeps no conclusion, and the run says how many.

## What you connect

**Records**: a table, points or polygons. Choose which under *Records arrive as*, then the step that feeds it under
*Inputs*. A table imported **wide**, one row per subject and a column per variable,
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

**Settings.** *+ Add a setting* gives the step a number the rules compare against, such as a fever threshold of 38
degrees Celsius: a name, a value and a unit. A condition then reads *temperature_c is more than fever*, and the
threshold can be changed without rewriting a rule.

**Units.** Each column the rules read states its unit, in the Inspector beside the column. A setting compared with a
column must be in the column's unit, and a sum or difference must be of two columns in the same unit; either is refused
while the rule is written. Columns the rules do not read need no unit.

**One rule can read what another computed.** *deaths per house* is deaths divided by houses; *deaths per 10,000
houses* is deaths per house times 10,000. The order the rules are listed in does not matter.

**A rule can read the previous row.** *new cases* is *cumulative_cases* minus *cumulative_cases in the previous
row*. Such a rule needs the records sorted, which is set above the rules:

| Setting | What it decides |
| --- | --- |
| **Sort by** | The column the rows are put in order by. Date columns are offered first. The file's own order is never used |
| **Within each** | The columns that say whose rows these are, such as the place: each place's rows are sorted, and a row's previous one is its own place's |
| **The previous row is** | *The row recorded before*, or *the day*, *the week* or *the month before*. Where that period has no row, the value is empty, and counted |

The table comes out in this order. Under the rules, the preview is then **Before**, **Sorted** and **After**.

**Before and after.** Under the rules, the dialog shows the records as they arrive and as these rules would leave
them, on every edit: each new column, and which rule each record matched. Each rule's heading says how many records it
matched. The first 50 records are drawn; the counts are of all of them.

## What it says instead of guessing

- **A division by zero** gives an empty value, and is counted and named: *1 record has an empty value, from a division
  by zero: Harbour.*
- **A value to compute from that is missing** gives no value, and is named.
- **Two rules giving one record different values** give it none, and both rules are named.
- **The first row of a place has no previous one.** Its value is empty, counted and named.
- **Two rows for one period** have no single previous row: both, and every later row of their place, get no value
  rather than a guessed one, and are named.
- **A value that fell** below the previous row's, such as a cumulative count corrected down, is kept as computed and
  named.
- **A number without a unit** stops the rules from running until its unit is stated, and a rule comparing two
  different units is refused while it is being written.

On a wide table, a computed value is a new variable of each subject: in the table it is one more row per subject,
named for the new column, as **Derive a value** adds it.

## What it will not do


**It will not describe the new column.** What a computed value measures, and its unit, cannot be recorded on the step yet.

## What this does not establish

That a rule is right for its question. Rules do exactly what they say, including what was meant and not written.
