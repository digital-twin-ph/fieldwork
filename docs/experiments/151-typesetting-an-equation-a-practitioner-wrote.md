# 151 — Typesetting an equation a practitioner wrote

_Created 2026-10-30 · Updated 2026-10-30_

**Status:** validated

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

## What this does not establish

**That an equation is ever constructed automatically.** 141's claim is that FW's computations can
build their own equations — *"all of our computations have equations"* — and nothing here builds
one. What exists is a place to put one and a renderer that will draw it. The first machined
equation is still unwritten, and it is the thing that would make this worth the 212KB rather than
merely correct.

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

Build the first machined equation — the rate widget is the obvious one, since
`deaths / population × 1000` is already computed and already described in prose by a machined note.
If the equation can be constructed from the same values the sentence is, without a second
declaration, then 141's claim holds and the renderer is earning its place. If it needs its own
declaration beside the computation, that is a finding about how much a widget knows about its own
arithmetic.
