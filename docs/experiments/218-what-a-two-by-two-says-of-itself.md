# 218 · What a two-by-two says of itself

_Created 2026-11-15 · Updated 2026-11-15_

**Status:** asked. Scheduled in TODO item 34. Nothing built.

## The question

Can a two-by-two state, as facts, the readings that follow from its four cells alone, and leave the interpretation to
the person reading it?

The practitioner, 2026-11-15, after asking how to read Salmonella's melon table: *"We can add the melon notes above as
example authored notes for the example for the notes UI unless the ontology can help structure the interpretation"*,
and then *"Yes"* to doing both: the interpretation as authored notes, the arithmetic as structured readings.

## The split

| A reading that follows from the cells | Who states it |
| --- | --- |
| The interval lies wholly above 1, wholly below it, or crosses it | the step |
| A cell is 0, so no ratio exists | the step (today the cell says "unknown" and nothing says why) |
| A cell holds 1 or 2, so the ratio is unstable | the step |
| Several exposures, none adjusted for the number of comparisons | the step (said today, in the sentence) |
| The design allows odds ratios only | the step (said today, from the declared design) |

| An interpretation | Who states it |
| --- | --- |
| Which exposure is the likely vehicle | the practitioner, as an authored note (finding) |
| Exposures that go together borrow from each other | the practitioner (limitation) |
| What confirmed the vehicle beyond the table | the practitioner (finding) |
| Crude here, adjusted elsewhere | the practitioner (limitation) |

**The boundary is the one that makes this acceptable.** The readings never conclude: no exposure is named the vehicle,
ranked, or highlighted, as [161](161-the-epi-kernel-one-table-many-exposures.md) decided for the table itself.

## Open

- **Thresholds.** "Unstable" at a cell of 1 or 2 is a convention. Whether to state the smallest cell instead and let
  the reader judge is the first design choice.
- **Where the readings appear.** A column per row (as "left out" is), a line in the Notes table note, or both.
- **The vocabulary.** Classes for the readings in `fw:`, so a SHACL shape can check that a ratio reported over a zero
  cell does not exist; reuse of STATO or OBCS terms where one has the same meaning.

## Validation it commits to

Salmonella's matched panel table: Galia's interval wholly above 1 (4.02 to 60.6); other melons with b = 0, no ratio;
cantaloupe with b = 1, unstable. Oswego's menu, where vanilla ice cream's interval is wholly above 1.

## What a practitioner observation could show

Written before anything is built: whether a trainee reading the table with the readings beside it still reasons to the
vehicle themselves, or reads the readings as the answer.

## What this does not establish

- That any exposure caused illness; a reading is about the arithmetic of four cells.
- That the readings are complete; adjustment, confounding and recall are the authored notes' to raise.
