# Apply ruleset

_Created 2026-11-08 · Updated 2026-11-12_

**Rules over records.** Each rule says *if* some conditions hold *then* a record gets a category, such as a band, or a
new value computed from its columns. The rules are written in the step's dialog, or read from a published ruleset.

## What it does

It checks every rule against every record and gives each record what the rules concluded, as new columns. A record no
rule matched keeps no conclusion, and the run says how many.

## What you connect

**Records**: a table, points or polygons. Choose which under *Records arrive as*, in **Configure…**, then the step that
feeds it under *Inputs*. A table imported **wide**, one row per subject and a column per variable,
is read that way: one record per subject, its columns as the file named them. It gives back the same records with the
new columns.

## How to use it

**Configure…** opens the step's dialog. On a new step, choose a published ruleset, or *Write rules for this step*, and
**Apply**: rules of your own open in the rules dialog. There, **Records and columns** comes first: how the records
arrive, each column's kind and its unit. Then the settings, the rules, and the otherwise. Nothing changes until
**Apply**.

**A published ruleset reads named columns.** Under **Which column holds each**, each input the ruleset declares has a
menu of your records' columns; left as it is, the ruleset's own column name is read. *7-1-7 timeliness* reads four
dates, emergence, detection, notification and early response complete: on a line list such as MERS-CoV, South Korea,
2015, choose `dt_onset`, `dt_diag` and `dt_report` for the first three. A chosen column the records do not carry stops
the run, naming the columns they do. The run's record states which column was read for each input.

**Each part of a rule is a block**, with its word and its colour, so a rule's shape reads at a glance:

| Block | What it decides |
| --- | --- |
| **if** (blue) | A column, a comparison (*is*, *is not*, *is more than*, *is at most*, *is less than*, *is at least*, *is recorded*, *is not recorded*) and a value: a typed number or one of the step's settings |
| **+ and** | Conditions in one *if* block, which must all hold |
| **or** (purple) | An alternative *if* block, any of which will do |
| **then** (green), a category | A new column and the value a matching record gets: *band* is *Short* |
| **then**, a computed value | A new column and a sum: *houses without a death* is *houses* minus *deaths*. Plus, minus, times or divided by; each side a column, a value another rule computed, or a typed number |
| **otherwise** (amber) | A column's value for a record no rule gave one: *class* is *Cannot be classified* |

Each block also has its own edge, solid, dotted, double or dashed, so the blocks are told apart without colour.
**The comparison in a condition is keyed by its family** the same way: comparisons of numbers (*is more than*, *is at
most*, *is less than*, *is at least*) teal; *is* and *is not* slate; *is recorded* and *is not recorded* rose, with a
dotted edge.

**A rule can read a category another rule gave.** Once a rule concludes *lab* is *positive*, *lab* is offered as a
column a condition can read, by that name. A category reads in the table as it was typed: *Cannot be classified*.

**Is not** matches a recorded value that differs: *rash is not No* matches *Yes* and *Unknown*. A value not recorded
never matches *is not*; ask *is not recorded* for that.

**Otherwise**, one per column, gives the column a value where no rule did. It waits for the columns its rules read: a
*class* read from *lab result* takes its otherwise only after *lab result* has had its own. So an ordered
classification, such as WHO's for measles, is written as columns in stages, each a few rules and an otherwise. The
rulesets worked example builds one, *Which suspected cases meet the case definition?* An
otherwise never settles two rules that disagree: that record stays without a value, and is named.

**+ Add a value computed for every record** writes a rule with no condition: every record gets the value.

**A new column states its unit**, and what it measures, in the two boxes after the sum: *deaths per 10,000 houses*.
The table the step gives out carries both. A new column without a unit is said in the dialog and the run.

**Settings.** *+ Add a setting* gives the step a number the rules compare against, such as a fever threshold of 38
degrees Celsius: a name, a value and a unit. A condition then reads *temperature_c is more than fever*, and the
threshold can be changed without rewriting a rule.

**Kinds.** Each column is read as a number, a date, a category, or true or false, offered from its values and changed
under *Records and columns*. **A date** is written year-month-day; one date minus another gives **days**, said as the new
column's unit: a serial interval, or the days from onset to report. A date is not added to, multiplied, or compared with
a number, and a day that does not exist, such as 1861-02-30, is reported unreadable rather than moved into March. A file that stores counts as text, "34", offers them as a category: say they are a number, and
the text is reported unreadable at the run, where **Data quality** can read it as numbers.

**Units.** Each column the rules read states its unit, under *Records and columns*. A setting compared with a
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

The table comes out in this order. The preview is then **Before**, **Sorted** and **After**.

**Before and after.** The dialog's Preview shows the records as they arrive and as these rules would leave
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
- **A record that took an otherwise** is counted by column, so a default is never read as a rule's conclusion: *2
  records took class's otherwise, because no rule gave class a value.*

On a wide table, a computed value is a new variable of each subject: in the table it is one more row per subject,
named for the new column, as **Derive a value** adds it.

**A published ruleset** opens in its own dialog: the ruleset, its settings, and as the preview what it decides, its
basis and what it obliges. *Read them in the rule editor* shows its rules there, every control disabled. A newer
version is under **Decisions**: the step stays on the version it was built on until you choose.

## What it will not do

- Order the rules. Every rule is checked against every record; an otherwise is a default, not a last rule.
- Settle two rules that disagree. The record gets no value, and both rules are named.
- Guess a unit, a kind or a column from its name.
- Change a published ruleset in place. A copy can be edited on the step.


## What this does not establish

That a rule is right for its question. Rules do exactly what they say, including what was meant and not written.
