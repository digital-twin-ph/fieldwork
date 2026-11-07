# 183 · The forms of a note: do they help people write better?

_Created 2026-11-07 · Updated 2026-11-07_

**Status:** asked. The evidence search that was to close it ran on 2026-11-07 and cannot validate or retire it: it
finds the design's premise sound and its shape wrong, and leaves a choice open below. Three forms are built (0.42.0,
recorded in [182](182-brazil-across-years.md)); the five-form design is not.

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

**For now, the form is optional, and a writer can say they are not sure.** The practitioner, 2026-11-07: *"We can
for now make the note type optional by adding unknown."* Asked which reads better, unstated or unknown: unstated is
what the application knows when nothing was chosen, and is the word the function and the licence already use, while
*not sure* fits a writer who looked and could not tell. The practitioner: *"Not sure is ok."* Built: the form opens on
**unstated**, which stores nothing, and **not sure** is a choice of its own, stored, so a reviewer can see the
question. Unstated on a note that cites works is what the plain checks would flag, and what measurement 1 below counts.

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

The practitioner, 2026-11-07: *"For 183 we can close it by an evidence search about improving academic writing."*

**It closes on that search**: open evidence on whether teaching writers to distinguish quoting, paraphrasing,
summarising and their own argument improves what they write. What the search finds decides the status:

- **`validated`** if open studies show that teaching or prompting these distinctions improves source use or
  argument in writing, and the forms here match what was taught. The design is then kept, and revised where the
  evidence names a better set.
- **`retired`** if the evidence finds no such effect, or finds that labelling a text's relation to its sources does
  not change it. The forms then go, or stay only as a reader's label, recorded with the studies.
- **Still `asked`**, with the gap stated, if the open evidence cannot say either way.

The three measurements above and the field question stay open beside it: the search says whether the idea is sound,
not whether this application's version of it works for the people using it.

## The evidence search, 2026-11-07

Three searches of open sources, written up in
[teaching writing from sources](../research/teaching-writing-from-sources-2026-11-07.md), each work marked by how far
it was read; the works below are linked to the open copy that was read, with how far. Against the closing condition:

| Criterion | Result |
| --- | --- |
| Teaching these distinctions improves writing | **Partly.** Summary instruction improves summaries: effect size 0.82 from four school studies, measuring the summary itself ([Graham & Perin 2007](https://bridgestolearning2009.pbworks.com/f/graham&perin07.pdf), read in full). Synthesis instruction helps undergraduates integrate sources, effects from −0.86 to 1.10 across studies ([van Ockenburg et al. 2019](https://jowr.org/jowr/article/download/606/517/478), read in full), by a small margin over an active comparison ([Luna et al. 2023](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8749917/fullTextXML), read in part), almost all from one research group. Neither shows better writing at large |
| It guards against plagiarism | **Instruction, modestly; labelling, untested.** All from one systematic review of six controlled studies, mostly at high risk of bias ([Miranda-Rodríguez et al. 2024](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1357853/full), read in full); the primary studies were read only as that review extracts them: a course-randomised citation tutorial lowered plagiarism (Dee & Jacob 2012); an hour of paraphrase training improved paraphrasing and patchwriting avoidance on a test task, with about half the sample lost (Newton et al. 2014); copied sentences barely moved (Yang et al. 2019). No study measured patchwriting in real work |
| The forms match what was taught | **No.** Studies code two axes separately: how much is borrowed, as quotation, patchwriting, paraphrase or summary ([Jamieson & Howard, the Citation Project](https://www.academia.edu/1646133/Writing_from_Sources_Writing_from_Sentences), snippet only; academia.edu may ask a reader to sign in, so no reliably open copy was found), and how far the writer integrates sources or takes a position ([van Ockenburg et al. 2019](https://jowr.org/jowr/article/download/606/517/478), read in full; [Luna et al. 2023](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8749917/fullTextXML), read in part). *Own words* is on the second axis, the other four on the first. No study found separates précis from summary |
| Labelling the form of one's own text helps | **Not studied.** No controlled study found |
| Anything for public health trainees | **Not studied.** Their writing training is judged by publication counts; the documented failure is overclaiming: in 44.5% of observational-study articles the recommendation implies more causation than the result ([Haber et al. 2022, open preprint, doi:10.1101/2021.08.25.21262631](https://doi.org/10.1101/2021.08.25.21262631), read in full). No trial of training authors against it was found |

The practitioner, before the result: *"I think at least the forms will help guard against plagiarism."* Recorded as
said. The evidence supports something close to it for instruction and is silent on a writer labelling their own text.
One limit is plain without a study: a writer who patchwrites usually believes they paraphrased, so the label records
what they believe, and Fieldwork, which seldom holds the source text, cannot check it.

**So the status stays `asked`, with the gap stated,** as the closing condition provides. The search did not find the
idea wrong; it found it drawn on one axis where the evidence uses two. The options it sets out, none chosen:

- **Two coordinates** instead of one list: how much is borrowed, and reporting or own argument. Fieldwork's kind
  (quoted or authored) and function already carry part of each.
- **Précis merged into summary**, which every taxonomy found does; or kept, with no evidence either way.
- **Patchwriting named**, neutrally, as a form or a state a reviewer can set: the commonest borrowing problem in the
  descriptive data, about 16% of citations and half of first-year papers ([Jamieson & Howard, the Citation Project](https://www.academia.edu/1646133/Writing_from_Sources_Writing_from_Sentences), snippet only; academia.edu may ask a reader to sign in, so no reliably open copy was found), and the one a writer seldom sees in
  their own text.
- **Prompt a judgement rather than a tag** (*is this closer to the source's wording or to yours?*), and **fade the
  prompt** as a writer gains skill: prompts that ask for a judgement beat purely metacognitive ones ([Berthold et al. 2007](https://pub.uni-bielefeld.de/record/1989095), abstract only), and
  faded prompts beat permanent ones ([Nückles et al. 2010](https://link.springer.com/doi/10.1007/s11251-009-9106-9), abstract only), on school and journal-writing evidence.

**What would close it now** is the practitioner's choice among these, built and then measured as the three
measurements above describe. The field question stands unchanged.

## What this does not establish

That any of this improves anyone's writing. That five is the right number of forms, or that these are the right
five. That a writer chooses a form honestly. That the plain checks catch what matters, until measurement 3 is
taken. And whether a model asking questions would catch what they miss, which was considered and set aside on
2026-11-07 for the skills it would take over and for unreliability and invented citations; that stays an idea until
a check is measured to miss something a model would find.
