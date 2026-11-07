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

**The practitioner's overall sense, 2026-11-07, before either pass was merged:** *"My overall sense is FW suffers
from AI documentation seeping into the UI reducing comprehensibility."* Recorded as said, as the lens this evaluation
looks through first. It names H2 (the system's words, not the writer's) and H8 (explanation competing with the task).
Instances in the captured screens: the Notes tab explaining which kinds of note come from where; the header subtitle
"Developmental evaluation · … semantic representation"; the Inspector's "inspect the N3 facts, then run the readiness
rule"; this project's own terms as labels (*machined*, *derived*, *authored*, *N3 & evidence*). The likely mechanism:
text written to record a design decision is the same string that reaches the screen.

**So each screen's visible text is also sorted** into **instruction** (what to do), **status** (what happened) and
**design explanation** (why it was built this way). The third kind belongs in the manual or the experiment record.
`validate-inspector-prose` already counts the Inspector's prose; extending that count, by kind, to every surface is
how a cut would be seen to happen rather than claimed.

**A second overall sense, the same day:** *"Also overall the buttons are hard to find and not keyed and placed
consistently enough to establish a pattern."* H4 and H6: a control should look like what it is and sit where the last
one like it sat. Instances in the screens: the button that opens a note drawn as a chip beside labels; a note's
primary action at the foot of the dialog while a widget's sits in the Inspector's body. **So each screen's controls
are also inventoried**: every button with its label, its style and where it sits, so an inconsistency is a row in a
table rather than an impression.

**A third, the same day:** *"The widget configuration dialog approach is not consistently applied some widgets have
overly complicated inspector panels, with stale non working or unused elements."* H4, H8 and H5: one way to configure
a widget, nothing on the panel that the task does not need, and nothing that looks like it works and does not. **So
each widget's Inspector is also inventoried**: whether it configures through a dialog or in the panel, every control on
the panel, and for each control whether changing it changes the step's settings or its result. A control that changes
neither is stale, and is a row in the table rather than an impression.

**A fourth, the same day:** *"Also the widget ports do not have a consistent way of working. Some input ports are
like auto detect what's coming in and label the port type after success connection while the others are
predetermined ports and form a clutter on the left side."* Then: *"The Map widget is an example of"* (unfinished when
recorded). H4 and H8. **Measured the same day** from `nodeInputs` in `src/core.ts` and `widgets/port-contracts.json`:
four models of input port, not one.

| Model | How the ports appear | Widgets |
| --- | --- | --- |
| Fixed list | Every port drawn, used or not | `map_output` 8 optional, `stack_polygons` 6, `table_output` 5, `compare_point_sets` 5 |
| Inferred from the wiring | The first connection settles the mode | `map_output`'s input mode (table, polygons, decisions or spatial) |
| Switched by a setting | An Inspector choice swaps the ports | `case_series`, `rate`, `chart_output`, `deduplicate_points` |
| Counted | The writer chooses how many | `append_rows`, point-layer inputs |

Of 70 widgets, 28 take one input port, 23 two, 10 none, and 9 three or more. The clutter the practitioner names is in
those nine. `map_output` carries two of the four models at once.

**And the evaluation is done inside Fieldwork.** The practitioner: *"Perhaps we can make a pop up form for this JK
evaluation for test sections e.g. widgets so it is in the workflow and can be saved to laptop so it can be reviewed."*
Decided the same day: shown only when lab evaluation is switched on, in Help; saved as Markdown to read and JSON to
merge.

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

## The form, built (0.44.0)

**Help → Lab evaluation** switches it on for this device; an **Evaluate** button then appears in the header and in
the note dialog. The form names the screen (the open tab, and the selected step's widget and version where there is
one) and the Fieldwork version, then lists H1–H10, each with one question, where a problem is added with *what
happens*, *what it costs* and, for the first lens, whether the text at fault is instruction, status or design
explanation. **Save to laptop** writes `fieldwork-evaluation-<screen>-<evaluator>-<time>.md` to read and `.json` to
merge; a name is required first. What is typed is kept as a draft on that device until saved. It holds no severity:
rating is a later step on the merged list, and merging two passes in the app is not built.

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
