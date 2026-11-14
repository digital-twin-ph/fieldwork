# 173 · A manual for each worked example

_Created 2026-11-04 · Updated 2026-11-14_

**Status:** tried — the Manual tab and its detached panel, on the NYC example, Chromium. The playback dialog built 2026-11-13, with experiment 214.

## The task

The practitioner, 2026-11-04:

- *"I think worked examples should come with a Manual tab that lays out step by step how to build the workflows by
  hand. This should complement the Play Back Build for each workflow. We can try it out for NYC since it's the
  simplest."*
- *"The play back build can also be enhanced using the same content. For each step the content shows up as a dialog
  that has Close, Next, Previous buttons on it. So two different learning use cases."*
- *"The palette should also have a filter/search so users while building by hand and following the manual can zero in
  on the right widgets right away."*

Play back the build (experiment 112) reveals a workflow's nodes one at a time, in an order computed from the port
contracts. It shows what is added, not what is set or connected, and it says nothing in words.

## The design

**One file, three readers.** The example's repository publishes `manual.json`
(`fieldwork/worked-example-manual/1`), pinned by digest in `widgets/examples.json` like the project:

| Reader | What it does with the file |
| --- | --- |
| The Manual tab | Shows every workflow's steps, the open workflow first and marked |
| The from-scratch browser test | Performs every step, checking each label it names against the label on screen |
| Play back the build (designed) | Shows one step at a time in a dialog with Previous, Next and Close, the canvas holding the nodes added so far |

**Steps** are: add a widget, select a node, connect an output to a named input, press a control, fill or choose a
field, keep columns, declare a key, run, and what you should see. Notes between steps are prose and are not numbered.
A step names its field by the label on screen and, where it is not on the canvas, the tab it is on. Nodes are named by
a handle the manual gives them, because a node's id is minted when it is added.

**Authored and performed, not generated.** Generating steps from the saved workflow would need an on-screen label for
every parameter of every widget, which the Inspector does not keep in one place, and the wording of why a step is
there is the author's. Performing the authored file is what keeps it true: the NYC test is now the manual.

**The library search** (*Find a node…*, which already filtered by name and description) is named in every add step,
and the test adds each widget by typing its name there.

A manual that fails verification is not shown, and the project still opens: the steps guide the work and are not part
of it.

## Detached, beside a project of one's own (added 2026-11-04)

The practitioner, the same day: *"while we are in the worked example project there is no way to get to a blank canvas
other than add a workflow that will duplicate the one being built by hand. Can the manual be detached, become a
surface dialog so the user can create a new project? When the user decides to finish the activity he or she can close
the dialog. If user wants to resume user can go back to the manual tab and detach it again to resume."*

The tab belongs to the example's workflow, so it disappears exactly when the practitioner starts building. **Detach**
opens the manual as a panel that is not modal, can be dragged and resized, and is held on the device rather than by the
open workflow: a new project, a change of workflow or a reload keeps it, and only **Close** removes it. A step clicked
(or pressed with Enter) is done; progress is kept per manual digest, shown in the tab and the panel alike, and
detaching again scrolls to the first step not done. The panel is the base the playback dialog will build on.

## Reusing a node within the project (added 2026-11-04)

The practitioner: *"The duplication is specific to a widget if that widget gets used again in a different workflow in
the same project."* A manual step can say to add a node another workflow already holds, from the library's **From this
project** group, which shares its data and keeps its settings. NYC's second workflow does that; the third reads the
same file differently (wide), so it has its own table node and reads the device's copy of the file (experiment 170).

## Copy, not type; and which dialog (added 2026-11-04)

The practitioner: *"On the manual whenever there is an opportunity to copy and paste instead of typing we should offer
it for labels, titles, subjects, URLs like the Zenodo one."* Every value a step says to type carries a **Copy** button;
copying does not mark the step done. Where the clipboard is refused, the value is selected for the person to copy.

And: *"There's no need for Step 4 in the Manual because New Project already creates the project."* Checked against the
application before changing anything: every New project control opens a dialog, and the project exists only once
**Create project** is pressed, so the step stays. What changed is the wording: a step can name the dialog it is in, the
dialog is named where its steps begin, and the runner checks that the named dialog is the one open.

## Above a modal, not behind it (added 2026-11-04)

The practitioner: *"when the table input modal is visible the manual becomes blurred so picking the right file from the
long list of files in the zip becomes difficult without seeing the right file name to pick from the manual."* A modal
dialog makes everything outside itself blurred and unusable. While one is open the detached panel is moved inside it,
fixed where it was on screen, and moved back when the modal closes. Seen in the same screenshot: the manual named the
file by a shortened path while the dialog lists full paths, so NYC's manual now gives the path as the list shows it.

## Choice overload in the key columns (added 2026-11-04)

Following the manual, the practitioner met NYC's 92 key column checkboxes, all ticked, with five to keep: *"This is
choice overload"*, and *"I think the table column filtering should be another dialog."* A file with more than 12
columns now lists them in a dialog of its own, opened from a one-line summary, where the names to keep can be pasted --
which is what the manual's Copy gives -- and a file read long starts with nothing ticked. The manual's step became
paste and **Keep these**. Every test that builds a worked example by hand moved to the same dialog through one helper
(`tests/keep-columns.mjs`), and NYC's manual ran in 21 seconds instead of about 90, without a rebuild per untick.

## The playback dialog, built 2026-11-13

The practitioner chose it as the exercise for editing a table inline ([214](214-editing-a-table-inline.md)): *"The
playback dialog (173)"*. **Play back these steps**, on the Manual tab, opens a panel that is not modal: the open
workflow's steps one at a time in the manual's own words, with Previous, Next and Close, and the canvas holding the
nodes placed by that step. Nothing is changed; Close restores the canvas.

**The matching left open above is settled this way:** each handle is matched to a node of its widget type in the order
the workflow holds them, the n-th added of a type to the n-th of that type, as a build from an empty canvas adds them.
A handle with no node of its type left places nothing. A manual can now ask for an edit in Data quality (`edit`: the
step, the record, the column, the value), worded as a step and checked like the others.

**Not established:** that a workflow built in another order than its manual's places the right node for each handle.

## Validation

| Date | Check | Result |
| --- | --- | --- |
| 2026-11-04 | `tests/worked-example-manual.test.mjs` | 4 of 4: sentences, numbering around notes, refusals naming the step, NYC's manual readable |
| 2026-11-04 | `tests/manual-tab.browser.mjs`, Chromium | Passed: NYC opened from its pin, both files served by path and checked by digest, the tab shown, the open workflow first, the mark moving with the workflow; hidden on a blank canvas |
| 2026-11-04 | `tests/nyc-from-scratch.browser.mjs` performing `manual.json` against Zenodo, Chromium | Passed, every label the manual names equal to the label on screen |
| 2026-11-04 | `tests/manual-tab.browser.mjs`, detach and resume, Chromium | Passed: detached, two steps done by click and by keyboard, a new project made with the panel open and the library searched through it, the panel and its progress kept through a reload, closed, and on detaching again from the example opened at step 3 |

| 2026-11-04 | `tests/manual-tab.browser.mjs`, the import dialog open, Chromium | Passed: the panel inside the open dialog at the same position, Copy of the Zenodo URL working through it, back on the page after Escape |
| 2026-11-04 | `tests/column-dialog.browser.mjs`, Chromium | Passed: 20 columns start unticked behind a summary, paste with an unknown name reported, find, ticked only, untick all, a short file inline, the dialog gone with the import |
| 2026-11-04 | Nigeria, Oswego and Salmonella from-scratch tests through the column dialog, Chromium | 5 of 5 passed |

WebKit was not run locally; CI runs it.

## Practitioner observation, written before the result

Whether someone who has never opened Fieldwork can build the NYC smoke workflow from the Manual tab alone, and at
which step they stop. The automated run shows the steps are performable; it does not show they are understandable.

## What this does not establish

- That the manual teaches. It is performed by a test that already knows where every control is.
- That the wording stays true when the application changes wording: a changed label fails the test, but a changed
  meaning behind the same label does not.
- Manuals for the other examples. NYC is the first.
- Matching a manual's added nodes to a saved workflow's nodes for the playback dialog. By widget type and build order
  is exact when a workflow has one node of each type, as NYC's do; with two of a type it is an approximation.
