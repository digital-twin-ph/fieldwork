# 217 · Each worked example retold in Python notebooks

_Created 2026-11-15 · Updated 2026-11-15_

**Status:** asked. Scheduled in TODO item 33, after the items above it. Nothing built.

## The question

Can each worked example be retold as a short series of Python notebooks? Each would go under the hood of the example's
workflows, so that a trainee who has run a workflow in Fieldwork sees the detailed process behind each step in code. Each
would also check the example's numbers independently.

The practitioner, 2026-11-15: *"Given the workflows developed for worked examples can we also emit the Jupyter Lite
Python versions of those? It would be an additional way to validate the example. Plus it could serve as an example
focused dive deeper set that actually has the computational narratives like the John Snow series of Jupyter notebooks
under GitHub PHI-Case-Studies."* Then, on a generator being proposed: *"This is not a generator problem but a set of
notebooks we sculpt down to prose. It boils down to two things. Validation and pedagogy. Going under the hood of the
workflows and beginning to understand the underlying detailed processes using Python code."*

## What exists

| Where | What it holds | What it does not |
| --- | --- | --- |
| validation-lab | 52 notebooks, almost all one widget against an independent library; 49 and 51 run MERS end to end | a narrative; a reader learning the example |
| dive-deeper | two notebooks teaching a method (mean centre, street network) | a worked example's question from start to finish |
| PHI-Case-Studies (the practitioner's and JLT's) | the 1854 cholera case study as two JupyterLite notebooks; Notebook 2 reviews the mean-centre equations, then turns them into Python; `tests/validate_notebooks.py` runs both and checks the values | Fieldwork; the other worked examples |

## Decided

- **Hand-written, not generated** (the practitioner, above). A notebook is written for its example, step by step, and
  sculpted down to prose.
- **Two purposes, one notebook**: pedagogy (the process under each step, in code) and validation (the example's numbers,
  computed independently).
- **In each example's own repository**, in `notebooks/`, beside the data and the Fieldwork project. The validation lab
  lists each notebook's closing check as an end-to-end check (the practitioner's choice, 2026-11-15).
- **The notebooks are notebooks; the prose is reviewed as Markdown first.** Corrected the same day: *"I did not mean for
  the notebooks to be markdown. Markdown is just for me to edit prose. But those eventually go in the notebooks."* The
  draft prose for each notebook is written in a Markdown file for the practitioner to edit; the edited prose then goes
  into the notebook's Markdown cells.
- **Prose drafted as Markdown, edited by the practitioner.** *"I can edit the prose if you write them as markdown."*
  The agreed exception to the rule that humans write the notes.

## The shape, taken from the John Snow series

1. The story first: the event, learning objectives, discussion questions.
2. Numbered steps, each ending in something a reader can see: a table, a curve, a map.
3. A method notebook: the equation, then the equation as Python, then the result beside the library's.
4. A setup cell that runs in JupyterLite (Pyodide) and in Binder.
5. A last cell setting the notebook's numbers beside Fieldwork's, within a stated tolerance, and a test that runs the
   notebooks headless and fails on any disagreement.

## Open

- **Where they are served.** Each example repository's own JupyterLite site, one site for all examples, or alongside
  the John Snow series in PHI-Case-Studies, which is the practitioner's and JLT's to decide.
- **Data that cannot sit beside a notebook.** NYC's counts are fetched by digest as Fieldwork does; Sierra Leone's file
  is in no repository; MERS stays in its own repository. Satellite and raster steps read a stored, pinned extract.
- **Independence.** A notebook reads the workflow's question (columns, values, settings) and the pinned files, never
  Fieldwork's code or results, until its last cell.

## Validation it commits to

- Oswego first: onset by hour (44 of 46 ill with a date and time, peak 10 at 1 AM), median 4 hours from the meal for 21,
  vanilla ice cream 43/54 against 3/21, risk ratio 5.57, each equal to Fieldwork's.
- The notebooks run top to bottom in JupyterLite in Chromium and headless in CPython, stated as two results.

## What a practitioner observation could show

Written before any notebook exists: whether a trainee who ran the Fieldwork workflow can, after the notebook, say what
the step did in their own words and find the same number by hand; and whether the notebooks read as the example retold
or as a second, unrelated exercise.

## What this does not establish

- That Fieldwork is correct beyond the numbers each notebook checks.
- That a notebook teaches; that needs the observation above.
- That Pyodide and CPython agree on every number; each environment's run is its own result.
