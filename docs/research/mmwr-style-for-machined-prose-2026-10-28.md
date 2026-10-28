# MMWR style, for prose this application machines

_Created 2026-10-28 · Updated 2026-10-28_

**Status:** a probe, in two parts. Twelve titles were read and the convention below is what they
share. The plain-language half is thinner: MMWR's own rules could not be retrieved, and what is
recorded is the measurement of our machined note against the criteria that could be. Nothing about
EIS presentations specifically was verified — see the limits at the end.

## Why this was looked up

The practitioner, 2026-10-28: *"If you look at Epidemic Intelligence Service Conference
presentations, you will learn a lot from how titles are constructed."* Said while the machined title
was being designed, and the point of looking was to find the template rather than invent one.

## The corpus

Twelve article titles read verbatim from the MMWR current issue index on 2026-10-28
(<https://www.cdc.gov/mmwr/index.html>). EIS presentations follow MMWR house style and many become
MMWR reports, which is why this is the nearest retrievable corpus.

| Title | Suffix |
| --- | --- |
| Measles Outbreak | — New Mexico, 2025 |
| Tetanus Surveillance | — United States, 2009–2023 |
| Acute Kidney Injury Among Patients with Drug Overdose–Involved Hospitalizations | — United States, 2016–2025 |
| Notes from the Field: Dengue Outbreak | — U.S. Virgin Islands, January 2024–June 2025 |
| Cardiovascular Health Among High School Students | — Youth Risk Behavior Survey, United States, 2025 |
| Dietary and Physical Activity Behaviors Among High School Students | — Youth Risk Behavior Survey, United States, 2025 |
| Overview and Methods for the Youth Risk Behavior Surveillance System | — United States, 2025 |
| QuickStats: Age-Adjusted Female Breast Cancer Death Rates, by State | — United States, 2024 |

## The convention

    [report-type prefix:] <outcome> Among <population> [by <exposure>] — [named instrument,] <place>, <time>

- **The topic names the subject and the population**, not the coordinates: *Among Patients with Drug
  Overdose–Involved Hospitalizations*, *Among High School Students*, *in Children Aged 6 Months–6
  Years*, *Among Solid Organ Transplant Recipients*. Title case.
- **Em dash**, then the coordinates. Every one of the twelve has it.
- **Place** then **time**, and the TIME'S GRANULARITY carries information: `2025`, `2016–2025`,
  `January 2024–June 2025`. A month-level range says the window was short and specific.
- **Report-type prefix** where the piece is a short form: `Notes from the Field:`, `QuickStats:`.
- **A named instrument** in the coordinates, in two of the twelve, and only where the data source
  has a proper name: `Youth Risk Behavior Survey`. Not a general "where the data came from" slot.

## The two findings that matter for Fieldwork

### No title states a finding, and that is why a title can be machined

*"Measles Outbreak — New Mexico, 2025"* does not say how large it was or what it was linked to.
*"Tetanus Surveillance — United States, 2009–2023"* does not say the trend. The first title names the
association EXAMINED — acute kidney injury among overdose-involved hospitalizations — and not the
result.

So the convention forbids a claim in the title, and assembling one therefore requires no judgement.
This is the mechanical reason a title is the one part of the front matter an application can produce:
not that titles are short, but that **this** convention is claim-free. A title convention built for
persuasion could not be machined without the application asserting a conclusion.

It follows that these titles are built for RETRIEVAL — what, in whom, where, when — which is also
why the em dash is there: it marks the coordinates off from the subject.

### The design appears only when the design is the subject

An earlier version of this probe said none of the twelve names a study design. That was wrong on its
own terms. *"Tetanus Surveillance — United States, 2009–2023"* names one — surveillance is a design
in the taxonomy of `fieldwork-study-designs-v1.1.md` — and so does *"Overview and Methods for the
Youth Risk Behavior Surveillance System"*.

The rule is narrower and more useful: **the design appears in the title when the design is what is
being reported**, and not when an analysis merely uses one. For an outbreak investigation the
subject is the health event and the design stays in Methods, which is where the practitioner put it.

So a machined title carries the outcome, the population, the place and the time, and names the
design only where the report is about the design. The design declaration still feeds the title —
through its **period**, which is the title's `<time>`:

| Title component | Comes from |
| --- | --- |
| outcome | what the computations measure |
| population | the denominator — `rate`'s `denominatorUnit` is people, houses or households |
| exposure | the column a `two_by_two` or a grouped `rate` stratifies by |
| place | the study area where one exists, else `Project.subject` |
| time | **the study period, which belongs to the study design**, at its own granularity |
| named instrument | only where the source has a proper name, which is rare |

South London machines as **"Cholera Mortality by Water Supply — South London, 1854"**.

An earlier version of this probe proposed *"— Snow's Tables VIII and XII, South London, 1854"*,
putting the source in the coordinates. That was a misreading: the instrument slot is filled in two
of twelve titles and in both it holds a named surveillance instrument. A table in a book is not one,
so the slot stays empty here.

## What this does not establish

- **Nothing about EIS presentations directly.** The 2009 EIS conference PDF returns 404 and the CDC
  Stacks copy did not respond within 300 seconds. This is MMWR house style, which EIS follows, not
  EIS abstracts read first-hand. The practitioner's pointer has not actually been followed to its
  source.
- **Twelve titles from one journal.** MMWR is surveillance- and field-report-oriented. A
  design-naming title would be unremarkable in a methods-oriented journal, so the narrower rule
  above — the design appears when the design is the subject — is induced from twelve titles in one
  venue and not established generally.
- **That the claim-free reading generalises.** It is the most load-bearing observation here, since it
  is the reason a title is machinable at all, and it rests on twelve titles from a journal whose
  house style is deliberately plain. A venue that rewards a finding in the title would break it.
- **No rule was found in writing.** The MMWR instructions for authors and the author checklist
  cover publication criteria and plain language, not title structure; the checklist says to read
  recent reports for format, which is what was done. So the convention above is induced from
  examples, not quoted from a style guide.
- **Capitalization and dash type were not checked systematically.** The titles use an em dash
  between topic and suffix and an en dash inside ranges and compounds; one sample is not a rule.

## Plain language, and the machined note measured against it

The practitioner, 2026-10-28: *"The MMWR plain language guidance would be worth incorporating."*

**What could not be retrieved.** The archived MMWR instructions for authors returns an empty body
through this fetcher, and searching turned up CDC-adjacent guidance rather than MMWR's own style
section. So the rules below are CDC and biomedical-journal practice, not quoted MMWR policy:

- CDC maintains a **Persons-First Language** page and a **Preferred Terms for Select Population
  Groups and Communities** resource, and its clear-writing tip advises engaging the community to
  learn what language it prefers.
- Person-first is the general preference in biomedical journals, with documented exceptions — the
  Deaf community among them — so the preference is asked rather than assumed.
- Avoid words that imply tragedy or evoke pity: *afflicted with*, *suffers from*, *victim of*.

**The useful part is measuring what we already machine.** The Methods note `relate_table` emits
today, printed from the real data:

> supplier was brought from the published boundaries onto the rows of Table VIII, matched on
> sub_district, comparing keys exactly, after trimming. 23 sub_district values appeared in both
> tables, 9 only in Table VIII, 9 only in the published boundaries. The rows whose sub_district was
> absent from the published boundaries were excluded (the boundary file spells nine of these without
> their comma).

It fails plain language in four distinct ways, and they are worth separating because they have
different fixes:

| What is wrong | Example | Fix |
| --- | --- | --- |
| **Machine identifiers as prose** | `sub_district`, `supplier` | use the declared display name |
| **Passive voice throughout** | "was brought", "were excluded", "appeared" | write the sentence actively |
| **Database vocabulary, not epidemiology** | "brought onto the rows of", "matched on" | say what was assigned to what |
| **Implementation detail a reader cannot act on** | "comparing keys exactly, after trimming" | drop it; it belongs in the receipt |

What it should read like:

> We assigned each sub-district its water supply company by matching sub-district names. Of 32
> sub-districts, 23 matched; the 9 that did not were excluded, leaving 332,266 of 486,936 residents
> (68.2%).

Shorter, active, in the reader's units, and with no identifier or implementation detail in it. The
counts and shares are unchanged — this is a presentation failure, not an arithmetic one.

**And the first fix is already available and unused.** The table import can already rename a column
on the way in — `measureNames`, offered as *"Name for the column holding the variable names"* — so a
practitioner can declare that `deaths_seven_weeks` is "deaths". The machined note ignores those
declarations and prints the raw identifier. Where no display name has been declared, the honest
behaviour is for the note to say so rather than quietly print an identifier into a paper.

So "incorporate plain language" is not a copy-editing pass over a template. It needs the input to
carry human names for its columns, which is a capability this application has and the note does not
read.

## What the plain-language half does not establish

- **That these are MMWR's rules.** They are CDC and biomedical-journal practice gathered from
  secondary sources. MMWR's own style section was not read, and the one archived page that should
  carry it could not be retrieved.
- **That the rewrite above is what an epidemiologist would write.** It is one hand-written
  alternative, not a tested one, and nobody in the audience has seen either version.
- **That a machined sentence should be active.** Methods sections in practice use the passive
  heavily — *"participants were recruited"* — so "write it actively" may be a plain-language rule
  that this particular genre does not want.
