# 184 · A heuristic evaluation in the lab: the notes dialog against Nielsen's ten

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. The screens are captured and one evaluator's pass is recorded; the second evaluator's pass and the
severity ratings are not done.

## The question

The practitioner, 2026-11-07, after the Add note dialog grew two source questions and guide questions in 0.43.0
([183](183-forms-of-a-note.md)): *"Can we use Jakob Nielsens criteria for UI design"*, and then: *"We can do 184 as a
lab (us) evaluation."*

So: where does the notes surface break a usability heuristic, and how badly, as judged by the two people building it?
A lab evaluation, not a field one: it finds problems an expert can see, not whether trainees can use the surface,
which stays a [field question](../field-questions.md).

**Searched `docs/` first** for *Nielsen* and *heuristic evaluation*: nothing prior.

## The instrument

**The heuristics**: Jakob Nielsen's ten usability heuristics, 1994, last reviewed 2024
([Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/), read in full):

| # | Heuristic |
| --- | --- |
| H1 | Visibility of system status |
| H2 | Match between the system and the real world |
| H3 | User control and freedom |
| H4 | Consistency and standards |
| H5 | Error prevention |
| H6 | Recognition rather than recall |
| H7 | Flexibility and efficiency of use |
| H8 | Aesthetic and minimalist design |
| H9 | Help users recognize, diagnose, and recover from errors |
| H10 | Help and documentation |

**The severity scale**, Nielsen, 1994 ([Nielsen Norman Group](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/),
read in full): 0 not a usability problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe. A rating weighs how often the
problem occurs, how hard it is to overcome, and whether it keeps recurring.

**How it is run, from that page.** Problems are found first; severity is rated afterwards, by each evaluator alone, on
the merged list, because an evaluator looking for problems is not weighing them. Nielsen judges one evaluator's ratings
too unreliable to trust, and the mean of three satisfactory for most purposes. **This lab has two**, and one of them
helped build the dialog, so the ratings here are a starting order, not a measurement.

**The screens**, captured from 0.43.0 in Chromium at 1280 × 900, on the South London example, in `docs/images/184/`:

| File | Screen |
| --- | --- |
| `01-notes-tab.png` | The Notes tab, opened |
| `02-add-note-fresh.png` | Add note under Discussion, nothing chosen |
| `03-add-note-answered.png` | The same note, function and both source questions answered, a sentence written |
| `04-guide-hidden.png` | The guide questions hidden |
| `05-citations.png` | The Citations tab of the dialog |
| `06-manual-notes.png` | The Notes page of the manual, from Examples |
| `07-after-discard.png` | The Notes tab after Discard on that note |

## The protocol

1. **Each evaluator finds problems alone.** For each screen, go through H1–H10 and write every problem: screen,
   heuristic, what happens, and what it costs the writer. Use the app as well as the screenshots. **Do not read the
   other evaluator's findings first.**
2. **Merge** both lists into one, one row per problem, keeping who found it.
3. **Each evaluator rates every row alone**, 0–4, including problems they did not find.
4. **Record the mean** and the spread. A problem rated 3 or 4 by either becomes a TODO item; a problem the two rate
   two or more points apart is discussed and the reason recorded.

Claude's pass is in [heuristic pass, Claude](../research/heuristic-pass-notes-dialog-claude-2026-11-07.md), written
before any rating and not to be read before the practitioner's own pass.

## The practitioner's pass

To be filled in: screen, heuristic, the problem, what it costs.

| Screen | Heuristic | Problem | What it costs |
| --- | --- | --- | --- |
| | | | |

## What would close it

**It moves to `tried`** when both passes and both sets of ratings are recorded, with the merged list.

**It is `validated`** when each problem rated 3 or 4 is fixed and a browser test fails if the fix is reverted, or is
recorded as deliberately left with the reason.

**It is `retired`** if the two passes find nothing either rates above 1, recorded with both lists.

## What this does not establish

That trainees or practitioners can use the notes surface: a heuristic evaluation predicts problems, it does not observe
them. That two evaluators find most problems; Nielsen's own guidance asks for more. That a heuristic broken is a problem
in this setting: some of what breaks a heuristic here was chosen on purpose and recorded where it was chosen, and the
merge should say so rather than count it as a defect.
