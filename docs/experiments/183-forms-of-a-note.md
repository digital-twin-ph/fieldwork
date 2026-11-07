# 183 · The forms of a note: do they help people write better?

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. Three forms are built (0.42.0, recorded in [182](182-brazil-across-years.md)); the five-form design
below is not, and nothing has measured whether any of it improves writing.

## The question

Writing the Brazil example's notes on what a mosquito meets ([182](182-brazil-across-years.md)), the practitioner set
out how a note that uses literature can stand to it: *"Our notes that cite literature can take the form of a precis,
paraphrase or summary."* Then, working through what that leaves out: *"So five forms — direct quote, own words,
paraphrase, precis, summary?"* And on the fifth: *"Own words can be arguments, reasoning, etc. The author analyzing,
synthesizing."*

Asked whether the approach helps trainees and practitioners write better, the answer was that it might and nothing
shows it yet. The practitioner: *"We can write it up as exp 183 so we can continuously explore."*

So the question is not settled by building the forms. It is whether naming how a note stands to its sources changes
what gets written, and that is open for as long as people write notes.

**Searched `docs/` first** for *paraphrase*, *précis* and *summary* as forms of writing. Nothing prior beyond
[141](141-organising-snows-notes.md) and [149](149-the-notes-spike.md), which settle a note's kind (quoted, derived,
machined, authored) and function. Neither names how a note stands to a source.

## The design

Five forms, presented as answers to one question: where do these words come from? Ordered from closest to the source
to furthest, which is also the order of how far a reader can check a note against the source.

| Form | What it is | A reader checks it by | Stored as |
| --- | --- | --- | --- |
| **direct quote** | The author's exact words | Matching it to the source, word for word | A **quoted** note, as now: verbatim, with what it establishes |
| **paraphrase** | One passage, in other words | Holding it against that passage | Authored note, `form` |
| **précis** | One work's argument, condensed | Holding it against that work | Authored note, `form` |
| **summary** | What several works say | Holding it against each work | Authored note, `form` |
| **own words** | The writer's argument, analysis, reasoning or synthesis | Judging the reasoning, and whether any works it cites support it | Authored note, `form` |

Decisions taken with the design, each open to moving:

- **Direct quote stays a kind, not a form.** A quotation is checked verbatim against its source; as a form on an
  authored note it would lose that. Choosing it in the dialog should turn the note into a quoted note, which needs
  the quote, the source and what it establishes.
- **Own words is stated, not assumed.** Today a note with no form may be the writer's own argument or may simply
  have not been labelled. Making own words a choice turns that gap into a stated fact, and leaves unstated as the
  thing a plain check can flag.
- **Synthesis is own words, not summary.** A summary reports what works say; a synthesis is the writer's argument
  built from them.
- **A mixed note becomes two linked notes.** A summary that goes on to the writer's reading is written as a summary
  note and an own-words note that relates to it, using the links notes already have. Each half is then checked on its
  own terms.

**For now, the form is optional and defaults to unknown.** The practitioner, 2026-11-07: *"We can for now make the
note type optional by adding unknown."* Built: the dialog's form list opens on **unknown**, which stores nothing, so
no writer is made to pick a form to keep a note. Unknown is what the plain checks would flag on a note that cites
works, and what measurement 1 below counts.

## Why it might help, and why it might not

| Might help | Might not |
| --- | --- |
| The form asks for a decision while writing: am I reporting or arguing? | A form picked to clear the dialog teaches nothing |
| Splitting report from argument puts the seam where overclaiming happens on the page | A correct label on a wrong précis lends it credit |
| A reviewer knows whether to open the source or test the reasoning | Five choices are one more thing for a new writer to get wrong |
| Linked notes show which claims rest on which evidence | The distinctions come from general academic-writing teaching, whose evidence was not checked here |

## What would be measured without a person

These need no field testing, and are what moves this document:

1. **Every existing note fits one form without strain.** Apply the five to South London's 13 notes and Brazil's 12,
   by hand, and record each one that fits none or two. A note that will not fit is a finding about the design.
2. **The Brazil notes are relabelled and split** as the design says: the note on one slope per degree is own words;
   the resting-site and drought notes each become a summary or précis plus an own-words note. Count the notes before
   and after.
3. **The plain checks** (`TODO.md`, "Plain checks on a note, before any model"), run over every note in every
   example, with each finding judged by hand as right or wrong. The share judged right is the measure; a check that is
   mostly wrong is removed.

What a person would answer is kept in [field questions](../field-questions.md#do-the-forms-of-a-note-help-people-write-better):
whether trainees can tell a summary from their own argument, and whether notes written with the forms are easier to
review than notes written without them.

## What would close it

**It moves to `tried`** when the five forms are built — own words and the direct-quote route in the Add note
dialog, the manual page revised — and measurements 1 and 2 above are recorded with their counts.

**It moves to `validated`** when the plain checks run over every example's notes and the share of their findings
judged right is recorded, with the checks that fell below it removed. That validates the checks, not the claim that
the forms help people write: that one stays a field question, and this document stays open to it.

**It closes as `retired`** if measurement 1 finds the forms do not fit the notes that exist, recorded with the notes
that broke it.

## What this does not establish

That any of this improves anyone's writing. That five is the right number of forms, or that these are the right
five. That a writer chooses a form honestly. That the plain checks catch what matters, until measurement 3 is
taken. And whether a model asking questions would catch what they miss, which was considered and set aside on
2026-11-07 for the skills it would take over and for unreliability and invented citations; that stays an idea until
a check is measured to miss something a model would find.
