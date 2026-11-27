# Audit — worked examples as teaching material

_Created 2026-11-27 · Updated 2026-11-27_

The practitioner, 2026-11-27: *"While we are at standardizing, let's develop worked example standards or enhance what
we have developed already to optimize the pedagogical value of worked examples. For example, we already have manual
walkthroughs of some worked examples. We have play back the workflow build."* This audit records what each worked
example offers a learner today, read from the repositories and the code. Nothing was changed for it. The standard
itself is for the practitioner to set; TODO carries the work.

## What a worked example can offer a learner today

| Surface | What it is | Where it comes from |
| --- | --- | --- |
| **The project** | The example's workflows, opened in Fieldwork from its repository | the repository's `fieldwork-project.json.gz`, pinned in `widgets/examples.json` |
| **The manual walkthrough** | How to build each workflow by hand, step by step, ticked off as you go; detachable beside the canvas | the repository's `manual.json` (experiment 173) |
| **The manual's playback** | The manual's steps played on the canvas in its own words, the nodes placed so far shown | `manual.json`; only where one exists |
| **Play back the build** | Any workflow's construction replayed node by node | every workflow (experiment 112) |
| **Show me how** | A widget's own walkthrough, shown on its data (Table, Relate, the spatial steps) | per widget, not per example |
| **The widget manual** | Each widget's page, with its History | `docs/widgets/` |
| **The README** | The question, the data, what was checked and what it does not establish | the repository |
| **The validation lab's check** | The example's numbers worked again outside Fieldwork | validation-lab, where a check exists |

## Findings

1. **Five of the twelve catalogue examples have a manual walkthrough**, and so a manual playback: NYC asthma and ozone,
   Brazil dengue, workflows and rulesets, Sierra Leone measles, Philippine sea-level rise. South London 1854, Oswego,
   Nigeria immunization, Salmonella, MERS, population models and syndromic surveillance have none. The built-in Snow
   and Hagelloch examples, the eleven a new user meets first, have none either: a manual comes from a catalogue
   repository.
2. **Play back the build works on every workflow**, but replays nodes without saying why each comes next; the manual's
   playback says why, and exists only where the manual does.
3. **The READMEs share no outline.** Section counts run from none (MERS) to ten (Nigeria). Seven say what the example
   does not establish under that or a similar heading; five set the app's numbers against what the source reports;
   some open with the questions the workflows answer, others with the files.
   - With the questions first: Salmonella, Brazil dengue, Nigeria, NYC.
   - Checked against the published figures: London ozone, Salmonella, NYC, workflows and rulesets (worked by hand),
     population models.
4. **Two repositories carry no project bundle** (London ozone 2002, DR Congo Ebola) and are not in the catalogue.
5. **No example states what a learner should be able to do after it**, or which widgets it teaches. `widgets/examples.json`
   records which widgets each uses (`uses`), not what it teaches.
6. **Teaching material lives in several places, unconnected**: the manual, the README, Show me how, the widget manual,
   the lab's check, Dive Deeper (deferred), the proposed challenges, experiment 233's training mission. An example does
   not point a learner from one to the next.

**Measure, today:** catalogue examples with a manual walkthrough, 5 of 12; built-in examples with one, 0 of 11;
READMEs with a "does not establish" section, 7 of 14 repositories.

## For the practitioner to settle

What every worked example must carry, and in what order a learner meets it. Candidates, from what exists:

- the question it answers and what a learner can do after it, first;
- a manual walkthrough for each workflow, so the manual's playback is everywhere;
- a README to one outline: the question, the data and its source, the workflows, the answers checked against the
  source, what it does not establish, licence and credit;
- the widgets it teaches, linked to their manual pages and Show me how;
- where its numbers are checked again (the lab), and what to try next.

Whether the built-in examples get manuals, which would mean carrying a manual outside a catalogue repository, is a
design question for the same decision.

## What this does not establish

That any of these surfaces teaches: they are counted, not observed with learners. Which order a learner should meet
them in is not known from this inventory. The counts are the repositories on this machine at 2026-11-27.
