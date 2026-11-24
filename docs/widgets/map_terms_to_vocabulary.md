# Map a column’s terms to a vocabulary

_Created 2026-11-24 · Updated 2026-11-24_

**A semantic operation.** It takes a table, and gives each term in a column you choose the Wikidata entity **you**
judged that term to name. The rows come out with a link that means something outside your workflow.

## What it does

Every term in a Fieldwork workflow is, until now, a string that means something only inside that workflow. "Kano"
in your table and "Kano" in somebody else's are the same six letters and nothing more. A Wikidata entity — `Q682571`
— is an identifier the rest of the world shares, so a reader of your receipt can follow it and see exactly which
thing you meant.

**You choose each link, one term at a time.** The step does not search and take the best answer, and the reason is
measured rather than cautious: on four terms taken from work in hand, Wikidata's own first result was the **wrong
one once in four**. Searching "Kano" returns the *city* first; a table of Nigerian local government areas means the
*state*, which comes fourth. Three of the four terms had a competing entity of a different kind in the top four — a
ward against the local government area containing it, a pathogen against the disease it causes.

A step that took the first hit would be quietly wrong about a quarter of your rows, in a column that then travels
into every receipt after it.

**A run asks Wikidata nothing.** The choosing happens in **Configure…**; what the step keeps is your decisions. So a
run is the same every time, needs no network, waits on nobody's server, and a workflow saved today gives the same
answer in five years. What it cannot do is notice that Wikidata has changed its mind — the date of each decision is
recorded so a reader knows how old it is.

## What you connect

| Port | What goes there |
| --- | --- |
| **Table** | any table. Run the workflow once first, so the step knows which terms it is being asked about |

## How to use it

1. Connect the table and run once.
2. In **Configure…**, choose the column whose terms you want linked.
3. Type what kind of thing the terms name — *state*, *district*, *disease* — in the filter box. This **reorders** the
   candidates and removes none, so narrowing can never hide the right entity.
4. Beside a term, choose **Look up**. Wikidata's candidates appear with the name and description it gives each one.
5. Choose the right one, or **None of these name it**.
6. **Apply**, then run. Each row gains a link in `<column>_wikidata`.

You can also add the bare identifier and the name Wikidata gives it as columns of their own.

## What it will not do

- **It will not choose for you.** That is the whole design, for the reason measured above.
- **It will not claim the row *is* that entity.** It records that you, on a date, judged this term to name it. The
  receipt says so, and says how many candidates you were choosing among — one of one is a different thing from one
  of ten.
- **It will not treat "none of these" as a failure.** A term you looked up and judged absent from Wikidata is a
  finding about the term. It is held apart from a term nobody has looked at yet, and the result says which is which.
- **It will not re-check.** Wikidata is edited by anyone. An entity you cite may later be merged, split or removed,
  and this step keeps what you decided rather than what is current.
- **It will not look anything up during a run.**

## What this does not establish

That Wikidata is right. It is edited by anyone, its coverage of African administrative units is uneven, and an
entity can disappear after you cite it. Nothing here measures what share of a country's units can be resolved at
all — that is a question about Wikidata, not about this step.

## How it was checked

Unit tested offline: the distinct terms you are asked about; a deliberate "none of these" held apart from a term
nobody looked up; the link column added, and refused where it would overwrite an existing one; Wikidata's answer
parsed with properties and id-less rows rejected; and the filter reordering candidates without removing any.

No parity check is owed. A parity check asks whether another implementation gets the same number from the same
input, and here the input *is* the answer: the judgement is yours and the arithmetic is a lookup.

---

*How this widget is built, what it assumes, and what has been measured about it:
[docs/widget-specs/map_terms_to_vocabulary.md](../widget-specs/map_terms_to_vocabulary.md).*
