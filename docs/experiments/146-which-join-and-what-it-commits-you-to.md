# 146 — Which join, and what it commits you to

_Created 2026-10-28 · Updated 2026-10-28_

**Status:** asked — what shipped is a report, not an answer, and the question below is open.

The practitioner, 2026-10-28, on the first draft of this document:

> Experiment 146 does not ask the real important question, which is how should the joined tables be
> presented such that the practitioner is aware of the implications of the types of joins when the
> tables do not have equally matching rows. What the user decides to do after that has downstream
> consequences.

The first draft asked how a finding reaches a reader. That is a reporting question and it has an
easy answer. The question above is a **decision** question, and this application does not currently
let the practitioner make the decision at all.

## The application already answers this three ways, and two of them are opposite

What happens when two sides do not match row for row is not an open problem here. It has been
solved three times, to three different standards, and nobody has reconciled them.

| | `relate_table` | `join_table_to_area` | `deduplicate_points` |
| --- | --- | --- | --- |
| an unmatched row | **dropped** | **kept, `value: null`, and still drawn** | neither, until you say |
| how names are compared | equality, punctuation and case significant | equality after declared folding (`fuzzy` / `exact`) | similarity with a threshold |
| what it tells you | a count and the key names | **six named failure codes**, each a different thing to fix | a score, a class, and a question |
| who decides | nobody | nobody, but the choice is declared | **the practitioner, recorded with a signature** |

Two things in that table matter more than the rest.

**The same application draws opposite conclusions about the same 32 sub-districts.** South London's
choropleth workflow puts them through `join_table_to_area`, whose comment states the principle: *"a
boundary with no data is a fact about the data and not a reason to leave a hole in the map."* The
contingency workflow puts the same 32 through `relate_table`, which drops them. Both are defensible.
Nothing in the application says why they differ, and no practitioner chose either.

**`area-join.ts` already wrote down why a count is not enough**, in the comment above its failure
codes: *"a join that reports only 'matched N of M' tells a practitioner nothing they can act on,
and each of these names a different thing to go and fix."* The panel built today reports matched N
of M **plus the key names** — better than the receipt it replaced, and still short of the standard
the neighbouring join set a week earlier.

And the comparison is stricter where it is least defensible. `join_table_to_area` exists *because*
sources spell names differently: measured on South London on 2026-10-25, **23 of 32** sub-districts
matched on raw strings and **32 of 32** after folding punctuation, because the table writes
`St. George, Camberwell` where the boundaries write `St. George  Camberwell`. `relate_table` has no
folding. Key cells are trimmed at import (`data-table.ts:41`) and compared as they stand, so a
difference of one comma drops the row. South London survives this only because both of its tables
are transcriptions of the same book.

## What the decision commits you to, downstream

The relate is the first of six steps in the chain South London actually runs: relate → group →
derive → select rows → two-by-two → rate ratio.

A sub-district the second table does not name loses **both** of its rows — its population and its
deaths. Then the group totals a smaller stratum, the derived survivor count follows, the two-by-two
is built from it, and the rate ratio divides. The ratio is computed over a population that is not
the published one, and it still looks like a rate ratio: an interval, a point estimate, a figure a
reader would quote.

The panel built today says 62 of 64 **at the join**. Nothing after the join mentions it. So the
report answers "did this step lose anything" and not the question a practitioner is actually asking,
which is "is the number at the end of this chain the number I think it is".

## Why the application cannot decide it

A key the second table does not carry is one of two different things, and nothing in the data
distinguishes them:

- a **data problem** — the same sub-district, spelled differently in two sources. The right action
  is to fix the file or declare the synonym, and dropping the row hides a fault.
- a **real absence** — a sub-district supplied by neither company. The right action depends on the
  question: dropping it is a complete-case analysis, which assumes the unmatched rows are missing at
  random with respect to the exposure; keeping it puts a stratum in the table that nobody measured.

Both arrive as the same symptom. That is precisely why it has to be presented as a decision rather
than resolved by a default, and why `deduplicate_points`' review band — a class, a question, and a
decision stored with a signature of the data it was made about, so editing the data lapses the
judgement — is the pattern in this repository closest to what is needed, and the one the key join
does not use.

## What the visual must show

Settled with the practitioner on 2026-10-28, including their requirement that it reach the numeric
variables: *"The visual aid should also enable the user to see the effects of each type of join on
numeric variables."*

Two axes, shown together, because they interact: **how keys are compared** decides which rows match,
**which join** decides what happens to the rest. A bar for the key overlap, then one row per numeric
variable, measured on Snow's Table VIII against the boundary names under exact comparison:

```
Keys on sub_district          compare: exact ▾

├─ left 9 ─┼─── matched 23 ───┼─ right 9 ─┤
░░░░░░░░░░░███████████████████░░░░░░░░░░░

                      all 32      inner 23   retained
population_1851      486,936       332,266      68.2%
deaths_seven_weeks     1,514           926      61.2%

⚠ the two measures do not drop in step, so a rate
  of deaths_seven_weeks over population_1851 comes
  out at 89.6% of its value over the whole table:
  3.109 → 2.787 per 1000

fold punctuation → matched 32, nothing dropped
```

**The multiplier is arithmetic, not a heuristic.** For any two measures, an inner join multiplies a
rate of one over the other by exactly the ratio of their retained shares:

    rate_inner / rate_all  =  share(numerator) / share(denominator)
    0.612 / 0.682 = 0.8963   and   3.109 × 0.8963 = 2.787   ✓

So the panel can state the effect on the figure the practitioner is about to compute without
guessing a threshold and without knowing which measure they intend as a denominator — it reports the
share per measure and the pairwise multiplier follows.

**And the shares are the epidemiological content.** Had both measures dropped in step, the ratio
would be unchanged and only its precision would suffer. Here deaths fall further than population
does, which is what makes this *informative* missingness rather than missing-at-random, and it is
the reason an inner join here is not a neutral convenience. A practitioner who sees 68.2% beside
61.2% is seeing the thing a complete-case analysis assumes away.

The right-only side carries no measure at all — those keys have no row in the left table — so it is
reported as a count of keys, never as a number that could be added up.

## What the panel is for, which is not offering a choice

Corrected on the practitioner's reading of the first version of this section, 2026-10-28:

> It's not so much about offering a choice but about (1) being transparent about the effects of
> table joins (this should be in fact a machined note from the widget) and (2) serving as a check
> if the computations produce values that match with any of those joins and it happens to be the
> join the user did not intend to make.

The first draft of this experiment treated the remedy as a setting, and weighed a knob against a
default. That is the wrong axis. A practitioner who is told what the join did does not need a knob
to act — they can fix the file, fold the comparison, or report the subset honestly. What they
cannot do is any of that without being told.

**(1) Transparency as a machined note, not only as a panel.** A panel is read by whoever is sitting
in front of the step. The thing that has to survive is the *statement*, in the write-up, next to the
figure it qualifies — which is why this belongs with the quoted notes the example already carries
(`fieldwork/quoted-notes/1`, `kind: 'quoted'`). A note **machined** by the widget is that schema's
sibling: Snow's own sentences are quoted, and the application's account of what it did to his
numbers is machined. Methods gets the comparison and the decision; where rows left, Limitations
gets the shares. The practitioner's framing of the Notes work already requires this — *"if produced
by a workflow it should link to the workflow"* — so a machined note is not a new surface, it is the
first real producer for one that was prototyped and has nothing generating its content.

**(2) The shares are a reconciliation check, and they run backwards.** This is the part the first
draft missed entirely, and it is the stronger half.

An inner join multiplies a rate of one variable over another by exactly
`share(numerator)/share(denominator)`. That identity is reversible. Given a figure a practitioner
expected and the figure they got, the ratio between them *names the join that produced it*:

| | deaths per 1000 | ratio to published |
| --- | --- | --- |
| every row kept | 3.109 | 1.0000 |
| unmatched rows dropped | 2.787 | 0.8963 |

So a practitioner who expected 3.109 and is looking at 2.787 has not got a mysterious
discrepancy — they have got a number that **matches a join they did not intend**, and the shares
say which one and by how much. No other hypothesis is needed, and nothing else in the chain has to
be re-examined first. Equally, a reviewer handed 2.787 and the published 3.109 can test the
hypothesis "an inner join on a punctuation-sensitive key" in one division.

That is a different kind of value from a warning. A warning fires where the application notices
something; this lets somebody reconcile a number *after the fact*, including a number computed on
another day, by another person, in another tool — which is what the receipts are for. It is the
closest thing in this application to a unit check on a join.

## What would close this

The options are not symmetric and should not be offered as a menu of join types borrowed from SQL.
What a practitioner needs to see is what each choice does **to the numbers they are about to
compute** — the denominator, the stratum, the interval — stated before they choose and carried with
the data afterwards.

Three things would close it, in order:

1. **Ask the audience.** Epidemiology colleagues see this on 2026-10-30. Put a related table with a
   withheld key in front of them and find out whether they notice the gap, whether they can say what
   they would want done, and whether they can say what it means for the rate ratio two steps later.
   Nothing in this document is evidence about what an epidemiologist understands.
2. ~~**Measure the asymmetry.**~~ **Taken 2026-10-28.** Relating Snow's Table VIII against the
   boundary names under exact comparison matches **23 of 32**, dropping 9 — confirming
   `area-join.ts`'s figure — and **32 of 32** once punctuation is folded. Every one of the 9
   differs by a single comma: the table writes `St. Saviour, Southwark`, the boundaries
   `St. Saviour Southwark`. The cost is 154,670 people and 588 deaths, and the mortality rate
   moves from 3.109 to 2.787 per 1000 while the result still looks like a complete table of 23
   sub-districts. Against Table XII, which is what South London's relate actually joins, the
   answer is 32 of 32 under either comparison: the example is unaffected, and survives only
   because both of its tables transcribe the same book.
3. **Reconcile the three joins**, or record why three standards are right. If `join_table_to_area`
   is correct to keep an unmatched part, `relate_table` needs an argument for dropping one.
4. **Machine the note.** The shares and the decision exist as structured data on the run from
   0.3.0 and reach only the panel and the receipt. Until a note is generated and lands in the
   write-up beside the figure, purpose (1) is half done: the statement is computable and is not
   stated anywhere a reader of the paper would meet it.
5. **Make the reconciliation runnable backwards.** Purpose (2) is currently a thing a reader can
   do with a calculator and the receipt. Whether the application should offer it — "the figure I
   expected is X; which join gives X?" — is unexamined, and it is cheap: one division per pair of
   variables against the shares already computed.

## What this does not establish

- **Nothing here is evidence from a practitioner.** The failure mode is argued from the code and
  from one worked example whose two tables come from the same source. No epidemiologist has been
  shown a related table with a gap in it.
- **It does not establish that the panel is read as intended.** The two purposes above are argued
  from the arithmetic and from one worked example. Whether a machined note about retained shares
  reads as a warning or as noise, and whether a reviewer would actually run the reconciliation
  backwards, is unknown.
- **It does not say what the surface looks like.** "Present the implications" is not a design. The
  shape of it — a band on the step, a mark that travels with the table, a refusal, a question asked
  once — is unexamined, and the naming of any of it is a separate admission question.
- **The three other steps that drop or omit something are still unaudited**: `group_table` reports
  groups that held an empty cell, `derive_value` the groups that got no derived row, `select_rows`
  the values asked for that the table does not hold. Each reports in the same place, and whether
  their outputs are readable for the omission has not been checked.

## What was built along the way

Not an answer to the above, and recorded so it is not mistaken for one. `relate_table` 0.2.0 shows
on the step, after a run: rows offered, related and dropped against the offered denominator, the gap
keys **named** rather than totalled, a sentence either way, and which table each column came from.
Quick Look repeats the column origins above each heading — what a merge writes as an `_x`/`_y`
suffix, in words, because a renamed column is a different column to everything downstream and a note
is not. `WorkflowRun.relations` carries the outcome, as `linkages` already carried what a
deduplication found. No computation changed.

It reports the consequence of a choice the application made silently. The question is what the
practitioner should be deciding, and when.
