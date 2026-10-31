# 151 — Typesetting an equation a practitioner wrote

_Created 2026-10-30 · Updated 2026-10-30_

**Status:** validated — the dialect and the renderer, on both engines. The amendment of
2026-10-30 below is **tried**: three widgets machine their equations and the worked example
exercises them, which closes this record's own closing condition and opens a narrower one.

Asked by the practitioner on 2026-10-30: *"Let's do formatting and LaTeX."* The Notes Board
prototype's dialog carries a formatting toolbar, and
[141](141-organising-snows-notes.md) had already settled that an equation is carried as LaTeX —
*"these can be automatically constructed in LaTeX for automatic rendering as notes"*. Neither had
been built, and 141 recorded the toolbar as open rather than built precisely because it could not
be done without answering this.

## The question underneath both

A note's `text` is read in half a dozen places that have nothing to do with a screen: the word and
character counts, the contributions statement, the N3 receipt, and whatever assembles a report.
**A rich-text field would have made the stored value HTML and quietly broken every one of them.**

So the markup had to be plain text. Markdown is plain text — what is stored is what was typed, and
the formatting is a *reading* of it rather than a second format to keep in step. That answers the
toolbar: its buttons write markdown a person could have typed by hand, and nothing is stored that
a person could not have typed.

It does not answer the equation. `$$r = \frac{d}{p} \times 1000$$` is also plain text, and also
unreadable as prose.

## Three ways to put an equation on the screen

The first version of this table refused two of them for reasons that do not survive the
practitioner's reading of it on 2026-10-30. Both corrections are kept here, because the corrected
argument is narrower and truer than the one it replaces.

| | What it costs | Verdict |
| --- | --- | --- |
| **Show the LaTeX** | Nothing | **Not enough, for the reader rather than the author.** |
| **Hand-roll a TeX subset** | ~200 lines, no dependency | **Refused for an authored formula. Viable for a machined one.** |
| **A converter** | A dependency | **Taken.** |

**On showing the LaTeX.** The first version said a practitioner cannot check a formula they cannot
read. The practitioner: *"it's unreadable if we don't show the preview of what it would look like,
this is easy to do."* That is correct and it dissolves the reason as given — the preview was built
in the same pass, so an author writing `\frac{d}{p}` sees the fraction as they type it, and the
source being visible costs them nothing.

What survives is a claim about a different person. **A note is not a draft of the write-up; it is
the write-up.** The reader of the Results section is not the author and has no preview — they have
the card. Backslashes on that card are not a formula, they are the instructions for one. So the
rendering is owed to the reader, and the author's convenience was never the argument.

**On the hand-rolled subset.** The first version said a formula rendered wrongly in a publication
is worse than one not rendered, and that a hand-rolled parser fails silently on the input nobody
thought of. The practitioner: *"How can a formula be rendered wrongly in a publication if that
formula actually comes from the widget that did the computation? The provenance trail there is
direct, all the way to the authors who originated the equations."*

That is right, and it exposes two failure modes this experiment had run together:

| | Where the LaTeX comes from | Is the input set closed? |
| --- | --- | --- |
| **A machined equation** | The widget that did the arithmetic, from a template this project wrote | **Yes.** A fixed, enumerable set, testable one by one. |
| **An authored equation** | Somebody typing in the dialog | **No.** Arbitrary LaTeX, including everything nobody thought of. |

A hand-rolled subset over a closed set is tractable, and the parser could be proved against every
template it will ever meet. **The dependency is bought for the open set, not the closed one** —
for the equation a practitioner types, which is the case that arrived first because the dialog was
built before any widget machines an equation.

**And the correctness that matters for a machined equation is upstream of rendering entirely.**
A renderer can only be faithful to the LaTeX it is given. Whether that LaTeX states the equation
the source paper states is a different question, and the practitioner names the instrument for it:
*"We just need to validate that what came from the source papers is what got translated into code,
that's a computations audit."* No such audit exists. It is recorded in `TODO.md`, because it is
the thing that would actually secure an equation in a publication, and the converter chosen here
does nothing for it either way.

## Why Temml and not KaTeX or MathJax

Measured 2026-10-30 against the installed copies and the registry:

| | Temml 0.14.0 | KaTeX 0.19.1 | MathJax |
| --- | --- | --- | --- |
| Licence | MIT | MIT | Apache-2.0 |
| Unpacked | 2.2 MB | 4.0 MB | larger |
| **In the bundle here** | **212,541 bytes** (minified chunk) | ~280 KB plus CSS | ~ |
| Output | **MathML**, typeset by the browser | its own HTML and CSS | configurable |
| Fonts at run time | none required | **font files required** | varies |

**MathML is why.** The browser typesets it, so there is nothing to fetch when a formula is drawn
and no font files to ship — which is the whole difference for an application whose premise is that
it works with no network. KaTeX's output needs its own stylesheet and font files to look like
mathematics at all, and shipping those is a second decision with its own bytes.

Both Chromium and WebKit render MathML natively, which is checked by
`tests/notes-prose.browser.mjs` on both engines rather than assumed.

## What it costs, exactly

**212,541 bytes, loaded only where there is mathematics.** `app.js` measured **332,838 bytes**
before this work and **332,907** after, so the converter is not in it: it is a dynamic import, and
esbuild emits it as its own chunk.

The chunk **is** precached, like every other generated output. That is the opposite call from the
MapLibre renderer, which `build.mjs` excludes from the precache by name — and the reason is the
same rule applied honestly to two different cases. MapLibre can only work online, so precaching it
would make every practitioner download a megabyte that is useless in the one situation the
precache exists for. Mathematics is as useful offline as anything else here.

## What was built

`src/prose.ts` holds the dialect, and `tests/prose.test.mjs` asserts ten things about it.

**It is the manual's dialect.** `scripts/widget-manual.mjs` has compiled `docs/widgets/*.md` since
2026-10-14 with a small subset — escape first, then code, bold and links. A second markdown in the
same application would be a thing to learn twice, so the test asserts the two agree on every
construct both support. Where they differ, it is because a note is not a manual page:

- **No headings in a note.** A note sits inside an IMRaD section; a heading inside one is a second
  structure arguing with the first, and the write-up's outline is not the note's to set.
- **No tables in a note.** A table in a write-up is an artifact this application already makes,
  with its own provenance and its own receipt. Retyping one as prose would produce a table with
  none.
- **No raw HTML anywhere.** Escaping happens first and nothing is unescaped after, so a note that
  is exported, imported and rendered on another machine cannot carry script with it.

**Mathematics is lifted out before anything is escaped.** `<`, `>` and `&` are ordinary
mathematics. Escaping a formula and then handing the result to a TeX parser yields `\lt` where the
author wrote `<` — a defect nobody sees until it is in a publication.

**A formula that has not been typeset reads as its own LaTeX**, dollars and all, which is a true
account of what the note says rather than a blank where a formula should be. That is also what is
shown if the chunk never loads. A formula Temml refuses keeps its source and says why on the
element, because a formula that silently renders as nothing cannot be corrected by reading it.

**Markup is read only where it was written.** The two kinds a practitioner may edit — authored and
machined — are exactly the two whose asterisks and dollars are meant as markup. A quotation is
carried verbatim and a derived note restates what somebody typed into a widget, so neither is
reinterpreted.

## Validation

`tests/prose.test.mjs`, 10 unit checks, including agreement with the manual's compiler.
`tests/notes-prose.browser.mjs`, 5 checks on both Chromium and WebKit: a note written in markdown
is read as markdown and reopens as its source; a plain note gets no preview it does not need; the
toolbar writes markdown rather than formatting of its own; a formula is typeset to MathML on the
card and in the preview; and a formula that is not LaTeX keeps its source and says so. 46 passed
across the four notes suites on both engines.

## Amendment, 2026-10-30 — the first machined equations

The practitioner, hours after the renderer landed: *"The computation widgets, especially epi
widgets, should emit equations of their computations, with corresponding citations. And these
should show up on the Notes UI, under Methods."* And then, on scope: *"Using the South London
worked example, let's make the widgets used emit those equations."*

**This is this document's own closing condition, executed**, which is why it is an amendment and
not a new record. The first version of it was written as experiment 152 and folded back in on the
practitioner's reading: *"you could have combined 151 and 152."* Correct, and the argument is in
the corpus rather than in taste — 152 was the closing condition below, done the same day, and
[141](141-organising-snows-notes.md) exists precisely because this thread had already been spread
across four documents until a finding was rediscovered by someone who had written it himself.
141 remains the thread's home and its ownership table remains true: it owns the notes and the
report's apparatus, this document owns how an equation is set and now how one is produced.

### The three widgets South London actually uses

Read off the published bundle rather than chosen, because the practitioner scoped this to the
worked example:

| workflow | computation widgets |
| --- | --- |
| `south-london/mortality` | `rate` |
| `south-london/choropleth` | `rate` |
| `south-london/water-company` | `rate`, `rate_ratio` |
| `south-london/contingency` | `relate_table`, `group_table`, `derive_value`, `select_rows`, `two_by_two` |

So three widgets have an equation: `rate` (three nodes), `rate_ratio`, `two_by_two`. The four
table operations do not — a join and a total are operations on a table, not estimators, and giving
them a formula would dress a step as a computation. `relate_table` already machines a note and it
is prose about what the join did, which is the right thing for it to say.

**That makes these the second, third and fourth producers of a machined note**, which is the state
`relate-table.ts` wrote its type for on 2026-10-28: *"Defined here because `relate_table` is its
only producer. When there is a second, this type moves."* It had already moved. Nothing else about
it changed, as that comment predicted.

**Nothing new was needed**, which is the result worth recording about the sequencing. `prose.ts`
already lifts `$$…$$` out of a note and Temml typesets it, a machined note already targets a part
of a write-up and links the node that produced it, and `notesPanel` already renders a machined note
as markdown. The whole of the work was deciding what a computation should say.

### Both forms, and why the instantiated one is the point

141's probe of an MMWR issue found the genre prints the rate as plain inline text in a footnote and
gives the rate ratio's interval no formula at all, naming SAS instead. So a symbolic equation alone
restates a textbook; the same equation with this run's numbers substituted is what lets a reader
check the arithmetic without rerunning anything. Visible on the output — the two-by-two note prints

$$\mathrm{OR} = \frac{844 \times 19{,}115}{166{,}810 \times 18} = 5.37$$

which a reader with a calculator can check, and which no amount of symbolic notation would let
them. `tests/equations.test.mjs` asserts both forms are present rather than trusting it.

### The citations, and the two that are absent

**A citation is read off a source or it is absent.** That is `epiInfoLabel`'s rule in
`epi-estimate.ts` — *"IS READ OFF A SOURCE OR IT IS NULL. Never filled from memory: that is how a
wrong label enters a teaching context"* — applied to the second bibliographic field this project
has needed. Looked up and verified against the bibliographic record on 2026-10-30:

| method | used by | source |
| --- | --- | --- |
| **Katz log** | `two_by_two`, risk ratio | Katz D, Baptista J, Azen SP, Pike MC. Obtaining confidence intervals for the risk ratio in cohort studies. Biometrics. 1978;34(3):469-474. doi:10.2307/2530610 |
| **Wald log** | `two_by_two`, odds ratio | Woolf B. On estimating the relation between blood group and disease. Annals of Human Genetics. 1955;19(4):251-253. doi:10.1111/j.1469-1809.1955.tb01348.x |
| **Wald unpooled** | `two_by_two`, risk difference | **None read.** |
| **log-normal** | `rate_ratio` | **None read.** |

**The two absences are a finding rather than a gap to fill later.** The search for a primary source
for each found the construction stated identically in several implementations and attributed by
none: a Wald interval on a difference of two proportions, and a log-normal interval on a ratio of
two rates, are textbook arithmetic with no paper to point at. Naming a plausible textbook there
would be the professional-looking-and-wrong failure this project names, so the note prints the
absence: *"No primary source has been read for it."*

Printing it rather than omitting the line is the point. A missing reference reads as *nothing to
say*; what it means is *nobody has looked it up*, and those are two different claims — the
distinction `epiInfoLabelSource` was introduced for, arriving here independently.

**A gap refuses the whole citation.** [144](144-provenance-as-structured-data.md)'s
`renderCitation` is reused rather than a second renderer spelled, so a method reference missing a
field renders as nothing rather than as half a reference. A unit test walks every entry in
`METHOD_REFERENCES` and asserts it either renders completely or is null — an entry present and
unrenderable would print nothing and say nothing, which is the one outcome neither branch covers.
One adapter is recorded rather than hidden: `renderCitation` takes an `InputProvenance`, so the
module builds one and throws it away. **A paper a method comes from is not an input**, and nothing
files it as one.

### a, b, c, d, on a surface for the first time

The two-by-two note is written in the four letters, which is
[147](147-table-shells-begin-with-the-end-in-mind.md)'s settled vocabulary on the practitioner's
ruling: *"That's why labeling the 2x2 cells as a,b,c,d helps with the mapping to rate and ratio
computations."* 147 measured that `src/two-by-two.ts:144` already destructures to them and that
they reached no surface at all. They now reach one, and three measures written in one vocabulary
are three short formulas instead of three sets of long names.

**The cells are four bullets and not a table**, by this document's own rule above. The node already
draws the real table, with its own provenance and its own receipt. A unit test asserts no note
carries a table row or a heading.

### What reading it found that the tests did not

Three defects, all caught by printing the notes against Snow's numbers and reading them, none by
any assertion. The same lesson 141 recorded twice on 2026-10-30 — about its own drag gesture and
its own dialog — arriving a third time, in a third place, on the same day.

| What it printed | Why |
| --- | --- |
| `205.735 per 10{,}000 houses` | `{,}` is the separator TeX needs **inside** `$$` and is six characters of source in a sentence. Three places. |
| `$p_1$` in the risk-difference interval, never defined | The only formula that needs a symbol the cells do not supply. |
| A branch on `denominatorUnit === 'people'` | A worked example's vocabulary compiled into a widget — below. |

Each is now an assertion, and each assertion was mutation-checked by removing the fix and
confirming it fails. The separator test strips every `$…$` and `$$…$$` span and refuses `{,}` in
what is left, which is the general form rather than the three instances.

**The branch is the one worth keeping.** The practitioner, mid-build: *"Remember no hardcoding of
example-based content in the widgets."* The first version of the rate note read better for one
value of `denominatorUnit` by testing for it. That is not a worked example's *data* in a widget,
which is the obvious form of the mistake; it is its **vocabulary**, and the sentence would have
been subtly wrong for every unit nobody wrote the branch for, including `person-time` today. It
now names the declared unit and branches on nothing. Worth recording because the branch was
invisible as a defect: it produced correct output on the example it was read against, which is
exactly the condition under which example-shaped code gets committed.

### A note exists only after a run, and that is the first thing a reader meets

The practitioner, looking for the result: *"I do not see the equation in any note in the Notes UI
tab."* Then, after running: *"OK I see it now."*

Nothing was wrong, and the sequence is worth the lines anyway. A machined note comes from the last
run and not from the project — which is correct, and is asserted deliberately, because a note that
survived into the project would carry an equation whose numbers no longer match anything on the
canvas. But the consequence is that **the Methods section of a freshly opened investigation is
emptier than it will be**, and nothing on it says why. The author of the feature did not see this
because every test runs the workflow first. Whether an unrun workflow should say so on the Notes
tab is open, and is the same shape as the empty-`Results` question [149](149-the-notes-spike.md)
settled the other way: an absent Results section is a fact about a write-up, whereas an absent
Methods note is an artifact of not having pressed Run.

### What was built, and what it was checked with

`src/equations.ts`, and three lines in `core.ts`. The note is `Methods`, function `method`, with a
stable id of `${nodeId}:equation` so re-running rewrites the wording without moving what a link
points at. Each receipt also carries its note as `fw:machinedNote`, which `relate_table` has done
since 0.3.0 and three more producers that did not would have left one widget's write-up prose in
the graph and three widgets' outside it. No ontology term was coined.

`tests/equations.test.mjs`, **13 unit checks**: the section, function and stable id; that both
forms are present; that the figures this repository already reports come out of the notes — 3.109
per 1,000, 8.40, 5.35, 5.37, 0.004093; that a rate with no value machines no note at all; that
every method reference renders completely or is null; that a column name with an underscore is
escaped rather than read as a subscript; that no note carries a table or a heading; that the TeX
separator never reaches prose; and that every note survives `toHTML` with its math marked and
nothing unescaped.

`tests/equation-notes.browser.mjs`, **5 checks on Chromium and WebKit** over the published South
London bundle: a two-by-two machines its equations into Methods and they are typeset to MathML with
no formula refused; the cells are stated as a, b, c, d with what each counts; a cited method prints
its source and an uncited one says so; a rate machines its equation and cites nothing because it
estimates nothing; and a machined note is correctly absent after a reload.

**10 passed** across both engines. The sibling notes suites and `derived-2x2` were re-run against
the changed fixture: **48 passed**, both engines; the affected regression suites, **36 passed**.
Full unit suite: **1,125 passed**. Mutation-checked — removing the TeX escaping fails 1 of 13,
printing the separator in prose fails 3, dropping the uncited sentence fails 1, and removing the
`two_by_two` wiring from `core.ts` fails 4 of 5 browser checks.

Released as `rate` 0.3.0, `rate_ratio` 0.2.0 and `two_by_two` 0.2.0, application 0.13.0.

## What this does not establish

~~**That an equation is ever constructed automatically.**~~ **Answered by the amendment of
2026-10-30**: `rate`, `rate_ratio` and `two_by_two` construct theirs, nine of them on one canvas,
each from values the widget already held. The original entry read: *"141's claim is that FW's
computations can build their own equations and nothing here builds one. What exists is a place to
put one and a renderer that will draw it."* That stopped being true the same day it was written.

**That the 212KB is earned.** Closer, and not established. This record said the first machined
equation is what would make the converter worth its bytes rather than merely correct, and there
are now nine. Whether that is worth 212KB to somebody who is not its author is the same unanswered
question one rung up, and `scripts/widget-evidence.mjs` still prints its top rung empty.

**That the equations state what their sources state.** A renderer is faithful to the LaTeX it is
given, and every formula machined by the amendment below was read off the implementation beside
it. So each note states what this application computes, which is not the claim that it states what
Katz computes. The practitioner named the instrument and `TODO.md` carries it; nothing here moves
it an inch, and a reader of a note could easily believe it does — which is why the module, the
manual page and the release note each say so in place.

**That any of these equations should be computed at all.** 147 records that `case-control`,
`cohort` and `cross-sectional` appear nowhere in `two-by-two.ts`, `epi-estimate.ts` or
`rate-ratio.ts`. A machined equation makes a wrong measure *more* legible, not less: the formula
for a risk ratio on a case-control table is correctly printed and the quantity is not estimable.
Typesetting it is arguably worse than printing a bare number, because it looks more like a paper.

**That the dialect is enough for a write-up** — and this is the expected state rather than a gap
to apologise for. It was chosen from what a note needs as judged here, not from a corpus, and no
practitioner has written a paper in it. There is no corpus to have chosen from, because the surface
that would produce one was built today.

The practitioner, on reading that sentence as it was first written: *"This is a DE project, and its
job is to hold the tension between the chicken and the egg. It takes time for the egg to become a
chicken, and for the chicken to lay the egg."* Recorded because the first version read as a defect
confessed, and what it describes is emergence working: a surface has to exist before anybody can
write on it, and what they then write is what tells us whether the dialect was right. The entry
stays on this list — it is genuinely unestablished — but it is waiting rather than failing, and
the thing it waits for is a paper, not a correction.

**That MathML renders identically across engines.** Both render it; the tests assert the elements
are produced, not that the two look the same. A figure in a publication would need that checked,
and nothing here has.

**That the preview is the right surface.** It appears only once there is markup to read, which is a
guess about when somebody wants it.

## What would close it

~~Build the first machined equation — the rate widget is the obvious one, since
`deaths / population × 1000` is already computed and already described in prose by a machined note.
If the equation can be constructed from the same values the sentence is, without a second
declaration, then 141's claim holds and the renderer is earning its place. If it needs its own
declaration beside the computation, that is a finding about how much a widget knows about its own
arithmetic.~~

**Done 2026-10-30, and the test came out the first way.** Every equation is constructed from the
values the widget already holds — `RateResult`, `RateRatioResult`, `TwoByTwoResult` — and not one
of the three needed a declaration of its own. 141's claim holds for these three. What it cost was
one module and three lines in `core.ts`, which is the measurement that claim was waiting for.

**What remains, in the order it is worth doing:**

1. **The computations audit.** Each implemented formula against the source it claims, read off the
   paper the way the Breslow-Day research note was. It is the only item here that changes what a
   published equation is worth, and it is in `TODO.md`.
2. **Gate the measures on a declared study design** ([147](147-table-shells-begin-with-the-end-in-mind.md),
   item 6). A typeset formula for a quantity the design cannot estimate is the failure this work
   makes prettier.
3. **Show it to the epidemiology colleagues**, now 2026-11-06, and find out whether nine formulas
   in one Methods note is what they would want in a paper or three times too much.
4. **A manual page for `rate`**, which has none and is now one of three widgets machining an
   equation.
5. **Decide whether an unrun workflow should say so on the Notes tab**, per the amendment above.
