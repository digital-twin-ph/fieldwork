# Resizable workspace panels

_Created 2026-10-06 · Updated 2026-10-06_

Date: October 6, 2026. Status: implemented prototype.

## A76 Keep presentation preferences separate from workflow semantics

Desktop Fieldwork has three dividers: Node library width, Inspector width, and the vertical split between Workflow/N3 and Results. A small independent layout controller updates CSS sizes; React Flow responds to the canvas container size without rewriting node coordinates or automatically changing the user's zoom.

Sizes are browser-local preferences under `fieldwork.panel-layout.v1`, shared across worked examples. They do not enter the workflow, Undo history, N3 graphs, evidence receipts or exported workflow bundles. Resizing does not invalidate an analysis. Unavailable storage leaves resizing usable for the session; invalid stored values are ignored or clamped.

The layout reserves at least 360 pixels for the center, 150 for the library, 230 for the inspector, 180 for the canvas/evidence panel and 200 for results. Restored sizes adapt to smaller windows without overwriting the wider-window preference. The desktop studio retains its existing 720-pixel minimum height, so short screens may scroll. Result content can scroll within its panel, including spatial results that previously grew the whole page.

Dividers support pointer dragging, keyboard arrows (10 pixels, or 40 with Shift), Home/End limits, double-click to restore one default, and Escape to cancel an active drag. Separators expose their orientation, controlled panel and current size to assistive technology. Reset layout restores all defaults. Expanding Results hides the horizontal divider; returning to split view restores the chosen size. At 850 pixels or less the app uses its existing stacked layout and hides the dividers.

## Evaluation exercise

1. Widen the inspector to read evidence, then widen the library and verify the canvas stays usable.
2. Enlarge Results, switch to N3, expand Results and return to split view. Check that the chosen split is retained.
3. Reload offline and compare the sizes and analysis results. Reset the layout without changing the workflow.
4. Resize using only the keyboard. Test a narrow screen and return to desktop.

Browser regressions cover all three dividers, size persistence offline, workflow result preservation, keyboard limits, cancellation, reset, malformed preferences, unavailable storage and narrow-screen overflow. These tests establish runtime behavior, not practitioner usability or comprehensive assistive-technology certification.

Validation on October 6: the full local `npm run check` passed strict TypeScript checks, the production build, all 59 unit tests and all 38 Chromium scenarios. Desktop layout was also inspected visually. No Firefox/Safari or remote deployment validation was performed.
