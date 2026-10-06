# Canvas colors and persistent project controls

Date: October 5, 2026. The user requested blue input ports, red output ports, gray input nodes, orange processing nodes and green output nodes. The canvas now uses these colors to make direction and role easier to distinguish.

## A37 Separate node role from port direction

Source nodes have a light gray fill, spatial operations and reasoning nodes have a light orange fill, and visual output nodes have a light green fill. Source nodes can still accept parameters or a study boundary: their role is determined by their Sources group. Intermediate summaries remain processing nodes. Only the Outputs group receives the output shading.

Input connectors are blue on the left; output connectors are red on the right, including the expandable point-layer connectors. Hover and valid-connection feedback retain each port's direction color and add a larger ring. Red denotes output direction, not an error. Existing node titles, group labels, port labels and accessible names remain available so color is not the sole cue.

This is presentation metadata in the React Flow renderer and stylesheet. Workflow types, compatible connections, saved graphs and N3 semantics retain their existing contracts. The offline asset cache version advances so updated bundles can be installed.

## Developmental evaluation

Observe whether practitioners can identify a source, a computation and a result, then connect a red output to a compatible blue input without assistance. Also check whether red is mistaken for an error. Implementation checks and a rendered screenshot establish the colors displayed; they do not establish usability or accessibility effectiveness.

Chromium verification checks computed fill colors for all three node roles and both port directions in the map integration scenario. A separate browser inspection verified that hover and valid-connection feedback retain port colors, and `test-results/canvas-port-node-colors.png` was visually inspected. The map integration scenario passed, including multiple layers, drag connections, persistence and offline reopening.

## A39 Keep project controls available while scrolling

The user requested that the project title and Import, Export and Run workflow section remain visible. The project bar now sticks to the top of the viewport once reached while scrolling. Its opaque background and subtle shadow distinguish it from underlying content. The existing responsive layout is retained, including title and description on smaller screens.

A ResizeObserver updates the document's scroll padding to the rendered bar height, allowing browser scroll-to-control and keyboard navigation to account for wrapped titles and viewport changes. The bar stays in normal document flow before becoming sticky. Modal editors remain above it in the browser's dialog layer.

`tests/floating-controls.browser.mjs` scrolls desktop and mobile layouts to the bottom and checks that the entire project bar, title and all three actions remain in the viewport at top position zero. This confirms persistence of the controls, not practitioner effectiveness.

Validation on October 5, 2026: `npm run check` passed the build, all 33 unit tests and all 21 Chromium scenarios in one run, without retries or skips. The browser suite took approximately 2.5 minutes. Desktop and mobile alert and floating-control screenshots were inspected. Firefox/WebKit and screen-reader announcements were not runtime-tested.
