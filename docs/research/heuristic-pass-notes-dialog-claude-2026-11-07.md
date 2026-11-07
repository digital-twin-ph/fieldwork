# Heuristic pass on the notes dialog: Claude

_Created 2026-11-07 · Updated 2026-11-07_

**Standing of this note.** One evaluator's findings for [184](../experiments/184-heuristic-evaluation-in-the-lab.md),
found alone and before any rating. The evaluator helped build the dialog, which is a reason to expect it to miss
problems a newcomer would meet. **If you are the second evaluator, do your own pass before reading this.**

Screens are in `docs/images/184/`. Each finding gives the screen, the heuristic, what happens, and what it costs the
writer. Some may be choices made on purpose; where that is known it says so, and the merge decides.

| # | Screen | Heuristic | What happens | What it costs the writer |
| --- | --- | --- | --- | --- |
| C1 | 02, 07 | H3, H2 | **Discard keeps the note.** On a new note the exit is labelled Discard, but the note card stays, unwritten, and the tab's count goes from 13 to 14. Keeping an unwritten note was chosen on purpose (it says so on the card); the label says the opposite | Notes the writer believes were thrown away accumulate as unwritten cards, and the write-up's count is off |
| C2 | 02 | H8, H6 | **The text box is the last thing in the dialog.** Above it: part, function, two source questions, a gloss, four guide questions, "produced by", the function's gloss, a toolbar. At 900 px high the box starts about two-thirds down | Writing, the dialog's purpose, comes after reading several things; on a small laptop the box may start below the fold |
| C3 | 02, 03 | H8 | **The function's explanation is separated from the function.** "What this note does for a reader. Unstated is allowed." sits below "Produced by", three blocks away from the Function list it explains | A writer reading the line cannot tell which control it belongs to |
| C4 | 02, 05 | H6, H2 | **Whose words is asked before any work is cited.** The two source questions are at the top; works are added on the Citations tab below. A note with no works is asked them anyway, with a line saying they apply only if it draws on literature | The writer answers about sources before naming them, or answers for a note that has none |
| C5 | 05 | H5, H2 | **The citation form's examples look like filled-in values.** The authors box shows "Utazi, C. Edson / World Health Organization" and the date "2022 or 2022-11-26" in grey | A writer may take them for data already entered, or for the citation they are meant to keep |
| C6 | 05 | H8 | **The citation fields are narrow.** Title, journal and volume boxes are about a quarter of the dialog's width | A title cannot be read back while it is typed |
| C7 | 01 | H4 | **"open" looks like a label.** On each card, the button that opens a note is drawn as a chip, in the same style as the kind and function labels beside it | A writer may not see that a card can be opened, or may try the other chips |
| C8 | 02 | H2 | **Internal words in the title.** "New note authored · ed54a715": the note's kind and the start of its identifier | Noise to a writer; "authored" is this application's term, not theirs |
| C9 | 02 | H4 | **Two names for the parts.** The dialog says "IMRaD section"; the manual says "part of the write-up" | A small inconsistency, met on every note |
| C10 | 02 | H6 | **Unlabelled toolbar buttons.** "•—", "1." and a quotation mark, with names only on hover | Formatting has to be discovered by hovering |
| C11 | 02, 03 | H10 | **Examples sits inside the source-question line.** The manual it opens also holds each part's entry and its questions, which the button does not suggest | The guidance for the part is a click away and nothing says so |
| C12 | 03 | H5 | **Nothing flags a note citing works with whose words unanswered.** Planned as a plain check, not built | A note can reach the write-up with its relation to its sources unstated |
| C13 | 01 | H8 | **The opening notice covers the notes.** "…opened. It is on this device now and opens offline." sits over the first cards for several seconds | Minor; the content underneath cannot be read until it goes |

**Noted as working, against the same heuristics:** the word and character count updates as the note is written (H1);
every choice opens on *unstated* and none is required (H3); hiding the guide questions is undone by one button that
names the part (H3, H7); an empty note is refused with the reason (H9); the Notes tab says which workflows have not run
and offers to run them (H1).
