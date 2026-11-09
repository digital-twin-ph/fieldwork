# Relate a column from another table

_Created 2026-10-26 · Updated 2026-11-08_

**A join, narrowly.** It takes two tables that name the same subjects, and brings a *category* from the
second one onto the rows of the first.

## What it does

Two tables often describe the same subjects and carry different things about them. John Snow's
Table VIII gives each of 32 South London sub-districts its population and its cholera deaths;
his Table XII gives each of the same 32 sub-districts the company that supplied its water. Neither
table alone can answer *how many people died in the sub-districts supplied by one company*, and
until this widget existed the application could not put them together — so the example repository
carried that answer as a table somebody had computed by hand.

Relating Table XII's `water_supply` onto Table VIII gives every row a supply category. Nothing is
added up yet; that is the next step.

## What you connect

| Port | What goes there |
| --- | --- |
| **records** | the table being added to |
| **related** | the table being read from |

Both are tables, or point layers read as tables: each point a row of its attributes, without its location. The order
matters: the first keeps its rows and gains a column, the second is only read. **One table can go into both**, to relate
its rows to each other: Hagelloch's cases, each matched on `infector` to its infector's `case_ID`.

## How to use it

The step's panel holds four things: its **Name**, its two **Inputs** (*Table being added to* and *Table read from*), one
sentence saying what it will do, and **Configure…**. After a run it says, in one line, how many rows related and which
were dropped. Under that, **Manual**, **Evidence** and **Version**, then **Duplicate** and **Remove**.

**Configure…** opens the step's dialog, where everything is set. It has three parts, top to bottom:

- **Settings**, below;
- **Preview**: the join these settings would make, before anything is applied;
- **Decisions**: what happens to rows that did not match, which the step will not choose for you.

Nothing changes the workflow until **Apply**. **Cancel**, **×** and the Escape key leave the step as it was; if you
have changed something, the dialog asks before discarding it.

| Setting | What it decides |
| --- | --- |
| **Matched on, in the first table** | the column holding the names or codes, such as `sub_district` |
| **The same, in the second table** | the second table's column for them; the column of the same name where there is one. A line list's `Residential District` against a population's `district` |
| **And also matched on** | more shared columns, where one column does not identify a subject: a monitor's reading is one row per `site` **and** `date`. A row relates only where every chosen column agrees |
| **Bring across** | the second table's column to add, such as `water_supply`, or its **value column**, such as a monitor's reading in ppb or a district's census population, which arrives as written and **as a number**, with its unit, so **Rate with a denominator** can divide by it |
| **Bring it in as** | the name the brought column is written under. Needed where the first table already has a column of that name, as when a table is related to itself: `date_of_prodrome` brought in as `infector_prodrome`. Left empty, the column keeps its own name |
| **Compare keys** | folding punctuation and case; exactly after trimming; or allowing for spelling, and dropping words |
| **A date within a period** | optional; see below |
| **Shifts, in days** | optional; see below |

### Compare keys

Two sources spell names differently. Snow's own tables agree with each other, because both
transcribe the same book — but his sub-district names against the published boundaries match **23
of 32** exactly and **32 of 32** once punctuation is folded, and every one of the nine differences
is a single comma. So folding is the default, and the choice is recorded in the evidence.

Tighten it to **exactly** when a punctuation difference means two different subjects. Loosen it
when it means one subject written twice.

**Allowing for spelling, and dropping words.** Sources also differ by more than punctuation. A line list writes
"Bo District" where the boundaries write "Bo", and "Falaba District" where they write "Fabala". With this chosen:

- **Words to drop** are taken out of both columns before comparing, as whole words: `District` takes "Bo District"
  to "bo", and leaves "Districtville" alone. Separate several with commas.
- **Spelling allowed** is the similarity a name must reach to match one spelled differently: 0.88 to start, from
  0.5 to 1. Higher allows fewer differences; 1 allows none. It is Jaro-Winkler, as Deduplicate records uses.

Each name is matched once. The preview lists every name, how it was compared, what it matched and how: **matched
exactly**, **matched allowing for spelling** with its score, **ambiguous** where two names are as close, or **not
found**. An ambiguous name is listed under **Decisions** with its candidates: choose one, or none. A name not found,
or left undecided, is an unmatched row, decided as any is.

The result gains a column saying how each row matched, such as `Residential District match`. You can bring the second
table's own column across, such as `district`, to have its spelling on every row.

Check the spelling matches in the preview. A close spelling is not always the same place: "Fabala" is Falaba because
the boundaries hold no other district like it, which you can see and the step cannot.

### The preview

The dialog's **Preview** shows three things, and they change together as you choose:

1. **The shape of the join** — a bar of the keys only in the first table, in both, and only in the
   second. Keys, not rows: a table here holds several rows per subject, so counting rows would say
   that nine unmatched sub-districts are eighteen unmatched things.
2. **The effect on each numeric variable** — what each one totals over the whole table, over the
   rows that matched, and the share retained. Read this before anything else; see below.
3. **The Methods note** this step will machine, and a **preview of the table** that will travel on, with the key
   columns marked **Matched on** and the column added **Brought across**, as in **View this table**.

Then **Apply**. Nothing is written until you press it.

### What the shares are telling you

If two variables keep different shares, the rows that did not match are **not a random sample** of
what you are measuring. On Snow's Table VIII against the published boundaries, 68.2% of population
is retained against 61.2% of deaths — so a mortality rate computed on the matched rows comes out at
**89.6% of its value over the whole table**, 2.787 per 1000 against 3.109.

That multiplier is arithmetic and not an estimate: a rate of one variable over another is
multiplied by exactly the ratio of their retained shares. It runs backwards too. If the figure you
expected and the figure you are looking at differ by that ratio, you are looking at a number
produced by a join you did not intend — and the shares say which one.

Had both variables kept the same share, the exclusion would cost precision and leave the estimate
alone.

### The rows that did not match

Where any key of the first table has no row in the second, **the step will not run until you say
what to do**, under **Decisions** in the dialog. Neither choice is ticked to begin with: the two
answers give different totals and the result cannot be read for which one you got, so nothing here
chooses for you.

| Choice | What you get |
| --- | --- |
| **Drop them** | only the matched rows, and the totals the shares describe |
| **Keep them under a category I name** | every row, and the totals of the whole first table |

Keeping needs a name, and it has to be yours — nothing here will invent a stratum the data never
measured, and a name already used by the second table is refused so that unmeasured rows cannot
join a measured group.

Your decision is stored with a signature of the gap it was made about. Edit either table, or change
how keys are compared, and the decision lapses rather than riding on data it was not made about.

### Why it brings a category and not a number

A table in this application is **long**: it has key columns, which hold labels, and one value
column, which holds numbers. A water supply company is a label, so it can only arrive as a key
column — and a key column lands on every row, which is why **the row count does not change.**

Bringing *numbers* across would mean adding rows instead, and that is a different operation with a
different way of going wrong: two tables can disagree about the same measure. It is not built.

## A date within a period, and a lag

Some tables do not share a date. Weekly cases have a week; a satellite product has an 8-day period with a start and
an end. **Match a date within a period** relates each row to the row of the second table whose start and end hold
its date, alongside the columns matched on as usual (the municipality, say).

| Setting | What it decides |
| --- | --- |
| **Date, in the first table** | the date to place, such as `data_iniSE`, the Sunday a week starts |
| **Period start** and **Period end**, in the second | the span each row of the second table covers |
| **Shifts, in days** | **+ Add a shift**, then the days added to the date before it is placed: **+3** takes a week's Sunday to its Wednesday, and a lag of *k* weeks is 7*k* days fewer, so a 2-week lag from the Wednesday is **−11** |

The result keeps the shifted date and the matched period's start on every row, so each match can be checked. A
date that falls inside two periods of the second table, such as two satellites' rows for one period, is refused
by name: keep one row per period first. A date in no period is a row with no match, decided as any other.

**Several shifts in one step.** Add two or more shifts and the column is brought once per shift, each as a column of
its own named by the shift: `LST_Day_1km_-11d`, `LST_Day_1km_-25d`. Every row is kept. A row with no value at a shift
has that column left empty, and the preview and the run count the empties per shift. So there is no decision about
unmatched rows to make: nothing is dropped. Several shifts need a date within a period, each a whole number of days,
none listed twice. There is no limit on how many: each shift takes about half a second on 77,740 rows.

**A table can be related to itself, shifted.** Rainfall two weeks before each case week is the weekly table's own
rainfall, 14 days earlier: choose the week's start as the date, the period's start and its end. The first table
already has that column, so the matched week is written as `data_iniSE_matched` and the first table's own date is
kept. A second shift on a table that already holds one is written as `data_iniSE_shifted_2`, beside the first.

**A decision about unmatched rows is kept as a short digest** of the rows it was made about, so it lapses when they
change. Sixteen years of weekly cases left 58,401 rows unmatched in one join; the decision used to be stored with all of
them written out, and seven such joins filled the browser's storage. A decision saved that way before 0.41.0 still
holds.

## Reading what you get

The same table with one more column, and, on the step after a run, one line saying **what the join did**: for
example *4 of 6 rows related; 2 dropped, with no district in supply.csv: Charlie.*

Read the dropped count first. A row that found no match is **absent from the table that travels
on**, so the result is internally consistent whether it holds all of your rows or two thirds of
them. The line names the keys that did not match, so you can go and look at the second table
rather than only know that something is missing. Where nothing was dropped it says so, because
"none" is the claim you need and a zero is easy to pass over. With several shifts, the line counts
the empty rows per shift instead.

**View this table** repeats the column origins above each column heading, so a wide
related table says which half of the row came from where. It also marks the join's own columns:
each key column **Matched on**, tinted, in every *Before* and in *After*, and the column added
**Brought across** in *After*.

### The Methods note

This step machines a note for the **Methods** section of a write-up: what was brought from where,
on what key, compared how, how many keys appeared in both tables, and — where rows were
excluded — which keys those were and what share of each variable survived. A join is a thing you
did to the data, and the count of what it excluded is Methods prose in an epidemiology paper rather
than a limitation.

The dialog's preview shows the note each choice would produce, so you can read the sentence before
applying it. The run records it in the evidence.

## What it will not do

- **It will not choose between two answers.** If the second table gives one key two different
  values of the column being brought across, this refuses and names the key. Taking the first
  would produce a grouping that is wrong in a way no total reveals, and the ambiguity is usually
  telling you the key does not identify what you think it identifies.
- **It will not invent a category.** A key the second table has no row for is **reported by name**
  and those rows are dropped. Filling in "unknown" would put a stratum in your table that nobody
  measured.
- **It will not match approximately unless you ask.** Keys are compared exactly after trimming, or with
  punctuation and case folded, unless you choose **allowing for spelling** (see **Compare keys**). Even then it
  will not choose between two names equally close: you do.
- **It will not allow for spelling on a date within a period.** Choose one or the other.
- **It will not tell you the two tables describe the same subjects.** That is your judgement. The
  widget checks that the keys line up, not that they mean the same thing.

## Where it is used

The South London example: *Died or survived, by water supply*. The NYC example: *Did the satellite
see the city's NO₂?*, which matches satellite and ground readings on `site` and `date` together and
brings the ground reading, the second table's value, across.

## How it was checked

Validation Lab check **28**, `28-relate-table-vs-pandas.ipynb`, against a pandas left merge of
Snow's Table XII onto his Table VIII. There is no arithmetic to check, so what was recomputed is
the matching: the same category on the same row, the row count unchanged at 64, and the same rows
dropped and named when a sub-district is withheld.

The case worth an outside eye is the ambiguous key. A merge resolves it by **multiplying rows** —
66 rows out of a 64-row table — so the sub-district's population would appear under both companies
with no total revealing it. This refuses instead, and the check records the merge's row count as
the measure of what the refusal prevents.

What it does not reach: Snow's two tables spell every sub-district identically, so a name
differing by punctuation or case — the case you will actually meet — is never exercised.
