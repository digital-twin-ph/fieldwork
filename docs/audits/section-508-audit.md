# Section 508 audit

_Created 2026-11-16 · Updated 2026-11-16_

**Status:** in progress. The automated floor measured, widened to every widget's Inspector and its dialogs, and in the gate, with no violation left, 2026-11-16; the canvas operable by keyboard; the other checks by hand not begun. An audit, not an experiment (the
practitioner, 2026-11-16: *"It should not be an experiment but an audit"*): it checks the application against a
standard it must meet.

## The question

The practitioner, 2026-11-16: *"Since we now also have an almost full blown prototype we need to ensure 508
compliance."* Section 508 of the Rehabilitation Act applies to the information and communication technology a US
federal agency develops, procures or uses. Its standards, revised in 2017, incorporate **WCAG 2.0 Level A and AA**
for web content, and apply them to electronic documents as well: here, the PDFs a product is printed to.

Does Fieldwork conform, where does it not, and what would it take?

## What exists

| | Where |
| --- | --- |
| Contrast measured against WCAG 2.1, both themes | [46](../experiments/46-colour-theme.md); `tests/contrast.browser.mjs`, `toast-contrast`, `disabled-button-contrast`, `map-controls-contrast` |
| A standing rule for low vision: at least 14 px text, AA contrast | the practitioner's rule, applied to every surface touched |
| Accessible names and roles used by 57 browser tests | `tests/*.browser.mjs` |
| WCAG's structure, as research | [WCAG as an ontology](../research/wcag-as-ontology.md) |
| **Not done:** a screen-reader pass, zoom and reflow, the PDFs, a conformance report | |

## Where it is most likely to fail, written before looking

| Area | WCAG 2.0 criterion | Why it is at risk |
| --- | --- | --- |
| The workflow canvas: adding, connecting and moving nodes | 2.1.1 Keyboard | Built for a pointer; connecting two ports by keyboard alone is unproven |
| Notes moved between sections by dragging | 2.1.1 Keyboard | Drag and drop; a keyboard path may not exist |
| Maps and charts | 1.1.1 Non-text content; 1.4.1 Use of colour | A choropleth tells its classes by colour; a figure's text alternative is its caption, which may not be enough |
| The 15-minute lock of identity and credentials | 2.2.1 Timing adjustable | Locks without warning; nothing is lost, but the person must open the file again |
| Dialogs and tabs | 2.4.3 Focus order; 4.1.2 Name, role, value | Many dialogs, some built by hand; focus on open and close is unchecked across them |
| The PDFs of a product | Section 508's rule for documents | Printed by the browser; whether the PDF is tagged depends on the browser |
| Status messages (toasts, results said under a button) | 4.1.3 Status messages is WCAG 2.1, not 2.0, so outside 508's floor; checked anyway | Spoken or not depends on live regions |

## The method

1. **An automated scan** of every surface: each tab, each dialog, each widget's Inspector, a worked example opened,
   both themes, with the axe-core engine through Playwright, in the gate. Automated tools find perhaps a third of the
   issues; this is the floor, not the audit.
2. **By hand**, following the structure of the federal **Trusted Tester** process (DHS), which is how agencies test
   for 508: keyboard only through the main tasks (make a project, build and run a workflow, write a note, draft a
   product, make an identity); VoiceOver on macOS through the same; zoom to 200% and a 320-pixel-wide window; focus
   always visible.
3. **The documents**: a product printed to PDF in Chrome and in Safari, checked for tags and reading order.
4. **A conformance report** in the form agencies use, the Accessibility Conformance Report (the VPAT's 508 edition):
   each criterion, supports, partially supports or does not support, with the evidence.

**Decided, 2026-11-16:** the testing follows the **Trusted Tester** method, each test recorded as pass or fail with
no partial credit (the practitioner: *"Agree with Trusted Tester Method"*). Both reporting forms hold Fieldwork to the
same standard, the Revised 508 Standards, which is WCAG 2.0 A and AA. The VPAT 508 edition is a self-report that
allows *partially supports*; an agency checklist is usually pass or fail per test, and so stricter in practice. Pass
or fail per test meets either. Which form CDC accepts is a question for CDC's Section 508 coordinator, not yet asked.

**The observation that can come out badly:** whether the canvas, the heart of the application, can be operated by
keyboard at all, or needs a second way to build a workflow.

## The automated floor, 2026-11-16

axe-core 4.14.1 through `@axe-core/playwright` 4.14.0 (installed with the practitioner's yes), WCAG 2.0 A and AA tags,
`tests/a11y-scan.browser.mjs`. Surfaces: the seven views, the New project
and Worked examples tabs, and the Help, Identity and Credentials dialogs, on Snow's isochrone example, light and dark.

| Rule (criterion) | First scan | Cause | Now |
| --- | --- | --- | --- |
| aria-allowed-attr (4.1.2) | 84 elements, 14 surfaces | The view tabs carried `aria-selected` without being tabs | **Fixed**: `role="tablist"` and `role="tab"` |
| color-contrast (1.4.3) | 319 elements, 12 surfaces | Text faded by opacity: the library while a run is in flight (2.78:1), library entries nothing feeds yet, empty Notes sections, note numbers; and two light-theme colours, danger `#a27a66` (3.8:1) and warning `#a08e72` (2.97:1) | **Fixed**: no text faded; the library **disabled** during a run (it had still taken Enter); entries not fed yet marked by a dashed outline, a faded icon and words for screen readers; danger `#93503a` (6.1:1), warning `#76643f` (5.7:1) |
| nested-interactive (4.1.2) | 4 elements, Notes | Map figures in Notes kept the live map's focusable marks | **Fixed**: a figure keeps no focusable marks or links |
| aria-prohibited-attr (4.1.2) | 36 elements, the canvas | Canvas ports carry labels without a role | **Fixed**: ports hidden from assistive technology; a port is connected in the Inspector's list, which names it |

After the fixes: Chromium and WebKit, one rule left, the canvas's. Checked: the browser tests most exposed to the
changes (library additions, figures, maps): 321 passed, Chromium. Found on the way: the footer's *"Exploratory
research / v0.2"*, unchanged since the first commit and contradicting the version in the header, was removed.

## The canvas by keyboard, 2026-11-16

The practitioner: *"The keyboard tab does not seem to work on widgets"*, and, earlier, that Enter on a widget of
Hagelloch took them to React Flow's website. Measured on Hagelloch before the fix:

| Found | Fix |
| --- | --- |
| 89 Tab presses from the top of the page to the first widget (2.4.1) | Skip links, *Skip to the canvas* and *Skip to the Inspector*, the first two Tab stops |
| A widget reached by Tab showed no focus ring: React Flow's stylesheet sets `outline:none` and loads after Fieldwork's (2.4.7) | A 3 px ring, specific enough to win |
| Focus on a widget did not select it, so the Inspector showed something else | Focus by keyboard selects the widget |
| One Tab from a widget reached React Flow's attribution link, the way off to their website | The link hidden; React Flow credited in Help |

`tests/keyboard-only.browser.mjs`, Chromium and WebKit: a workflow built, connected, rearranged and run with no
pointer, and the four fixes above. **Safari's rule**: Tab there skips buttons and links unless Option is held or
*Press Tab to highlight each item* is on; this is Safari's setting, not Fieldwork's, and the Help dialog says so.

## The scan widened, and in the gate, 2026-11-16

Added: in six worked examples (Snow's isochrone in both themes; Hagelloch; Snow's Voronoi; Snow's epidemic curve;
Hagelloch's clusters; Oswego), each widget's Inspector, each dialog an Inspector button opens (buttons that change or
remove work are not pressed), and the Results; the note dialog in a project of the practitioner's own, both themes.
The test fails on any violation.

| Rule (criterion) | Where | Fix |
| --- | --- | --- |
| color-contrast (1.4.3) | the note dialog's explanation, 3.62:1, faded by opacity | the muted colour, no opacity |
| scrollable-region-focusable (2.1.1) | the records table and JSON in the Inspector, the data-quality dialog, the table viewer | each a named region in the Tab order |
| nested-interactive (4.1.2) | the chart and the map: marked as images, holding focusable parts | the chart a figure, the map a group |
| summary-name (4.1.2) | Vega's actions menu, an icon alone | named *Chart actions* |

After the fixes: no violations, Chromium and WebKit, 8 scan tests. Tests that had asserted the old markup (the
outputs' tabs, a port's label, the Inspector's id) were updated; 189 of the browser tests touching the changed markup
passed on Chromium, and the four updated ones on both engines but `outputs.browser.mjs` on WebKit, which fails on
OpenStreetMap tiles refused to WebKit from this machine, and fails the same way on 0.130.0.

## What it does not establish

Anything yet. An automated scan finding nothing would not establish conformance; only the full method would, and
the agency's own 508 review decides.
